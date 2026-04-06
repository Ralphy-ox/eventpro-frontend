'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

interface Reply { id: number; user_id: number; user: string; is_organizer: boolean; comment: string; created_at: string; }
interface Review { id: number; user: string; rating: number; comment: string; event_type: string | null; created_at: string; replies: Reply[]; }
interface Booking { id: number; event_type: string; status: string; date: string; }

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const btnPrimary = { background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' };

export default function RatingsPage() {
  const router = useRouter();
  const { loggingOut, logout } = useLogout();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[]>([]);
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 5;
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [editReviewSubmitting, setEditReviewSubmitting] = useState(false);
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [editReplySubmitting, setEditReplySubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const name = localStorage.getItem('userName') ?? '';
    const uid = localStorage.getItem('userId');
    setIsLoggedIn(!!token);
    setCurrentUserName(name);
    setCurrentUserId(uid ? parseInt(uid) : null);
    loadReviews();
    if (token) loadMyBookings(token);
  }, []);

  const loadReviews = () => {
    fetch(`${API_BASE}/reviews/`)
      .then(r => r.json())
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const loadMyBookings = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE}/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const all: Booking[] = await res.json(); setConfirmedBookings(all.filter(b => b.status === 'confirmed')); }
    } catch {}
  };

  const handleSubmit = async () => {
    if (rating === 0) { alert('Please select a star rating'); return; }
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/submit/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ booking_id: selectedBookingId, rating, comment }),
      });
      if (res.ok) {
        if (selectedBookingId) setReviewedIds(p => [...p, selectedBookingId]);
        setShowForm(false); setRating(0); setComment(''); setSelectedBookingId(null);
        loadReviews();
      } else { const d = await res.json(); alert(d.message || 'Failed'); }
    } catch { alert('Error submitting review'); }
    finally { setSubmitting(false); }
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Delete your review? This cannot be undone.')) return;
    const token = localStorage.getItem('clientToken');
    if (!token) return;
    await fetch(`${API_BASE}/reviews/${reviewId}/delete/`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadReviews();
  };

  const handleReply = async (reviewId: number) => {
    if (!replyText.trim()) return;
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    setReplySubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/reply/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: replyText }),
      });
      if (res.ok) { setReplyingTo(null); setReplyText(''); loadReviews(); }
      else { const d = await res.json(); alert(d.message || 'Failed'); }
    } catch { alert('Error posting reply'); }
    finally { setReplySubmitting(false); }
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!confirm('Delete this reply?')) return;
    const token = localStorage.getItem('clientToken');
    if (!token) return;
    await fetch(`${API_BASE}/reviews/replies/${replyId}/delete/`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    loadReviews();
  };

  const handleEditReview = async (reviewId: number) => {
    const token = localStorage.getItem('clientToken');
    if (!token) return;
    setEditReviewSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/${reviewId}/edit/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: editRating, comment: editComment }),
      });
      if (res.ok) { setEditingReviewId(null); loadReviews(); }
      else { const d = await res.json(); alert(d.message || 'Failed'); }
    } catch { alert('Error editing review'); }
    finally { setEditReviewSubmitting(false); }
  };

  const handleEditReply = async (replyId: number) => {
    if (!editReplyText.trim()) return;
    const token = localStorage.getItem('clientToken');
    if (!token) return;
    setEditReplySubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/reviews/replies/${replyId}/edit/`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ comment: editReplyText }),
      });
      if (res.ok) { setEditingReplyId(null); loadReviews(); }
      else { const d = await res.json(); alert(d.message || 'Failed'); }
    } catch { alert('Error editing reply'); }
    finally { setEditReplySubmitting(false); }
  };

  const filtered = filter === 0 ? reviews : reviews.filter(r => r.rating === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const starCounts = [5, 4, 3, 2, 1].map(s => ({
    star: s,
    count: reviews.filter(r => r.rating === s).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.rating === s).length / reviews.length) * 100 : 0,
  }));
  const today = new Date().toISOString().split('T')[0];
  const pastConfirmed = confirmedBookings.filter(b => b.date <= today);
  const unreviewed = pastConfirmed.filter(b => !reviewedIds.includes(b.id));

  const navLinks = isLoggedIn
    ? [
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'My Bookings', href: '/my-bookings' },
        { label: 'Book Now', href: '/client/dashboard', highlight: true as const },
        { label: 'Settings', dropdown: [
          { label: 'Profile', href: '/profile' },
          { label: 'Logout', onClick: () => logout('clientToken', '/'), danger: true },
        ]},
      ]
    : [
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Sign In', href: '/signin' },
        { label: 'Register', href: '/register', highlight: true as const },
      ];

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <LogoutOverlay visible={loggingOut} />
      <MobileNav links={navLinks} showNotification={isLoggedIn} />

      {/* Header */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-80 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto px-6 sm:px-8 py-10 relative z-10">
          <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-2">Reviews</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Customer Reviews</h1>
          <p className="text-sky-400 text-sm mt-2">See what our clients say about EventPro</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 sm:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sky-400 text-sm">Loading reviews...</p>
          </div>
        ) : (
          <>
            {/* Summary */}
            {reviews.length > 0 && (
              <div className="rounded-2xl p-6 mb-6 flex flex-col md:flex-row gap-8 items-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="text-center shrink-0">
                  <p className="text-6xl font-black text-white">{avgRating}</p>
                  <div className="flex justify-center gap-0.5 mt-2 text-xl">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={parseFloat(avgRating!) >= s ? 'text-sky-400' : 'text-slate-700'}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex-1 w-full space-y-2">
                  {starCounts.map(({ star, count, pct }) => (
                    <button key={star} onClick={() => { setFilter(filter === star ? 0 : star); setPage(1); }}
                      className="flex items-center gap-3 w-full rounded-xl px-3 py-2 transition-all"
                      style={{ background: filter === star ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${filter === star ? 'rgba(14,165,233,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                      <span className="text-sm font-bold text-slate-300 w-4 text-right">{star}</span>
                      <span className="text-sky-400 text-sm">★</span>
                      <div className="flex-1 rounded-full h-2 overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#0ea5e9,#0369a1)' }} />
                      </div>
                      <span className="text-xs text-slate-400 w-4">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Leave a review */}
            {isLoggedIn && unreviewed.length > 0 && (
              <div className="rounded-2xl p-6 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(14,165,233,0.2)' }}>
                <h2 className="text-base font-black text-white mb-1">Leave a Review</h2>
                <p className="text-xs text-slate-400 mb-4">Rate your experience at our venue</p>
                <div className="flex gap-1 mb-4">
                  {[1,2,3,4,5].map(star => (
                    <button key={star} onClick={() => { setRating(star); setSelectedBookingId(unreviewed[0].id); setShowForm(true); }}
                      className={`text-3xl transition-transform hover:scale-110 ${rating >= star ? 'text-sky-400' : 'text-slate-700'}`}>★</button>
                  ))}
                </div>
                {showForm && (
                  <>
                    <textarea rows={3} placeholder="Share your experience (optional)..." value={comment}
                      onChange={e => setComment(e.target.value)}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-4"
                      style={iStyle} />
                    <div className="flex gap-3">
                      <button onClick={handleSubmit} disabled={submitting || rating === 0}
                        className="px-7 py-3 text-white font-black text-sm rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-40"
                        style={btnPrimary}>
                        {submitting ? 'Submitting...' : 'Submit Review'}
                      </button>
                      <button onClick={() => { setShowForm(false); setRating(0); setComment(''); setSelectedBookingId(null); }}
                        className="px-7 py-3 text-sm font-bold rounded-xl text-slate-400 transition-all hover:-translate-y-0.5"
                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {isLoggedIn && confirmedBookings.length === 0 && (
              <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-black text-white mb-1">Leave a Review</p>
                <p className="text-slate-400 text-sm">You need at least one confirmed booking to leave a review.</p>
              </div>
            )}

            {isLoggedIn && confirmedBookings.length > 0 && pastConfirmed.length === 0 && (
              <div className="rounded-2xl p-6 mb-6 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="font-black text-white mb-1">Leave a Review</p>
                <p className="text-slate-400 text-sm">Your booked event date hasn&apos;t happened yet.</p>
              </div>
            )}

            {!isLoggedIn && (
              <div className="rounded-2xl p-8 text-center mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-lg font-black text-white mb-2">Had an event with us?</p>
                <p className="text-slate-400 text-sm mb-5">Sign in to leave a review for your confirmed booking.</p>
                <button onClick={() => router.push('/signin')}
                  className="px-8 py-3 text-white font-black text-sm rounded-xl transition-all hover:-translate-y-0.5"
                  style={btnPrimary}>
                  Sign In to Review
                </button>
              </div>
            )}

            {filter > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-slate-400">Showing {filter}★ reviews</span>
                <button onClick={() => setFilter(0)} className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Clear filter</button>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                  <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-white font-black text-lg">{reviews.length === 0 ? 'No reviews yet' : 'No reviews for this rating'}</p>
                <p className="text-slate-400 text-sm mt-1">{reviews.length === 0 ? 'Be the first to leave a review!' : 'Try a different filter.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginated.map(r => (
                  <div key={r.id} className="rounded-2xl p-6 transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-black text-white">{r.user}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {editingReviewId !== r.id && (
                          <div className="flex gap-0.5 text-lg">
                            {[1,2,3,4,5].map(s => (
                              <span key={s} className={r.rating >= s ? 'text-sky-400' : 'text-slate-700'}>★</span>
                            ))}
                          </div>
                        )}
                        {isLoggedIn && currentUserName && r.user === currentUserName && editingReviewId !== r.id && (
                          <>
                            <button onClick={() => { setEditingReviewId(r.id); setEditRating(r.rating); setEditComment(r.comment); }}
                              className="text-xs px-3 py-1.5 font-bold rounded-xl transition-all text-sky-400"
                              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
                              Edit
                            </button>
                            <button onClick={() => handleDeleteReview(r.id)}
                              className="text-xs px-3 py-1.5 font-bold rounded-xl transition-all text-red-400"
                              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {editingReviewId === r.id ? (
                      <div className="mb-3 rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs text-sky-400 font-bold uppercase tracking-widest mb-2">Edit Rating</p>
                        <div className="flex gap-1 mb-3">
                          {[1,2,3,4,5].map(s => (
                            <button key={s} onClick={() => setEditRating(s)}
                              className={`text-2xl transition-transform hover:scale-110 ${editRating >= s ? 'text-sky-400' : 'text-slate-700'}`}>★</button>
                          ))}
                        </div>
                        <textarea rows={3} value={editComment} onChange={e => setEditComment(e.target.value)}
                          placeholder="Edit your comment..."
                          className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-3"
                          style={iStyle} />
                        <div className="flex gap-2">
                          <button onClick={() => handleEditReview(r.id)} disabled={editReviewSubmitting || editRating === 0}
                            className="px-5 py-2 text-white text-sm font-black rounded-xl disabled:opacity-40 transition-all hover:-translate-y-0.5"
                            style={btnPrimary}>
                            {editReviewSubmitting ? 'Saving...' : 'Save Changes'}
                          </button>
                          <button onClick={() => setEditingReviewId(null)}
                            className="px-5 py-2 text-sm font-bold rounded-xl text-slate-400 transition-all"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {r.comment && <p className="text-slate-300 text-sm italic leading-relaxed mb-2">"{r.comment}"</p>}
                        <p className="text-xs text-slate-500">{new Date(r.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                      </>
                    )}

                    {/* Replies */}
                    {r.replies.length > 0 && (
                      <div className="mt-4 space-y-2 pl-4" style={{ borderLeft: '2px solid rgba(14,165,233,0.2)' }}>
                        {r.replies.map(rp => (
                          <div key={rp.id} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-black text-white">
                                {rp.user}
                                {rp.is_organizer && (
                                  <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold text-sky-300"
                                    style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
                                    Organizer
                                  </span>
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">{new Date(rp.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                {isLoggedIn && editingReplyId !== rp.id && currentUserId === rp.user_id && (
                                  <>
                                    <button onClick={() => { setEditingReplyId(rp.id); setEditReplyText(rp.comment); }}
                                      className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Edit</button>
                                    <button onClick={() => handleDeleteReply(rp.id)}
                                      className="text-xs text-red-400 hover:text-red-300 transition-colors">Delete</button>
                                  </>
                                )}
                              </div>
                            </div>
                            {editingReplyId === rp.id ? (
                              <div className="flex gap-2 mt-2">
                                <input type="text" value={editReplyText} onChange={e => setEditReplyText(e.target.value)}
                                  className="flex-1 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500"
                                  style={iStyle} />
                                <button onClick={() => handleEditReply(rp.id)} disabled={editReplySubmitting || !editReplyText.trim()}
                                  className="px-3 py-1.5 text-white text-xs font-bold rounded-xl disabled:opacity-40" style={btnPrimary}>
                                  {editReplySubmitting ? '...' : 'Save'}
                                </button>
                                <button onClick={() => setEditingReplyId(null)}
                                  className="px-3 py-1.5 text-xs font-bold rounded-xl text-slate-400"
                                  style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-300">{rp.comment}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply */}
                    {isLoggedIn && (
                      <div className="mt-3">
                        {replyingTo === r.id ? (
                          <div className="flex gap-2">
                            <input type="text" placeholder="Write a reply..." value={replyText}
                              onChange={e => setReplyText(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleReply(r.id)}
                              className="flex-1 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-sky-500"
                              style={iStyle} />
                            <button onClick={() => handleReply(r.id)} disabled={replySubmitting || !replyText.trim()}
                              className="px-4 py-2 text-white text-xs font-bold rounded-xl disabled:opacity-40" style={btnPrimary}>
                              {replySubmitting ? '...' : 'Reply'}
                            </button>
                            <button onClick={() => { setReplyingTo(null); setReplyText(''); }}
                              className="px-3 py-2 text-xs font-bold rounded-xl text-slate-400"
                              style={{ background: 'rgba(255,255,255,0.07)' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => { setReplyingTo(r.id); setReplyText(''); }}
                            className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Reply</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className="w-9 h-9 text-sm font-black rounded-xl transition-all"
                    style={page === p
                      ? { background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff' }
                      : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-30"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
