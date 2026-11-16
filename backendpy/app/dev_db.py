"""Local PostgreSQL for development — no Docker, no system install.

    python -m app.dev_db            → postgresql://oex:oex@localhost:5005/oex  (Ctrl+C to stop)

Uses the PostgreSQL binaries shipped in the `pgserver` pip package (requirements-dev.txt).
Data lives in backendpy/.pgdata-dev (gitignored). Credentials are dev-only dummy values.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from .config import BASE_DIR

DB_USER = "oex"
DB_PASSWORD = "oex"


def bin_dir() -> Path:
    try:
        from pgserver._commands import POSTGRES_BIN_PATH
    except ImportError:  # pragma: no cover - depends on install
        sys.exit("pgserver is not installed. Run: pip install -r requirements-dev.txt")
    return Path(POSTGRES_BIN_PATH)


def _exe(name: str) -> str:
    suffix = ".exe" if os.name == "nt" else ""
    return str(bin_dir() / f"{name}{suffix}")


def init_cluster(data_dir: Path) -> None:
    if (data_dir / "PG_VERSION").exists():
        return
    data_dir.mkdir(parents=True, exist_ok=True)
    print(f"Initialising PostgreSQL data dir: {data_dir}")
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".pw") as pw:
        pw.write(DB_PASSWORD)
        pw_path = pw.name
    try:
        subprocess.run(
            [
                _exe("initdb"),
                "-D", str(data_dir),
                "-U", DB_USER,
                "--pwfile", pw_path,
                "-A", "scram-sha-256",
                "-E", "UTF8",
                "--locale", "C",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
    finally:
        os.unlink(pw_path)


def start_server(data_dir: Path, port: int) -> None:
    log_file = data_dir / "server.log"
    subprocess.run(
        [_exe("pg_ctl"), "-D", str(data_dir), "-l", str(log_file), "-w",
         "-o", f"-p {port} -h 127.0.0.1", "start"],
        check=True,
        stdout=subprocess.DEVNULL,
    )


def stop_server(data_dir: Path) -> None:
    subprocess.run(
        [_exe("pg_ctl"), "-D", str(data_dir), "-m", "fast", "-w", "stop"],
        check=False,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def is_running(data_dir: Path) -> bool:
    result = subprocess.run(
        [_exe("pg_ctl"), "-D", str(data_dir), "status"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    return result.returncode == 0


async def _create_databases(port: int, names: list[str]) -> None:
    import asyncpg

    conn = await asyncpg.connect(
        host="127.0.0.1", port=port, user=DB_USER, password=DB_PASSWORD, database="postgres"
    )
    try:
        for name in names:
            exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", name)
            if not exists:
                await conn.execute(f'CREATE DATABASE "{name}"')
                print(f'Created database "{name}"')
    finally:
        await conn.close()


def ensure_server(data_dir: Path, port: int, databases: list[str]) -> str:
    """Init + start (if needed) + create databases. Returns the URL of the first database."""
    init_cluster(data_dir)
    if not is_running(data_dir):
        start_server(data_dir, port)
    asyncio.run(_create_databases(port, databases))
    return f"postgresql://{DB_USER}:{DB_PASSWORD}@localhost:{port}/{databases[0]}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Run a local PostgreSQL for OEX development.")
    parser.add_argument("--port", type=int, default=int(os.environ.get("DEV_DB_PORT", "5005")))
    parser.add_argument("--data-dir", type=Path, default=BASE_DIR / ".pgdata-dev")
    args = parser.parse_args()
    sys.stdout.reconfigure(line_buffering=True)  # show progress even when piped

    url = ensure_server(args.data_dir, args.port, ["oex", "oex_test"])
    print(f"PostgreSQL ready: {url} (Ctrl+C to stop)")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        print("Stopping PostgreSQL…")
        stop_server(args.data_dir)


if __name__ == "__main__":
    main()
