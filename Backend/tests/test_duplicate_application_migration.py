import importlib.util
from pathlib import Path
import unittest

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import create_engine, inspect, text


def load_query_index_migration():
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "Database"
        / "Database"
        / "migrations"
        / "versions"
        / "g4b8d2e6f103_add_query_indexes_and_duplicate_guards.py"
    )
    spec = importlib.util.spec_from_file_location(
        "query_index_migration",
        migration_path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load migration at {migration_path}")
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration


def load_reapplication_migration():
    migration_path = (
        Path(__file__).resolve().parents[2]
        / "Database"
        / "Database"
        / "migrations"
        / "versions"
        / "k2a6f1c8d903_allow_reapplication_after_decision.py"
    )
    spec = importlib.util.spec_from_file_location(
        "application_reapplication_migration",
        migration_path,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load migration at {migration_path}")
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    return migration


class TestDuplicateApplicationMigration(unittest.TestCase):
    def test_upgrade_preserves_legacy_duplicates_and_adds_nonunique_indexes(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE user_profiles (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL)"
            ))
            connection.execute(text(
                "CREATE TABLE applications ("
                "id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, "
                "program_id INTEGER NOT NULL, applicant_name TEXT, "
                "student_index_number TEXT, status TEXT NOT NULL)"
            ))
            connection.execute(text(
                "CREATE TABLE notifications (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL)"
            ))
            connection.execute(text(
                "INSERT INTO user_profiles (id, user_id) VALUES (1, 100)"
            ))
            connection.execute(text(
                "INSERT INTO applications "
                "(id, user_id, program_id, applicant_name, student_index_number, status) "
                "VALUES "
                "(1, 100, 200, 'Applicant', 'INDEX-1', 'submitted'), "
                "(2, 100, 200, 'Applicant', 'INDEX-1', 'submitted'), "
                "(3, 100, 200, NULL, NULL, 'submitted'), "
                "(4, 100, 200, NULL, NULL, 'submitted')"
            ))

        migration = load_query_index_migration()
        with engine.begin() as connection:
            context = MigrationContext.configure(connection)
            with Operations.context(context):
                migration.upgrade()

        with engine.connect() as connection:
            self.assertEqual(
                connection.execute(text("SELECT COUNT(*) FROM applications")).scalar_one(),
                4,
            )
            indexes = {
                index["name"]: index
                for index in inspect(connection).get_indexes("applications")
            }
            self.assertFalse(indexes["ix_applications_active_user_program_applicant"]["unique"])
            self.assertFalse(indexes["ix_applications_active_user_program_student_index"]["unique"])
            self.assertFalse(indexes["ix_applications_active_user_program_without_identity"]["unique"])
            self.assertTrue(inspect(connection).get_indexes("user_profiles")[0]["unique"])

    def test_reapplication_migration_indexes_only_active_applications(self):
        engine = create_engine("sqlite://")
        with engine.begin() as connection:
            connection.execute(text(
                "CREATE TABLE applications ("
                "id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, "
                "program_id INTEGER NOT NULL, applicant_name TEXT, "
                "student_index_number TEXT, status TEXT NOT NULL)"
            ))
            for name, columns, identity in (
                (
                    "ix_applications_active_user_program_applicant",
                    "user_id, program_id, applicant_name",
                    "applicant_name IS NOT NULL",
                ),
                (
                    "ix_applications_active_user_program_student_index",
                    "user_id, program_id, student_index_number",
                    "student_index_number IS NOT NULL",
                ),
                (
                    "ix_applications_active_user_program_without_identity",
                    "user_id, program_id",
                    "applicant_name IS NULL AND student_index_number IS NULL",
                ),
            ):
                connection.execute(text(
                    f"CREATE INDEX {name} ON applications ({columns}) "
                    f"WHERE status <> 'withdrawn' AND {identity}"
                ))

        migration = load_reapplication_migration()
        with engine.begin() as connection:
            context = MigrationContext.configure(connection)
            with Operations.context(context):
                migration.upgrade()

        with engine.connect() as connection:
            indexes = {
                index["name"]: index
                for index in inspect(connection).get_indexes("applications")
            }
            for index in indexes.values():
                predicate = str(index["dialect_options"]["sqlite_where"])
                self.assertIn("'accepted'", predicate)
                self.assertIn("'rejected'", predicate)


if __name__ == "__main__":
    unittest.main()
