import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    [key: string]: unknown;
  };
  last_changed: string;
}

export interface HAData {
  connected: boolean;
  states: HAEntity[];
}

const DOMAINS = ['light', 'switch', 'sensor', 'automation', 'climate', 'cover', 'fan', 'media_player'];

export function useHA(token: string | null, interval = 10000) {
  const [data, setData] = useState<HAData>({ connected: false, states: [] });

  useEffect(() => {
    if (!token) return;

    const fetchData = () => {
      fetch(`${API}/api/ha/states`, {
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

  const grouped = DOMAINS.reduce(
    (acc, domain) => {
      acc[domain] = data.states.filter((s) => s.entity_id.startsWith(`${domain}.`));
      return acc;
    },
    {} as Record<string, HAEntity[]>
  );

  const sendCommand = useCallback(
    async (domain: string, service: string, entityId: string) => {
      if (!token) return;
      await fetch(`${API}/api/ha/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, service, entityId }),
      });
    },
    [token]
  );

  return { ...data, grouped, sendCommand };
}
