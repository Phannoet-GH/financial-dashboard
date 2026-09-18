// src/hooks/useLiveMarketFeed.js
import { useState, useEffect, useRef, useCallback } from 'react';

export function useLiveMarketFeed({ enabled = true, intervalMs = 4000 } = {}) {
  const [livePrices, setLivePrices] = useState({});
  const [streamsStatus, setStreamsStatus] = useState({
    stocks: { status: 'idle', count: 0, lastSync: null },
    crypto: { status: 'idle', count: 0, lastSync: null },
    forex: { status: 'idle', count: 0, lastSync: null },
    commodities: { status: 'idle', count: 0, lastSync: null },
  });
  const [feedState, setFeedState] = useState('connecting'); // 'connecting' | 'connected' | 'error' | 'paused'
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [latencyMs, setLatencyMs] = useState(0);
  const [syncCount, setSyncCount] = useState(0);

  const isFetchingRef = useRef(false);

  const fetchLiveTick = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    const start = performance.now();

    try {
      const res = await fetch('/api/live/all');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      const elapsed = Math.round(performance.now() - start);
      setLatencyMs(elapsed);

      if (json.data && Object.keys(json.data).length > 0) {
        setLivePrices(json.data);
        if (json.streams) setStreamsStatus(json.streams);
        setFeedState('connected');
        setLastSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setSyncCount(c => c + 1);
      }
    } catch (err) {
      console.warn('[LiveMarketFeed] Poll error:', err.message);
      setFeedState(prev => (prev === 'connected' ? 'connected' : 'error'));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Polling loop
  useEffect(() => {
    if (!enabled) {
      setFeedState('paused');
      return;
    }

    fetchLiveTick();
    const interval = setInterval(fetchLiveTick, intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs, fetchLiveTick]);

  return {
    livePrices,
    streamsStatus,
    feedState,
    lastSyncTime,
    latencyMs,
    syncCount,
    syncNow: fetchLiveTick,
  };
}
