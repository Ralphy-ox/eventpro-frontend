'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import { API_BASE } from '@/lib/api';

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = 'w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm';
const lCls = 'block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2';

export default function ContactPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    setIsLoggedIn(!!token);
    if (token) {
      fetch(`${API_BASE}/profile/`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          setName(`${d.first_name} ${d.last_name}`.trim());
          setEmail(d.email || '');
        })
        .catch(() => {});
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError('All fields are required.'); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contact/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const d = await res.json();
      if (res.ok) {
        setSuccess('Message sent! We\'ll get back to you within 24 hours.');
        setSubject(''); setMessage('');
        if (!isLoggedIn) { setName(''); setEmail(''); }
      } else {
        setError(d.message || 'Failed to send message.');
      }
    } catch {
      setError('Connection error. Please try again.');
    }
    setLoading(false);
  };

  const navLinks = isLoggedIn
    ? [
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'My Bookings', href: '/my-bookings' },
        { label: 'Book Now', href: '/client/dashboard', highlight: true as const },
        { label: 'Settings', dropdown: [
          { label: 'Profile', href: '/profile' },
          { label: 'Logout', onClick: () => { localStorage.removeItem('clientToken'); router.push('/'); }, danger: true },
        ]},
      ]
    : [
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'Sign In', href: '/signin' },
        { label: 'Register', href: '/register', highlight: true as const },
      ];

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <MobileNav links={navLinks} showNotification={isLoggedIn} />

      {/* Header */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-80 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-10 relative z-10">
          <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-2">Get In Touch</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Contact Us</h1>
          <p className="text-sky-400 text-sm mt-2">We'd love to hear from you — reach out anytime</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-10">
        <div className="grid lg:grid-cols-5 gap-8">

          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 className="text-base font-black text-white mb-5">Venue Information</h2>
              <div className="space-y-4">
                {[
                  {
                    icon: (
                      <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                      </svg>
                    ),
                    label: 'Address',
                    value: "Basak San Nicolas Villa Kalubihan, Cebu City 6000",
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                      </svg>
                    ),
                    label: 'Phone',
                    value: '0993 926 1681',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    ),
                    label: 'Email',
                    value: 'ralphydev@gmail.com',
                  },
                  {
                    icon: (
                      <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                    label: 'Hours',
                    value: 'Mon – Sun: 8:00 AM – 10:00 PM',
                  },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.2)' }}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-0.5">{item.label}</p>
                      <p className="text-sm text-slate-300">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-6" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
              <p className="text-sm font-black text-white mb-2">Ready to book?</p>
              <p className="text-xs text-slate-400 mb-4">Skip the form and go straight to booking your event.</p>
              <a href={isLoggedIn ? '/client/dashboard' : '/register'}
                className="block w-full py-3 text-center text-white font-black text-sm rounded-xl transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                {isLoggedIn ? 'Book Now' : 'Get Started'}
              </a>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(14,165,233,0.06)' }}>
                <h2 className="text-base font-black text-white">Send a Message</h2>
                <p className="text-xs text-slate-400 mt-0.5">We'll reply within 24 hours</p>
              </div>
              <div className="p-6">
                {isLoggedIn && (
                  <div className="mb-4 px-4 py-3 rounded-xl flex items-center justify-between"
                    style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.15)' }}>
                    <div>
                      <p className="text-xs font-bold text-sky-400 mb-0.5">Sending as</p>
                      <p className="text-sm font-black text-white">{name}</p>
                      <p className="text-xs text-slate-400">{email}</p>
                    </div>
                    <svg className="w-5 h-5 text-sky-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {!isLoggedIn && (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className={lCls}>Your Name</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)}
                          placeholder="Full name" className={iCls} style={iStyle} />
                      </div>
                      <div>
                        <label className={lCls}>Email Address</label>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                          placeholder="your@email.com" className={iCls} style={iStyle} />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className={lCls}>Subject</label>
                    <select value={subject} onChange={e => setSubject(e.target.value)}
                      className={iCls} style={iStyle}>
                      <option value="" style={{ background: '#0c2d4a' }}>Select a subject...</option>
                      <optgroup label="Complaints" style={{ background: '#0c2d4a' }}>
                        <option value="Poor Staff Treatment" style={{ background: '#0c2d4a' }}>Poor Staff Treatment</option>
                        <option value="Venue Cleanliness Issue" style={{ background: '#0c2d4a' }}>Venue Cleanliness Issue</option>
                        <option value="Noise Complaint" style={{ background: '#0c2d4a' }}>Noise Complaint</option>
                        <option value="Overbooking / Scheduling Conflict" style={{ background: '#0c2d4a' }}>Overbooking / Scheduling Conflict</option>
                        <option value="Payment Issue" style={{ background: '#0c2d4a' }}>Payment Issue</option>
                      </optgroup>
                      <optgroup label="Inquiries" style={{ background: '#0c2d4a' }}>
                        <option value="Booking Inquiry" style={{ background: '#0c2d4a' }}>Booking Inquiry</option>
                        <option value="Pricing & Packages" style={{ background: '#0c2d4a' }}>Pricing &amp; Packages</option>
                        <option value="Venue Availability" style={{ background: '#0c2d4a' }}>Venue Availability</option>
                        <option value="Event Requirements" style={{ background: '#0c2d4a' }}>Event Requirements</option>
                      </optgroup>
                      <optgroup label="Other" style={{ background: '#0c2d4a' }}>
                        <option value="Feedback & Suggestions" style={{ background: '#0c2d4a' }}>Feedback &amp; Suggestions</option>
                        <option value="Partnership Opportunity" style={{ background: '#0c2d4a' }}>Partnership Opportunity</option>
                        <option value="Other" style={{ background: '#0c2d4a' }}>Other</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className={lCls}>Message</label>
                    <textarea rows={5} value={message} onChange={e => setMessage(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm resize-none"
                      style={iStyle} />
                  </div>

                  {error && (
                    <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      {error}
                    </div>
                  )}
                  {success && (
                    <div className="px-4 py-3 rounded-xl text-sm text-sky-400" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
                      {success}
                    </div>
                  )}

                  <button type="submit" disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Sending...
                      </span>
                    ) : 'Send Message'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
