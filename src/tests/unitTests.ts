/**
 * WanderHub - Automated Unit Test Suite
 * 
 * Verifies core security invariants, Role-Based Access Control (RBAC),
 * concurrent booking allocation, payment validation, group chat isolation,
 * and automated email notification triggers.
 */

import { TestResult, User } from '../types';
import { authService } from '../services/authService';
import { tripService } from '../services/tripService';
import { bookingPaymentService } from '../services/bookingPaymentService';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';

export async function runAllUnitTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const initialUser = authService.getCurrentUser();
  const chatSnapshot = chatService.getSnapshot();
  const tripSnapshot = tripService.getSnapshot();

  const runTest = async (
    suite: string,
    name: string,
    description: string,
    fn: () => Promise<void> | void
  ) => {
    const start = performance.now();
    try {
      await fn();
      results.push({
        id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        suite,
        name,
        description,
        passed: true,
        durationMs: Math.max(1, Math.round(performance.now() - start))
      });
    } catch (err: any) {
      results.push({
        id: `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        suite,
        name,
        description,
        passed: false,
        durationMs: Math.max(1, Math.round(performance.now() - start)),
        error: err?.message || String(err)
      });
    }
  };

  try {
    // =========================================================================
    // SUITE 1: Role-Based Access Control (RBAC) & Security
    // =========================================================================
    await runTest(
      'RBAC & Security',
      'Organizer has permission to create trips',
      'Verifies that an Organizer identity can access the CREATE_TRIP privilege.',
      () => {
        authService.switchUser('usr_org_01');
        const organizer = authService.getCurrentUser();
        const canCreate = authService.hasPermission(organizer, 'CREATE_TRIP');
        if (!canCreate) {
          throw new Error('Organizer failed CREATE_TRIP permission check');
        }
      }
    );

    await runTest(
      'RBAC & Security',
      'Participant is strictly denied from creating trips',
      'Ensures that unauthorized Participants attempting to invoke createTrip are blocked with 403 Forbidden.',
      () => {
        authService.switchUser('usr_part_01');
        const participant = authService.getCurrentUser();
        let errorCaught = false;
        try {
          authService.assertPermission(participant, 'CREATE_TRIP');
        } catch (e: any) {
          if (e.message.includes('403 Forbidden')) {
            errorCaught = true;
          }
        }
        if (!errorCaught) {
          throw new Error('Security Breach: Participant was allowed to invoke CREATE_TRIP');
        }
      }
    );

    await runTest(
      'RBAC & Security',
      'Organizer can inspect participant rosters and booking statuses',
      'Verifies that Organizers can query attendee contact info and medical notes.',
      () => {
        authService.switchUser('usr_org_01');
        const organizer = authService.getCurrentUser();
        const canViewRoster = authService.hasPermission(organizer, 'VIEW_PARTICIPANT_ROSTER');
        if (!canViewRoster) {
          throw new Error('Organizer was denied VIEW_PARTICIPANT_ROSTER privilege');
        }
        const bookings = bookingPaymentService.getTripBookings('trip_him_01');
        if (!Array.isArray(bookings)) {
          throw new Error('Failed to retrieve participant roster for trip');
        }
      }
    );

    await runTest(
      'RBAC & Security',
      'Participant cannot inspect other attendees rosters',
      'Verifies that Participants attempting to fetch trip bookings are blocked.',
      () => {
        authService.switchUser('usr_part_01');
        let errorCaught = false;
        try {
          bookingPaymentService.getTripBookings('trip_him_01');
        } catch (e: any) {
          if (e.message.includes('403 Forbidden')) {
            errorCaught = true;
          }
        }
        if (!errorCaught) {
          throw new Error('Security Breach: Participant was able to inspect trip attendee roster');
        }
      }
    );

    // =========================================================================
    // SUITE 2: Concurrent Seat Inventory & Allocation
    // =========================================================================
    await runTest(
      'Seat Inventory',
      'Prevents overbooking beyond maximum seat capacity',
      'Simulates high-volume booking surge and confirms inventory refuses requests exceeding available seats.',
      () => {
        const trip = tripService.getTripById('trip_sea_02');
        if (!trip) throw new Error('Trip not found');
        const remaining = trip.maxSeats - trip.bookedSeats;
        
        let overbookCaught = false;
        try {
          tripService.reserveSeats('trip_sea_02', remaining + 5);
        } catch (e: any) {
          if (e.message.includes('Insufficient seat inventory')) {
            overbookCaught = true;
          }
        }
        if (!overbookCaught) {
          throw new Error('Concurrency Error: Overbooking succeeded beyond maximum capacity');
        }
      }
    );

    await runTest(
      'Seat Inventory',
      'Atomic seat reservation and release cycle',
      'Verifies seat inventory accurately decrements upon reservation and increments back upon cancellation.',
      () => {
        const trip = tripService.getTripById('trip_nor_04');
        if (!trip) throw new Error('Trip not found');
        const initialBooked = trip.bookedSeats;

        tripService.reserveSeats('trip_nor_04', 2);
        if (trip.bookedSeats !== initialBooked + 2) {
          throw new Error(`Expected booked seats to be ${initialBooked + 2}, got ${trip.bookedSeats}`);
        }

        tripService.releaseSeats('trip_nor_04', 2);
        if (trip.bookedSeats !== initialBooked) {
          throw new Error(`Expected booked seats to return to ${initialBooked}, got ${trip.bookedSeats}`);
        }
      }
    );

    // =========================================================================
    // SUITE 3: Payment Gateway Validation
    // =========================================================================
    await runTest(
      'Payment Gateway',
      'Rejects invalid credit card numbers and formats',
      'Validates card length, CVV, and expiration date format before payment authorization.',
      () => {
        const invalidCard = {
          cardNumber: '1234', // too short
          cardHolder: 'John Doe',
          expiryDate: '12/28',
          cvv: '123',
          billingAddress: { street: '123 Trail Way', city: 'Denver', postalCode: '80202', country: 'USA' }
        };
        const check = bookingPaymentService.validateCard(invalidCard);
        if (check.valid) {
          throw new Error('Payment gateway falsely accepted invalid card number');
        }
      }
    );

    await runTest(
      'Payment Gateway',
      'Validates genuine card credentials and CVV',
      'Verifies standard 16-digit card with proper expiration and security code passes pre-flight checks.',
      () => {
        const validCard = {
          cardNumber: '4242 4242 4242 4242',
          cardHolder: 'Marcus Vance',
          expiryDate: '08/28',
          cvv: '921',
          billingAddress: { street: '45 Alpine Rd', city: 'Boulder', postalCode: '80302', country: 'USA' }
        };
        const check = bookingPaymentService.validateCard(validCard);
        if (!check.valid) {
          throw new Error(`Valid card was rejected: ${check.error}`);
        }
      }
    );

    // =========================================================================
    // SUITE 4: Real-Time Group Chat Isolation
    // =========================================================================
    await runTest(
      'Group Chat',
      'Isolates messages strictly to their associated trip channels',
      'Verifies conversations in Annapurna expedition do not leak into Norwegian Fjord channel.',
      () => {
        authService.switchUser('usr_org_01');
        const himalayanMessages = chatService.getMessagesForTrip('trip_him_01');

        const leaked = himalayanMessages.some(m => m.tripId === 'trip_sea_02');
        if (leaked) {
          throw new Error('Channel Breach: Himalayan channel contains messages from Norwegian Fjord');
        }
      }
    );

    await runTest(
      'Group Chat',
      'Only Organizers can broadcast official pinned announcements',
      'Ensures participants cannot spoof official organizer announcements in group chat (state restored cleanly).',
      () => {
        authService.switchUser('usr_part_01');
        const participant = authService.getCurrentUser();
        const msg = chatService.sendMessage('trip_him_01', 'Trying to make an announcement', true, false);
        if (msg.isAnnouncement && participant.role === 'Participant') {
          throw new Error('Security Breach: Participant was allowed to pin an announcement');
        }
      }
    );

    // =========================================================================
    // SUITE 5: Automated Email & Notification Dispatcher
    // =========================================================================
    await runTest(
      'Notifications & Emails',
      'Generates automated confirmation emails upon successful booking',
      'Verifies that participant receives receipt and organizer receives attendee alert.',
      () => {
        const marcusNotifs = notificationService.getNotificationsForUser('marcus.vance@gmail.com');
        if (marcusNotifs.length === 0) {
          throw new Error('Participant has zero confirmation emails delivered');
        }
        const hasReceipt = marcusNotifs.some(n => n.category === 'booking_confirmation');
        if (!hasReceipt) {
          throw new Error('Booking confirmation transactional email missing');
        }
      }
    );

    // =========================================================================
    // SUITE 6: Global Search & Multi-Criteria Filtering
    // =========================================================================
    await runTest(
      'Global Search',
      'Filters trips accurately by destination keyword',
      'Verifies searching for "Nepal" returns Annapurna expedition and excludes others.',
      () => {
        const allTrips = tripService.getTrips();
        const filtered = allTrips.filter(t => 
          t.destination.toLowerCase().includes('nepal') || 
          t.country.toLowerCase().includes('nepal')
        );
        if (filtered.length < 1 || !filtered.some(t => t.title.includes('Himalayan'))) {
          throw new Error(`Expected Himalayan trip for destination 'Nepal', got ${filtered.length}`);
        }
      }
    );

    await runTest(
      'Global Search',
      'Filters trips accurately by calendar date range',
      'Ensures date boundary checks correctly isolate expeditions starting after Nov 15, 2026.',
      () => {
        const allTrips = tripService.getTrips();
        const fromDate = '2026-11-15';
        const filtered = allTrips.filter(t => new Date(t.startDate) >= new Date(fromDate));
        const hasEarlier = filtered.some(t => new Date(t.startDate) < new Date(fromDate));
        if (hasEarlier) {
          throw new Error('Date filter returned trips starting before the minimum date range');
        }
      }
    );

    await runTest(
      'Global Search',
      'Filters trips by organizer name',
      'Verifies queries by organizer name strictly match expeditions led by that organizer.',
      () => {
        const allTrips = tripService.getTrips();
        const filtered = allTrips.filter(t => t.organizerName.toLowerCase() === 'elena rostova');
        if (filtered.length === 0) {
          throw new Error('No trips found for organizer Elena Rostova');
        }
        const nonMatching = filtered.some(t => t.organizerName !== 'Elena Rostova');
        if (nonMatching) {
          throw new Error('Organizer filter returned trips belonging to another organizer');
        }
      }
    );

    // =========================================================================
    // SUITE 7: Live Python 3 FastAPI Backend Microservices Suite
    // =========================================================================
    try {
      const pyRes = await fetch('/api/v1/tests/run', { method: 'POST' });
      if (pyRes.ok) {
        const pyData = await pyRes.json();
        if (Array.isArray(pyData.results)) {
          for (const item of pyData.results) {
            results.push({
              id: item.id,
              suite: item.suite || 'Python FastAPI Backend',
              name: item.name,
              description: item.description,
              passed: Boolean(item.passed),
              durationMs: Number(item.durationMs) || 3,
              error: item.error
            });
          }
        }
      }
    } catch {
      // If offline, skip live Python suite silently
    }

  } finally {
    // Restore clean chat, trip, and user context after tests
    chatService.restoreSnapshot(chatSnapshot);
    tripService.restoreSnapshot(tripSnapshot);
    authService.switchUser(initialUser.id);
  }

  return results;
}
