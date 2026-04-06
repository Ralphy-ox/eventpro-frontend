'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { API_BASE, WS_BASE } from '@/lib/api';

interface Notif {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: string;
}

interface Props {
  tokenKey?: string; // 'clientToken' | 'organizerToken'
}

export default function NotificationBell({ tokenKey = 'clientToken' }: Props) {
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const ref = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const showToast = useCallback((message: string, type: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);

    // Browser notification if tab not focused
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('EventPro', { body: message, icon: '/favicon.ico' });
    }
  }, []);

  const loadNotifs = useCallback(async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifs(data.notifications);
        setUnread(data.unread_count);
      }
    } catch {}
  }, [tokenKey]);

  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;
    const token = localStorage.getItem(tokenKey);
    if (!token) return;

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }

    setWsStatus('connecting');
    const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setWsStatus('connected');
      // Keepalive ping every 25s
      pingTimer.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 25000);
    };

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected' || data.type === 'pong') return;

        // New notification received
        const newNotif: Notif = {
          id: Date.now(),
          message: data.message,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        setNotifs(prev => [newNotif, ...prev]);
        setUnread(prev => prev + 1);
        showToast(data.message, data.type || 'info');
      } catch {}
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setWsStatus('disconnected');
      if (pingTimer.current) clearInterval(pingTimer.current);
      // Auto-reconnect after 4 seconds
      reconnectTimer.current = setTimeout(() => {
        if (mountedRef.current && localStorage.getItem(tokenKey)) {
          connectWS();
        }
      }, 4000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [tokenKey, showToast]);

  useEffect(() => {
    mountedRef.current = true;
    loadNotifs();
    connectWS();

    // Request browser notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      mountedRef.current = false;
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (pingTimer.current) clearInterval(pingTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [loadNotifs, connectWS]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = async () => {
    setOpen(o => !o);
    if (!open && unread > 0) {
      const token = localStorage.getItem(tokenKey);
      if (!token) return;
      await fetch(`${API_BASE}/notifications/read/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnread(0);
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const handleClear = async () => {
    const token = localStorage.getItem(tokenKey);
    if (!token) return;
    await fetch(`${API_BASE}/notifications/clear/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifs([]);
    setUnread(0);
  };

  const toastColor = (type: string) => {
    if (type === 'booking_confirmed') return 'from-green-500 to-emerald-600';
    if (type === 'booking_declined') return 'from-red-500 to-rose-600';
    if (type === 'reminder_24h' || type === 'reminder_1h') return 'from-amber-500 to-orange-500';
    if (type === 'new_booking') return 'from-blue-500 to-indigo-600';
    return 'from-sky-500 to-blue-600';
  };

  const notifBorderColor = (msg: string) => {
    if (msg.includes('confirmed')) return 'border-l-2 border-green-400';
    if (msg.includes('declined')) return 'border-l-2 border-red-400';
    if (msg.includes('minutes') || msg.includes('tomorrow')) return 'border-l-2 border-amber-400';
    if (msg.includes('new booking') || msg.includes('submitted')) return 'border-l-2 border-blue-400';
    return 'border-l-2 border-sky-400';
  };

  return (
    <>
      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className={`bg-gradient-to-r ${toastColor(toast.type)} text-white px-4 py-3 rounded-2xl shadow-2xl max-w-sm text-sm font-semibold flex items-start gap-3 pointer-events-auto animate-in`}
            style={{ animation: 'slideIn 0.3s ease-out' }}>
            <span className="text-lg shrink-0">
              {toast.type === 'booking_confirmed' ? '✅' :
               toast.type === 'booking_declined' ? '❌' :
               toast.type === 'new_booking' ? '📋' : '🔔'}
            </span>
            <p className="leading-snug">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Bell button */}
      <div ref={ref} className="relative">
        <button onClick={handleOpen}
          className="relative p-2 rounded-xl transition-all hover:bg-white/10"
          title={wsStatus === 'connected' ? 'Notifications (live)' : 'Notifications'}>
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>

          {/* Unread badge */}
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}

          {/* Live indicator dot */}
          <span className={`absolute bottom-1 right-1 w-2 h-2 rounded-full border border-slate-900 ${
            wsStatus === 'connected' ? 'bg-green-400' :
            wsStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
          }`} />
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{ background: 'rgba(10,22,40,0.98)', border: '1px solid rgba(14,165,233,0.2)', backdropFilter: 'blur(20px)' }}>

            <div className="flex justify-between items-center px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center gap-2">
                <span className="font-black text-white text-sm">Notifications</span>
                <span className={`w-2 h-2 rounded-full ${
                  wsStatus === 'connected' ? 'bg-green-400' :
                  wsStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'
                }`} title={wsStatus} />
              </div>
              {notifs.length > 0 && (
                <button onClick={handleClear} className="text-xs text-red-400 hover:text-red-300 transition-colors font-semibold">
                  Clear all
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifs.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-3xl mb-2">🔔</p>
                  <p className="text-slate-500 text-sm">No notifications yet</p>
                </div>
              ) : (
                notifs.map(n => (
                  <div key={n.id}
                    className={`px-4 py-3 text-sm ${notifBorderColor(n.message)} ${
                      n.is_read ? 'text-slate-400' : 'text-white font-semibold'
                    }`}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: n.is_read ? 'transparent' : 'rgba(14,165,233,0.05)' }}>
                    <p className="leading-snug">{n.message}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(n.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}
