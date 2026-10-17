"""
Группировка предзаказов в рейсы (ФТ6). Вариант 1: жадная вставка.

Идея простая: идём по предзаказам в порядке времени посадки.
Каждый заказ пытаемся добавить в уже существующий рейс.
Если ни один рейс не подходит, открываем новый.

Все пороги собраны в Params: их нужно согласовать с командой
и записать в docs/business-rules.md.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timedelta


@dataclass(frozen=True)
class Stop:
    id: str
    lat: float
    lon: float


@dataclass(frozen=True)
class Preorder:
    id: str
    from_stop: Stop
    to_stop: Stop
    earliest: datetime      # самое раннее время посадки
    seats: int = 1


@dataclass
class Params:
    time_window: timedelta = timedelta(minutes=15)   # разница времени посадки
    stop_radius_m: float = 500.0                     # радиус остановок
    max_bearing_diff_deg: float = 45.0               # допустимый угол направления
    max_detour_ratio: float = 1.5                    # допустимое удлинение поездки


@dataclass
class Trip:
    id: str
    orders: list[Preorder] = field(default_factory=list)

    @property
    def seats_used(self) -> int:
        return sum(o.seats for o in self.orders)

    @property
    def start_time(self) -> datetime:
        return min(o.earliest for o in self.orders)


# --- геометрия -------------------------------------------------------------

def haversine_m(a: Stop, b: Stop) -> float:
    """Расстояние между двумя точками на Земле, в метрах."""
    r = 6_371_000.0
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dp = p2 - p1
    dl = math.radians(b.lon - a.lon)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def bearing_deg(a: Stop, b: Stop) -> float:
    """Направление от a к b, в градусах (0 = север)."""
    p1, p2 = math.radians(a.lat), math.radians(b.lat)
    dl = math.radians(b.lon - a.lon)
    x = math.sin(dl) * math.cos(p2)
    y = math.cos(p1) * math.sin(p2) - math.sin(p1) * math.cos(p2) * math.cos(dl)
    return (math.degrees(math.atan2(x, y)) + 360) % 360


def angle_diff(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


# --- условия совместимости -------------------------------------------------

def is_compatible(trip: Trip, order: Preorder, p: Params, capacity: int) -> bool:
    """Можно ли добавить заказ в рейс, не нарушая правила."""
    # 1. Вместимость
    if trip.seats_used + order.seats > capacity:
        return False

    # 2. Время посадки: не дальше окна от рейса
    if abs(order.earliest - trip.start_time) > p.time_window:
        return False

    # 3. Остановки: посадка и высадка рядом с остановками рейса
    near_pickup = any(
        haversine_m(order.from_stop, o.from_stop) <= p.stop_radius_m for o in trip.orders
    )
    near_dropoff = any(
        haversine_m(order.to_stop, o.to_stop) <= p.stop_radius_m for o in trip.orders
    )
    if not (near_pickup and near_dropoff):
        return False

    # 4. Направление: едем примерно в одну сторону
    b_new = bearing_deg(order.from_stop, order.to_stop)
    for o in trip.orders:
        if angle_diff(b_new, bearing_deg(o.from_stop, o.to_stop)) > p.max_bearing_diff_deg:
            return False

    # 5. Отклонение: приближённо по прямым расстояниям
    if not _detour_ok(trip, order, p):
        return False

    return True


def _detour_ok(trip: Trip, order: Preorder, p: Params) -> bool:
    """
    Приближённая проверка удлинения поездки.
    Длина рейса: от первой посадки до последней высадки по прямой.
    Новый заказ допустим, если его поездка через общий путь не удлиняет
    рейс больше, чем в max_detour_ratio раз.
    """
    first = trip.orders[0].from_stop
    last = trip.orders[0].to_stop
    base = haversine_m(first, last) or 1.0
    via = haversine_m(first, order.from_stop) + haversine_m(order.from_stop, last)
    return via / base <= p.max_detour_ratio


# --- основной алгоритм -----------------------------------------------------

def build_trips_greedy(preorders: list[Preorder], p: Params, capacity: int) -> list[Trip]:
    trips: list[Trip] = []
    for order in sorted(preorders, key=lambda o: o.earliest):
        target = next((t for t in trips if is_compatible(t, order, p, capacity)), None)
        if target is None:
            target = Trip(id=f"trip_{len(trips) + 1}")
            trips.append(target)
        target.orders.append(order)
    return trips
