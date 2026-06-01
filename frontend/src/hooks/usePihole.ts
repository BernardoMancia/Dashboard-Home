import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export interface PiholeData {
  connected: boolean;
  status: string;
  domains_being_blocked: number;
  dns_queries_today: number;
  ads_blocked_today: number;
  ads_percentage_today: number;
  unique_clients: number;
  queries_forwarded: number;
  queries_cached: number;
  overTime: Record<string, number>;
  topQueries: Record<string, number>;
  topAds: Record<string, number>;
}

const DEFAULT: PiholeData = {
  connected: false,
  status: 'unknown',
  domains_being_blocked: 0,
  dns_queries_today: 0,
  ads_blocked_today: 0,
  ads_percentage_today: 0,
  unique_clients: 0,
  queries_forwarded: 0,
  queries_cached: 0,
  overTime: {},
  topQueries: {},
  topAds: {},
};

export function usePihole(token: string | null, interval = 10000) {
  const [data, setData] = useState<PiholeData>(DEFAULT);

  useEffect(() => {
    if (!token) return;

    const fetchData = () => {
      fetch(`${API}/api/pihole`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData((d) => ({ ...d, connected: false })));
    };

    fetchData();
    const id = setInterval(fetchData, interval);
    return () => clearInterval(id);
  }, [token, interval]);

  const toggle = useCallback(
    async (action: 'enable' | 'disable', seconds?: number) => {
      if (!token) return;
      await fetch(`${API}/api/pihole/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, seconds }),
      });
    },
    [token]
  );

  return { ...data, toggle };
}
