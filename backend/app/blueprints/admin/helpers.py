from app.extensions import db
from app.models.user import User
from werkzeug.security import generate_password_hash
from flask_jwt_extended import verify_jwt_in_request, get_jwt
from functools import wraps
from flask import jsonify, current_app


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            verify_jwt_in_request()
            claims = get_jwt()
        except Exception:
            return jsonify({"msg": "UNAUTHORIZED"}), 401

        if claims.get("role") != "admin":
            return jsonify({"msg": "ADMIN_PRIVILEGES_REQUIRED"}), 403

        return f(*args, **kwargs)

    return decorated_function


def get_all_users():
    try:
        users = User.query.all()
        return [user.to_dict() for user in users]
    except Exception as e:
        current_app.logger.error(f"Error fetching users: {e}")
        return []


def create_user(data):
    try:
        official_id = data["official_id"].strip().lower()
        username = data["username"].strip().lower()
        role = data["role"].strip().lower()
        password_hash = generate_password_hash(data["password"].strip())
    except KeyError as e:
        raise ValueError(f"Missing required field: {e.args[0]}")
    except Exception:
        raise ValueError("Invalid input data")

    try:
        new_user = User(
            official_id=official_id,
            username=username,
            password_hash=password_hash,
            role=role,
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating user: {e}")
        raise RuntimeError("Failed to create user")


def update_user(user_id, data):
    user = User.query.get(user_id)
    if not user:
        return None

    for field in ["official_id", "username", "role", "password"]:
        if field in data:
            if field == "password":
                user.password_hash = generate_password_hash(data[field])
            else:
                setattr(user, field, data[field])

    try:
        db.session.commit()
        return user
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user {user_id}: {e}")
        raise RuntimeError("Failed to update user")


def delete_user(user_id):
    # TODO : Add recovery mechanism
    user = User.query.get(user_id)
    if not user:
        return None
    try:
        db.session.delete(user)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting user {user_id}: {e}")
        raise RuntimeError("Failed to delete user")
