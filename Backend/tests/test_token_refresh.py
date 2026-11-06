import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi import HTTPException, Response
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from Backend.api.routes.auth import (
    REFRESH_COOKIE_NAME,
    refresh_access_token,
)
from Backend.core.config import settings
from Backend.core.security import (
    create_access_token,
    create_refresh_token,
    get_user_id_from_refresh_token,
    get_user_id_from_token,
)
from Backend.database import get_session
from Backend.main import create_app


class TestRefreshTokenValidation(unittest.TestCase):
    def test_refresh_and_access_tokens_cannot_be_used_interchangeably(self):
        account_id = uuid4()
        refresh_token = create_refresh_token(account_id, token_version=4)
        access_token = create_access_token(account_id, token_version=4)

        self.assertEqual(
            get_user_id_from_refresh_token(refresh_token),
            (account_id, 4),
        )
        with self.assertRaises(HTTPException) as raised:
            get_user_id_from_refresh_token(access_token)
        self.assertEqual(raised.exception.status_code, 401)

        with self.assertRaises(HTTPException) as raised:
            get_user_id_from_token(
                HTTPAuthorizationCredentials(
                    scheme="Bearer",
                    credentials=refresh_token,
                )
            )
        self.assertEqual(raised.exception.status_code, 401)


class TestRefreshEndpoint(unittest.TestCase):
    def test_refresh_response_sets_cookie_and_allows_credentialed_cors(self):
        account = SimpleNamespace(
            id=uuid4(),
            token_version=3,
            is_suspended=False,
            deletion_requested_at=None,
        )
        session = Mock()
        session.get.return_value = account
        app = create_app()
        app.dependency_overrides[get_session] = lambda: session

        with (
            patch(
                "Backend.api.routes.auth.get_user_id_from_refresh_token",
                return_value=(account.id, account.token_version),
            ),
            patch("Backend.api.routes.auth.enforce_rate_limit"),
            patch(
                "Backend.api.routes.auth.create_access_token",
                return_value="new-access-token",
            ),
            patch(
                "Backend.api.routes.auth.create_refresh_token",
                return_value="new-refresh-token",
            ),
            TestClient(app) as client,
        ):
            client.cookies.set(REFRESH_COOKIE_NAME, "current-refresh-token", path="/api/auth")
            response = client.post(
                "/api/auth/refresh",
                headers={"Origin": settings.cors_origins[0]},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["access_token"], "new-access-token")
        self.assertIn(f"{REFRESH_COOKIE_NAME}=new-refresh-token", response.headers["set-cookie"])
        self.assertEqual(
            response.headers["access-control-allow-credentials"],
            "true",
        )

    def test_refresh_issues_new_access_token_and_http_only_cookie(self):
        account = SimpleNamespace(
            id=uuid4(),
            token_version=3,
            is_suspended=False,
            deletion_requested_at=None,
        )
        request = SimpleNamespace(
            cookies={REFRESH_COOKIE_NAME: "current-refresh-token"},
            client=SimpleNamespace(host="192.0.2.10"),
        )
        session = Mock()
        session.get.return_value = account
        response = Response()

        with (
            patch(
                "Backend.api.routes.auth.get_user_id_from_refresh_token",
                return_value=(account.id, account.token_version),
            ),
            patch("Backend.api.routes.auth.enforce_rate_limit"),
            patch(
                "Backend.api.routes.auth.create_access_token",
                return_value="new-access-token",
            ),
            patch(
                "Backend.api.routes.auth.create_refresh_token",
                return_value="new-refresh-token",
            ),
        ):
            result = refresh_access_token(request, response, session)

        self.assertEqual(result.access_token, "new-access-token")
        self.assertEqual(result.token_type, "bearer")
        cookie = response.headers["set-cookie"]
        self.assertIn(f"{REFRESH_COOKIE_NAME}=new-refresh-token", cookie)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("Path=/api/auth", cookie)

    def test_logout_clears_refresh_cookie(self):
        with TestClient(create_app()) as client:
            client.cookies.set(REFRESH_COOKIE_NAME, "refresh-token", path="/api/auth")
            result = client.post("/api/auth/logout")

        self.assertEqual(result.status_code, 204)
        self.assertIn(f"{REFRESH_COOKIE_NAME}=", result.headers["set-cookie"])
        self.assertIn("Max-Age=0", result.headers["set-cookie"])


if __name__ == "__main__":
    unittest.main()
