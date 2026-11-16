"""Async SQLAlchemy engine/session (asyncpg driver)."""

from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

_engine: AsyncEngine | None = None
_session_factory: async_sessionmaker[AsyncSession] | None = None


def make_engine(database_url: str | None = None) -> AsyncEngine:
    url = database_url or get_settings().async_database_url
    return create_async_engine(url, pool_pre_ping=True)


def get_engine() -> AsyncEngine:
    global _engine, _session_factory
    if _engine is None:
        _engine = make_engine()
        _session_factory = async_sessionmaker(_engine, expire_on_commit=False)
    return _engine


def session_factory() -> async_sessionmaker[AsyncSession]:
    get_engine()
    assert _session_factory is not None
    return _session_factory


async def dispose_engine() -> None:
    global _engine, _session_factory
    if _engine is not None:
        await _engine.dispose()
    _engine = None
    _session_factory = None


async def get_db() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: one session per request, rolled back if not committed."""
    async with session_factory()() as session:
        yield session
