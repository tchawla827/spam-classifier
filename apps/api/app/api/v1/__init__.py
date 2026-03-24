from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.classify import router as classify_router
from app.api.v1.auth import router as auth_router
from app.api.v1.history import router as history_router
from app.api.v1.feedback import router as feedback_router
from app.api.v1.preferences import router as preferences_router
from app.api.v1.gmail import router as gmail_router
from app.api.v1.insights import router as insights_router
from app.api.v1.account import router as account_router

router = APIRouter()
router.include_router(health_router, tags=["health"])
router.include_router(classify_router, tags=["classify"])
router.include_router(auth_router, tags=["auth"])
router.include_router(history_router, tags=["history"])
router.include_router(feedback_router, tags=["feedback"])
router.include_router(preferences_router, tags=["preferences"])
router.include_router(gmail_router, tags=["gmail"])
router.include_router(insights_router, tags=["insights"])
router.include_router(account_router, tags=["account"])
