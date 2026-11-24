from sqlalchemy.orm import object_session
from sqlmodel import select

from Database.admin_records import WorkspaceRole

STAFF_ROLES = {
    "applications": "Application reviewer",
    "programs": "Program manager",
    "announcements": "Communications manager",
    "users": "Student support",
    "finance": "Finance officer",
    "placements": "Placement coordinator",
    "support": "Incident coordinator",
    "operations": "Operations analyst",
}
WORKSPACE_PERMISSIONS = tuple(STAFF_ROLES)


def role_definitions(session):
    roles = {key: {"id": key, "name": name, "permissions": [key]} for key, name in STAFF_ROLES.items()}
    for row in session.execute(select(WorkspaceRole)).scalars():
        roles[row.id] = {"id": row.id, "name": row.name, "permissions": row.permissions}
    return roles


def staff_permissions(account) -> list[str]:
    if account.staff_status != "active" or not account.staff_role:
        return []
    session = object_session(account)
    definition = session.get(WorkspaceRole, account.staff_role) if session is not None else None
    if definition:
        return [value for value in definition.permissions if value in WORKSPACE_PERMISSIONS]
    return [account.staff_role] if account.staff_role in STAFF_ROLES else []
