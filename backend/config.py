import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
BASE_DIR = Path(__file__).resolve().parent.parent
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)

SECRET_KEY = os.getenv("SECRET_KEY", "a-very-long-secret-key-32-chars-long-at-least-lms-learning-hub-secret")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./learning_portal.db")
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))

# SMTP Configuration
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.office365.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "admin@koerber-stellium.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "Welcome@6767")
EMAIL_FROM = os.getenv("EMAIL_FROM", "admin@koerber-stellium.com")
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Learning Portal")

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://10.18.138.234:5173/")
BACKEND_ORIGIN = os.getenv("BACKEND_ORIGIN", "http://10.18.138.234:8000/")

# Feature Flags
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "500"))
OTP_EXPIRE_MINUTES = int(os.getenv("OTP_EXPIRE_MINUTES", "10"))
MAX_OTP_REQUESTS_PER_15MIN = int(os.getenv("MAX_OTP_REQUESTS_PER_15MIN", "3"))

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "courses").mkdir(parents=True, exist_ok=True)
