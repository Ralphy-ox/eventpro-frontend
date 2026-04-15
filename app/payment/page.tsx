'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('id');
  const amount = searchParams.get('amount') || '0';
  const method = (searchParams.get('method') || 'gcash').toLowerCase();
  const failed = searchParams.get('failed') === '1';

  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('clientToken')) router.push('/signin');
  }, [router]);

  const paymentMeta = method === 'qrph'
    ? {
        title: 'QR Ph via PayMongo',
        subtitle: 'You will be redirected to a PayMongo checkout page with a scannable QR code.',
        buttonText: 'Open QR Payment',
        processingText: 'Opening QR checkout...',
        endpoint: 'qrph',
        badge: 'Scan using GCash, Maya, or supported banks',
      }
    : {
        title: 'GCash via PayMongo',
        subtitle: 'You will be redirected to GCash to complete payment.',
        buttonText: 'Pay with GCash',
        processingText: 'Redirecting to GCash...',
        endpoint: 'gcash',
        badge: 'Secure payment powered by PayMongo',
      };

  const handlePayMongoPayment = async () => {
    setProcessing(true);
    const token = localStorage.getItem('clientToken');
    try {
      const res = await fetch(`${API_BASE}/paymongo/${paymentMeta.endpoint}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ booking_id: bookingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to initiate payment');
        setProcessing(false);
        return;
      }
      window.location.href = data.checkout_url;
    } catch {
      alert('Connection error');
      setProcessing(false);
    }
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'My Bookings', href: '/my-bookings' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a1628', color: '#e2e8f0' }}>
      <MobileNav links={navLinks} />

      <div style={{ background: 'linear-gradient(135deg, #0f172a, #0c2d4a, #0f172a)', borderBottom: '1px solid rgba(14,165,233,0.15)', padding: '40px 24px 32px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(14,165,233,0.06) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#f1f5f9', margin: 0 }}>Complete Payment</h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6 }}>Booking #{bookingId}</p>
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {failed && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 16, padding: '16px 18px' }}>
            <p style={{ color: '#f87171', fontWeight: 700, margin: 0 }}>Your previous PayMongo checkout did not complete. You can safely try again.</p>
          </div>
        )}

        <div style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 16, padding: '28px 32px', textAlign: 'center' }}>
          <p style={{ color: '#64748b', fontSize: 13, marginBottom: 8 }}>Total Amount</p>
          <p style={{ color: '#4ade80', fontSize: 48, fontWeight: 900, margin: 0 }}>₱{parseFloat(amount).toLocaleString()}</p>
          <p style={{ color: '#475569', fontSize: 13, marginTop: 6 }}>Booking ID: #{bookingId}</p>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '28px 32px' }}>
          <p style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Payment Method</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)', borderRadius: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 28 }}>{method === 'qrph' ? '▣' : '₲'}</span>
            <div>
              <p style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, margin: 0 }}>{paymentMeta.title}</p>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>{paymentMeta.subtitle}</p>
            </div>
          </div>

          <div style={{ padding: '12px 16px', background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 10, marginBottom: 20 }}>
            <p style={{ color: '#38bdf8', fontSize: 13, margin: 0 }}>{paymentMeta.badge}. Your booking status will update automatically after PayMongo confirms payment.</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handlePayMongoPayment}
              disabled={processing}
              style={{ flex: 1, padding: '14px 24px', background: processing ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: processing ? '#475569' : '#fff', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: processing ? 'not-allowed' : 'pointer', boxShadow: processing ? 'none' : '0 4px 20px rgba(14,165,233,0.3)' }}
            >
              {processing ? paymentMeta.processingText : paymentMeta.buttonText}
            </button>
            <button
              onClick={() => router.push('/my-bookings')}
              style={{ padding: '14px 24px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: 12, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Payment() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 48, height: 48, border: '3px solid rgba(14,165,233,0.3)', borderTop: '3px solid #0ea5e9', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    }>
      <PaymentContent />
    </Suspense>
  );
}
