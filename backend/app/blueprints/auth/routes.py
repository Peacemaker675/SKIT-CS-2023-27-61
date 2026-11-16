from . import auth
from flask import jsonify, request, make_response, current_app
from flask_jwt_extended import (
    jwt_required,
    get_jwt,
    get_jwt_identity,
    set_access_cookies,
    set_refresh_cookies,
    create_access_token,
    create_refresh_token,
    unset_jwt_cookies,
    unset_access_cookies,
    unset_refresh_cookies,
)
from app.models.user import User
from werkzeug.security import check_password_hash


def _get_client_ip():
    if request.headers.get("X-Forwarded-For"):
        return request.headers["X-Forwarded-For"].split(",")[0].strip()
    return request.remote_addr or "unknown"


def check_login_rate_limit(client_ip, identifier, max_attempts=5, window_seconds=60):
    """
    Checks if client_ip or identifier exceeded max login attempts within window_seconds.
    Returns (allowed: bool, retry_after: int).
    """
    try:
        r = getattr(current_app, "redis", None)
        if not r:
            return True, 0
        key = f"rate_limit:login:{client_ip}:{identifier}"
        attempts = r.get(key)
        if attempts and int(attempts) >= max_attempts:
            ttl = r.ttl(key)
            return False, max(1, ttl)
        return True, 0
    except Exception:
        return True, 0


def record_failed_login(client_ip, identifier, window_seconds=60):
    try:
        r = getattr(current_app, "redis", None)
        if not r:
            return
        key = f"rate_limit:login:{client_ip}:{identifier}"
        val = r.incr(key)
        if val == 1:
            r.expire(key, window_seconds)
    except Exception:
        pass


def clear_login_attempts(client_ip, identifier):
    try:
        r = getattr(current_app, "redis", None)
        if not r:
            return
        key = f"rate_limit:login:{client_ip}:{identifier}"
        r.delete(key)
    except Exception:
        pass


@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    raw_official_id = data.get("official_id")
    raw_password = data.get("password")

    if not raw_official_id or not raw_password:
        return (
            jsonify(
                {
                    "code": "MISSING_CREDENTIALS",
                    "message": "Official ID and password are required",
                    "msg": "MISSING_CREDENTIALS",
                    "error": "Official ID and password are required",
                }
            ),
            400,
        )

    identifier = str(raw_official_id).strip().lower()
    password = str(raw_password).strip()
    client_ip = _get_client_ip()

    # Rate limit check on login attempts
    allowed, retry_after = check_login_rate_limit(client_ip, identifier)
    if not allowed:
        return (
            jsonify(
                {
                    "code": "TOO_MANY_REQUESTS",
                    "message": f"Too many failed login attempts. Please try again in {retry_after} seconds.",
                    "error": "Rate limit exceeded",
                    "retry_after": retry_after,
                }
            ),
            429,
        )

    # Allow login with either official_id (e.g. A001) or username (e.g. tushar)
    user = User.query.filter(
        (User.official_id == identifier) | (User.username == identifier)
    ).first()
    if not user or not check_password_hash(user.password_hash, password):
        record_failed_login(client_ip, identifier)
        return (
            jsonify(
                {
                    "code": "INVALID_CREDENTIALS",
                    "message": "Invalid official ID or password",
                    "msg": "INVALID_CREDENTIALS",
                    "error": "Invalid official ID or password",
                }
            ),
            401,
        )

    # Reset failed attempts upon successful login
    clear_login_attempts(client_ip, identifier)

    claims = {"role": user.role}
    access_token = create_access_token(
        identity=str(user.id), additional_claims=claims
    )
    refresh_token = create_refresh_token(
        identity=str(user.id), additional_claims=claims
    )

    response = make_response(
        jsonify(
            {
                "code": "LOGIN_SUCCESS",
                "message": "Login successful",
                "msg": "LOGIN_SUCCESS",
                "role": user.role,
                "username": user.username,
                "official_id": user.official_id,
            }
        ),
        200,
    )

    set_access_cookies(response, access_token)
    set_refresh_cookies(response, refresh_token)

    return response


@auth.route("/check", methods=["GET"])
@jwt_required(verify_type=False, locations=["cookies"])
def check_auth():
    return jsonify({"authenticated": True, "code": "AUTHENTICATED", "message": "Authenticated"}), 200


@auth.route("/refresh", methods=["POST"])
@jwt_required(refresh=True, locations=["cookies"])
def refresh_token():
    current_user_identity = get_jwt_identity()

    # Re-check user existence and role in database upon token refresh
    user = None
    try:
        from app.extensions import db
        user = db.session.get(User, int(current_user_identity))
    except (ValueError, TypeError):
        user = User.query.filter_by(official_id=str(current_user_identity)).first()

    if not user:
        response = jsonify(
            {
                "code": "USER_NOT_FOUND",
                "message": "User account no longer exists or has been deactivated",
                "error": "User not found",
            }
        )
        unset_jwt_cookies(response)
        unset_access_cookies(response)
        unset_refresh_cookies(response)
        return response, 401

    claims = {"role": user.role}
    access_token = create_access_token(
        identity=str(user.id),
        additional_claims=claims,
    )
    response = jsonify(
        {
            "code": "TOKEN_REFRESHED",
            "message": "Token refreshed successfully",
            "msg": "TOKEN_REFRESHED",
            "role": user.role,
        }
    )
    set_access_cookies(response, access_token)
    return response, 200


@auth.route("/logout", methods=["POST"])
@jwt_required(optional=True, verify_type=False, locations=["cookies"])
def logout():
    """
    Clears both access and refresh cookies.
    optional=True ensures this route executes cleanly even if access_token has expired.
    """
    response = jsonify(
        {
            "code": "LOGOUT_SUCCESS",
            "message": "Logged out successfully",
            "msg": "LOGOUT_SUCCESS",
        }
    )
    unset_jwt_cookies(response)
    unset_access_cookies(response)
    unset_refresh_cookies(response)
    return response, 200
