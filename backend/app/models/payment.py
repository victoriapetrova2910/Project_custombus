
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,)

    preorder_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("preorders.id"),
        nullable=False,)

    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="pending",)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),)
