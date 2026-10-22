/**
 * WanderHub - Automated Email & Notification Dispatcher Microservice
 * 
 * Generates transactional email payloads, renders HTML confirmation templates,
 * and delivers real-time notifications to users upon critical lifecycle events.
 */

import { EmailNotification, Booking, Trip } from '../types';
import { authService } from './authService';
import { bookingPaymentService } from './bookingPaymentService';
import { eventBus } from './eventBus';

const SEED_NOTIFICATIONS: EmailNotification[] = [
  {
    id: 'notif_seed_01',
    recipientEmail: 'marcus.vance@gmail.com',
    recipientName: 'Marcus Vance',
    subject: 'Booking Confirmed: Himalayan Ridge & Annapurna High Sanctuary',
    category: 'booking_confirmation',
    previewText: 'Your expedition booking WH-HIM-9281 has been confirmed. View itinerary and packing guidelines.',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; letter-spacing: -0.5px;">WanderHub Expeditions</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Official Expedition Booking Confirmation</p>
        </div>
        <div style="padding: 32px 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Dear Marcus,</h2>
          <p>Congratulations! Your seat for <strong>Himalayan Ridge & Annapurna High Sanctuary</strong> is officially secured.</p>
          
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Booking Code:</td>
                <td style="font-weight: 600; text-align: right; font-family: monospace;">WH-HIM-9281</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Expedition Dates:</td>
                <td style="text-align: right;">Nov 10 – Nov 22, 2026</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Destination:</td>
                <td style="text-align: right;">Annapurna Sanctuary, Nepal</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Seats Booked:</td>
                <td style="text-align: right;">1 Participant</td>
              </tr>
              <tr>
                <td style="color: #64748b; padding: 4px 0;">Total Paid:</td>
                <td style="font-weight: 700; color: #059669; text-align: right;">$1,850.00 USD</td>
              </tr>
            </table>
          </div>

          <h3 style="font-size: 15px; margin-top: 24px; color: #0f172a;">Next Steps Before Departure</h3>
          <ul style="padding-left: 20px; font-size: 14px; color: #475569;">
            <li>Join the dedicated <strong>Trip Group Chat</strong> to sync with Lead Guide Elena Rostova and fellow climbers.</li>
            <li>Verify your passport has at least 6 months validity and prepare two passport photos for Kathmandu ACAP permits.</li>
            <li>Review the recommended gear checklist in the expedition portal.</li>
          </ul>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            Emergency Contact on File: Claire Vance (+1 555-998-1234)<br/>
            Expedition Organizer: Elena Rostova (Summit Alpine Expeditions)
          </p>
        </div>
      </div>
    `,
    sentAt: '2026-10-15T08:32:16Z',
    read: true,
    metadata: { tripId: 'trip_him_01', bookingId: 'bkg_him_01', amount: 1850 }
  }
];

const STORAGE_KEY_NOTIFS = 'wanderhub_email_notifications';

class NotificationService {
  private notifications: EmailNotification[] = [];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_NOTIFS);
    if (saved) {
      try {
        this.notifications = JSON.parse(saved);
      } catch {
        this.notifications = [...SEED_NOTIFICATIONS];
      }
    } else {
      this.notifications = [...SEED_NOTIFICATIONS];
      this.saveToStorage();
    }

    // Subscribe to booking confirmations to trigger automated transactional email
    eventBus.subscribe('BOOKING_CONFIRMED', (event) => {
      if (event.type === 'BOOKING_CONFIRMED') {
        const { booking, trip } = event.payload;
        this.sendBookingConfirmationEmail(booking, trip);
        this.sendOrganizerNewBookingEmail(booking, trip);
      }
    });

    // Subscribe to cancellations
    eventBus.subscribe('BOOKING_CANCELLED', (event) => {
      if (event.type === 'BOOKING_CANCELLED') {
        const { bookingId, tripId, reason } = event.payload;
        this.sendCancellationEmail(bookingId, tripId, reason);
      }
    });
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(this.notifications));
  }

  /**
   * Synchronize notifications state with the live Python FastAPI backend.
   */
  public syncFromBackend(notifications: EmailNotification[]): void {
    if (Array.isArray(notifications) && notifications.length > 0) {
      this.notifications = notifications;
      this.saveToStorage();
    }
  }

  /**
   * Dispatch automated HTML booking confirmation to participant.
   */
  public sendBookingConfirmationEmail(booking: Booking, trip: Trip): void {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px;">WanderHub Expeditions</h1>
          <p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Booking & Payment Receipt</p>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <p>Hi <strong>${booking.participantName}</strong>,</p>
          <p>Your booking for <strong>${trip.title}</strong> is confirmed!</p>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Booking Reference:</strong> <span style="font-family: monospace;">${booking.bookingCode}</span></p>
            <p style="margin: 0 0 8px 0;"><strong>Seats Reserved:</strong> ${booking.seatsBooked} participant(s)</p>
            <p style="margin: 0 0 8px 0;"><strong>Total Paid:</strong> $${booking.totalAmount.toLocaleString()} ${booking.currency}</p>
            <p style="margin: 0;"><strong>Payment Method:</strong> ${booking.paymentMethod} (Transaction ID: ${booking.paymentTransactionId})</p>
          </div>
          <p style="color: #64748b; font-size: 13px;">Lead Organizer: ${trip.organizerName} (${trip.organizerContact})</p>
        </div>
      </div>
    `;

    const notification: EmailNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      recipientEmail: booking.participantEmail,
      recipientName: booking.participantName,
      subject: `Booking Confirmed: ${trip.title}`,
      category: 'booking_confirmation',
      previewText: `Your reservation ${booking.bookingCode} for ${trip.title} is confirmed. Total paid: $${booking.totalAmount}.`,
      htmlContent: html,
      sentAt: new Date().toISOString(),
      read: false,
      metadata: { tripId: trip.id, bookingId: booking.id, amount: booking.totalAmount }
    };

    this.notifications.unshift(notification);
    this.saveToStorage();
  }

  /**
   * Dispatch notification to the Organizer when a new participant joins their trip.
   */
  public sendOrganizerNewBookingEmail(booking: Booking, trip: Trip): void {
    const organizerUser = authService.getUserById(trip.organizerId);
    const organizerEmail = organizerUser?.email || 'elena@summitexpeditions.org';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6; color: #1e293b;">
        <div style="background-color: #0f172a; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: #ffffff; margin: 0; font-size: 18px;">WanderHub Organizer Studio</h2>
        </div>
        <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; background: #ffffff;">
          <p>Hello <strong>${trip.organizerName}</strong>,</p>
          <p>Great news! A new participant has booked seats on your trip <strong>${trip.title}</strong>.</p>
          <ul>
            <li><strong>Participant:</strong> ${booking.participantName} (${booking.participantEmail})</li>
            <li><strong>Seats Booked:</strong> ${booking.seatsBooked}</li>
            <li><strong>Remaining Available Seats:</strong> ${trip.maxSeats - trip.bookedSeats}</li>
            <li><strong>Revenue Generated:</strong> +$${booking.totalAmount.toLocaleString()} ${booking.currency}</li>
          </ul>
          <p>You can view their emergency contact and medical notes in your Organizer Dashboard participant roster.</p>
        </div>
      </div>
    `;

    const notification: EmailNotification = {
      id: `notif_org_${Date.now()}`,
      recipientEmail: organizerEmail,
      recipientName: trip.organizerName,
      subject: `New Traveler Joined: ${booking.participantName} booked ${trip.title}`,
      category: 'trip_announcement',
      previewText: `${booking.participantName} reserved ${booking.seatsBooked} seat(s) on ${trip.title}.`,
      htmlContent: html,
      sentAt: new Date().toISOString(),
      read: false,
      metadata: { tripId: trip.id, bookingId: booking.id }
    };

    this.notifications.unshift(notification);
    this.saveToStorage();
  }

  /**
   * Send cancellation notification to the actual booking owner.
   */
  public sendCancellationEmail(bookingId: string, tripId: string, reason: string): void {
    const booking = bookingPaymentService.getBookingById(bookingId);
    const recipientEmail = booking?.participantEmail || authService.getCurrentUser().email;
    const recipientName = booking?.participantName || authService.getCurrentUser().name;
    const bookingCode = booking?.bookingCode || bookingId;

    const notification: EmailNotification = {
      id: `notif_cancel_${Date.now()}`,
      recipientEmail,
      recipientName,
      subject: `Booking Cancelled & Refund Initiated (${bookingCode})`,
      category: 'seat_cancelled',
      previewText: `Your reservation ${bookingCode} has been cancelled. Reason: ${reason}. Refund is processing.`,
      htmlContent: `<p>Hi <strong>${recipientName}</strong>,</p><p>Your booking <strong>${bookingCode}</strong> has been successfully cancelled and ${booking?.seatsBooked || 1} seat(s) have been released back to expedition inventory. Reason: ${reason}</p>`,
      sentAt: new Date().toISOString(),
      read: false,
      metadata: { tripId, bookingId }
    };
    this.notifications.unshift(notification);
    this.saveToStorage();
  }

  /**
   * Get notifications for current user (or filtered).
   */
  public getNotificationsForUser(email: string): EmailNotification[] {
    return this.notifications.filter(n => n.recipientEmail.toLowerCase() === email.toLowerCase());
  }

  /**
   * Mark notification as read.
   */
  public markAsRead(notificationId: string): void {
    const item = this.notifications.find(n => n.id === notificationId);
    if (item) {
      item.read = true;
      this.saveToStorage();
      fetch('/api/v1/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notificationId })
      }).catch(() => {});
    }
  }

  /**
   * Mark all as read.
   */
  public markAllAsRead(email: string): void {
    this.notifications.forEach(n => {
      if (n.recipientEmail.toLowerCase() === email.toLowerCase()) {
        n.read = true;
      }
    });
    this.saveToStorage();
    fetch('/api/v1/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).catch(() => {});
  }

  /**
   * Delete notification.
   */
  public deleteNotification(notificationId: string): void {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveToStorage();
    fetch('/api/v1/notifications/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notificationId })
    }).catch(() => {});
  }
}

export const notificationService = new NotificationService();
