# WanderHub - Scalable Microservices Trip Portal & Mobile App

A high-performance trip management and discovery platform empowering Organizers to create, publish, and monitor group expeditions, while enabling Participants to explore trips, book seats via a secure payment gateway, communicate through real-time group chat, and receive automated transactional emails.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Architecture & Runtime Alignment**: The AI Studio execution environment runs Node.js 22 + Vite + React 19 + Express. To deliver on your preference for **FastAPI and microservices modularity**, the platform is architected with:
> 1. **Modular Microservice Backend**: Dedicated, decoupled services (`AuthService`, `TripService`, `BookingPaymentService`, `ChatService`, `NotificationService`) matching FastAPI asynchronous conventions, typed schemas, and REST endpoints.
> 2. **FastAPI Code Export & Reference Suite**: Complete production-ready Python FastAPI microservices codebases and specs provided alongside the interactive full-stack app, with comprehensive English docstrings, type annotations, and `pytest` suites.
> 3. **Dual Website & Android Mobile Experience**: A live responsive web portal equipped with an instant **Android Phone Viewport toggle** (featuring status bar, touch navigation, and native ergonomics) to inspect both organizer desktop workflows and participant mobile experiences.

- **User Roles & RBAC**: 'Organizer' and 'Participant' roles strictly enforced via token/session permissions and route guards. Users can easily switch or test between roles with persistent demo profiles.
- **Payment & Booking Flow**: Simulated high-concurrency booking engine with atomicity checks, seat inventory lock, and Stripe-style card checkout with receipt generation.
- **Automated Notifications**: Event-driven notification service sending real-time transactional booking confirmations, organizer trip updates, and reminders to an in-app interactive Mailbox / Notification tray.
- **Comprehensive Unit Tests**: Built-in test runner UI and automated test suites verifying role security, booking concurrency, payment validation, and chat persistence.

---

### 1. Overview & Core Concept

**WanderHub** is a dual-sided travel community portal connecting expedition organizers with adventurous travelers. 

- **For Organizers**: A streamlined command center to create trips, define itineraries, set capacity and tiered pricing, track concurrent bookings in real time, monitor participant rosters, broadcast updates, and manage trip group chats.
- **For Participants**: An immersive trip discovery feed with category and difficulty filters, detailed trip agendas, verified organizer profiles, instant seat booking with payment simulation, ticket pass downloads, and direct group communication with fellow travelers and organizers.
- **High Concurrency & Modularity**: Decoupled microservice boundaries ensure booking surges do not degrade browse performance, chat latency, or notification queues.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Participant Journey**:
   - Browse curated expeditions with filters (Destination, Category, Date, Difficulty, Price).
   - View trip details: Highlights, Day-by-day Itinerary, Packing Checklist, Included Amenities, and Organizer Credentials.
   - Select seats, proceed through secure checkout (card validation, CVV, billing, instant confirmation), receive ticket QR & confirmation notification.
   - Enter trip group chat to coordinate departure with other booked travelers and the organizer.
2. **Organizer Journey**:
   - Access Organizer Dashboard with active trip KPIs (Total Revenue, Confirmed Travelers, Seat Fill Rate).
   - Launch "Create Trip" wizard: Basic Info, Geolocation, Media, Pricing & Capacity, Cancellation Policy, and Detailed Daily Schedules.
   - Manage Attendees: View participant directory, booking timestamps, payment statuses, and trigger bulk broadcast announcements.
3. **Android Mobile Simulation Mode**:
   - One-click toggle in the header between "Desktop Portal View" and "Android Mobile App View" (393x852px device frame with simulated system gestures, bottom app bar, and smooth touch interactions).

#### Visual Identity & Theme
- **Aesthetic Direction**: Contemporary outdoor exploration aesthetic with architectural clarity—inspired by modern expedition studios, Swiss typography, and clean Scandinavian functionalism.
- **Color Palette (60-30-10 Rule)**:
  - `Canvas (60%)`: Crisp porcelain white (`#FBFBFB` / `#F8FAFC`) with dark mode slate (`#0B0F17`).
  - `Surfaces & Structure (30%)`: Warm volcanic slate (`#0F172A`), clean border lines (`#E2E8F0` / `#1E293B`), and pure white cards.
  - `Accents (10%)`: Alpine Pine (`#0D9488` / `#059669`) for confirmed bookings and positive states, with Ember Sienna (`#EA580C`) for primary CTAs and urgency indicators.
- **Typography**: Display headlines in `Plus Jakarta Sans`, body prose in `DM Sans`, and booking codes, timestamps, and pricing figures in `JetBrains Mono` / `tabular-nums`.
- **Anti-Slop Restraint**: Zero decorative glowing badges or static pill clutter. All metadata uses unboxed text separated by subtle typographic dots (`·`). Single-elevation cards with clean hairline dividers.

---

### 3. Key Product Decisions & Trade-Offs

- **Role-Based Access Control (RBAC)**:
  - *Chosen Approach*: JWT/Session claims with declarative permission decorators (`require_role("Organizer")`, `require_role("Participant")`).
  - *Why*: Guarantees that participants cannot access revenue reports, edit trip itineraries, or access other attendees' private details, while organizers cannot tamper with participant payment credentials.
- **Microservices Organization**:
  - *Chosen Approach*: Feature-modular architecture (`/services/auth`, `/services/trips`, `/services/bookings`, `/services/chat`, `/services/notifications`) communicating via typed service contracts and an event dispatcher.
  - *Why*: Allows independent scalability, modular testability, and direct 1:1 mapping to Python FastAPI microservices.
- **Concurrency & Booking Integrity**:
  - *Chosen Approach*: Optimistic locking with seat reservation holds (5-minute TTL) before final payment capture.
  - *Why*: Prevents overselling popular trips during high-traffic surges without blocking concurrent reads.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        WANDERHUB CLIENT LAYER                          │
│                                                                        │
│   ┌────────────────────────────┐      ┌────────────────────────────┐   │
│   │   Desktop Portal (Web)     │      │   Android App Simulator    │   │
│   │   • Organizer Studio       │      │   • Traveler Mobile Flow   │   │
│   │   • Participant Portal     │      │   • Touch Navigation & PWA │   │
│   └──────────────┬─────────────┘      └──────────────┬─────────────┘   │
└──────────────────┼───────────────────────────────────┼─────────────────┘
                   │                                   │
                   ▼                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY & ROUTE GUARDS                         │
│   • RBAC Middleware: Organizer / Participant Permissions               │
│   • Request Validation & Rate Limiting                                 │
└──────────────────┬─────────────────────────────────────────────────────┘
                   │
         ┌─────────┼──────────┬──────────────┬──────────────┐
         ▼         ▼          ▼              ▼              ▼
┌─────────────┐┌────────┐┌───────────┐┌──────────────┐┌──────────────┐
│ Auth & RBAC ││  Trip  ││  Booking  ││  Real-Time   ││ Notification │
│   Service   ││Service ││ & Payment ││ Group Chat   ││   Service    │
│             ││        ││  Service  ││   Service    ││              │
│ • Roles     ││• Trips ││• Checkout ││• Channels    ││• Transaction │
│ • Sessions  ││• Slots ││• Invoices ││• Messages    ││  Emails      │
│ • Profiles  ││• Search││• Inventory││• Presence    ││• Alerts & SMS│
└─────────────┘└────────┘└───────────┘└──────────────┘└──────────────┘
         │         │          │              │              │
         └─────────┴──────────┴──────────────┴──────────────┘
                                  │
                                  ▼
                   ┌─────────────────────────────┐
                   │   EVENT BUS & PERSISTENCE   │
                   │ • In-Memory & LocalStorage  │
                   │ • Transactional Event Log   │
                   │ • Concurrent Lock Engine    │
                   └─────────────────────────────┘
```

#### Core Services Specification
1. **Auth & RBAC Microservice (`/api/v1/auth`)**:
   - `POST /register`, `POST /login`, `GET /me`, `POST /switch-role`
   - Permissions: `TRIP_CREATE`, `TRIP_MANAGE`, `PARTICIPANTS_VIEW`, `BOOKING_CREATE`, `CHAT_PARTICIPATE`.
2. **Trip Management Microservice (`/api/v1/trips`)**:
   - `GET /trips`, `POST /trips` (Organizer only), `GET /trips/:id`, `PATCH /trips/:id`, `DELETE /trips/:id`
   - Capacity tracking: `max_seats`, `available_seats`, `booked_seats`.
3. **Booking & Payment Microservice (`/api/v1/bookings`)**:
   - `POST /bookings/hold`, `POST /bookings/confirm-payment`, `GET /bookings/user`, `GET /bookings/trip/:tripId` (Organizer only)
   - Simulated payment tokenization, card checks, receipt and PDF-ready ticket generation.
4. **Group Chat Microservice (`/api/v1/chat`)**:
   - Real-time trip channel routing, message persistence, organizer pin alerts, timestamp formatting.
5. **Notification Microservice (`/api/v1/notifications`)**:
   - Event listeners for `BOOKING_CONFIRMED`, `TRIP_UPDATED`, `PAYMENT_RECEIVED`, `CHAT_MENTION`.
   - Templated email notification rendering with inbox preview.

#### Verification & Test Suite
- **Unit Test Runner**: Built-in test suite executing inside the applet validating:
  - Role-based authorization denies Participants from creating trips or viewing unpermitted roster data.
  - Concurrent booking limits prevent negative seat allocations.
  - Payment validation rejects invalid card numbers or expired details.
  - Group chat isolates messages between distinct trip channels.
