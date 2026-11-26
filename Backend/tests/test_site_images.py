import importlib.util
from io import BytesIO
from pathlib import Path
from urllib.parse import urlsplit
import unittest
from unittest.mock import patch

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import inspect
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine, select

from Backend.api.deps import get_current_user
from Backend.api.routes.site_images import MAX_IMAGE_BYTES
from Backend.core.config import settings
from Backend.database import get_session
from Backend.main import create_app
from Database.models import audit_event, user

SLOT = "fin-connect-lab"


def image_bytes(image_format):
    output = BytesIO()
    Image.new("RGB", (4, 4), "red").save(output, format=image_format)
    return output.getvalue()


class TestSiteImages(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
        SQLModel.metadata.create_all(self.engine)
        self.account = user(name="Admin", email="admin@example.test", is_admin=True)
        with Session(self.engine, expire_on_commit=False) as session:
            session.add(self.account)
            session.commit()
        self.app = create_app()

        def override_session():
            with Session(self.engine) as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
        self.app.dependency_overrides[get_current_user] = lambda: self.account
        self.client = TestClient(self.app)
        self.base_url_patch = patch.object(settings, "site_images_base_url", "https://images.example.test")
        self.base_url_patch.start()

    def tearDown(self):
        self.base_url_patch.stop()
        self.client.close()
        self.engine.dispose()

    def upload(self, content, slot=SLOT, content_type="image/png"):
        return self.client.put(
            f"/api/admin/site-images/{slot}",
            files={"file": ("image.png", content, content_type)},
        )

    def test_public_listing_versioned_upload_replace_delete_and_audit(self):
        self.assertEqual(self.client.get("/api/site-images").json(), [])
        first = self.upload(image_bytes("PNG"))
        self.assertEqual(first.status_code, 200, first.text)
        first_row = first.json()
        self.assertEqual(first_row["slot"], SLOT)
        self.assertTrue(first_row["url"].startswith("https://images.example.test/"))
        self.assertTrue(first_row["updated_at"].endswith("Z"))
        image = self.client.get(urlsplit(first_row["url"]).path)
        self.assertEqual(image.status_code, 200)
        self.assertEqual(image.headers["content-type"], "image/png")
        self.assertEqual(image.content, image_bytes("PNG"))

        second = self.upload(image_bytes("JPEG"), content_type="image/png")
        self.assertEqual(second.status_code, 200, second.text)
        self.assertNotEqual(first_row["url"], second.json()["url"])
        self.assertEqual(self.client.get(urlsplit(first_row["url"]).path).status_code, 404)
        image = self.client.get(urlsplit(second.json()["url"]).path)
        self.assertEqual(image.headers["content-type"], "image/jpeg")
        self.assertEqual(self.client.get("/api/site-images").json(), [second.json()])
        self.assertEqual(self.client.delete(f"/api/admin/site-images/{SLOT}").status_code, 204)
        self.assertEqual(self.client.delete(f"/api/admin/site-images/{SLOT}").status_code, 204)
        self.assertEqual(self.client.get(urlsplit(second.json()["url"]).path).status_code, 404)
        self.assertEqual(self.client.get("/api/site-images").json(), [])
        with Session(self.engine) as session:
            actions = session.exec(select(audit_event.action)).all()
        self.assertCountEqual(actions, ["site_image.upload", "site_image.upload", "site_image.delete", "site_image.delete"])

    def test_admin_only_and_unknown_slots(self):
        self.account.is_admin = False
        self.assertEqual(self.upload(image_bytes("PNG")).status_code, 403)
        self.assertEqual(self.client.delete(f"/api/admin/site-images/{SLOT}").status_code, 403)
        del self.app.dependency_overrides[get_current_user]
        self.assertEqual(self.upload(image_bytes("PNG")).status_code, 401)
        self.assertEqual(self.client.delete(f"/api/admin/site-images/{SLOT}").status_code, 401)
        self.app.dependency_overrides[get_current_user] = lambda: self.account
        self.account.is_admin = True
        self.assertEqual(self.upload(image_bytes("PNG"), slot="invalid").status_code, 422)

    def test_rejects_bad_content_and_oversize_accepts_webp(self):
        self.assertEqual(self.upload(b"not an image").status_code, 415)
        self.assertEqual(self.upload(image_bytes("PNG")[:30]).status_code, 415)
        self.assertEqual(self.upload(image_bytes("GIF")).status_code, 415)
        self.assertEqual(self.upload(b"x" * (MAX_IMAGE_BYTES + 1)).status_code, 413)
        png = image_bytes("PNG")
        self.assertEqual(self.upload(png + b"\0" * (MAX_IMAGE_BYTES - len(png))).status_code, 200)
        response = self.upload(image_bytes("WEBP"), content_type="text/plain")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(self.client.get(urlsplit(response.json()["url"]).path).headers["content-type"], "image/webp")

    def test_missing_or_insecure_base_url_fails_without_saving(self):
        settings.site_images_base_url = "http://example.test"
        self.assertEqual(self.upload(image_bytes("PNG")).status_code, 503)
        self.assertEqual(self.client.get("/api/site-images").json(), [])

    def test_migration_creates_and_drops_table(self):
        path = Path(__file__).resolve().parents[2] / "Database" / "Database" / "migrations" / "versions" / "a8f0b4a7e154_create_site_images.py"
        spec = importlib.util.spec_from_file_location("site_images_migration", path)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)
        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                with Operations.context(MigrationContext.configure(connection)):
                    migration.upgrade()
                    self.assertIn("site_images", inspect(connection).get_table_names())
                    migration.downgrade()
                    self.assertNotIn("site_images", inspect(connection).get_table_names())
        finally:
            engine.dispose()
