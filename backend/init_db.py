from pathlib import Path

from alembic import command
from alembic.config import Config


if __name__ == "__main__":
    backend = Path(__file__).resolve().parent
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "migrations"))
    command.upgrade(config, "head")
