from . import admin
from .helpers import *
from flask import jsonify, request
from flask_jwt_extended import jwt_required


@admin.route("/users", methods=["GET", "POST", "PUT", "DELETE"])
@jwt_required()
@admin_required
def manage_users():
    if request.method == "GET":
        users = get_all_users()
        return jsonify(users), 200

    elif request.method == "POST":
        data = request.get_json()
        new_user = create_user(data)

        user_data = new_user.to_dict()
        return jsonify(user_data), 201

    elif request.method == "PUT":
        data = request.get_json()
        updated_user = update_user(data)
        return jsonify(updated_user), 200

    elif request.method == "DELETE":
        data = request.get_json()
        user_id = data.get("id")
        is_deleted = delete_user(user_id)
        if not is_deleted:
            return jsonify({"error": "User not found"}), 404
        return jsonify({"message": f"User with id {user_id} deleted"}), 200
