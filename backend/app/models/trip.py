
from datetime import datetime

from decimal import Decimal
from typing import List, Optional

from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    departure_point: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    destination_point: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    departure_time: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    total_seats: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    available_seats: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    origin_stop_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("stops.id", name="fk_trips_origin_stop", ondelete="SET NULL"),
    )
    destination_stop_id: Mapped[Optional[int]] = mapped_column(
        BigInteger, ForeignKey("stops.id", name="fk_trips_destination_stop", ondelete="SET NULL"),
    )
    vehicle_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("vehicles.id", name="fk_trips_vehicle", ondelete="SET NULL"),
    )
    arrival_time: Mapped[Optional[datetime]] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String(20), server_default="scheduled")
    created_at: Mapped[Optional[datetime]] = mapped_column(DateTime, server_default=func.now())
    trip_stops: Mapped[List["TripStop"]] = relationship(
        back_populates="trip",
        order_by="TripStop.stop_sequence",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        CheckConstraint("total_seats > 0", name="ck_trips_total_seats_positive"),
        CheckConstraint(
            "available_seats >= 0 AND available_seats <= total_seats",
            name="ck_trips_available_seats_range",
        ),
        CheckConstraint(
            "status IN ('scheduled', 'in_progress', 'completed', 'cancelled')",
            name="ck_trips_status",
        ),
        Index("ix_trips_departure_time", "departure_time"),
        Index("ix_trips_status_departure", "status", "departure_time"),
        Index("ix_trips_vehicle_id", "vehicle_id"),
    )


class TripStop(Base):
    __tablename__ = "trip_stops"

    id: Mapped[int] = mapped_column(primary_key=True)
    trip_id: Mapped[int] = mapped_column(ForeignKey("trips.id", ondelete="CASCADE"), index=True)
    stop_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("stops.id"), index=True)
    stop_sequence: Mapped[int] = mapped_column()
    arrival_time: Mapped[datetime] = mapped_column(DateTime)
    departure_time: Mapped[datetime] = mapped_column(DateTime)
    fare_from_start: Mapped[Decimal] = mapped_column(Numeric(10, 2), server_default="0")
    trip: Mapped[Trip] = relationship(back_populates="trip_stops")
    stop = relationship("Stop")

    __table_args__ = (
        UniqueConstraint("trip_id", "stop_sequence", name="uq_trip_stops_trip_sequence"),
        UniqueConstraint("trip_id", "stop_id", name="uq_trip_stops_trip_stop"),
        CheckConstraint("stop_sequence >= 1", name="ck_trip_stops_sequence_positive"),
        CheckConstraint("departure_time >= arrival_time", name="ck_trip_stops_times"),
        CheckConstraint("fare_from_start >= 0", name="ck_trip_stops_fare_nonneg"),
    )
