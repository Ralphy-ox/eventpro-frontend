'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

interface Booking {
  id: number;
  event_type: string;
  description: string;
  capacity: number;
  date: string;
  time: string | null;
  location: string;
  status: string;
  payment_status: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
  event_details: Record<string, string>;
  invited_emails: string;
  gcash_reference: string;
  whole_day: boolean;
  has_review?: boolean;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  pending:   { bg: 'rgba(251,191,36,0.15)',  text: '#fbbf24', border: 'rgba(251,191,36,0.3)' },
  confirmed: { bg: 'rgba(34,197,94,0.15)',   text: '#4ade80', border: 'rgba(34,197,94,0.3)' },
  declined:  { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
};

const PAYMENT_STYLES: Record<string, { bg: string; text: string }> = {
  paid:                 { bg: 'rgba(34,197,94,0.15)',  text: '#4ade80' },
  pending:              { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
  pending_verification: { bg: 'rgba(14,165,233,0.15)', text: '#38bdf8' },
  rejected:             { bg: 'rgba(239,68,68,0.15)',  text: '#f87171' },
};

const eventDetailLabels: Record<string, string> = {
  celebrant_name: "Celebrant's Name", celebrant_age: 'Age',
  bride_name: "Bride's Name", groom_name: "Groom's Name",
  company_name: 'Company Name', event_title: 'Event Title',
  artist_name: 'Artist / Band', genre: 'Genre',
  honoree_name: 'Honoree', occasion: 'Occasion',
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    fetch(`${API_BASE}/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Booking[]) => {
        const found = data.find(b => b.id === parseInt(id));
        if (!found) setError('Booking not found.');
        else setBooking(found);
      })
      .catch(() => setError('Failed to load booking.'))
      .finally(() => setLoading(false));
  }, [id, router]);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(14,165,233,0.3)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  if (error || !booking) return (
    <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', fontSize: 18, marginBottom: 20 }}>{error || 'Booking not found'}</p>
        <Link href="/my-bookings" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none' }}>
          Back to My Bookings
        </Link>
      </div>
    </div>
  );

  const emails = booking.invited_emails
    ? booking.invited_emails.split(',').map(e => e.trim()).filter(Boolean)
    : [];

  const statusStyle = STATUS_STYLES[booking.status] ?? { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', border: 'rgba(148,163,184,0.3)' };
  const payStyle = PAYMENT_STYLES[booking.payment_status] ?? { bg: 'rgba(148,163,184,0.15)', text: '#94a3b8' };

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

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#e2e8f0' }}>
      <MobileNav links={[
        { label: '← My Bookings', href: '/my-bookings' },
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'Profile', href: '/profile' },
      ]} />

      {/* Page header banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a, #0c2d4a, #0f172a)', borderBottom: '1px solid rgba(14,165,233,0.15)', padding: '40px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(14,165,233,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 300, height: '100%', background: 'radial-gradient(ellipse at right, rgba(14,165,233,0.12), transparent 70%)' }} />
        <div style={{ maxWidth: 896, margin: '0 auto', position: 'relative' }}>
          <Link href="/my-bookings" style={{ color: '#38bdf8', fontSize: 14, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, opacity: 0.8 }}>
            ← Back to My Bookings
          </Link>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>{booking.event_type}</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>
            Booking #{booking.id} · Created {new Date(booking.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 896, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Status badges */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, background: statusStyle.bg, color: statusStyle.text, border: `1px solid ${statusStyle.border}` }}>
            {booking.status.toUpperCase()}
          </span>
          <span style={{ padding: '6px 16px', borderRadius: 999, fontSize: 13, fontWeight: 600, background: payStyle.bg, color: payStyle.text }}>
            Payment: {booking.payment_status.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Description */}
        {booking.description && (
          <div style={card}>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</p>
            <p style={{ color: '#cbd5e1', lineHeight: 1.7, margin: 0 }}>{booking.description}</p>
          </div>
        )}

        {/* Event information grid */}
        <div style={card}>
          <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>Event Information</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {[
              { label: 'Date', value: new Date(booking.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: 'Time', value: booking.whole_day ? 'Whole Day (9AM – 10PM)' : (booking.time ?? 'TBD') },
              { label: 'Guests', value: `${booking.capacity} people` },
              { label: 'Venue', value: booking.location },
              { label: 'Payment Method', value: booking.payment_method || 'N/A' },
              { label: 'Total Amount', value: `₱${Number(booking.total_amount).toLocaleString()}` },
            ].map(item => (
              <div key={item.label} style={infoItem}>
                <p style={{ color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{item.label}</p>
                <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>
          {booking.gcash_reference && (
            <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 12 }}>
              <p style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>GCash Reference Number</p>
              <p style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 16, margin: 0 }}>{booking.gcash_reference}</p>
            </div>
          )}
        </div>

        {/* Event-specific details */}
        {booking.event_details && Object.keys(booking.event_details).length > 0 && (
          <div style={card}>
            <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20 }}>{booking.event_type} Details</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {Object.entries(booking.event_details).map(([key, val]) => (
                <div key={key} style={{ ...infoItem, borderColor: 'rgba(14,165,233,0.15)' }}>
                  <p style={{ color: '#38bdf8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{eventDetailLabels[key] ?? key}</p>
                  <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: 0 }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invited guests */}
        {emails.length > 0 && (
          <div style={card}>
            <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Invited Guests ({emails.length})</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {emails.map((email, i) => (
                <span key={i} style={{ padding: '6px 14px', background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)', color: '#38bdf8', fontSize: 13, borderRadius: 999 }}>
                  {email}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Review badge */}
        {booking.status === 'confirmed' && booking.has_review && (
          <div style={{ padding: '10px 16px', borderRadius: 12, textAlign: 'center', fontSize: 13, fontWeight: 700, color: '#38bdf8', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
            ✓ Review submitted — Thank you!
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/my-bookings" style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
            ← Back to My Bookings
          </Link>
          {booking.status === 'pending' && (
            <Link href="/my-bookings" style={{ padding: '12px 24px', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 14, boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
              Manage Booking
            </Link>
          )}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
