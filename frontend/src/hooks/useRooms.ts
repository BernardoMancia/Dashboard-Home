import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export interface Room {
  id: string;
  name: string;
  icon: string;
  devices: string[];
}

export function useRooms(token: string | null) {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/config/rooms`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setRooms(data); })
      .catch(() => {});
  }, [token]);

  const persist = useCallback(
    async (updated: Room[]) => {
      setRooms(updated);
      if (!token) return;
      await fetch(`${API}/api/config/rooms`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updated),
      });
    },
    [token]
  );

  const addRoom = useCallback(
    (name: string, icon: string) => {
      const id = `room_${Date.now()}`;
      const updated = [...rooms, { id, name, icon, devices: [] }];
      persist(updated);
    },
    [rooms, persist]
  );

  const updateRoom = useCallback(
    (id: string, name: string, icon: string) => {
      const updated = rooms.map((r) => (r.id === id ? { ...r, name, icon } : r));
      persist(updated);
    },
    [rooms, persist]
  );

  const deleteRoom = useCallback(
    (id: string) => {
      const updated = rooms.filter((r) => r.id !== id);
      persist(updated);
    },
    [rooms, persist]
  );

  const assignDevice = useCallback(
    (roomId: string, entityId: string) => {
      const updated = rooms.map((r) => {
        if (r.id === roomId) {
          return { ...r, devices: [...new Set([...r.devices, entityId])] };
        }
        return { ...r, devices: r.devices.filter((d) => d !== entityId) };
      });
      persist(updated);
    },
    [rooms, persist]
  );

  const unassignDevice = useCallback(
    (entityId: string) => {
      const updated = rooms.map((r) => ({
        ...r,
        devices: r.devices.filter((d) => d !== entityId),
      }));
      persist(updated);
    },
    [rooms, persist]
  );

  return { rooms, addRoom, updateRoom, deleteRoom, assignDevice, unassignDevice };
}
