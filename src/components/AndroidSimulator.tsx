/**
 * WanderHub - Interactive Android Mobile App Simulator
 * 
 * Renders the native Android mobile app experience inside an authentic
 * smartphone chassis with status bar, bottom navigation bar, and gesture pill.
 */

import React, { useState } from 'react';
import { 
  Compass, 
  Ticket, 
  MessageSquare, 
  Bell, 
  User as UserIcon, 
  Wifi, 
  Battery, 
  Signal, 
  ArrowLeft,
  X,
  Share2,
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Trip, User, Booking, EmailNotification } from '../types';
import { tripService } from '../services/tripService';
import { bookingPaymentService } from '../services/bookingPaymentService';
import { chatService } from '../services/chatService';
import { notificationService } from '../services/notificationService';

interface AndroidSimulatorProps {
  currentUser: User;
  trips: Trip[];
  onSelectTrip: (trip: Trip) => void;
  onBookTrip: (trip: Trip) => void;
  onOpenChat: (trip: Trip) => void;
  onClose: () => void;
}

export const AndroidSimulator: React.FC<AndroidSimulatorProps> = ({
  currentUser,
  trips,
  onSelectTrip,
  onBookTrip,
  onOpenChat,
  onClose
}) => {
  const [activeBottomTab, setActiveBottomTab] = useState<'explore' | 'bookings' | 'chat' | 'inbox' | 'profile'>('explore');
  const [selectedMobileTrip, setSelectedMobileTrip] = useState<Trip | null>(null);
  const [mobileSearch, setMobileSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const userBookings = bookingPaymentService.getUserBookings(currentUser.id);
  const notifications = notificationService.getNotificationsForUser(currentUser.email);
  const unreadNotifs = notifications.filter(n => !n.read).length;

  const filteredTrips = trips.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    const matchesSearch = t.title.toLowerCase().includes(mobileSearch.toLowerCase()) || 
                          t.destination.toLowerCase().includes(mobileSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
      
      {/* Container with dismissal bar */}
      <div className="relative flex flex-col items-center">
        
        {/* Top Control Bar for Simulator */}
        <div className="w-full max-w-[400px] mb-3 flex items-center justify-between text-white/90 px-2">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Android 15 · Google Pixel Frame
          </div>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Exit Android Preview
          </button>
        </div>

        {/* Android Phone Chassis */}
        <div className="w-[380px] h-[780px] bg-slate-900 rounded-[48px] p-3 shadow-2xl border-4 border-slate-700/80 ring-1 ring-white/10 flex flex-col relative select-none">
          
          {/* Inner Screen Bezel */}
          <div className="w-full h-full bg-slate-50 rounded-[38px] overflow-hidden flex flex-col relative">
            
            {/* Android Status Bar */}
            <div className="h-9 px-6 bg-white flex items-center justify-between text-slate-800 text-xs font-medium shrink-0 border-b border-slate-100">
              <span className="font-semibold tracking-tight">9:41</span>
              {/* Front Camera Punch-hole */}
              <div className="w-4 h-4 bg-slate-950 rounded-full mx-auto -mt-1 shadow-inner"></div>
              <div className="flex items-center gap-2">
                <Signal className="w-3.5 h-3.5" />
                <Wifi className="w-3.5 h-3.5" />
                <Battery className="w-4 h-4" />
              </div>
            </div>

            {/* Mobile App Viewport Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50 relative flex flex-col">
              
              {/* VIEW 1: EXPLORE / DISCOVER */}
              {activeBottomTab === 'explore' && !selectedMobileTrip && (
                <div className="p-4 space-y-4">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Explore Trips</p>
                      <h2 className="text-lg font-bold text-slate-900 font-display">Where next, {currentUser.name.split(' ')[0]}?</h2>
                    </div>
                    <img 
                      src={currentUser.avatar} 
                      alt="" 
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-300"
                    />
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search peaks, fjords, safaris..."
                      value={mobileSearch}
                      onChange={(e) => setMobileSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <Compass className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>

                  {/* Horizontal Category Scroll */}
                  <div className="flex gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {['All', 'Trek & Mountain', 'Coastal & Water', 'Desert & Safari', 'Nordic & Winter'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full whitespace-nowrap text-[11px] font-medium transition-colors ${
                          selectedCategory === cat 
                            ? 'bg-slate-900 text-white' 
                            : 'bg-white text-slate-600 border border-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Trip Cards Feed */}
                  <div className="space-y-3.5 pb-6">
                    {filteredTrips.map(trip => {
                      const remaining = trip.maxSeats - trip.bookedSeats;
                      return (
                        <div
                          key={trip.id}
                          onClick={() => setSelectedMobileTrip(trip)}
                          className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                          {/* Card Banner */}
                          <div className={`h-32 bg-gradient-to-r ${trip.coverGradient} p-3 flex flex-col justify-between text-white relative`}>
                            <div className="flex justify-between items-center text-[11px]">
                              <span className="font-semibold bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded">
                                {trip.category}
                              </span>
                              <span className="bg-emerald-500/90 font-medium px-2 py-0.5 rounded text-[10px]">
                                {remaining} seats left
                              </span>
                            </div>
                            <div>
                              <p className="text-[10px] text-white/80 font-medium">{trip.country}</p>
                              <h3 className="text-sm font-bold leading-tight font-display drop-shadow-sm">{trip.title}</h3>
                            </div>
                          </div>

                          {/* Card Footer Details */}
                          <div className="p-3 flex items-center justify-between text-xs border-t border-slate-100">
                            <div className="text-slate-500 text-[11px]">
                              <span>{trip.durationDays} Days</span>
                              <span className="mx-1">·</span>
                              <span>{trip.difficulty}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-xs text-slate-400">from </span>
                              <span className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                                ${trip.pricePerPerson}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 1.1: MOBILE TRIP DETAIL */}
              {selectedMobileTrip && (
                <div className="flex-1 flex flex-col bg-white">
                  {/* Top detail bar */}
                  <div className="h-12 px-3 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-10">
                    <button 
                      onClick={() => setSelectedMobileTrip(null)}
                      className="p-1 rounded-full hover:bg-slate-100 text-slate-700"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-xs font-semibold text-slate-800 truncate max-w-[200px]">
                      {selectedMobileTrip.title}
                    </span>
                    <Share2 className="w-4 h-4 text-slate-500" />
                  </div>

                  {/* Scrollable details */}
                  <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-20">
                    <div className={`h-40 rounded-2xl bg-gradient-to-br ${selectedMobileTrip.coverGradient} p-4 text-white flex flex-col justify-end`}>
                      <span className="text-xs text-emerald-300 font-medium">{selectedMobileTrip.destination}, {selectedMobileTrip.country}</span>
                      <h2 className="text-base font-bold font-display leading-tight">{selectedMobileTrip.title}</h2>
                    </div>

                    {/* Metadata line */}
                    <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100 text-slate-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedMobileTrip.durationDays} Days</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedMobileTrip.country}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Nov 2026</span>
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1.5">Overview</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{selectedMobileTrip.description}</p>
                    </div>

                    {/* Highlights */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">Expedition Highlights</h4>
                      <div className="space-y-1.5">
                        {selectedMobileTrip.highlights.map((h, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Organizer Card */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={selectedMobileTrip.organizerAvatar} 
                          alt="" 
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">{selectedMobileTrip.organizerName}</p>
                          <p className="text-[10px] text-slate-500">Lead Expedition Guide</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          onOpenChat(selectedMobileTrip);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-800 rounded-lg border border-slate-300 hover:bg-slate-100"
                      >
                        Ask Guide
                      </button>
                    </div>
                  </div>

                  {/* Sticky Mobile Book CTA */}
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] text-slate-400">Total Per Seat</p>
                      <p className="text-base font-bold text-slate-900 font-mono tabular-nums">
                        ${selectedMobileTrip.pricePerPerson} <span className="text-xs font-normal text-slate-500">{selectedMobileTrip.currency}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onBookTrip(selectedMobileTrip);
                        onClose();
                      }}
                      className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
                    >
                      Book Your Seat
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW 2: MY BOOKINGS */}
              {activeBottomTab === 'bookings' && (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Tickets & Passes</p>
                    <h2 className="text-lg font-bold text-slate-900 font-display">My Bookings ({userBookings.length})</h2>
                  </div>

                  {userBookings.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 mt-6">
                      <Ticket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-medium text-slate-600">No active bookings yet.</p>
                      <p className="text-[11px] text-slate-400 mt-1">Explore trips and reserve your seat to receive your boarding pass.</p>
                      <button
                        onClick={() => setActiveBottomTab('explore')}
                        className="mt-4 px-4 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg"
                      >
                        Browse Trips
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 pb-8">
                      {userBookings.map(b => (
                        <div key={b.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
                                {b.bookingCode}
                              </span>
                              <h3 className="text-xs font-bold text-slate-900 mt-1 leading-snug">{b.tripTitle}</h3>
                            </div>
                            <span className="text-[10px] font-semibold text-emerald-600 uppercase">
                              {b.status}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2 mt-2">
                            <p>Dates: {b.tripStartDate} to {b.tripEndDate}</p>
                            <p>Seats: {b.seatsBooked} Traveler · Total: ${b.totalAmount} USD</p>
                          </div>

                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => {
                                const trip = trips.find(t => t.id === b.tripId);
                                if (trip) {
                                  onOpenChat(trip);
                                  onClose();
                                }
                              }}
                              className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-medium rounded-lg flex items-center justify-center gap-1.5"
                            >
                              <MessageSquare className="w-3 h-3 text-indigo-600" />
                              Group Chat
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* VIEW 3: GROUP CHAT SELECTOR */}
              {activeBottomTab === 'chat' && (
                <div className="p-4 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Communication</p>
                    <h2 className="text-lg font-bold text-slate-900 font-display">Expedition Channels</h2>
                  </div>

                  <div className="space-y-2">
                    {trips.slice(0, 3).map(trip => (
                      <div
                        key={trip.id}
                        onClick={() => {
                          onOpenChat(trip);
                          onClose();
                        }}
                        className="p-3 bg-white rounded-xl border border-slate-200 flex items-center gap-3 cursor-pointer hover:bg-slate-50"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${trip.coverGradient} flex items-center justify-center text-white shrink-0`}>
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{trip.title}</h4>
                          <p className="text-[11px] text-slate-500 truncate">Lead: {trip.organizerName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* VIEW 4: NOTIFICATIONS INBOX */}
              {activeBottomTab === 'inbox' && (
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Automated Alerts</p>
                    <h2 className="text-lg font-bold text-slate-900 font-display">Inbox ({notifications.length})</h2>
                  </div>

                  {notifications.map(n => (
                    <div key={n.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{n.subject}</span>
                        <span className="text-[10px] text-slate-400">Oct 2026</span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{n.previewText}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* VIEW 5: USER PROFILE */}
              {activeBottomTab === 'profile' && (
                <div className="p-4 space-y-4">
                  <div className="text-center pt-2">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-16 h-16 rounded-full mx-auto object-cover ring-2 ring-emerald-500 shadow-sm"
                    />
                    <h3 className="text-base font-bold text-slate-900 mt-2">{currentUser.name}</h3>
                    <p className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-1">
                      {currentUser.role}
                    </p>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-3 space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Email</span>
                      <p className="font-medium text-slate-800">{currentUser.email}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Phone</span>
                      <p className="font-medium text-slate-800">{currentUser.phone || '+1 (555) 234-8901'}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Bio</span>
                      <p className="font-medium text-slate-700 text-[11px]">{currentUser.bio}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Android Bottom Navigation Bar */}
            <div className="h-14 bg-white border-t border-slate-200/90 px-3 flex items-center justify-around shrink-0">
              <button
                onClick={() => { setActiveBottomTab('explore'); setSelectedMobileTrip(null); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                  activeBottomTab === 'explore' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Explore</span>
              </button>

              <button
                onClick={() => { setActiveBottomTab('bookings'); setSelectedMobileTrip(null); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                  activeBottomTab === 'bookings' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Ticket className="w-4 h-4" />
                <span>Trips</span>
              </button>

              <button
                onClick={() => { setActiveBottomTab('chat'); setSelectedMobileTrip(null); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                  activeBottomTab === 'chat' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => { setActiveBottomTab('inbox'); setSelectedMobileTrip(null); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors relative ${
                  activeBottomTab === 'inbox' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span>Inbox</span>
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 right-2 w-2 h-2 bg-amber-500 rounded-full"></span>
                )}
              </button>

              <button
                onClick={() => { setActiveBottomTab('profile'); setSelectedMobileTrip(null); }}
                className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${
                  activeBottomTab === 'profile' ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <UserIcon className="w-4 h-4" />
                <span>Profile</span>
              </button>
            </div>

            {/* Android Navigation Gesture Pill */}
            <div className="h-3 bg-white flex justify-center items-center shrink-0">
              <div className="w-24 h-1 bg-slate-300 rounded-full"></div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
