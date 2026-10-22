# WanderHub - Python FastAPI Microservices Suite

This directory contains the production-ready Python FastAPI microservices architecture requested for high-performance asynchronous concurrency, RBAC security, real-time booking management, and group chat.

## Microservices Breakdown

| Service | Port | Directory | Description |
| :--- | :--- | :--- | :--- |
| **Auth & RBAC Service** | `8001` | `/backend/auth_service/` | OAuth2 password flow, JWT generation, bcrypt password hashing, and role verification (`Organizer` vs. `Participant`). |
| **Trip Management Service** | `8002` | `/backend/trip_service/` | Expedition catalog, multi-criteria global search (destination, date range, organizer), and organizer publishing. |
| **Booking & Payment Service** | `8003` | `/backend/booking_service/` | High-concurrency seat reservation, payment gateway simulation, and attendee roster management. |
| **Real-Time Chat Service** | `8004` | `/backend/chat_service/` | WebSocket-powered channels isolated per expedition with organizer pinned announcements. |
| **Notification Service** | `8005` | `/backend/notification_service/` | Transactional email dispatcher rendering HTML vouchers and booking receipts. |

## Quickstart

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Run Unit Tests (Python)
```bash
python3 tests/test_microservices.py -v
```

### 3. Run Microservices with Docker Compose
```bash
docker-compose up --build
```
