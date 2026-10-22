/**
 * WanderHub - Traveler & Participant Discovery View
 * 
 * Provides responsive expedition discovery, multi-criteria filtering,
 * rich day-by-day itinerary inspections, and booking triggers.
 */

import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Users,
  Compass,
  Mountain,
  Waves,
  Sun,
  Snowflake,
  Sparkles
} from 'lucide-react';
import { Trip, TripCategory, TripDifficulty, GlobalSearchFilters } from '../types';

interface ParticipantViewProps {
  trips: Trip[];
  onBookTrip: (trip: Trip) => void;
  onOpenChat: (trip: Trip) => void;
  externalModalTrip?: Trip | null;
  onClearExternalModalTrip?: () => void;
  searchFilters?: GlobalSearchFilters;
  onClearFilters?: () => void;
}

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  trips,
  onBookTrip,
  onOpenChat,
  externalModalTrip,
  onClearExternalModalTrip,
  searchFilters,
  onClearFilters
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [internalModalTrip, setInternalModalTrip] = useState<Trip | null>(null);
  const [itineraryTab, setItineraryTab] = useState<'overview' | 'itinerary' | 'equipment' | 'policy'>('overview');

  const activeModalTrip = externalModalTrip || internalModalTrip;
  const setActiveModalTrip = (trip: Trip | null) => {
    setInternalModalTrip(trip);
    if (!trip && onClearExternalModalTrip) {
      onClearExternalModalTrip();
    }
  };

  const categories: (TripCategory | 'All')[] = [
    'All',
    'Trek & Mountain',
    'Coastal & Water',
    'Desert & Safari',
    'Nordic & Winter'
  ];

  const filteredTrips = trips.filter(trip => {
    const matchCat = selectedCategory === 'All' || trip.category === selectedCategory;
    const matchDiff = selectedDifficulty === 'All' || trip.difficulty === selectedDifficulty;
    const matchSearch = trip.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        trip.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        trip.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        trip.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchDiff && matchSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Trek & Mountain': return <Mountain className="w-4 h-4" />;
      case 'Coastal & Water': return <Waves className="w-4 h-4" />;
      case 'Desert & Safari': return <Sun className="w-4 h-4" />;
      case 'Nordic & Winter': return <Snowflake className="w-4 h-4" />;
      default: return <Compass className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Hero Header Section */}
      <section className="relative rounded-3xl bg-slate-900 text-white overflow-hidden p-8 sm:p-12 border border-slate-800 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Expedition Portal</span>
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight font-display text-white leading-tight" style={{ textWrap: 'balance' }}>
            Join small-group expeditions led by certified organizers.
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
            Real-time seat reservations, atomic payment guarantees, and direct group communication channels with your expedition team.
          </p>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="mt-8 relative z-10 grid grid-cols-1 md:grid-cols-12 gap-3 bg-white/10 backdrop-blur-md p-2.5 rounded-2xl border border-white/10">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by destination, country, or expedition keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 text-white placeholder-slate-400 text-xs sm:text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="md:col-span-3">
            <select
              aria-label="Filter by Difficulty"
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-950/60 text-white text-xs sm:text-sm rounded-xl border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
            >
              <option value="All">All Difficulties</option>
              <option value="Easy">Easy (Beginner-friendly)</option>
              <option value="Moderate">Moderate (Active hikers)</option>
              <option value="Challenging">Challenging (High altitude)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex items-center justify-end px-3 text-xs text-slate-300 font-mono tabular-nums">
            <span>{filteredTrips.length} expeditions available</span>
          </div>
        </div>

        {/* Decorative Atmospheric Backdrop */}
        <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none"></div>
      </section>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {getCategoryIcon(cat)}
            <span>{cat}</span>
          </button>
        ))}
      </div>

      {/* Trips Grid or Empty State */}
      {filteredTrips.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4 max-w-lg mx-auto my-8">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Compass className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 font-display">No Expeditions Found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No expeditions match your current destination, date range, or organizer filters.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('All');
              setSelectedDifficulty('All');
              setSearchQuery('');
              if (onClearFilters) onClearFilters();
            }}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
          const remainingSeats = trip.maxSeats - trip.bookedSeats;
          const isAlmostFull = remainingSeats <= 3 && remainingSeats > 0;
          const isSoldOut = remainingSeats === 0;

          return (
            <div
              key={trip.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group"
            >
              {/* Trip Scenic Banner */}
              <div className={`h-48 bg-gradient-to-tr ${trip.coverGradient} p-5 flex flex-col justify-between text-white relative`}>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md">
                    {getCategoryIcon(trip.category)}
                    {trip.category}
                  </span>
                  <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                    isSoldOut 
                      ? 'bg-rose-500 text-white' 
                      : isAlmostFull 
                        ? 'bg-amber-500 text-white' 
                        : 'bg-emerald-500/90 text-white'
                  }`}>
                    {isSoldOut ? 'Sold Out' : `${remainingSeats} seats left`}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-white/80 font-medium mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {trip.destination}, {trip.country}
                  </p>
                  <h3 className="text-lg font-bold font-display leading-tight drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                    {trip.title}
                  </h3>
                </div>
              </div>

              {/* Card Body & Unboxed Metadata */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Zero-Pill Unboxed Metadata with Typographic Separator */}
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {trip.durationDays} Days
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{trip.difficulty}</span>
                  <span aria-hidden="true">·</span>
                  <span>Max {trip.maxSeats} Climbers</span>
                </div>

                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {trip.description}
                </p>

                {/* Organizer Info & Pricing */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={trip.organizerAvatar}
                      alt={trip.organizerName}
                      referrerPolicy="no-referrer"
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200"
                    />
                    <div>
                      <p className="text-xs font-semibold text-slate-900 leading-none">{trip.organizerName}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Certified Organizer</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Seat Price</p>
                    <p className="text-lg font-extrabold text-slate-900 font-mono tabular-nums leading-none mt-0.5">
                      ${trip.pricePerPerson}
                      <span className="text-xs font-normal text-slate-500"> {trip.currency}</span>
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveModalTrip(trip);
                      setItineraryTab('overview');
                    }}
                    className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors text-center"
                  >
                    View Details
                  </button>

                  <button
                    disabled={isSoldOut}
                    onClick={() => onBookTrip(trip)}
                    className={`w-full py-2 px-3 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 ${
                      isSoldOut
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-sm'
                    }`}
                  >
                    <span>{isSoldOut ? 'Sold Out' : 'Join Trip'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* FULL TRIP DETAILS MODAL */}
      {activeModalTrip && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header Banner */}
            <div className={`p-6 sm:p-8 bg-gradient-to-r ${activeModalTrip.coverGradient} text-white relative shrink-0`}>
              <button
                onClick={() => setActiveModalTrip(null)}
                className="absolute top-5 right-5 p-2 bg-black/30 hover:bg-black/50 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">
                <span>{activeModalTrip.category}</span>
                <span>·</span>
                <span>{activeModalTrip.destination}, {activeModalTrip.country}</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold font-display leading-tight max-w-xl">
                {activeModalTrip.title}
              </h2>

              <p className="text-xs sm:text-sm text-white/80 mt-1 max-w-lg">
                {activeModalTrip.subtitle}
              </p>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-6 gap-6 text-xs sm:text-sm font-medium">
              {[
                { id: 'overview', label: 'Overview & Highlights' },
                { id: 'itinerary', label: `Day-by-Day Agenda (${activeModalTrip.itinerary.length} Days)` },
                { id: 'equipment', label: 'Equipment & Inclusions' },
                { id: 'policy', label: 'Cancellation Policy' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setItineraryTab(tab.id as any)}
                  className={`py-3 border-b-2 transition-colors whitespace-nowrap ${
                    itineraryTab === tab.id
                      ? 'border-slate-900 text-slate-950 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-slate-700 text-sm">
              
              {itineraryTab === 'overview' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">About The Expedition</h4>
                    <p className="leading-relaxed text-slate-600 text-sm">{activeModalTrip.description}</p>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">Key Highlights</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeModalTrip.highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span className="text-xs font-medium text-slate-800">{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Organizer Card */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={activeModalTrip.organizerAvatar}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-300"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900">{activeModalTrip.organizerName}</span>
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        </div>
                        <p className="text-xs text-slate-500">Expedition Leader · Contact: {activeModalTrip.organizerContact}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onOpenChat(activeModalTrip);
                        setActiveModalTrip(null);
                      }}
                      className="px-3.5 py-1.5 bg-white text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-100"
                    >
                      Trip Group Chat
                    </button>
                  </div>
                </div>
              )}

              {itineraryTab === 'itinerary' && (
                <div className="space-y-4">
                  {activeModalTrip.itinerary.map((day) => (
                    <div key={day.day} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full font-mono">
                          Day {day.day}
                        </span>
                        <span className="text-xs font-semibold text-slate-800">{day.title}</span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{day.description}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {day.activities.map((act, idx) => (
                          <span key={idx} className="text-[11px] text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                            • {act}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {itineraryTab === 'equipment' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">Included In Ticket</h4>
                    <ul className="space-y-2 text-xs">
                      {activeModalTrip.included.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-700">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Excluded (Traveler Responsibility)</h4>
                    <ul className="space-y-2 text-xs">
                      {activeModalTrip.excluded.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-500">
                          <span className="text-rose-500 font-bold shrink-0">✕</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {itineraryTab === 'policy' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                    <p className="font-semibold text-sm mb-1">Standard Expedition Cancellation Policy</p>
                    <p>{activeModalTrip.cancellationPolicy}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    All seat reservations are held atomically with our simulated payment gateway. Cancellations processed 30 days prior receive immediate credit return.
                  </p>
                </div>
              )}

            </div>

            {/* Modal Action Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div>
                <p className="text-xs text-slate-500">Total Price Per Person</p>
                <p className="text-xl font-extrabold text-slate-900 font-mono tabular-nums">
                  ${activeModalTrip.pricePerPerson} <span className="text-xs font-normal text-slate-500">{activeModalTrip.currency}</span>
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setActiveModalTrip(null)}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onBookTrip(activeModalTrip);
                    setActiveModalTrip(null);
                  }}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
                >
                  <span>Proceed to Booking</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
