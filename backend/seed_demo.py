from datetime import datetime, time, timedelta

from sqlalchemy import select

from app.database import SessionLocal
from app.models import Stop, Trip, Vehicle
from app.schemas.trip import TripCreate, TripStopCreate
from app.services.trips import create_trip

VEHICLES = [
    ("А101АА77", "ГАЗель City", 16),
    ("А102АА77", "ГАЗель City", 16),
    ("А103АА77", "Mercedes-Benz Sprinter", 18),
]

LINE = [
    ("Метро «Саларьево»", 0, 0),
    ("Метро «Прокшино»", 8, 40),
    ("Метро «Ольховая»", 16, 80),
    ("Метро «Коммунарка»", 24, 120),
]

FIRST_DEPARTURE = time(7, 0)
TRIPS_PER_DIRECTION = 6
INTERVAL_MIN = 30


def find_stop(db, name):
    return db.execute(
        select(Stop)
        .where(Stop.name == name, Stop.service_active.is_(True))
        .order_by(Stop.id)
    ).scalars().first()


def main() -> None:
    with SessionLocal() as db:
        stops = [find_stop(db, name) for name, _, _ in LINE]
        if any(s is None for s in stops):
            raise SystemExit("Остановки не найдены. Сначала выполните: python import_stops.py")

        if db.execute(select(Trip.id).where(Trip.origin_stop_id.is_not(None)).limit(1)).first():
            print("Демо-рейсы уже созданы, ничего не делаю.")
            return

        vehicles = []
        for plate, model, capacity in VEHICLES:
            vehicle = db.execute(select(Vehicle).where(Vehicle.plate_number == plate)).scalar_one_or_none()
            if vehicle is None:
                vehicle = Vehicle(plate_number=plate, model=model, capacity=capacity)
                db.add(vehicle)
                db.flush()
            vehicles.append(vehicle)
        db.commit()

        day = datetime.combine(datetime.now().date() + timedelta(days=1), FIRST_DEPARTURE)
        created = []
        for direction in (1, -1):
            line = list(zip(stops, LINE))[::direction]
            total_fare = LINE[-1][2]
            for n in range(TRIPS_PER_DIRECTION):
                start = day + timedelta(minutes=INTERVAL_MIN * n)
                total_minutes = LINE[-1][1]
                trip_stops = []
                for stop, (_, minutes, fare) in line:
                    offset = minutes if direction == 1 else total_minutes - minutes
                    cumulative = fare if direction == 1 else total_fare - fare
                    t = start + timedelta(minutes=offset)
                    trip_stops.append(
                        TripStopCreate(stop_id=stop.id, arrival_time=t, departure_time=t,
                                       fare_from_start=cumulative)
                    )
                vehicle = vehicles[(n + (0 if direction == 1 else 1)) % len(vehicles)]
                trip = create_trip(db, TripCreate(vehicle_id=vehicle.id, stops=trip_stops))
                created.append(trip.id)

        print(f"Создано автобусов: {len(vehicles)}, рейсов: {len(created)} (id {created[0]}–{created[-1]})")
        print(f"Дата рейсов: {day.date()}, остановки: " + " → ".join(n for n, _, _ in LINE))


if __name__ == "__main__":
    main()
