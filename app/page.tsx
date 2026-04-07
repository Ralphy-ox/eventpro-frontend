'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

interface EventType {
  id: number;
  event_type: string;
  description: string;
}

interface Review {
  id: number;
  rating: number;
}

const FEATURES = [
  { title: 'Easy Booking', desc: 'Book your event in minutes with our streamlined process.' },
  { title: 'Real-Time Availability', desc: 'Instant room availability so you always know what\'s open.' },
  { title: 'Flexible Payments', desc: 'Pay via Cash or GCash — whichever works best for you.' },
  { title: 'Live Notifications', desc: 'Get notified the moment your booking is confirmed or updated.' },
  { title: 'Verified Reviews', desc: 'Read honest reviews from real clients who\'ve hosted events.' },
];

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const { loggingOut, logout } = useLogout();

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('clientToken'));
    fetch(`${API_BASE}/event-types/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEventTypes(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch(`${API_BASE}/reviews/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const stats = [
    { value: '500+', label: 'Events Hosted' },
    { value: averageRating, label: 'Avg. Rating' },
    { value: String(eventTypes.length), label: 'Event Types' },
    { value: '100%', label: 'Satisfaction' },
  ];

  const navLinks = isLoggedIn
    ? [
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'Contact', href: '/contact' },
        { label: 'My Bookings', href: '/my-bookings' },
        { label: 'Book Now', href: '/client/dashboard', highlight: true },
        { label: 'Settings', dropdown: [
          { label: 'Profile', href: '/profile' },
          { label: 'Logout', onClick: () => logout('clientToken', '/'), danger: true },
        ]},
      ]
    : [
        { label: 'Events', href: '/events' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'Contact', href: '/contact' },
        { label: 'Sign In', href: '/signin' },
        { label: 'Register', href: '/register', highlight: true },
      ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0a1628' }}>
      <LogoutOverlay visible={loggingOut} />
      <MobileNav links={navLinks} showNotification={isLoggedIn} />

      {/* HERO */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0c2d4a 50%, #0a1628 100%)' }}>
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, #0ea5e9, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-8 pointer-events-none" style={{ background: 'radial-gradient(ellipse at bottom left, #0ea5e9, transparent 60%)' }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 sm:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-8"
            style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#7dd3fc' }}>
            <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
            Ralphy&apos;s Venue — Cebu City, Philippines
          </div>

          <h1 className="text-5xl sm:text-7xl font-black text-white leading-[1.05] mb-6 tracking-tight">
            Make Every{' '}
            <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #38bdf8, #0ea5e9)' }}>
              Moment
            </span>
            {' '}Magical
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Premium event management for weddings, birthdays, corporate events and more.
            <span className="text-sky-400"> Book your dream venue in minutes.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href={isLoggedIn ? '/client/dashboard' : '/register'}
              className="px-10 py-4 text-white font-bold text-base rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 32px rgba(14,165,233,0.35)' }}>
              {isLoggedIn ? 'Book Your Event' : 'Get Started Free'}
            </Link>
            <Link href="/learn-more"
              className="px-10 py-4 font-semibold text-base rounded-xl border transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1' }}>
              Learn More
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {stats.map(s => (
              <div key={s.label} className="rounded-xl p-4 text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* EVENT TYPES */}
      <section className="py-20" style={{ background: '#0d1f35', borderTop: '1px solid rgba(14,165,233,0.1)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Events We Specialize In</h2>
            <p className="text-slate-400 max-w-md mx-auto">From intimate gatherings to grand celebrations — we handle it all.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {eventTypes.map((e) => (
              <div key={e.id} className="rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 cursor-default"
                style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}>
                <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: '#0ea5e9' }} />
                </div>
                <p className="font-bold text-white text-sm mb-1">{e.event_type}</p>
                <p className="text-xs text-slate-400">{e.description || 'Custom event planning tailored to your celebration.'}</p>
              </div>
            ))}
          </div>
          {eventTypes.length === 0 && (
            <p className="text-center text-sm text-slate-500 mt-6">No event types available yet.</p>
          )}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20" style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-3">Why Choose Us</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Everything You Need</h2>
            <p className="text-slate-400 max-w-md mx-auto">All the tools and features to make your event a success.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-5">
            {FEATURES.map((f, index) => (
              <div
                key={f.title}
                className={`rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 sm:col-span-1 lg:col-span-2 ${
                  FEATURES.length % 3 === 2 && index >= FEATURES.length - 2 ? 'lg:col-span-3' : ''
                }`}
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                  style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#0ea5e9' }} />
                </div>
                <h3 className="font-black text-white text-base mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c2d4a, #0a1628)' }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
        <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center relative z-10">
          <h2 className="text-3xl sm:text-5xl font-black text-white mb-5 leading-tight">Ready to Create Your Dream Event?</h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Join hundreds of happy clients who&apos;ve hosted unforgettable events at Ralphy&apos;s Venue.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={isLoggedIn ? '/client/dashboard' : '/register'}
              className="px-10 py-4 font-black text-base rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 text-white"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 32px rgba(14,165,233,0.35)' }}>
              {isLoggedIn ? 'Book Now' : 'Create Free Account'}
            </Link>
            <Link href="/ratings"
              className="px-10 py-4 font-bold text-base rounded-xl border transition-all hover:-translate-y-0.5 active:scale-95"
              style={{ borderColor: 'rgba(14,165,233,0.4)', color: '#7dd3fc', background: 'rgba(14,165,233,0.08)' }}>
              Read Reviews
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#060e1a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>E</div>
              <span className="text-white font-black text-lg">EventPro</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">Professional event management at Ralphy&apos;s Venue. Creating unforgettable memories.</p>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[['Events', '/events'], ['Reviews', '/ratings'], ['Book Now', '/client/dashboard'], ['My Bookings', '/my-bookings'], ['Contact', '/contact']].map(([l, h]) => (
                <li key={l}><Link href={h} className="text-slate-500 hover:text-sky-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Contact</h3>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>Basak San Nicolas Villa Kalubihan, Cebu City 6000</li>
              <li>0993 926 1681</li>
              <li>ralph.villarojo@gmail.com</li>
            </ul>
          </div>
        </div>
        <div className="text-center py-4 text-xs text-slate-700" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          © {new Date().getFullYear()} EventPro — Ralphy&apos;s Venue. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

