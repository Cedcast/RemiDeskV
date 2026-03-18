"""Router package initialization."""
from .auth import router as auth_router
from .users import router as users_router
from .businesses import router as businesses_router
from .services import router as services_router
from .availability import router as availability_router
from .appointments import router as appointments_router
from .clients import router as clients_router
from .analytics import router as analytics_router
from .subscriptions import router as subscriptions_router
from .reschedule import router as reschedule_router

__all__ = [
    "auth_router",
    "users_router",
    "businesses_router",
    "services_router",
    "availability_router",
    "appointments_router",
    "clients_router",
    "analytics_router",
    "subscriptions_router",
    "reschedule_router",
]
