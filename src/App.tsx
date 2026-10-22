/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Trip, Booking } from './types';
import { authService } from './services/authService';
import { tripService } from './services/tripService';
import { notificationService } from './services/notificationService';
import { Navbar } from './components/Navbar';
import { ParticipantView } from './components/ParticipantView';
import { OrganizerDashboard } from './components/OrganizerDashboard';
import { MyBookingsView } from './components/MyBookingsView';
import { NotificationMailbox } from './components/NotificationMailbox';
import { TestRunnerModal } from './components/TestRunnerModal';
import { FastApiDocsModal } from './components/FastApiDocsModal';
import { CheckoutModal } from './components/CheckoutModal';
import { GroupChatModal } from './components/GroupChatModal';
import { AndroidSimulator } from './components/AndroidSimulator';
import { Compass, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => authService.getCurrentUser());
  const [trips, setTrips] = useState<Trip[]>(() => tripService.getTrips());
  const [activeTab, setActiveTab] = useState<'explore' | 'organizer' | 'my-trips' | 'inbox' | 'tests' | 'fastapi'>('explore');
  const [isAndroidView, setIsAndroidView] = useState<boolean>(false);

  // Active modals
  const [checkoutTrip, setCheckoutTrip] = useState<Trip | null>(null);
  const [chatTrip, setChatTrip] = useState<Trip | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refreshData = () => {
    setTrips(tripService.getTrips());
    setRefreshTrigger(prev => prev + 1);
  };

  const handleUserChange = (newUser: User) => {
    setCurrentUser(newUser);
    // If switched to Participant while on organizer tab, stay or direct to explore
    if (newUser.role === 'Participant' && activeTab === 'organizer') {
      setActiveTab('explore');
    }
  };

  const unreadCount = notificationService.getNotificationsForUser(currentUser.email).filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      
      {/* 3-Zone Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        onUserChange={handleUserChange}
        isAndroidView={isAndroidView}
        onToggleAndroidView={setIsAndroidView}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        unreadCount={unreadCount}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'explore' && (
          <ParticipantView
            trips={trips}
            onBookTrip={(trip) => setCheckoutTrip(trip)}
            onOpenChat={(trip) => setChatTrip(trip)}
          />
        )}

        {activeTab === 'organizer' && (
          <OrganizerDashboard
            currentUser={currentUser}
            trips={trips}
            onRefreshData={refreshData}
            onOpenChat={(trip) => setChatTrip(trip)}
            onSwitchToOrganizer={() => {
              const elena = authService.switchUser('usr_org_01');
              handleUserChange(elena);
            }}
          />
        )}

        {activeTab === 'my-trips' && (
          <MyBookingsView
            currentUser={currentUser}
            trips={trips}
            onOpenChat={(trip) => setChatTrip(trip)}
            onExplore={() => setActiveTab('explore')}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'inbox' && (
          <NotificationMailbox
            currentUser={currentUser}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'tests' && (
          <TestRunnerModal />
        )}

        {activeTab === 'fastapi' && (
          <FastApiDocsModal />
        )}
      </main>

      {/* Checkout & Payment Gateway Modal */}
      {checkoutTrip && (
        <CheckoutModal
          trip={checkoutTrip}
          onClose={() => setCheckoutTrip(null)}
          onSuccess={() => {
            refreshData();
          }}
          onOpenChat={(trip) => setChatTrip(trip)}
        />
      )}

      {/* Real-Time Trip Group Chat Modal */}
      {chatTrip && (
        <GroupChatModal
          trip={chatTrip}
          currentUser={currentUser}
          onClose={() => setChatTrip(null)}
        />
      )}

      {/* Interactive Android Mobile App Simulator */}
      {isAndroidView && (
        <AndroidSimulator
          currentUser={currentUser}
          trips={trips}
          onSelectTrip={(trip) => {
            // Mobile trip details view
          }}
          onBookTrip={(trip) => {
            setCheckoutTrip(trip);
          }}
          onOpenChat={(trip) => {
            setChatTrip(trip);
          }}
          onClose={() => setIsAndroidView(false)}
        />
      )}

      {/* Clean Editorial Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span className="font-display font-bold">WanderHub Platform</span>
            <span>·</span>
            <span>Microservices Architecture</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setActiveTab('fastapi')} className="hover:text-slate-900 transition-colors">
              Python FastAPI Architecture
            </button>
            <button onClick={() => setActiveTab('tests')} className="hover:text-slate-900 transition-colors">
              Reliability Unit Tests
            </button>
            <button onClick={() => setIsAndroidView(true)} className="hover:text-slate-900 transition-colors">
              Android Preview
            </button>
          </div>

          <p className="text-slate-400">
            © 2026 WanderHub Expeditions Inc. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}
