from . import auth
from flask import jsonify, request, make_response
from flask_jwt_extended import (
    jwt_required,
    get_jwt,
    get_jwt_identity,
    set_access_cookies,
    set_refresh_cookies,
    create_access_token,
    create_refresh_token,
    unset_access_cookies,
    unset_refresh_cookies,
)
from app.models.user import User
from werkzeug.security import check_password_hash


@auth.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    official_id = data.get("official_id").strip().lower()
    password = data.get("password").strip()

    user = User.query.filter_by(official_id=official_id).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"msg": "INVALID_CREDENTIALS"}), 401

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
    return jsonify({"authenticated": True}), 200


@auth.route("/refresh", methods=["POST"])
@jwt_required(refresh=True, locations=["cookies"])
def refresh_token():
    current_user_identity = get_jwt_identity()
    access_token = create_access_token(
        identity=current_user_identity,
        additional_claims={"role": get_jwt().get("role")},
    )
    response = jsonify({"msg": "TOKEN_REFRESHED"})
    set_access_cookies(response, access_token)
    return response


@auth.route("/logout", methods=["POST"])
@jwt_required(verify_type=False, locations=["cookies"])
def logout():
    # TODO : Blacklist the used tokens until expiry
    response = jsonify({"msg": "LOGOUT_SUCCESS"})
    unset_access_cookies(response)
    unset_refresh_cookies(response)
    return response, 200
