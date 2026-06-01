import { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export interface SystemData {
  connected: boolean;
  lastUpdate: number | null;
  uptime: number;
  cpuUsage: number;
  temperature: number;
  ram: {
    total: number;
    used: number;
    free: number;
    percent: number;
  };
}

const DEFAULT: SystemData = {
  connected: false,
  lastUpdate: null,
  uptime: 0,
  cpuUsage: 0,
  temperature: 0,
  ram: { total: 0, used: 0, free: 0, percent: 0 },
};

export function useSystem(token: string | null, interval = 5000) {
  const [data, setData] = useState<SystemData>(DEFAULT);

  useEffect(() => {
    if (!token) return;

    const fetchData = () => {
      fetch(`${API}/api/system`, {
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

  return data;
}
