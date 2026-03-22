"""Async SQLAlchemy engine and session management.

The database is fully optional. When DATABASE_URL is not configured,
all DB operations are silently skipped so the app runs without Postgres.
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

logger = logging.getLogger("spam_classifier")

_engine: Optional[AsyncEngine] = None
_session_factory: Optional[async_sessionmaker[AsyncSession]] = None


def init_db_engine(database_url: str) -> AsyncEngine:
    """Create and cache the async engine. Call once at startup."""
    global _engine, _session_factory
    _engine = create_async_engine(database_url, pool_pre_ping=True)
    _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    logger.info("Database engine initialised")
    return _engine


async def dispose_db_engine() -> None:
    """Dispose the engine. Call at shutdown."""
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
        _engine = None
        _session_factory = None
        logger.info("Database engine disposed")


def get_engine() -> Optional[AsyncEngine]:
    return _engine


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[Optional[AsyncSession], None]:
    """Yield an AsyncSession, or None if DB is not configured."""
    if _session_factory is None:
        yield None
        return
    async with _session_factory() as session:
        yield session
