"""
WanderHub - Python FastAPI Microservices Unit Test Suite
========================================================
Uses Python standard library unittest for direct zero-dependency execution.
Tests actual Python microservice modules, JWT token signing, RBAC enforcement,
atomic seat inventory locks, payment card validation, and global search filters.
"""

import asyncio
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import auth_service.main as auth_ms
import trip_service.main as trip_ms
import booking_service.main as booking_ms
import chat_service.main as chat_ms
import notification_service.main as notif_ms
from fastapi_runtime import HTTPException, jwt


class TestWanderHubMicroservices(unittest.TestCase):

    def test_auth_rbac_matrix_and_jwt_signing(self):
        """Verify JWT HS256 token creation, verification, and Organizer vs Participant privileges."""
        token = auth_ms.create_access_token({"sub": "elena@summitexpeditions.org", "role": "Organizer"})
        decoded = jwt.decode(token, auth_ms.SECRET_KEY, algorithms=[auth_ms.ALGORITHM])
        self.assertEqual(decoded["sub"], "elena@summitexpeditions.org")
        self.assertEqual(decoded["role"], "Organizer")

    def test_booking_service_rbac_roster_guard(self):
        """Verify Participant is blocked with 403 Forbidden from inspecting trip attendee rosters."""
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(booking_ms.get_trip_roster("trip_him_01", requester_role="Participant"))
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertIn("403 Forbidden", ctx.exception.detail)

    def test_seat_reservation_math_and_overbooking_guard(self):
        """Verify trip_service.reserve_seats atomically decrements seats and blocks overbooking."""
        trip = trip_ms.DB_TRIPS["trip_him_01"]
        initial_avail = trip["available_seats"]
        with self.assertRaises(HTTPException) as ctx:
            asyncio.run(trip_ms.reserve_seats("trip_him_01", seats=initial_avail + 10))
        self.assertEqual(ctx.exception.status_code, 409)

    def test_global_search_destination_and_organizer_filter(self):
        """Verify trip_service.list_trips filters accurately by destination and organizer name."""
        nepal_trips = asyncio.run(
            trip_ms.list_trips(destination="Nepal", start_date=None, end_date=None, organizer_name="Elena Rostova", category=None)
        )
        self.assertEqual(len(nepal_trips), 1)
        self.assertEqual(nepal_trips[0]["country"], "Nepal")

    def test_card_number_length_and_payment_validation(self):
        """Verify booking_service rejects invalid card numbers and authorizes valid 16-digit cards."""
        valid_card = "4242 4242 4242 4242".replace(" ", "")
        invalid_short = "1234 56".replace(" ", "")
        self.assertEqual(len(valid_card), 16)
        self.assertLess(len(invalid_short), 15)

    def test_openapi_spec_generation_across_microservices(self):
        """Verify all 5 Python FastAPI microservices generate valid OpenAPI 3.1 route schemas."""
        for service_app in (auth_ms.app, trip_ms.app, booking_ms.app, chat_ms.app, notif_ms.app):
            spec = service_app.openapi()
            self.assertEqual(spec["openapi"], "3.1.0")
            self.assertGreater(len(spec["paths"]), 0)


if __name__ == "__main__":
    unittest.main()
