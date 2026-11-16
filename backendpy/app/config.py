"""Settings read from environment variables (and `backendpy/.env` if present).

DATABASE_URL uses the same format as the Node backend
(`postgresql://user:pass@host:port/db?schema=public`) so the same value works for both.
"""

from __future__ import annotations

import os
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent  # src/backendpy
WORKSPACE_DIR = BASE_DIR.parent.parent  # folder that holds src/ and docs/

DEFAULT_DATABASE_URL = "postgresql://oex:oex@localhost:5005/oex?schema=public"

_loaded = False


def load_env_file() -> None:
    """Load backendpy/.env once. Variables already set in the process win."""
    global _loaded
    if not _loaded:
        load_dotenv(BASE_DIR / ".env", override=False)
        _loaded = True


def to_async_url(url: str) -> str:
    """postgresql://… → postgresql+asyncpg://…, dropping Prisma-only `schema` param."""
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme in ("postgres", "postgresql"):
        scheme = "postgresql+asyncpg"
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "schema"]
    return urlunsplit((scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


def parse_expires_in(raw: str) -> int:
    """'1h' / '30m' / '45s' / '7d' → seconds (same rule as the Node backend)."""
    match = re.fullmatch(r"(\d+)([smhd])", raw.strip())
    if not match:
        return 3600
    multipliers = {"s": 1, "m": 60, "h": 3600, "d": 86400}
    return int(match.group(1)) * multipliers[match.group(2)]


@dataclass(frozen=True)
class Settings:
    database_url: str
    jwt_secret: str | None
    jwt_expires_in: int
    host: str
    port: int
    cors_origin: str
    app_env: str
    swagger_enabled: bool

    @property
    def async_database_url(self) -> str:
        return to_async_url(self.database_url)

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


def get_settings() -> Settings:
    load_env_file()
    env = os.environ
    return Settings(
        database_url=env.get("DATABASE_URL", DEFAULT_DATABASE_URL),
        jwt_secret=env.get("JWT_SECRET") or None,
        jwt_expires_in=parse_expires_in(env.get("JWT_EXPIRES_IN", "1h")),
        host=env.get("HOST", "127.0.0.1"),
        port=int(env.get("PORT", "5002")),
        cors_origin=env.get("CORS_ORIGIN", "http://localhost:5001"),
        app_env=env.get("APP_ENV") or env.get("NODE_ENV") or "development",
        swagger_enabled=env.get("SWAGGER_ENABLED", "true").lower() != "false",
    )
