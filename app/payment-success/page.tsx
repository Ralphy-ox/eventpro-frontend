'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

type BookingSummary = {
  id: number;
  payment_status: string;
  payment_method: string;
  status?: string;
};

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = Number(searchParams.get('id') || '0');
  const method = (searchParams.get('method') || '').toLowerCase();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingSummary | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token || !bookingId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    fetch(`${API_BASE}/bookings/my/`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then((data: BookingSummary[]) => {
        if (!mounted) return;
        setBooking(data.find(item => item.id === bookingId) || null);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [bookingId]);

  const details = useMemo(() => {
    const paymentMethod = booking?.payment_method || (method === 'qrph' ? 'QRPh' : 'GCash');
    const isAwaitingAcceptance = booking?.status === 'pending';
    const isPaid = booking?.payment_status === 'paid' && booking?.status === 'confirmed';
    const isPendingReview = !isAwaitingAcceptance && booking?.payment_status === 'pending_review';

    return {
      title: isPaid ? 'Downpayment Received!' : isAwaitingAcceptance ? 'Booking Pending Acceptance' : isPendingReview ? 'Payment Received!' : 'Downpayment Submitted!',
      subtitle: isPaid
        ? `Your ${paymentMethod} booking downpayment has been confirmed by PayMongo.`
        : isAwaitingAcceptance
        ? `Your ${paymentMethod} payment may already be received, but the booking will stay pending until the organizer accepts it.`
        : isPendingReview
        ? `Your ${paymentMethod} payment was received, but the booking is still waiting for organizer acceptance.`
        : `Your ${paymentMethod} downpayment checkout was submitted. We are waiting for the final PayMongo confirmation.`,
      status: isPaid ? 'Paid' : isAwaitingAcceptance ? 'Pending' : isPendingReview ? 'Pending Review' : 'Processing',
      proof: paymentMethod === 'GCash' ? 'Direct checkout' : 'QR checkout',
      nextSteps: isPaid
        ? [
            'Your booking downpayment is already marked as paid.',
            'Open "My Bookings" if you still want to upload your proof of payment and reference number.',
            'The remaining balance can be settled separately.',
            'Downpayments are non-refundable.',
            'Check "My Bookings" to monitor organizer approval.',
            'You will receive a notification once the booking is updated.',
          ]
        : isAwaitingAcceptance
        ? [
            'Your booking will stay pending until the organizer accepts it.',
            'Open "My Bookings" if you want to upload or review your payment proof and your own reference number.',
            'Wait for the organizer to confirm the booking first.',
            'You will receive a notification once the booking is accepted or updated.',
          ]
        : isPendingReview
        ? [
            'Your payment was received successfully.',
            'The booking will stay under review until the organizer accepts it.',
            'Open "My Bookings" if you still want to upload your proof of payment and your reference number.',
            'You will receive a notification once the booking is accepted or updated.',
          ]
        : [
            'PayMongo is still finalizing your payment status.',
            'Refresh "My Bookings" in a moment to confirm the paid status.',
            'This checkout is only for the booking downpayment.',
            'If it stays pending, verify that your PayMongo webhook is enabled.',
          ],
    };
  }, [booking, method]);

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'My Bookings', href: '/my-bookings' },
  ];

  const card = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '28px 32px',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(14,165,233,0.3)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b', fontSize: 16, fontWeight: 600 }}>Checking your payment status...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#e2e8f0' }}>
      <MobileNav links={navLinks} />

      <div style={{ background: 'linear-gradient(135deg, #0f172a, #0c2d4a, #0f172a)', borderBottom: '1px solid rgba(14,165,233,0.15)', padding: '40px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(14,165,233,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, width: 300, height: '100%', background: 'radial-gradient(ellipse at right, rgba(14,165,233,0.12), transparent 70%)' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="32" height="32" fill="none" stroke="#4ade80" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>{details.title}</h1>
          <p style={{ color: '#94a3b8', fontSize: 14, marginTop: 6 }}>{details.subtitle}</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ ...card, borderColor: 'rgba(14,165,233,0.2)', background: 'rgba(14,165,233,0.05)' }}>
          <p style={{ color: '#38bdf8', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>Payment Details</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { label: 'Booking', value: bookingId ? `#${bookingId}` : 'N/A' },
              { label: 'Payment Method', value: booking?.payment_method || (method === 'qrph' ? 'QRPh' : 'GCash') },
              { label: 'Status', value: details.status },
              { label: 'Flow', value: details.proof },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: 14 }}>{item.label}</span>
                <span style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 14 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, borderColor: 'rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.05)' }}>
          <p style={{ color: '#fbbf24', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>What&apos;s Next?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {details.nextSteps.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ color: '#fbbf24', marginTop: 2, flexShrink: 0 }}>•</span>
                <span style={{ color: '#94a3b8', fontSize: 14 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ ...card, borderColor: 'rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.05)' }}>
          <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Notice</p>
          <p style={{ color: '#fecaca', fontSize: 14, margin: 0 }}>Booking downpayments are non-refundable.</p>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/my-bookings')}
            style={{ flex: 1, minWidth: 160, padding: '13px 24px', background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}
          >
            View My Bookings
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

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a1628' }} />}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
