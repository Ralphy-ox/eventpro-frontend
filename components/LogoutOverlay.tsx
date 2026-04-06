'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function LogoutOverlay({ visible }: { visible: boolean }) {
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (visible) {
      // Trigger fade-in on next frame
      const t = requestAnimationFrame(() => setOpacity(1));
      return () => cancelAnimationFrame(t);
    } else {
      setOpacity(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        backgroundColor: 'rgba(3, 7, 18, 0.92)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        opacity,
        transition: 'opacity 0.35s ease',
      }}
    >
      {/* Spinner */}
      <div style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        border: '3px solid rgba(255,255,255,0.15)',
        borderTopColor: '#38bdf8',
        animation: 'logout-spin 0.75s linear infinite',
      }} />
      <p style={{
        color: '#e5e7eb',
        fontSize: 15,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}>
        Signing out...
      </p>
      <style>{`
        @keyframes logout-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export function useLogout() {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const logout = (tokenKey: 'clientToken' | 'organizerToken' = 'clientToken', redirectTo = '/') => {
    localStorage.removeItem(tokenKey);
    setLoggingOut(true);
    window.location.href = redirectTo;
  };

  return { loggingOut, logout };
}
