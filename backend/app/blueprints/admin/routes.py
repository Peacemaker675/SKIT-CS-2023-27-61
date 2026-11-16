import json
import os
from . import admin
from .helpers import (
    admin_required,
    get_all_users,
    create_user,
    update_user,
    delete_user,
)
from flask import jsonify, request, current_app
from flask_jwt_extended import jwt_required


@admin.route("/users", methods=["GET", "POST", "PUT", "DELETE"])
@jwt_required()
@admin_required
def manage_users():
    if request.method == "GET":
        users = get_all_users()
        return jsonify(users), 200

    elif request.method == "POST":
        try:
            data = request.get_json() or {}
            new_user = create_user(data)
            return jsonify(new_user.to_dict()), 201
        except ValueError as e:
            return (
                jsonify(
                    {
                        "code": "INVALID_USER_DATA",
                        "message": str(e),
                        "error": str(e),
                    }
                ),
                400,
            )
        except Exception as e:
            return (
                jsonify(
                    {
                        "code": "USER_CREATION_FAILED",
                        "message": str(e),
                        "error": str(e),
                    }
                ),
                500,
            )

    elif request.method == "PUT":
        try:
            data = request.get_json() or {}
            updated_user = update_user(data)
            return jsonify(updated_user), 200
        except ValueError as e:
            return (
                jsonify(
                    {
                        "code": "USER_NOT_FOUND",
                        "message": str(e),
                        "error": str(e),
                    }
                ),
                404,
            )
        except Exception as e:
            return (
                jsonify(
                    {
                        "code": "USER_UPDATE_FAILED",
                        "message": str(e),
                        "error": str(e),
                    }
                ),
                400,
            )

    elif request.method == "DELETE":
        data = request.get_json() or {}
        user_id = data.get("id")
        if not user_id:
            return (
                jsonify(
                    {
                        "code": "MISSING_USER_ID",
                        "message": "User ID is required",
                        "error": "User ID is required",
                    }
                ),
                400,
            )
        is_deleted = delete_user(user_id)
        if not is_deleted:
            return (
                jsonify(
                    {
                        "code": "USER_NOT_FOUND",
                        "message": "User not found",
                        "error": "User not found",
                    }
                ),
                404,
            )
        return (
            jsonify(
                {
                    "code": "USER_DELETED",
                    "message": f"User with id {user_id} deleted",
                }
            ),
            200,
        )


@admin.route("/intersections", methods=["GET"])
def list_intersections():
    """Serves the list of registered intersections for frontend map initialization."""
    candidates = [
        os.path.abspath(
            os.path.join(
                os.path.dirname(__file__), "../configs/intersections.json"
            )
        ),
        "/app/shared/configs/intersections.json",
        "/app/app/configs/intersections.json",
        os.path.abspath(
            os.path.join(
                os.path.dirname(__file__), "../../../shared/configs/intersections.json"
            )
        ),
        os.path.abspath(
            os.path.join(
                os.path.dirname(__file__), "../../../../frontend/src/mocks/intersections.json"
            )
        ),
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and len(data) > 0:
                        return jsonify(data), 200
            except Exception as e:
                current_app.logger.warning(f"Error reading {path}: {e}")

    # Fallback to standard 10-node Jaipur road network
    fallback = [
        {"id": f"INT_{i:03d}", "name": f"Intersection {i}", "lat": 26.82 + (i * 0.003), "lng": 75.86 + (i * 0.003), "neighbors": []}
        for i in range(1, 11)
    ]
    return jsonify(fallback), 200
