from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.schemas.stop import StopShort


class TripStopCreate(BaseModel):
    stop_id: int = Field(gt=0)
    arrival_time: datetime
    departure_time: Optional[datetime] = None
    fare_from_start: Decimal = Field(default=Decimal("0"), ge=0)


class TripCreate(BaseModel):
    """Создание рейса.

    Два способа (старый формат продолжает работать):
    1) departure_point / destination_point строками (без остановок);
    2) список stops — тогда точки отправления/назначения и время берутся из него.
    """

    departure_point: Optional[str] = Field(default=None, min_length=1, max_length=255)
    destination_point: Optional[str] = Field(default=None, min_length=1, max_length=255)
    departure_time: Optional[datetime] = None
    total_seats: Optional[int] = Field(default=None, gt=0)
    vehicle_id: Optional[int] = Field(default=None, gt=0)
    stops: Optional[List[TripStopCreate]] = None

    @model_validator(mode="after")
    def _check(self):
        if self.stops:
            if len(self.stops) < 2:
                raise ValueError("В рейсе должно быть минимум 2 остановки")
            if self.vehicle_id is None and self.total_seats is None:
                raise ValueError("Укажите total_seats или vehicle_id")
        else:
            missing = [
                name
                for name in (
                    "departure_point",
                    "destination_point",
                    "departure_time",
                    "total_seats",
                )
                if getattr(self, name) is None
            ]
            if missing:
                raise ValueError(
                    "Без списка stops обязательны поля: " + ", ".join(missing)
                )
        return self


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    departure_point: str
    destination_point: str
    departure_time: datetime
    total_seats: int
    available_seats: int
    origin_stop_id: Optional[int] = None
    destination_stop_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    arrival_time: Optional[datetime] = None
    status: str = "scheduled"


class TripStopResponse(BaseModel):
    sequence: int
    stop: StopShort
    arrival_time: datetime
    departure_time: datetime
    fare_from_start: Decimal


class TripDetailResponse(TripResponse):
    total_fare: Optional[Decimal] = None
    stops: List[TripStopResponse] = []


class TripSearchRequest(BaseModel):
    """Параметры поиска. Время посадки — на остановке отправления."""

    from_stop_id: int = Field(gt=0)
    to_stop_id: int = Field(gt=0)
    date: date
    time: time
    seats_count: int = Field(default=1, ge=1, le=10)
    time_window_minutes: int = Field(default=30, ge=0, le=240)

    @model_validator(mode="after")
    def _different_stops(self):
        if self.from_stop_id == self.to_stop_id:
            raise ValueError("Остановки отправления и назначения совпадают")
        return self


class TripSearchItem(BaseModel):
    trip_id: int
    from_stop: StopShort
    to_stop: StopShort
    departure_time: datetime
    arrival_time: datetime
    duration_minutes: int
    available_seats: int
    price_per_seat: Decimal
    total_price: Decimal
    vehicle_id: Optional[int] = None


class TripSearchResponse(BaseModel):
    requested_departure: datetime
    seats_count: int
    total: int
    items: List[TripSearchItem]
