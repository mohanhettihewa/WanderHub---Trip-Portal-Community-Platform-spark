"""
WanderHub - Unified Python FastAPI Microservices Gateway & SQLite Engine
========================================================================
Runs a multi-threaded Python 3 HTTP & SQLite server on port 8000 (configurable
via PYTHON_PORT), orchestrating all five microservices:
  1. auth_service       (RBAC, JWT tokens, user sessions)
  2. trip_service       (Expedition catalog, global search, seat inventory)
  3. booking_service    (Atomic seat locks, payment gateway validation, rosters)
  4. chat_service       (Trip-isolated group chat & organizer broadcasts)
  5. notification_service (Automated transactional HTML email dispatcher)
"""

import json
import os
import re
import sqlite3
import sys
import threading
import time
import unittest
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import parse_qs, urlparse

# Ensure local backend directory is on sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from fastapi_runtime import HTTPException, jwt, status
import auth_service.main as auth_ms
import trip_service.main as trip_ms
import booking_service.main as booking_ms
import chat_service.main as chat_ms
import notification_service.main as notif_ms
from tests.test_microservices import TestWanderHubMicroservices

DB_PATH = os.path.join(BACKEND_DIR, "wanderhub.db")
DB_LOCK = threading.Lock()
SECRET_KEY = "wanderhub-super-secret-production-signing-key"

# Resilient inline SVG Data-URI Avatars (Zero external network fragility)
AVATAR_ELENA = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>"
    "<rect width='120' height='120' rx='60' fill='%23065f46'/>"
    "<circle cx='60' cy='46' r='20' fill='%23a7f3d0'/>"
    "<path d='M24 104c6-22 22-34 36-34s30 12 36 34' fill='%23a7f3d0'/>"
    "<text x='60' y='52' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='bold' fill='%23064e3b'>ER</text>"
    "</svg>"
)

AVATAR_MARCUS = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>"
    "<rect width='120' height='120' rx='60' fill='%231e3a8a'/>"
    "<circle cx='60' cy='46' r='20' fill='%23bfdbfe'/>"
    "<path d='M24 104c6-22 22-34 36-34s30 12 36 34' fill='%23bfdbfe'/>"
    "<text x='60' y='52' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='bold' fill='%231e3a8a'>MV</text>"
    "</svg>"
)

AVATAR_SARAH = (
    "data:image/svg+xml;utf8,"
    "<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'>"
    "<rect width='120' height='120' rx='60' fill='%237c2d12'/>"
    "<circle cx='60' cy='46' r='20' fill='%23fed7aa'/>"
    "<path d='M24 104c6-22 22-34 36-34s30 12 36 34' fill='%23fed7aa'/>"
    "<text x='60' y='52' text-anchor='middle' font-family='sans-serif' font-size='14' font-weight='bold' fill='%237c2d12'>SC</text>"
    "</svg>"
)

ROLE_PERMISSIONS: Dict[str, List[str]] = {
    "Organizer": [
        "CREATE_TRIP",
        "EDIT_TRIP",
        "DELETE_TRIP",
        "VIEW_PARTICIPANT_ROSTER",
        "BROADCAST_ANNOUNCEMENT",
        "VIEW_ANALYTICS",
        "BROWSE_TRIPS",
        "SEND_CHAT_MESSAGE",
    ],
    "Participant": [
        "BROWSE_TRIPS",
        "BOOK_SEAT",
        "CANCEL_OWN_BOOKING",
        "SEND_CHAT_MESSAGE",
    ],
}


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Initialize SQLite schema and seed data if empty."""
    with DB_LOCK:
        conn = get_connection()
        cur = conn.cursor()

        cur.executescript(
            """
            CREATE TABLE IF NOT EXISTS app_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                role TEXT NOT NULL,
                avatar TEXT NOT NULL,
                organizationName TEXT,
                bio TEXT,
                phone TEXT,
                joinedDate TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subtitle TEXT NOT NULL,
                category TEXT NOT NULL,
                destination TEXT NOT NULL,
                country TEXT NOT NULL,
                startDate TEXT NOT NULL,
                endDate TEXT NOT NULL,
                durationDays INTEGER NOT NULL,
                pricePerPerson REAL NOT NULL,
                currency TEXT NOT NULL,
                maxSeats INTEGER NOT NULL,
                bookedSeats INTEGER NOT NULL,
                difficulty TEXT NOT NULL,
                organizerId TEXT NOT NULL,
                organizerName TEXT NOT NULL,
                organizerAvatar TEXT NOT NULL,
                organizerContact TEXT NOT NULL,
                coverGradient TEXT NOT NULL,
                featuredIcon TEXT NOT NULL,
                description TEXT NOT NULL,
                highlights TEXT NOT NULL,
                included TEXT NOT NULL,
                excluded TEXT NOT NULL,
                itinerary TEXT NOT NULL,
                cancellationPolicy TEXT NOT NULL,
                status TEXT NOT NULL,
                createdAt TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS bookings (
                id TEXT PRIMARY KEY,
                tripId TEXT NOT NULL,
                tripTitle TEXT NOT NULL,
                tripDestination TEXT NOT NULL,
                tripStartDate TEXT NOT NULL,
                tripEndDate TEXT NOT NULL,
                participantId TEXT NOT NULL,
                participantName TEXT NOT NULL,
                participantEmail TEXT NOT NULL,
                participantPhone TEXT NOT NULL,
                seatsBooked INTEGER NOT NULL,
                pricePerSeat REAL NOT NULL,
                totalAmount REAL NOT NULL,
                currency TEXT NOT NULL,
                status TEXT NOT NULL,
                paymentTransactionId TEXT NOT NULL,
                paymentMethod TEXT NOT NULL,
                bookingCode TEXT NOT NULL,
                emergencyContact TEXT NOT NULL,
                specialRequirements TEXT,
                createdAt TEXT NOT NULL,
                confirmedAt TEXT
            );

            CREATE TABLE IF NOT EXISTS chat_messages (
                id TEXT PRIMARY KEY,
                tripId TEXT NOT NULL,
                senderId TEXT NOT NULL,
                senderName TEXT NOT NULL,
                senderRole TEXT NOT NULL,
                senderAvatar TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                isAnnouncement INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                recipientEmail TEXT NOT NULL,
                recipientName TEXT NOT NULL,
                subject TEXT NOT NULL,
                category TEXT NOT NULL,
                previewText TEXT NOT NULL,
                htmlContent TEXT NOT NULL,
                sentAt TEXT NOT NULL,
                read INTEGER NOT NULL DEFAULT 0,
                metadata TEXT
            );
            """
        )

        # Check if already seeded
        cur.execute("SELECT COUNT(*) AS cnt FROM users")
        if cur.fetchone()["cnt"] == 0:
            _seed_initial_data(cur)

        conn.commit()
        conn.close()


def _seed_initial_data(cur: sqlite3.Cursor) -> None:
    """Populate initial users, expeditions, bookings, chat messages, and notifications."""
    cur.execute("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('current_user_id', 'usr_org_01')")

    seed_users = [
        (
            "usr_org_01",
            "Elena Rostova",
            "elena@summitexpeditions.org",
            "Organizer",
            AVATAR_ELENA,
            "Summit Alpine Expeditions",
            "Certified UIAGM mountain guide and expedition leader with 14 years across the Himalayas, Andes, and Alps.",
            "+1 (555) 234-8901",
            "2023-04-12",
        ),
        (
            "usr_part_01",
            "Marcus Vance",
            "marcus.vance@gmail.com",
            "Participant",
            AVATAR_MARCUS,
            None,
            "Amateur landscape photographer, coastal kayaker, and high-altitude trail runner.",
            "+1 (555) 876-5432",
            "2024-01-19",
        ),
        (
            "usr_part_02",
            "Sarah Chen",
            "sarah.chen@techadventures.io",
            "Participant",
            AVATAR_SARAH,
            None,
            "Software engineer and weekend mountaineer eager to summit iconic peaks.",
            "+1 (555) 432-1098",
            "2024-05-08",
        ),
    ]
    cur.executemany(
        """
        INSERT INTO users (id, name, email, role, avatar, organizationName, bio, phone, joinedDate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        seed_users,
    )

    seed_trips = [
        (
            "trip_him_01",
            "Himalayan Ridge & Annapurna High Sanctuary",
            "12-Day High Altitude Alpine Trek & Glacial Basecamp",
            "Trek & Mountain",
            "Annapurna Conservation Area",
            "Nepal",
            "2026-11-10",
            "2026-11-22",
            12,
            1850,
            "USD",
            12,
            8,
            "Challenging",
            "usr_org_01",
            "Elena Rostova",
            AVATAR_ELENA,
            "+1 (555) 234-8901",
            "from-sky-900 via-indigo-950 to-slate-900",
            "mountain",
            "Traverse breathtaking Rhododendron forests, climb above the tree line into dramatic alpine moraines, and wake up surrounded by 8,000-meter peaks at Annapurna Base Camp (4,130m). Includes experienced Sherpa mountaineering team, acclimatization schedule, and rustic lodge stays.",
            json.dumps([
                "Summit view from Poon Hill at sunrise",
                "Annapurna Base Camp amphitheater (4,130m)",
                "Natural geothermal hot springs of Jhinu Danda",
                "Certified Wilderness First Responder guide accompanying the team",
            ]),
            json.dumps([
                "ACAP & TIMS national park trekking permits",
                "All teahouse lodges and private camp stays",
                "English-speaking licensed UIAGM mountain guide",
                "Porters for heavy expedition gear (2:1 ratio)",
                "Satellite emergency communications (Garmin inReach)",
            ]),
            json.dumps([
                "International flights to Kathmandu",
                "Personal trekking gear (sleeping bag rating -15°C, poles)",
                "Travel medical and helicopter evacuation insurance",
            ]),
            json.dumps([
                {"day": 1, "title": "Arrival in Pokhara & Gear Briefing", "description": "Meet the team on the shores of Lake Phewa. Complete permit checks and packing review.", "activities": ["Orientation dinner", "Gear check"]},
                {"day": 2, "title": "Nayapul to Tikhedhungga", "description": "Drive to trailhead and initiate the trek through terraced millet fields and suspension bridges.", "activities": ["4-hour trek", "Waterfall viewpoints"]},
                {"day": 3, "title": "The Great Ulleri Stairway to Ghorepani", "description": "Ascend stone staircases winding through ancient rhododendron and mossy oak groves.", "activities": ["6-hour ascent", "Mountain vistas"]},
                {"day": 4, "title": "Poon Hill Sunrise & Tadapani Ridge", "description": "Dawn scramble up Poon Hill (3,210m) witnessing golden light over Dhaulagiri and Machapuchare.", "activities": ["Sunrise panoramic photography", "Ridge descent"]},
                {"day": 5, "title": "Chhomrong: The Gateway to the Sanctuary", "description": "Descend to Chhomrong Khola river and climb to the traditional Gurung cliffside village.", "activities": ["Cultural immersion", "Rest evening"]},
                {"day": 6, "title": "Annapurna Basecamp Amphitheater Arrival", "description": "Step into the colossal glacial sanctuary enveloped by Hiunchuli, Annapurna I, and Tent Peak.", "activities": ["High-altitude camp celebration", "Glacier exploration"]},
            ]),
            "Full refund up to 30 days prior to departure; 50% refund between 29 to 14 days.",
            "published",
            "2026-08-15T10:00:00Z",
        ),
        (
            "trip_sea_02",
            "Norwegian Fjord Kayak & Glacier Trail",
            "7-Day Sea Kayaking, Cliff Hikes & Waterfall Exploration",
            "Coastal & Water",
            "Nærøyfjord & Aurlandsfjord",
            "Norway",
            "2026-12-05",
            "2026-12-12",
            7,
            1420,
            "USD",
            10,
            4,
            "Moderate",
            "usr_org_01",
            "Elena Rostova",
            AVATAR_ELENA,
            "+1 (555) 234-8901",
            "from-emerald-900 via-teal-950 to-slate-900",
            "waves",
            "Paddle through UNESCO-protected narrow sea waterways beneath soaring 1,200-meter sheer granite walls and thundering cascades. Camp on secluded fjord beaches and trek up the Prest mountain ridge overlooking Aurland.",
            json.dumps([
                "Sea kayaking UNESCO World Heritage Nærøyfjord",
                "Wild camping beneath roaring alpine waterfalls",
                "Hike to the dramatic rim of Mt. Prest",
                "Traditional Nordic sauna and cold plunge experience",
            ]),
            json.dumps([
                "High-performance expedition sea kayaks and drysuits",
                "Experienced British Canoeing certified instructors",
                "All wild campsite fees and expedition kitchen meals",
                "Waterproof dry bags and safety equipment",
            ]),
            json.dumps([
                "Train to Flåm / Bergen",
                "Personal thermal base layers",
                "Alcoholic beverages",
            ]),
            json.dumps([
                {"day": 1, "title": "Flåm Harbor Launch", "description": "Safety briefing, drysuit fittings, and paddle stroke tuning in the calm harbor.", "activities": ["Equipment fit", "Afternoon launch"]},
                {"day": 2, "title": "Nærøyfjord Narrows Passage", "description": "Glide along sheer rock walls where mountain goats graze on mossy precipices.", "activities": ["5-hour kayaking", "Beach camp cookout"]},
                {"day": 3, "title": "Undredal Goat Cheese & Fjord Hike", "description": "Land at historic hamlet of Undredal for artisan tasting and scenic valley ascent.", "activities": ["Cultural culinary tour", "Overlook hike"]},
                {"day": 4, "title": "Glacier Melt Waterfalls & Sauna Night", "description": "Paddle past cascading melting ice and rest at eco-lodge with wood-fired fjord sauna.", "activities": ["Water navigation", "Sauna recovery"]},
            ]),
            "Free cancellation within 48 hours of booking. 80% refund up to 21 days before trip.",
            "published",
            "2026-09-01T14:30:00Z",
        ),
        (
            "trip_des_03",
            "Wadi Rum Desert Stargazing & Bivouac Expedition",
            "5-Day Bedouin Guided Traverse & Deep Night Astrophotography",
            "Desert & Safari",
            "Wadi Rum Protected Area",
            "Jordan",
            "2026-11-28",
            "2026-12-03",
            5,
            980,
            "USD",
            14,
            11,
            "Moderate",
            "usr_org_01",
            "Elena Rostova",
            AVATAR_ELENA,
            "+1 (555) 234-8901",
            "from-amber-900 via-orange-950 to-stone-900",
            "compass",
            "Walk through red sandstone arches and ancient Thamudic petroglyphs in the Valley of the Moon. Sleep under the darkest Bortle-1 skies in the Middle East with high-powered telescopes and traditional Bedouin zarb dinners.",
            json.dumps([
                "Burdah Rock Bridge scramble and summit view",
                "Zero light pollution milky way astrophotography workshop",
                "Camel caravan traverse across ochre dunes",
                "Traditional Bedouin storytelling by campfire",
            ]),
            json.dumps([
                "4WD support vehicles and desert transfers",
                "Bedouin luxury glamping tents with private comforts",
                "Astrophotography equipment and star maps",
                "All authentic meals and fresh mint teas",
            ]),
            json.dumps([
                "Jordan Pass / Visa on arrival",
                "International flights to Amman / Aqaba",
                "Personal camera tripod",
            ]),
            json.dumps([
                {"day": 1, "title": "Arrival at Seven Pillars of Wisdom", "description": "Meet Bedouin hosts at desert entrance and transfer by open-top 4x4 to central camp.", "activities": ["Sunset tea", "Telescope alignment"]},
                {"day": 2, "title": "Lawrence Spring & Khazali Canyon", "description": "Hike through narrow gorges containing 2,000-year-old Nabataean inscriptions.", "activities": ["Canyon walk", "Dune sandboarding"]},
                {"day": 3, "title": "Burdah Rock Bridge Scramble", "description": "Adventurous guided ascent to the world-famous natural rock span high above the desert floor.", "activities": ["Scramble & climb", "Panoramic picnic"]},
            ]),
            "Full refund up to 14 days before start date.",
            "published",
            "2026-09-12T09:15:00Z",
        ),
        (
            "trip_nor_04",
            "Lapland Arctic Wilderness & Aurora Trek",
            "6-Day Snowshoeing, Wilderness Cabins & Northern Lights Hunting",
            "Nordic & Winter",
            "Urho Kekkonen National Park",
            "Finland",
            "2026-12-18",
            "2026-12-24",
            6,
            1650,
            "USD",
            8,
            5,
            "Challenging",
            "usr_org_01",
            "Elena Rostova",
            AVATAR_ELENA,
            "+1 (555) 234-8901",
            "from-blue-950 via-slate-900 to-cyan-950",
            "snowflake",
            "Immerse into silent snow-draped taiga forests and rolling fells 250km north of the Arctic Circle. Stay in cozy timber cabins heated by birch fires, search for dancing aurora borealis nightly, and mush with husky dog sleds.",
            json.dumps([
                "Nightly aurora hunting in deep wilderness",
                "Husky dog sledding safari through silent pines",
                "Snowshoeing untracked deep powder on Kiilopää fell",
                "Traditional smoke sauna and ice hole swimming",
            ]),
            json.dumps([
                "Extreme cold weather Arctic gear (down parka, boots, mittens)",
                "All backcountry cabin stays with firewood & sauna",
                "Professional Arctic wilderness guide & safety gear",
                "Husky team rental and safety instruction",
            ]),
            json.dumps([
                "Flights to Ivalo (IVL)",
                "Travel insurance covering winter sports",
            ]),
            json.dumps([
                {"day": 1, "title": "Ivalo Welcome & Gear Outfitting", "description": "Arrive in Lapland, gear fittings in thermo suits, and fire-lit welcome soup.", "activities": ["Arctic gear review", "Night walk"]},
                {"day": 2, "title": "Snowshoe Expedition to Rautulampi", "description": "Trek into the heart of the national park, traversing frozen tarns and snow-crusted ridges.", "activities": ["Snowshoe trek", "Cabin wood-chopping"]},
                {"day": 3, "title": "Husky Musher Day", "description": "Drive your own two-person dog team through glittering snowy birch valleys.", "activities": ["Dog sledding", "Aurora watch"]},
            ]),
            "Full refund up to 21 days prior to departure.",
            "published",
            "2026-09-20T11:45:00Z",
        ),
    ]

    cur.executemany(
        """
        INSERT INTO trips (
            id, title, subtitle, category, destination, country, startDate, endDate,
            durationDays, pricePerPerson, currency, maxSeats, bookedSeats, difficulty,
            organizerId, organizerName, organizerAvatar, organizerContact, coverGradient,
            featuredIcon, description, highlights, included, excluded, itinerary,
            cancellationPolicy, status, createdAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        seed_trips,
    )

    seed_bookings = [
        (
            "bkg_him_01",
            "trip_him_01",
            "Himalayan Ridge & Annapurna High Sanctuary",
            "Annapurna Conservation Area, Nepal",
            "2026-11-10",
            "2026-11-22",
            "usr_part_01",
            "Marcus Vance",
            "marcus.vance@gmail.com",
            "+1 (555) 876-5432",
            1,
            1850,
            1850,
            "USD",
            "confirmed",
            "txn_stripe_sim_89214710",
            "Visa •••• 4242",
            "WH-HIM-9281",
            json.dumps({"name": "Claire Vance", "phone": "+1 (555) 998-1234", "relation": "Spouse"}),
            "Vegetarian meals preferred during teahouse lodges.",
            "2026-10-15T08:30:00Z",
            "2026-10-15T08:32:15Z",
        ),
        (
            "bkg_him_02",
            "trip_him_01",
            "Himalayan Ridge & Annapurna High Sanctuary",
            "Annapurna Conservation Area, Nepal",
            "2026-11-10",
            "2026-11-22",
            "usr_part_02",
            "Sarah Chen",
            "sarah.chen@techadventures.io",
            "+1 (555) 432-1098",
            2,
            1850,
            3700,
            "USD",
            "confirmed",
            "txn_stripe_sim_38194022",
            "Mastercard •••• 5555",
            "WH-HIM-4412",
            json.dumps({"name": "David Chen", "phone": "+1 (555) 234-9988", "relation": "Brother"}),
            None,
            "2026-10-18T14:10:00Z",
            "2026-10-18T14:12:05Z",
        ),
    ]
    cur.executemany(
        """
        INSERT INTO bookings (
            id, tripId, tripTitle, tripDestination, tripStartDate, tripEndDate,
            participantId, participantName, participantEmail, participantPhone,
            seatsBooked, pricePerSeat, totalAmount, currency, status,
            paymentTransactionId, paymentMethod, bookingCode, emergencyContact,
            specialRequirements, createdAt, confirmedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        seed_bookings,
    )

    seed_messages = [
        (
            "msg_01",
            "trip_him_01",
            "usr_org_01",
            "Elena Rostova",
            "Organizer",
            AVATAR_ELENA,
            "Welcome everyone to the Annapurna Ridge Expedition! Please make sure your passport has at least 6 months validity from departure date for Nepal visa processing.",
            "2026-10-16T09:00:00Z",
            1,
        ),
        (
            "msg_02",
            "trip_him_01",
            "usr_part_01",
            "Marcus Vance",
            "Participant",
            AVATAR_MARCUS,
            "Excited to be joining! Quick question Elena: are microspikes needed or will heavy lug Vibram boots suffice for the sanctuary moraine?",
            "2026-10-16T11:24:00Z",
            0,
        ),
        (
            "msg_03",
            "trip_him_01",
            "usr_org_01",
            "Elena Rostova",
            "Organizer",
            AVATAR_ELENA,
            "Great question Marcus. Heavy lug boots are great for the ascent, but we will provide lightweight Kahtoola microspikes in Pokhara for the final icy approach past Deurali.",
            "2026-10-16T11:45:00Z",
            0,
        ),
        (
            "msg_04",
            "trip_him_01",
            "usr_part_02",
            "Sarah Chen",
            "Participant",
            AVATAR_SARAH,
            "Hello team! Anyone flying out through Doha on Qatar Airways on Nov 9? Would love to share airport transfer into Pokhara.",
            "2026-10-18T16:15:00Z",
            0,
        ),
    ]
    cur.executemany(
        """
        INSERT INTO chat_messages (
            id, tripId, senderId, senderName, senderRole, senderAvatar, message, timestamp, isAnnouncement
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        seed_messages,
    )

    seed_html = """
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: -0.5px;">WanderHub Expeditions</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Official Expedition Booking Confirmation</p>
        </div>
        <div style="padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Dear Marcus,</h2>
          <p>Congratulations! Your seat for <strong>Himalayan Ridge & Annapurna High Sanctuary</strong> is officially secured.</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 6px 0;"><strong>Booking Code:</strong> <span style="font-family: monospace;">WH-HIM-9281</span></p>
            <p style="margin: 0 0 6px 0;"><strong>Expedition Dates:</strong> Nov 10 – Nov 22, 2026</p>
            <p style="margin: 0 0 6px 0;"><strong>Destination:</strong> Annapurna Sanctuary, Nepal</p>
            <p style="margin: 0;"><strong>Total Paid:</strong> <span style="color: #059669; font-weight: bold;">$1,850.00 USD</span></p>
          </div>
          <p style="font-size: 13px; color: #64748b;">Lead Organizer: Elena Rostova (Summit Alpine Expeditions)</p>
        </div>
      </div>
    """
    cur.execute(
        """
        INSERT INTO notifications (
            id, recipientEmail, recipientName, subject, category, previewText, htmlContent, sentAt, read, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "notif_seed_01",
            "marcus.vance@gmail.com",
            "Marcus Vance",
            "Booking Confirmed: Himalayan Ridge & Annapurna High Sanctuary",
            "booking_confirmation",
            "Your expedition booking WH-HIM-9281 has been confirmed. View itinerary and packing guidelines.",
            seed_html,
            "2026-10-15T08:32:16Z",
            1,
            json.dumps({"tripId": "trip_him_01", "bookingId": "bkg_him_01", "amount": 1850}),
        ),
    )

    org_seed_html = """
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">WanderHub Organizer Studio</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <p>Hello <strong>Elena Rostova</strong>,</p>
          <p>Participant <strong>Sarah Chen</strong> booked 2 seats on <strong>Himalayan Ridge & Annapurna High Sanctuary</strong>.</p>
          <p><strong>Revenue Generated:</strong> +$3,700 USD (Booking Code: WH-HIM-4412)</p>
        </div>
      </div>
    """
    cur.execute(
        """
        INSERT INTO notifications (
            id, recipientEmail, recipientName, subject, category, previewText, htmlContent, sentAt, read, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "notif_seed_02",
            "elena@summitexpeditions.org",
            "Elena Rostova",
            "New Traveler Joined: Sarah Chen booked Himalayan Ridge & Annapurna High Sanctuary",
            "trip_announcement",
            "Sarah Chen reserved 2 seat(s) on Himalayan Ridge & Annapurna High Sanctuary (+$3,700 USD).",
            org_seed_html,
            "2026-10-18T14:12:06Z",
            0,
            json.dumps({"tripId": "trip_him_01", "bookingId": "bkg_him_02", "amount": 3700}),
        ),
    )


# ============================================================================
# Row Serialization Helpers
# ============================================================================

def _row_to_trip(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["highlights"] = json.loads(d["highlights"])
    d["included"] = json.loads(d["included"])
    d["excluded"] = json.loads(d["excluded"])
    d["itinerary"] = json.loads(d["itinerary"])
    return d


def _row_to_booking(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["emergencyContact"] = json.loads(d["emergencyContact"])
    return d


def _row_to_message(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["isAnnouncement"] = bool(d["isAnnouncement"])
    return d


def _row_to_notification(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["read"] = bool(d["read"])
    d["metadata"] = json.loads(d["metadata"]) if d.get("metadata") else None
    return d


def _get_current_user(cur: sqlite3.Cursor) -> Dict[str, Any]:
    cur.execute("SELECT value FROM app_meta WHERE key = 'current_user_id'")
    meta = cur.fetchone()
    uid = meta["value"] if meta else "usr_org_01"
    cur.execute("SELECT * FROM users WHERE id = ?", (uid,))
    u = cur.fetchone()
    if not u:
        cur.execute("SELECT * FROM users LIMIT 1")
        u = cur.fetchone()
    return dict(u)


def _assert_permission(user: Dict[str, Any], permission: str) -> None:
    allowed = ROLE_PERMISSIONS.get(user["role"], [])
    if permission not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"403 Forbidden: Role '{user['role']}' lacks permission '{permission}'",
        )


def _validate_card(payment: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    clean_num = re.sub(r"\s+", "", str(payment.get("cardNumber", "")))
    if not re.match(r"^\d{15,19}$", clean_num):
        return False, "Invalid card number. Please provide a 15 to 19 digit credit card."
    holder = str(payment.get("cardHolder", "")).strip()
    if len(holder) < 3:
        return False, "Cardholder name is required."
    expiry = str(payment.get("expiryDate", ""))
    if not re.match(r"^(0[1-9]|1[0-2])/\d{2}$", expiry):
        return False, "Expiry date must be in MM/YY format."
    cvv = str(payment.get("cvv", ""))
    if not re.match(r"^\d{3,4}$", cvv):
        return False, "CVV security code must be 3 or 4 digits."
    return True, None


# ============================================================================
# Python Unittest Runner Endpoint Handler
# ============================================================================

def execute_python_unit_tests() -> List[Dict[str, Any]]:
    """Run all unit tests in TestWanderHubMicroservices in Python and return JSON report."""
    suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestWanderHubMicroservices)
    results: List[Dict[str, Any]] = []

    for test in suite:
        test_method_name = getattr(test, "_testMethodName", str(test))
        method_obj = getattr(TestWanderHubMicroservices, test_method_name, None)
        doc = (method_obj.__doc__ or "Python microservice verification test").strip()

        start_ns = time.perf_counter_ns()
        res = unittest.TestResult()
        test.run(res)
        elapsed_ms = max(1, int(round((time.perf_counter_ns() - start_ns) / 1_000_000)))

        passed = res.wasSuccessful()
        err_msg = None
        if res.failures:
            err_msg = res.failures[0][1]
        elif res.errors:
            err_msg = res.errors[0][1]

        results.append(
            {
                "id": f"py_{test_method_name}",
                "suite": "Python FastAPI Backend",
                "name": f"[Python 3.10] {test_method_name}",
                "description": doc,
                "passed": passed,
                "durationMs": elapsed_ms,
                "error": err_msg,
            }
        )
    return results


# ============================================================================
# HTTP Request Handler Routing /api/v1/*
# ============================================================================

class MicroserviceGatewayHandler(BaseHTTPRequestHandler):
    """Routes incoming /api/v1/* HTTP requests to the Python microservices & SQLite store."""

    def log_message(self, format: str, *args: Any) -> None:
        # Keep console logs clean
        pass

    def _send_json(self, payload: Any, status_code: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> Dict[str, Any]:
        length = int(self.headers.get("Content-Length", "0"))
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw) if raw else {}

    def do_OPTIONS(self) -> None:
        self._send_json({"ok": True}, 200)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        try:
            if path in ("/api/v1/health", "/health"):
                self._send_json(
                    {
                        "status": "healthy",
                        "runtime": f"Python {sys.version.split()[0]}",
                        "framework": "FastAPI Microservices Gateway",
                        "database": "SQLite3 Persistent Engine",
                        "services": [
                            {"name": auth_ms.app.title, "port": 8001, "status": "online"},
                            {"name": trip_ms.app.title, "port": 8002, "status": "online"},
                            {"name": booking_ms.app.title, "port": 8003, "status": "online"},
                            {"name": chat_ms.app.title, "port": 8004, "status": "online"},
                            {"name": notif_ms.app.title, "port": 8005, "status": "online"},
                        ],
                    }
                )
                return

            if path == "/api/v1/openapi.json":
                combined_paths: Dict[str, Any] = {}
                for ms_app in (auth_ms.app, trip_ms.app, booking_ms.app, chat_ms.app, notif_ms.app):
                    spec = ms_app.openapi()
                    combined_paths.update(spec.get("paths", {}))
                self._send_json(
                    {
                        "openapi": "3.1.0",
                        "info": {
                            "title": "WanderHub Unified Python FastAPI Microservices",
                            "version": "1.0.0",
                        },
                        "paths": combined_paths,
                    }
                )
                return

            if path == "/api/v1/state":
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    current_user = _get_current_user(cur)
                    cur.execute("SELECT * FROM users")
                    users = [dict(r) for r in cur.fetchall()]
                    cur.execute("SELECT * FROM trips ORDER BY createdAt DESC")
                    trips = [_row_to_trip(r) for r in cur.fetchall()]
                    cur.execute("SELECT * FROM bookings ORDER BY createdAt DESC")
                    bookings = [_row_to_booking(r) for r in cur.fetchall()]
                    cur.execute("SELECT * FROM chat_messages ORDER BY timestamp ASC")
                    messages = [_row_to_message(r) for r in cur.fetchall()]
                    cur.execute("SELECT * FROM notifications ORDER BY sentAt DESC")
                    notifications = [_row_to_notification(r) for r in cur.fetchall()]
                    conn.close()

                token = jwt.encode(
                    {"sub": current_user["email"], "role": current_user["role"], "uid": current_user["id"]},
                    SECRET_KEY,
                )
                self._send_json(
                    {
                        "currentUser": current_user,
                        "accessToken": token,
                        "users": users,
                        "trips": trips,
                        "bookings": bookings,
                        "messages": messages,
                        "notifications": notifications,
                        "runtime": f"Python {sys.version.split()[0]}",
                    }
                )
                return

            if path == "/api/v1/trips":
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM trips ORDER BY createdAt DESC")
                    trips = [_row_to_trip(r) for r in cur.fetchall()]
                    conn.close()

                dest = query.get("destination", [""])[0].strip().lower()
                if dest:
                    trips = [
                        t for t in trips
                        if dest in t["destination"].lower()
                        or dest in t["country"].lower()
                        or dest in t["title"].lower()
                    ]
                self._send_json(trips)
                return

            if path == "/api/v1/bookings/roster":
                trip_id = query.get("tripId", [""])[0]
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    current_user = _get_current_user(cur)
                    _assert_permission(current_user, "VIEW_PARTICIPANT_ROSTER")
                    cur.execute("SELECT * FROM bookings WHERE tripId = ? ORDER BY createdAt DESC", (trip_id,))
                    roster = [_row_to_booking(r) for r in cur.fetchall()]
                    conn.close()
                self._send_json(roster)
                return

            self._send_json({"detail": f"Route {path} not found"}, 404)

        except HTTPException as exc:
            self._send_json({"detail": exc.detail}, exc.status_code)
        except Exception as exc:
            self._send_json({"detail": str(exc)}, 500)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            body = self._read_json()

            if path == "/api/v1/auth/switch":
                user_id = body.get("userId", "")
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
                    row = cur.fetchone()
                    if not row:
                        conn.close()
                        raise HTTPException(status_code=404, detail=f"User {user_id} not found")
                    cur.execute("INSERT OR REPLACE INTO app_meta (key, value) VALUES ('current_user_id', ?)", (user_id,))
                    conn.commit()
                    user = dict(row)
                    conn.close()

                token = jwt.encode({"sub": user["email"], "role": user["role"], "uid": user["id"]}, SECRET_KEY)
                self._send_json({"user": user, "accessToken": token})
                return

            if path == "/api/v1/trips":
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    current_user = _get_current_user(cur)
                    _assert_permission(current_user, "CREATE_TRIP")

                    trip_id = f"trip_{int(time.time() * 1000)}"
                    now_iso = datetime.now(timezone.utc).isoformat()
                    new_trip = (
                        trip_id,
                        body["title"],
                        body.get("subtitle") or f"{body.get('durationDays', 7)}-Day Expedition",
                        body["category"],
                        body["destination"],
                        body["country"],
                        body["startDate"],
                        body["endDate"],
                        int(body.get("durationDays", 7)),
                        float(body["pricePerPerson"]),
                        body.get("currency", "USD"),
                        int(body["maxSeats"]),
                        0,
                        body["difficulty"],
                        current_user["id"],
                        current_user["name"],
                        current_user["avatar"],
                        current_user.get("phone") or current_user["email"],
                        body.get("coverGradient", "from-slate-900 via-indigo-950 to-slate-900"),
                        body.get("featuredIcon", "mountain"),
                        body["description"],
                        json.dumps(body.get("highlights", [])),
                        json.dumps(body.get("included", [])),
                        json.dumps(body.get("excluded", [])),
                        json.dumps(body.get("itinerary", [])),
                        body.get("cancellationPolicy", "Full refund up to 30 days prior to departure."),
                        body.get("status", "published"),
                        now_iso,
                    )
                    cur.execute(
                        """
                        INSERT INTO trips (
                            id, title, subtitle, category, destination, country, startDate, endDate,
                            durationDays, pricePerPerson, currency, maxSeats, bookedSeats, difficulty,
                            organizerId, organizerName, organizerAvatar, organizerContact, coverGradient,
                            featuredIcon, description, highlights, included, excluded, itinerary,
                            cancellationPolicy, status, createdAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        new_trip,
                    )
                    conn.commit()
                    cur.execute("SELECT * FROM trips WHERE id = ?", (trip_id,))
                    created = _row_to_trip(cur.fetchone())
                    conn.close()

                self._send_json(created, 201)
                return

            if path == "/api/v1/bookings":
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    current_user = _get_current_user(cur)
                    _assert_permission(current_user, "BOOK_SEAT")

                    trip_id = body.get("tripId")
                    seats = int(body.get("seats", 1))
                    payment = body.get("payment", {})
                    emergency = body.get("emergencyContact", {})
                    special = body.get("specialRequirements", "")

                    if seats <= 0:
                        conn.close()
                        raise HTTPException(status_code=400, detail="Number of seats must be at least 1")

                    valid, err = _validate_card(payment)
                    if not valid:
                        conn.close()
                        raise HTTPException(status_code=400, detail=f"Payment Rejected: {err}")

                    cur.execute("SELECT * FROM trips WHERE id = ?", (trip_id,))
                    trip_row = cur.fetchone()
                    if not trip_row:
                        conn.close()
                        raise HTTPException(status_code=404, detail=f"Trip {trip_id} not found")

                    trip = _row_to_trip(trip_row)
                    available = trip["maxSeats"] - trip["bookedSeats"]
                    if seats > available:
                        conn.close()
                        raise HTTPException(
                            status_code=409,
                            detail=f"Insufficient seat inventory: Requested {seats}, but only {available} seats remain.",
                        )

                    # Atomic seat increment in SQLite
                    cur.execute(
                        "UPDATE trips SET bookedSeats = bookedSeats + ? WHERE id = ?",
                        (seats, trip_id),
                    )

                    now_iso = datetime.now(timezone.utc).isoformat()
                    total_amount = float(trip["pricePerPerson"]) * seats
                    clean_card = re.sub(r"\s+", "", str(payment.get("cardNumber", "")))
                    last4 = clean_card[-4:] if len(clean_card) >= 4 else "4242"
                    txn_id = f"txn_py_gw_{int(time.time() * 1000)}"
                    booking_code = f"WH-{trip['category'][:3].upper()}-{int(time.time() * 1000) % 9000 + 1000}"
                    booking_id = f"bkg_{int(time.time() * 1000)}"

                    cur.execute(
                        """
                        INSERT INTO bookings (
                            id, tripId, tripTitle, tripDestination, tripStartDate, tripEndDate,
                            participantId, participantName, participantEmail, participantPhone,
                            seatsBooked, pricePerSeat, totalAmount, currency, status,
                            paymentTransactionId, paymentMethod, bookingCode, emergencyContact,
                            specialRequirements, createdAt, confirmedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            booking_id,
                            trip["id"],
                            trip["title"],
                            f"{trip['destination']}, {trip['country']}",
                            trip["startDate"],
                            trip["endDate"],
                            current_user["id"],
                            current_user["name"],
                            current_user["email"],
                            current_user.get("phone") or "+1 (555) 000-0000",
                            seats,
                            trip["pricePerPerson"],
                            total_amount,
                            trip["currency"],
                            "confirmed",
                            txn_id,
                            f"Card •••• {last4}",
                            booking_code,
                            json.dumps(emergency),
                            special,
                            now_iso,
                            now_iso,
                        ),
                    )

                    # Automated welcome message in trip group chat
                    cur.execute(
                        """
                        INSERT INTO chat_messages (
                            id, tripId, senderId, senderName, senderRole, senderAvatar, message, timestamp, isAnnouncement
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"sys_msg_{int(time.time() * 1000)}",
                            trip["id"],
                            "sys_bot",
                            "WanderHub Expeditions",
                            "Organizer",
                            AVATAR_ELENA,
                            f"{current_user['name']} has joined the expedition! ({seats} seat reserved)",
                            now_iso,
                            1,
                        ),
                    )

                    # Automated confirmation email to Participant
                    part_html = f"""
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
                        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
                          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">WanderHub Expeditions</h1>
                          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Booking & Payment Receipt (Python FastAPI Backend)</p>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
                          <p>Hi <strong>{current_user['name']}</strong>,</p>
                          <p>Your booking for <strong>{trip['title']}</strong> is confirmed!</p>
                          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
                            <p style="margin: 0 0 8px 0;"><strong>Booking Reference:</strong> <span style="font-family: monospace;">{booking_code}</span></p>
                            <p style="margin: 0 0 8px 0;"><strong>Seats Reserved:</strong> {seats} participant(s)</p>
                            <p style="margin: 0 0 8px 0;"><strong>Total Paid:</strong> ${total_amount:,.2f} {trip['currency']}</p>
                            <p style="margin: 0;"><strong>Payment Method:</strong> Card •••• {last4} (Txn: {txn_id})</p>
                          </div>
                          <p style="color: #64748b; font-size: 13px;">Lead Organizer: {trip['organizerName']} ({trip['organizerContact']})</p>
                        </div>
                      </div>
                    """
                    cur.execute(
                        """
                        INSERT INTO notifications (
                            id, recipientEmail, recipientName, subject, category, previewText, htmlContent, sentAt, read, metadata
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"notif_p_{int(time.time() * 1000)}",
                            current_user["email"],
                            current_user["name"],
                            f"Booking Confirmed: {trip['title']}",
                            "booking_confirmation",
                            f"Your reservation {booking_code} for {trip['title']} is confirmed. Total paid: ${total_amount:,.0f}.",
                            part_html,
                            now_iso,
                            0,
                            json.dumps({"tripId": trip["id"], "bookingId": booking_id, "amount": total_amount}),
                        ),
                    )

                    # Automated alert email to actual Trip Organizer
                    cur.execute("SELECT email, name FROM users WHERE id = ?", (trip["organizerId"],))
                    org_user = cur.fetchone()
                    org_email = org_user["email"] if org_user else "elena@summitexpeditions.org"
                    org_name = org_user["name"] if org_user else trip["organizerName"]
                    remaining_after = available - seats

                    org_html = f"""
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
                        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">WanderHub Organizer Studio</h2>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
                          <p>Hello <strong>{org_name}</strong>,</p>
                          <p>A new participant has booked seats on your expedition <strong>{trip['title']}</strong>.</p>
                          <ul>
                            <li><strong>Participant:</strong> {current_user['name']} ({current_user['email']})</li>
                            <li><strong>Seats Booked:</strong> {seats}</li>
                            <li><strong>Remaining Available Seats:</strong> {remaining_after}</li>
                            <li><strong>Revenue Generated:</strong> +${total_amount:,.2f} {trip['currency']}</li>
                          </ul>
                        </div>
                      </div>
                    """
                    cur.execute(
                        """
                        INSERT INTO notifications (
                            id, recipientEmail, recipientName, subject, category, previewText, htmlContent, sentAt, read, metadata
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"notif_o_{int(time.time() * 1000) + 1}",
                            org_email,
                            org_name,
                            f"New Traveler Joined: {current_user['name']} booked {trip['title']}",
                            "trip_announcement",
                            f"{current_user['name']} reserved {seats} seat(s) on {trip['title']}.",
                            org_html,
                            now_iso,
                            0,
                            json.dumps({"tripId": trip["id"], "bookingId": booking_id}),
                        ),
                    )

                    conn.commit()
                    cur.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
                    created_booking = _row_to_booking(cur.fetchone())
                    conn.close()

                self._send_json(created_booking, 201)
                return

            if path == "/api/v1/bookings/cancel":
                booking_id = body.get("bookingId")
                reason = body.get("reason", "User requested cancellation")
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    current_user = _get_current_user(cur)
                    cur.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
                    b_row = cur.fetchone()
                    if not b_row:
                        conn.close()
                        raise HTTPException(status_code=404, detail=f"Booking {booking_id} not found")

                    booking = _row_to_booking(b_row)
                    is_owner = booking["participantId"] == current_user["id"]
                    is_organizer = current_user["role"] == "Organizer"
                    if not is_owner and not is_organizer:
                        conn.close()
                        raise HTTPException(status_code=403, detail="403 Forbidden: You do not have permission to cancel this booking.")
                    if booking["status"] == "cancelled":
                        conn.close()
                        raise HTTPException(status_code=400, detail="This booking is already cancelled.")

                    cur.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", (booking_id,))
                    cur.execute(
                        "UPDATE trips SET bookedSeats = MAX(0, bookedSeats - ?) WHERE id = ?",
                        (booking["seatsBooked"], booking["tripId"]),
                    )

                    now_iso = datetime.now(timezone.utc).isoformat()
                    cancel_html = f"""
                      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
                        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">WanderHub Booking Cancellation & Refund Notice</h2>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
                          <p>Hi <strong>{booking['participantName']}</strong>,</p>
                          <p>Your booking <strong>{booking['bookingCode']}</strong> for <strong>{booking['tripTitle']}</strong> has been cancelled and {booking['seatsBooked']} seat(s) have been released back to inventory.</p>
                          <p><strong>Reason:</strong> {reason}</p>
                          <p><strong>Refund Amount Initiated:</strong> ${booking['totalAmount']:,.2f} {booking['currency']}</p>
                        </div>
                      </div>
                    """
                    cur.execute(
                        """
                        INSERT INTO notifications (
                            id, recipientEmail, recipientName, subject, category, previewText, htmlContent, sentAt, read, metadata
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            f"notif_c_{int(time.time() * 1000)}",
                            booking["participantEmail"],
                            booking["participantName"],
                            f"Booking Cancelled & Refund Initiated ({booking['bookingCode']})",
                            "seat_cancelled",
                            f"Reservation {booking['bookingCode']} for {booking['tripTitle']} has been cancelled. Reason: {reason}.",
                            cancel_html,
                            now_iso,
                            0,
                            json.dumps({"tripId": booking["tripId"], "bookingId": booking_id}),
                        ),
                    )
                    conn.commit()
                    cur.execute("SELECT * FROM bookings WHERE id = ?", (booking_id,))
                    updated = _row_to_booking(cur.fetchone())
                    conn.close()

                self._send_json(updated)
                return

            if path == "/api/v1/chat/send":
                trip_id = body.get("tripId", "")
                text = str(body.get("text", "")).strip()
                is_announcement = bool(body.get("isAnnouncement", False))
                if not text:
                    raise HTTPException(status_code=400, detail="Message cannot be empty")

                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    current_user = _get_current_user(cur)
                    _assert_permission(current_user, "SEND_CHAT_MESSAGE")

                    can_announce = current_user["role"] == "Organizer" and is_announcement
                    msg_id = f"msg_{int(time.time() * 1000)}"
                    now_iso = datetime.now(timezone.utc).isoformat()
                    cur.execute(
                        """
                        INSERT INTO chat_messages (
                            id, tripId, senderId, senderName, senderRole, senderAvatar, message, timestamp, isAnnouncement
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            msg_id,
                            trip_id,
                            current_user["id"],
                            current_user["name"],
                            current_user["role"],
                            current_user["avatar"],
                            text,
                            now_iso,
                            1 if can_announce else 0,
                        ),
                    )
                    conn.commit()
                    cur.execute("SELECT * FROM chat_messages WHERE id = ?", (msg_id,))
                    created_msg = _row_to_message(cur.fetchone())
                    conn.close()

                self._send_json(created_msg, 201)
                return

            if path == "/api/v1/notifications/read":
                notif_id = body.get("notificationId", "")
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute("UPDATE notifications SET read = 1 WHERE id = ?", (notif_id,))
                    conn.commit()
                    conn.close()
                self._send_json({"ok": True})
                return

            if path == "/api/v1/notifications/read-all":
                email = body.get("email", "")
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute("UPDATE notifications SET read = 1 WHERE LOWER(recipientEmail) = LOWER(?)", (email,))
                    conn.commit()
                    conn.close()
                self._send_json({"ok": True})
                return

            if path == "/api/v1/notifications/delete":
                notif_id = body.get("notificationId", "")
                with DB_LOCK:
                    conn = get_connection()
                    cur = conn.cursor()
                    cur.execute("DELETE FROM notifications WHERE id = ?", (notif_id,))
                    conn.commit()
                    conn.close()
                self._send_json({"ok": True})
                return

            if path == "/api/v1/tests/run":
                py_results = execute_python_unit_tests()
                self._send_json({"results": py_results, "runtime": f"Python {sys.version.split()[0]}"})
                return

            self._send_json({"detail": f"Route {path} not found"}, 404)

        except HTTPException as exc:
            self._send_json({"detail": exc.detail}, exc.status_code)
        except Exception as exc:
            self._send_json({"detail": str(exc)}, 500)


def run_gateway(port: int = 8000) -> None:
    init_db()
    server = ThreadingHTTPServer(("127.0.0.1", port), MicroserviceGatewayHandler)
    print(f"[WanderHub Python Gateway] Listening on http://127.0.0.1:{port} (Python {sys.version.split()[0]})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    target_port = int(os.environ.get("PYTHON_PORT", "8000"))
    run_gateway(target_port)
