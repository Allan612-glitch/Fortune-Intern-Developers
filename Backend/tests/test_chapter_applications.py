import importlib.util
from pathlib import Path
import unittest

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import inspect
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Backend.main import create_app
from Database.models import user


class TestChapterApplicationEndpoints(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        SQLModel.metadata.create_all(self.engine)
        self.account = user(
            name="Test User",
            email="user@example.test",
            is_admin=False,
        )
        with Session(self.engine, expire_on_commit=False) as session:
            session.add(self.account)
            session.commit()
        self.app = create_app()

        def override_session():
            with Session(self.engine, expire_on_commit=False) as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
        self.app.dependency_overrides[get_current_user] = lambda: self.account
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def _submit(self):
        return self.client.post(
            "/api/chapter-applications",
            json={
                "chapter_id": "knust",
                "chapter_name": "KNUST Chapter",
                "position_title": "Chapter President",
                "motivation": "I want to support students and build a stronger campus community.",
            },
        )

    def test_application_submission_requires_sign_in(self):
        self.app.dependency_overrides.pop(get_current_user)

        response = self._submit()

        self.assertEqual(response.status_code, 401)

    def test_signed_in_user_can_submit_and_view_own_application(self):
        response = self._submit()

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["status"], "pending")
        self.assertEqual(response.json()["applicant_name"], None)

        own_applications = self.client.get("/api/chapter-applications/mine")
        self.assertEqual(own_applications.status_code, 200)
        self.assertEqual(len(own_applications.json()), 1)
        self.assertEqual(own_applications.json()[0]["id"], response.json()["id"])

    def test_active_duplicate_application_is_rejected(self):
        self.assertEqual(self._submit().status_code, 201)

        duplicate = self._submit()

        self.assertEqual(duplicate.status_code, 409)

    def test_application_requires_a_nonblank_motivation(self):
        response = self.client.post(
            "/api/chapter-applications",
            json={
                "chapter_id": "knust",
                "chapter_name": "KNUST Chapter",
                "position_title": "Chapter President",
                "motivation": " " * 24,
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_only_admins_can_update_the_shared_chapter_directory(self):
        payload = {
            "chapters": [
                {
                    "id": "knust",
                    "name": "KNUST Chapter",
                    "inst": "Kwame Nkrumah University of Science and Technology",
                    "type": "Public University",
                }
            ],
            "executives": [
                {
                    "id": "knust-president",
                    "role": "Chapter President",
                    "chapter": "knust",
                    "status": "seat",
                }
            ],
        }

        self.assertEqual(
            self.client.put("/api/chapters", json=payload).status_code,
            403,
        )

        self.account.is_admin = True
        saved = self.client.put("/api/chapters", json=payload)
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.json()["chapters"][0]["id"], "knust")
        self.assertEqual(saved.json()["executives"][0]["role"], "Chapter President")

        public_directory = self.client.get("/api/chapters")
        self.assertEqual(public_directory.status_code, 200)
        self.assertEqual(public_directory.json()["executives"][0]["chapter"], "knust")

    def test_only_admins_can_list_and_update_applications(self):
        created = self._submit().json()

        self.assertEqual(self.client.get("/api/chapter-applications").status_code, 403)
        self.assertEqual(
            self.client.patch(
                f"/api/chapter-applications/{created['id']}/status",
                json={"status": "accepted"},
            ).status_code,
            403,
        )

        self.account.is_admin = True
        applications = self.client.get("/api/chapter-applications")
        self.assertEqual(applications.status_code, 200)
        self.assertEqual(applications.json()[0]["applicant_email"], self.account.email)

        updated = self.client.patch(
            f"/api/chapter-applications/{created['id']}/status",
            json={"status": "under_review"},
        )
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json()["status"], "under_review")

    def test_rejected_application_can_be_resubmitted(self):
        created = self._submit().json()
        self.account.is_admin = True
        rejected = self.client.patch(
            f"/api/chapter-applications/{created['id']}/status",
            json={"status": "rejected"},
        )
        self.assertEqual(rejected.status_code, 200)

        resubmitted = self._submit()

        self.assertEqual(resubmitted.status_code, 201)

    def test_migration_creates_application_table_and_duplicate_guard(self):
        migration_path = (
            Path(__file__).resolve().parents[2]
            / "Database"
            / "Database"
            / "migrations"
            / "versions"
            / "r7e2c8a9b301_create_chapter_applications.py"
        )
        spec = importlib.util.spec_from_file_location(
            "chapter_applications_migration",
            migration_path,
        )
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)

        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                context = MigrationContext.configure(connection)
                with Operations.context(context):
                    migration.upgrade()
            inspector = inspect(engine)
            self.assertIn("chapter_applications", inspector.get_table_names())
            indexes = inspector.get_indexes("chapter_applications")
            self.assertIn(
                "uq_chapter_applications_active_user_position",
                [index["name"] for index in indexes],
            )
        finally:
            engine.dispose()

    def test_migration_creates_shared_chapter_directory(self):
        migration_path = (
            Path(__file__).resolve().parents[2]
            / "Database"
            / "Database"
            / "migrations"
            / "versions"
            / "s8a4d6f1c203_create_chapter_directory.py"
        )
        spec = importlib.util.spec_from_file_location(
            "chapter_directory_migration",
            migration_path,
        )
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        migration = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(migration)

        engine = create_engine("sqlite://")
        try:
            with engine.begin() as connection:
                context = MigrationContext.configure(connection)
                with Operations.context(context):
                    migration.upgrade()
            self.assertIn("chapter_directory", inspect(engine).get_table_names())
        finally:
            engine.dispose()
