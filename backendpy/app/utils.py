"""Small helpers shared by services: time, ISO dates, numbers, LIKE escaping."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Same rule as zod `z.string().datetime()`: UTC only, optional fraction, trailing Z.
ISO_UTC_PATTERN = re.compile(r"^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?Z$")

# zod v3 `uuid()` pattern.
UUID_PATTERN = (
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

# Close to zod v3 `email()`.
EMAIL_PATTERN = (
    r"^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$"
)


def truncate_ms(dt: datetime) -> datetime:
    """DB columns are TIMESTAMP(3): keep millisecond precision only."""
    return dt.replace(microsecond=(dt.microsecond // 1000) * 1000)


def utcnow() -> datetime:
    """Naive UTC 'now' with ms precision (timestamps are stored as naive UTC, like Prisma)."""
    return truncate_ms(datetime.now(timezone.utc).replace(tzinfo=None))


def iso(dt: datetime | None) -> str | None:
    """JS `Date.toISOString()` format: 2026-01-31T08:00:00.000Z."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def parse_iso_utc(value: str) -> datetime:
    """Parse an ISO string accepted by ISO_UTC_PATTERN into naive UTC (ms precision)."""
    match = ISO_UTC_PATTERN.match(value)
    if not match:
        raise ValueError("Invalid datetime")
    year, month, day, hour, minute, second, fraction = match.groups()
    micro = int((fraction or "0")[:6].ljust(6, "0"))
    dt = datetime(int(year), int(month), int(day), int(hour), int(minute), int(second), micro)
    return truncate_ms(dt)


def minutes_later(dt: datetime, minutes: int) -> datetime:
    return dt + timedelta(minutes=minutes)


def num(value: Decimal | float | int | None) -> int | float | None:
    """Decimal → JSON number like JS `Number(decimal)`: 4.00 → 4, 1.50 → 1.5."""
    if value is None:
        return None
    d = Decimal(value)
    if d == d.to_integral_value():
        return int(d)
    return float(d)


def like_pattern(text: str) -> str:
    """Case-insensitive 'contains' pattern with LIKE wildcards escaped (use escape='\\')."""
    escaped = text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
