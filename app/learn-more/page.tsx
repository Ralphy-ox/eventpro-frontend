'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import MobileNav from '@/components/MobileNav';

export default function LearnMore() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('clientToken'));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-200 via-sky-100 to-white">
      <MobileNav links={[
        { label: 'Back to Home', href: '/' },
        ...(isLoggedIn ? [{ label: 'Book Now', href: '/client/dashboard', highlight: true as const }] : [{ label: 'Register', href: '/register', highlight: true as const }]),
      ]} />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-3xl sm:text-5xl font-bold text-center mb-8 text-gray-800">About EventPro</h1>
        
        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-8 hover:bg-white/80 hover:shadow-xl transition-all">
          <h2 className="text-3xl font-bold mb-4 text-sky-600">Our Platform</h2>
          <p className="text-lg text-gray-700 mb-4">
            EventPro is a professional event management platform designed to make booking and organizing events seamless and efficient. 
            Whether you're planning a wedding, birthday party, conference, or corporate event, we provide the tools you need.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:bg-white/80 hover:shadow-xl transition-all">
            <h3 className="text-2xl font-bold mb-3 text-sky-600">For Clients</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Easy online booking system</li>
              <li>✓ Real-time availability checking</li>
              <li>✓ Email invitations for guests</li>
              <li>✓ Booking history tracking</li>
              <li>✓ Multiple event types supported</li>
            </ul>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-6 hover:bg-white/80 hover:shadow-xl transition-all">
            <h3 className="text-2xl font-bold mb-3 text-sky-600">For Organizers</h3>
            <ul className="space-y-2 text-gray-700">
              <li>✓ Centralized booking management</li>
              <li>✓ Accept or decline requests</li>
              <li>✓ View all upcoming events</li>
              <li>✓ Track booking status</li>
              <li>✓ Professional dashboard</li>
            </ul>
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-8 mb-8 hover:bg-white/80 hover:shadow-xl transition-all">
          <h2 className="text-3xl font-bold mb-4 text-sky-600">Venue Information</h2>
          <p className="text-lg text-gray-700 mb-4">
            <strong>Location:</strong> VILLAROJO RESIDENCES CEBU CITY 6000
          </p>
          <p className="text-lg text-gray-700 mb-4">
            <strong>Capacity:</strong> Up to 100 guests per event
          </p>
          <p className="text-lg text-gray-700 mb-4">
            <strong>Available Rooms:</strong> 5 rooms (shared across all event types)
          </p>
          <p className="text-lg text-gray-700">
            All event types share the same venue space, ensuring exclusive use for your special occasion.
          </p>
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-xl shadow-lg p-8 hover:bg-white/80 hover:shadow-xl transition-all">
          <h2 className="text-3xl font-bold mb-4 text-sky-600">How It Works</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="font-bold text-lg">Register or Sign In</h4>
                <p className="text-gray-700">Create your account to start booking events</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="font-bold text-lg">Check Availability</h4>
                <p className="text-gray-700">Select your date and see real-time availability</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="font-bold text-lg">Submit Booking</h4>
                <p className="text-gray-700">Fill in event details and send invitations</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
              <div>
                <h4 className="font-bold text-lg">Wait for Confirmation</h4>
                <p className="text-gray-700">Organizer reviews and confirms your booking</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href={isLoggedIn ? '/client/dashboard' : '/register'} className="px-8 py-4 text-gray-700 rounded-xl text-lg font-semibold hover:bg-sky-500 hover:text-white transition-all shadow-md inline-block">
            Get Started Now
          </Link>
        </div>
      </div>
    </div>
  );
}
