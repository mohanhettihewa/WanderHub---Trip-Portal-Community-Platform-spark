/**
 * WanderHub - Traveler Bookings & Expedition Passes View
 * 
 * Enables participants to view confirmed bookings, review payment receipts,
 * download boarding pass QR codes, enter trip group chat, or cancel reservations.
 */

import React, { useState } from 'react';
import { 
  Ticket, 
  Calendar, 
  MapPin, 
  Clock, 
  MessageSquare, 
  CreditCard, 
  AlertCircle,
  XCircle,
  CheckCircle2,
  Download,
  Share2,
  Compass
} from 'lucide-react';
import { Booking, Trip, User } from '../types';
import { bookingPaymentService } from '../services/bookingPaymentService';
import { tripService } from '../services/tripService';

interface MyBookingsViewProps {
  currentUser: User;
  trips: Trip[];
  onOpenChat: (trip: Trip) => void;
  onExplore: () => void;
  onRefresh: () => void;
}

export const MyBookingsView: React.FC<MyBookingsViewProps> = ({
  currentUser,
  trips,
  onOpenChat,
  onExplore,
  onRefresh
}) => {
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [selectedPass, setSelectedPass] = useState<Booking | null>(null);

  const bookings = bookingPaymentService.getUserBookings(currentUser.id);

  const handleCancelBooking = (bookingId: string) => {
    if (window.confirm('Are you sure you want to cancel this booking? Held seats will be released immediately.')) {
      try {
        bookingPaymentService.cancelBooking(bookingId, 'Traveler voluntary cancellation');
        setCancellingBookingId(null);
        onRefresh();
      } catch (err: any) {
        alert(err.message || 'Failed to cancel booking');
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Expedition Vouchers</span>
            <span>·</span>
            <span>{currentUser.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-0.5">
            My Bookings & Digital Passes ({bookings.length})
          </h1>
        </div>

        <button
          onClick={onExplore}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
        >
          <Compass className="w-4 h-4 text-emerald-400" />
          <span>Explore More Trips</span>
        </button>
      </div>

      {/* Bookings List */}
      {bookings.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Ticket className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">No Confirmed Bookings Yet</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Browse our small-group mountain expeditions, coastal kayaking adventures, or desert safaris and book your seat with real-time seat guarantees.
          </p>
          <button
            onClick={onExplore}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Browse Available Expeditions
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => {
            const trip = trips.find(t => t.id === booking.tripId);
            const isCancelled = booking.status === 'cancelled';

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-2xl border transition-all p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
                  isCancelled ? 'border-slate-200 opacity-60 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Info block */}
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      {booking.bookingCode}
                    </span>
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                      isCancelled ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      • {booking.status}
                    </span>
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                    {booking.tripTitle}
                  </h3>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {booking.tripDestination}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {booking.tripStartDate} to {booking.tripEndDate}
                    </span>
                    <span className="font-mono tabular-nums">
                      {booking.seatsBooked} Seat(s) reserved
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 font-mono">
                    Total Paid: <strong className="text-slate-900">${booking.totalAmount} USD</strong> via {booking.paymentMethod} (Txn: {booking.paymentTransactionId})
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                  {!isCancelled && trip && (
                    <button
                      onClick={() => onOpenChat(trip)}
                      className="flex-1 md:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Group Chat</span>
                    </button>
                  )}

                  {!isCancelled && (
                    <button
                      onClick={() => setSelectedPass(booking)}
                      className="flex-1 md:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Ticket className="w-3.5 h-3.5 text-emerald-400" />
                      <span>View Pass</span>
                    </button>
                  )}

                  {!isCancelled && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-medium transition-colors"
                      title="Cancel reservation & release seat"
                    >
                      Cancel
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* PASS MODAL */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-6 text-center animate-in zoom-in-95 duration-150">
            <div className="border-b border-slate-800 pb-4 text-left">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Digital Boarding Pass</span>
              <h3 className="text-lg font-bold font-display mt-0.5">{selectedPass.tripTitle}</h3>
              <p className="text-xs text-slate-400">{selectedPass.tripDestination}</p>
            </div>

            {/* Simulated QR Code */}
            <div className="w-40 h-40 bg-white p-3 rounded-2xl mx-auto shadow-inner flex flex-col items-center justify-center">
              <div className="w-full h-full border-2 border-slate-900 rounded-lg p-1.5 flex flex-col justify-between">
                <div className="flex justify-between">
                  <div className="w-8 h-8 bg-slate-900"></div>
                  <div className="w-8 h-8 bg-slate-900"></div>
                </div>
                <div className="font-mono text-[9px] text-slate-900 font-bold tracking-widest text-center">
                  {selectedPass.bookingCode}
                </div>
                <div className="flex justify-between">
                  <div className="w-8 h-8 bg-slate-900"></div>
                  <div className="w-4 h-4 bg-slate-900"></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left text-xs bg-slate-800/60 p-3 rounded-xl border border-slate-700">
              <div>
                <p className="text-slate-400 text-[10px]">Passenger</p>
                <p className="font-semibold">{selectedPass.participantName}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Seats</p>
                <p className="font-mono tabular-nums font-semibold">{selectedPass.seatsBooked} Climber(s)</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Dates</p>
                <p className="font-mono text-[11px]">{selectedPass.tripStartDate}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Payment</p>
                <p className="font-mono font-bold text-emerald-400">${selectedPass.totalAmount} USD</p>
              </div>
            </div>

            <button
              onClick={() => setSelectedPass(null)}
              className="w-full py-2.5 bg-white text-slate-900 font-semibold rounded-xl text-xs hover:bg-slate-100 transition-colors"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
