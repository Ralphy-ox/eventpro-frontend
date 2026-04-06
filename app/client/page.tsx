'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { API_BASE, APP_BASE } from '@/lib/api';

const MAX_ROOMS = 5;
const VENUE_LOCATION =
  "Ralphy's Venue, Basak San Nicolas Villa Kalubihan Cebu City 6000.";

export default function ClientDashboard() {
  const [eventType, setEventType] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState<number>(0);
  const [date, setDate] = useState('');
  const [availableRooms, setAvailableRooms] = useState<number | null>(null);
  const [emails, setEmails] = useState('');
  const [emailError, setEmailError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const guestLimit =
    eventType === 'Birthday' || eventType === 'Wedding'
      ? 50
      : 100;

  const percentageBooked =
    availableRooms !== null
      ? ((MAX_ROOMS - availableRooms) / MAX_ROOMS) * 100
      : 0;

  const status =
    availableRooms === 0
      ? 'Fully Booked'
      : availableRooms === 1
      ? 'Almost Full'
      : 'Available';

  useEffect(() => {
    if (!eventType || !capacity || !date) return;

    setLoading(true);
    const token = localStorage.getItem('clientToken');

    fetch(
      `${API_BASE}/client/check-availability/?date=${date}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )
      .then(res => {
        if (!res.ok) throw new Error('Failed to check availability');
        return res.json();
      })
      .then(data => {
        setAvailableRooms(data.available_rooms);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error checking availability:', err);
        setLoading(false);
      });
  }, [eventType, capacity, date]);

  const generateConcertQR = async (generatedEventId: string) => {
    const paymentURL = `${APP_BASE}/ticket-payment?eventId=${generatedEventId}`;
    const qr = await QRCode.toDataURL(paymentURL);
    setQrCode(qr);
  };

  const handleBookingRequest = async () => {
    const emailList = emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e !== '');

    if (!description.trim()) {
      setDescriptionError('Please provide a description of the event.');
      return;
    }

    if (emailList.length < 10) {
      setEmailError('You must provide at least 10 email invitations.');
      return;
    }

    setDescriptionError('');
    setEmailError('');
    setSubmitting(true);

    try {
      const token = localStorage.getItem('clientToken');
      const response = await fetch(`${API_BASE}/bookings/create/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_type: eventType,
          description: description,
          capacity: capacity,
          date: date,
          invited_emails: emails,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      const data = await response.json();
      alert('Booking request submitted successfully!');

      if (eventType === 'Concert') {
        const generatedEventId = data.booking_id.toString();
        setEventId(generatedEventId);
        generateConcertQR(generatedEventId);
      }

      // Reset form
      setEventType('');
      setDescription('');
      setCapacity(0);
      setDate('');
      setEmails('');
      setAvailableRooms(null);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Venue */}
      <div className="mb-6 p-4 bg-gray-100 border rounded-md">
        <h2 className="text-lg font-semibold mb-1">Venue Location</h2>
        <p className="text-gray-700">{VENUE_LOCATION}</p>
      </div>

      <h1 className="text-2xl font-bold mb-6">
        Check Event Availability
      </h1>

      {/* Event Type */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Event Type
        </label>
        <select
          value={eventType}
          onChange={e => {
            setEventType(e.target.value);
            setCapacity(0);
            setQrCode(null);
          }}
          className="w-full border rounded-md px-3 py-2"
        >
          <option value="">Select event type</option>
          <option>Wedding</option>
          <option>Birthday</option>
          <option>Conference</option>
          <option>Corporate Event</option>
          <option>Concert</option>
        </select>
      </div>

      {/* Description */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Event description..."
          rows={4}
          className="w-full border rounded-md px-3 py-2"
        />
        {descriptionError && (
          <p className="text-red-500 text-sm mt-1">
            {descriptionError}
          </p>
        )}
      </div>

      {/* Capacity */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Maximum People (Capacity)
        </label>
        <input
          type="number"
          min={1}
          max={guestLimit}
          value={capacity}
          onChange={e =>
            setCapacity(
              Math.min(Number(e.target.value), guestLimit)
            )
          }
          placeholder={`Guests (max ${guestLimit})`}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Emails */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          People Invited (Emails)
        </label>
        <textarea
          value={emails}
          onChange={e => setEmails(e.target.value)}
          placeholder="Emails separated by comma (minimum 10 required)"
          rows={3}
          className="w-full border rounded-md px-3 py-2"
        />
        {emailError && (
          <p className="text-red-500 text-sm mt-1">
            {emailError}
          </p>
        )}
      </div>

      {/* Date */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          Date and Time
        </label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {loading && <p>Checking availability...</p>}

      {availableRooms !== null && !loading && (
        <div className="border rounded-md p-4 shadow mb-4">
          <p className="font-semibold">Availability Status:</p>
          <p>Rooms Available: {availableRooms} / {MAX_ROOMS}</p>
          <p>Booked: {percentageBooked}%</p>
          <p>Status: {status}</p>
          <p className="mt-2 text-sm text-gray-600">
            Maximum People: {guestLimit} guests for {eventType || 'this event'}
          </p>
        </div>
      )}

      {/* Create Booking Button */}
      <button
        onClick={handleBookingRequest}
        disabled={!eventType || !description || !capacity || !date || availableRooms === 0 || submitting}
        className="w-full py-2 rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
      >
        {submitting ? 'Submitting...' : 'Create Booking'}
      </button>

      {/* QR Section */}
      {qrCode && (
        <div className="mt-8 text-center border p-6 rounded-md">
          <h2 className="text-xl font-bold mb-4">
            Concert Ticket QR
          </h2>
          <img src={qrCode} alt="QR Code" className="mx-auto" />
          <p className="mt-4 text-sm text-gray-600">
            Event ID: {eventId}
          </p>
        </div>
      )}
    </div>
  );
}
