'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';
import MobileNav from '@/components/MobileNav';

const MAX_ROOMS = 5;
const VENUE_LOCATION = "Ralphy's Venue, Basak San Nicolas Villa Kalubihan Cebu City 6000.";

interface EventType {
  id: number; event_type: string; price: number;
  max_capacity: number; people_per_table: number; description: string;
}

const iStyle = { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' };
const iCls = "w-full h-12 px-4 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all text-sm";
const lCls = "block text-xs font-bold text-sky-400 uppercase tracking-widest mb-2";

export default function ClientDashboard() {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null);
  const [eventType, setEventType] = useState('');
  const [description, setDescription] = useState('');
  const [numPeopleInvited, setNumPeopleInvited] = useState<number>(0);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [availableRooms, setAvailableRooms] = useState<number | null>(null);
  const [morningAvail, setMorningAvail] = useState<number | null>(null);
  const [afternoonAvail, setAfternoonAvail] = useState<number | null>(null);
  const [descriptionError, setDescriptionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEventTypes, setLoadingEventTypes] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [eventDetails, setEventDetails] = useState<Record<string, string>>({});
  const [sessionType, setSessionType] = useState<'half' | 'whole'>('half');
  const [invitedEmails, setInvitedEmails] = useState('');

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
      if (res.ok) setEventTypes(await res.json());
      else alert('Failed to load event types. Please refresh.');
    } catch { alert('Failed to load event types. Please refresh.'); }
    finally { setLoadingEventTypes(false); }
  };

  const handleLogout = () => { localStorage.removeItem('clientToken'); router.push('/'); };

  const tablesNeeded = selectedEventType && numPeopleInvited > 0
    ? Math.ceil(numPeopleInvited / selectedEventType.people_per_table) : 0;
  const wholeDay = sessionType === 'whole';
  const timeSlot = wholeDay ? 'whole_day' : (time && Number(time.split(':')[0]) < 12 ? 'morning' : 'afternoon');
  const slotAvail = timeSlot === 'whole_day' ? Math.min(morningAvail ?? MAX_ROOMS, afternoonAvail ?? MAX_ROOMS) : timeSlot === 'morning' ? (morningAvail ?? availableRooms ?? MAX_ROOMS) : (afternoonAvail ?? availableRooms ?? MAX_ROOMS);
  const displayPrice = selectedEventType
    ? wholeDay ? selectedEventType.price * 2 * 0.8 : selectedEventType.price : 0;

  useEffect(() => {
    if (!eventType || !numPeopleInvited || !date) return;
    setLoading(true);
    const token = localStorage.getItem('clientToken');
    if (!token) { router.push('/signin'); return; }
    fetch(`${API_BASE}/client/check-availability/?date=${date}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => { if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return; } return res.json(); })
      .then(data => {
        if (data) {
          setAvailableRooms(data.available_rooms);
          setMorningAvail(data.morning?.available ?? null);
          setAfternoonAvail(data.afternoon?.available ?? null);
        }
      })
      .catch(() => {}).finally(() => setLoading(false));
  }, [eventType, numPeopleInvited, date, router]);

  const handleBookingRequest = async () => {
    if (!eventType || !description || !numPeopleInvited || !date || (!wholeDay && !time) || !paymentMethod) {
      alert('Please fill in all required fields'); return;
    }
    if (description.length < 10) { setDescriptionError('Description must be at least 10 characters'); return; }
    setSubmitting(true);
    const token = localStorage.getItem('clientToken');
    if (!token) { alert('Session expired.'); router.push('/signin'); return; }
    try {
      const res = await fetch(`${API_BASE}/bookings/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event_type: eventType, description, capacity: numPeopleInvited, date, time: wholeDay ? '09:00' : time, whole_day: wholeDay, time_slot: timeSlot, invited_emails: invitedEmails, payment_method: paymentMethod, event_details: eventDetails }),
      });
      if (res.status === 401) { localStorage.removeItem('clientToken'); router.push('/signin'); return; }
      if (!res.ok) { const e = await res.json(); alert(e.message || 'Failed to create booking'); setSubmitting(false); return; }
      const data = await res.json();
      if (paymentMethod === 'GCash') {
        // Use PayMongo for automatic GCash payment
        const pmRes = await fetch(`${API_BASE}/paymongo/gcash/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ booking_id: data.booking_id }),
        });
        const pmData = await pmRes.json();
        if (pmData.checkout_url) {
          window.location.href = pmData.checkout_url;
        } else {
          alert('GCash payment error: ' + (pmData.message || 'Please try again from My Bookings.'));
          router.push('/my-bookings');
        }
      } else { alert('Booking created! Reference: ' + data.reference_number); router.push('/my-bookings'); }
    } catch { alert('Connection error.'); setSubmitting(false); }
  };

  const getEventFields = () => {
    const et = selectedEventType?.event_type.toLowerCase() || '';

    // Base fields every event gets
    const base = [
      { key: 'first_name', label: 'First Name', placeholder: 'e.g. Ralph', type: 'text' },
      { key: 'last_name', label: 'Last Name', placeholder: 'e.g. Villarojo', type: 'text' },
    ];

    // Extra fields for specific event types
    if (et.includes('birthday')) return [
      { key: 'celebrant_first_name', label: "Celebrant's First Name", placeholder: 'e.g. Ralph', type: 'text' },
      { key: 'celebrant_last_name', label: "Celebrant's Last Name", placeholder: 'e.g. Villarojo', type: 'text' },
      { key: 'celebrant_age', label: 'Age', placeholder: 'e.g. 18', type: 'number' },
    ];
    if (et.includes('wedding')) return [
      { key: 'bride_first_name', label: "Bride's First Name", placeholder: 'e.g. Sandra', type: 'text' },
      { key: 'bride_last_name', label: "Bride's Last Name", placeholder: 'e.g. Villarojo', type: 'text' },
      { key: 'groom_first_name', label: "Groom's First Name", placeholder: 'e.g. Ralph', type: 'text' },
      { key: 'groom_last_name', label: "Groom's Last Name", placeholder: 'e.g. Villarojo', type: 'text' },
    ];
    if (et.includes('christening')) return [
      { key: 'child_first_name', label: "Child's First Name", placeholder: 'e.g. Ralph', type: 'text' },
      { key: 'child_last_name', label: "Child's Last Name", placeholder: 'e.g. Villarojo', type: 'text' },
      { key: 'parent_first_name', label: "Parent's First Name", placeholder: 'e.g. Sandra', type: 'text' },
      { key: 'parent_last_name', label: "Parent's Last Name", placeholder: 'e.g. Villarojo', type: 'text' },
    ];
    if (et.includes('corporate')) return [
      { key: 'company_name', label: 'Company Name', placeholder: 'e.g. Villarojo Corp', type: 'text' },
      { key: 'contact_first_name', label: 'Contact First Name', placeholder: 'e.g. Ralph', type: 'text' },
      { key: 'contact_last_name', label: 'Contact Last Name', placeholder: 'e.g. Villarojo', type: 'text' },
    ];

    // Any other new event type automatically gets First Name + Last Name
    return base;
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a1628' }}>
      <MobileNav links={[
        { label: 'Home', href: '/' },
        { label: 'Events', href: '/events' },
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
          <h1 className="text-3xl font-black text-white tracking-tight">Create Event Booking</h1>
          <p className="text-sky-400 text-sm mt-1">{VENUE_LOCATION}</p>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
        {/* Notice */}
        <div className="rounded-xl p-4 mb-6 flex gap-3" style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <div className="w-1 rounded-full shrink-0" style={{ background: '#0ea5e9' }} />
          <div>
            <p className="text-sky-300 text-sm font-bold mb-1">Session Times</p>
            <p className="text-slate-400 text-xs">Morning: 9:00 AM – 2:00 PM (latest start 11:00 AM) &nbsp;|&nbsp; Evening: 5:00 PM – 10:00 PM (latest start 7:00 PM)</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form — left 3 cols */}
          <div className="lg:col-span-3 space-y-5">

            {/* Event Type */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,165,233,0.05)' }}>
                <h2 className="text-sm font-black text-white">Event Details</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={lCls}>Event Type</label>
                  {loadingEventTypes ? (
                    <div className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  ) : (
                    <select value={eventType} onChange={e => {
                      const sel = eventTypes.find(et => et.event_type === e.target.value);
                      setEventType(e.target.value); setSelectedEventType(sel || null);
                      setNumPeopleInvited(0); setEventDetails({});
                    }} className={iCls} style={iStyle}>
                      <option value="" style={{ background: '#0c2d4a' }}>Select event type</option>
                      {eventTypes.map(et => <option key={et.id} value={et.event_type} style={{ background: '#0c2d4a' }}>{et.event_type}</option>)}
                    </select>
                  )}
                </div>

                {selectedEventType && getEventFields().map(f => (
                  <div key={f.key}>
                    <label className={lCls}>{f.label}</label>
                    <input type={f.type} value={eventDetails[f.key] || ''}
                      onChange={e => setEventDetails(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className={iCls} style={iStyle} />
                  </div>
                ))}

                <div>
                  <label className={lCls}>Event Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your event — theme, purpose, special requests..."
                    rows={3} className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none text-sm"
                    style={iStyle} />
                  {descriptionError && <p className="mt-1 text-xs text-red-400">{descriptionError}</p>}
                </div>

                <div>
                  <label className={lCls}>Guest Email Invitations <span className="text-slate-500 normal-case font-normal">(optional)</span></label>
                  <textarea
                    value={invitedEmails}
                    onChange={e => setInvitedEmails(e.target.value)}
                    placeholder="Enter guest emails separated by commas&#10;e.g. friend1@gmail.com, friend2@gmail.com"
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all resize-none text-sm"
                    style={iStyle}
                  />
                  <p className="text-xs text-slate-500 mt-1">Each guest will receive an invitation email when you book, and a confirmation email when approved.</p>
                </div>

                <div>
                  <label className={lCls}>Number of Guests</label>
                  <input type="number" min={1} max={selectedEventType?.max_capacity || 500} value={numPeopleInvited || ''}
                    onChange={e => {
                      const val = Number(e.target.value), max = selectedEventType?.max_capacity || 500;
                      if (val > max) { alert(`Max guests: ${max}`); setNumPeopleInvited(max); }
                      else if (val >= 0) setNumPeopleInvited(val);
                    }}
                    placeholder="Enter number of guests" className={iCls} style={iStyle} />
                </div>
              </div>
            </div>

            {/* Session & Date */}
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(14,165,233,0.05)' }}>
                <h2 className="text-sm font-black text-white">Schedule</h2>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className={lCls}>Session Type</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'half', label: 'Half Day', sub: 'Morning or Evening' },
                      { value: 'whole', label: 'Whole Day', sub: '20% discount', badge: true },
                    ].map(opt => (
                      <label key={opt.value} className="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-all"
                        style={{ border: `1px solid ${sessionType === opt.value ? 'rgba(14,165,233,0.5)' : 'rgba(255,255,255,0.08)'}`, background: sessionType === opt.value ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)' }}>
                        <input type="radio" name="session" value={opt.value} checked={sessionType === opt.value as 'half' | 'whole'}
                          onChange={() => { setSessionType(opt.value as 'half' | 'whole'); setTime(''); }} className="mt-0.5 w-4 h-4 accent-sky-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{opt.label}</span>
                            {opt.badge && <span className="px-1.5 py-0.5 text-xs font-bold rounded text-white" style={{ background: '#0ea5e9' }}>-20%</span>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{opt.sub}</p>
                          {selectedEventType && (
                            <p className="text-sm font-black mt-1 text-sky-400">
                              ₱{(opt.value === 'whole' ? selectedEventType.price * 2 * 0.8 : selectedEventType.price).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lCls}>Event Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)}
                      className={iCls} style={{ ...iStyle, colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className={lCls}>{wholeDay ? 'Duration' : 'Time Slot'}</label>
                    {wholeDay ? (
                      <div className="h-12 px-4 rounded-xl flex items-center text-sm font-semibold"
                        style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.3)', color: '#7dd3fc' }}>
                        9:00 AM – 10:00 PM
                      </div>
                    ) : (
                      <select value={time} onChange={e => setTime(e.target.value)} className={iCls} style={iStyle}>
                        <option value="" style={{ background: '#0c2d4a' }}>Select time</option>
                        <optgroup label="Morning">
                          <option value="09:00" style={{ background: '#0c2d4a' }}>09:00 AM – 2:00 PM</option>
                          <option value="10:00" style={{ background: '#0c2d4a' }}>10:00 AM – 2:00 PM</option>
                          <option value="11:00" style={{ background: '#0c2d4a' }}>11:00 AM – 2:00 PM</option>
                        </optgroup>
                        <optgroup label="Evening">
                          <option value="17:00" style={{ background: '#0c2d4a' }}>05:00 PM – 10:00 PM</option>
                          <option value="18:00" style={{ background: '#0c2d4a' }}>06:00 PM – 10:00 PM</option>
                          <option value="19:00" style={{ background: '#0c2d4a' }}>07:00 PM – 10:00 PM</option>
                        </optgroup>
                      </select>
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
                <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(14,165,233,0.15)' }}>
                  <h2 className="text-sm font-black text-sky-300">Package Info</h2>
                </div>
                <div className="p-5 grid grid-cols-2 gap-3">
                  {[
                    { label: 'Base Price', value: `₱${selectedEventType.price.toLocaleString()}` },
                    { label: 'Max Guests', value: selectedEventType.max_capacity },
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
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {[
                      { label: 'Morning', value: `${morningAvail ?? '—'}/${MAX_ROOMS}`, ok: (morningAvail ?? 1) > 0 },
                      { label: 'Afternoon', value: `${afternoonAvail ?? '—'}/${MAX_ROOMS}`, ok: (afternoonAvail ?? 1) > 0 },
                      { label: 'Status', value: slotAvail === 0 ? 'Full' : slotAvail <= 1 ? 'Almost Full' : 'Available', ok: slotAvail > 0 },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                        <p className={`text-sm font-black ${s.ok ? 'text-sky-400' : 'text-red-400'}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {slotAvail > 0 ? (
                    <>
                      {selectedEventType && (
                        <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.25)' }}>
                          <p className="text-xs text-sky-500 font-bold uppercase tracking-widest mb-1">Total Price</p>
                          <p className="text-3xl font-black text-white">₱{displayPrice.toLocaleString()}</p>
                          {wholeDay && <p className="text-xs text-slate-500 line-through mt-0.5">₱{(selectedEventType.price * 2).toLocaleString()}</p>}
                          <p className="text-xs text-sky-400 mt-1">{selectedEventType.event_type} — {wholeDay ? 'Whole Day (20% off)' : 'Half Day'}</p>
                        </div>
                      )}

                      <div className="mb-4">
                        <label className={lCls}>Payment Method</label>
                        <div className="space-y-2">
                          {[
                            { value: 'Cash', label: 'Cash', desc: 'Pay at the venue' },
                            { value: 'GCash', label: 'GCash', desc: 'Mobile wallet' },
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

                      <button onClick={handleBookingRequest} disabled={submitting || !paymentMethod}
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
                      <p className="text-red-400 font-bold text-sm">No {timeSlot === 'whole_day' ? 'whole day' : timeSlot} slots available for this date.</p>
                      <p className="text-red-300 text-xs mt-1">Please choose a different date or session.</p>
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
