
from datetime import datetime

from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

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
