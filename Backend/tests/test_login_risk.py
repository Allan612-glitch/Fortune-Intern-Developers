import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlmodel import Session

from Backend.api.routes.auth import login
from Backend.core.login_risk import (
    LoginRisk,
    get_login_risk,
    record_login_outcome,
    request_client_fingerprint,
    request_risk_keys,
)
from Backend.core.security import (
    create_trusted_device_token,
    verify_trusted_device_token,
)
from Database.models import rate_limit_bucket
from Database.schemas import LoginRequest


class TestLoginRiskBuckets(unittest.TestCase):
    def test_tracks_shared_failures_and_classifies_risk(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)

        with Session(engine) as session:
            for _ in range(4):
                record_login_outcome(session, "shared-client", failed=True)
            self.assertFalse(get_login_risk(session, "shared-client").medium)

            record_login_outcome(session, "shared-client", failed=True)
            self.assertTrue(get_login_risk(session, "shared-client").medium)
            self.assertFalse(get_login_risk(session, "shared-client").high)

            for _ in range(7):
                record_login_outcome(session, "shared-client", failed=True)
            risk = get_login_risk(session, "shared-client")
            self.assertEqual(risk, LoginRisk(attempts=12, failures=12))
            self.assertTrue(risk.high)

    def test_successful_attempts_reduce_the_failure_ratio(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)

        with Session(engine) as session:
            for _ in range(5):
                record_login_outcome(session, "shared-client", failed=True)
            record_login_outcome(session, "shared-client", failed=False)

            risk = get_login_risk(session, "shared-client")
            self.assertEqual(risk, LoginRisk(attempts=6, failures=5))
            self.assertFalse(risk.medium)

    def test_http_fingerprint_groups_clients_without_source_ip(self):
        first = SimpleNamespace(
            headers={
                "user-agent": "Example Browser",
                "sec-ch-ua": '"Example";v="1"',
                "sec-ch-ua-platform": '"Windows"',
            },
            client=SimpleNamespace(host="192.0.2.1"),
        )
        second = SimpleNamespace(
            headers={
                "user-agent": "Example Browser",
                "sec-ch-ua": '"Example";v="1"',
                "sec-ch-ua-platform": '"Windows"',
            },
            client=SimpleNamespace(host="198.51.100.2"),
        )
        other_client = SimpleNamespace(
            headers={"user-agent": "Different Browser"},
            client=SimpleNamespace(host="198.51.100.2"),
        )

        self.assertEqual(
            request_client_fingerprint(first),
            request_client_fingerprint(second),
        )
        self.assertNotEqual(
            request_client_fingerprint(first),
            request_client_fingerprint(other_client),
        )

    def test_network_signal_groups_header_changes_within_the_same_subnet(self):
        first = SimpleNamespace(
            headers={
                "user-agent": "Example Browser",
                "x-forwarded-for": "203.0.113.1",
            },
            client=SimpleNamespace(host="192.0.2.10"),
        )
        varied_headers = SimpleNamespace(
            headers={
                "user-agent": "Spoofed Bot",
                "sec-ch-ua": '"Other"',
                "x-forwarded-for": "198.51.100.99",
            },
            client=SimpleNamespace(host="192.0.2.200"),
        )
        different_subnet = SimpleNamespace(
            headers={"user-agent": "Spoofed Bot", "sec-ch-ua": '"Other"'},
            client=SimpleNamespace(host="192.0.3.10"),
        )

        first_keys = request_risk_keys(first, request_client_fingerprint(first))
        varied_keys = request_risk_keys(
            varied_headers,
            request_client_fingerprint(varied_headers),
        )
        different_keys = request_risk_keys(
            different_subnet,
            request_client_fingerprint(different_subnet),
        )

        self.assertNotEqual(first_keys[0], varied_keys[0])
        self.assertEqual(first_keys[1], varied_keys[1])
        self.assertNotEqual(first_keys[1], different_keys[1])

    def test_ipv6_network_signal_groups_addresses_by_64_bit_prefix(self):
        first = SimpleNamespace(
            headers={},
            client=SimpleNamespace(host="2001:db8:abcd:1::1"),
        )
        same_network = SimpleNamespace(
            headers={},
            client=SimpleNamespace(host="2001:db8:abcd:1::beef"),
        )
        other_network = SimpleNamespace(
            headers={},
            client=SimpleNamespace(host="2001:db8:abcd:2::1"),
        )

        first_keys = request_risk_keys(first, "client")
        same_keys = request_risk_keys(same_network, "client")
        other_keys = request_risk_keys(other_network, "client")

        self.assertEqual(first_keys[1], same_keys[1])
        self.assertNotEqual(first_keys[1], other_keys[1])

    def test_risk_uses_strongest_matching_signal(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)
        keys = ("client:one", "network:one")

        with Session(engine) as session:
            for _ in range(5):
                record_login_outcome(session, keys, failed=True)

            risk = get_login_risk(session, keys)

        self.assertTrue(risk.medium)
        self.assertEqual(risk, LoginRisk(attempts=5, failures=5))

    def test_subnet_risk_accumulates_when_user_agent_changes(self):
        engine = create_engine("sqlite://")
        rate_limit_bucket.__table__.create(engine)
        client_ips = ("192.0.2.10", "192.0.2.20", "192.0.2.30", "192.0.2.40", "192.0.2.50")

        with Session(engine) as session:
            for index, client_ip in enumerate(client_ips):
                request = SimpleNamespace(
                    headers={"user-agent": f"Rotating Bot {index}"},
                    client=SimpleNamespace(host=client_ip),
                )
                keys = request_risk_keys(
                    request,
                    request_client_fingerprint(request),
                )
                record_login_outcome(session, keys, failed=True)

            final_request = SimpleNamespace(
                headers={"user-agent": "A sixth client signature"},
                client=SimpleNamespace(host="192.0.2.60"),
            )
            final_keys = request_risk_keys(
                final_request,
                request_client_fingerprint(final_request),
            )
            risk = get_login_risk(session, final_keys)

        self.assertTrue(risk.medium)
        self.assertEqual(risk, LoginRisk(attempts=5, failures=5))


class TestTrustedDeviceTokens(unittest.TestCase):
    def test_token_is_bound_to_email_and_http_fingerprint(self):
        token = create_trusted_device_token("Person@example.test", "client-fingerprint")

        self.assertTrue(
            verify_trusted_device_token(
                token,
                "person@example.test",
                "client-fingerprint",
            )
        )
        self.assertFalse(
            verify_trusted_device_token(
                token,
                "other@example.test",
                "client-fingerprint",
            )
        )
        self.assertFalse(
            verify_trusted_device_token(
                token,
                "person@example.test",
                "other-fingerprint",
            )
        )
        self.assertFalse(
            verify_trusted_device_token(
                "invalid",
                "person@example.test",
                "client-fingerprint",
            )
        )


class TestLoginRiskGates(unittest.TestCase):
    def setUp(self):
        self.request = SimpleNamespace(
            client=SimpleNamespace(host="192.0.2.20"),
            headers={},
        )
        self.credentials = LoginRequest(
            email="person@example.test",
            password="password123",
        )

    def test_high_risk_request_requires_captcha_before_password_hash_check(self):
        session = Mock()
        challenge = HTTPException(
            status_code=403,
            detail={"code": "captcha_required"},
        )
        with (
            patch("Backend.api.routes.auth.enforce_rate_limit"),
            patch("Backend.api.routes.auth.request_client_fingerprint", return_value="client"),
            patch(
                "Backend.api.routes.auth.request_risk_keys",
                return_value=("client:client", "network:network"),
            ),
            patch(
                "Backend.api.routes.auth.get_login_risk",
                return_value=LoginRisk(attempts=12, failures=12),
            ),
            patch("Backend.api.routes.auth.verify_trusted_device_token", return_value=False),
            patch("Backend.api.routes.auth.verify_turnstile", side_effect=challenge) as verify_captcha,
            patch("Backend.api.routes.auth.verify_password") as password_check,
            self.assertRaises(HTTPException) as raised,
        ):
            login(self.credentials, self.request, session)

        self.assertIs(raised.exception, challenge)
        verify_captcha.assert_called_once_with(None, "192.0.2.20")
        password_check.assert_not_called()
        session.exec.assert_not_called()

    def test_medium_risk_requires_captcha_before_account_lookup(self):
        session = Mock()
        challenge = HTTPException(
            status_code=403,
            detail={"code": "captcha_required"},
        )
        with (
            patch("Backend.api.routes.auth.enforce_rate_limit"),
            patch("Backend.api.routes.auth.request_client_fingerprint", return_value="client"),
            patch(
                "Backend.api.routes.auth.request_risk_keys",
                return_value=("client:client", "network:network"),
            ),
            patch(
                "Backend.api.routes.auth.get_login_risk",
                return_value=LoginRisk(attempts=5, failures=5),
            ),
            patch("Backend.api.routes.auth.verify_trusted_device_token", return_value=False),
            patch("Backend.api.routes.auth.verify_turnstile", side_effect=challenge) as verify_captcha,
            patch("Backend.api.routes.auth.verify_password") as password_check,
            self.assertRaises(HTTPException) as raised,
        ):
            login(self.credentials, self.request, session)

        self.assertIs(raised.exception, challenge)
        verify_captcha.assert_called_once_with(None, "192.0.2.20")
        password_check.assert_not_called()
        session.exec.assert_not_called()

    def test_trusted_device_skips_risk_challenge(self):
        session = Mock()
        session.exec.return_value.first.return_value = None
        credentials = LoginRequest(
            email="person@example.test",
            password="password123",
            trusted_device_token="trusted-token",
        )
        with (
            patch("Backend.api.routes.auth.enforce_rate_limit"),
            patch("Backend.api.routes.auth.request_client_fingerprint", return_value="client"),
            patch(
                "Backend.api.routes.auth.request_risk_keys",
                return_value=("client:client", "network:network"),
            ),
            patch(
                "Backend.api.routes.auth.get_login_risk",
                return_value=LoginRisk(attempts=20, failures=20),
            ),
            patch("Backend.api.routes.auth.verify_turnstile") as verify_captcha,
            patch("Backend.api.routes.auth.verify_trusted_device_token", return_value=True),
            patch("Backend.api.routes.auth.record_login_outcome"),
            patch("Backend.api.routes.auth.verify_password"),
        ):
            with self.assertRaises(HTTPException) as raised:
                login(credentials, self.request, session)

        self.assertEqual(raised.exception.status_code, 401)
        verify_captcha.assert_not_called()
        session.exec.assert_called_once()

    def test_successful_login_returns_a_bound_trusted_device_token(self):
        account = SimpleNamespace(
            id=uuid4(),
            token_version=0,
            email="person@example.test",
            name="Test Person",
            is_admin=False,
            is_suspended=False,
            password_hash="stored-hash",
        )
        session = Mock()
        session.exec.return_value.first.return_value = account

        with (
            patch("Backend.api.routes.auth.enforce_rate_limit"),
            patch("Backend.api.routes.auth.request_client_fingerprint", return_value="client"),
            patch(
                "Backend.api.routes.auth.request_risk_keys",
                return_value=("client:client", "network:network"),
            ),
            patch(
                "Backend.api.routes.auth.get_login_risk",
                return_value=LoginRisk(attempts=0, failures=0),
            ),
            patch("Backend.api.routes.auth.verify_trusted_device_token", return_value=False),
            patch("Backend.api.routes.auth.verify_password", return_value=True),
            patch("Backend.api.routes.auth.record_login_outcome") as record_outcome,
            patch("Backend.api.routes.auth.create_access_token", return_value="access-token"),
        ):
            response = login(self.credentials, self.request, session)

        self.assertEqual(response.access_token, "access-token")
        self.assertTrue(
            verify_trusted_device_token(
                response.device_token,
                account.email,
                "client",
            )
        )
        record_outcome.assert_called_once_with(
            session,
            ("client:client", "network:network"),
            failed=False,
        )


if __name__ == "__main__":
    unittest.main()
