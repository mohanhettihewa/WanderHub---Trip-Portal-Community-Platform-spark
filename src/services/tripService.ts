/**
 * WanderHub - Trip Management Microservice
 * 
 * Handles trip creation, discovery, filtering, itinerary details,
 * and real-time seat inventory synchronization.
 */

import { Trip, TripCategory, TripDifficulty } from '../types';
import { authService, AVATAR_ELENA } from './authService';
import { eventBus } from './eventBus';

const SEED_TRIPS: Trip[] = [
  {
    id: 'trip_him_01',
    title: 'Himalayan Ridge & Annapurna High Sanctuary',
    subtitle: '12-Day High Altitude Alpine Trek & Glacial Basecamp',
    category: 'Trek & Mountain',
    destination: 'Annapurna Conservation Area',
    country: 'Nepal',
    startDate: '2026-11-10',
    endDate: '2026-11-22',
    durationDays: 12,
    pricePerPerson: 1850,
    currency: 'USD',
    maxSeats: 12,
    bookedSeats: 8,
    difficulty: 'Challenging',
    organizerId: 'usr_org_01',
    organizerName: 'Elena Rostova',
    organizerAvatar: AVATAR_ELENA,
    organizerContact: '+1 (555) 234-8901',
    coverGradient: 'from-sky-900 via-indigo-950 to-slate-900',
    featuredIcon: 'mountain',
    description: 'Traverse breathtaking Rhododendron forests, climb above the tree line into dramatic alpine moraines, and wake up surrounded by 8,000-meter peaks at Annapurna Base Camp (4,130m). Includes experienced Sherpa mountaineering team, acclimatization schedule, and rustic lodge stays.',
    highlights: [
      'Summit view from Poon Hill at sunrise',
      'Annapurna Base Camp amphitheater (4,130m)',
      'Natural geothermal hot springs of Jhinu Danda',
      'Certified Wilderness First Responder guide accompanying the team'
    ],
    included: [
      'ACAP & TIMS national park trekking permits',
      'All teahouse lodges and private camp stays',
      'English-speaking licensed UIAGM mountain guide',
      'Porters for heavy expedition gear (2:1 ratio)',
      'Satellite emergency communications (Garmin inReach)'
    ],
    excluded: [
      'International flights to Kathmandu',
      'Personal trekking gear (sleeping bag rating -15°C, poles)',
      'Travel medical and helicopter evacuation insurance'
    ],
    itinerary: [
      { day: 1, title: 'Arrival in Pokhara & Gear Briefing', description: 'Meet the team on the shores of Lake Phewa. Complete permit checks and packing review.', activities: ['Orientation dinner', 'Gear check'] },
      { day: 2, title: 'Nayapul to Tikhedhungga', description: 'Drive to trailhead and initiate the trek through terraced millet fields and suspension bridges.', activities: ['4-hour trek', 'Waterfall viewpoints'] },
      { day: 3, title: 'The Great Ulleri Stairway to Ghorepani', description: 'Ascend stone staircases winding through ancient rhododendron and mossy oak groves.', activities: ['6-hour ascent', 'Mountain vistas'] },
      { day: 4, title: 'Poon Hill Sunrise & Tadapani Ridge', description: 'Dawn scramble up Poon Hill (3,210m) witnessing golden light over Dhaulagiri and Machapuchare.', activities: ['Sunrise panoramic photography', 'Ridge descent'] },
      { day: 5, title: 'Chhomrong: The Gateway to the Sanctuary', description: 'Descend to Chhomrong Khola river and climb to the traditional Gurung cliffside village.', activities: ['Cultural immersion', 'Rest evening'] },
      { day: 6, title: 'Annapurna Basecamp Amphitheater Arrival', description: 'Step into the colossal glacial sanctuary enveloped by Hiunchuli, Annapurna I, and Tent Peak.', activities: ['High-altitude camp celebration', 'Glacier exploration'] }
    ],
    cancellationPolicy: 'Full refund up to 30 days prior to departure; 50% refund between 29 to 14 days.',
    status: 'published',
    createdAt: '2026-08-15T10:00:00Z'
  },
  {
    id: 'trip_sea_02',
    title: 'Norwegian Fjord Kayak & Glacier Trail',
    subtitle: '7-Day Sea Kayaking, Cliff Hikes & Waterfall Exploration',
    category: 'Coastal & Water',
    destination: 'Nærøyfjord & Aurlandsfjord',
    country: 'Norway',
    startDate: '2026-12-05',
    endDate: '2026-12-12',
    durationDays: 7,
    pricePerPerson: 1420,
    currency: 'USD',
    maxSeats: 10,
    bookedSeats: 4,
    difficulty: 'Moderate',
    organizerId: 'usr_org_01',
    organizerName: 'Elena Rostova',
    organizerAvatar: AVATAR_ELENA,
    organizerContact: '+1 (555) 234-8901',
    coverGradient: 'from-emerald-900 via-teal-950 to-slate-900',
    featuredIcon: 'waves',
    description: 'Paddle through UNESCO-protected narrow sea waterways beneath soaring 1,200-meter sheer granite walls and thundering cascades. Camp on secluded fjord beaches and trek up the Prest mountain ridge overlooking Aurland.',
    highlights: [
      'Sea kayaking UNESCO World Heritage Nærøyfjord',
      'Wild camping beneath roaring alpine waterfalls',
      'Hike to the dramatic rim of Mt. Prest',
      'Traditional Nordic sauna and cold plunge experience'
    ],
    included: [
      'High-performance expedition sea kayaks and drysuits',
      'Experienced British Canoeing certified instructors',
      'All wild campsite fees and expedition kitchen meals',
      'Waterproof dry bags and safety equipment'
    ],
    excluded: [
      'Train to Flåm / Bergen',
      'Personal thermal base layers',
      'Alcoholic beverages'
    ],
    itinerary: [
      { day: 1, title: 'Flåm Harbor Launch', description: 'Safety briefing, drysuit fittings, and paddle stroke tuning in the calm harbor.', activities: ['Equipment fit', 'Afternoon launch'] },
      { day: 2, title: 'Nærøyfjord Narrows Passage', description: 'Glide along sheer rock walls where mountain goats graze on mossy precipices.', activities: ['5-hour kayaking', 'Beach camp cookout'] },
      { day: 3, title: 'Undredal Goat Cheese & Fjord Hike', description: 'Land at historic hamlet of Undredal for artisan tasting and scenic valley ascent.', activities: ['Cultural culinary tour', 'Overlook hike'] },
      { day: 4, title: 'Glacier Melt Waterfalls & Sauna Night', description: 'Paddle past cascading melting ice and rest at eco-lodge with wood-fired fjord sauna.', activities: ['Water navigation', 'Sauna recovery'] }
    ],
    cancellationPolicy: 'Free cancellation within 48 hours of booking. 80% refund up to 21 days before trip.',
    status: 'published',
    createdAt: '2026-09-01T14:30:00Z'
  },
  {
    id: 'trip_des_03',
    title: 'Wadi Rum Desert Stargazing & Bivouac Expedition',
    subtitle: '5-Day Bedouin Guided Traverse & Deep Night Astrophotography',
    category: 'Desert & Safari',
    destination: 'Wadi Rum Protected Area',
    country: 'Jordan',
    startDate: '2026-11-28',
    endDate: '2026-12-03',
    durationDays: 5,
    pricePerPerson: 980,
    currency: 'USD',
    maxSeats: 14,
    bookedSeats: 11,
    difficulty: 'Moderate',
    organizerId: 'usr_org_01',
    organizerName: 'Elena Rostova',
    organizerAvatar: AVATAR_ELENA,
    organizerContact: '+1 (555) 234-8901',
    coverGradient: 'from-amber-900 via-orange-950 to-stone-900',
    featuredIcon: 'compass',
    description: 'Walk through red sandstone arches and ancient Thamudic petroglyphs in the Valley of the Moon. Sleep under the darkest Bortle-1 skies in the Middle East with high-powered telescopes and traditional Bedouin zarb dinners.',
    highlights: [
      'Burdah Rock Bridge scramble and summit view',
      'Zero light pollution milky way astrophotography workshop',
      'Camel caravan traverse across ochre dunes',
      'Traditional Bedouin storytelling by campfire'
    ],
    included: [
      '4WD support vehicles and desert transfers',
      'Bedouin luxury glamping tents with private comforts',
      'Astrophotography equipment and star maps',
      'All authentic meals and fresh mint teas'
    ],
    excluded: [
      'Jordan Pass / Visa on arrival',
      'International flights to Amman / Aqaba',
      'Personal camera tripod'
    ],
    itinerary: [
      { day: 1, title: 'Arrival at Seven Pillars of Wisdom', description: 'Meet Bedouin hosts at desert entrance and transfer by open-top 4x4 to central camp.', activities: ['Sunset tea', 'Telescope alignment'] },
      { day: 2, title: 'Lawrence Spring & Khazali Canyon', description: 'Hike through narrow gorges containing 2,000-year-old Nabataean inscriptions.', activities: ['Canyon walk', 'Dune sandboarding'] },
      { day: 3, title: 'Burdah Rock Bridge Scramble', description: 'Adventurous guided ascent to the world-famous natural rock span high above the desert floor.', activities: ['Scramble & climb', 'Panoramic picnic'] }
    ],
    cancellationPolicy: 'Full refund up to 14 days before start date.',
    status: 'published',
    createdAt: '2026-09-12T09:15:00Z'
  },
  {
    id: 'trip_nor_04',
    title: 'Lapland Arctic Wilderness & Aurora Trek',
    subtitle: '6-Day Snowshoeing, Wilderness Cabins & Northern Lights Hunting',
    category: 'Nordic & Winter',
    destination: 'Urho Kekkonen National Park',
    country: 'Finland',
    startDate: '2026-12-18',
    endDate: '2026-12-24',
    durationDays: 6,
    pricePerPerson: 1650,
    currency: 'USD',
    maxSeats: 8,
    bookedSeats: 5,
    difficulty: 'Challenging',
    organizerId: 'usr_org_01',
    organizerName: 'Elena Rostova',
    organizerAvatar: AVATAR_ELENA,
    organizerContact: '+1 (555) 234-8901',
    coverGradient: 'from-blue-950 via-slate-900 to-cyan-950',
    featuredIcon: 'snowflake',
    description: 'Immerse into silent snow-draped taiga forests and rolling fells 250km north of the Arctic Circle. Stay in cozy timber cabins heated by birch fires, search for dancing aurora borealis nightly, and mush with husky dog sleds.',
    highlights: [
      'Nightly aurora hunting in deep wilderness',
      'Husky dog sledding safari through silent pines',
      'Snowshoeing untracked deep powder on Kiilopää fell',
      'Traditional smoke sauna and ice hole swimming'
    ],
    included: [
      'Extreme cold weather Arctic gear (down parka, boots, mittens)',
      'All backcountry cabin stays with firewood & sauna',
      'Professional Arctic wilderness guide & safety gear',
      'Husky team rental and safety instruction'
    ],
    excluded: [
      'Flights to Ivalo (IVL)',
      'Travel insurance covering winter sports'
    ],
    itinerary: [
      { day: 1, title: 'Ivalo Welcome & Gear Outfitting', description: 'Arrive in Lapland, gear fittings in thermo suits, and fire-lit welcome soup.', activities: ['Arctic gear review', 'Night walk'] },
      { day: 2, title: 'Snowshoe Expedition to Rautulampi', description: 'Trek into the heart of the national park, traversing frozen tarns and snow-crusted ridges.', activities: ['Snowshoe trek', 'Cabin wood-chopping'] },
      { day: 3, title: 'Husky Musher Day', description: 'Drive your own two-person dog team through glittering snowy birch valleys.', activities: ['Dog sledding', 'Aurora watch'] }
    ],
    cancellationPolicy: 'Full refund up to 21 days prior to departure.',
    status: 'published',
    createdAt: '2026-09-20T11:45:00Z'
  }
];

const STORAGE_KEY_TRIPS = 'wanderhub_trips_data';

class TripService {
  private trips: Trip[] = [];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_TRIPS);
    if (saved) {
      try {
        const parsed: Trip[] = JSON.parse(saved);
        // Upgrade any legacy Unsplash URLs to resilient SVG data URIs
        this.trips = parsed.map(t => ({
          ...t,
          organizerAvatar: t.organizerAvatar?.includes('unsplash.com') ? AVATAR_ELENA : t.organizerAvatar
        }));
      } catch {
        this.trips = [...SEED_TRIPS];
      }
    } else {
      this.trips = [...SEED_TRIPS];
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY_TRIPS, JSON.stringify(this.trips));
  }

  /**
   * Synchronize trip inventory with the live Python FastAPI backend.
   */
  public syncFromBackend(trips: Trip[]): void {
    if (Array.isArray(trips) && trips.length > 0) {
      this.trips = trips.map(t => ({
        ...t,
        organizerAvatar: (!t.organizerAvatar || t.organizerAvatar.includes('unsplash.com'))
          ? AVATAR_ELENA
          : t.organizerAvatar
      }));
      this.saveToStorage();
    }
  }

  /**
   * Fetch all trips with optional filtering.
   */
  public getTrips(options?: {
    category?: TripCategory | 'All';
    difficulty?: TripDifficulty | 'All';
    search?: string;
    organizerId?: string;
  }): Trip[] {
    let result = [...this.trips];

    if (options?.organizerId) {
      result = result.filter(t => t.organizerId === options.organizerId);
    }

    if (options?.category && options.category !== 'All') {
      result = result.filter(t => t.category === options.category);
    }

    if (options?.difficulty && options.difficulty !== 'All') {
      result = result.filter(t => t.difficulty === options.difficulty);
    }

    if (options?.search && options.search.trim() !== '') {
      const q = options.search.toLowerCase();
      result = result.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.country.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }

    return result;
  }

  /**
   * Get single trip by ID.
   */
  public getTripById(tripId: string): Trip | undefined {
    return this.trips.find(t => t.id === tripId);
  }

  /**
   * Create a new trip (Organizer privilege enforced).
   */
  public createTrip(tripData: Omit<Trip, 'id' | 'createdAt' | 'bookedSeats' | 'organizerId' | 'organizerName' | 'organizerAvatar' | 'organizerContact'>): Trip {
    const currentUser = authService.getCurrentUser();
    authService.assertPermission(currentUser, 'CREATE_TRIP');

    const newTrip: Trip = {
      ...tripData,
      id: `trip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      organizerId: currentUser.id,
      organizerName: currentUser.name,
      organizerAvatar: currentUser.avatar,
      organizerContact: currentUser.phone || currentUser.email,
      bookedSeats: 0,
      createdAt: new Date().toISOString()
    };

    this.trips.unshift(newTrip);
    this.saveToStorage();

    // Sync to live Python FastAPI backend
    fetch('/api/v1/trips', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Id': currentUser.id
      },
      body: JSON.stringify(newTrip)
    }).catch(() => {
      // Fallback handled locally
    });

    eventBus.publish({
      type: 'TRIP_CREATED',
      payload: { trip: newTrip }
    });

    return newTrip;
  }

  /**
   * Update trip details (Organizer privilege enforced).
   */
  public updateTrip(tripId: string, updates: Partial<Trip>): Trip {
    const currentUser = authService.getCurrentUser();
    authService.assertPermission(currentUser, 'EDIT_TRIP');

    const index = this.trips.findIndex(t => t.id === tripId);
    if (index === -1) {
      throw new Error(`Trip with ID ${tripId} not found`);
    }

    // Verify ownership
    if (this.trips[index].organizerId !== currentUser.id) {
      throw new Error('403 Forbidden: You can only edit trips you have organized.');
    }

    this.trips[index] = {
      ...this.trips[index],
      ...updates
    };

    this.saveToStorage();

    eventBus.publish({
      type: 'TRIP_UPDATED',
      payload: { tripId, changes: updates }
    });

    return this.trips[index];
  }

  /**
   * Atomically reserve seats on a trip (Concurrency-safe booking operation).
   */
  public reserveSeats(tripId: string, seats: number): void {
    const trip = this.getTripById(tripId);
    if (!trip) {
      throw new Error(`Trip with ID ${tripId} not found`);
    }

    const available = trip.maxSeats - trip.bookedSeats;
    if (seats > available) {
      throw new Error(`Insufficient seat inventory: Requested ${seats}, but only ${available} seats remain.`);
    }

    trip.bookedSeats += seats;
    this.saveToStorage();
  }

  /**
   * Release reserved seats when a booking is cancelled or expired.
   */
  public releaseSeats(tripId: string, seats: number): void {
    const trip = this.getTripById(tripId);
    if (!trip) return;

    trip.bookedSeats = Math.max(0, trip.bookedSeats - seats);
    this.saveToStorage();
  }

  /**
   * Snapshot and restore trip state for isolated unit testing.
   */
  public getSnapshot(): Trip[] {
    return JSON.parse(JSON.stringify(this.trips));
  }

  public restoreSnapshot(snapshot: Trip[]): void {
    this.trips = JSON.parse(JSON.stringify(snapshot));
    this.saveToStorage();
  }

  /**
   * Reset trips to original seeds for testing.
   */
  public resetToSeeds(): void {
    this.trips = [...SEED_TRIPS];
    this.saveToStorage();
  }
}

export const tripService = new TripService();
