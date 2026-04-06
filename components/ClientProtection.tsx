'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientProtection({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const organizerToken = localStorage.getItem('organizerToken');
    
    if (organizerToken) {
      alert('Organizers cannot access client pages!');
      router.push('/organizer-dashboard');
    }
  }, [router]);

  return <>{children}</>;
}
