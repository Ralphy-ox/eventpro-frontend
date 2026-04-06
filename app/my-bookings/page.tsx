'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';

interface Booking {
  id: number; event_type: string; description: string; capacity: number;
  date: string; time: string; location: string; status: string;
  payment_status: string; payment_method: string; total_amount: number;
  created_at: string; gcash_reference?: string; payment_proof?: string;
  decline_reason?: string; has_review?: boolean;
}

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all";

const statusBar: Record<string, string> = {
  pending:   'linear-gradient(90deg, #f59e0b, #d97706)',
  confirmed: 'linear-gradient(90deg, #0ea5e9, #0369a1)',
  declined:  'linear-gradient(90deg, #ef4444, #dc2626)',
};

const statusBadge: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(245,158,11,0.15)',  text: '#fbbf24' },
  confirmed: { bg: 'rgba(14,165,233,0.15)',  text: '#38bdf8' },
  declined:  { bg: 'rgba(239,68,68,0.15)',   text: '#f87171' },
};

export default function MyBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [editingBooking, setEditingBooking] = useState<number | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [uploadingProof, setUploadingProof] = useState<number | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [gcashRef, setGcashRef] = useState('');
  const [reviewingBooking, setReviewingBooking] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewedBookings, setReviewedBookings] = useState<number[]>([]);
  const [cancelModal, setCancelModal] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'declined'>('all');
  const router = useRouter();
  const { loggingOut, logout } = useLogout();

  const fetchBookings = useCallback(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    fetch(`${API_BASE}/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return; } return res.json(); })
      .then(data => { if (data) setBookings(data); })
      .catch(() => {}).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    fetchBookings();
    fetch(`${API_BASE}/event-types/`).then(r => r.json())
      .then(data => setEventTypes(data.map((et: any) => et.event_type))).catch(() => {});
  }, [fetchBookings]);

  // Real-time: auto-refresh bookings when organizer confirms/declines
  useRealtimeRefresh('clientToken', () => fetchBookings());

  const handleCancel = async (id: number) => {
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/bookings/${id}/cancel/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: cancelReason }),
    });
    if (res.ok) { setCancelModal(null); setCancelReason(''); fetchBookings(); }
    else { const d = await res.json(); alert(d.message || 'Failed'); }
  };

  const handleReschedule = async (id: number) => {
    if (!newDate && !newTime) { alert('Select a new date or time'); return; }
    const token = localStorage.getItem('clientToken');
    const res = await fetch(`${API_BASE}/bookings/${id}/update/`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ date: newDate || undefined, time: newTime || undefined }),
    });
    if (res.ok) { setEditingBooking(null); setNewDate(''); setNewTime(''); fetchBookings(); }
    else { const d = await res.json(); alert(d.message || 'Failed'); }
  };

  const handleUploadProof = async (id: number) => {
    if (!proofFile) { alert('Select a screenshot'); return; }
    if (!gcashRef.trim()) { alert('GCash Reference Number is required!'); return; }
    const token = localStorage.getItem('clientToken');
    const formData = new FormData();
    formData.append('payment_proof', proofFile);
    formData.append('gcash_reference', gcashRef);
    const res = await fetch(`${API_BASE}/bookings/${id}/upload-proof/`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData });
    if (res.ok) { setUploadingProof(null); setProofFile(null); setGcashRef(''); fetchBookings(); }
    else { const d = await res.json(); alert(d.message || 'Upload failed'); }
  };

  const handleSubmitReview = async (id: number) => {
    if (reviewRating === 0) { alert('Select a star rating'); return; }
    const token = localStorage.getItem('clientToken');
    setSubmittingReview(true);
    const res = await fetch(`${API_BASE}/reviews/submit/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ booking_id: id, rating: reviewRating, comment: reviewComment }),
    });
    if (res.ok) { setReviewingBooking(null); setReviewRating(0); setReviewComment(''); setReviewedBookings(p => [...p, id]); }
    else { const d = await res.json(); alert(d.message || 'Failed'); }
    setSubmittingReview(false);
  };

  const filtered = bookings.filter(b =>
    (statusFilter === 'all' || b.status === statusFilter) &&
    (search === '' || b.event_type.toLowerCase().includes(search.toLowerCase()) || b.description.toLowerCase().includes(search.toLowerCase())) &&
    (dateFilter === '' || b.date === dateFilter) &&
    (eventTypeFilter === '' || b.event_type === eventTypeFilter)
  );

  const statusCounts = {
    all: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    declined: bookings.filter(b => b.status === 'declined').length,
  };

  const btn = "px-4 py-2 text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5 active:scale-95";

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <LogoutOverlay visible={loggingOut} />
      <MobileNav links={[
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'My Bookings', href: '/my-bookings' },
        { label: 'Book Now', href: '/client/dashboard', highlight: true },
        { label: 'Settings', dropdown: [
          { label: 'Profile', href: '/profile' },
          { label: 'Logout', onClick: () => logout('clientToken', '/'), danger: true },
        ]},
      ]} showNotification />

      {/* Header */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-80 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8 relative z-10 flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">My Bookings</h1>
            <p className="text-sky-400 text-sm mt-1">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} total</p>
          </div>
          <button onClick={() => router.push('/client/dashboard')}
            className="px-5 py-2.5 text-white font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5 shrink-0"
            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}>
            New Booking
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        {/* Status filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['all', 'pending', 'confirmed', 'declined'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all"
              style={{
                background: statusFilter === s ? 'linear-gradient(135deg,#0ea5e9,#0369a1)' : 'rgba(255,255,255,0.05)',
                color: statusFilter === s ? '#fff' : '#64748b',
                border: statusFilter === s ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}>
              {s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input type="text" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            style={iStyle} />
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            style={{ ...iStyle, colorScheme: 'dark' }} />
          <select value={eventTypeFilter} onChange={e => setEventTypeFilter(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            style={iStyle}>
            <option value="" style={{ background: '#0c2d4a' }}>All Event Types</option>
            {eventTypes.map(et => <option key={et} value={et} style={{ background: '#0c2d4a' }}>{et}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sky-400 text-sm">Loading your bookings...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">No bookings found</h3>
            <p className="text-slate-400 text-sm mb-6">Start planning your next unforgettable event!</p>
            <button onClick={() => router.push('/client/dashboard')}
              className="px-8 py-3 text-white font-bold text-sm rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 16px rgba(14,165,233,0.3)' }}>
              Create a Booking
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map(booking => {
              const sb = statusBadge[booking.status] || statusBadge.pending;
              return (
                <div key={booking.id} className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                  {/* Status bar */}
                  <div className="h-1" style={{ background: statusBar[booking.status] || statusBar.pending }} />

                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <h3 className="text-base font-black text-white">{booking.event_type}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">#{booking.id} · {new Date(booking.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                        style={{ background: sb.bg, color: sb.text }}>
                        {booking.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">{booking.description}</p>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: 'Date', value: booking.date },
                        { label: 'Time', value: booking.time || 'N/A' },
                        { label: 'Guests', value: `${booking.capacity} pax` },
                        { label: 'Method', value: booking.payment_method || 'N/A' },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <p className="text-xs text-slate-500">{item.label}</p>
                          <p className="font-bold text-white text-xs mt-0.5 truncate">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Amount + payment status */}
                    <div className="flex items-center justify-between mb-4 px-3 py-2.5 rounded-xl"
                      style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                      <span className="text-sky-400 text-xs font-bold">₱{Number(booking.total_amount).toLocaleString()}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        booking.payment_status === 'paid' ? 'text-sky-300 bg-sky-900/40' :
                        booking.payment_status === 'pending_verification' ? 'text-yellow-300 bg-yellow-900/30' :
                        booking.payment_status === 'rejected' ? 'text-red-300 bg-red-900/30' : 'text-slate-400 bg-slate-800'
                      }`}>
                        {booking.payment_status === 'paid' ? 'Paid' :
                         booking.payment_status === 'pending_verification' ? 'Verifying' :
                         booking.payment_status === 'rejected' ? 'Rejected' : 'Unpaid'}
                      </span>
                    </div>

                    {/* Decline reason */}
                    {booking.status === 'declined' && booking.decline_reason && (
                      <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p className="text-xs font-bold text-red-400 mb-1">Decline Reason</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{booking.decline_reason}</p>
                      </div>
                    )}

                    {/* GCash PayMongo pending */}
                    {booking.payment_method === 'GCash' && booking.payment_status === 'pending' && (
                      <div className="mb-4 px-3 py-2.5 rounded-xl text-center text-xs font-bold text-sky-300"
                        style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                        GCash payment pending — complete payment in the GCash app
                      </div>
                    )}

                    {/* Reschedule */}
                    {editingBooking === booking.id && (
                      <div className="mb-4 p-4 rounded-xl space-y-3" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                        <p className="text-xs font-bold text-sky-300">Reschedule Booking</p>
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs text-white focus:ring-2 focus:ring-sky-500 outline-none"
                            style={{ ...iStyle, colorScheme: 'dark' }} />
                          <select value={newTime} onChange={e => setNewTime(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl text-xs text-white focus:ring-2 focus:ring-sky-500 outline-none"
                            style={iStyle}>
                            <option value="" style={{ background: '#0c2d4a' }}>Select time</option>
                            <optgroup label="Morning">
                              <option value="09:00" style={{ background: '#0c2d4a' }}>09:00–14:00</option>
                              <option value="10:00" style={{ background: '#0c2d4a' }}>10:00–14:00</option>
                              <option value="11:00" style={{ background: '#0c2d4a' }}>11:00–14:00</option>
                            </optgroup>
                            <optgroup label="Evening">
                              <option value="17:00" style={{ background: '#0c2d4a' }}>17:00–22:00</option>
                              <option value="18:00" style={{ background: '#0c2d4a' }}>18:00–22:00</option>
                              <option value="19:00" style={{ background: '#0c2d4a' }}>19:00–22:00</option>
                            </optgroup>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleReschedule(booking.id)}
                            className="flex-1 py-2 text-white text-xs font-bold rounded-xl"
                            style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>Save</button>
                          <button onClick={() => { setEditingBooking(null); setNewDate(''); setNewTime(''); }}
                            className="px-3 py-2 text-xs font-bold rounded-xl text-slate-400"
                            style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Review */}
                    {booking.status === 'confirmed' && !booking.has_review && !reviewedBookings.includes(booking.id) && (
                      <div className="mb-4">
                        {reviewingBooking === booking.id ? (
                          <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                            <p className="text-xs font-bold text-sky-300">Rate Your Experience</p>
                            <div className="flex gap-1">
                              {[1,2,3,4,5].map(s => (
                                <button key={s} onClick={() => setReviewRating(s)}
                                  className={`text-2xl transition-transform hover:scale-110 ${reviewRating >= s ? 'text-sky-400' : 'text-slate-700'}`}>★</button>
                              ))}
                            </div>
                            <textarea rows={2} placeholder="Share your experience (optional)..." value={reviewComment}
                              onChange={e => setReviewComment(e.target.value)}
                              className="w-full rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                              style={iStyle} />
                            <div className="flex gap-2">
                              <button onClick={() => handleSubmitReview(booking.id)} disabled={submittingReview || reviewRating === 0}
                                className="flex-1 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-40"
                                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>
                                {submittingReview ? 'Submitting...' : 'Submit Review'}
                              </button>
                              <button onClick={() => { setReviewingBooking(null); setReviewRating(0); setReviewComment(''); }}
                                className="px-3 py-2 text-xs font-bold rounded-xl text-slate-400"
                                style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => { setReviewingBooking(booking.id); setReviewRating(0); setReviewComment(''); }}
                            className="w-full py-2.5 text-sky-400 text-xs font-bold rounded-xl transition-all hover:-translate-y-0.5"
                            style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                            Rate & Review This Event
                          </button>
                        )}
                      </div>
                    )}
                    {(booking.has_review || reviewedBookings.includes(booking.id)) && (
                      <div className="mb-4 py-2.5 rounded-xl text-center text-xs font-bold text-sky-400"
                        style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                        Review submitted — Thank you!
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap justify-end gap-2 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <button onClick={() => router.push(`/my-bookings/${booking.id}`)}
                        className={btn} style={{ background: 'rgba(14,165,233,0.1)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.2)' }}>
                        View Details
                      </button>
                      {booking.status === 'pending' && editingBooking !== booking.id && (
                        <button onClick={() => { setEditingBooking(booking.id); setNewDate(booking.date); setNewTime(booking.time); }}
                          className={btn} style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.1)' }}>
                          Reschedule
                        </button>
                      )}
                      {(booking.status === 'pending' || booking.status === 'declined') && (
                        <button onClick={() => setCancelModal(booking.id)}
                          className={btn} style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}>
                          {booking.status === 'pending' ? 'Cancel' : 'Remove'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel confirmation modal */}
      {cancelModal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#0c2d4a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 420, textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="28" height="28" fill="none" stroke="#f87171" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <h3 style={{ color: '#f1f5f9', fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Cancel Booking?</h3>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>This action cannot be undone.</p>
            <textarea
              rows={3}
              placeholder="Reason for cancellation (optional)..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: '10px 14px', color: '#fff', fontSize: 13, resize: 'none', marginBottom: 20, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => handleCancel(cancelModal)}
                style={{ flex: 1, padding: '12px 0', background: 'rgba(239,68,68,0.8)', border: '1px solid rgba(239,68,68,0.5)', color: '#fff', borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                Yes, Cancel It
              </button>
              <button
                onClick={() => { setCancelModal(null); setCancelReason(''); }}
                style={{ flex: 1, padding: '12px 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: 'pointer' }}>
                Keep Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
