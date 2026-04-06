'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MobileNav from '@/components/MobileNav';
import { API_BASE } from '@/lib/api';

interface Event {
  id: number;
  user: string;
  event_type: string;
  description: string;
  capacity: number;
  date: string;
  time: string;
  location: string;
  status: string;
}

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [eventTypeOptions, setEventTypeOptions] = useState<string[]>([]);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('clientToken'));
    fetch(`${API_BASE}/event-types/`)
      .then(r => r.json())
      .then(data => setEventTypeOptions(data.map((et: any) => et.event_type)))
      .catch(() => {});
    fetchEvents(filter);
  }, [filter]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEvents(events);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredEvents(events.filter(e =>
        e.event_type.toLowerCase().includes(q) ||
        e.user.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.date.includes(q)
      ));
    }
  }, [searchQuery, events]);

  const fetchEvents = async (eventType: string) => {
    setLoading(true);
    try {
      const url = eventType
        ? `${API_BASE}/events/public/?type=${eventType}&status=confirmed`
        : `${API_BASE}/events/public/?status=confirmed`;
      const res = await fetch(url);
      const data = await res.json();
      const confirmed = data.filter((e: Event) => e.status === 'confirmed');
      setEvents(confirmed);
      setFilteredEvents(confirmed);
    } catch {}
    finally { setLoading(false); }
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
        <div className="max-w-7xl mx-auto px-6 sm:px-8 py-10 relative z-10">
          <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-2">Public Events</p>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Confirmed Events</h1>
          <p className="text-sky-400 text-sm mt-2">Discover amazing confirmed events happening at Ralphy's Venue</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">

        {/* Search + Filters */}
        <div className="rounded-2xl p-5 mb-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            type="text"
            placeholder="Search events by type, host, description or date..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 mb-4"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(14,165,233,0.2)' }}
          />
          <div className="flex flex-wrap gap-2">
            {['', ...eventTypeOptions].map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                style={filter === type
                  ? { background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', color: '#fff', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }
                  : { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}>
                {type === '' ? 'All Events' : type}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p className="text-xs text-slate-500 mb-5">
            {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sky-400 text-sm">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-2xl p-16 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.2)' }}>
              <svg className="w-8 h-8 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">No events found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredEvents.map(event => (
              <div key={event.id}
                className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>

                {/* Top accent */}
                <div className="h-1" style={{ background: 'linear-gradient(90deg, #0ea5e9, #0369a1)' }} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                        style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)', color: '#38bdf8' }}>
                        {event.event_type}
                      </span>
                      <h3 className="text-base font-black text-white">Hosted by {event.user}</h3>
                    </div>
                    <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: 'rgba(14,165,233,0.12)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.25)' }}>
                      Confirmed
                    </span>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">{event.description}</p>
                  )}

                  {/* Details */}
                  <div className="space-y-2">
                    {[
                      { label: 'Date', value: event.date },
                      { label: 'Time', value: event.time || 'TBA' },
                      { label: 'Capacity', value: `${event.capacity} guests` },
                      { label: 'Venue', value: event.location || "Ralphy's Venue, Cebu City" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span className="text-xs text-sky-500 font-bold">{item.label}</span>
                        <span className="text-xs text-white font-semibold text-right max-w-[60%] truncate">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
