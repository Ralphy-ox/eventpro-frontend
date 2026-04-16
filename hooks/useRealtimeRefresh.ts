'use client';

import { useEffect, useRef } from 'react';
import { WS_BASE, WS_ENABLED, getValidAccessToken, refreshAccessToken } from '@/lib/api';

export function useRealtimeRefresh(
  tokenKey: 'clientToken' | 'organizerToken',
  onMessage: (type: string) => void
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    mountedRef.current = true;

    if (!WS_ENABLED) {
      pollRef.current = setInterval(() => {
        if (mountedRef.current && localStorage.getItem(tokenKey)) {
          onMessageRef.current('poll');
        }
      }, 30000);
      return () => {
        mountedRef.current = false;
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }

    async function connect() {
      if (!mountedRef.current) return;
      const token = await getValidAccessToken(tokenKey);
      if (!token) return;

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const ws = new WebSocket(`${WS_BASE}/ws/notifications/?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 25000);
      };

      ws.onmessage = (e) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'connected' || data.type === 'pong') return;
          onMessageRef.current(data.type || 'update');
        } catch {}
      };

      ws.onclose = async (event) => {
        if (!mountedRef.current) return;
        if (pingRef.current) clearInterval(pingRef.current);
        if (event.code === 4001) {
          const refreshedToken = await refreshAccessToken(tokenKey);
          if (!mountedRef.current || !refreshedToken) {
            return;
          }
        }
        reconnectRef.current = setTimeout(() => {
          if (mountedRef.current && localStorage.getItem(tokenKey)) connect();
        }, 4000);
      };

      ws.onerror = () => ws.close();
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (pingRef.current) clearInterval(pingRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [tokenKey]);
}
