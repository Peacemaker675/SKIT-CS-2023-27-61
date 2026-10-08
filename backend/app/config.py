import os
import datetime


class config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    DEBUG = os.getenv("DEBUG") == "True"
    REDIS_HOST = os.getenv("REDIS_HOST")
    REDIS_PORT = os.getenv("REDIS_PORT")
    REDIS_PASS = os.getenv("REDIS_PASS")
    REDIS_SSL = os.getenv("REDIS_SSL") == "True"
    INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN")
    INFLUX_ORG = os.getenv("INFLUX_ORG")
    INFLUX_HOST = os.getenv("INFLUX_HOST")
    INFLUX_BUCKET = os.getenv("INFLUX_BUCKET")
    SQLALCHEMY_DATABASE_URI = os.getenv("POSTGRES_HOST")
    SECRET_KEY = os.getenv("SECRET_KEY")
    JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = datetime.timedelta(days=30)
    JWT_TOKEN_LOCATION = ["cookies"]
    JWT_COOKIE_SECURE = False  # Set to True in production with HTTPS
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = False  # set to True to enable CSRF protection
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_REFRESH_COOKIE_NAME = "refresh_token_cookie"
