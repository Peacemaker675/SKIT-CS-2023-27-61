import json
import unittest
from unittest.mock import MagicMock, patch

import sys
if "redis" not in sys.modules:
    sys.modules["redis"] = MagicMock()

import os
os.environ["POSTGRES_HOST"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-bytes-long!"
os.environ["INFLUX_HOST"] = "http://localhost:8181"
os.environ["INFLUXDB_TOKEN"] = "test-token"
os.environ["INFLUX_ORG"] = "test-org"
os.environ["INFLUX_BUCKET"] = "test-bucket"

from app import create_app
from app.extensions import db
from app.models.user import User


class TestAuthAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Configure test app
        cls.app = create_app()
        cls.app.config["TESTING"] = True
        cls.app.config["JWT_COOKIE_CSRF_PROTECT"] = False  # Simplify test client direct cookie tests
        cls.app.config["JWT_COOKIE_SECURE"] = False
        cls.app.config["INGEST_API_KEY"] = "test-secret-key"
        cls.client = cls.app.test_client()

    def setUp(self):
        self.app_context = self.app.app_context()
        self.app_context.push()

    def tearDown(self):
        self.app_context.pop()

    def test_latest_intersections_endpoint_path_and_shape(self):
        """Confirm path /api/intersections/latest?ids=a,b and response shape."""
        # Mock redis hgetall
        with patch.object(self.app.redis, "hgetall") as mock_hgetall:
            mock_hgetall.side_effect = lambda key: (
                {"current_phase": "N_GREEN", "vehicle_counts": json.dumps({"N": 10, "S": 5})}
                if "INT_001" in key
                else {}
            )

            res = self.client.get("/api/intersections/latest?ids=INT_001,INT_002")
            self.assertEqual(res.status_code, 200)
            data = res.get_json()
            self.assertIsInstance(data, dict)
            self.assertIn("INT_001", data)
            self.assertEqual(data["INT_001"]["current_phase"], "N_GREEN")
            self.assertEqual(data["INT_001"]["vehicle_counts"], {"N": 10, "S": 5})
            # INT_002 not in redis should not be present in output
            self.assertNotIn("INT_002", data)

    def test_ingest_data_unauthorized(self):
        """Ingest endpoint must reject unauthenticated requests."""
        res = self.client.post(
            "/api/intersections/INT_001/data",
            json={"vehicle_counts": {"N": 5, "E": 2}},
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["code"], "UNAUTHORIZED")

    def test_ingest_data_validation_before_write(self):
        """Ingest endpoint must reject invalid data BEFORE writing to Redis."""
        headers = {"X-API-KEY": "test-secret-key"}

        with patch.object(self.app.redis, "hset") as mock_hset:
            # Send negative count
            res = self.client.post(
                "/api/intersections/INT_001/data",
                headers=headers,
                json={"vehicle_counts": {"N": -5}},
            )
            self.assertEqual(res.status_code, 400)
            self.assertEqual(res.get_json()["code"], "INVALID_DATA")
            mock_hset.assert_not_called()

            # Send non-numeric count
            res = self.client.post(
                "/api/intersections/INT_001/data",
                headers=headers,
                json={"vehicle_counts": {"N": "invalid"}},
            )
            self.assertEqual(res.status_code, 400)
            self.assertEqual(res.get_json()["code"], "INVALID_DATA")
            mock_hset.assert_not_called()

    def test_ingest_data_valid_writes_redis(self):
        """Ingest endpoint writes to Redis when authenticated and valid."""
        headers = {"X-API-KEY": "test-secret-key"}

        with patch.object(self.app.redis, "hset") as mock_hset, \
             patch.object(self.app.redis, "publish") as mock_pub, \
             patch("app.blueprints.intersections.routes.write_traffic_point") as mock_influx:
            res = self.client.post(
                "/api/intersections/INT_001/data",
                headers=headers,
                json={"vehicle_counts": {"N": 10, "E": 5, "S": 12, "W": 8}, "current_phase": "N_GREEN"},
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.get_json()["code"], "TELEMETRY_RECORDED")
            mock_hset.assert_called()
            mock_pub.assert_called()

    def test_logout_works_without_active_access_token(self):
        """Logging out when access token is expired/missing should still clear cookies."""
        res = self.client.post("/api/auth/logout")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()["code"], "LOGOUT_SUCCESS")

    def test_login_rate_limiting(self):
        """Exceeding max failed login attempts returns 429 Too Many Requests."""
        with patch.object(self.app.redis, "get", return_value="5"), \
             patch.object(self.app.redis, "ttl", return_value=45):
            res = self.client.post(
                "/api/auth/login",
                json={"official_id": "test_user", "password": "wrong_password"},
            )
            self.assertEqual(res.status_code, 429)
            data = res.get_json()
            self.assertEqual(data["code"], "TOO_MANY_REQUESTS")
            self.assertEqual(data["retry_after"], 45)

    def test_refresh_token_rechecks_role_from_db(self):
        """Token refresh queries DB for latest user role instead of blindly trusting claims."""
        from flask_jwt_extended import create_refresh_token
        with self.app.test_request_context():
            # Create a user in DB
            user = User(official_id="u001", username="alice", role="operator", password_hash="dummy")
            db.session.add(user)
            db.session.commit()

            refresh_token = create_refresh_token(identity=str(user.id), additional_claims={"role": "operator"})

            # Now update user role in DB to admin
            user.role = "admin"
            db.session.commit()

        # Call refresh endpoint with refresh token cookie
        self.client.set_cookie("refresh_token_cookie", refresh_token)
        res = self.client.post("/api/auth/refresh")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data["code"], "TOKEN_REFRESHED")
        self.assertEqual(data["role"], "admin")


if __name__ == "__main__":
    unittest.main()
