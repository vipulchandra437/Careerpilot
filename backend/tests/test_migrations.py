"""The Alembic chain must build the current schema on a fresh database."""

import io
import sqlite3
from pathlib import Path
from types import SimpleNamespace

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect

import backend.models  # noqa: F401 - register tables
from backend.database import Base

ROOT = Path(__file__).resolve().parents[2]


def _config(db_path: Path) -> Config:
    cfg = Config(str(ROOT / "alembic.ini"))
    cfg.set_main_option("script_location", str(ROOT / "alembic"))
    cfg.set_main_option("sqlalchemy.url", f"sqlite+aiosqlite:///{db_path.as_posix()}")
    return cfg


def test_upgrade_head_builds_every_current_table(tmp_path, monkeypatch):
    db_path = tmp_path / "fresh.db"
    url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))

    command.upgrade(_config(db_path), "head")

    tables = set(inspect(create_engine(f"sqlite:///{db_path.as_posix()}")).get_table_names())
    assert set(Base.metadata.tables) <= tables


def test_upgrade_014_adds_uniques_to_existing_sqlite_db(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy.db"
    url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))

    command.upgrade(_config(db_path), "013_roadmap_action_id_text")
    # Emulate an older DB that predates these constraints (SQLite cannot ALTER one).
    with sqlite3.connect(db_path) as conn:
        conn.execute("DROP INDEX ix_profile_snapshots_user_id")
        conn.execute("DROP INDEX ix_roadmaps_gap_report_id")
    command.upgrade(_config(db_path), "head")

    inspector = inspect(create_engine(f"sqlite:///{db_path.as_posix()}"))
    assert "token_version" in {c["name"] for c in inspector.get_columns("users")}
    for table, columns in [
        ("profile_snapshots", {"user_id"}),
        ("gap_reports", {"snapshot_id", "target_role_id"}),
        ("roadmaps", {"gap_report_id"}),
    ]:
        uniques = [
            set(index["column_names"])
            for index in inspector.get_indexes(table)
            if index["unique"]
        ] + [set(c["column_names"]) for c in inspector.get_unique_constraints(table)]
        assert columns in uniques


def test_upgrade_015_backfills_roadmap_status_columns(tmp_path, monkeypatch):
    db_path = tmp_path / "legacy.db"
    url = f"sqlite+aiosqlite:///{db_path.as_posix()}"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))

    command.upgrade(_config(db_path), "014_unique_aggregate_rows")
    # Older stamped databases were built before the model gained these columns.
    with sqlite3.connect(db_path) as conn:
        conn.execute("ALTER TABLE roadmaps DROP COLUMN status")
        conn.execute("ALTER TABLE roadmaps DROP COLUMN error")
    inspector = inspect(create_engine(f"sqlite:///{db_path.as_posix()}"))
    assert not {"status", "error"} & {c["name"] for c in inspector.get_columns("roadmaps")}

    command.upgrade(_config(db_path), "head")

    inspector = inspect(create_engine(f"sqlite:///{db_path.as_posix()}"))
    columns = {c["name"]: c for c in inspector.get_columns("roadmaps")}
    assert {"status", "error"} <= set(columns)
    assert columns["status"]["nullable"] is False


def test_postgres_offline_ddl_matches_model_ids(monkeypatch):
    url = "postgresql+asyncpg://u:p@localhost/db"
    monkeypatch.setattr("backend.config.get_settings", lambda: SimpleNamespace(database_url=url))

    cfg = _config(Path("unused.db"))
    output = io.StringIO()
    cfg.output_buffer = output
    command.upgrade(cfg, "head", sql=True)

    sql = output.getvalue()
    assert "CREATE TABLE users" in sql
    assert "VARCHAR(36)" in sql  # models use String(36), not PostgreSQL UUID
    assert "token_version" in sql
    # 001 baseline emits the current schema; later revisions must not repeat DDL.
    assert "ALTER TABLE mentor_messages ADD COLUMN conversation_id" not in sql
    for col in [
        "full_name",
        "headline",
        "bio",
        "location",
        "phone",
        "website",
        "linkedin_url",
        "github_url",
        "avatar_key",
    ]:
        assert col in sql
