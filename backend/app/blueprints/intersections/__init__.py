from flask import Blueprint

intersections = Blueprint("intersections", __name__)

from . import routes
