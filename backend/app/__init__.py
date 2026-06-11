import os
from pathlib import Path
from dotenv import load_dotenv
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import redis

# Load local environment variables from backend/.env when available.
BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env")

db = SQLAlchemy()
migrate = Migrate()
redis_client = None


def create_app():
    app = Flask(__name__)

    # Config
    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ["DATABASE_URL"]
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-change-in-prod")
    app.config["ANTHROPIC_API_KEY"] = os.environ.get("ANTHROPIC_API_KEY", "")

    # Extensions
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": os.environ.get("FRONTEND_URL", "http://localhost:3000")}})

    # Redis
    global redis_client
    redis_client = redis.from_url(os.environ.get("REDIS_URL", "redis://localhost:6379/0"))

    # Register blueprints
    from app.routes.applications import applications_bp
    from app.routes.health import health_bp
    from app.routes.settings import settings_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(applications_bp, url_prefix="/api")
    app.register_blueprint(settings_bp, url_prefix="/api")

    return app
