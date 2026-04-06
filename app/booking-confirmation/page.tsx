'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

interface BookingDetails {
  id: number;
  event_type: string;
  description: string;
  capacity: number;
  date: string;
  time: string;
  status: string;
  created_at: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  location: string;
  whole_day: boolean;
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 16,
  padding: '28px 32px',
};

const infoItem: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '14px 16px',
};

function BookingConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');

  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [referenceNumber, setReferenceNumber] = useState('');

  useEffect(() => {
    if (!bookingId) { router.push('/client/dashboard'); return; }
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    setReferenceNumber(`BK${Date.now().toString().slice(-8)}-${bookingId}`);
    fetch(`${API_BASE}/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return null; }
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data) {
          const found = data.find((b: BookingDetails) => b.id === parseInt(bookingId!));
          if (found) setBooking(found);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [bookingId, router]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'My Bookings', href: '/my-bookings' },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(14,165,233,0.3)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>Loading your booking details...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const bookingInfoItems = booking ? [
    { label: 'Event Type', value: booking.event_type },
    { label: 'Status', value: booking.status.charAt(0).toUpperCase() + booking.status.slice(1) },
    { label: 'Date', value: booking.date },
    { label: 'Time', value: booking.whole_day ? 'Whole Day (9AM – 10PM)' : (booking.time || 'TBD') },
    { label: 'Guests', value: `${booking.capacity} people` },
    { label: 'Booked On', value: new Date(booking.created_at).toLocaleDateString() },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#e2e8f0' }}>
      <MobileNav links={navLinks} />

      {/* Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #0c2d4a, #0f172a)', borderBottom: '1px solid rgba(14,165,233,0.15)', padding: '40px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(14,165,233,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 300, height: '100%', background: 'radial-gradient(ellipse at right, rgba(14,165,233,0.12), transparent 70%)' }} />
        <div style={{ maxWidth: 896, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="32" height="32" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>Booking Confirmation</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Your booking has been successfully submitted</p>
        </div>
      </div>

      <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Reference number */}
        <div style={{ ...card, textAlign: 'center', borderColor: 'rgba(14,165,233,0.2)', background: 'rgba(14,165,233,0.05)' }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>Booking Reference Number</p>
          <p style={{ color: '#7dd3fc', fontSize: 28, fontWeight: 900, fontFamily: 'monospace', letterSpacing: '0.08em', margin: 0 }}>{referenceNumber}</p>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 8 }}>Please keep this number for your records</p>
        </div>

        {/* Booking info grid */}
        {booking && (
          <div style={card}>
            <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>Booking Information</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {bookingInfoItems.map(item => (
                <div key={item.label} style={infoItem}>
                  <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{item.label}</p>
                  <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: 0 }}>{item.value}</p>
                </div>
              ))}
            </div>
            {booking.description && (
              <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12 }}>
                <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>Description</p>
                <p style={{ color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{booking.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Receipt / Payment summary */}
        {booking && (
          <div style={{ ...card, borderColor: 'rgba(74,222,128,0.2)', background: 'rgba(74,222,128,0.04)' }}>
            <p style={{ color: '#4ade80', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Payment Receipt</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Payment Method', value: booking.payment_method || 'N/A' },
                { label: 'Payment Status', value: booking.payment_status === 'paid' ? 'Paid' : booking.payment_status === 'pending_verification' ? 'Pending Verification' : 'Pending' },
                { label: 'Venue', value: booking.location },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
                  <span style={{ color: '#64748b', fontSize: 13 }}>{item.label}</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 700, fontSize: 13 }}>{item.value}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, marginTop: 4 }}>
                <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 15 }}>Total Amount</span>
                <span style={{ color: '#4ade80', fontWeight: 900, fontSize: 22 }}>₱{Number(booking.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {/* Next steps */}
        <div style={{ ...card, borderColor: 'rgba(14,165,233,0.15)', background: 'rgba(14,165,233,0.04)' }}>
          <p style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Next Steps</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Your booking is pending organizer approval',
              'You will receive a notification once confirmed',
              'Save your reference number for future use',
              'Check status anytime in My Bookings',
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#0ea5e9', marginTop: 2, flexShrink: 0 }}>•</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/my-bookings')}
            style={{ flex: 1, minWidth: 160, padding: '13px 24px', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}
          >
            View My Bookings
          </button>
          <button
            onClick={() => window.print()}
            style={{ padding: '13px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Print Confirmation
          </button>
          <button
            onClick={() => router.push('/')}
            style={{ padding: '13px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
          >
            Home
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function BookingConfirmation() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(14,165,233,0.3)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <BookingConfirmationContent />
    </Suspense>
  );
}
