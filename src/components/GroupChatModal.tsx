/**
 * WanderHub - Real-Time Trip Group Chat Component
 * 
 * Provides an expedition communication room connecting organizers with booked travelers,
 * with pinned organizer announcements and live participant messaging.
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  X, 
  MessageSquare, 
  Pin, 
  ShieldCheck, 
  Users, 
  Sparkles 
} from 'lucide-react';
import { Trip, User, ChatMessage } from '../types';
import { chatService } from '../services/chatService';
import { authService } from '../services/authService';

interface GroupChatModalProps {
  trip: Trip;
  currentUser: User;
  onClose: () => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  trip,
  currentUser,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [asAnnouncement, setAsAnnouncement] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const canPostAnnouncement = currentUser.role === 'Organizer';

  const loadMessages = () => {
    const list = chatService.getMessagesForTrip(trip.id);
    setMessages([...list]);
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 1500); // Poll for simulator updates
    return () => clearInterval(interval);
  }, [trip.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    try {
      chatService.sendMessage(trip.id, inputText.trim(), asAnnouncement && canPostAnnouncement);
      setInputText('');
      setAsAnnouncement(false);
      loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  // Find latest announcement
  const latestAnnouncement = [...messages].reverse().find(m => m.isAnnouncement);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[620px] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Chat Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${trip.coverGradient} flex items-center justify-center text-white shrink-0`}>
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold font-display leading-tight">{trip.title}</h3>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Led by {trip.organizerName} · {trip.bookedSeats} Climbers Joined
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pinned Organizer Announcement Banner */}
        {latestAnnouncement && (
          <div className="bg-amber-50 border-b border-amber-200/80 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
            <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-[11px] uppercase tracking-wider text-amber-800">
                Official Organizer Announcement ({latestAnnouncement.senderName}):
              </span>
              <p className="mt-0.5 text-amber-950 text-xs leading-relaxed">{latestAnnouncement.message}</p>
            </div>
          </div>
        )}

        {/* Message Thread */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-50 text-xs">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No messages in this expedition channel yet.</p>
              <p className="text-xs">Say hello to your fellow travelers and the expedition guide!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isCurrentUser = msg.senderId === currentUser.id;
              const isOrganizer = msg.senderRole === 'Organizer';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 items-end ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isCurrentUser && (
                    <img
                      src={msg.senderAvatar}
                      alt={msg.senderName}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-200"
                    />
                  )}

                  <div className={`max-w-[75%] rounded-2xl p-3 shadow-sm ${
                    msg.isAnnouncement
                      ? 'bg-amber-50 border border-amber-200 text-amber-950'
                      : isCurrentUser
                        ? 'bg-slate-900 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'
                  }`}>
                    {/* Header info */}
                    <div className="flex items-center gap-1.5 mb-1 text-[10px]">
                      <span className={`font-bold ${isCurrentUser ? 'text-emerald-400' : 'text-slate-900'}`}>
                        {msg.senderName}
                      </span>
                      {isOrganizer && (
                        <span className="flex items-center gap-0.5 text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded text-[9px]">
                          <ShieldCheck className="w-2.5 h-2.5" />
                          Organizer
                        </span>
                      )}
                      <span className={`ml-auto font-mono text-[9px] ${isCurrentUser ? 'text-slate-400' : 'text-slate-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="leading-relaxed text-xs sm:text-[13px]">{msg.message}</p>
                  </div>

                  {isCurrentUser && (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-slate-300"
                    />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Footer */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 shrink-0 space-y-2">
          {canPostAnnouncement && (
            <label className="flex items-center gap-1.5 text-[11px] text-amber-800 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={asAnnouncement}
                onChange={(e) => setAsAnnouncement(e.target.checked)}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span>Broadcast as pinned organizer announcement</span>
            </label>
          )}

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Message expedition group as ${currentUser.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className={`p-2.5 rounded-xl transition-all ${
                inputText.trim()
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
