"""CRIT-3 regression: users.is_active must be backfilled on legacy databases."""

import io
import sqlite3
from pathlib import Path
from types import SimpleNamespace

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

import backend.models  # noqa: F401 - register tables


ROOT = Path(__file__).resolve().parents[2]


def _config(db_path: Path) -> Config:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_path.as_posix()}")
    return cfg


def _columns(db_path: Path) -> set[str]:
    return {c["name"] for c in inspect(create_engine(f"sqlite:///{db_path.as_posix()}")).get_columns("users")}


def test_upgrade_016_adds_users_is_active_idempotently(tmp_path, monkeypatch):
    db_path = tmp_path / "pre_016.db"
    url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))
    cfg = _config(db_path)

    command.upgrade(cfg, "015_roadmap_status_columns")
    with sqlite3.connect(db_path) as conn:
        conn.execute(
            "INSERT INTO users (id, email, role, credit_balance, is_active, token_version, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            ("legacy-user", "legacy@example.com", "student", 0, 1, 0, "2026-01-01T00:00:00"),
        )
        conn.execute("ALTER TABLE users DROP COLUMN is_active")

    assert "is_active" not in _columns(db_path)

    command.upgrade(cfg, "head")

    columns = {c["name"]: c for c in inspect(create_engine(f"sqlite:///{db_path.as_posix()}")).get_columns("users")}
    assert columns["is_active"]["nullable"] is False
    with sqlite3.connect(db_path) as conn:
        assert conn.execute(
            "SELECT is_active FROM users WHERE id = ?", ("legacy-user",)
        ).fetchone()[0] == 1

    # downgrade is a no-op, so re-running 016 with the column already present
    # must remain safe. This is the idempotency check.
    command.downgrade(cfg, "015_roadmap_status_columns")
    assert "is_active" in _columns(db_path)
    command.upgrade(cfg, "head")
    with sqlite3.connect(db_path) as conn:
        assert conn.execute(
            "SELECT is_active FROM users WHERE id = ?", ("legacy-user",)
        ).fetchone()[0] == 1


def test_016_offline_sql_contains_add_column(tmp_path, monkeypatch):
    db_path = tmp_path / "offline.db"
    url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))

    cfg = _config(db_path)
    output = io.StringIO()
    cfg.output_buffer = output

    command.upgrade(cfg, "015_roadmap_status_columns:016_users_is_active", sql=True)

    assert "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL" in output.getvalue()


def test_016_offline_sql_postgres_add_column(tmp_path, monkeypatch):
    url = "postgresql+asyncpg://verify:verify@localhost:5432/verify_offline"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))

    cfg = _config(tmp_path / "unused.db")
    output = io.StringIO()
    cfg.output_buffer = output

    command.upgrade(cfg, "015_roadmap_status_columns:016_users_is_active", sql=True)

    sql = output.getvalue()
    assert "ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL" in sql
    assert sql.count("ALTER TABLE users") == 1
    assert "DEFAULT 1" not in sql
