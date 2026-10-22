/**
 * WanderHub - Real-Time Trip Group Chat Microservice
 * 
 * Manages trip-specific chat channels, organizer broadcast announcements,
 * member presence, and message history.
 */

import { ChatMessage, UserRole } from '../types';
import { authService, AVATAR_ELENA, AVATAR_MARCUS, AVATAR_SARAH } from './authService';
import { eventBus } from './eventBus';

const SEED_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_01',
    tripId: 'trip_him_01',
    senderId: 'usr_org_01',
    senderName: 'Elena Rostova',
    senderRole: 'Organizer',
    senderAvatar: AVATAR_ELENA,
    message: 'Welcome everyone to the Annapurna Ridge Expedition! Please make sure your passport has at least 6 months validity from departure date for Nepal visa processing.',
    timestamp: '2026-10-16T09:00:00Z',
    isAnnouncement: true
  },
  {
    id: 'msg_02',
    tripId: 'trip_him_01',
    senderId: 'usr_part_01',
    senderName: 'Marcus Vance',
    senderRole: 'Participant',
    senderAvatar: AVATAR_MARCUS,
    message: 'Excited to be joining! Quick question Elena: are microspikes needed or will heavy lug Vibram boots suffice for the sanctuary moraine?',
    timestamp: '2026-10-16T11:24:00Z'
  },
  {
    id: 'msg_03',
    tripId: 'trip_him_01',
    senderId: 'usr_org_01',
    senderName: 'Elena Rostova',
    senderRole: 'Organizer',
    senderAvatar: AVATAR_ELENA,
    message: 'Great question Marcus. Heavy lug boots are great for the ascent, but we will provide lightweight Kahtoola microspikes in Pokhara for the final icy approach past Deurali.',
    timestamp: '2026-10-16T11:45:00Z'
  },
  {
    id: 'msg_04',
    tripId: 'trip_him_01',
    senderId: 'usr_part_02',
    senderName: 'Sarah Chen',
    senderRole: 'Participant',
    senderAvatar: AVATAR_SARAH,
    message: 'Hello team! Anyone flying out through Doha on Qatar Airways on Nov 9? Would love to share airport transfer into Pokhara.',
    timestamp: '2026-10-18T16:15:00Z'
  }
];

const STORAGE_KEY_CHAT = 'wanderhub_chat_messages';

function resolveAvatar(senderId: string, existingAvatar?: string): string {
  if (existingAvatar && !existingAvatar.includes('unsplash.com')) {
    return existingAvatar;
  }
  if (senderId === 'usr_part_01') return AVATAR_MARCUS;
  if (senderId === 'usr_part_02') return AVATAR_SARAH;
  return AVATAR_ELENA;
}

class ChatService {
  private messages: ChatMessage[] = [];

  constructor() {
    const saved = localStorage.getItem(STORAGE_KEY_CHAT);
    if (saved) {
      try {
        const parsed: ChatMessage[] = JSON.parse(saved);
        // Clean up any legacy test-pollution messages and upgrade Unsplash avatars
        this.messages = parsed
          .filter(m => m.message !== 'Trying to make an announcement')
          .map(m => ({
            ...m,
            senderAvatar: resolveAvatar(m.senderId, m.senderAvatar)
          }));
        this.saveToStorage();
      } catch {
        this.messages = [...SEED_CHAT_MESSAGES];
      }
    } else {
      this.messages = [...SEED_CHAT_MESSAGES];
      this.saveToStorage();
    }

    // Subscribe to booking confirmations to add an automated welcome entry
    eventBus.subscribe('BOOKING_CONFIRMED', (event) => {
      if (event.type === 'BOOKING_CONFIRMED') {
        const { booking, trip } = event.payload;
        this.addSystemMessage(
          trip.id,
          `${booking.participantName} has joined the expedition! (${booking.seatsBooked} seat reserved)`
        );
      }
    });
  }

  private saveToStorage(): void {
    localStorage.setItem(STORAGE_KEY_CHAT, JSON.stringify(this.messages));
  }

  /**
   * Synchronize chat messages with the live Python FastAPI backend.
   */
  public syncFromBackend(messages: ChatMessage[]): void {
    if (Array.isArray(messages) && messages.length > 0) {
      this.messages = messages
        .filter(m => m.message !== 'Trying to make an announcement')
        .map(m => ({
          ...m,
          senderAvatar: resolveAvatar(m.senderId, m.senderAvatar)
        }));
      this.saveToStorage();
    }
  }

  /**
   * Fetch all messages for a specific trip channel.
   */
  public getMessagesForTrip(tripId: string): ChatMessage[] {
    return this.messages.filter(m => m.tripId === tripId);
  }

  /**
   * Send a new message to a trip group chat channel.
   * When `syncBackend` is false (e.g., during unit tests), avoids persisting to backend.
   */
  public sendMessage(tripId: string, text: string, isAnnouncement: boolean = false, syncBackend: boolean = true): ChatMessage {
    const currentUser = authService.getCurrentUser();
    authService.assertPermission(currentUser, 'SEND_CHAT_MESSAGE');

    if (!text || text.trim() === '') {
      throw new Error('Message cannot be empty');
    }

    // Only organizers can mark messages as official announcements
    const canAnnounce = currentUser.role === 'Organizer' && isAnnouncement;

    const newMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tripId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      senderAvatar: currentUser.avatar,
      message: text.trim(),
      timestamp: new Date().toISOString(),
      isAnnouncement: canAnnounce
    };

    this.messages.push(newMessage);
    this.saveToStorage();

    if (syncBackend) {
      fetch('/api/v1/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser.id
        },
        body: JSON.stringify({
          tripId,
          message: text.trim(),
          isAnnouncement: canAnnounce
        })
      }).catch(() => {
        // Fallback handled locally
      });
    }

    eventBus.publish({
      type: 'CHAT_MESSAGE_SENT',
      payload: { message: newMessage }
    });

    return newMessage;
  }

  /**
   * Helper to post automated system announcements into trip channel.
   */
  private addSystemMessage(tripId: string, text: string): void {
    const sysMsg: ChatMessage = {
      id: `sys_msg_${Date.now()}`,
      tripId,
      senderId: 'sys_bot',
      senderName: 'WanderHub Expeditions',
      senderRole: 'Organizer' as UserRole,
      senderAvatar: AVATAR_ELENA,
      message: text,
      timestamp: new Date().toISOString(),
      isAnnouncement: true
    };
    this.messages.push(sysMsg);
    this.saveToStorage();
  }

  /**
   * Snapshot and restore chat messages for isolated unit tests.
   */
  public getSnapshot(): ChatMessage[] {
    return JSON.parse(JSON.stringify(this.messages));
  }

  public restoreSnapshot(snapshot: ChatMessage[]): void {
    this.messages = JSON.parse(JSON.stringify(snapshot));
    this.saveToStorage();
  }

  /**
   * Reset messages to seed for testing.
   */
  public resetToSeeds(): void {
    this.messages = [...SEED_CHAT_MESSAGES];
    this.saveToStorage();
  }
}

export const chatService = new ChatService();
