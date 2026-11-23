from pathlib import Path

from backend.config import ENV_FILE, Settings


def test_env_file_is_repo_root_dotenv():
    # uvicorn is started from the repo root per README, where .env also lives.
    assert ENV_FILE == Path(__file__).resolve().parents[2] / ".env"
    assert Settings.model_config["env_file"] == ENV_FILE


def test_env_example_is_a_valid_settings_source():
    # Copying .env.example to .env must not fail backend startup on extra keys.
    Settings(_env_file=ENV_FILE.parent / ".env.example")
