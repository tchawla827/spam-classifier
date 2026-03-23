from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.classify import router as classify_router
from app.api.v1.auth import router as auth_router
from app.api.v1.history import router as history_router

router = APIRouter()
router.include_router(health_router, tags=["health"])
router.include_router(classify_router, tags=["classify"])
router.include_router(auth_router, tags=["auth"])
router.include_router(history_router, tags=["history"])
