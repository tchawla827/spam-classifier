import logging
import sys
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from pathlib import Path

# Ensure the monorepo root is on sys.path so `ml` is importable
# regardless of CWD or whether PYTHONPATH is set manually.
_PROJECT_ROOT = str(Path(__file__).resolve().parents[3])
if _PROJECT_ROOT not in sys.path:
    sys.path.insert(0, _PROJECT_ROOT)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.db.session import dispose_db_engine, init_db_engine

logging.basicConfig(
    stream=sys.stdout,
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("spam_classifier")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Resolve artifact path relative to project root
    bundle_dir = Path(settings.ARTIFACT_BUNDLE_DIR)
    if not bundle_dir.is_absolute():
        bundle_dir = Path(__file__).resolve().parents[3] / bundle_dir

    logger.info("Loading ML artifacts from %s", bundle_dir)
    try:
        from ml.src.inference.predict import load_artifacts

        app.state.artifacts = load_artifacts(str(bundle_dir))
        logger.info(
            "Artifacts loaded — version %s, %d models",
            app.state.artifacts["metadata"]["version"],
            len(app.state.artifacts["metadata"]["calibrated_artifacts"]),
        )
    except Exception:
        logger.exception("Failed to load ML artifacts")
        app.state.artifacts = None

    if settings.DATABASE_URL:
        try:
            init_db_engine(settings.DATABASE_URL)
        except Exception:
            logger.exception("Failed to initialise database engine")
    else:
        logger.info("DATABASE_URL not set — persistence disabled")

    yield

    await dispose_db_engine()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix=settings.API_V1_STR)
