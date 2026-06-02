import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || '';

export interface HAEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    icon?: string;
    brightness?: number;
    rgb_color?: [number, number, number];
    supported_color_modes?: string[];
    unit_of_measurement?: string;
    device_class?: string;
    [key: string]: unknown;
  };
  last_changed: string;
}

export interface HAData {
  connected: boolean;
  states: HAEntity[];
}

const CONTROLLABLE = ['light', 'switch', 'automation', 'fan', 'cover', 'media_player', 'input_boolean', 'climate'];
const SENSOR_DOMAINS = ['sensor', 'binary_sensor'];

export function useHA(token: string | null, interval = 5000) {
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

  const controllable = data.states.filter((s) =>
    CONTROLLABLE.some((d) => s.entity_id.startsWith(`${d}.`))
  );

  const sensors = data.states.filter((s) =>
    SENSOR_DOMAINS.some((d) => s.entity_id.startsWith(`${d}.`))
  );

  const optimisticToggle = useCallback(
    (entityId: string, currentState: string) => {
      const newState = currentState === 'on' ? 'off' : 'on';
      setData((prev) => ({
        ...prev,
        states: prev.states.map((s) =>
          s.entity_id === entityId ? { ...s, state: newState } : s
        ),
      }));
    },
    []
  );

  const optimisticBrightness = useCallback(
    (entityId: string, brightness: number) => {
      setData((prev) => ({
        ...prev,
        states: prev.states.map((s) =>
          s.entity_id === entityId
            ? { ...s, state: 'on', attributes: { ...s.attributes, brightness } }
            : s
        ),
      }));
    },
    []
  );

  const optimisticColor = useCallback(
    (entityId: string, rgb: [number, number, number]) => {
      setData((prev) => ({
        ...prev,
        states: prev.states.map((s) =>
          s.entity_id === entityId
            ? { ...s, state: 'on', attributes: { ...s.attributes, rgb_color: rgb } }
            : s
        ),
      }));
    },
    []
  );

  const sendCommand = useCallback(
    async (domain: string, service: string, entityId: string, serviceData?: Record<string, unknown>) => {
      if (!token) return;
      fetch(`${API}/api/ha/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain, service, entityId, serviceData }),
      }).catch(() => {});
    },
    [token]
  );

  return { ...data, controllable, sensors, sendCommand, optimisticToggle, optimisticBrightness, optimisticColor };
}
