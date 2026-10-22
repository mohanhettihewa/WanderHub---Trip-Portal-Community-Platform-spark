/**
 * WanderHub - Secure Payment Gateway & Booking Checkout Component
 * 
 * Simulates high-concurrency payment authorization, card validation,
 * atomic seat reservation hold, and instant receipt / ticket pass issuance.
 */

import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Lock, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle,
  Ticket,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  QrCode
} from 'lucide-react';
import { Trip, Booking } from '../types';
import { bookingPaymentService } from '../services/bookingPaymentService';
import { authService } from '../services/authService';

interface CheckoutModalProps {
  trip: Trip;
  onClose: () => void;
  onSuccess: (booking: Booking) => void;
  onOpenChat: (trip: Trip) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  trip,
  onClose,
  onSuccess,
  onOpenChat
}) => {
  const currentUser = authService.getCurrentUser();
  const availableSeats = trip.maxSeats - trip.bookedSeats;

  const [seats, setSeats] = useState<number>(1);
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardHolder, setCardHolder] = useState(currentUser.name);
  const [expiryDate, setExpiryDate] = useState('08/28');
  const [cvv, setCvv] = useState('892');
  
  // Emergency contact
  const [emergencyName, setEmergencyName] = useState('Claire Vance');
  const [emergencyPhone, setEmergencyPhone] = useState('+1 (555) 998-1234');
  const [emergencyRelation, setEmergencyRelation] = useState('Spouse / Partner');
  const [specialReqs, setSpecialReqs] = useState('');

  // Processing & State
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Seat hold timer (5 minutes countdown)
  const [timeLeft, setTimeLeft] = useState(300);

  useEffect(() => {
    if (confirmedBooking) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [confirmedBooking]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const booking = await bookingPaymentService.createBooking({
        tripId: trip.id,
        seats,
        payment: {
          cardNumber,
          cardHolder,
          expiryDate,
          cvv,
          billingAddress: {
            street: '124 Expeditions Trail',
            city: 'Denver',
            postalCode: '80202',
            country: 'USA'
          }
        },
        emergencyContact: {
          name: emergencyName,
          phone: emergencyPhone,
          relation: emergencyRelation
        },
        specialRequirements: specialReqs
      });

      setConfirmedBooking(booking);
      onSuccess(booking);
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment authorization failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalAmount = trip.pricePerPerson * seats;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* SUCCESS CONFIRMATION TICKET VIEW */}
        {confirmedBooking ? (
          <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-center">
            
            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 font-mono">
                Booking Reference: {confirmedBooking.bookingCode}
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-display mt-1">
                Expedition Seat Confirmed!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1">
                A transactional email confirmation and digital pass have been dispatched to <strong>{confirmedBooking.participantEmail}</strong>.
              </p>
            </div>

            {/* Boarding Pass Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-6 text-left space-y-4 shadow-lg border border-slate-800 relative overflow-hidden">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">WanderHub Expedition Pass</p>
                  <h3 className="text-base font-bold font-display mt-0.5">{confirmedBooking.tripTitle}</h3>
                  <p className="text-xs text-slate-400">{confirmedBooking.tripDestination}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/30">
                    STATUS: CONFIRMED
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 text-[10px]">Traveler</p>
                  <p className="font-semibold">{confirmedBooking.participantName}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Seats</p>
                  <p className="font-mono tabular-nums font-semibold">{confirmedBooking.seatsBooked} Climber(s)</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Dates</p>
                  <p className="font-mono text-[11px]">{confirmedBooking.tripStartDate}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-[10px]">Total Paid</p>
                  <p className="font-mono font-bold text-emerald-400">${confirmedBooking.totalAmount} USD</p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span className="font-mono text-[11px]">Txn: {confirmedBooking.paymentTransactionId}</span>
                <span className="text-slate-300">Method: {confirmedBooking.paymentMethod}</span>
              </div>
            </div>

            {/* Post-booking Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={() => {
                  onClose();
                  onOpenChat(trip);
                }}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Enter Trip Group Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>

          </div>
        ) : (
          /* CHECKOUT FORM VIEW */
          <>
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  <Lock className="w-3.5 h-3.5" />
                  <span>256-Bit Encrypted Payment Gateway</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold font-display mt-0.5">{trip.title}</h3>
                <p className="text-xs text-slate-400">Led by {trip.organizerName} · {trip.destination}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Concurrency Hold Indicator */}
            <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center justify-between text-xs text-emerald-900">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className="w-3.5 h-3.5 text-emerald-700" />
                Atomic seat hold locked for:
              </span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                {formatTimer(timeLeft)}
              </span>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-xs text-slate-700">
              
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Seat Selection & Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-900 text-xs sm:text-sm">Number of Seats to Reserve</label>
                  <select
                    aria-label="Number of Seats to Reserve"
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value))}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {[...Array(Math.min(availableSeats, 4))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1} Participant{i > 0 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    ${trip.pricePerPerson} × {seats} participant(s) + 0% platform fee
                  </span>
                  <span className="font-mono font-extrabold text-base text-slate-900 tabular-nums">
                    ${totalAmount.toLocaleString()} USD
                  </span>
                </div>
              </div>

              {/* Payment Card Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-600" />
                    Payment Card Details
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Sandbox Test Mode</span>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Card Number *</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                    <CreditCard className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Cardholder Name *</label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">Expiry *</label>
                      <input
                        type="text"
                        required
                        placeholder="MM/YY"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">CVV *</label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        placeholder="•••"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact & Medical Info */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  Expedition Safety & Emergency Contact
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Contact Name *</label>
                    <input
                      type="text"
                      required
                      value={emergencyName}
                      onChange={(e) => setEmergencyName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Relationship *</label>
                    <input
                      type="text"
                      required
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Special Requirements or Dietary Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Vegetarian diet, altitude sensitivity, asthma inhaler..."
                    value={specialReqs}
                    onChange={(e) => setSpecialReqs(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Total Charged</p>
                  <p className="text-lg font-extrabold text-slate-900 font-mono tabular-nums">
                    ${totalAmount.toLocaleString()} USD
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isProcessing || timeLeft === 0}
                    className={`px-6 py-2.5 rounded-xl font-semibold text-white transition-all flex items-center gap-2 shadow-sm ${
                      isProcessing || timeLeft === 0
                        ? 'bg-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 hover:bg-slate-800'
                    }`}
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Authorizing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        <span>Confirm & Pay ${totalAmount.toLocaleString()}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </>
        )}

      </div>
    </div>
  );
};
