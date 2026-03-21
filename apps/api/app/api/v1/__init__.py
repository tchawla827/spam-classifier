from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.classify import router as classify_router

router = APIRouter()
router.include_router(health_router, tags=["health"])
router.include_router(classify_router, tags=["classify"])
