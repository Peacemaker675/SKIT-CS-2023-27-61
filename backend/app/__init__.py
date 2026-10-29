import click
import redis
from flask import Flask
from influxdb_client_3 import InfluxDBClient3
from app.config import config
from app.extensions import db, jwt, migrate, cors, socketio


def create_app():
    app = Flask(__name__)
    app.config.from_object(config)

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app)
    socketio.init_app(app)

    app.redis = redis.Redis(
        host=app.config["REDIS_HOST"],
        port=int(app.config["REDIS_PORT"] or 6379),
        password=app.config["REDIS_PASS"] or None,
        ssl=app.config["REDIS_SSL"],
        decode_responses=True,
    )
    app.influx = InfluxDBClient3(
        host=app.config["INFLUX_HOST"],
        token=app.config["INFLUXDB_TOKEN"],
        org=app.config["INFLUX_ORG"],
        database=app.config["INFLUX_BUCKET"],
    )

    from app.blueprints.main import main
    from app.blueprints.auth import auth
    from app.blueprints.admin import admin
    from app.blueprints.intersections import intersections
    from app.coordination import coordination_listener

    app.register_blueprint(main, url_prefix="/api")
    app.register_blueprint(auth, url_prefix="/api/auth")
    app.register_blueprint(admin, url_prefix="/api/admin")
    app.register_blueprint(intersections, url_prefix="/api/intersections")

    with app.app_context():
        from app.models import User  

        db.create_all()

    register_cli(app)

    # Don't start background listener during CLI subcommands (e.g. create-user, set-password)
    import sys

    is_cli_cmd = any(cmd in sys.argv for cmd in ["create-user", "set-password", "db"])
    if not is_cli_cmd:
        socketio.start_background_task(coordination_listener, app)

    return app


def register_cli(app):
    @app.cli.command("create-user")
    @click.argument("official_id")
    @click.argument("username")
    @click.argument("role")
    @click.password_option()
    def create_user_command(official_id, username, role, password):
        """Create a user, e.g. the first admin: flask create-user A001 alice admin"""
        from app.blueprints.admin.helpers import create_user

        user = create_user(
            {
                "official_id": official_id,
                "username": username,
                "role": role,
                "password": password,
            }
        )
        click.echo(f"Created user {user.to_dict()}")

    @app.cli.command("set-password")
    @click.argument("official_id")
    @click.argument("password")
    def set_password_command(official_id, password):
        """Set or reset password directly: flask set-password A001 123"""
        from app.models.user import User
        from werkzeug.security import generate_password_hash

        target = official_id.strip().lower()
        user = User.query.filter(
            (User.official_id == target) | (User.username == target)
        ).first()
        if not user:
            click.echo(f"User '{official_id}' not found.")
            return

        user.password_hash = generate_password_hash(password.strip())
        db.session.commit()
        click.echo(f"Password updated for {user.official_id} ({user.username}).")


if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=config.DEBUG)
