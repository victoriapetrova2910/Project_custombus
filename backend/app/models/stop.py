from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Float,
    Index,
    String,
    false,
    true,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Stop(Base):
    """Остановка НОТ (данные из data/stops.json, id совпадает с id на data.mos.ru)."""

    __tablename__ = "stops"

    # id на data.mos.ru не помещаются в int32, поэтому BigInteger
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=False)

    stop_code: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    zone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    subzone: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    service_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    is_drt_hub: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )

    transport_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    has_pavilion: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=false()
    )
    operating_org: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    electrification: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    __table_args__ = (
        CheckConstraint("latitude BETWEEN -90 AND 90", name="ck_stops_latitude"),
        CheckConstraint("longitude BETWEEN -180 AND 180", name="ck_stops_longitude"),
        Index("ix_stops_name", "name"),
        Index("ix_stops_stop_code", "stop_code"),
        Index("ix_stops_zone", "zone"),
        Index("ix_stops_service_active", "service_active"),
        Index("ix_stops_lat_lon", "latitude", "longitude"),
    )
