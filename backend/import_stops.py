import sys
from pathlib import Path

from app.database import SessionLocal
from app.services.stops import DEFAULT_STOPS_JSON, import_stops_from_json


def main() -> None:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_STOPS_JSON

    if not path.exists():
        raise SystemExit(f"Файл не найден: {path}")

    with SessionLocal() as db:
        added, updated, skipped = import_stops_from_json(db, path)

    print(f"Импорт из {path}: добавлено {added}, обновлено {updated}, пропущено {skipped}")


if __name__ == "__main__":
    main()
