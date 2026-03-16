"""Main FastAPI application entry point."""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import init_db
from .routers import (
    auth_router,
    users_router,
    businesses_router,
    services_router,
    availability_router,
    appointments_router,
    clients_router,
    analytics_router,
    subscriptions_router,
)

# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="B2B Appointment Scheduling SaaS API",
    version="1.0.0",
    docs_url="/api/docs" if settings.app_env != "production" else None,
    redoc_url="/api/redoc" if settings.app_env != "production" else None,
    openapi_url="/api/openapi.json" if settings.app_env != "production" else None
)

# Configure CORS - use specific origins in production
def get_allowed_origins():
    if settings.app_env == "production":
        origins = [settings.frontend_url]
        # Also allow Render preview URLs
        render_service_name = os.environ.get("RENDER_SERVICE_NAME", "")
        if render_service_name:
            origins.append(f"https://{render_service_name}.onrender.com")
        return origins
    return ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup."""
    init_db()


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": f"Welcome to {settings.app_name}",
        "docs": "/api/docs" if settings.app_env != "production" else None,
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for Render."""
    return {"status": "healthy", "app": settings.app_name}


@app.get("/api/health")
async def api_health_check():
    """API health check endpoint."""
    return {"status": "healthy", "app": settings.app_name}


# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(businesses_router, prefix="/api")
app.include_router(services_router, prefix="/api")
app.include_router(availability_router, prefix="/api")
app.include_router(appointments_router, prefix="/api")
app.include_router(clients_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(subscriptions_router, prefix="/api")
