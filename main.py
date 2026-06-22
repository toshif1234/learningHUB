import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from backend.config import FRONTEND_ORIGIN, UPLOAD_DIR
from backend.database import engine, Base

from backend.auth import router as auth_module
from backend.routers import users, courses, assignments, assessments, enrollments, progress, notifications, analytics

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(
    title="LearningHUB API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Register routers
app.include_router(auth_module.router)
app.include_router(users.router)
app.include_router(courses.router)
app.include_router(assignments.router)
app.include_router(assessments.router)
app.include_router(enrollments.router)
app.include_router(progress.router)
app.include_router(notifications.router)
app.include_router(analytics.router)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


# Health check
@app.get("/")
async def health_check():
    return {"status": "ok", "message": "LearningHUB API is running"}
