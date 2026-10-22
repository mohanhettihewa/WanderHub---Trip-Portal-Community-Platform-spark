/**
 * WanderHub - Domain Models and Type Definitions
 * 
 * Provides strong typing for user roles, permissions, trip data,
 * booking records, payment transactions, group chat, and automated notifications.
 */

export type UserRole = 'Organizer' | 'Participant';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  bio?: string;
  organizationName?: string;
  phone?: string;
  joinedDate: string;
}

export type Permission = 
  | 'CREATE_TRIP'
  | 'EDIT_TRIP'
  | 'DELETE_TRIP'
  | 'VIEW_PARTICIPANT_ROSTER'
  | 'BROADCAST_ANNOUNCEMENT'
  | 'BROWSE_TRIPS'
  | 'BOOK_SEAT'
  | 'CANCEL_OWN_BOOKING'
  | 'SEND_CHAT_MESSAGE'
  | 'VIEW_ANALYTICS';

export interface TripItineraryDay {
  day: number;
  title: string;
  description: string;
  activities: string[];
}

export type TripCategory = 'Trek & Mountain' | 'Coastal & Water' | 'Desert & Safari' | 'Nordic & Winter' | 'Cultural Retreat';
export type TripDifficulty = 'Easy' | 'Moderate' | 'Challenging' | 'Strenuous';

export interface Trip {
  id: string;
  title: string;
  subtitle: string;
  category: TripCategory;
  destination: string;
  country: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  pricePerPerson: number;
  currency: string;
  maxSeats: number;
  bookedSeats: number;
  difficulty: TripDifficulty;
  organizerId: string;
  organizerName: string;
  organizerAvatar: string;
  organizerContact: string;
  coverGradient: string; // Resilient gradient fallback
  featuredIcon: string;
  description: string;
  highlights: string[];
  included: string[];
  excluded: string[];
  itinerary: TripItineraryDay[];
  cancellationPolicy: string;
  status: 'draft' | 'published' | 'completed' | 'cancelled';
  createdAt: string;
}

export type BookingStatus = 'pending_payment' | 'confirmed' | 'cancelled' | 'refunded';

export interface Booking {
  id: string;
  tripId: string;
  tripTitle: string;
  tripDestination: string;
  tripStartDate: string;
  tripEndDate: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  seatsBooked: number;
  pricePerSeat: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  paymentTransactionId: string;
  paymentMethod: string;
  bookingCode: string;
  emergencyContact: {
    name: string;
    phone: string;
    relation: string;
  };
  specialRequirements?: string;
  createdAt: string;
  confirmedAt?: string;
}

export interface PaymentDetails {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  billingAddress: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

export interface ChatMessage {
  id: string;
  tripId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderAvatar: string;
  message: string;
  timestamp: string;
  isAnnouncement?: boolean;
}

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  category: 'booking_confirmation' | 'payment_receipt' | 'trip_announcement' | 'seat_cancelled';
  previewText: string;
  htmlContent: string;
  sentAt: string;
  read: boolean;
  metadata?: {
    tripId?: string;
    bookingId?: string;
    amount?: number;
  };
}

export interface GlobalSearchFilters {
  destination: string;
  startDate?: string;
  endDate?: string;
  organizerName?: string;
}

export interface TestResult {
  id: string;
  suite: string;
  name: string;
  passed: boolean;
  durationMs: number;
  description: string;
  error?: string;
}
