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
            return (
                jsonify(
                    {
                        "code": "UNAUTHORIZED",
                        "message": "Authentication required",
                        "msg": "UNAUTHORIZED",
                    }
                ),
                401,
            )

        if claims.get("role") != "admin":
            return (
                jsonify(
                    {
                        "code": "ADMIN_PRIVILEGES_REQUIRED",
                        "message": "Admin privileges required",
                        "msg": "ADMIN_PRIVILEGES_REQUIRED",
                    }
                ),
                403,
            )

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
        raise e


def update_user(data):
    user_id = data.get("id")
    if not user_id:
        raise ValueError("User ID is required for update")
    user = User.query.get(user_id)
    if not user:
        raise ValueError(f"User with ID {user_id} not found")

    if "official_id" in data:
        user.official_id = data["official_id"].strip().lower()
    if "username" in data:
        user.username = data["username"].strip().lower()
    if "role" in data:
        user.role = data["role"].strip().lower()
    if "password" in data:
        user.password_hash = generate_password_hash(data["password"].strip())

    try:
        db.session.commit()
        return user.to_dict()
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user: {e}")
        raise e


def delete_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return False
    try:
        db.session.delete(user)
        db.session.commit()
        return True
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting user: {e}")
        return False
