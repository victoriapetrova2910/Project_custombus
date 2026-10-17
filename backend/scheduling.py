"""
Правила возврата при отмене предзаказа.

Источник: docs/research/interview_results.md, раздел «Финансовая модель и политика отмен»:
  - мгновенная отмена                → 100% возврат
  - отмена более чем за 2 часа        → 50%
  - отмена менее чем за 30 минут      → 0% (место возвращается в продажу)

Что в интервью НЕ сказано (и поэтому стоит в параметрах как предположение):
  - что считать «мгновенной» отменой (сейчас: до 10 минут после оплаты);
  - что делать, если отмена между 30 минутами и 2 часами до поездки
    (сейчас: 50%, как у отмены «за 2 часа»).
Эти значения нужно согласовать с заказчиком до защиты.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal, ROUND_HALF_UP


@dataclass(frozen=True)
class RefundPolicy:
    instant_window: timedelta = timedelta(minutes=10)     # ПРЕДПОЛОЖЕНИЕ
    full_refund_until_instant: Decimal = Decimal("1.00")
    half_refund_before: timedelta = timedelta(hours=2)
    no_refund_within: timedelta = timedelta(minutes=30)
    middle_ratio: Decimal = Decimal("0.50")               # ПРЕДПОЛОЖЕНИЕ: между 30 мин и 2 ч


def refund_ratio(
    paid_at: datetime,
    departure_at: datetime,
    cancelled_at: datetime,
    policy: RefundPolicy = RefundPolicy(),
) -> Decimal:
    """Доля стоимости, которая возвращается пассажиру (от 0 до 1)."""
    if cancelled_at >= departure_at:
        return Decimal("0")
    if cancelled_at - paid_at <= policy.instant_window:
        return policy.full_refund_until_instant
    time_left = departure_at - cancelled_at
    if time_left < policy.no_refund_within:
        return Decimal("0")
    if time_left >= policy.half_refund_before:
        return Decimal("0.50")
    return policy.middle_ratio


def refund_amount(
    price: Decimal,
    paid_at: datetime,
    departure_at: datetime,
    cancelled_at: datetime,
    policy: RefundPolicy = RefundPolicy(),
) -> Decimal:
    """Сумма возврата в рублях, округлённая до копеек."""
    ratio = refund_ratio(paid_at, departure_at, cancelled_at, policy)
    return (price * ratio).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
