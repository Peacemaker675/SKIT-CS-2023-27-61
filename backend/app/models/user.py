from app.extensions import db


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    official_id = db.Column(db.String(100), unique=True, nullable=False)
    username = db.Column(db.String(150), unique=False, nullable=False)
    password_hash = db.Column(db.String(300), nullable=False)
    role = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "official_id": self.official_id,
            "username": self.username,
            "role": self.role,
        }
