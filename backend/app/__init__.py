from flask import Flask, app
from app.extensions import socketio


def create_app():
    app = Flask(__name__)
    return app


if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=true)
