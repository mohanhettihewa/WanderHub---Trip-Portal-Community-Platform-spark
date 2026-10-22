"""
WanderHub - Real-Time Group Chat Microservice
Port: 8004
Framework: FastAPI (Python 3.10+ / 3.12+), WebSockets, Asyncio
"""

from typing import Dict, List, Optional
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="WanderHub Real-Time Chat Microservice",
    description="WebSocket-powered real-time group chat channels segmented by trip expedition.",
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

class ChatMessage(BaseModel):
    id: str
    trip_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    timestamp: datetime
    is_announcement: bool = False

class ConnectionManager:
    """Manages active WebSocket connections per trip channel."""
    def __init__(self):
        self.active_rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, trip_id: str, websocket: WebSocket):
        await websocket.accept()
        if trip_id not in self.active_rooms:
            self.active_rooms[trip_id] = []
        self.active_rooms[trip_id].append(websocket)

    def disconnect(self, trip_id: str, websocket: WebSocket):
        if trip_id in self.active_rooms:
            if websocket in self.active_rooms[trip_id]:
                self.active_rooms[trip_id].remove(websocket)

    async def broadcast_to_trip(self, trip_id: str, message: dict):
        if trip_id in self.active_rooms:
            for connection in self.active_rooms[trip_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

manager = ConnectionManager()

DB_MESSAGES: List[dict] = [
    {
        "id": "msg_01",
        "trip_id": "trip_him_01",
        "sender_id": "usr_org_01",
        "sender_name": "Elena Rostova",
        "sender_role": "Organizer",
        "message": "Welcome everyone to the Annapurna Ridge Expedition! Please make sure your passport has at least 6 months validity.",
        "timestamp": datetime.utcnow(),
        "is_announcement": True
    }
]

@app.websocket("/ws/chat/{trip_id}")
async def websocket_endpoint(websocket: WebSocket, trip_id: str):
    """Real-time bi-directional WebSocket chat connection."""
    await manager.connect(trip_id, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            # Construct message record
            msg_record = {
                "id": f"msg_{int(datetime.utcnow().timestamp())}",
                "trip_id": trip_id,
                "sender_id": data.get("sender_id", "anon"),
                "sender_name": data.get("sender_name", "Traveler"),
                "sender_role": data.get("sender_role", "Participant"),
                "message": data.get("message", ""),
                "timestamp": datetime.utcnow().isoformat(),
                "is_announcement": data.get("is_announcement", False) and data.get("sender_role") == "Organizer"
            }
            DB_MESSAGES.append(msg_record)
            await manager.broadcast_to_trip(trip_id, msg_record)
    except WebSocketDisconnect:
        manager.disconnect(trip_id, websocket)

@app.get("/api/v1/chat/{trip_id}/messages")
async def get_messages(trip_id: str):
    """Retrieve historical messages for a specific trip channel."""
    return [m for m in DB_MESSAGES if m["trip_id"] == trip_id]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "chat_service"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8004, reload=True)
