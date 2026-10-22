/**
 * WanderHub - Automated Email & Notification Mailbox Component
 * 
 * Simulates a transactional email inbox displaying HTML confirmation emails,
 * payment receipts, and organizer attendee alerts delivered by the notification service.
 */

import React, { useState } from 'react';
import { 
  Mail, 
  Check, 
  Trash2, 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Inbox
} from 'lucide-react';
import { EmailNotification, User } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationMailboxProps {
  currentUser: User;
  onRefresh: () => void;
}

export const NotificationMailbox: React.FC<NotificationMailboxProps> = ({
  currentUser,
  onRefresh
}) => {
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);

  const notifications = notificationService.getNotificationsForUser(currentUser.email);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleSelect = (email: EmailNotification) => {
    setSelectedEmail(email);
    notificationService.markAsRead(email.id);
    onRefresh();
  };

  const handleMarkAllRead = () => {
    notificationService.markAllAsRead(currentUser.email);
    onRefresh();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    notificationService.deleteNotification(id);
    if (selectedEmail?.id === id) {
      setSelectedEmail(null);
    }
    onRefresh();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 uppercase tracking-wider">
            <span>Automated Email Dispatcher</span>
            <span>·</span>
            <span>{currentUser.email}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display mt-0.5">
            Notifications & Transactional Emails
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Main Mailbox Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        
        {/* Email List Column */}
        <div className={`md:col-span-5 border-r border-slate-200 flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 text-xs">
            <span className="font-bold text-slate-800">Inbox ({notifications.length})</span>
            <span className="text-slate-500 font-mono text-[11px]">{unreadCount} unread</span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 space-y-2">
                <Inbox className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-medium text-slate-600">No emails in inbox.</p>
                <p className="text-[11px]">Booking confirmations and trip alerts will land here.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`p-4 transition-colors cursor-pointer relative group flex items-start gap-3 ${
                    selectedEmail?.id === item.id
                      ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-500/30'
                      : !item.read
                        ? 'bg-white font-medium hover:bg-slate-50'
                        : 'bg-slate-50/50 hover:bg-slate-100/60'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!item.read ? 'bg-amber-500' : 'bg-transparent'}`} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-xs mb-0.5">
                      <span className={`truncate text-xs ${!item.read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                        {item.recipientName}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">
                        {new Date(item.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <h4 className={`text-xs truncate ${!item.read ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {item.subject}
                    </h4>

                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {item.previewText}
                    </p>
                  </div>

                  <button
                    onClick={(e) => handleDelete(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Email Preview Column */}
        <div className={`md:col-span-7 flex flex-col bg-slate-50 ${selectedEmail ? 'flex' : 'hidden md:flex'}`}>
          {selectedEmail ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
              
              {/* Email View Header */}
              <div className="p-5 border-b border-slate-200 bg-white flex items-start justify-between">
                <div>
                  <button
                    onClick={() => setSelectedEmail(null)}
                    className="md:hidden flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 mb-2 font-medium"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to Inbox
                  </button>
                  <h3 className="text-base font-bold text-slate-900 font-display">{selectedEmail.subject}</h3>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>To: {selectedEmail.recipientName} &lt;{selectedEmail.recipientEmail}&gt;</span>
                    <span>·</span>
                    <span className="font-mono text-[11px]">{new Date(selectedEmail.sentAt).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDelete(selectedEmail.id, e)}
                  className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Delete email"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Rendered HTML Email Content */}
              <div 
                className="p-6 overflow-y-auto flex-1 text-slate-800 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent }}
              />

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400 font-mono">
                Delivered via WanderHub Transactional Email Gateway
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-2">
              <Mail className="w-12 h-12 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Select an email to view full transactional preview</p>
              <p className="text-xs max-w-xs text-slate-400">
                WanderHub dispatches automated booking vouchers, payment invoices, and organizer alerts upon real-time checkout.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
