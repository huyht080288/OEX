"""FastAPI application factory and dev entry point.

Run (from src/backendpy):  python -m app.main
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from .config import BASE_DIR, WORKSPACE_DIR, get_settings
from .db import dispose_engine
from .errors import AppError, CatchAllMiddleware, register_error_handlers
from .routers import api_router

COVERAGE_DIR = BASE_DIR / "coverage"


def resolve_openapi_path() -> Path:
    repo_root = BASE_DIR.parent
    candidates = [
        repo_root / "config" / "api" / "openapi.yaml",
        Path.cwd() / "config" / "api" / "openapi.yaml",
        Path.cwd() / "openapi.yaml",
        WORKSPACE_DIR / "docs" / "api" / "openapi.yaml",
        repo_root / "docs" / "api" / "openapi.yaml",
    ]
    for path in candidates:
        if path.exists():
            return path
    raise RuntimeError(f"OpenAPI spec not found. Tried: {', '.join(str(p) for p in candidates)}")


def _mount_swagger(app: FastAPI) -> None:
    spec_path = resolve_openapi_path()  # fail fast at startup, like the Node backend

    @app.get("/api/openapi.yaml", include_in_schema=False)
    async def openapi_yaml() -> PlainTextResponse:
        return PlainTextResponse(spec_path.read_text(encoding="utf-8"), media_type="text/yaml")

    async def swagger_ui() -> HTMLResponse:
        return get_swagger_ui_html(
            openapi_url="/api/openapi.yaml",
            title="OEX API — Swagger UI",
            swagger_ui_parameters={"persistAuthorization": True, "displayRequestDuration": True},
        )

    app.add_api_route("/api/docs", swagger_ui, methods=["GET"], include_in_schema=False)
    app.add_api_route("/api/docs/", swagger_ui, methods=["GET"], include_in_schema=False)


COVERAGE_PAGE = """<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OEX Test Coverage</title>
    <style>
      * { box-sizing: border-box; }
      html, body { height: 100%; margin: 0; }
      body { display: grid; grid-template-rows: auto 1fr; font-family: Arial, sans-serif; background: #f4f6fa; }
      nav { display: flex; align-items: center; gap: 8px; padding: 10px 16px; color: #fff; background: #002060; }
      nav strong { margin-right: 12px; }
      nav button, nav a { padding: 8px 12px; border: 1px solid rgba(255,255,255,.35); border-radius: 6px;
        color: #fff; background: rgba(255,255,255,.1); font: inherit; text-decoration: none; cursor: pointer; }
      nav .spacer { flex: 1; }
      iframe { width: 100%; height: 100%; border: 0; background: #fff; }
    </style>
  </head>
  <body>
    <nav aria-label="Coverage navigation">
      <strong>OEX Test Coverage (Python)</strong>
      <button type="button" onclick="document.getElementById('report').contentWindow.history.back()">&larr; Back</button>
      <button type="button" onclick="document.getElementById('report').src='/coverage/index.html'">Coverage Home</button>
      <button type="button" onclick="document.getElementById('report').contentWindow.location.reload()">Reload</button>
      <span class="spacer"></span>
      <a href="/api/docs" target="_blank" rel="noreferrer">Swagger</a>
      <a href="http://localhost:5001" target="_blank" rel="noreferrer">OEX App</a>
    </nav>
    <iframe id="report" name="report" src="/coverage/index.html" title="pytest coverage report"></iframe>
  </body>
</html>"""


def _mount_coverage(app: FastAPI) -> None:
    @app.get("/testcoverage.html", include_in_schema=False)
    async def coverage_page() -> HTMLResponse:
        return HTMLResponse(COVERAGE_PAGE)

    app.mount("/coverage", StaticFiles(directory=COVERAGE_DIR, html=True, check_dir=False), name="coverage")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    yield
    await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    if not settings.jwt_secret:
        raise RuntimeError("JWT_SECRET is not configured (set it in backendpy/.env)")

    app = FastAPI(
        title="OEX API (Python)",
        docs_url=None,
        redoc_url=None,
        openapi_url=None,
        lifespan=lifespan,
    )
    register_error_handlers(app)
    # Order matters: last added = outermost. CORS wraps error responses too.
    app.add_middleware(CatchAllMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.cors_origin],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health", include_in_schema=False)
    async def health() -> JSONResponse:
        return JSONResponse({"status": "ok"})

    if settings.swagger_enabled:
        _mount_swagger(app)
    if not settings.is_production:
        _mount_coverage(app)

    app.include_router(api_router)
    return app


def run() -> None:
    import uvicorn

    settings = get_settings()
    logging.basicConfig(level=logging.INFO)
    print(f"OEX API (Python) listening on http://localhost:{settings.port}/api/v1")
    if settings.swagger_enabled:
        print(f"Swagger UI: http://localhost:{settings.port}/api/docs")
    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host=settings.host,
        port=settings.port,
        reload=settings.app_env == "development",
        reload_dirs=[str(BASE_DIR / "app")],
    )


__all__ = ["AppError", "create_app", "run"]

if __name__ == "__main__":
    run()
