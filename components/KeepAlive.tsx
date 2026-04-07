'use client';
import { useEffect } from 'react';
import { API_BASE } from '@/lib/api';

export default function KeepAlive() {
  useEffect(() => {
    const backend = API_BASE.replace(/\/api\/user$/, '');
    const ping = () => fetch(`${backend}/health/`).catch(() => {});
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}
