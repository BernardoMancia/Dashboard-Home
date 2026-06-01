let state = {
  connected: false,
  lastUpdate: null,
  system: {
    uptime: 0,
    cpuUsage: 0,
    temperature: 0,
    ram: { total: 0, used: 0, free: 0, percent: 0 },
  },
  pihole: {
    status: "unknown",
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
  },
  ha: {
    states: [],
  },
};

export function getState() {
  return { ...state };
}

export function updateSystem(data) {
  state.system = { ...state.system, ...data };
  state.lastUpdate = Date.now();
  state.connected = true;
}

export function updatePihole(data) {
  state.pihole = { ...state.pihole, ...data };
  state.lastUpdate = Date.now();
}

export function updateHA(data) {
  state.ha = { ...state.ha, ...data };
  state.lastUpdate = Date.now();
}

export function setConnected(val) {
  state.connected = val;
  if (!val) state.lastUpdate = Date.now();
}
