'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface Booking {
  id: number; user: string; event_type: string; capacity: number;
  date: string; time: string; status: string; payment_status: string;
  payment_method: string; total_amount: number; gcash_reference: string;
  payment_proof: string | null; decline_reason?: string;
}
interface ContactMsg {
  id: number; name: string; email: string; subject: string;
  message: string; reply: string; is_read: boolean;
  replied_at: string | null; created_at: string;
}
interface Reply { id: number; user_id: number; user: string; is_organizer: boolean; comment: string; created_at: string; }
interface ReviewItem { id: number; user: string; rating: number; comment: string; event_type: string | null; created_at: string; replies: Reply[]; }

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = 'w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm';
const btnPrimary = { background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' };

export default function OrganizerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'declined' | 'reviews' | 'analytics' | 'messages' | 'calendar'>('pending');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarBookings, setCalendarBookings] = useState<{id:number;event_type:string;date:string;time:string|null;user:string;capacity:number;whole_day:boolean}[]>([]);
  const [declineModal, setDeclineModal] = useState<{ bookingId: number; reason: string } | null>(null);
  const [contactMessages, setContactMessages] = useState<ContactMsg[]>([]);
  const [replyingMsg, setReplyingMsg] = useState<number | null>(null);
  const [replyMsgText, setReplyMsgText] = useState('');
  const [replyMsgSubmitting, setReplyMsgSubmitting] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [organizerUserId, setOrganizerUserId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editReplySubmitting, setEditReplySubmitting] = useState(false);

  const router = useRouter();
  const { loggingOut, logout } = useLogout();

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem('organizerToken');
    if (localStorage.getItem('clientToken')) { alert('Clients cannot access organizer dashboard!'); router.push('/client/dashboard'); return; }
    if (!token) { router.push('/signin'); return; }
    try {
      const res = await fetch(`${API_BASE}/bookings/`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch { alert('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [router]);

  const loadReviews = useCallback(() => {
    fetch(`${API_BASE}/reviews/`).then(r => r.json()).then(setReviews).catch(() => {});
  }, []);

  const loadCalendar = useCallback((d: Date) => {
    const token = localStorage.getItem('organizerToken');
    if (!token) return;
    fetch(`${API_BASE}/bookings/calendar/?year=${d.getFullYear()}&month=${d.getMonth() + 1}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setCalendarBookings).catch(() => {});
  }, []);

  const loadContactMessages = useCallback(() => {
    const token = localStorage.getItem('organizerToken');
    if (!token) return;
    fetch(`${API_BASE}/contact/messages/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(setContactMessages).catch(() => {});
  }, []);

  useEffect(() => {
    fetchBookings();
    loadReviews();
    loadContactMessages();
    loadCalendar(calendarDate);
    const token = localStorage.getItem('organizerToken');
    if (token) {
      fetch(`${API_BASE}/profile/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setOrganizerUserId(d.id ?? null)).catch(() => {});
    }
  }, [fetchBookings, loadReviews, loadContactMessages, loadCalendar, calendarDate]);

  // Real-time: auto-refresh when a WS notification arrives
  useRealtimeRefresh('organizerToken', (type) => {
    fetchBookings();
    if (type === 'new_review') loadReviews();
    if (type === 'new_message') loadContactMessages();
  });

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    const token = localStorage.getItem('organizerToken');
    setReplySubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/reply/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: replyText }),
      });
      if (res.ok) { setReplyingTo(null); setReplyText(''); loadReviews(); }
    } finally { setReplySubmitting(false); }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm('Delete this reply?')) return;
    const token = localStorage.getItem('organizerToken');
    await fetch(`${API_BASE}/reviews/replies/${replyId}/delete/`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadReviews();
  };

  const handleEditReply = async (replyId: number) => {
    if (!editReplyText.trim()) return;
    const token = localStorage.getItem('organizerToken');
    setEditReplySubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/replies/${replyId}/edit/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: editReplyText }),
      });
      if (res.ok) { setEditingReplyId(null); loadReviews(); }
    } finally { setEditReplySubmitting(false); }
  };


  const handleStatusUpdate = async (bookingId: number, newStatus: string, declineReason?: string) => {
    const token = localStorage.getItem('organizerToken');
    if (!token) { alert('Session expired.'); router.push('/signin'); return; }
    try {
      const res = await fetch(`${API_BASE}/bookings/${bookingId}/status/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus, decline_reason: declineReason || '' }),
      });
      if (res.status === 401) { localStorage.removeItem('organizerToken'); router.push('/signin'); return; }
      if (res.ok) {
        await fetchBookings();
        setActiveTab(newStatus === 'confirmed' ? 'confirmed' : 'declined');
      } else { const e = await res.json(); alert(e.message || 'Failed'); }
    } catch { alert('Connection error.'); }
  };

  const formatTime = (time: string) => {
    if (!time) return 'N/A';
    const [h, m] = time.split(':');
    const hr = parseInt(h); return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
  };
  const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  const filtered = bookings.filter(b =>
    (b.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
     b.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
     b.date.includes(searchQuery)) &&
    (eventTypeFilter === '' || b.event_type === eventTypeFilter) &&
    (dateFilter === '' || b.date === dateFilter)
  );

  const pending = filtered.filter(b => b.status === 'pending');
  const confirmed = filtered.filter(b => b.status === 'confirmed');
  const declined = filtered.filter(b => b.status === 'declined');

  const totalBookings = bookings.length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const upcomingCount = bookings.filter(b => b.status === 'confirmed' && new Date(b.date) >= today).length;
  const eventTypeCounts: Record<string, number> = {};
  bookings.forEach(b => { eventTypeCounts[b.event_type] = (eventTypeCounts[b.event_type] || 0) + 1; });
  const mostPopular = Object.keys(eventTypeCounts).length > 0
    ? Object.entries(eventTypeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] : '—';
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '—';

  const handleReplyMsg = async (msgId: number) => {
    if (!replyMsgText.trim()) return;
    const token = localStorage.getItem('organizerToken');
    setReplyMsgSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/contact/messages/${msgId}/reply/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reply: replyMsgText }),
      });
      if (res.ok) { setReplyingMsg(null); setReplyMsgText(''); loadContactMessages(); }
    } finally { setReplyMsgSubmitting(false); }
  };

  const handleMarkRead = async (msgId: number) => {
    const token = localStorage.getItem('organizerToken');
    await fetch(`${API_BASE}/contact/messages/${msgId}/read/`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    loadContactMessages();
  };

  // Analytics data
  const totalRevenue = bookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total_amount, 0);
  const bookingsByMonth: Record<string, number> = {};
  bookings.forEach(b => {
    const month = new Date(b.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
  });
  const sortedMonths = Object.entries(bookingsByMonth).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()).slice(-6);
  const maxMonthCount = Math.max(...sortedMonths.map(m => m[1]), 1);
  const eventTypeRevenue: Record<string, number> = {};
  bookings.filter(b => b.payment_status === 'paid').forEach(b => {
    eventTypeRevenue[b.event_type] = (eventTypeRevenue[b.event_type] || 0) + b.total_amount;
  });
  const topEventTypes = Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxEventCount = Math.max(...topEventTypes.map(e => e[1]), 1);

  const unreadMsgs = contactMessages.filter(m => !m.is_read).length;

  const tabList = [
    { key: 'pending', label: `Pending (${pending.length})` },
    { key: 'confirmed', label: `Confirmed (${confirmed.length})` },
    { key: 'declined', label: `Declined (${declined.length})` },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
    { key: 'analytics', label: 'Analytics' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'messages', label: `Messages${unreadMsgs > 0 ? ` (${unreadMsgs} new)` : ''}` },
  ] as const;

  const currentList = activeTab === 'pending' ? pending : activeTab === 'confirmed' ? confirmed : activeTab === 'declined' ? declined : [];

  const renderBookingCard = (booking: Booking) => (
    <div key={booking.id} className="rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="h-1" style={{ background: activeTab === 'pending' ? 'linear-gradient(90deg,#22c55e,#16a34a)' : activeTab === 'confirmed' ? 'linear-gradient(90deg,#0ea5e9,#0369a1)' : 'linear-gradient(90deg,#ef4444,#dc2626)' }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="font-black text-white text-sm">{booking.event_type}</p>
            <p className="text-xs text-slate-400 mt-0.5">{booking.user}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-slate-500">{booking.capacity} guests</p>
            {booking.total_amount > 0 && <p className="text-sm font-black text-sky-400 mt-0.5">₱{Number(booking.total_amount).toLocaleString()}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {[{ label: 'Date', value: formatDate(booking.date) }, { label: 'Time', value: formatTime(booking.time) }].map(item => (
            <div key={item.label} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-sky-500 font-bold">{item.label}</p>
              <p className="text-xs text-white font-semibold mt-0.5">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
            booking.payment_status === 'paid' ? 'text-sky-300 bg-sky-900/40' :
            booking.payment_status === 'pending_verification' ? 'text-yellow-300 bg-yellow-900/30' :
            booking.payment_status === 'rejected' ? 'text-red-300 bg-red-900/30' : 'text-slate-400 bg-slate-800'
          }`}>
            {booking.payment_status === 'paid' ? 'Paid' :
             booking.payment_status === 'pending_verification' ? '⚠ Under Review' :
             booking.payment_status === 'rejected' ? 'Rejected' : 'Unpaid'}
          </span>
          {booking.status === 'pending' && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full text-green-300 bg-green-900/30">Pending</span>
          )}
          {booking.payment_method && <span className="text-xs text-slate-500">{booking.payment_method}</span>}
        </div>

        {booking.payment_status === 'pending_verification' && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-xs font-bold text-yellow-300 mb-1">⚠ Manual GCash proof pending verification</p>
            {booking.gcash_reference && <p className="text-xs text-slate-400 mb-2">Ref: <strong className="text-white">{booking.gcash_reference}</strong></p>}
            {booking.payment_proof && (
              <a href={booking.payment_proof} target="_blank" rel="noreferrer">
                <img src={booking.payment_proof} alt="GCash proof"
                  className="w-full rounded-xl mb-2 object-cover cursor-pointer hover:opacity-90"
                  style={{ maxHeight: 180, border: '1px solid rgba(14,165,233,0.2)' }} />
              </a>
            )}
            <div className="flex gap-2 mt-1">
              <button onClick={async () => {
                const token = localStorage.getItem('organizerToken');
                const res = await fetch(`${API_BASE}/bookings/${booking.id}/verify-payment/`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ action: 'approve' }),
                });
                if (res.ok) { alert('Payment approved!'); fetchBookings(); }
                else { const e = await res.json(); alert(e.message || 'Failed'); }
              }} className="flex-1 py-2 text-white text-xs font-bold rounded-xl" style={btnPrimary}>
                Approve Payment
              </button>
              <button onClick={async () => {
                const token = localStorage.getItem('organizerToken');
                const res = await fetch(`${API_BASE}/bookings/${booking.id}/verify-payment/`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ action: 'reject' }),
                });
                if (res.ok) { alert('Payment rejected.'); fetchBookings(); }
                else { const e = await res.json(); alert(e.message || 'Failed'); }
              }} className="flex-1 py-2 text-white text-xs font-bold rounded-xl"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                Reject
              </button>
            </div>
          </div>
        )}

        {booking.payment_status === 'paid' && booking.payment_method === 'GCash' && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <p className="text-xs font-bold text-green-400">✓ GCash payment confirmed via PayMongo</p>
            {booking.gcash_reference && <p className="text-xs text-slate-400 mt-1">Ref: <strong className="text-white">{booking.gcash_reference}</strong></p>}
          </div>
        )}

        {booking.status === 'declined' && booking.decline_reason && (
          <div className="mb-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-bold text-red-400 mb-1">Decline Reason</p>
            <p className="text-xs text-slate-300">{booking.decline_reason}</p>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => handleStatusUpdate(booking.id, 'confirmed')} disabled={loading}
              className="flex-1 py-2.5 text-white text-sm font-black rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-40"
              style={btnPrimary}>
              Accept
            </button>
            <button onClick={() => setDeclineModal({ bookingId: booking.id, reason: '' })} disabled={loading}
              className="flex-1 py-2.5 text-white text-sm font-black rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-40"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <LogoutOverlay visible={loggingOut} />
      <MobileNav brand="Organizer" links={[{ label: 'Logout', onClick: () => logout('organizerToken', '/signin') }]} showNotification notificationTokenKey="organizerToken" />

      {/* Header */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-80 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Organizer Dashboard</h1>
              <p className="text-sky-400 text-sm mt-1">Manage bookings, reviews & payments</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Total', value: totalBookings },
            { label: 'Pending', value: pending.length },
            { label: 'Confirmed', value: confirmed.length },
            { label: 'Declined', value: declined.length },
            { label: 'Upcoming', value: upcomingCount },
            { label: 'Avg Rating', value: avgRating },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-1">{s.label}</p>
              <p className="text-2xl font-black text-white truncate">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="rounded-2xl p-4 flex flex-col sm:flex-row gap-3"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input placeholder="Search event, client, date..." value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)} className={iCls + ' flex-1'} style={iStyle} />
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
            style={{ ...iStyle, colorScheme: 'dark' }} />
          <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-sky-500"
            style={iStyle}>
            <option value="" style={{ background: '#0c2d4a' }}>All Event Types</option>
            {['Birthday', 'Wedding', 'Conference', 'Corporate Event', 'Others'].map(t => (
              <option key={t} value={t} style={{ background: '#0c2d4a' }}>{t}</option>
            ))}
          </select>
        </div>

        {/* Tabs + Content */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Tab bar */}
          <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {tabList.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className="px-5 py-4 text-sm font-black whitespace-nowrap transition-all"
                style={{
                  color: activeTab === tab.key ? '#0ea5e9' : '#64748b',
                  borderBottom: activeTab === tab.key ? '2px solid #0ea5e9' : '2px solid transparent',
                  background: activeTab === tab.key ? 'rgba(14,165,233,0.06)' : 'transparent',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sky-400 text-sm">Loading...</p>
              </div>
            ) : activeTab === 'reviews' ? (
              <div>
                {/* Rating summary */}
                <div className="rounded-2xl p-5 mb-5 flex items-center gap-5"
                  style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                  <div className="text-center shrink-0">
                    <p className="text-5xl font-black text-white">{avgRating}</p>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={parseFloat(avgRating as string) >= s ? 'text-sky-400' : 'text-slate-700'}>★</span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">No reviews yet</div>
                ) : (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="rounded-2xl p-5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-black text-white text-sm">{r.user}</p>
                          </div>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map(s => (
                              <span key={s} className={r.rating >= s ? 'text-sky-400' : 'text-slate-700'}>★</span>
                            ))}
                          </div>
                        </div>
                        {r.comment && <p className="text-sm text-slate-300 italic mb-2">&ldquo;{r.comment}&rdquo;</p>}
                        <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString()}</p>

                        {r.replies?.length > 0 && (
                          <div className="mt-3 pl-3 space-y-2" style={{ borderLeft: '2px solid rgba(14,165,233,0.2)' }}>
                            {r.replies.map(rp => (
                              <div key={rp.id} className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                <div className="flex justify-between items-center">
                                  <span className="text-xs font-bold text-white">
                                    {rp.user}
                                    {rp.is_organizer && <span className="ml-1 px-1.5 py-0.5 rounded text-xs font-bold text-sky-300" style={{ background: 'rgba(14,165,233,0.15)' }}>Organizer</span>}
                                  </span>
                                  <div className="flex gap-2">
                                    {organizerUserId === rp.user_id && editingReplyId !== rp.id && (
                                      <button onClick={() => { setEditingReplyId(rp.id); setEditReplyText(rp.comment); }}
                                        className="text-xs text-sky-400 hover:text-sky-300">Edit</button>
                                    )}
                                    {organizerUserId === rp.user_id && (
                                      <button onClick={() => handleDeleteReply(rp.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                                    )}
                                  </div>
                                </div>
                                {editingReplyId === rp.id ? (
                                  <div className="flex gap-2 mt-2">
                                    <input type="text" value={editReplyText} onChange={e => setEditReplyText(e.target.value)}
                                      className="flex-1 text-xs rounded-xl px-3 py-1.5 text-white outline-none focus:ring-2 focus:ring-sky-500" style={iStyle} />
                                    <button onClick={() => handleEditReply(rp.id)} disabled={editReplySubmitting || !editReplyText.trim()}
                                      className="px-3 py-1.5 text-white text-xs font-bold rounded-xl disabled:opacity-40" style={btnPrimary}>
                                      {editReplySubmitting ? '...' : 'Save'}
                                    </button>
                                    <button onClick={() => setEditingReplyId(null)}
                                      className="px-3 py-1.5 text-xs font-bold rounded-xl text-slate-400" style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-400 mt-1">{rp.comment}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {replyingTo === r.id ? (
                          <div className="flex gap-2 mt-3">
                            <input type="text" value={replyText} onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleReply(r.id)}
                              placeholder="Write a reply..." className="flex-1 text-sm rounded-xl px-3 py-2 text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500" style={iStyle} />
                            <button onClick={() => handleReply(r.id)} disabled={replySubmitting || !replyText.trim()}
                              className="px-4 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-40" style={btnPrimary}>
                              {replySubmitting ? '...' : 'Reply'}
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              className="px-3 py-2 text-xs font-bold rounded-xl text-slate-400" style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setReplyingTo(r.id); setReplyText(''); }}
                            className="text-xs text-sky-400 hover:text-sky-300 mt-2 transition-colors">Reply</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'messages' ? (
              <div className="space-y-4">
                {contactMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-500">No messages yet</div>
                ) : contactMessages.map(msg => (
                  <div key={msg.id} className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${!msg.is_read ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                    {/* Unread indicator bar */}
                    {!msg.is_read && <div className="h-1" style={{ background: 'linear-gradient(90deg, #0ea5e9, #0369a1)' }} />}
                    <div className="p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-white text-sm">{msg.name}</p>
                            {!msg.is_read && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-sky-300" style={{ background: 'rgba(14,165,233,0.15)' }}>New</span>}
                            {msg.replied_at && <span className="px-2 py-0.5 rounded-full text-xs font-bold text-green-300" style={{ background: 'rgba(74,222,128,0.12)' }}>Replied</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{msg.email}</p>
                        </div>
                        <p className="text-xs text-slate-500 shrink-0">{new Date(msg.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>

                      {/* Subject */}
                      <div className="mb-3 px-3 py-2 rounded-xl" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                        <p className="text-xs text-sky-400 font-bold">{msg.subject}</p>
                      </div>

                      {/* Message body */}
                      <p className="text-sm text-slate-300 leading-relaxed mb-3 cursor-pointer"
                        onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)}
                        style={{ display: expandedMsg === msg.id ? 'block' : '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                        {msg.message}
                      </p>
                      {msg.message.length > 150 && (
                        <button onClick={() => setExpandedMsg(expandedMsg === msg.id ? null : msg.id)}
                          className="text-xs text-sky-400 hover:text-sky-300 mb-3">
                          {expandedMsg === msg.id ? 'Show less' : 'Read more'}
                        </button>
                      )}

                      {/* Existing reply */}
                      {msg.reply && (
                        <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
                          <p className="text-xs font-bold text-green-400 mb-1">Your Reply · {msg.replied_at ? new Date(msg.replied_at).toLocaleDateString() : ''}</p>
                          <p className="text-sm text-slate-300">{msg.reply}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        {replyingMsg === msg.id ? (
                          <div className="flex-1 space-y-2">
                            <textarea rows={3} value={replyMsgText} onChange={e => setReplyMsgText(e.target.value)}
                              placeholder="Write your reply..."
                              className={iCls + ' resize-none w-full'} style={iStyle} />
                            <div className="flex gap-2">
                              <button onClick={() => handleReplyMsg(msg.id)} disabled={replyMsgSubmitting || !replyMsgText.trim()}
                                className="flex-1 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-40"
                                style={btnPrimary}>
                                {replyMsgSubmitting ? 'Sending...' : 'Send Reply'}
                              </button>
                              <button onClick={() => { setReplyingMsg(null); setReplyMsgText(''); }}
                                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-400"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button onClick={() => { setReplyingMsg(msg.id); setReplyMsgText(msg.reply || ''); }}
                              className="flex-1 py-2 text-white text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5"
                              style={btnPrimary}>
                              {msg.reply ? 'Edit Reply' : 'Reply'}
                            </button>
                            {!msg.is_read && (
                              <button onClick={() => handleMarkRead(msg.id)}
                                className="px-4 py-2 text-xs font-bold rounded-xl text-slate-400 transition-all"
                                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                                Mark Read
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'calendar' ? (() => {
              const year = calendarDate.getFullYear();
              const month = calendarDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({length: daysInMonth}, (_, i) => i + 1)];
              while (cells.length % 7 !== 0) cells.push(null);
              const todayStr = new Date().toISOString().split('T')[0];
              const bookingsByDay: Record<number, typeof calendarBookings> = {};
              calendarBookings.forEach(b => {
                const day = new Date(b.date).getDate();
                if (!bookingsByDay[day]) bookingsByDay[day] = [];
                bookingsByDay[day].push(b);
              });
              return (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <button onClick={() => { const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); setCalendarDate(d); loadCalendar(d); }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl text-sky-400" style={{ background: 'rgba(14,165,233,0.1)' }}>← Prev</button>
                    <p className="text-white font-black">{calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                    <button onClick={() => { const d = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); setCalendarDate(d); loadCalendar(d); }}
                      className="px-3 py-1.5 text-xs font-bold rounded-xl text-sky-400" style={{ background: 'rgba(14,165,233,0.1)' }}>Next →</button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 mb-1">
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
                      <div key={d} className="text-center text-xs font-bold text-slate-500 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {cells.map((day, i) => {
                      const dateStr = day ? `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}` : '';
                      const isToday = dateStr === todayStr;
                      const dayBookings = day ? (bookingsByDay[day] || []) : [];
                      return (
                        <div key={i} className="rounded-xl p-1.5 min-h-[64px]"
                          style={{ background: day ? (isToday ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.03)') : 'transparent', border: day ? (isToday ? '1px solid rgba(14,165,233,0.4)' : '1px solid rgba(255,255,255,0.05)') : 'none' }}>
                          {day && (
                            <>
                              <p className={`text-xs font-bold mb-1 ${isToday ? 'text-sky-400' : 'text-slate-400'}`}>{day}</p>
                              {dayBookings.map(b => (
                                <div key={b.id} className="text-xs px-1.5 py-0.5 rounded-lg mb-0.5 truncate font-bold"
                                  style={{ background: 'rgba(14,165,233,0.2)', color: '#38bdf8' }}
                                  title={`${b.event_type} — ${b.user}`}>
                                  {b.event_type}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {calendarBookings.length > 0 && (
                    <div className="mt-5 space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">This Month</p>
                      {calendarBookings.map(b => (
                        <div key={b.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                          style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.12)' }}>
                          <div>
                            <p className="text-xs font-bold text-white">{b.event_type}</p>
                            <p className="text-xs text-slate-400">{b.user} · {b.capacity} guests</p>
                          </div>
                          <p className="text-xs font-bold text-sky-400">{b.date}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })() : activeTab === 'analytics' ? (
              <div className="space-y-6">
                {/* Revenue summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
                    { label: 'Paid Bookings', value: bookings.filter(b => b.payment_status === 'paid').length },
                    { label: 'Most Popular', value: mostPopular },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-5 text-center"
                      style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                      <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-2">{s.label}</p>
                      <p className="text-2xl font-black text-white truncate">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Bookings per month bar chart */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">Bookings per Month</p>
                  {sortedMonths.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No data yet</p>
                  ) : (
                    <div className="flex items-end gap-3 h-40">
                      {sortedMonths.map(([month, count]) => (
                        <div key={month} className="flex-1 flex flex-col items-center gap-2">
                          <span className="text-xs font-bold text-sky-400">{count}</span>
                          <div className="w-full rounded-t-lg transition-all"
                            style={{ height: `${(count / maxMonthCount) * 100}px`, background: 'linear-gradient(180deg, #0ea5e9, #0369a1)', minHeight: 4 }} />
                          <span className="text-xs text-slate-500 text-center leading-tight">{month}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Monthly ranking */}
                {(() => {
                  const now = new Date();
                  const monthLabel = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                  const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
                  const monthlyCount: Record<string, number> = {};
                  bookings.forEach(b => {
                    const d = new Date(b.date);
                    if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) {
                      monthlyCount[b.event_type] = (monthlyCount[b.event_type] || 0) + 1;
                    }
                  });
                  const ranked = Object.entries(monthlyCount).sort((a, b) => b[1] - a[1]);
                  const maxRank = Math.max(...ranked.map(r => r[1]), 1);
                  return (
                    <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between mb-5">
                        <p className="text-sm font-black text-white">Monthly Event Ranking</p>
                        <span className="text-xs font-bold px-3 py-1 rounded-full text-sky-300" style={{ background: 'rgba(14,165,233,0.12)' }}>{monthLabel}</span>
                      </div>
                      {ranked.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-8">No bookings this month</p>
                      ) : (
                        <div className="space-y-3">
                          {ranked.map(([type, count], i) => (
                            <div key={type}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-bold text-white">#{i + 1} {type}</span>
                                <span className="text-xs text-sky-400 font-bold">{count} booking{count !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-2 rounded-full transition-all"
                                  style={{ width: `${(count / maxRank) * 100}%`, background: i === 0 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : i === 1 ? 'linear-gradient(90deg,#94a3b8,#64748b)' : i === 2 ? 'linear-gradient(90deg,#b45309,#92400e)' : 'linear-gradient(90deg,#0ea5e9,#0369a1)' }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Popular event types */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">Popular Event Types (All Time)</p>
                  {topEventTypes.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No data yet</p>
                  ) : (
                    <div className="space-y-3">
                      {topEventTypes.map(([type, count]) => (
                        <div key={type}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-bold text-white">{type}</span>
                            <span className="text-xs text-sky-400 font-bold">{count} booking{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-2 rounded-full transition-all"
                              style={{ width: `${(count / maxEventCount) * 100}%`, background: 'linear-gradient(90deg, #0ea5e9, #0369a1)' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Revenue by event type */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">Revenue by Event Type</p>
                  {Object.keys(eventTypeRevenue).length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No paid bookings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(eventTypeRevenue).sort((a, b) => b[1] - a[1]).map(([type, rev]) => (
                        <div key={type} className="flex items-center justify-between p-3 rounded-xl"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <span className="text-sm font-bold text-white">{type}</span>
                          <span className="text-sm font-black text-sky-400">₱{rev.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : currentList.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                  <svg className="w-7 h-7 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white font-black">No {activeTab} bookings</p>
                <p className="text-slate-500 text-sm mt-1">Nothing here yet.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentList.map(renderBookingCard)}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Decline reason modal */}
      {declineModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0c2d4a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Decline Booking</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Provide a reason so the client knows why their booking was declined.</p>
            <textarea
              rows={4}
              placeholder="e.g. Date is unavailable, venue is already booked for another event..."
              value={declineModal.reason}
              onChange={e => setDeclineModal({ ...declineModal, reason: e.target.value })}
              className={iCls}
              style={{ ...iStyle, resize: 'none', width: '100%', boxSizing: 'border-box', marginBottom: 16 }}
            />
            <div className="flex gap-3">
              <button
                onClick={async () => {
                  if (!declineModal.reason.trim()) { alert('Please enter a reason.'); return; }
                  await handleStatusUpdate(declineModal.bookingId, 'declined', declineModal.reason);
                  setDeclineModal(null);
                }}
                className="flex-1 py-3 text-white font-black rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.5)' }}>
                Confirm Decline
              </button>
              <button
                onClick={() => setDeclineModal(null)}
                className="px-6 py-3 font-black rounded-xl text-slate-400 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
