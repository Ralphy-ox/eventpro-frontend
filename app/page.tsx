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
  image?: string | null;
  included_capacity?: number;
  max_capacity?: number;
  excess_person_fee?: number;
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

const getFeatureCardClassName = (index: number, total: number) => {
  if (total === 5 && index === 3) return 'xl:col-start-2 xl:col-span-2';
  if (total === 5 && index === 4) return 'xl:col-start-4 xl:col-span-2';
  return 'xl:col-span-2';
};

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

const getEventTypeSurface = (eventType: string) => {
  if (/diamond/i.test(eventType)) {
    return {
      accent: '#38bdf8',
      background: 'linear-gradient(135deg, rgba(56,189,248,0.24), rgba(15,23,42,0.92))',
    };
  }
  if (/emerald/i.test(eventType)) {
    return {
      accent: '#34d399',
      background: 'linear-gradient(135deg, rgba(52,211,153,0.24), rgba(15,23,42,0.92))',
    };
  }
  if (/jade|jadeite/i.test(eventType)) {
    return {
      accent: '#2dd4bf',
      background: 'linear-gradient(135deg, rgba(45,212,191,0.22), rgba(15,23,42,0.92))',
    };
  }
  return {
    accent: '#60a5fa',
    background: 'linear-gradient(135deg, rgba(96,165,250,0.2), rgba(15,23,42,0.92))',
  };
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
  const [previewHall, setPreviewHall] = useState<EventType | null>(null);
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

  useEffect(() => {
    if (!previewHall) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewHall(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewHall]);

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
      <section className="relative min-h-[78vh] sm:min-h-[84vh] lg:min-h-[88vh] flex items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #07111f 0%, #0c2d4a 50%, #07111f 100%)' }}>
        {hasLandingImages && activeLandingItem?.image && (
          <div
            className="absolute inset-0 scale-105"
            style={{
              backgroundImage: `url(${activeLandingItem.image})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
              filter: 'blur(3px)',
            }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background: hasLandingImages
              ? 'linear-gradient(105deg, rgba(3,10,23,0.88) 8%, rgba(3,10,23,0.58) 48%, rgba(3,10,23,0.82) 100%)'
              : 'linear-gradient(135deg, #0a1628 0%, #0c2d4a 50%, #0a1628 100%)',
          }}
        />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, #38bdf8, transparent 60%)' }} />
        <div className="absolute bottom-0 left-0 w-[420px] h-[420px] opacity-10 pointer-events-none" style={{ background: 'radial-gradient(ellipse at bottom left, #0ea5e9, transparent 60%)' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16 w-full">
          <div className="grid items-center gap-6 sm:gap-8 lg:gap-10 xl:gap-14 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <div className="order-2 lg:order-1">
              <div className="relative h-full overflow-hidden rounded-[34px] border p-3 sm:p-4"
                style={{ background: 'rgba(10,22,40,0.42)', borderColor: 'rgba(255,255,255,0.12)', boxShadow: '0 26px 60px rgba(2, 12, 27, 0.5)', backdropFilter: 'blur(12px)' }}>
                {hasLandingImages ? (
                  <div className="relative aspect-[4/3] min-h-[220px] sm:min-h-[300px] lg:min-h-[340px] overflow-hidden rounded-[28px]">
                    <img
                      src={activeLandingItem?.image}
                      alt={activeLandingItem?.title || 'Venue setup preview'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.04) 0%, rgba(2,6,23,0.2) 55%, rgba(2,6,23,0.4) 100%)' }} />
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
                <div className="absolute left-5 right-5 bottom-5 flex justify-end sm:left-6 sm:right-6 sm:bottom-6">
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

            <div className="order-1 lg:order-2 text-center lg:text-left lg:pl-2 xl:pl-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] sm:text-xs font-semibold mb-4 sm:mb-5"
                style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.3)', color: '#7dd3fc' }}>
                <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" style={{ animation: 'pulse 2s infinite' }} />
                Ralphy&apos;s Venue - Cebu City, Philippines
              </div>

              <h1 className="mx-auto max-w-[11ch] sm:max-w-[12ch] lg:max-w-none text-[2.5rem] sm:text-[3.4rem] lg:text-[4.35rem] font-black text-white leading-[0.94] tracking-[-0.03em] mb-4 sm:mb-5 lg:mx-0">
                <span className="sm:whitespace-nowrap">Your Grand Space,</span>
                <span className="block text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #67e8f9, #0ea5e9)' }}>
                  Reserved in Seconds.
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-[34rem] mx-auto lg:mx-0 mb-5 sm:mb-6">
                {landingHeroSubtitle || 'Browse the hall, check the vibe, and lock in your preferred date without digging through a plain landing page.'}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start mb-5 sm:mb-6">
                <Link href={ctaHref}
                  className="inline-flex w-full sm:w-auto min-w-[190px] justify-center px-6 sm:px-9 py-3.5 sm:py-4 text-white font-bold text-sm sm:text-base rounded-xl transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 8px 32px rgba(14,165,233,0.35)' }}>
                  {ctaLabel}
                </Link>
                <Link href="/learn-more"
                  className="inline-flex w-full sm:w-auto min-w-[190px] justify-center px-6 sm:px-9 py-3.5 sm:py-4 font-semibold text-sm sm:text-base rounded-xl border transition-all hover:-translate-y-0.5 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#cbd5e1' }}>
                  Learn More
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-2xl mx-auto lg:mx-0">
                {stats.map(s => (
                  <div key={s.label} className="rounded-xl min-h-[82px] sm:min-h-[96px] p-3 sm:p-4 text-center flex flex-col items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-xl sm:text-2xl font-black text-white">{s.value}</p>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="sm:hidden flex items-center justify-center gap-3 mt-4">
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

        <div className="absolute bottom-4 sm:bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-slate-600">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>
      {/* HALL TYPES */}
      <section className="py-14 sm:py-16 lg:py-20" style={{ background: '#0d1f35', borderTop: '1px solid rgba(14,165,233,0.1)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
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
                  const surface = getEventTypeSurface(e.event_type);

                  return (
                    <button
                      type="button"
                      key={e.id}
                      data-event-card="true"
                      onClick={() => setPreviewHall(e)}
                      className="min-w-[240px] sm:min-w-[280px] lg:min-w-[320px] overflow-hidden rounded-[26px] text-left transition-all duration-300 hover:-translate-y-1 snap-start"
                      style={{ background: 'rgba(8,47,73,0.4)', border: '1px solid rgba(14,165,233,0.15)', boxShadow: '0 18px 45px rgba(2,12,27,0.28)' }}
                    >
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        {e.image ? (
                          <>
                            <img
                              src={e.image}
                              alt={e.event_type}
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                            />
                            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.04) 0%, rgba(2,6,23,0.18) 45%, rgba(2,6,23,0.72) 100%)' }} />
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center" style={{ background: surface.background }}>
                            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${surface.accent}` }}>
                              <EventTypeIcon className="w-7 h-7" style={{ color: surface.accent }} strokeWidth={2.2} />
                            </div>
                          </div>
                        )}

                        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
                          style={{ background: 'rgba(8,47,73,0.82)', border: '1px solid rgba(255,255,255,0.12)', color: '#e0f2fe' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: surface.accent }} />
                          View Hall
                        </div>
                      </div>

                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <p className="font-black text-white text-lg leading-tight">{e.event_type}</p>
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}>
                            <EventTypeIcon className="w-4 h-4 text-sky-400" strokeWidth={2.2} />
                          </div>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed mb-4">
                          {e.description || 'Well-prepared hall option for your venue reservation.'}
                        </p>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400">
                            {e.included_capacity
                              ? `${e.included_capacity} guests included`
                              : '50 guests included'}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-[0.2em] text-sky-300">Open</span>
                        </div>
                      </div>
                    </button>
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
      <section className="py-14 sm:py-16 lg:py-20" style={{ background: '#0a1628', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-10 lg:mb-12">
            <p className="text-xs font-bold text-sky-500 uppercase tracking-widest mb-3">Why Choose Us</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Everything You Need</h2>
            <p className="text-slate-400 max-w-md mx-auto">All the tools and features to make your event a success.</p>
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-6">
            {FEATURES.map((f, index) => {
              const FeatureIcon = getFeatureIcon(f.title);

              return (
                <div
                  key={f.title}
                  className={`flex h-full min-h-[210px] flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${getFeatureCardClassName(index, FEATURES.length)}`}
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
        <section className="py-14 sm:py-16 lg:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0c2d4a, #0a1628)' }}>
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '25px 25px' }} />
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <h2 className="text-3xl sm:text-5xl font-black text-white mb-4 sm:mb-5 leading-tight">Ready to Create Your Dream Event?</h2>
            <p className="text-slate-400 text-base sm:text-lg mb-7 sm:mb-10 max-w-xl mx-auto">Join hundreds of happy clients who&apos;ve hosted unforgettable events at Ralphy&apos;s Venue.</p>
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

      {previewHall && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
          <button
            type="button"
            aria-label="Close hall preview"
            onClick={() => setPreviewHall(null)}
            className="absolute inset-0"
            style={{ background: 'rgba(2,6,23,0.78)', backdropFilter: 'blur(8px)' }}
          />

          <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-[30px] border"
            style={{ background: '#081423', borderColor: 'rgba(255,255,255,0.1)', boxShadow: '0 30px 80px rgba(2,6,23,0.55)' }}>
            <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
              <div className="relative min-h-[280px] sm:min-h-[380px]">
                {previewHall.image ? (
                  <img src={previewHall.image} alt={previewHall.event_type} className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center" style={{ background: getEventTypeSurface(previewHall.event_type).background }}>
                    {(() => {
                      const PreviewIcon = getEventTypeIcon(previewHall.event_type);
                      const previewSurface = getEventTypeSurface(previewHall.event_type);

                      return (
                        <div className="w-24 h-24 rounded-[24px] flex items-center justify-center"
                          style={{ background: 'rgba(255,255,255,0.08)', border: `1px solid ${previewSurface.accent}` }}>
                          <PreviewIcon className="w-10 h-10" style={{ color: previewSurface.accent }} strokeWidth={2.2} />
                        </div>
                      );
                    })()}
                  </div>
                )}
                <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(2,6,23,0.04) 0%, rgba(2,6,23,0.2) 52%, rgba(2,6,23,0.66) 100%)' }} />
              </div>

              <div className="p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold mb-5"
                    style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.22)', color: '#7dd3fc' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    Hall Preview
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-black text-white leading-tight mb-4">{previewHall.event_type}</h3>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
                    {previewHall.description || 'This hall is prepared for polished venue setups, guest-ready layouts, and memorable event styling.'}
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Capacity</p>
                      <p className="text-lg font-black text-white">
                        {previewHall.included_capacity ? `${previewHall.included_capacity} Guests` : '50 Guests'}
                      </p>
                    </div>
                    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500 mb-2">Excess Fee</p>
                      <p className="text-lg font-black text-white">
                        {previewHall.excess_person_fee
                          ? `+P${previewHall.excess_person_fee.toLocaleString()} / guest`
                          : 'Applied beyond 50'}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    Base rate covers up to {previewHall.included_capacity ?? 50} guests. If the headcount goes above that, excess guest fees apply automatically.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Link href={ctaHref}
                    className="inline-flex justify-center px-6 py-3 rounded-xl text-white font-black text-sm transition-all hover:-translate-y-0.5"
                    style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 10px 28px rgba(14,165,233,0.3)' }}>
                    Reserve This Hall
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPreviewHall(null)}
                    className="inline-flex justify-center px-6 py-3 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#cbd5e1' }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: '#060e1a', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black text-white"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)' }}>S</div>
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

