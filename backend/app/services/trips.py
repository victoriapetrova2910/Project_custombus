from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple

from sqlalchemy import select
from sqlalchemy.orm import Session, aliased, joinedload, selectinload

from app.models import Stop, Trip, TripStop, Vehicle
from app.schemas.stop import StopShort
from app.schemas.trip import (
    TripCreate,
    TripDetailResponse,
    TripSearchItem,
    TripSearchRequest,
    TripSearchResponse,
    TripStopResponse,
)

MIN_LEAD_TIME = timedelta(minutes=30)
MAX_LEAD_TIME = timedelta(hours=48)


class TripServiceError(Exception):

    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


def _now() -> datetime:
    return datetime.now()


def _segment_query(from_stop_id: int, to_stop_id: int):
    a = aliased(TripStop)
    b = aliased(TripStop)
    query = (
        select(Trip, a, b)
        .join(a, a.trip_id == Trip.id)
        .join(b, b.trip_id == Trip.id)
        .where(
            a.stop_id == from_stop_id,
            b.stop_id == to_stop_id,
            a.stop_sequence < b.stop_sequence,
        )
    )
    return query, a, b


def create_trip(db: Session, data: TripCreate) -> Trip:
    vehicle = None
    if data.vehicle_id is not None:
        vehicle = db.get(Vehicle, data.vehicle_id)
        if vehicle is None:
            raise TripServiceError(404, "Автобус не найден")
        if vehicle.status != "active":
            raise TripServiceError(409, "Автобус сейчас недоступен для рейсов")

    if not data.stops:
        total_seats = data.total_seats if data.total_seats is not None else vehicle.capacity
        if vehicle is not None and total_seats > vehicle.capacity:
            raise TripServiceError(422, "total_seats больше вместимости автобуса")

        trip = Trip(
            departure_point=data.departure_point,
            destination_point=data.destination_point,
            departure_time=data.departure_time,
            total_seats=total_seats,
            available_seats=total_seats,
            vehicle_id=data.vehicle_id,
        )
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return trip

    stop_ids = [s.stop_id for s in data.stops]
    if len(set(stop_ids)) != len(stop_ids):
        raise TripServiceError(422, "Остановка не может встречаться в рейсе дважды")

    found = {
        s.id: s for s in db.execute(select(Stop).where(Stop.id.in_(stop_ids))).scalars()
    }
    missing = [sid for sid in stop_ids if sid not in found]
    if missing:
        raise TripServiceError(404, f"Остановки не найдены: {missing}")

    total_seats = data.total_seats if data.total_seats is not None else vehicle.capacity
    if vehicle is not None and total_seats > vehicle.capacity:
        raise TripServiceError(422, "total_seats больше вместимости автобуса")

    prev_departure = None
    prev_fare = Decimal("0")
    trip_stops: List[TripStop] = []
    for index, item in enumerate(data.stops, start=1):
        departure = item.departure_time or item.arrival_time
        if departure < item.arrival_time:
            raise TripServiceError(422, f"Остановка {item.stop_id}: отправление раньше прибытия")
        if prev_departure is not None and item.arrival_time < prev_departure:
            raise TripServiceError(422, "Время на остановках должно идти по возрастанию")
        if item.fare_from_start < prev_fare:
            raise TripServiceError(422, "Накопленная стоимость не может убывать")

        trip_stops.append(
            TripStop(
                stop_id=item.stop_id,
                stop_sequence=index,
                arrival_time=item.arrival_time,
                departure_time=departure,
                fare_from_start=item.fare_from_start,
            )
        )
        prev_departure = departure
        prev_fare = item.fare_from_start

    first, last = trip_stops[0], trip_stops[-1]
    trip = Trip(
        departure_point=found[first.stop_id].name,
        destination_point=found[last.stop_id].name,
        departure_time=first.departure_time,
        arrival_time=last.arrival_time,
        origin_stop_id=first.stop_id,
        destination_stop_id=last.stop_id,
        total_seats=total_seats,
        available_seats=total_seats,
        vehicle_id=data.vehicle_id,
        trip_stops=trip_stops,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


def list_trips(
    db: Session,
    *,
    from_stop_id: Optional[int] = None,
    to_stop_id: Optional[int] = None,
    on_date: Optional[date] = None,
    status: Optional[str] = None,
    available_only: bool = True,
    limit: int = 50,
    offset: int = 0,
    now: Optional[datetime] = None,
) -> List[Trip]:
    now = now or _now()

    if (from_stop_id is None) != (to_stop_id is None):
        raise TripServiceError(422, "Параметры from_stop_id и to_stop_id нужно передавать вместе")

    if from_stop_id is not None:
        query, a, _ = _segment_query(from_stop_id, to_stop_id)
        query = query.with_only_columns(Trip)
    else:
        query = select(Trip)

    if status:
        query = query.where(Trip.status == status)
    if available_only:
        query = query.where(
            Trip.status == "scheduled",
            Trip.available_seats > 0,
            Trip.departure_time >= now,
        )
    if on_date is not None:
        day_start = datetime.combine(on_date, datetime.min.time())
        query = query.where(
            Trip.departure_time >= day_start,
            Trip.departure_time < day_start + timedelta(days=1),
        )

    query = query.order_by(Trip.departure_time, Trip.id).limit(limit).offset(offset)
    return list(db.execute(query).scalars().all())


def get_trip_detail(db: Session, trip_id: int) -> Optional[TripDetailResponse]:
    trip = db.execute(
        select(Trip)
        .where(Trip.id == trip_id)
        .options(selectinload(Trip.trip_stops).joinedload(TripStop.stop))
    ).scalar_one_or_none()

    if trip is None:
        return None

    stops = [
        TripStopResponse(
            sequence=ts.stop_sequence,
            stop=StopShort.model_validate(ts.stop),
            arrival_time=ts.arrival_time,
            departure_time=ts.departure_time,
            fare_from_start=ts.fare_from_start,
        )
        for ts in trip.trip_stops
    ]

    detail = TripDetailResponse.model_validate(trip)
    detail.stops = stops
    detail.total_fare = stops[-1].fare_from_start if stops else None
    return detail


def search_trips(
    db: Session,
    request: TripSearchRequest,
    now: Optional[datetime] = None,
) -> TripSearchResponse:
    now = now or _now()
    requested = datetime.combine(request.date, request.time)

    if requested < now + MIN_LEAD_TIME:
        raise TripServiceError(
            422, "Предзаказ возможен не позже чем за 30 минут до отправления"
        )
    if requested > now + MAX_LEAD_TIME:
        raise TripServiceError(
            422, "Предзаказ возможен не раньше чем за 48 часов до отправления"
        )

    stops = {
        s.id: s
        for s in db.execute(
            select(Stop).where(Stop.id.in_([request.from_stop_id, request.to_stop_id]))
        ).scalars()
    }
    for stop_id in (request.from_stop_id, request.to_stop_id):
        if stop_id not in stops:
            raise TripServiceError(404, f"Остановка {stop_id} не найдена")

    window = timedelta(minutes=request.time_window_minutes)
    earliest = max(requested - window, now + MIN_LEAD_TIME)
    latest = requested + window

    query, a, b = _segment_query(request.from_stop_id, request.to_stop_id)
    query = (
        query.where(
            Trip.status == "scheduled",
            Trip.available_seats >= request.seats_count,
            a.departure_time >= earliest,
            a.departure_time <= latest,
        )
        .order_by(a.departure_time, Trip.id)
    )

    rows: List[Tuple[Trip, TripStop, TripStop]] = list(db.execute(query).all())
    rows.sort(key=lambda r: (abs(r[1].departure_time - requested), r[0].id))

    from_short = StopShort.model_validate(stops[request.from_stop_id])
    to_short = StopShort.model_validate(stops[request.to_stop_id])

    items = []
    for trip, start, end in rows:
        price = (end.fare_from_start - start.fare_from_start).quantize(Decimal("0.01"))
        items.append(
            TripSearchItem(
                trip_id=trip.id,
                from_stop=from_short,
                to_stop=to_short,
                departure_time=start.departure_time,
                arrival_time=end.arrival_time,
                duration_minutes=int((end.arrival_time - start.departure_time).total_seconds() // 60),
                available_seats=trip.available_seats,
                price_per_seat=price,
                total_price=(price * request.seats_count).quantize(Decimal("0.01")),
                vehicle_id=trip.vehicle_id,
            )
        )

    return TripSearchResponse(
        requested_departure=requested,
        seats_count=request.seats_count,
        total=len(items),
        items=items,
    )
