# WanderHub - Live Python Microservices Backend & Bug Resolution Plan

Transition WanderHub from a client-side simulated service layer to a **live running Python 3 Microservices Backend** serving `/api/v1/*` endpoints, while fixing all identified runtime, RBAC, iframe dialog, and state-pollution bugs.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Live Python Backend Execution in Container**:
> Because the container image includes `Python 3.10.12` without external `pip` wheels pre-installed, running the `/backend/*/main.py` files directly previously raised `ModuleNotFoundError: No module named 'fastapi'`.
> To make the Python backend **100% executable and live right now**:
> 1. **Native FastAPI-Compatible Runtime (`/backend/fastapi_runtime.py`)**: Provides full support for `@app.get`, `@app.post`, `@app.patch`, `Depends()`, `HTTPException`, `Query`, `BaseModel`, `Field`, and automatic OpenAPI `/docs` generation using Python's standard `asyncio`, `http.server`, and `sqlite3` when external wheels are absent (and transparently uses third-party `fastapi`/`pydantic` when installed via Docker).
> 2. **Live Python API Gateway (`/backend/gateway.py` + `server.ts`)**: `server.ts` launches the Python Microservices Gateway on port `8000` and routes all `/api/v1/*` requests (`auth`, `trips`, `bookings`, `chat`, `notifications`, `tests`) to the running Python process.

- **Confirmed Decision 1 (Python Backend)**: All backend business logic—RBAC checks, trip management, atomic seat reservations, payment validation, group chat, automated email generation, and Python `unittest` execution—runs on the live Python 3 backend.
- **Confirmed Decision 2 (Organizer Booking UX)**: When signed in as an `Organizer`, opening the Checkout modal presents a clear banner allowing a 1-click switch to a `Participant` profile before submitting payment, preventing unexpected 403 errors after form entry.
- **Confirmed Decision 3 (Iframe-Safe Confirmations)**: Replace all `window.confirm` and `window.alert` calls with inline confirmation controls and non-blocking status banners.

---

### 1. Bugs Identified & Resolution Summary

1. **Backend Not Executing in Python (`ModuleNotFoundError` & Unwired API)**:
   - *Cause*: Frontend components called local TypeScript classes in `localStorage` rather than a running Python server, and `/backend/*.py` failed to launch without `pip`.
   - *Fix*: Implement `/backend/fastapi_runtime.py` and `/backend/gateway.py` backed by SQLite, spawn the Python server automatically from `server.ts`, and wire the frontend services to `/api/v1/*` endpoints.
2. **Unit Test Runner Polluting Live Group Chat State (`unitTests.ts`)**:
   - *Cause*: Suite 4 called `chatService.sendMessage('trip_him_01', 'Trying to make an announcement', true)` against live state without cleanup, leaving test spam in the Annapurna chat channel.
   - *Fix*: Isolate test state snapshots and execute both the live Python `unittest` suite (`/api/v1/tests/run`) and frontend integration assertions cleanly.
3. **Blocked `window.confirm` & `window.alert` in Preview Iframe (`MyBookingsView.tsx`, `OrganizerDashboard.tsx`, `GroupChatModal.tsx`)**:
   - *Cause*: Browser modal dialogs (`window.confirm`, `window.alert`) are suppressed in sandboxed iframes, breaking booking cancellation.
   - *Fix*: Replace with an inline "Confirm Cancel / Keep Booking" two-step button and inline error/success banners.
4. **Organizer Checkout Role Trap (`CheckoutModal.tsx` & `authService.ts`)**:
   - *Cause*: Default user is `Elena Rostova (Organizer)`, who can click "Join Trip" and fill out the payment form only to hit `403 Forbidden: Role 'Organizer' lacks permission 'BOOK_SEAT'`.
   - *Fix*: Detect Organizer role in `CheckoutModal` and provide a 1-click "Switch to Participant (Marcus Vance) to Book" action.
5. **Hardcoded Trip Duration & Roster Sync (`OrganizerDashboard.tsx` & `notificationService.ts`)**:
   - *Cause*: `newDurationDays` was fixed at `10` regardless of `startDate`/`endDate`, date order wasn't validated, and `notificationService` hardcoded `elena@summitexpeditions.org` and sent cancellation emails to the active actor rather than the booking owner.
   - *Fix*: Dynamically compute trip duration from selected dates, validate `endDate >= startDate`, allow Organizers to cancel bookings from the Roster view, and route notifications to the actual booking participant and trip organizer.
6. **External Unsplash Avatar URLs & Thick Left Border (`authService.ts`, `NotificationMailbox.tsx`)**:
   - *Cause*: External Unsplash avatar URLs can fail in restricted sandboxes, and `NotificationMailbox` used `border-l-4`.
   - *Fix*: Use resilient inline SVG data-URI portraits and clean 1px structural borders.

---

### 2. Technical Architecture & Data Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                    REACT 19 CLIENT PORTAL & ANDROID UI                 │
│  • Navbar (Global Search)  • ParticipantView  • OrganizerDashboard     │
│  • CheckoutModal           • GroupChatModal   • TestRunnerModal        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP JSON (/api/v1/*)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                 EXPRESS + VITE PROXY GATEWAY (Port 3000)               │
│  • Proxies /api/v1/* requests to live Python 3 Microservices Process   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP Proxy (127.0.0.1:8000)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│             PYTHON 3 FASTAPI MICROSERVICES ENGINE (Port 8000)          │
│                                                                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────────┐  │
│  │ Auth & RBAC  │ │ Trip Service │ │   Booking &  │ │  Chat & Email │  │
│  │   Router     │ │    Router    │ │Payment Router│ │    Routers    │  │
│  │ (/auth/*)    │ │  (/trips/*)  │ │(/bookings/*) │ │(/chat,/notifs)│  │
│  └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └───────┬───────┘  │
│         └────────────────┴────────┬───────┴─────────────────┘          │
│                                   ▼                                    │
│                ┌─────────────────────────────────────┐                 │
│                │   PYTHON SQLITE3 & EVENT DISPATCH   │                 │
│                │   • Atomic Seat Transactions        │                 │
│                │   • Live Python Unittest Runner     │                 │
│                └─────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
```
