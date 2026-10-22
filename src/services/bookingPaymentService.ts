/**
 * WanderHub - Booking & Payment Gateway Microservice
 * 
 * Handles high-concurrency booking reservations, payment authorization simulation,
 * atomic seat allocation, receipt generation, and booking lifecycle management.
 */

import { Booking, PaymentDetails } from '../types';
import { authService } from './authService';
import { tripService } from './tripService';
import { eventBus } from './eventBus';

const SEED_BOOKINGS: Booking[] = [
  {
    id: 'bkg_him_01',
    tripId: 'trip_him_01',
    tripTitle: 'Himalayan Ridge & Annapurna High Sanctuary',
    tripDestination: 'Annapurna Conservation Area, Nepal',
    tripStartDate: '2026-11-10',
    tripEndDate: '2026-11-22',
    participantId: 'usr_part_01',
    participantName: 'Marcus Vance',
    participantEmail: 'marcus.vance@gmail.com',
    participantPhone: '+1 (555) 876-5432',
    seatsBooked: 1,
    pricePerSeat: 1850,
    totalAmount: 1850,
    currency: 'USD',
    status: 'confirmed',
    paymentTransactionId: 'txn_stripe_sim_89214710',
    paymentMethod: 'Visa •••• 4242',
    bookingCode: 'WH-HIM-9281',
    emergencyContact: {
      name: 'Claire Vance',
      phone: '+1 (555) 998-1234',
      relation: 'Spouse'
    },
    specialRequirements: 'Vegetarian meals preferred during teahouse lodges.',
    createdAt: '2026-10-15T08:30:00Z',
    confirmedAt: '2026-10-15T08:32:15Z'
  },
  {
    id: 'bkg_him_02',
    tripId: 'trip_him_01',
    tripTitle: 'Himalayan Ridge & Annapurna High Sanctuary',
    tripDestination: 'Annapurna Conservation Area, Nepal',
    tripStartDate: '2026-11-10',
    tripEndDate: '2026-11-22',
    participantId: 'usr_part_02',
    participantName: 'Sarah Chen',
    participantEmail: 'sarah.chen@techadventures.io',
    participantPhone: '+1 (555) 432-1098',
    seatsBooked: 2,
    pricePerSeat: 1850,
    totalAmount: 3700,
    currency: 'USD',
    status: 'confirmed',
    paymentTransactionId: 'txn_stripe_sim_38194022',
    paymentMethod: 'Mastercard •••• 5555',
    bookingCode: 'WH-HIM-4412',
    emergencyContact: {
      name: 'David Chen',
      phone: '+1 (555) 234-9988',
      relation: 'Brother'
    },
    createdAt: '2026-10-18T14:10:00Z',
    confirmedAt: '2026-10-18T14:12:05Z'
  }
];

const STORAGE_KEY_BOOKINGS = 'wanderhub_bookings_data';

class BookingPaymentService {
  private bookings: Booking[] = [];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (saved) {
      try {
        this.bookings = JSON.parse(saved);
      } catch {
        this.bookings = SEED_BOOKINGS;
      }
    } else {
      this.bookings = SEED_BOOKINGS;
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(this.bookings));
  }

  /**
   * Validates credit card credentials against payment gateway specifications.
   */
  public validateCard(payment: PaymentDetails): { valid: boolean; error?: string } {
    const cleanNumber = payment.cardNumber.replace(/\s+/g, '');
    if (!/^\d{15,19}$/.test(cleanNumber)) {
      return { valid: false, error: 'Invalid card number. Please provide a 15 to 19 digit credit card.' };
    }
    if (!payment.cardHolder || payment.cardHolder.trim().length < 3) {
      return { valid: false, error: 'Cardholder name is required.' };
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(payment.expiryDate)) {
      return { valid: false, error: 'Expiry date must be in MM/YY format.' };
    }
    if (!/^\d{3,4}$/.test(payment.cvv)) {
      return { valid: false, error: 'CVV security code must be 3 or 4 digits.' };
    }
    return { valid: true };
  }

  /**
   * Process booking checkout with atomic seat reservation and simulated payment capture.
   */
  public async createBooking(request: {
    tripId: string;
    seats: number;
    payment: PaymentDetails;
    emergencyContact: { name: string; phone: string; relation: string };
    specialRequirements?: string;
  }): Promise<Booking> {
    const currentUser = authService.getCurrentUser();
    authService.assertPermission(currentUser, 'BOOK_SEAT');

    const trip = tripService.getTripById(request.tripId);
    if (!trip) {
      throw new Error(`Trip ${request.tripId} not found`);
    }

    if (request.seats <= 0) {
      throw new Error('Number of seats must be at least 1');
    }

    // 1. Validate payment card details
    const cardCheck = this.validateCard(request.payment);
    if (!cardCheck.valid) {
      throw new Error(`Payment Rejected: ${cardCheck.error}`);
    }

    // 2. Concurrency-safe seat reservation
    tripService.reserveSeats(trip.id, request.seats);

    // 3. Simulate payment gateway capture delay (300ms)
    await new Promise(resolve => setTimeout(resolve, 300));

    const totalAmount = trip.pricePerPerson * request.seats;
    const last4 = request.payment.cardNumber.replace(/\s+/g, '').slice(-4) || '4242';
    const txnId = `txn_gw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const bookingCode = `WH-${trip.category.substring(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newBooking: Booking = {
      id: `bkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId: trip.id,
      tripTitle: trip.title,
      tripDestination: `${trip.destination}, ${trip.country}`,
      tripStartDate: trip.startDate,
      tripEndDate: trip.endDate,
      participantId: currentUser.id,
      participantName: currentUser.name,
      participantEmail: currentUser.email,
      participantPhone: currentUser.phone || '+1 (555) 000-0000',
      seatsBooked: request.seats,
      pricePerSeat: trip.pricePerPerson,
      totalAmount,
      currency: trip.currency,
      status: 'confirmed',
      paymentTransactionId: txnId,
      paymentMethod: `Card •••• ${last4}`,
      bookingCode,
      emergencyContact: request.emergencyContact,
      specialRequirements: request.specialRequirements,
      createdAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString()
    };

    this.bookings.unshift(newBooking);
    this.saveToStorage();

    // 4. Emit events for Notification and Chat microservices
    await eventBus.publish({
      type: 'PAYMENT_PROCESSED',
      payload: { transactionId: txnId, amount: totalAmount, currency: trip.currency }
    });

    await eventBus.publish({
      type: 'BOOKING_CONFIRMED',
      payload: { booking: newBooking, trip }
    });

    return newBooking;
  }

  /**
   * Cancel an existing booking and release held seats.
   */
  public cancelBooking(bookingId: string, reason: string = 'User requested cancellation'): Booking {
    const currentUser = authService.getCurrentUser();
    const booking = this.bookings.find(b => b.id === bookingId);

    if (!booking) {
      throw new Error(`Booking ${bookingId} not found`);
    }

    // RBAC: Organizer of the trip can cancel, or Participant who owns the booking
    const isOwner = booking.participantId === currentUser.id;
    const isTripOrganizer = currentUser.role === 'Organizer';

    if (!isOwner && !isTripOrganizer) {
      throw new Error('403 Forbidden: You do not have permission to cancel this booking.');
    }

    if (booking.status === 'cancelled') {
      throw new Error('This booking is already cancelled.');
    }

    booking.status = 'cancelled';
    this.saveToStorage();

    // Release seats in Trip inventory
    tripService.releaseSeats(booking.tripId, booking.seatsBooked);

    eventBus.publish({
      type: 'BOOKING_CANCELLED',
      payload: { bookingId, tripId: booking.tripId, seats: booking.seatsBooked, reason }
    });

    return booking;
  }

  /**
   * Fetch bookings belonging to a specific user (Participant view).
   */
  public getUserBookings(userId: string): Booking[] {
    return this.bookings.filter(b => b.participantId === userId);
  }

  /**
   * Fetch all bookings for a given trip (Organizer view - RBAC protected).
   */
  public getTripBookings(tripId: string): Booking[] {
    const currentUser = authService.getCurrentUser();
    authService.assertPermission(currentUser, 'VIEW_PARTICIPANT_ROSTER');

    return this.bookings.filter(b => b.tripId === tripId);
  }

  /**
   * Check if current user is booked on a trip.
   */
  public isUserBookedOnTrip(userId: string, tripId: string): boolean {
    return this.bookings.some(b => b.participantId === userId && b.tripId === tripId && b.status === 'confirmed');
  }

  /**
   * Get total revenue across confirmed bookings.
   */
  public getTotalRevenue(organizerTripIds: string[]): number {
    return this.bookings
      .filter(b => organizerTripIds.includes(b.tripId) && b.status === 'confirmed')
      .reduce((sum, b) => sum + b.totalAmount, 0);
  }

  /**
   * Reset bookings for clean state testing.
   */
  public resetToSeeds(): void {
    this.bookings = SEED_BOOKINGS;
    this.saveToStorage();
  }
}

export const bookingPaymentService = new BookingPaymentService();
