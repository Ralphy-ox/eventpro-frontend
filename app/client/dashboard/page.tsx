'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

const VENUE_LOCATION = "Ralphy's Venue, Basak San Nicolas Villa Kalubihan Cebu City 6000.";

interface EventType {
  id: number; event_type: string; price: number;
  included_capacity: number; max_capacity: number; people_per_table: number; description: string;
  max_invited_emails: number; excess_person_fee: number; image: string | null;
}

interface ComboSuggestion {
  label: string;
  combined_capacity: number;
  base_price: number;
  halls: string[];
}

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = "w-full h-12 px-4 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm";
const lCls = "block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2";

const capitalizeWords = (value: string) =>
  value.replace(/\b([a-z])/g, char => char.toUpperCase());

const shouldCapitalizeEventField = (key: string) =>
  key.includes('first_name') || key.includes('last_name');

const getTodayDate = () => {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split('T')[0];
};

const getTomorrowDate = () => {
  const now = new Date();
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffsetMs + 86400000).toISOString().split('T')[0];
};

const TIME_OPTIONS = [
  '08:00','09:00','10:00','11:00','12:00',
  '13:00','14:00','15:00','16:00','17:00',
  '18:00','19:00','20:00',
];

const formatTime12h = (time24: string) => {
  const [h] = time24.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:00 ${period}`;
};

const getEndTime = (startTime: string) => {
  const [h] = startTime.split(':').map(Number);
  const endH = Math.min(h + 8, 23);
  return formatTime12h(`${endH}:00`);
};

export default function ClientDashboard() {
  const router = useRouter();
  const today = getTodayDate();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [eventType, setEventType] = useState('');
  const [description, setDescription] = useState('');
  const [numPeopleInvited, setNumPeopleInvited] = useState<number>(0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availableRooms, setAvailableRooms] = useState<number | null>(null);
  const [isBooked, setIsBooked] = useState<boolean | null>(null);
  const [comboSuggestions, setComboSuggestions] = useState<ComboSuggestion[]>([]);
  const [selectedCombo, setSelectedCombo] = useState<ComboSuggestion | null>(null);
  const [pricingInfo, setPricingInfo] = useState<null | {
    base_price: number;
    included_capacity: number;
    max_capacity: number;
    excess_person_fee: number;
    excess_guests: number;
    excess_total: number;
    total_amount: number;
    single_hall_supported?: boolean;
  }>(null);
  const [descriptionError, setDescriptionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [eventDetails, setEventDetails] = useState<Record<string, string>>({});
  const tomorrow = getTomorrowDate();
  const [invitedEmails, setInvitedEmails] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [emailsError, setEmailsError] = useState('');

  const getEffectiveIncludedCapacity = (venue: EventType | null) => {
    if (!venue) return 0;
    return venue.included_capacity > 0
      ? venue.included_capacity
      : venue.max_capacity > 0
        ? venue.max_capacity
        : 50;
  };

  const getEffectiveExcessPersonFee = (venue: EventType | null) => {
    if (!venue) return 0;
    return venue.excess_person_fee > 0 ? venue.excess_person_fee : 200;
  };

  const getEffectiveSingleHallLimit = (venue: EventType | null) => {
    if (!venue) return 0;
    const included = getEffectiveIncludedCapacity(venue);
    return venue.max_capacity > included ? venue.max_capacity : included;
  };

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    if (!token) { alert('Please login to access this page'); router.push('/signin'); return; }
    if (localStorage.getItem('organizerToken')) { alert('Organizers cannot access client pages!'); router.push('/organizer-dashboard'); return; }
    loadEventTypes();
  }, [router]);

  const loadEventTypes = async () => {
    try {
      setLoadingEventTypes(true);
      const res = await fetch(`${API_BASE}/event-types/`);
      if (res.ok) {
        const data = await res.json();
        setEventTypes(
          Array.isArray(data)
            ? data.map((venue) => ({
                ...venue,
                included_capacity: venue?.included_capacity > 0 ? venue.included_capacity : (venue?.max_capacity > 0 ? venue.max_capacity : 50),
                excess_person_fee: venue?.excess_person_fee > 0 ? venue.excess_person_fee : 200,
                max_capacity: venue?.max_capacity > 0 ? venue.max_capacity : (venue?.included_capacity > 0 ? venue.included_capacity : 50),
              }))
            : []
        );
      }
      else alert('Failed to load hall types. Please refresh.');
    } catch { alert('Failed to load hall types. Please refresh.'); }
    finally { setLoadingEventTypes(false); }
  };

  const handleLogout = () => { localStorage.removeItem('clientToken'); router.push('/'); };

  const tablesNeeded = selectedEventType && numPeopleInvited > 0
    ? Math.ceil(numPeopleInvited / selectedEventType.people_per_table) : 0;
  const timeSlot = 'whole_day';
  const includedCapacity = getEffectiveIncludedCapacity(selectedEventType);
  const excessPersonFee = getEffectiveExcessPersonFee(selectedEventType);
  const singleHallLimit = getEffectiveSingleHallLimit(selectedEventType);
  const sessionBasePrice = selectedEventType ? selectedEventType.price : 0;
  const localExcessGuests = selectedEventType ? Math.max(0, numPeopleInvited - includedCapacity) : 0;
  const localExcessTotal = localExcessGuests * excessPersonFee;
  const hasExplicitSingleHallLimit = !!selectedEventType && singleHallLimit > includedCapacity;
  const singleHallTooSmall = !!selectedEventType && numPeopleInvited > singleHallLimit;
  const activeSelectionLabel = selectedCombo?.label || selectedEventType?.event_type || '';
  const activeCapacityLimit = selectedCombo
    ? (pricingInfo?.max_capacity ?? selectedCombo.combined_capacity)
    : singleHallLimit;
  const selectionTooSmall = !!activeSelectionLabel && numPeopleInvited > activeCapacityLimit;
  const isFullyBooked = isBooked === true;
  const slotAvail = isBooked === false ? 1 : 0;
  const displayPrice = pricingInfo?.total_amount ?? (sessionBasePrice + localExcessTotal);
  const displayedCardCapacity = selectedEventType ? includedCapacity : 0;

  useEffect(() => {
    if (!date || !eventType) {
      setAvailableRooms(null);
      setIsBooked(null);
      setComboSuggestions([]);
      setSelectedCombo(null);
      setPricingInfo(null);
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    const params = new URLSearchParams({
      date,
      event_type: eventType,
      time_slot: timeSlot,
      guest_count: String(numPeopleInvited || 0),
    });
    (selectedCombo?.halls || []).forEach((hall) => params.append('selected_halls', hall));
    fetch(`${API_BASE}/client/check-availability/?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return; } return res.json(); })
      .then(data => {
        if (data) {
          setAvailableRooms(data.available_rooms);
          setIsBooked(data.available_rooms === 0 || (data.morning?.available === 0 && data.afternoon?.available === 0));
          setPricingInfo(data.pricing ?? null);
          const nextSuggestions = Array.isArray(data.combo_suggestions) ? data.combo_suggestions : [];
          setComboSuggestions(nextSuggestions);
          if (selectedCombo) {
            const stillExists = nextSuggestions.find((combo: ComboSuggestion) => combo.label === selectedCombo.label);
            if (!stillExists) setSelectedCombo(null);
          }
        }
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, [eventType, numPeopleInvited, date, router, timeSlot, selectedCombo]);

  const handleBookingRequest = async () => {
    if (!eventType || !description || !numPeopleInvited || !date || !time || !paymentMethod) {
      alert('Please fill in all required fields'); return;
    }
    if (date <= today) {
      alert('Booking must be at least 1 day in advance.');
      return;
    }
    if (description.length < 10) { setDescriptionError('Description must be at least 10 characters'); return; }
    if (selectionTooSmall) {
      alert(`Your current selection only supports up to ${activeCapacityLimit} guests. Please choose a valid hall combination.`);
      return;
    }
    if (singleHallTooSmall && !selectedCombo) {
      alert(`This hall supports up to ${singleHallLimit} guests only. Please choose one of the suggested hall combinations.`);
      return;
    }
    // Validate invited emails count
    if (invitedEmails.trim() && selectedEventType) {
      const emailList = invitedEmails.split(',').map(e => e.trim()).filter(e => e);
      if (emailList.length > selectedEventType.max_invited_emails) {
        setEmailsError(`Max ${selectedEventType.max_invited_emails} guest emails allowed for ${selectedEventType.event_type}.`);
        return;
      }
    }
    setSubmitting(true);
    const token = localStorage.getItem('clientToken');
    if (!token) { alert('Session expired.'); router.push('/signin'); return; }
    try {
      const payload = {
        event_type: eventType,
        selected_halls: selectedCombo?.halls || [eventType],
        description: capitalizeWords(description ?? ''),
        capacity: numPeopleInvited,
        date,
        time,
        whole_day: false,
        time_slot: timeSlot,
        invited_emails: invitedEmails ?? '',
        payment_method: paymentMethod,
        event_details: Object.fromEntries(
          Object.entries(eventDetails ?? {}).map(([key, value]) => [
            key,
            shouldCapitalizeEventField(key) ? capitalizeWords(value) : value,
          ])
        ),
        special_requests: capitalizeWords((specialRequests ?? '').trim()),
      };

      const res = await fetch(`${API_BASE}/bookings/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return; }
      if (!res.ok) { const e = await res.json(); alert(e.message || 'Failed to create booking'); setSubmitting(false); return; }
      const data = await res.json();
      if (paymentMethod === 'QRPh' || paymentMethod === 'GCash') {
        const downpaymentAmount = Number(data.total_amount || 0) * 0.5;
        router.push(`/payment?id=${data.booking_id}&amount=${downpaymentAmount}&total=${data.total_amount}&method=${encodeURIComponent(paymentMethod.toLowerCase())}`);
      } else { alert('Booking created! Reference: ' + data.reference_number); router.push('/my-bookings'); }
    } catch { alert('Connection error.'); setSubmitting(false); }
  };

  const getEventFields = () => [
    { key: 'contact_first_name', label: 'Contact First Name', placeholder: 'e.g. Ralph', type: 'text' },
    { key: 'contact_last_name', label: 'Contact Last Name', placeholder: 'e.g. Villarojo', type: 'text' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <MobileNav links={[
        { label: 'Home', href: '/' },
        { label: 'Reviews', href: '/ratings' },
        { label: 'My Bookings', href: '/my-bookings' },
        { label: 'Settings', dropdown: [
          { label: 'Profile', href: '/profile' },
          { label: 'Logout', onClick: handleLogout, danger: true },
        ]},
      ]} showNotification />

      {/* Page header */}
      <div className="w-full relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0c2d4a 60%, #0f172a 100%)', borderBottom: '1px solid rgba(14,165,233,0.2)' }}>
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle, #0ea5e9 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute right-0 top-0 w-80 h-full opacity-10" style={{ background: 'radial-gradient(ellipse at right, #0ea5e9, transparent 70%)' }} />
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8 relative z-10">
          <h1 className="text-3xl font-black text-white tracking-tight">Reserve A Venue Hall</h1>
          <p className="text-sky-400 text-sm mt-1">{VENUE_LOCATION}</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
        {/* Notice */}
        <div className="rounded-xl p-4 mb-6 flex gap-3" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <div className="w-1 rounded-full shrink-0" style={{ background: '#0ea5e9' }} />
          <div>
            <p className="text-sky-300 text-sm font-bold mb-1">Booking Info</p>
            <p className="text-slate-400 text-xs">Pick your preferred start time (8:00 AM – 8:00 PM). Your event runs for 8 hours from the selected start time. Bookings must be made at least 1 day in advance.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form — left 3 cols */}
          <div className="lg:col-span-3 space-y-5">

            {/* Hall Type */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,165,233,0.05)' }}>
                <h2 className="text-sm font-black text-white">Hall Details</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={lCls}>Hall Type</label>
                  {loadingEventTypes ? (
                    <div className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  ) : (
                    <select value={eventType} onChange={e => {
                      const sel = eventTypes.find(et => et.event_type === e.target.value);
                      setEventType(e.target.value); setSelectedEventType(sel || null);
                      setNumPeopleInvited(getEffectiveIncludedCapacity(sel || null) || 0); setEventDetails({}); setSelectedCombo(null);
                    }} className={iCls} style={iStyle}>
                      <option value="" style={{ background: '#0c2d4a' }}>Select hall type</option>
                      {eventTypes.map(et => <option key={et.id} value={et.event_type} style={{ background: '#0c2d4a' }}>{et.event_type}</option>)}
                    </select>
                  )}
                </div>

                {selectedEventType && getEventFields().map(f => (
                  <div key={f.key}>
                    <label className={lCls}>{f.label}</label>
                    <input type={f.type} value={eventDetails[f.key] || ''}
                      onChange={e => setEventDetails(prev => ({
                        ...prev,
                        [f.key]: shouldCapitalizeEventField(f.key) ? capitalizeWords(e.target.value) : e.target.value,
                      }))}
                      placeholder={f.placeholder} className={iCls} style={iStyle} />
                  </div>
                ))}

                <div>
                  <label className={lCls}>Reservation Details</label>
                  <textarea value={description} onChange={e => setDescription(capitalizeWords(e.target.value))}
                    placeholder="Describe your event — theme, purpose, special requests..."
                    rows={3} className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none text-sm"
                    style={iStyle} />
                  {descriptionError && <p className="mt-1 text-xs text-red-400">{descriptionError}</p>}
                </div>

                <div>
                  <label className={lCls}>Guest Email Invitations <span className="text-slate-500 normal-case font-normal">(optional)</span></label>
                  <textarea
                    value={invitedEmails}
                    onChange={e => { setInvitedEmails(e.target.value); setEmailsError(''); }}
                    placeholder="Enter guest emails separated by commas&#10;e.g. friend1@gmail.com, friend2@gmail.com"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none text-sm"
                    style={iStyle}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedEventType ? `Max ${selectedEventType.max_invited_emails} guest emails for ${selectedEventType.event_type}.` : 'Each guest will receive an invitation email when you reserve a hall.'}
                  </p>
                  {emailsError && <p className="mt-1 text-xs text-red-400">{emailsError}</p>}
                </div>

                <div>
                  <label className={lCls}>Special Requests <span className="text-slate-500 normal-case font-normal">(optional)</span></label>
                  <textarea value={specialRequests} onChange={e => setSpecialRequests(capitalizeWords(e.target.value))}
                    placeholder="Any special arrangements, dietary needs, decorations, etc."
                    rows={3} className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none text-sm"
                    style={iStyle} />
                </div>

                <div>
                  <label className={lCls}>Number of Guests</label>
                  <input
                    type="number"
                    min={1}
                    value={numPeopleInvited || ''}
                    onChange={e => setNumPeopleInvited(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="Select hall type first"
                    className={iCls}
                    style={{ ...iStyle, opacity: selectedEventType ? 1 : 0.7 }}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    {selectedEventType
                      ? hasExplicitSingleHallLimit
                        ? `${selectedEventType.event_type} includes ${includedCapacity} guests in the base rate and can accommodate up to ${singleHallLimit} guests.`
                        : `${selectedEventType.event_type} includes ${includedCapacity} guests in the base rate. Extra guests are billed per person automatically.`
                      : 'Guest limit will be filled in automatically after you select a hall type.'}
                  </p>
                  {selectedEventType && localExcessGuests > 0 && !singleHallTooSmall && (
                    <p className="mt-1 text-xs text-amber-300">
                      Excess fee applies: {localExcessGuests} guest{localExcessGuests !== 1 ? 's' : ''} x P{excessPersonFee.toLocaleString()} = P{localExcessTotal.toLocaleString()}.
                    </p>
                  )}
                  {selectedEventType && singleHallTooSmall && !selectedCombo && (
                    <p className="mt-1 text-xs text-red-400">
                      This hall only supports up to {singleHallLimit} guests. Check the hall combo suggestions below.
                    </p>
                  )}
                  {selectedCombo && (
                    <p className="mt-1 text-xs text-sky-300">
                      Combo selected: {selectedCombo.label}. Combined capacity up to {activeCapacityLimit} guests.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Session & Date */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,165,233,0.05)' }}>
                <h2 className="text-sm font-black text-white">Schedule</h2>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lCls}>Event Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      min={tomorrow}
                      className={iCls} style={{ ...iStyle, colorScheme: 'dark' }} />
                    {date && (
                      <p className="text-xs text-slate-400 mt-1">
                        {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className={lCls}>Start Time</label>
                    <select value={time} onChange={e => setTime(e.target.value)} className={iCls} style={iStyle}>
                      <option value="" style={{ background: '#0c2d4a' }}>Select start time</option>
                      {TIME_OPTIONS.map(t => (
                        <option key={t} value={t} style={{ background: '#0c2d4a' }}>{formatTime12h(t)}</option>
                      ))}
                    </select>
                    {time && (
                      <p className="text-xs text-slate-400 mt-1">
                        {formatTime12h(time)} – {getEndTime(time)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar — 2 cols */}
          <div className="lg:col-span-2 space-y-5">

            {/* Package info */}
            {selectedEventType && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
                {selectedEventType.image && (
                  <img src={selectedEventType.image} alt={selectedEventType.event_type}
                    className="w-full object-cover" style={{ height: '180px' }} />
                )}
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
                  <h2 className="text-sm font-black text-sky-300">Hall Info</h2>
                  {selectedEventType.description && (
                    <p className="text-xs text-slate-400 mt-1">{selectedEventType.description}</p>
                  )}
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Base Rate', value: `₱${selectedEventType.price.toLocaleString()}` },
                    { label: 'Can Accommodate', value: displayedCardCapacity },
                    { label: 'Per Table', value: `${selectedEventType.people_per_table} pax` },
                    { label: 'Tables Needed', value: numPeopleInvited > 0 ? tablesNeeded : '—' },
                  ].map(item => (
                    <div key={item.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <p className="text-xs text-sky-500 mb-1">{item.label}</p>
                      <p className="font-black text-white text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Availability */}
            {loading ? (
              <div className="rounded-2xl p-8 flex items-center justify-center gap-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sky-400 text-sm">Checking availability...</span>
              </div>
            ) : availableRooms !== null && (
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,165,233,0.05)' }}>
                  <h2 className="text-sm font-black text-white">Availability</h2>
                </div>
                <div className="p-5">
                  {isFullyBooked ? (
                    <div className="rounded-2xl p-5 mb-5 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-xs text-red-300 uppercase tracking-[0.25em] mb-2">Status</p>
                      <p className="text-2xl font-black text-red-400">Fully Booked</p>
                      <p className="text-xs text-red-200 mt-2">This hall is already reserved for this date.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl p-4 mb-5 text-center" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      <p className="text-xs text-green-300 uppercase tracking-[0.25em] mb-1">Status</p>
                      <p className="text-2xl font-black text-green-400">Available</p>
                      <p className="text-xs text-green-200 mt-1">This hall is open for booking on this date.</p>
                    </div>
                  )}

                  {slotAvail > 0 ? (
                    <>
                      {selectedEventType && (
                        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}>
                          <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-1">Total Price</p>
                          <p className="text-xs text-amber-300 mt-2">Downpayment due now: P{(displayPrice * 0.5).toLocaleString()}</p>
                          <p className="text-xs text-slate-400 mt-1">Remaining balance after downpayment: P{(displayPrice * 0.5).toLocaleString()}</p>
                          <p className="text-3xl font-black text-white">₱{displayPrice.toLocaleString()}</p>
                          <p className="text-xs text-sky-400 mt-1">{activeSelectionLabel}{time ? ` · ${formatTime12h(time)} – ${getEndTime(time)}` : ''}</p>
                        </div>
                      )}

                      <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">Price Breakdown</p>
                        <div className="text-xs text-slate-300 space-y-1">
                          <p>Base session: P{(pricingInfo?.base_price ?? sessionBasePrice).toLocaleString()}</p>
                          <p>Included guests: {pricingInfo?.included_capacity ?? includedCapacity}</p>
                          <p>Excess guests: {pricingInfo?.excess_guests ?? localExcessGuests}</p>
                          <p>Excess total: P{(pricingInfo?.excess_total ?? localExcessTotal).toLocaleString()}</p>
                        </div>
                      </div>

                      {comboSuggestions.length > 0 && (
                        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.3)' }}>
                          <p className="text-xs text-amber-300 font-bold uppercase tracking-widest mb-2">Suggested Hall Combinations</p>
                          {comboSuggestions.map((combo) => (
                            <button
                              type="button"
                              key={combo.label}
                              onClick={() => setSelectedCombo(current => current?.label === combo.label ? null : combo)}
                              className="w-full text-left rounded-lg px-3 py-2 mb-2 last:mb-0 transition-all"
                              style={{
                                background: selectedCombo?.label === combo.label ? 'rgba(14,165,233,0.18)' : 'rgba(255,255,255,0.05)',
                                border: selectedCombo?.label === combo.label ? '1px solid rgba(14,165,233,0.35)' : '1px solid transparent',
                              }}>
                              <p className="text-sm font-bold text-white">{combo.label}</p>
                              <p className="text-xs text-slate-300">Combined capacity: {combo.combined_capacity} guests</p>
                              <p className="text-xs text-slate-300">Estimated base total: P{Number(combo.base_price).toLocaleString()}</p>
                              <p className="text-xs text-amber-200 mt-1">{selectedCombo?.label === combo.label ? 'Selected for booking' : 'Tap to use this hall combination'}</p>
                            </button>
                          ))}
                          <p className="text-xs text-amber-200 mt-2">Use these venue combinations when one hall is no longer enough for your guest count.</p>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className={lCls}>Payment Method</label>
                        <div className="space-y-2">
                          {[
                            { value: 'Cash', label: 'Cash', desc: 'Pay at the venue' },
                            { value: 'GCash', label: 'GCash', desc: 'Mobile wallet' },
                            { value: 'QRPh', label: 'QR Ph', desc: 'Scan with GCash, Maya, or banks' },
                          ].map(m => (
                            <label key={m.value} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                              style={{ border: `1px solid ${paymentMethod === m.value ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.08)'}`, background: paymentMethod === m.value ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)' }}>
                              <input type="radio" name="payment" value={m.value} checked={paymentMethod === m.value}
                                onChange={e => setPaymentMethod(e.target.value)} className="w-4 h-4 accent-sky-500" />
                              <div>
                                <p className="font-bold text-white text-sm">{m.label}</p>
                                <p className="text-xs text-slate-400">{m.desc}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="mb-4 rounded-xl p-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <p className="text-xs font-bold uppercase tracking-widest text-red-300 mb-1">Important Note</p>
                        <p className="text-sm text-red-200">A 50% booking downpayment is required. This downpayment is non-refundable once submitted.</p>
                      </div>

                      <button onClick={handleBookingRequest} disabled={submitting || !paymentMethod || selectionTooSmall || (singleHallTooSmall && !selectedCombo)}
                        className="w-full py-3.5 rounded-xl text-white font-black text-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9, #0369a1)', boxShadow: '0 4px 20px rgba(14,165,233,0.3)' }}>
                        {submitting ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Processing...
                          </span>
                        ) : 'Confirm & Submit Booking'}
                      </button>
                    </>
                  ) : (
                    <div className="text-center py-6 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <p className="text-red-400 font-bold text-sm">This hall is already booked for this date.</p>
                      <p className="text-red-300 text-xs mt-1">Please choose a different date.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}



