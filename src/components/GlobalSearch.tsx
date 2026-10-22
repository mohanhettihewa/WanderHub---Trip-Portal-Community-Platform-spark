/**
 * WanderHub - Global Search & Multi-Criteria Filter Component
 * 
 * Allows users to search and filter expeditions by destination, date range
 * (start & end date), and organizer name with real-time dropdown results and synchronization.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  MapPin, 
  Calendar, 
  User, 
  X, 
  SlidersHorizontal, 
  ArrowRight,
  Clock,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { Trip, GlobalSearchFilters } from '../types';

interface GlobalSearchProps {
  trips: Trip[];
  searchFilters: GlobalSearchFilters;
  onFiltersChange: (filters: GlobalSearchFilters) => void;
  onSelectTrip: (trip: Trip) => void;
  onViewAllResults: () => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  trips,
  searchFilters,
  onFiltersChange,
  onSelectTrip,
  onViewAllResults
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract unique organizers from trips
  const uniqueOrganizers = Array.from(new Set(trips.map(t => t.organizerName)));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowFiltersPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter trips based on destination, date range, and organizer
  const matchedTrips = trips.filter(trip => {
    // 1. Destination / keyword filter
    if (searchFilters.destination.trim()) {
      const q = searchFilters.destination.toLowerCase().trim();
      const matchDest = trip.destination.toLowerCase().includes(q) ||
                        trip.country.toLowerCase().includes(q) ||
                        trip.title.toLowerCase().includes(q) ||
                        trip.category.toLowerCase().includes(q);
      if (!matchDest) return false;
    }

    // 2. Date range filter
    if (searchFilters.startDate) {
      // Trip must start on or after filter start date
      if (new Date(trip.startDate) < new Date(searchFilters.startDate)) {
        return false;
      }
    }
    if (searchFilters.endDate) {
      // Trip must end on or before filter end date
      if (new Date(trip.endDate) > new Date(searchFilters.endDate)) {
        return false;
      }
    }

    // 3. Organizer filter
    if (searchFilters.organizerName && searchFilters.organizerName !== 'All') {
      if (trip.organizerName.toLowerCase() !== searchFilters.organizerName.toLowerCase()) {
        return false;
      }
    }

    return true;
  });

  const activeFilterCount = (searchFilters.destination ? 1 : 0) +
    (searchFilters.startDate ? 1 : 0) +
    (searchFilters.endDate ? 1 : 0) +
    (searchFilters.organizerName && searchFilters.organizerName !== 'All' ? 1 : 0);

  const handleClearAll = () => {
    onFiltersChange({
      destination: '',
      startDate: '',
      endDate: '',
      organizerName: 'All'
    });
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>

        <input
          type="text"
          placeholder="Search destination, country, or dates..."
          value={searchFilters.destination}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onFiltersChange({ ...searchFilters, destination: e.target.value });
            setIsOpen(true);
          }}
          className="w-full pl-9 pr-20 py-1.5 text-xs bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-transparent focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all shadow-inner"
        />

        {/* Clear & Filter Toggle Buttons */}
        <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center gap-1">
          {searchFilters.destination && (
            <button
              onClick={() => onFiltersChange({ ...searchFilters, destination: '' })}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              title="Clear search text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={() => {
              setShowFiltersPanel(!showFiltersPanel);
              setIsOpen(true);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              activeFilterCount > 0 || showFiltersPanel
                ? 'bg-slate-900 text-white'
                : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200'
            }`}
            title="Filter by destination, date range, or organizer"
          >
            <SlidersHorizontal className="w-3 h-3" />
            {activeFilterCount > 0 && (
              <span className="w-3.5 h-3.5 bg-emerald-500 text-slate-950 font-bold rounded-full text-[9px] flex items-center justify-center font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* DROPDOWN POPOVER: FILTER CONTROLS & LIVE MATCH RESULTS */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          
          {/* Multi-Criteria Filters Panel */}
          {showFiltersPanel && (
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                  Filter Expeditions
                </span>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-[11px] text-rose-600 hover:text-rose-700 font-medium"
                  >
                    Reset all filters
                  </button>
                )}
              </div>

              {/* Destination Quick Suggestions */}
              <div>
                <label className="text-slate-500 font-medium text-[11px] flex items-center gap-1 mb-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Popular Destinations:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['Nepal', 'Norway', 'Jordan', 'Finland'].map((dest) => (
                    <button
                      key={dest}
                      onClick={() => onFiltersChange({ ...searchFilters, destination: dest })}
                      className={`px-2 py-0.5 rounded-md text-[11px] transition-colors ${
                        searchFilters.destination.toLowerCase() === dest.toLowerCase()
                          ? 'bg-emerald-600 text-white font-medium'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {dest}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range: Start and End Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-500 font-medium text-[11px] flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    From Date:
                  </label>
                  <input
                    type="date"
                    value={searchFilters.startDate || ''}
                    onChange={(e) => onFiltersChange({ ...searchFilters, startDate: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="text-slate-500 font-medium text-[11px] flex items-center gap-1 mb-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    To Date:
                  </label>
                  <input
                    type="date"
                    value={searchFilters.endDate || ''}
                    onChange={(e) => onFiltersChange({ ...searchFilters, endDate: e.target.value })}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Organizer Name Filter */}
              <div>
                <label className="text-slate-500 font-medium text-[11px] flex items-center gap-1 mb-1">
                  <User className="w-3 h-3 text-slate-400" />
                  Trip Organizer:
                </label>
                <select
                  value={searchFilters.organizerName || 'All'}
                  onChange={(e) => onFiltersChange({ ...searchFilters, organizerName: e.target.value })}
                  className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-800 text-[11px] focus:outline-none focus:ring-1 focus:ring-slate-900 cursor-pointer"
                >
                  <option value="All">All Organizers</option>
                  {uniqueOrganizers.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Results Summary Bar */}
          <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <span>Matching Expeditions</span>
              <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                {matchedTrips.length}
              </span>
            </span>

            <button
              onClick={() => {
                onViewAllResults();
                setIsOpen(false);
              }}
              className="text-[11px] font-semibold text-slate-900 hover:text-emerald-700 flex items-center gap-1 transition-colors"
            >
              <span>View in Catalog</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Result Item Cards */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {matchedTrips.length === 0 ? (
              <div className="p-6 text-center text-slate-400 space-y-1">
                <Search className="w-6 h-6 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">No matching expeditions found</p>
                <p className="text-[11px]">Try adjusting your destination keyword, date range, or organizer.</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="mt-2 text-xs text-emerald-700 font-semibold hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              matchedTrips.map((trip) => (
                <div
                  key={trip.id}
                  onClick={() => {
                    onSelectTrip(trip);
                    setIsOpen(false);
                  }}
                  className="p-3 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${trip.coverGradient} flex items-center justify-center text-white shrink-0 shadow-sm`}>
                      <MapPin className="w-4 h-4" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                        {trip.title}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="text-slate-700 font-medium">{trip.destination}, {trip.country}</span>
                        <span>·</span>
                        <span className="font-mono">{trip.startDate}</span>
                        <span>·</span>
                        <span className="truncate">by {trip.organizerName}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                      ${trip.pricePerPerson}
                    </p>
                    <span className="text-[10px] text-emerald-600 font-medium">
                      {trip.maxSeats - trip.bookedSeats} seats left
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}

    </div>
  );
};
