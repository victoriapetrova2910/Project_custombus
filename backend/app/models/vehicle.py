from datetime import datetime
from typing import Optional

from sqlalchemy import CheckConstraint, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

VEHICLE_STATUSES = ("active", "maintenance", "inactive")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    plate_number: Mapped[str] = mapped_column(
        String(16),
        unique=True,
        nullable=False,
    )

    model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    capacity: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="active",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )

    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_vehicles_capacity_positive"),
        CheckConstraint(
            "status IN ('active', 'maintenance', 'inactive')",
            name="ck_vehicles_status",
        ),
    )
