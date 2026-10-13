from typing import Optional

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Preorder(Base):
    __tablename__ = "preorders"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    trip_id: Mapped[Optional[int]] = mapped_column(
        Integer,
        ForeignKey("trips.id"),
        nullable=True,
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

    seats_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
    )
