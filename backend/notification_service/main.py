"""
WanderHub - Automated Notification & Transactional Email Microservice
Port: 8005
Framework: FastAPI (Python 3.10+ / 3.12+), Pydantic v2
"""

from typing import List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

app = FastAPI(
    title="WanderHub Notification Microservice",
    description="Dispatches automated transactional confirmation emails and booking alerts.",
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

class NotificationDispatch(BaseModel):
    recipient_email: EmailStr
    recipient_name: str
    subject: str
    category: str
    preview_text: str
    html_content: str

class NotificationRecord(NotificationDispatch):
    id: str
    sent_at: datetime
    read: bool = False

DB_NOTIFICATIONS: List[dict] = [
    {
        "id": "notif_01",
        "recipient_email": "marcus.vance@gmail.com",
        "recipient_name": "Marcus Vance",
        "subject": "Booking Confirmed: Himalayan Ridge & Annapurna High Sanctuary",
        "category": "booking_confirmation",
        "preview_text": "Your expedition booking WH-HIM-9281 has been confirmed.",
        "html_content": "<h1>Booking Confirmed!</h1><p>Your seat for Annapurna High Sanctuary is secured.</p>",
        "sent_at": datetime.utcnow(),
        "read": True
    }
]

@app.post("/api/v1/notifications/send", status_code=status.HTTP_201_CREATED)
async def dispatch_notification(payload: NotificationDispatch):
    """Dispatch automated transactional email notification."""
    record = payload.model_dump()
    record.update({
        "id": f"notif_{int(datetime.utcnow().timestamp())}",
        "sent_at": datetime.utcnow(),
        "read": False
    })
    DB_NOTIFICATIONS.insert(0, record)
    return {"status": "sent", "notification_id": record["id"]}

@app.get("/api/v1/notifications", response_model=List[NotificationRecord])
async def list_notifications(recipient_email: Optional[str] = None):
    """Retrieve notifications for recipient."""
    if recipient_email:
        return [n for n in DB_NOTIFICATIONS if n["recipient_email"].lower() == recipient_email.lower()]
    return DB_NOTIFICATIONS

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "notification_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8005, reload=True)
