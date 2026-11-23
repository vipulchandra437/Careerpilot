"""The Alembic chain must build the current schema on a fresh database."""

import io
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
