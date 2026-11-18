import importlib.util
from pathlib import Path
import unittest

from alembic.migration import MigrationContext
from alembic.operations import Operations
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from Backend.api.deps import get_current_user
from Backend.database import get_session
from Backend.main import create_app
from Database.models import user


class TestFoundingMemberEndpoints(unittest.TestCase):
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
        self.app = create_app()

        def override_session():
            with Session(self.engine) as session:
                yield session

        self.app.dependency_overrides[get_session] = override_session
        self.app.dependency_overrides[get_current_user] = lambda: self.account
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close()
        self.app.dependency_overrides.clear()
        self.engine.dispose()

    def test_founders_are_publicly_listable(self):
        response = self.client.get("/api/founders")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_non_admin_cannot_edit_a_founder(self):
        response = self.client.put(
            "/api/founders/f1",
            json={
                "name": "Founder",
                "title": "Founder & Managing Director",
                "bio": "",
                "email": "",
                "phone": "",
                "photo": None,
            },
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_can_save_a_founder(self):
        self.account.is_admin = True
        response = self.client.put(
            "/api/founders/f1",
            json={
                "name": "Founder",
                "title": "Founder & Managing Director",
                "bio": "Leads FIN.",
                "email": "founder@example.test",
                "phone": "",
                "photo": None,
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["name"], "Founder")
        self.assertEqual(response.json()["bio"], "Leads FIN.")

    def test_migration_seeds_the_public_founders(self):
        migration_path = (
            Path(__file__).resolve().parents[2]
            / "Database"
            / "Database"
            / "migrations"
            / "versions"
            / "q6f3a9d1c805_create_founding_members.py"
        )
        spec = importlib.util.spec_from_file_location(
            "founding_members_migration",
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
            with engine.connect() as connection:
                rows = connection.execute(
                    text("SELECT id, name FROM founding_members ORDER BY id")
                ).all()
            self.assertEqual(len(rows), 6)
            self.assertEqual(rows[0], ("f1", "Emmanuel Amoasi"))
        finally:
            engine.dispose()
