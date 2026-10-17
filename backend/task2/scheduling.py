"""
Распределение автобусов по рейсам (ФТ7). Метод: best fit.

Для каждого рейса берём самый маленький свободный автобус,
в который помещаются все пассажиры. Один автобус не может
быть назначен на два рейса, если между ними нет времени на дорогу.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta

from algorithm.grouping import Trip


@dataclass
class Vehicle:
    id: str
    capacity: int
    busy: list[tuple[datetime, datetime]] = field(default_factory=list)


def is_free(vehicle: Vehicle, start: datetime, end: datetime, buffer: timedelta) -> bool:
    """Свободен ли автобус в интервал [start, end] с учётом буфера."""
    for b_start, b_end in vehicle.busy:
        if start < b_end + buffer and b_start < end + buffer:
            return False
    return True


def assign_vehicles(
    trips: list[Trip],
    vehicles: list[Vehicle],
    trip_duration: timedelta = timedelta(minutes=40),
    buffer: timedelta = timedelta(minutes=15),
) -> dict[str, str | None]:
    """
    Возвращает {trip_id: vehicle_id или None}.
    None означает, что подходящего автобуса нет (нужно решение диспетчера).
    """
    result: dict[str, str | None] = {}
    for trip in sorted(trips, key=lambda t: t.start_time):
        start = trip.start_time
        end = start + trip_duration
        candidates = [
            v for v in vehicles
            if v.capacity >= trip.seats_used and is_free(v, start, end, buffer)
        ]
        if not candidates:
            result[trip.id] = None
            continue
        best = min(candidates, key=lambda v: v.capacity)   # best fit
        best.busy.append((start, end))
        result[trip.id] = best.id
    return result
