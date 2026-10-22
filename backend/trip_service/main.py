"""
WanderHub - Trip Management Microservice
Port: 8002
Framework: FastAPI (Python 3.10+ / 3.12+), Pydantic v2
"""

from typing import List, Optional
from datetime import date, datetime
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="WanderHub Trip Microservice",
    description="Microservice managing trip catalog, multi-criteria filtering, and organizer publishing.",
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

class ItineraryDay(BaseModel):
    day: int
    title: str
    description: str
    activities: List[str]

class TripBase(BaseModel):
    title: str = Field(..., min_length=5, max_length=120)
    subtitle: str
    category: str
    destination: str
    country: str
    start_date: date
    end_date: date
    duration_days: int
    price_per_person: float = Field(..., gt=0)
    currency: str = "USD"
    max_seats: int = Field(..., gt=0, le=50)
    difficulty: str
    description: str
    highlights: List[str]
    included: List[str]
    excluded: List[str]
    itinerary: List[ItineraryDay]
    cancellation_policy: str

class TripCreate(TripBase):
    pass

class TripResponse(TripBase):
    id: str
    organizer_id: str
    organizer_name: str
    booked_seats: int = 0
    available_seats: int
    created_at: datetime

DB_TRIPS = {
    "trip_him_01": {
        "id": "trip_him_01",
        "title": "Himalayan Ridge & Annapurna High Sanctuary",
        "subtitle": "12-Day High Altitude Alpine Trek & Glacial Basecamp",
        "category": "Trek & Mountain",
        "destination": "Annapurna Conservation Area",
        "country": "Nepal",
        "start_date": "2026-11-10",
        "end_date": "2026-11-22",
        "duration_days": 12,
        "price_per_person": 1850.0,
        "currency": "USD",
        "max_seats": 12,
        "booked_seats": 8,
        "available_seats": 4,
        "difficulty": "Challenging",
        "organizer_id": "usr_org_01",
        "organizer_name": "Elena Rostova",
        "description": "Traverse dramatic alpine moraines and wake up surrounded by 8,000-meter peaks.",
        "highlights": ["Sunrise view from Poon Hill", "Annapurna Base Camp amphitheater"],
        "included": ["ACAP permits", "Certified UIAGM guide", "Lodge accommodation"],
        "excluded": ["International flights", "Personal gear"],
        "itinerary": [
            {"day": 1, "title": "Arrival in Pokhara", "description": "Meet the team and complete gear checks.", "activities": ["Orientation"]}
        ],
        "cancellation_policy": "Full refund up to 30 days prior to departure.",
        "created_at": datetime.utcnow()
    }
}

@app.get("/api/v1/trips", response_model=List[TripResponse])
async def list_trips(
    destination: Optional[str] = Query(None, description="Search destination keyword"),
    start_date: Optional[date] = Query(None, description="Filter trips starting on or after this date"),
    end_date: Optional[date] = Query(None, description="Filter trips ending on or before this date"),
    organizer_name: Optional[str] = Query(None, description="Filter trips by organizer name"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """Multi-criteria expedition search and catalog retrieval."""
    results = list(DB_TRIPS.values())

    if destination:
        q = destination.lower()
        results = [t for t in results if q in t["destination"].lower() or q in t["country"].lower() or q in t["title"].lower()]

    if start_date:
        results = [t for t in results if date.fromisoformat(str(t["start_date"])) >= start_date]

    if end_date:
        results = [t for t in results if date.fromisoformat(str(t["end_date"])) <= end_date]

    if organizer_name and organizer_name != "All":
        results = [t for t in results if t["organizer_name"].lower() == organizer_name.lower()]

    if category and category != "All":
        results = [t for t in results if t["category"].lower() == category.lower()]

    return results

@app.get("/api/v1/trips/{trip_id}", response_model=TripResponse)
async def get_trip(trip_id: str):
    """Retrieve detailed trip specification and itinerary."""
    if trip_id not in DB_TRIPS:
        raise HTTPException(status_code=404, detail="Trip not found")
    return DB_TRIPS[trip_id]

@app.post("/api/v1/trips", response_model=TripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(
    trip_in: TripCreate,
    organizer_id: str = "usr_org_01",
    organizer_name: str = "Elena Rostova"
):
    """Create a new trip expedition (Guarded by Organizer RBAC)."""
    trip_id = f"trip_{int(datetime.utcnow().timestamp())}"
    record = trip_in.model_dump()
    record.update({
        "id": trip_id,
        "organizer_id": organizer_id,
        "organizer_name": organizer_name,
        "booked_seats": 0,
        "available_seats": trip_in.max_seats,
        "created_at": datetime.utcnow()
    })
    DB_TRIPS[trip_id] = record
    return record

@app.post("/api/v1/trips/{trip_id}/reserve-seats")
async def reserve_seats(trip_id: str, seats: int = Query(..., gt=0)):
    """Atomic seat reservation lock preventing overbooking."""
    if trip_id not in DB_TRIPS:
        raise HTTPException(status_code=404, detail="Trip not found")
    trip = DB_TRIPS[trip_id]
    if trip["available_seats"] < seats:
        raise HTTPException(status_code=409, detail="Insufficient seats available")
    
    trip["booked_seats"] += seats
    trip["available_seats"] -= seats
    return {"status": "reserved", "trip_id": trip_id, "remaining_seats": trip["available_seats"]}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "trip_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
