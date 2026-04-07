'use client';
import { useEffect } from 'react';

const BACKEND = 'https://event-backend-5-v9tx.onrender.com';

export default function KeepAlive() {
  useEffect(() => {
    const ping = () => fetch(`${BACKEND}/health/`).catch(() => {});
    ping();
    const id = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}
