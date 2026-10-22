/**
 * WanderHub - Top Bar Navigation Component
 * 
 * Enforces the 3-zone contract:
 * [Wordmark brand] — [4-5 clean text links] — [Android Simulator switch & Role Profile]
 */

import React from 'react';
import { Compass, Smartphone, Monitor, ShieldCheck, Mail, Terminal, FileCode2 } from 'lucide-react';
import { User, UserRole } from '../types';
import { authService } from '../services/authService';

interface NavbarProps {
  currentUser: User;
  onUserChange: (user: User) => void;
  isAndroidView: boolean;
  onToggleAndroidView: (val: boolean) => void;
  activeTab: 'explore' | 'organizer' | 'my-trips' | 'inbox' | 'tests' | 'fastapi';
  onSelectTab: (tab: 'explore' | 'organizer' | 'my-trips' | 'inbox' | 'tests' | 'fastapi') => void;
  unreadCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onUserChange,
  isAndroidView,
  onToggleAndroidView,
  activeTab,
  onSelectTab,
  unreadCount
}) => {
  const allUsers = authService.getAllUsers();

  const handleRoleSwitch = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = authService.switchUser(e.target.value);
    onUserChange(selected);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => onSelectTab('explore')}
          className="flex items-center gap-2.5 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <Compass className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap font-display">
            WanderHub
          </span>
        </button>

        {/* Zone 2: 4-5 single-line clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => onSelectTab('explore')}
            className={`transition-colors whitespace-nowrap ${
              activeTab === 'explore' ? 'text-slate-950 font-semibold' : 'hover:text-slate-900'
            }`}
          >
            Expeditions
          </button>

          {currentUser.role === 'Organizer' && (
            <button
              onClick={() => onSelectTab('organizer')}
              className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                activeTab === 'organizer' ? 'text-slate-950 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Organizer Studio
            </button>
          )}

          <button
            onClick={() => onSelectTab('my-trips')}
            className={`transition-colors whitespace-nowrap ${
              activeTab === 'my-trips' ? 'text-slate-950 font-semibold' : 'hover:text-slate-900'
            }`}
          >
            My Bookings
          </button>

          <button
            onClick={() => onSelectTab('inbox')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'inbox' ? 'text-slate-950 font-semibold' : 'hover:text-slate-900'
            }`}
          >
            <Mail className="w-4 h-4" />
            Notifications
            {unreadCount > 0 && (
              <span className="w-4 h-4 text-[10px] bg-amber-500 text-white font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('tests')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'tests' ? 'text-slate-950 font-semibold' : 'hover:text-slate-900'
            }`}
          >
            <Terminal className="w-4 h-4 text-indigo-600" />
            Unit Tests
          </button>

          <button
            onClick={() => onSelectTab('fastapi')}
            className={`flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'fastapi' ? 'text-slate-950 font-semibold' : 'hover:text-slate-900'
            }`}
          >
            <FileCode2 className="w-4 h-4 text-emerald-600" />
            FastAPI Specs
          </button>
        </nav>

        {/* Zone 3: 1 primary action cluster (Android toggle + Role switcher) */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Android Mobile View Simulator Toggle */}
          <button
            onClick={() => onToggleAndroidView(!isAndroidView)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all whitespace-nowrap ${
              isAndroidView
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-sm'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Toggle between Web Desktop and Android App View"
          >
            {isAndroidView ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">Web Portal</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-slate-600" />
                <span className="hidden sm:inline">Android Preview</span>
              </>
            )}
          </button>

          {/* Active Role Selector (Organizer vs Participant) */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="relative">
              <select
                aria-label="Switch User Profile"
                value={currentUser.id}
                onChange={handleRoleSwitch}
                className="text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg py-1.5 pl-2.5 pr-7 border-none appearance-none cursor-pointer focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                {allUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.role === 'Organizer' ? '⚡ ' : '🎒 '}
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>

            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-300"
            />
          </div>

        </div>

      </div>
    </header>
  );
};
