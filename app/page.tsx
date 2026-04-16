'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  CalendarCheck2,
  CalendarHeart,
  CandlestickChart,
  CircleDollarSign,
  Clock3,
  GlassWater,
  Mail,
  MapPin,
  MessageSquareQuote,
  PartyPopper,
  Phone,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { LogoutOverlay, useLogout } from '@/components/LogoutOverlay';
import { API_BASE, apiFetch } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

interface EventType {
  id: number;
  event_type: string;
  description: string;
}

interface Review {
  id: number;
  rating: number;
  booking_id?: number | null;
}

interface PublicStats {
  events_hosted: number;
  average_rating: number;
  event_types: number;
  satisfaction_rate: number;
}

interface LandingCarouselImage {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  display_order: number;
}

const LEGACY_EVENT_TYPES = new Set(['Birthday', 'Wedding', 'Conference', 'Corporate Event', 'Concert', 'Debu']);

const FEATURES = [
  { title: 'Easy Booking', desc: 'Book your event in minutes with our streamlined process.' },
  { title: 'Real-Time Availability', desc: 'Instant room availability so you always know what\'s open.' },
  { title: 'Flexible Payments', desc: 'Pay via Cash or GCash — whichever works best for you.' },
  { title: 'Live Notifications', desc: 'Get notified the moment your booking is confirmed or updated.' },
  { title: 'Verified Reviews', desc: 'Read honest reviews from real clients who\'ve hosted events.' },
];

const EVENT_ICON_RULES: Array<{ match: RegExp; icon: LucideIcon }> = [
  { match: /wedding|bridal|engagement/i, icon: CalendarHeart },
  { match: /birthday|debut|anniversary|celebration/i, icon: PartyPopper },
  { match: /corporate|business|conference|seminar|meeting/i, icon: Users },
  { match: /christening|baptism|baby|shower/i, icon: Sparkles },
  { match: /dinner|banquet|reception|gala/i, icon: GlassWater },
];

const getEventTypeIcon = (eventType: string): LucideIcon => {
  const matchedRule = EVENT_ICON_RULES.find(({ match }) => match.test(eventType));
  return matchedRule?.icon || CandlestickChart;
};

const getFeatureIcon = (title: string): LucideIcon => {
  switch (title) {
    case 'Easy Booking':
      return CalendarCheck2;
    case 'Real-Time Availability':
      return Clock3;
    case 'Flexible Payments':
      return CircleDollarSign;
    case 'Live Notifications':
      return BellRing;
    case 'Verified Reviews':
      return MessageSquareQuote;
    default:
      return Sparkles;
  }
};

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [landingImages, setLandingImages] = useState<LandingCarouselImage[]>([]);
  const [activeLandingImage, setActiveLandingImage] = useState(0);
  const [publicStats, setPublicStats] = useState<PublicStats>({
    events_hosted: 0,
    average_rating: 0,
    event_types: 0,
    satisfaction_rate: 0,
  });
  const { loggingOut, logout } = useLogout();
  const eventTypesScrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const checkClientSession = async () => {
      const clientToken = localStorage.getItem('clientToken');
      const organizerToken = localStorage.getItem('organizerToken');

      if (!clientToken || organizerToken) {
        setIsLoggedIn(false);
        setAuthChecked(true);
        return;
      }

      try {
        const profileRes = await apiFetch(`${API_BASE}/profile/`, {}, 'clientToken');
        if (profileRes.ok) {
          setIsLoggedIn(true);
        } else {
          localStorage.removeItem('clientToken');
          localStorage.removeItem('clientRefresh');
          localStorage.removeItem('userName');
          localStorage.removeItem('userId');
          localStorage.setItem('isOrganizer', 'false');
          setIsLoggedIn(false);
        }
      } catch {
        setIsLoggedIn(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkClientSession();
    fetch(`${API_BASE}/event-types/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setEventTypes(
        Array.isArray(data)
          ? data.filter((item) => item?.event_type && !LEGACY_EVENT_TYPES.has(item.event_type))
          : []
      ))
      .catch(() => {});
    fetch(`${API_BASE}/reviews/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => setReviews(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch(`${API_BASE}/landing-carousel/`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (!Array.isArray(data)) return;
        setLandingImages(data);
        setActiveLandingImage(0);
      })
      .catch(() => {});
    fetch(`${API_BASE}/stats/public/`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setPublicStats({
          events_hosted: Number(data.events_hosted ?? 0),
          average_rating: Number(data.average_rating ?? 0),
          event_types: Number(data.event_types ?? 0),
          satisfaction_rate: Number(data.satisfaction_rate ?? 0),
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (landingImages.length <= 1) return;
    const timer = setInterval(() => {
      setActiveLandingImage((prev: number) => (prev + 1) % landingImages.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [landingImages]);

  const averageRating = publicStats.average_rating > 0
    ? publicStats.average_rating.toFixed(1)
    : (reviews.length > 0
      ? (reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length).toFixed(1)
      : '0.0');

  const derivedAverageRating = reviews.length > 0
    ? reviews.reduce((sum: number, review: Review) => sum + review.rating, 0) / reviews.length
    : 0;

  const derivedSatisfactionRate = derivedAverageRating > 0
    ? Math.round((derivedAverageRating / 5) * 100)
    : 0;

  const derivedEventsHosted = reviews.length > 0
    ? Math.max(
        1,
        new Set(
          reviews
            .map((review: Review) => review.booking_id)
            .filter((bookingId: number | null | undefined): bookingId is number => typeof bookingId === 'number')
        ).size || reviews.length
      )
    : 0;

  const displayEventsHosted = publicStats.events_hosted > 0
    ? publicStats.events_hosted
    : derivedEventsHosted;

  const displaySatisfactionRate = publicStats.satisfaction_rate > 0
    ? publicStats.satisfaction_rate
    : derivedSatisfactionRate;

  const stats = [
    { value: String(displayEventsHosted), label: 'Events Hosted' },
    { value: averageRating, label: 'Avg. Rating' },
    { value: String(publicStats.event_types || eventTypes.length), label: 'Hall Options' },
    { value: `${displaySatisfactionRate}%`, label: 'Satisfaction' },
  ];

  const scrollEventTypes = (direction: 'left' | 'right') => {
    const scroller = eventTypesScrollerRef.current;
    if (!scroller) return;

    const card = scroller.querySelector<HTMLElement>('[data-event-card="true"]');
    const gap = 16;
    const scrollAmount = card ? card.offsetWidth + gap : Math.max(scroller.clientWidth * 0.8, 280);

    scroller.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  const showLandingImage = (index: number) => {
    if (!landingImages.length) return;
    const normalized = (index + landingImages.length) % landingImages.length;
    setActiveLandingImage(normalized);
  };

  const activeLandingItem = landingImages[activeLandingImage] ?? null;
  const hasLandingImages = landingImages.length > 0;
  const landingHeroTitle = activeLandingItem?.title || 'Upload your first hero image from Django super admin';
  const landingHeroSubtitle = activeLandingItem?.subtitle || '';

  const navLinks = isLoggedIn
    ? [
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
        { label: 'Reviews', href: '/ratings' },
        { label: 'Contact', href: '/contact' },
        { label: 'Sign In', href: '/signin' },
        { label: 'Register', href: '/register', highlight: true },
      ];

  const ctaHref = authChecked && isLoggedIn ? '/client/dashboard' : '/register';
  const ctaLabel = authChecked && isLoggedIn ? 'Reserve A Hall' : 'Get Started Free';
  const finalCtaLabel = authChecked && isLoggedIn ? 'Book Now' : 'Create Free Account';

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

        <div className="relative z-10 max-w-6xl mx-auto px-6 sm:px-8 py-20 sm:py-24 w-full">
          <div className="grid items-center gap-10 lg:gap-14 lg:grid-cols-[1.14fr_0.86fr]">
            <div className="order-2 lg:order-1">
              <div className="relative overflow-hidden rounded-[34px] border p-3 sm:p-4"
                style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 26px 60px rgba(2, 12, 27, 0.45)' }}>
                {hasLandingImages ? (
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[28px]">
                    <img
                      src={activeLandingItem?.image}
                      alt={activeLandingItem?.title || 'Venue setup preview'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.06) 0%, rgba(2,6,23,0.36) 100%)' }} />
                  </div>
                ) : (
                  <div
                    className="aspect-[4/3] rounded-[28px] p-8 sm:p-10 flex flex-col justify-between"
                    style={{ background: 'linear-gradient(145deg, rgba(14,165,233,0.12), rgba(255,255,255,0.04))' }}
                  >
                    <div className="inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
                      style={{ background: 'rgba(8,47,73,0.72)', border: '1px solid rgba(125,211,252,0.25)', color: '#dbeafe' }}>
                      <span className="w-2 h-2 rounded-full bg-sky-400" />
                      Awaiting admin upload
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.28em] text-sky-300 mb-3">Landing Carousel</p>
                      <h3 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight">The first uploaded image will appear here.</h3>
                      <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
                        Super admins can add hero photos in Django admin using either direct upload or image URL, then control the order for each slide.
                      </p>
                    </div>
                  </div>
                )}

                <div className="absolute left-6 right-6 bottom-6 flex items-center justify-between gap-4">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold"
                    style={{ background: 'rgba(8,47,73,0.82)', border: '1px solid rgba(125,211,252,0.3)', color: '#dbeafe' }}>
                    <span className="w-2 h-2 bg-sky-400 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
                    {hasLandingImages ? `Slide ${activeLandingImage + 1} of ${landingImages.length}` : 'No uploaded slides yet'}
                  </div>

                  <div className="hidden sm:flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Show previous venue image"
                      onClick={() => showLandingImage(activeLandingImage - 1)}
                      disabled={!hasLandingImages}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: 'rgba(8,47,73,0.82)', border: '1px solid rgba(255,255,255,0.16)' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      aria-label="Show next venue image"
                      onClick={() => showLandingImage(activeLandingImage + 1)}
                      disabled={!hasLandingImages}
                      className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                      style={{ background: 'rgba(8,47,73,0.82)', border: '1px solid rgba(255,255,255,0.16)' }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 text-center lg:text-left lg:pl-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold mb-6"
                style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#7dd3fc' }}>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
                Ralphy&apos;s Venue - Cebu City, Philippines
              </div>

              <h1 className="text-4xl sm:text-6xl font-black text-white leading-[0.98] tracking-tight mb-6">
                Your Grand Space,
                <span className="block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #67e8f9, #0ea5e9)' }}>
                  Reserved in Seconds.
                </span>
              </h1>

              <p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-300 mb-4">
                {landingHeroTitle}
              </p>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-[34rem] mx-auto lg:mx-0 mb-8">
                {landingHeroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-7">
                <Link href={ctaHref}
                  className="px-10 py-4 text-white font-bold text-base rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 32px rgba(14,165,233,0.35)' }}>
                  {ctaLabel}
                </Link>
                <Link href="/learn-more"
                  className="px-10 py-4 font-semibold text-base rounded-xl border transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1' }}>
                  Learn More
                </Link>
              </div>

              <div className="flex items-center justify-center lg:justify-start gap-2 mb-8">
                {Array.from({ length: Math.max(landingImages.length, 1) }).map((_, index) => (
                  <button
                    key={`hero-dot-${index}`}
                    type="button"
                    aria-label={`Show venue image ${index + 1}`}
                    onClick={() => showLandingImage(index)}
                    disabled={!hasLandingImages}
                    className="rounded-full transition-all"
                    style={{
                      width: index === activeLandingImage ? 28 : 11,
                      height: 11,
                      background: index === activeLandingImage ? '#38bdf8' : 'rgba(226,232,240,0.32)',
                    }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto lg:mx-0">
                {stats.map(s => (
                  <div key={s.label} className="rounded-xl p-4 text-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-2xl font-black text-white">{s.value}</p>
                    <p className="text-xs text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="sm:hidden flex items-center justify-center gap-3 mt-6">
                <button
                  type="button"
                  aria-label="Show previous venue image"
                  onClick={() => showLandingImage(activeLandingImage - 1)}
                  disabled={!hasLandingImages}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Show next venue image"
                  onClick={() => showLandingImage(activeLandingImage + 1)}
                  disabled={!hasLandingImages}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>
      {/* HALL TYPES */}
      <section className="py-20" style={{ background: '#0d1f35', borderTop: '1px solid rgba(14,165,233,0.1)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8">
          <div className="text-center mb-12">
            <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-3">What We Offer</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Available Venue Halls</h2>
            <p className="text-slate-400 max-w-md mx-auto">From intimate gatherings to grand celebrations — we handle it all.</p>
          </div>
          {eventTypes.length > 0 && (
            <div className="relative">
              <button
                type="button"
                aria-label="Scroll event types left"
                onClick={() => scrollEventTypes('left')}
                className="hidden sm:flex absolute left-0 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full text-white transition-all hover:scale-105"
                style={{ background: 'rgba(8,47,73,0.95)', border: '1px solid rgba(14,165,233,0.35)', boxShadow: '0 12px 30px rgba(2,12,27,0.35)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div
                ref={eventTypesScrollerRef}
                className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {eventTypes.map((e) => {
                  const EventTypeIcon = getEventTypeIcon(e.event_type);

                  return (
                    <div
                      key={e.id}
                      data-event-card="true"
                      className="min-w-[260px] sm:min-w-[280px] lg:min-w-[300px] rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 cursor-default snap-start"
                      style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.15)' }}
                    >
                      <div className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                        style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.3)' }}>
                        <EventTypeIcon className="w-5 h-5 text-sky-400" strokeWidth={2.2} />
                      </div>
                      <p className="font-bold text-white text-sm mb-1">{e.event_type}</p>
                      <p className="text-xs text-slate-400">{e.description || 'Well-prepared hall option for your venue reservation.'}</p>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                aria-label="Scroll event types right"
                onClick={() => scrollEventTypes('right')}
                className="hidden sm:flex absolute right-0 top-1/2 z-10 translate-x-1/2 -translate-y-1/2 w-12 h-12 items-center justify-center rounded-full text-white transition-all hover:scale-105"
                style={{ background: 'rgba(8,47,73,0.95)', border: '1px solid rgba(14,165,233,0.35)', boxShadow: '0 12px 30px rgba(2,12,27,0.35)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
          {eventTypes.length === 0 && (
            <p className="text-center text-sm text-slate-500 mt-6">No hall types available yet.</p>
          )}
          {eventTypes.length > 0 && (
            <div className="sm:hidden flex justify-center gap-3 mt-4">
              <button
                type="button"
                aria-label="Scroll event types left"
                onClick={() => scrollEventTypes('left')}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(8,47,73,0.95)', border: '1px solid rgba(14,165,233,0.35)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Scroll event types right"
                onClick={() => scrollEventTypes('right')}
                className="w-11 h-11 rounded-full flex items-center justify-center text-white"
                style={{ background: 'rgba(8,47,73,0.95)', border: '1px solid rgba(14,165,233,0.35)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
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
            {FEATURES.map((f, index) => {
              const FeatureIcon = getFeatureIcon(f.title);

              return (
                <div
                  key={f.title}
                  className={`rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 sm:col-span-1 lg:col-span-2 ${
                    FEATURES.length % 3 === 2 && index >= FEATURES.length - 2 ? 'lg:col-span-3' : ''
                  }`}
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(14,165,233,0.15)', border: '1px solid rgba(14,165,233,0.25)' }}>
                    <FeatureIcon className="w-[18px] h-[18px] text-sky-400" strokeWidth={2.2} />
                  </div>
                  <h3 className="font-black text-white text-base mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {!isLoggedIn && (
        <section className="py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c2d4a, #0a1628)' }}>
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
          <div className="max-w-3xl mx-auto px-6 sm:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-5 leading-tight">Ready to Create Your Dream Event?</h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">Join hundreds of happy clients who&apos;ve hosted unforgettable events at Ralphy&apos;s Venue.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href={ctaHref}
                className="px-10 py-4 font-black text-base rounded-xl transition-all hover:-translate-y-0.5 active:scale-95 text-white"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 32px rgba(14,165,233,0.35)' }}>
                {finalCtaLabel}
              </Link>
              <Link href="/ratings"
                className="px-10 py-4 font-bold text-base rounded-xl border transition-all hover:-translate-y-0.5 active:scale-95"
                style={{ borderColor: 'rgba(14,165,233,0.4)', color: '#7dd3fc', background: 'rgba(14,165,233,0.08)' }}>
                Read Reviews
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer style={{ background: '#060e1a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-6 sm:px-8 py-12 grid grid-cols-1 sm:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>E</div>
              <span className="text-white font-black text-lg">Spacio Grande</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed">Professional event management at Ralphy&apos;s Venue. Creating unforgettable memories.</p>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              {[['Reviews', '/ratings'], ['Book Now', '/client/dashboard'], ['My Bookings', '/my-bookings'], ['Contact', '/contact']].map(([l, h]) => (
                <li key={l}><Link href={h} className="text-slate-500 hover:text-sky-400 transition-colors">{l}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-white font-bold text-sm mb-4 uppercase tracking-widest">Contact</h3>
            <ul className="space-y-3 text-sm text-slate-500">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" strokeWidth={2.2} />
                <span>Basak San Nicolas Villa Kalubihan, Cebu City 6000</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-sky-400 shrink-0" strokeWidth={2.2} />
                <span>0993 926 1681</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-sky-400 shrink-0" strokeWidth={2.2} />
                <span>ralph.villarojo@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="text-center py-4 text-xs text-slate-700" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          © {new Date().getFullYear()} Spacio Grande — Ralphy&apos;s Venue. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

