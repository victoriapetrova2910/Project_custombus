import unittest
from datetime import datetime, timedelta
from decimal import Decimal

from algorithm.refund import refund_amount, refund_ratio

DEP = datetime(2026, 10, 20, 8, 0)
PAID = DEP - timedelta(hours=8)   # оплатили за 8 часов до поездки


class RefundTests(unittest.TestCase):

    def test_instant_cancel_full_refund(self):
        cancelled = PAID + timedelta(minutes=2)
        self.assertEqual(refund_ratio(PAID, DEP, cancelled), Decimal("1.00"))

    def test_more_than_two_hours_half_refund(self):
        cancelled = DEP - timedelta(hours=3)
        self.assertEqual(refund_ratio(PAID, DEP, cancelled), Decimal("0.50"))

    def test_less_than_30_minutes_no_refund(self):
        cancelled = DEP - timedelta(minutes=20)
        self.assertEqual(refund_ratio(PAID, DEP, cancelled), Decimal("0"))

    def test_after_departure_no_refund(self):
        cancelled = DEP + timedelta(minutes=1)
        self.assertEqual(refund_ratio(PAID, DEP, cancelled), Decimal("0"))

    def test_middle_zone_uses_assumption(self):
        cancelled = DEP - timedelta(hours=1)
        self.assertEqual(refund_ratio(PAID, DEP, cancelled), Decimal("0.50"))

    def test_amount_rounded_to_kopecks(self):
        cancelled = DEP - timedelta(hours=3)
        self.assertEqual(
            refund_amount(Decimal("175.55"), PAID, DEP, cancelled),
            Decimal("87.78"),
        )


if __name__ == "__main__":
    unittest.main()
