"""Test setup: prepare the test database (migrate + seed) and one app client per session.

Database selection (no Docker needed):
1. DATABASE_URL from backendpy/.env.test (default: localhost:5005/oex_test, created by `python -m app.dev_db`)
2. If unreachable → start an embedded PostgreSQL on port 5434 (data in backendpy/.pgdata-test)
"""

from __future__ import annotations

import asyncio
import os
import time
import uuid
from collections.abc import Callable, Iterator
from pathlib import Path

import pytest
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Test environment must be set before the app reads its settings.
if (BASE_DIR / ".env.test").exists():
    load_dotenv(BASE_DIR / ".env.test", override=True)
os.environ.setdefault("DATABASE_URL", "postgresql://oex:oex@localhost:5005/oex_test?schema=public")
os.environ.setdefault("JWT_SECRET", "test-only-secret-not-for-real-use-0123456789")
os.environ.setdefault("JWT_EXPIRES_IN", "1h")
os.environ["APP_ENV"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.config import to_async_url  # noqa: E402
from app.db import make_engine  # noqa: E402
from app.seed_data import SEED_PASSWORD, SEED_USERS  # noqa: E402

EMBEDDED_PORT = 5434


def _asyncpg_dsn(url: str) -> str:
    return to_async_url(url).replace("postgresql+asyncpg://", "postgresql://")


async def _can_connect(url: str) -> bool:
    import asyncpg

    try:
        conn = await asyncpg.connect(_asyncpg_dsn(url), timeout=3)
    except Exception:
        return False
    await conn.close()
    return True


def _migrate(url: str) -> None:
    from alembic import command
    from alembic.config import Config

    cfg = Config(str(BASE_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BASE_DIR / "alembic"))
    cfg.attributes["database_url"] = to_async_url(url)
    command.upgrade(cfg, "head")


@pytest.fixture(scope="session", autouse=True)
def database_url() -> Iterator[str]:
    url = os.environ["DATABASE_URL"]
    started_dir: Path | None = None

    if not asyncio.run(_can_connect(url)):
        from app import dev_db

        started_dir = BASE_DIR / ".pgdata-test"
        url = dev_db.ensure_server(started_dir, EMBEDDED_PORT, ["oex_test"])
        os.environ["DATABASE_URL"] = url

    _migrate(url)
    from app.seed import seed

    asyncio.run(seed(to_async_url(url), verbose=False))
    yield url

    if started_dir is not None:
        from app import dev_db

        dev_db.stop_server(started_dir)


@pytest.fixture(scope="session")
def client(database_url: str) -> Iterator[TestClient]:
    from app.main import create_app

    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def login_as(client: TestClient) -> Callable[[str], str]:
    """login_as('teacher') → access token for a seed user (cached per session)."""
    cache: dict[str, str] = {}

    def _login(key: str) -> str:
        if key not in cache:
            user = SEED_USERS[key]
            res = client.post("/api/v1/auth/login", json={"email": user["email"], "password": SEED_PASSWORD})
            assert res.status_code == 200, f"Login failed for {user['email']}: {res.text}"
            cache[key] = res.json()["data"]["accessToken"]
        return cache[key]

    return _login


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def unique(prefix: str) -> str:
    return f"{prefix}{int(time.time() * 1000)}{uuid.uuid4().hex[:6]}"


def run_db(fn) -> None:
    """Run `await fn(conn)` against the test DB in its own event loop + transaction."""

    async def _main() -> None:
        engine = make_engine(to_async_url(os.environ["DATABASE_URL"]))
        try:
            async with engine.begin() as conn:
                await fn(conn)
        finally:
            await engine.dispose()

    asyncio.run(_main())
