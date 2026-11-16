"""Response envelopes and error handling (same contract as the Node backend, design §9).

Success: { "success": true,  "data": ..., "message": "..." }
Error:   { "success": false, "error": { "code", "message", "details"? } }
"""

from __future__ import annotations

import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
from sqlalchemy.exc import DBAPIError, InterfaceError, OperationalError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send

logger = logging.getLogger("oex")


class AppError(Exception):
    def __init__(
        self, status_code: int, code: str, message: str, details: list[Any] | None = None
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def ok(data: Any, message: str = "OK", status_code: int = 200) -> JSONResponse:
    return JSONResponse({"success": True, "data": data, "message": message}, status_code=status_code)


def no_content() -> Response:
    return Response(status_code=204)


def error_response(
    status_code: int, code: str, message: str, details: list[Any] | None = None
) -> JSONResponse:
    error: dict[str, Any] = {"code": code, "message": message}
    if details:
        error["details"] = details
    return JSONResponse({"success": False, "error": error}, status_code=status_code)


def _validation_details(exc: RequestValidationError) -> list[dict[str, str]]:
    details = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", ()) if p not in ("body", "query", "path")]
        details.append({"path": ".".join(loc), "message": err.get("msg", "Invalid value")})
    return details


def _is_db_unavailable(exc: BaseException) -> bool:
    """Connection refused / DB missing / auth failure → 503 instead of 500."""
    seen: set[int] = set()
    current: BaseException | None = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, (OSError, ConnectionError, OperationalError, InterfaceError)):
            return True
        name = type(current).__name__
        if name in (
            "InvalidPasswordError",
            "InvalidCatalogNameError",
            "CannotConnectNowError",
            "ConnectionDoesNotExistError",
        ):
            return True
        if isinstance(current, DBAPIError) and current.connection_invalidated:
            return True
        current = current.__cause__ or current.__context__
    return False


def unhandled_error_response(exc: BaseException) -> JSONResponse:
    if _is_db_unavailable(exc):
        return error_response(
            503,
            "SERVICE_UNAVAILABLE",
            "Database is unavailable. Start PostgreSQL (python -m app.dev_db) and run migrations.",
        )
    logger.exception("Unhandled error", exc_info=exc)
    return error_response(500, "INTERNAL_ERROR", "Internal server error")


class CatchAllMiddleware:
    """Turns unexpected exceptions into the JSON error envelope (500 / 503)."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        started = False

        async def send_wrapper(message: Message) -> None:
            nonlocal started
            if message["type"] == "http.response.start":
                started = True
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        except Exception as exc:  # noqa: BLE001 — last-resort handler
            if started:
                raise
            await unhandled_error_response(exc)(scope, receive, send)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_req: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_req: Request, exc: RequestValidationError) -> JSONResponse:
        return error_response(400, "VALIDATION_ERROR", "Invalid input", _validation_details(exc))

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_req: Request, exc: StarletteHTTPException) -> JSONResponse:
        codes = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED", 401: "UNAUTHORIZED", 403: "FORBIDDEN"}
        code = codes.get(exc.status_code, "HTTP_ERROR")
        message = "Route not found" if exc.status_code == 404 else str(exc.detail)
        return error_response(exc.status_code, code, message)
