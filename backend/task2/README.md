import unittest
from datetime import datetime, timedelta

from algorithm.grouping import Params, Preorder, Stop, build_trips_greedy
from algorithm.scheduling import Vehicle, assign_vehicles

# Координаты условные, рядом с Новой Москвой
A = Stop("A", 55.5000, 37.4000)
A2 = Stop("A2", 55.5010, 37.4010)   # ~130 м от A
B = Stop("B", 55.6000, 37.5000)     # ~11 км от A, в ту же сторону
B2 = Stop("B2", 55.6005, 37.5005)   # рядом с B
C = Stop("C", 55.4000, 37.3000)     # в другую сторону от A

T0 = datetime(2026, 10, 20, 8, 0)
P = Params()


def order(oid, frm, to, minutes=0, seats=1):
    return Preorder(oid, frm, to, T0 + timedelta(minutes=minutes), seats)


class GroupingTests(unittest.TestCase):

    def test_compatible_orders_grouped(self):
        trips = build_trips_greedy(
            [order("o1", A, B, 0), order("o2", A2, B2, 5)], P, capacity=20
        )
        self.assertEqual(len(trips), 1)
        self.assertEqual(len(trips[0].orders), 2)

    def test_capacity_not_exceeded(self):
        trips = build_trips_greedy(
            [order("o1", A, B, 0, seats=3), order("o2", A2, B2, 1, seats=3)],
            P, capacity=4,
        )
        self.assertEqual(len(trips), 2)
        for t in trips:
            self.assertLessEqual(t.seats_used, 4)

    def test_time_window_respected(self):
        trips = build_trips_greedy(
            [order("o1", A, B, 0), order("o2", A2, B2, 60)], P, capacity=20
        )
        self.assertEqual(len(trips), 2)

    def test_opposite_direction_split(self):
        # C лежит в другую сторону от A, поэтому заказ C->A не должен ехать с A->B
        back = Preorder("o2", C, A, T0 + timedelta(minutes=2), 1)
        trips = build_trips_greedy([order("o1", A, B, 0), back], P, capacity=20)
        self.assertEqual(len(trips), 2)

    def test_far_stops_split(self):
        trips = build_trips_greedy(
            [order("o1", A, B, 0), order("o2", A2, C, 1)], P, capacity=20
        )
        self.assertEqual(len(trips), 2)

    def test_deterministic(self):
        orders = [order("o1", A, B, 0), order("o2", A2, B2, 5), order("o3", C, A, 3)]
        r1 = [[o.id for o in t.orders] for t in build_trips_greedy(orders, P, 20)]
        r2 = [[o.id for o in t.orders] for t in build_trips_greedy(orders, P, 20)]
        self.assertEqual(r1, r2)


class SchedulingTests(unittest.TestCase):

    def test_best_fit_vehicle(self):
        trips = build_trips_greedy([order("o1", A, B, 0, seats=3)], P, capacity=20)
        vehicles = [Vehicle("big", 30), Vehicle("small", 5)]
        result = assign_vehicles(trips, vehicles)
        self.assertEqual(result[trips[0].id], "small")

    def test_no_overlap_per_vehicle(self):
        trips = build_trips_greedy(
            [order("o1", A, B, 0, seats=2), order("o2", C, A, 0, seats=2)],
            P, capacity=2,
        )
        vehicles = [Vehicle("only", 5)]
        result = assign_vehicles(trips, vehicles)
        ids = list(result.values())
        # один автобус не может обслуживать два рейса в одно и то же время
        self.assertEqual(ids.count("only"), 1)
        self.assertIn(None, ids)

    def test_no_vehicle_marked(self):
        trips = build_trips_greedy([order("o1", A, B, 0, seats=9)], P, capacity=20)
        result = assign_vehicles(trips, [Vehicle("small", 5)])
        self.assertIsNone(result[trips[0].id])


if __name__ == "__main__":
    unittest.main()
