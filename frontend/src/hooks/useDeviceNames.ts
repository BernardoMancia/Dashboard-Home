import { useState, useEffect, useCallback } from 'react';
import type { HAEntity } from './useHA';

const API = import.meta.env.VITE_API_URL || '';

export function useDeviceNames(token: string | null) {
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/config/names`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (data && typeof data === 'object') setNames(data); })
      .catch(() => {});
  }, [token]);

  const setCustomName = useCallback(
    async (entityId: string, name: string) => {
      const updated = { ...names, [entityId]: name };
      if (!name.trim()) delete updated[entityId];
      setNames(updated);
      if (!token) return;
      await fetch(`${API}/api/config/names`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      });
    },
    [names, token]
  );

  const getDisplayName = useCallback(
    (entity: HAEntity) => {
      if (names[entity.entity_id]) return names[entity.entity_id];
      return entity.attributes.friendly_name || entity.entity_id;
    },
    [names]
  );

  return { names, setCustomName, getDisplayName };
}
