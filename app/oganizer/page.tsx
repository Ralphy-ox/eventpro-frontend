'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from '@/lib/api';

type EventType = {
  id: number;
  title: string;
  date: string;
  location: string;
  status: string;
};

export default function OrganizerDashboard() {
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('organizerToken');

    if (!token) {
      router.push('/signin');
      return;
    }

    const fetchPendingEvents = async () => {
      try {
        const res = await fetch(`${API_BASE.replace(/\/user$/, '')}/organizer/pending-events/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        } else {
          console.error('Failed to fetch events');
        }
      } catch (err) {
        console.error('Connection error', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingEvents();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-bold mb-6">Pending Events to Organize</h1>

      {loading && <p>Loading events...</p>}

      {!loading && events.length === 0 && (
        <p className="text-gray-500">No pending events 🎉</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {events.map((event) => (
          <div key={event.id} className="bg-white rounded-lg shadow p-4">
            <h2 className="text-lg font-semibold">{event.title}</h2>
            <p className="text-sm text-gray-600">📍 {event.location}</p>
            <p className="text-sm text-gray-600">📅 {event.date}</p>
            <span className="inline-block mt-2 px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
              {event.status}
            </span>

            <button
              onClick={() => router.push(`/organizer/events/${event.id}`)}
              className="mt-4 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Organize Event
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
