'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface Booking {
  id: number; user: string; event_type: string; capacity: number;
  description?: string;
  date: string; time: string | null; status: string; payment_status: string;
  payment_method: string; total_amount: number; gcash_reference: string;
  reference_number?: string;
  payment_proof: string | null; decline_reason?: string;
  damage_count?: number; damage_total_cost?: number;
  client_email?: string; client_address?: string;
  location?: string;
  event_details?: Record<string, string>;
  invited_emails?: string;
  special_requests?: string;
  whole_day?: boolean;
  time_slot?: string;
  created_at?: string;
  cancel_reason?: string;
}
interface DamageReport {
  id: number; booking_id: number; booking_event_type: string; booking_date: string;
  client_name: string; item_type: string; item_name: string; quantity: number;
  estimated_cost: number; recovered_amount: number; net_loss: number;
  charge_to_client: boolean; status: string; notes: string; photo: string | null;
  reported_by: string | null; created_at: string; updated_at: string;
}
interface DamageSummary {
  gross_revenue: number; total_damage_cost: number; total_recovered: number;
  total_net_loss: number; net_profit: number; damage_reports_count: number;
}
interface ContactMsg {
  id: number; name: string; email: string; subject: string;
  message: string; reply: string; is_read: boolean;
  replied_at: string | null; created_at: string;
}
interface Reply { id: number; user_id: number; user: string; is_organizer: boolean; comment: string; created_at: string; }
interface ReviewItem { id: number; user: string; rating: number; comment: string; event_type: string | null; created_at: string; replies: Reply[]; }
interface EventTypeOption { event_type: string; }

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = 'w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm';
const btnPrimary = { background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' };
const chartGrid = 'rgba(148,163,184,0.15)';
const chartAxis = '#64748b';
const chartText = '#cbd5e1';
const eventLineColors = ['#38bdf8', '#22c55e', '#f59e0b', '#f97316', '#a855f7', '#ef4444', '#14b8a6', '#eab308'];
const LEGACY_EVENT_TYPES = new Set(['Birthday', 'Wedding', 'Conference', 'Corporate Event', 'Concert', 'Debu']);

export default function OrganizerDashboard() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'declined' | 'reviews' | 'analytics' | 'messages' | 'calendar' | 'damages'>('pending');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarBookings, setCalendarBookings] = useState<{id:number;event_type:string;date:string;time:string|null;user:string;capacity:number;whole_day:boolean}[]>([]);
  const [declineModal, setDeclineModal] = useState<{ bookingId: number; reason: string } | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [contactMessages, setContactMessages] = useState<ContactMsg[]>([]);
  const [replyingMsg, setReplyingMsg] = useState<number | null>(null);
  const [replyMsgText, setReplyMsgText] = useState('');
  const [replyMsgSubmitting, setReplyMsgSubmitting] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [availableEventTypes, setAvailableEventTypes] = useState<string[]>([]);
  const [organizerUserId, setOrganizerUserId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editReplySubmitting, setEditReplySubmitting] = useState(false);
  const [analyticsEventType, setAnalyticsEventType] = useState('all');
  const [damageModal, setDamageModal] = useState<{ bookingId: number; eventType: string } | null>(null);
  const [damageForm, setDamageForm] = useState({ item_type: 'other', item_name: '', quantity: '1', estimated_cost: '', recovered_amount: '0', charge_to_client: false, status: 'reported', notes: '' });
  const [damagePhoto, setDamagePhoto] = useState<File | null>(null);
  const [damageSubmitting, setDamageSubmitting] = useState(false);
  const [damageReports, setDamageReports] = useState<DamageReport[]>([]);
  const [damageSummary, setDamageSummary] = useState<DamageSummary>({
    gross_revenue: 0,
    total_damage_cost: 0,
    total_recovered: 0,
    total_net_loss: 0,
    net_profit: 0,
    damage_reports_count: 0,
  });

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

  const loadEventTypes = useCallback(() => {
    fetch(`${API_BASE}/event-types/`)
      .then(r => r.ok ? r.json() : [])
      .then((data: EventTypeOption[]) => {
        const eventTypes = Array.isArray(data)
          ? data.map((item) => item.event_type).filter(Boolean)
          : [];
        setAvailableEventTypes(eventTypes);
      })
      .catch(() => {});
  }, []);

  const loadDamages = useCallback(() => {
    const token = localStorage.getItem('organizerToken');
    if (!token) return;
    fetch(`${API_BASE}/damages/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) return { reports: [], summary: null };
        return r.json();
      })
      .then((data) => {
        setDamageReports(Array.isArray(data?.reports) ? data.reports : []);
        setDamageSummary(data?.summary ?? {
          gross_revenue: 0,
          total_damage_cost: 0,
          total_recovered: 0,
          total_net_loss: 0,
          net_profit: 0,
          damage_reports_count: 0,
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchBookings();
    loadReviews();
    loadContactMessages();
    loadEventTypes();
    loadDamages();
    loadCalendar(calendarDate);
    const token = localStorage.getItem('organizerToken');
    if (token) {
      fetch(`${API_BASE}/profile/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json()).then(d => setOrganizerUserId(d.id ?? null)).catch(() => {});
    }
  }, [fetchBookings, loadReviews, loadContactMessages, loadEventTypes, loadDamages, loadCalendar, calendarDate]);

  // Real-time: auto-refresh when a WS notification arrives
  useRealtimeRefresh('organizerToken', (type) => {
    fetchBookings();
    loadDamages();
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

  const formatTime = (time: string | null | undefined) => {
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
  const venueBookings = bookings.filter((booking) => !LEGACY_EVENT_TYPES.has(booking.event_type));
  const eventTypeCounts: Record<string, number> = {};
  venueBookings.forEach(b => { eventTypeCounts[b.event_type] = (eventTypeCounts[b.event_type] || 0) + 1; });
  const mostPopular = Object.keys(eventTypeCounts).length > 0
    ? Object.entries(eventTypeCounts).reduce((a, b) => a[1] > b[1] ? a : b)[0] : 'No venue data';
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

  const handleReportDamage = async () => {
    if (!damageModal) return;
    if (!damageForm.item_name.trim()) { alert('Item name is required.'); return; }
    if (!damageForm.estimated_cost || parseFloat(damageForm.estimated_cost) < 0) { alert('Please enter a valid estimated cost.'); return; }
    const token = localStorage.getItem('organizerToken');
    setDamageSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(damageForm).forEach(([k, v]) => fd.append(k, String(v)));
      if (damagePhoto) fd.append('photo', damagePhoto);
      const res = await fetch(`${API_BASE}/bookings/${damageModal.bookingId}/damages/report/`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      });
      const data = await res.json();
      if (res.ok) {
        alert('Damage report saved!');
        setDamageModal(null);
        setDamageForm({ item_type: 'other', item_name: '', quantity: '1', estimated_cost: '', recovered_amount: '0', charge_to_client: false, status: 'reported', notes: '' });
        setDamagePhoto(null);
        loadDamages();
      } else { alert(data.message || 'Failed to save damage report.'); }
    } finally { setDamageSubmitting(false); }
  };

  const handleMarkRead = async (msgId: number) => {
    const token = localStorage.getItem('organizerToken');
    await fetch(`${API_BASE}/contact/messages/${msgId}/read/`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    loadContactMessages();
  };

  // Analytics data
  const totalRevenue = damageSummary.gross_revenue || venueBookings.filter(b => b.payment_status === 'paid').reduce((s, b) => s + b.total_amount, 0);
  const eventTypeRevenue: Record<string, number> = {};
  venueBookings.filter(b => b.payment_status === 'paid').forEach(b => {
    eventTypeRevenue[b.event_type] = (eventTypeRevenue[b.event_type] || 0) + b.total_amount;
  });
  const topEventTypes = Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxEventCount = Math.max(...topEventTypes.map(([, count]) => count), 1);
  const analyticsEventTypes = [
    'all',
    ...Array.from(new Set([...availableEventTypes, ...Object.keys(eventTypeCounts)])).filter((type) => !LEGACY_EVENT_TYPES.has(type)).sort((a, b) => a.localeCompare(b)),
  ];
  const filterEventTypes = Array.from(
    new Set([...availableEventTypes, ...bookings.map((booking) => booking.event_type).filter(Boolean)])
  ).filter((type) => !LEGACY_EVENT_TYPES.has(type)).sort((a, b) => a.localeCompare(b));
  const analyticsBookings = venueBookings.filter((booking) =>
    analyticsEventType === 'all' || booking.event_type === analyticsEventType
  );
  const analyticsPaidBookings = analyticsBookings.filter((booking) => booking.payment_status === 'paid');
  const analyticsRevenue = analyticsPaidBookings.reduce((sum, booking) => sum + booking.total_amount, 0);
  const analyticsConfirmedCount = analyticsBookings.filter((booking) => booking.status === 'confirmed').length;
  const analyticsMostPopular = analyticsEventType === 'all'
    ? mostPopular
    : analyticsBookings.length > 0
      ? analyticsEventType
      : '—';

  const monthlyMap = new Map<string, { month: string; bookings: number; confirmed: number; paid: number; revenue: number }>();
  analyticsBookings.forEach((booking) => {
    const bookingDate = new Date(booking.date);
    if (Number.isNaN(bookingDate.getTime())) {
      return;
    }

    const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyMap.has(monthKey)) {
      monthlyMap.set(monthKey, {
        month: bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        bookings: 0,
        confirmed: 0,
        paid: 0,
        revenue: 0,
      });
    }

    const currentMonth = monthlyMap.get(monthKey)!;
    currentMonth.bookings += 1;
    if (booking.status === 'confirmed') {
      currentMonth.confirmed += 1;
    }
    if (booking.payment_status === 'paid') {
      currentMonth.paid += 1;
      currentMonth.revenue += booking.total_amount;
    }
  });

  const monthlyAnalytics = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([, value]) => value);
  const latestRevenueMonth = monthlyAnalytics.length > 0 ? monthlyAnalytics[monthlyAnalytics.length - 1] : null;
  const previousRevenueMonth = monthlyAnalytics.length > 1 ? monthlyAnalytics[monthlyAnalytics.length - 2] : null;
  const revenueDifference = latestRevenueMonth ? latestRevenueMonth.revenue - (previousRevenueMonth?.revenue ?? 0) : 0;
  const revenuePercentChange = previousRevenueMonth?.revenue
    ? (revenueDifference / previousRevenueMonth.revenue) * 100
    : null;
  const revenueTrendLabel = revenueDifference > 0 ? 'up' : revenueDifference < 0 ? 'down' : 'flat';

  const monthlyEventSeriesMap = new Map<string, { month: string; [eventType: string]: string | number }>();
  venueBookings.forEach((booking) => {
    const bookingDate = new Date(booking.date);
    if (Number.isNaN(bookingDate.getTime())) {
      return;
    }

    const monthKey = `${bookingDate.getFullYear()}-${String(bookingDate.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyEventSeriesMap.has(monthKey)) {
      monthlyEventSeriesMap.set(monthKey, {
        month: bookingDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      });
    }

    const currentMonth = monthlyEventSeriesMap.get(monthKey)!;
    currentMonth[booking.event_type] = Number(currentMonth[booking.event_type] || 0) + 1;
  });

  const monthlyEventSeries = Array.from(monthlyEventSeriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([, value]) => value);

  const allEventsGraphTypes = Array.from(
    new Set(
      monthlyEventSeries.flatMap((entry) =>
        Object.keys(entry).filter((key) => key !== 'month' && Number(entry[key]) > 0)
      )
    )
  ).sort((a, b) => a.localeCompare(b));

  const eventTypeBreakdown = Object.entries(
    analyticsBookings.reduce<Record<string, { bookings: number; revenue: number }>>((acc, booking) => {
      if (!acc[booking.event_type]) {
        acc[booking.event_type] = { bookings: 0, revenue: 0 };
      }
      acc[booking.event_type].bookings += 1;
      if (booking.payment_status === 'paid') {
        acc[booking.event_type].revenue += booking.total_amount;
      }
      return acc;
    }, {})
  )
    .map(([type, value]) => ({
      type,
      bookings: value.bookings,
      revenue: value.revenue,
    }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  const unreadMsgs = contactMessages.filter(m => !m.is_read).length;

  const tabList = [
    { key: 'pending', label: `Pending (${pending.length})` },
    { key: 'confirmed', label: `Confirmed (${confirmed.length})` },
    { key: 'declined', label: `Declined (${declined.length})` },
    { key: 'reviews', label: `Reviews (${reviews.length})` },
    { key: 'analytics', label: 'Analytics' },
    { key: 'damages', label: `Damages (${damageSummary.damage_reports_count})` },
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
          {!!booking.damage_count && booking.damage_count > 0 && (
            <span className="px-2.5 py-1 text-xs font-bold rounded-full text-red-300 bg-red-900/30">
              {booking.damage_count} damage report{booking.damage_count > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {expandedBookingId === booking.id && (
          <div className="mb-3 rounded-xl p-3" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.14)' }}>
            <p className="text-xs font-bold text-sky-400 uppercase tracking-widest mb-2">Booking Details</p>
            <div className="space-y-2 text-xs">
              <p className="text-slate-300"><span className="text-slate-500">Venue:</span> {booking.event_type}</p>
              <p className="text-slate-300"><span className="text-slate-500">Client:</span> {booking.user}</p>
              {booking.reference_number && (
                <p className="text-slate-300"><span className="text-slate-500">Reference No.:</span> <span className="font-black text-sky-300">{booking.reference_number}</span></p>
              )}
              <p className="text-slate-300"><span className="text-slate-500">Description:</span> {booking.description || 'No description submitted.'}</p>
              <p className="text-slate-300"><span className="text-slate-500">Guests:</span> {booking.capacity}</p>
              <p className="text-slate-300"><span className="text-slate-500">Schedule:</span> {formatDate(booking.date)} | {formatTime(booking.time)}</p>
              <p className="text-slate-300"><span className="text-slate-500">Payment method:</span> {booking.payment_method || 'N/A'}</p>
              {booking.client_email && (
                <p className="text-slate-300"><span className="text-slate-500">Client email:</span> {booking.client_email}</p>
              )}
              {booking.client_address && (
                <p className="text-slate-300"><span className="text-slate-500">Client address:</span> {booking.client_address}</p>
              )}
              {booking.special_requests && (
                <p className="text-slate-300"><span className="text-slate-500">Special requests:</span> {booking.special_requests}</p>
              )}
              {booking.invited_emails && (
                <p className="text-slate-300 break-words"><span className="text-slate-500">Invited guests:</span> {booking.invited_emails}</p>
              )}
              {Object.entries(booking.event_details || {}).map(([key, value]) => (
                <p key={key} className="text-slate-300 break-words">
                  <span className="text-slate-500">{key.replace(/_/g, ' ')}:</span> {String(value)}
                </p>
              ))}
              {!booking.client_email && !booking.client_address && !booking.special_requests && !booking.invited_emails && Object.keys(booking.event_details || {}).length === 0 && (
                <p className="text-slate-500">No extra client-submitted fields for this booking.</p>
              )}
            </div>
          </div>
        )}

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

        {booking.payment_method === 'GCash' && booking.payment_status === 'pending' && (
          <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
            <p className="text-xs font-bold text-sky-300 mb-1">GCash — Awaiting proof from client</p>
            {booking.gcash_reference && <p className="text-xs text-slate-400">Ref: <strong className="text-white">{booking.gcash_reference}</strong></p>}
            {booking.payment_proof && (
              <a href={booking.payment_proof} target="_blank" rel="noreferrer">
                <img src={booking.payment_proof} alt="GCash proof" className="w-full rounded-xl mt-2 object-cover hover:opacity-90" style={{ maxHeight: 180, border: '1px solid rgba(14,165,233,0.2)' }} />
              </a>
            )}
          </div>
        )}

        {booking.status === 'declined' && booking.decline_reason && (
          <div className="mb-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-xs font-bold text-red-400 mb-1">Decline Reason</p>
            <p className="text-xs text-slate-300">{booking.decline_reason}</p>
          </div>
        )}

        {activeTab === 'confirmed' && (
          <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
              className="px-4 py-2.5 text-white text-sm font-black rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {expandedBookingId === booking.id ? 'Hide Details' : 'View Details'}
            </button>
            <button onClick={() => setDamageModal({ bookingId: booking.id, eventType: booking.event_type })}
              className="flex-1 py-2.5 text-white text-sm font-black rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>
              Report Damage
            </button>
          </div>
        )}
        {activeTab === 'pending' && (
          <div className="flex gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setExpandedBookingId(expandedBookingId === booking.id ? null : booking.id)}
              className="px-4 py-2.5 text-white text-sm font-black rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              {expandedBookingId === booking.id ? 'Hide Details' : 'View Details'}
            </button>
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
      <MobileNav brand="Owner" links={[{ label: 'Logout', onClick: () => logout('organizerToken', '/signin') }]} showNotification notificationTokenKey="organizerToken" />

      {/* Header */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-80 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 relative z-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Owner Dashboard</h1>
              <p className="text-sky-400 text-sm mt-1">Manage bookings, reviews, damages, and profit</p>
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
            <option value="" style={{ background: '#0c2d4a' }}>All Venues</option>
            {filterEventTypes.map(t => (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
                  {[
                    { label: 'Total Revenue', value: `₱${totalRevenue.toLocaleString()}` },
                    { label: 'Confirmed Bookings', value: analyticsConfirmedCount },
                    { label: 'Popular Venue', value: analyticsMostPopular },
                    { label: 'Damage Cost', value: `₱${damageSummary.total_damage_cost.toLocaleString()}` },
                    { label: 'Net Profit', value: `₱${damageSummary.net_profit.toLocaleString()}` },
                  ].map(s => (
                    <div key={s.label} className="rounded-2xl p-5 text-center"
                      style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                      <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-2">{s.label}</p>
                      <p className="text-2xl font-black text-white truncate">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                    <div>
                      <p className="text-sm font-black text-white">Venue Analytics Graphs</p>
                      <p className="text-xs text-slate-400 mt-1">Filter by venue and review monthly booking trends.</p>
                    </div>
                    <select
                      value={analyticsEventType}
                      onChange={(e) => setAnalyticsEventType(e.target.value)}
                      className={iCls + ' sm:w-auto min-w-[220px]'}
                      style={iStyle}
                    >
                      {analyticsEventTypes.map((eventType) => (
                        <option key={eventType} value={eventType} style={{ background: '#0f172a', color: '#e2e8f0' }}>
                          {eventType === 'all' ? 'All Venues' : eventType}
                        </option>
                      ))}
                    </select>
                  </div>
                  {monthlyAnalytics.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No venue analytics data yet for this selection.</p>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                        <p className="text-sm font-black text-white mb-1">
                          {analyticsEventType === 'all' ? 'Monthly Bookings by Venue' : `Bookings Trend for ${analyticsEventType}`}
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                          {analyticsEventType === 'all'
                            ? 'Each line represents one venue so you can compare monthly demand in one graph.'
                            : 'This view focuses on the selected venue and shows its monthly booking and confirmed trend.'}
                        </p>
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analyticsEventType === 'all' ? monthlyEventSeries : monthlyAnalytics}>
                              <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                              <XAxis dataKey="month" stroke={chartAxis} tick={{ fill: chartAxis, fontSize: 12 }} />
                              <YAxis allowDecimals={false} stroke={chartAxis} tick={{ fill: chartAxis, fontSize: 12 }} />
                              <Tooltip
                                contentStyle={{ background: '#0f172a', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 12, color: chartText }}
                                labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                              />
                              <Legend wrapperStyle={{ fontSize: '12px' }} />
                              {analyticsEventType === 'all' ? (
                                allEventsGraphTypes.map((eventType, index) => (
                                  <Line
                                    key={eventType}
                                    type="monotone"
                                    dataKey={eventType}
                                    stroke={eventLineColors[index % eventLineColors.length]}
                                    strokeWidth={2.5}
                                    dot={{ r: 3 }}
                                    activeDot={{ r: 5 }}
                                    name={eventType}
                                    connectNulls
                                  />
                                ))
                              ) : (
                                <>
                                  <Line type="monotone" dataKey="bookings" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Bookings" />
                                  <Line type="monotone" dataKey="confirmed" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} name="Confirmed" />
                                </>
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                      <div className="rounded-2xl p-4" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                        <p className="text-sm font-black text-white mb-1">Monthly Revenue</p>
                        <p className="text-xs text-slate-400 mb-3">
                          {analyticsEventType === 'all'
                            ? `Current paid venue revenue: PHP ${analyticsRevenue.toLocaleString()}`
                            : `${analyticsEventType} venue revenue: PHP ${analyticsRevenue.toLocaleString()}`}
                        </p>
                        {latestRevenueMonth && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                            <div className="rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,0.14)' }}>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">Latest Month</p>
                              <p className="text-sm font-black text-white">{latestRevenueMonth.month}</p>
                              <p className="text-lg font-black text-sky-400 mt-1">PHP {latestRevenueMonth.revenue.toLocaleString()}</p>
                            </div>
                            <div className="rounded-xl p-3" style={{ background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(148,163,184,0.14)' }}>
                              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-1">Compared To</p>
                              <p className="text-sm font-black text-white">{previousRevenueMonth?.month ?? 'No previous month yet'}</p>
                              <p className="text-sm font-bold mt-1" style={{ color: revenueDifference > 0 ? '#22c55e' : revenueDifference < 0 ? '#f87171' : '#cbd5e1' }}>
                                {previousRevenueMonth
                                  ? `${revenueDifference >= 0 ? '+' : '-'}PHP ${Math.abs(revenueDifference).toLocaleString()} ${revenueTrendLabel}`
                                  : 'Need one more month to compare'}
                              </p>
                              <p className="text-xs text-slate-400 mt-1">
                                {previousRevenueMonth
                                  ? revenuePercentChange !== null
                                    ? `${revenueDifference >= 0 ? '+' : ''}${revenuePercentChange.toFixed(1)}% versus ${previousRevenueMonth.month}`
                                    : previousRevenueMonth.revenue === 0
                                      ? 'Previous month revenue was PHP 0'
                                      : 'Comparison unavailable'
                                  : 'Month-to-month comparison will appear automatically once there are at least two months of paid revenue.'}
                              </p>
                            </div>
                          </div>
                        )}
                        <div className="h-72">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyAnalytics}>
                              <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                              <XAxis dataKey="month" stroke={chartAxis} tick={{ fill: chartAxis, fontSize: 12 }} />
                              <YAxis stroke={chartAxis} tick={{ fill: chartAxis, fontSize: 12 }} />
                              <Tooltip
                                formatter={(value) => [`PHP ${Number(value ?? 0).toLocaleString()}`, 'Revenue']}
                                contentStyle={{ background: '#0f172a', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 12, color: chartText }}
                                labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                              />
                              <Bar dataKey="revenue" radius={[10, 10, 0, 0]} name="Revenue">
                                {monthlyAnalytics.map((entry) => (
                                  <Cell key={`revenue-${entry.month}`} fill={entry.revenue > 0 ? '#0ea5e9' : '#1e293b'} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">
                    {analyticsEventType === 'all' ? 'Popular Venues' : `Breakdown While Viewing ${analyticsEventType}`}
                  </p>
                  {eventTypeBreakdown.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No venue breakdown available.</p>
                  ) : (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={eventTypeBreakdown} layout="vertical" margin={{ left: 24 }}>
                          <CartesianGrid stroke={chartGrid} strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} stroke={chartAxis} tick={{ fill: chartAxis, fontSize: 12 }} />
                          <YAxis dataKey="type" type="category" width={110} stroke={chartAxis} tick={{ fill: chartAxis, fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{ background: '#0f172a', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 12, color: chartText }}
                            labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                          />
                          <Bar dataKey="bookings" fill="#38bdf8" radius={[0, 10, 10, 0]} name="Bookings" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Popular venues */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">Popular Venues (All Time)</p>
                  {topEventTypes.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No venue data yet</p>
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

                {/* Revenue by venue */}
                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">Revenue by Venue</p>
                  {Object.keys(eventTypeRevenue).length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-8">No paid venue bookings yet</p>
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

                <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p className="text-sm font-black text-white mb-5">Damage and Profit Snapshot</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Damage Cost', value: `₱${damageSummary.total_damage_cost.toLocaleString()}`, tone: '#f87171' },
                      { label: 'Recovered', value: `₱${damageSummary.total_recovered.toLocaleString()}`, tone: '#38bdf8' },
                      { label: 'Net Loss', value: `₱${damageSummary.total_net_loss.toLocaleString()}`, tone: '#f59e0b' },
                      { label: 'Damage Reports', value: damageSummary.damage_reports_count, tone: '#f8fafc' },
                    ].map(item => (
                      <div key={item.label} className="rounded-xl p-4" style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.12)' }}>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-2">{item.label}</p>
                        <p className="text-xl font-black" style={{ color: item.tone }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeTab === 'damages' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                  {[
                    { label: 'Damage Reports', value: damageSummary.damage_reports_count },
                    { label: 'Total Damage Cost', value: `₱${damageSummary.total_damage_cost.toLocaleString()}` },
                    { label: 'Recovered', value: `₱${damageSummary.total_recovered.toLocaleString()}` },
                    { label: 'Net Loss', value: `₱${damageSummary.total_net_loss.toLocaleString()}` },
                  ].map(card => (
                    <div key={card.label} className="rounded-2xl p-5 text-center"
                      style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.16)' }}>
                      <p className="text-xs text-red-300 font-bold uppercase tracking-widest mb-2">{card.label}</p>
                      <p className="text-2xl font-black text-white truncate">{card.value}</p>
                    </div>
                  ))}
                </div>

                {damageReports.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-white font-black">No damage reports yet</p>
                    <p className="text-slate-500 text-sm mt-1">Damage reports will appear here once the owner records them.</p>
                  </div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-4">
                    {damageReports.map((report) => (
                      <div key={report.id} className="rounded-2xl p-5"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="flex justify-between items-start gap-3 mb-3">
                          <div>
                            <p className="font-black text-white text-sm">{report.item_name || report.item_type}</p>
                            <p className="text-xs text-slate-400 mt-0.5">{report.booking_event_type} • {report.client_name}</p>
                          </div>
                          <span className="px-2.5 py-1 text-xs font-bold rounded-full text-red-300 bg-red-900/30">
                            {report.status}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs text-slate-500">Quantity</p>
                            <p className="text-sm font-bold text-white">{report.quantity}</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs text-slate-500">Damage Cost</p>
                            <p className="text-sm font-bold text-white">₱{report.estimated_cost.toLocaleString()}</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs text-slate-500">Recovered</p>
                            <p className="text-sm font-bold text-sky-400">₱{report.recovered_amount.toLocaleString()}</p>
                          </div>
                          <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <p className="text-xs text-slate-500">Net Loss</p>
                            <p className="text-sm font-bold text-red-300">₱{report.net_loss.toLocaleString()}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 mb-2">{report.notes || 'No notes added.'}</p>
                        <p className="text-xs text-slate-500 mb-3">
                          Booking #{report.booking_id} • {formatDate(report.booking_date)} • {report.charge_to_client ? 'Charged to client' : 'Not charged to client'}
                          {report.reported_by ? ` • Reported by: ${report.reported_by}` : ''}
                        </p>
                        {report.photo && (
                          <a href={report.photo} target="_blank" rel="noreferrer">
                            <img src={report.photo} alt="Damage proof" className="w-full rounded-xl object-cover hover:opacity-90" style={{ maxHeight: 180, border: '1px solid rgba(239,68,68,0.2)' }} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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

      {/* Damage Report Modal */}
      {damageModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, overflowY: 'auto' }}>
          <div style={{ background: '#0c2d4a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 520 }}>
            <h3 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 18, marginBottom: 4 }}>Report Damage</h3>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Booking #{damageModal.bookingId} &mdash; {damageModal.eventType}</p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Item Type</p>
                  <select value={damageForm.item_type} onChange={e => setDamageForm(f => ({ ...f, item_type: e.target.value }))} className={iCls} style={iStyle}>
                    {[['chair','Chair'],['table','Table'],['decor','Decor'],['equipment','Equipment'],['other','Other']].map(([v,l]) => (
                      <option key={v} value={v} style={{ background: '#0c2d4a' }}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Status</p>
                  <select value={damageForm.status} onChange={e => setDamageForm(f => ({ ...f, status: e.target.value }))} className={iCls} style={iStyle}>
                    {[['reported','Reported'],['billed','Billed to Client'],['resolved','Resolved'],['waived','Waived']].map(([v,l]) => (
                      <option key={v} value={v} style={{ background: '#0c2d4a' }}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Item Name *</p>
                <input value={damageForm.item_name} onChange={e => setDamageForm(f => ({ ...f, item_name: e.target.value }))} placeholder="e.g. Plastic Chair, Round Table..." className={iCls} style={iStyle} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Quantity</p>
                  <input type="number" min="1" value={damageForm.quantity} onChange={e => setDamageForm(f => ({ ...f, quantity: e.target.value }))} className={iCls} style={iStyle} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Estimated Cost (&#8369;) *</p>
                  <input type="number" min="0" value={damageForm.estimated_cost} onChange={e => setDamageForm(f => ({ ...f, estimated_cost: e.target.value }))} placeholder="0.00" className={iCls} style={iStyle} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Recovered (&#8369;)</p>
                  <input type="number" min="0" value={damageForm.recovered_amount} onChange={e => setDamageForm(f => ({ ...f, recovered_amount: e.target.value }))} placeholder="0.00" className={iCls} style={iStyle} />
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Notes</p>
                <textarea rows={3} value={damageForm.notes} onChange={e => setDamageForm(f => ({ ...f, notes: e.target.value }))} placeholder="Describe the damage..." className={iCls + ' resize-none'} style={iStyle} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={damageForm.charge_to_client} onChange={e => setDamageForm(f => ({ ...f, charge_to_client: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-slate-300">Charge to client</span>
              </label>
              <div>
                <p className="text-xs text-slate-400 mb-1">Photo (optional)</p>
                <input type="file" accept="image/*" onChange={e => setDamagePhoto(e.target.files?.[0] || null)}
                  className="text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:text-white w-full"
                  style={{ ...iStyle, padding: '8px 12px', borderRadius: 12 }} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleReportDamage} disabled={damageSubmitting}
                className="flex-1 py-3 text-white font-black rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-40"
                style={{ background: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.5)' }}>
                {damageSubmitting ? 'Saving...' : 'Save Report'}
              </button>
              <button onClick={() => { setDamageModal(null); setDamagePhoto(null); setDamageForm({ item_type: 'other', item_name: '', quantity: '1', estimated_cost: '', recovered_amount: '0', charge_to_client: false, status: 'reported', notes: '' }); }}
                className="px-6 py-3 font-black rounded-xl text-slate-400"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
