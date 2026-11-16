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
    SECRET_KEY = os.getenv("SECRET_KEY", "intelliroute-secret-key-change-in-prod")
    INGEST_API_KEY = os.getenv("INGEST_API_KEY", "intelliroute-edge-secret")
    JWT_ACCESS_TOKEN_EXPIRES = datetime.timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = datetime.timedelta(days=30)
    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_COOKIE_SECURE = os.getenv("JWT_COOKIE_SECURE", "False" if os.getenv("FLASK_ENV") == "development" else "True").lower() == "true"
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_CSRF_PROTECT = os.getenv("JWT_COOKIE_CSRF_PROTECT", "True").lower() == "true"
    JWT_CSRF_CHECK_FORM = False
    JWT_CSRF_IN_COOKIES = True
    JWT_CSRF_METHODS = ["POST", "PUT", "PATCH", "DELETE"]
    JWT_ACCESS_COOKIE_NAME = "access_token_cookie"
    JWT_REFRESH_COOKIE_NAME = "refresh_token_cookie"
