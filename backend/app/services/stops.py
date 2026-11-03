import json
import math
from pathlib import Path
from typing import Iterable, Optional, Tuple

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Stop

DEFAULT_STOPS_JSON = Path(__file__).resolve().parents[3] / "data" / "stops.json"

STOP_FIELDS = (
    "stop_code",
    "name",
    "latitude",
    "longitude",
    "zone",
    "subzone",
    "service_active",
    "is_drt_hub",
    "transport_type",
    "has_pavilion",
    "operating_org",
    "electrification",
)

EARTH_RADIUS_M = 6_371_000.0


def _clean_stop(raw: dict) -> Optional[dict]:
    try:
        stop_id = int(raw["id"])
        lat = float(raw["latitude"])
        lon = float(raw["longitude"])
    except (KeyError, TypeError, ValueError):
        return None

    name = (raw.get("name") or "").strip()
    if not name or not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        return None

    data = {
        "id": stop_id,
        "stop_code": str(raw["stop_code"]) if raw.get("stop_code") not in (None, "") else None,
        "name": name[:255],
        "latitude": lat,
        "longitude": lon,
        "zone": raw.get("zone"),
        "subzone": raw.get("subzone"),
        "service_active": bool(raw.get("service_active", False)),
        "is_drt_hub": bool(raw.get("is_drt_hub", False)),
        "transport_type": raw.get("transport_type"),
        "has_pavilion": bool(raw.get("has_pavilion", False)),
        "operating_org": raw.get("operating_org"),
        "electrification": raw.get("electrification"),
    }
    return data


def import_stops(db: Session, records: Iterable[dict]) -> Tuple[int, int, int]:
    cleaned = {}
    skipped = 0
    for raw in records:
        item = _clean_stop(raw)
        if item is None:
            skipped += 1
            continue
        if item["id"] in cleaned:  
            skipped += 1
            continue
        cleaned[item["id"]] = item

    existing = {
        stop.id: stop
        for stop in db.execute(select(Stop).where(Stop.id.in_(list(cleaned)))).scalars()
    } if cleaned else {}

    added = updated = 0
    for stop_id, item in cleaned.items():
        stop = existing.get(stop_id)
        if stop is None:
            db.add(Stop(**item))
            added += 1
        else:
            for field in STOP_FIELDS:
                setattr(stop, field, item[field])
            updated += 1

    db.commit()
    return added, updated, skipped


def import_stops_from_json(db: Session, path: Path = DEFAULT_STOPS_JSON) -> Tuple[int, int, int]:
    with open(path, encoding="utf-8") as file:
        payload = json.load(file)

    records = payload["stops"] if isinstance(payload, dict) else payload
    return import_stops(db, records)


def _distance_expr(lat: float, lon: float):
    k = math.pi / 180.0
    dx = (Stop.longitude - lon) * k * math.cos(lat * k)
    dy = (Stop.latitude - lat) * k
    return EARTH_RADIUS_M * func.sqrt(dx * dx + dy * dy)


def list_stops(
    db: Session,
    *,
    q: Optional[str] = None,
    zone: Optional[str] = None,
    subzone: Optional[str] = None,
    service_active: Optional[bool] = None,
    is_drt_hub: Optional[bool] = None,
    lat: Optional[float] = None,
    lon: Optional[float] = None,
    radius_m: Optional[float] = None,
    limit: int = 50,
    offset: int = 0,
):
    conditions = []

    if q:
        pattern = "%" + q.strip().replace("%", r"\%").replace("_", r"\_") + "%"
        conditions.append(Stop.name.ilike(pattern, escape="\\"))
    if zone:
        conditions.append(Stop.zone == zone)
    if subzone:
        conditions.append(Stop.subzone.ilike(f"%{subzone}%"))
    if service_active is not None:
        conditions.append(Stop.service_active == service_active)
    if is_drt_hub is not None:
        conditions.append(Stop.is_drt_hub == is_drt_hub)

    near = lat is not None and lon is not None
    if near:
        distance = _distance_expr(lat, lon)
        if radius_m is not None:
            conditions.append(distance <= radius_m)

    total = db.execute(
        select(func.count()).select_from(Stop).where(*conditions)
    ).scalar_one()

    query = select(Stop).where(*conditions)
    query = query.order_by(distance, Stop.id) if near else query.order_by(Stop.name, Stop.id)
    items = db.execute(query.limit(limit).offset(offset)).scalars().all()

    return total, items


def get_stop(db: Session, stop_id: int) -> Optional[Stop]:
    return db.get(Stop, stop_id)
