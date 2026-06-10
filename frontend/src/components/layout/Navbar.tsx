
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Search, UserCircle, CheckCheck, ExternalLink, Inbox } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { notificationService, Notification } from '@/services/notificationService';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationService.getAll();
      setNotifications(data);
    } catch (e) {
      // silently ignore auth errors etc.
    } finally {
      setLoading(false);
    }
  }, []);

  // Poll every 30 seconds for new notifications
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkAllRead = async () => {
    await notificationService.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await notificationService.markAsRead(notif.id);
      setNotifications(prev =>
        prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n)
      );
    }
    setOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const recent = notifications.slice(0, 6);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
      <div className="flex items-center gap-4 flex-1">
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="notification-bell-btn"
            onClick={() => { setOpen(o => !o); if (!open) fetchNotifications(); }}
            className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-all"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center leading-none border-2 border-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-100 z-50 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-indigo-500" />
                  <span className="font-black text-slate-800 text-sm">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-black rounded-full">{unreadCount} new</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
              </div>

              {/* Notification Items */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                {loading ? (
                  <div className="py-8 text-center text-slate-400 text-sm font-semibold">Loading...</div>
                ) : recent.length === 0 ? (
                  <div className="py-10 flex flex-col items-center gap-3 text-slate-400">
                    <Inbox className="w-8 h-8" />
                    <span className="text-sm font-semibold">All caught up! No notifications.</span>
                  </div>
                ) : (
                  recent.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "w-full text-left px-4 py-3 hover:bg-slate-50 transition-all",
                        !notif.is_read && "bg-indigo-50/60"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "mt-1 w-2 h-2 rounded-full flex-shrink-0",
                          notif.is_read ? "bg-slate-200" : "bg-indigo-500"
                        )} />
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs leading-snug truncate",
                            notif.is_read ? "font-semibold text-slate-600" : "font-bold text-slate-800"
                          )}>
                            {notif.title}
                          </p>
                          <p className="text-[11px] text-slate-400 font-semibold mt-0.5 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                          </p>
                        </div>
                        {notif.link && (
                          <ExternalLink className="w-3 h-3 text-slate-300 flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-slate-100 p-3">
                <Link
                  to="/notifications"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-xl transition-all"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 mx-2" />

        <Link to="/settings" className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-all">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">
              {user ? `${user.first_name} ${user.last_name}`.trim() || user.username : 'User'}
            </p>
            <p className="text-xs text-slate-500 mt-1">{user?.role?.replace('_', ' ')}</p>
          </div>
          <div className="w-9 h-9 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
            <UserCircle className="w-7 h-7" />
          </div>
        </Link>
      </div>
    </header>
  );
}
