/**
 * WanderHub - Organizer Command Center & Roster Management
 * 
 * Provides trip creation wizard, real-time booking KPIs, attendee roster inspection,
 * and broadcast announcements for authenticated Organizers.
 */

import React, { useState } from 'react';
import { 
  Plus, 
  Users, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Eye, 
  Send,
  ShieldAlert,
  MapPin,
  Clock
} from 'lucide-react';
import { Trip, User, Booking, TripCategory, TripDifficulty } from '../types';
import { tripService } from '../services/tripService';
import { bookingPaymentService } from '../services/bookingPaymentService';
import { chatService } from '../services/chatService';
import { authService } from '../services/authService';

interface OrganizerDashboardProps {
  currentUser: User;
  trips: Trip[];
  onRefreshData: () => void;
  onOpenChat: (trip: Trip) => void;
  onSwitchToOrganizer: () => void;
}

export const OrganizerDashboard: React.FC<OrganizerDashboardProps> = ({
  currentUser,
  trips,
  onRefreshData,
  onOpenChat,
  onSwitchToOrganizer
}) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedRosterTrip, setSelectedRosterTrip] = useState<Trip | null>(null);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [confirmCancelRosterId, setConfirmCancelRosterId] = useState<string | null>(null);

  // New trip form state
  const [newTitle, setNewTitle] = useState('');
  const [newSubtitle, setNewSubtitle] = useState('');
  const [newCategory, setNewCategory] = useState<TripCategory>('Trek & Mountain');
  const [newDestination, setNewDestination] = useState('');
  const [newCountry, setNewCountry] = useState('');
  const [newStartDate, setNewStartDate] = useState('2026-12-01');
  const [newEndDate, setNewEndDate] = useState('2026-12-10');
  const [newPrice, setNewPrice] = useState(1200);
  const [newMaxSeats, setNewMaxSeats] = useState(12);
  const [newDifficulty, setNewDifficulty] = useState<TripDifficulty>('Moderate');
  const [newDescription, setNewDescription] = useState('');
  const [newHighlights, setNewHighlights] = useState('Certified UIAGM guide, Alpine huts included, Scenic summit panoramas');
  const [createError, setCreateError] = useState<string | null>(null);

  // Dynamically compute durationDays from startDate and endDate
  const computedDurationDays = Math.max(
    1,
    Math.ceil((new Date(newEndDate).getTime() - new Date(newStartDate).getTime()) / (1000 * 60 * 60 * 24))
  );

  // RBAC Permission Guard
  const canManage = authService.hasPermission(currentUser, 'CREATE_TRIP');

  if (!canManage) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-4 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-display">Organizer Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You are currently signed in as <strong>{currentUser.name}</strong> with the <strong>Participant</strong> role.
          Trip creation, revenue reports, and participant rosters are guarded by strict Role-Based Access Control.
        </p>
        <button
          onClick={onSwitchToOrganizer}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          Switch to Organizer (Elena Rostova)
        </button>
      </div>
    );
  }

  // Calculate metrics
  const organizerTrips = trips.filter(t => t.organizerId === currentUser.id);
  const totalRevenue = bookingPaymentService.getTotalRevenue(organizerTrips.map(t => t.id));
  const totalSeats = organizerTrips.reduce((acc, t) => acc + t.maxSeats, 0);
  const totalBooked = organizerTrips.reduce((acc, t) => acc + t.bookedSeats, 0);
  const fillRate = totalSeats > 0 ? Math.round((totalBooked / totalSeats) * 100) : 0;

  const handleCreateTripSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (new Date(newEndDate) < new Date(newStartDate)) {
      setCreateError('End Date must be on or after the Start Date.');
      return;
    }

    try {
      const highlightsArray = newHighlights.split(',').map(h => h.trim()).filter(Boolean);

      tripService.createTrip({
        title: newTitle,
        subtitle: newSubtitle || `${computedDurationDays}-Day Expedition`,
        category: newCategory,
        destination: newDestination,
        country: newCountry,
        startDate: newStartDate,
        endDate: newEndDate,
        durationDays: computedDurationDays,
        pricePerPerson: Number(newPrice),
        currency: 'USD',
        maxSeats: Number(newMaxSeats),
        difficulty: newDifficulty,
        coverGradient: 'from-slate-900 via-indigo-950 to-slate-900',
        featuredIcon: 'mountain',
        description: newDescription,
        highlights: highlightsArray,
        included: ['Professional Expedition Guide', 'Permits & Backcountry Fees', 'Shared Expedition Gear'],
        excluded: ['Flights & Personal In-transit Meals', 'Emergency Travel Medical Insurance'],
        itinerary: [
          { day: 1, title: 'Arrival & Welcome Briefing', description: 'Meet the team and complete gear checks.', activities: ['Dinner', 'Gear review'] },
          { day: 2, title: 'Expedition Commencement', description: 'Trek into the wilderness toward the high camp.', activities: ['Trek', 'Campsite set-up'] }
        ],
        cancellationPolicy: 'Full refund up to 30 days prior to departure.',
        status: 'published'
      });

      setIsCreateModalOpen(false);
      onRefreshData();
      // Reset form
      setNewTitle('');
      setNewDescription('');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create trip');
    }
  };

  const handleBroadcastAnnouncement = (tripId: string) => {
    if (!broadcastText.trim()) return;
    setBroadcastError(null);
    try {
      chatService.sendMessage(tripId, broadcastText.trim(), true);
      setBroadcastText('');
      setBroadcastSent(true);
      setTimeout(() => setBroadcastSent(false), 3000);
    } catch (err: any) {
      setBroadcastError(`Error broadcasting message: ${err.message}`);
    }
  };

  const handleOrganizerCancelBooking = (bookingId: string) => {
    try {
      bookingPaymentService.cancelBooking(bookingId, 'Cancelled by Trip Organizer');
      setConfirmCancelRosterId(null);
      onRefreshData();
      if (selectedRosterTrip) {
        const updatedTrip = tripService.getTripById(selectedRosterTrip.id);
        if (updatedTrip) setSelectedRosterTrip({ ...updatedTrip });
      }
    } catch (err: any) {
      setBroadcastError(err.message || 'Failed to cancel participant booking');
    }
  };

  const rosterBookings: Booking[] = selectedRosterTrip 
    ? bookingPaymentService.getTripBookings(selectedRosterTrip.id) 
    : [];

  return (
    <div className="space-y-8 pb-16">
      
      {/* Organizer Header & Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Organizer Command Center</span>
            <span>·</span>
            <span>{currentUser.organizationName || 'Summit Alpine Expeditions'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-0.5">
            Trip Management & Attendee Rosters
          </h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Expedition</span>
        </button>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Total Gross Revenue</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            ${totalRevenue.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Simulated instant escrow</span>
          </p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Active Expeditions</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {organizerTrips.length}
          </p>
          <p className="text-[11px] text-slate-400">Published across portal</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Confirmed Travelers</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {totalBooked}
          </p>
          <p className="text-[11px] text-slate-400">Total registered seats</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <p className="text-xs text-slate-500 font-medium">Average Fill Rate</p>
          <p className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
            {fillRate}%
          </p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${fillRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Organizer Trips Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 font-display">Published Expeditions ({organizerTrips.length})</h3>
          <span className="text-xs text-slate-500 font-mono">Live synchronization</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Expedition Title</th>
                <th className="px-5 py-3.5">Destination</th>
                <th className="px-5 py-3.5">Dates</th>
                <th className="px-5 py-3.5 text-center">Seat Capacity</th>
                <th className="px-5 py-3.5 text-right">Price</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {organizerTrips.map(trip => {
                const remaining = trip.maxSeats - trip.bookedSeats;
                return (
                  <tr key={trip.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-900 text-xs sm:text-sm">{trip.title}</p>
                      <p className="text-[11px] text-slate-500">{trip.category} · {trip.difficulty}</p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-slate-800">{trip.destination}, {trip.country}</span>
                    </td>

                    <td className="px-5 py-4 font-mono text-[11px]">
                      {trip.startDate}
                    </td>

                    <td className="px-5 py-4 text-center">
                      <span className="font-mono tabular-nums font-bold text-slate-900">
                        {trip.bookedSeats} / {trip.maxSeats}
                      </span>
                      <p className="text-[10px] text-slate-400">({remaining} seats free)</p>
                    </td>

                    <td className="px-5 py-4 text-right font-mono tabular-nums font-bold text-slate-900">
                      ${trip.pricePerPerson}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedRosterTrip(trip)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium rounded-lg flex items-center gap-1.5"
                          title="Inspect Participant Roster & Medical Contacts"
                        >
                          <Users className="w-3.5 h-3.5 text-slate-600" />
                          <span>Roster</span>
                        </button>

                        <button
                          onClick={() => onOpenChat(trip)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium rounded-lg flex items-center gap-1.5"
                          title="Open Real-time Trip Group Chat"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Chat</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ATTENDEE ROSTER DRAWER / MODAL */}
      {selectedRosterTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Attendee Roster</span>
                <h3 className="text-lg font-bold font-display mt-0.5">{selectedRosterTrip.title}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {rosterBookings.length} Booked Participants · {selectedRosterTrip.bookedSeats} Total Reserved Seats
                </p>
              </div>
              <button
                onClick={() => setSelectedRosterTrip(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Broadcast Announcement Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-indigo-600" />
                Broadcast Announcement to Group Chat:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g., Mandatory briefing tomorrow at 18:00 UTC on Zoom..."
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  onClick={() => handleBroadcastAnnouncement(selectedRosterTrip.id)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl"
                >
                  Broadcast
                </button>
              </div>
              {broadcastSent && (
                <p className="text-[11px] text-emerald-600 font-medium">✓ Announcement pinned in trip chat!</p>
              )}
              {broadcastError && (
                <p className="text-[11px] text-rose-600 font-medium">{broadcastError}</p>
              )}
            </div>

            {/* Roster List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {rosterBookings.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                  <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-600">No participants registered yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">New bookings appear here in real time with emergency contact info.</p>
                </div>
              ) : (
                rosterBookings.map(b => (
                  <div key={b.id} className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{b.participantName}</h4>
                        <p className="text-xs text-slate-500">{b.participantEmail} · {b.participantPhone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${
                          b.status === 'cancelled'
                            ? 'bg-rose-50 text-rose-600'
                            : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {b.status}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full">
                          {b.bookingCode}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px]">Seats & Amount</span>
                        <p className="font-semibold text-slate-800">{b.seatsBooked} Seat(s) · ${b.totalAmount} USD</p>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px]">Emergency Contact</span>
                        <p className="font-semibold text-slate-800">
                          {b.emergencyContact.name} ({b.emergencyContact.relation})
                        </p>
                        <p className="text-[10px] text-slate-500">{b.emergencyContact.phone}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {b.specialRequirements ? (
                        <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg flex-1 mr-2">
                          <strong>Dietary/Medical Note:</strong> {b.specialRequirements}
                        </p>
                      ) : <span />}

                      {b.status === 'confirmed' && (
                        confirmCancelRosterId === b.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleOrganizerCancelBooking(b.id)}
                              className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-semibold"
                            >
                              Confirm Cancel
                            </button>
                            <button
                              onClick={() => setConfirmCancelRosterId(null)}
                              className="px-2 py-1 text-slate-500 text-[11px]"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmCancelRosterId(b.id)}
                            className="text-[11px] text-rose-600 hover:underline font-medium shrink-0"
                          >
                            Cancel Booking
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedRosterTrip(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CREATE TRIP MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Organizer Studio</span>
                <h3 className="text-xl font-bold font-display mt-0.5">Publish New Expedition</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTripSubmit} className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-4 text-xs text-slate-700">
              
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium">
                  {createError}
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-900 block mb-1">Trip Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patagonia Fitz Roy Glacier & Icefield Traverse"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Destination & Region *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Los Glaciares National Park"
                    value={newDestination}
                    onChange={(e) => setNewDestination(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Country *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Argentina"
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TripCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Trek & Mountain">Trek & Mountain</option>
                    <option value="Coastal & Water">Coastal & Water</option>
                    <option value="Desert & Safari">Desert & Safari</option>
                    <option value="Nordic & Winter">Nordic & Winter</option>
                    <option value="Cultural Retreat">Cultural Retreat</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Difficulty</label>
                  <select
                    value={newDifficulty}
                    onChange={(e) => setNewDifficulty(e.target.value as TripDifficulty)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Challenging">Challenging</option>
                    <option value="Strenuous">Strenuous</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Price Per Person (USD) *</label>
                  <input
                    type="number"
                    min="50"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-900 block mb-1">Max Seat Capacity *</label>
                  <input
                    type="number"
                    min="2"
                    max="50"
                    required
                    value={newMaxSeats}
                    onChange={(e) => setNewMaxSeats(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-900 block mb-1">Description & Overview *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the terrain, daily trekking rhythm, elevation profile, and required fitness."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-900 block mb-1">Highlights (comma separated)</label>
                <input
                  type="text"
                  placeholder="Sunrise view over granite towers, Glacial lake navigation, Mountain refugio dinners"
                  value={newHighlights}
                  onChange={(e) => setNewHighlights(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold shadow-sm"
                >
                  Publish Expedition
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
