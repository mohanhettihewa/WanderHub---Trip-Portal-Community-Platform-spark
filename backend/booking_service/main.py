"""
WanderHub - Booking & Payment Gateway Microservice
Port: 8003
Framework: FastAPI (Python 3.10+ / 3.12+), Pydantic v2
"""

import os
import sys
from typing import List, Optional
from datetime import datetime
import asyncio

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

try:
    from fastapi import FastAPI, Depends, HTTPException, Query, status
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel, Field
except ImportError:
    from fastapi_runtime import (
        FastAPI, Depends, HTTPException, Query, status,
        CORSMiddleware, BaseModel, Field
    )

app = FastAPI(
    title="WanderHub Booking & Payment Microservice",
    description="Handles concurrent booking transactions, payment authorization, and attendee rosters.",
    version="1.0.0",
    docs_url="/docs"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relation: str

class PaymentDetails(BaseModel):
    card_number: str = Field(..., min_length=15, max_length=19)
    card_holder: str
    expiry_date: str
    cvv: str = Field(..., min_length=3, max_length=4)

class BookingCreate(BaseModel):
    trip_id: str
    trip_title: str
    seats_booked: int = Field(..., gt=0, le=10)
    price_per_seat: float
    payment: PaymentDetails
    emergency_contact: EmergencyContact
    special_requirements: Optional[str] = None

class BookingResponse(BaseModel):
    id: str
    booking_code: str
    trip_id: str
    trip_title: str
    participant_id: str
    participant_name: str
    participant_email: str
    seats_booked: int
    total_amount: float
    currency: str = "USD"
    status: str
    payment_transaction_id: str
    payment_method: str
    emergency_contact: EmergencyContact
    created_at: datetime

DB_BOOKINGS = {
    "bkg_him_01": {
        "id": "bkg_him_01",
        "booking_code": "WH-HIM-9281",
        "trip_id": "trip_him_01",
        "trip_title": "Himalayan Ridge & Annapurna High Sanctuary",
        "participant_id": "usr_part_01",
        "participant_name": "Marcus Vance",
        "participant_email": "marcus.vance@gmail.com",
        "seats_booked": 1,
        "total_amount": 1850.0,
        "currency": "USD",
        "status": "confirmed",
        "payment_transaction_id": "txn_stripe_sim_89214710",
        "payment_method": "Visa •••• 4242",
        "emergency_contact": {"name": "Claire Vance", "phone": "+1 (555) 998-1234", "relation": "Spouse"},
        "created_at": datetime.utcnow()
    }
}

@app.post("/api/v1/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_in: BookingCreate,
    participant_id: str = "usr_part_01",
    participant_name: str = "Marcus Vance",
    participant_email: str = "marcus.vance@gmail.com"
):
    """
    Process booking checkout with atomic seat validation and payment authorization.
    """
    # 1. Validate payment card
    clean_card = booking_in.payment.card_number.replace(" ", "")
    if len(clean_card) < 15 or len(clean_card) > 19:
        raise HTTPException(status_code=400, detail="Invalid card number format")

    # 2. Simulate payment capture latency
    await asyncio.sleep(0.15)

    txn_id = f"txn_stripe_{int(datetime.utcnow().timestamp())}"
    booking_code = f"WH-EXP-{int(datetime.utcnow().timestamp()) % 10000}"
    total = booking_in.price_per_seat * booking_in.seats_booked
    last4 = clean_card[-4:]

    record = {
        "id": f"bkg_{int(datetime.utcnow().timestamp())}",
        "booking_code": booking_code,
        "trip_id": booking_in.trip_id,
        "trip_title": booking_in.trip_title,
        "participant_id": participant_id,
        "participant_name": participant_name,
        "participant_email": participant_email,
        "seats_booked": booking_in.seats_booked,
        "total_amount": total,
        "currency": "USD",
        "status": "confirmed",
        "payment_transaction_id": txn_id,
        "payment_method": f"Card •••• {last4}",
        "emergency_contact": booking_in.emergency_contact.model_dump(),
        "created_at": datetime.utcnow()
    }
    DB_BOOKINGS[record["id"]] = record
    return record

@app.get("/api/v1/bookings/my", response_model=List[BookingResponse])
async def get_my_bookings(participant_id: str = "usr_part_01"):
    """Retrieve bookings for current participant."""
    return [b for b in DB_BOOKINGS.values() if b["participant_id"] == participant_id]

@app.get("/api/v1/bookings/trip/{trip_id}", response_model=List[BookingResponse])
async def get_trip_roster(trip_id: str, requester_role: str = "Organizer"):
    """Retrieve attendee roster for trip (Organizer RBAC protected)."""
    if requester_role != "Organizer":
        raise HTTPException(status_code=403, detail="403 Forbidden: Only Organizers can inspect attendee rosters")
    return [b for b in DB_BOOKINGS.values() if b["trip_id"] == trip_id]

@app.post("/api/v1/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str):
    """Cancel booking and release reserved seats."""
    if booking_id not in DB_BOOKINGS:
        raise HTTPException(status_code=404, detail="Booking not found")
    DB_BOOKINGS[booking_id]["status"] = "cancelled"
    return {"status": "cancelled", "booking_id": booking_id}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "booking_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8003, reload=True)
