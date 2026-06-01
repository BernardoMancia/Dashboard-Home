import WebSocket from "ws";
import axios from "axios";
import { readFileSync } from "fs";

const VPS_URL = process.env.VPS_URL || "ws://82.112.245.99:3001/ws/agent";
const WS_SECRET_KEY = process.env.WS_SECRET_KEY || "";
const HA_URL = process.env.HA_URL || "http://localhost:8123";
const HA_TOKEN = process.env.HA_TOKEN || "";
const PIHOLE_URL = process.env.PIHOLE_URL || "http://localhost:8080";
const PIHOLE_PASSWORD = process.env.PIHOLE_PASSWORD || "";

let piholeSID = null;

const SYSTEM_INTERVAL = 5000;
const SERVICE_INTERVAL = 10000;
const RECONNECT_DELAY = 5000;

let ws = null;

function readProc(filePath) {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function getUptime() {
  const raw = readProc("/host/proc/uptime") || readProc("/proc/uptime");
  if (!raw) return 0;
  return parseFloat(raw.split(" ")[0]);
}

function getTemperature() {
  const raw =
    readProc("/host/sys/class/thermal/thermal_zone0/temp") ||
    readProc("/sys/class/thermal/thermal_zone0/temp");
  if (!raw) return 0;
  return parseFloat(raw.trim()) / 1000;
}

function getRam() {
  const raw = readProc("/host/proc/meminfo") || readProc("/proc/meminfo");
  if (!raw) return { total: 0, used: 0, free: 0, percent: 0 };
  const lines = raw.split("\n");
  const get = (key) => {
    const line = lines.find((l) => l.startsWith(key));
    if (!line) return 0;
    return parseInt(line.split(/\s+/)[1], 10) * 1024;
  };
  const total = get("MemTotal:");
  const free = get("MemFree:");
  const buffers = get("Buffers:");
  const cached = get("Cached:");
  const available = free + buffers + cached;
  const used = total - available;
  return {
    total,
    used,
    free: available,
    percent: total > 0 ? Math.round((used / total) * 100) : 0,
  };
}

function getCpuUsage() {
  const raw = readProc("/host/proc/stat") || readProc("/proc/stat");
  if (!raw) return 0;
  const line = raw.split("\n").find((l) => l.startsWith("cpu "));
  if (!line) return 0;
  const parts = line.split(/\s+/).slice(1).map(Number);
  const idle = parts[3] + (parts[4] || 0);
  const total = parts.reduce((a, b) => a + b, 0);
  return { idle, total };
}

let prevCpu = null;
function calcCpuPercent() {
  const curr = getCpuUsage();
  if (!curr || !prevCpu) {
    prevCpu = curr;
    return 0;
  }
  const dTotal = curr.total - prevCpu.total;
  const dIdle = curr.idle - prevCpu.idle;
  prevCpu = curr;
  if (dTotal === 0) return 0;
  return Math.round(((dTotal - dIdle) / dTotal) * 100);
}

function collectSystem() {
  return {
    uptime: getUptime(),
    temperature: getTemperature(),
    ram: getRam(),
    cpuUsage: calcCpuPercent(),
  };
}

async function piholeAuth() {
  if (!PIHOLE_PASSWORD) return null;
  try {
    const res = await axios.post(`${PIHOLE_URL}/api/auth`, {
      password: PIHOLE_PASSWORD,
    });
    if (res.data?.session?.sid) {
      piholeSID = res.data.session.sid;
      return piholeSID;
    }
  } catch (err) {
    console.error("[Agent] Pi-hole auth error:", err.message);
  }
  return null;
}

function piholeHeaders() {
  return piholeSID ? { sid: piholeSID } : {};
}

async function collectPihole() {
  try {
    if (!piholeSID) await piholeAuth();
    const headers = piholeHeaders();

    const [summary, overTime] = await Promise.all([
      axios.get(`${PIHOLE_URL}/api/stats/summary`, { headers }),
      axios.get(`${PIHOLE_URL}/api/stats/overTime/history`, { headers }),
    ]);

    let topQueries = {};
    let topAds = {};
    try {
      const top = await axios.get(`${PIHOLE_URL}/api/stats/top_domains?count=10`, { headers });
      topQueries = top.data?.top_domains || {};
      const topBlocked = await axios.get(`${PIHOLE_URL}/api/stats/top_domains?blocked=true&count=10`, { headers });
      topAds = topBlocked.data?.top_domains || {};
    } catch {}

    const s = summary.data;
    return {
      status: s?.blocking === "enabled" ? "enabled" : "disabled",
      domains_being_blocked: s?.gravity?.domains_being_blocked || 0,
      dns_queries_today: s?.queries?.total || 0,
      ads_blocked_today: s?.queries?.blocked || 0,
      ads_percentage_today: s?.queries?.percent_blocked || 0,
      unique_clients: s?.clients?.total || 0,
      queries_forwarded: s?.queries?.forwarded || 0,
      queries_cached: s?.queries?.cached || 0,
      overTime: overTime.data || {},
      topQueries,
      topAds,
    };
  } catch (err) {
    if (err.response?.status === 401) {
      piholeSID = null;
      console.error("[Agent] Pi-hole session expired, will re-auth next cycle");
    } else {
      console.error("[Agent] Pi-hole error:", err.message);
    }
    return null;
  }
}

async function collectHA() {
  if (!HA_TOKEN) return null;
  try {
    const res = await axios.get(`${HA_URL}/api/states`, {
      headers: { Authorization: `Bearer ${HA_TOKEN}` },
    });
    return { states: res.data };
  } catch (err) {
    console.error("[Agent] HA error:", err.message);
    return null;
  }
}

async function handleCommand(msg) {
  if (msg.type === "ha_command") {
    const { domain, service, entity_id, service_data } = msg.data;
    try {
      const payload = { entity_id, ...service_data };
      await axios.post(
        `${HA_URL}/api/services/${domain}/${service}`,
        payload,
        { headers: { Authorization: `Bearer ${HA_TOKEN}` } }
      );
      send({ type: "command_result", data: { ok: true, domain, service } });
    } catch (err) {
      send({
        type: "command_result",
        data: { ok: false, error: err.message },
      });
    }
  }

  if (msg.type === "pihole_command") {
    const { action } = msg.data;
    try {
      if (!piholeSID) await piholeAuth();
      const blocking = action === "enable" ? true : false;
      await axios.post(
        `${PIHOLE_URL}/api/dns/blocking`,
        { blocking, timer: msg.data.seconds || null },
        { headers: piholeHeaders() }
      );
      send({ type: "command_result", data: { ok: true, action } });
    } catch (err) {
      send({
        type: "command_result",
        data: { ok: false, error: err.message },
      });
    }
  }
}

function send(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function connect() {
  const url = `${VPS_URL}?key=${encodeURIComponent(WS_SECRET_KEY)}`;
  console.log("[Agent] Connecting to VPS...");
  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log("[Agent] Connected to VPS");
    startCollecting();
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleCommand(msg);
    } catch (err) {
      console.error("[Agent] Message parse error:", err.message);
    }
  });

  ws.on("close", () => {
    console.log("[Agent] Disconnected. Reconnecting in 5s...");
    stopCollecting();
    setTimeout(connect, RECONNECT_DELAY);
  });

  ws.on("error", (err) => {
    console.error("[Agent] WS error:", err.message);
  });
}

let sysInterval = null;
let svcInterval = null;

function startCollecting() {
  sysInterval = setInterval(() => {
    send({ type: "system", data: collectSystem() });
  }, SYSTEM_INTERVAL);

  const collectServices = async () => {
    const pihole = await collectPihole();
    if (pihole) send({ type: "pihole", data: pihole });
    const ha = await collectHA();
    if (ha) send({ type: "ha", data: ha });
  };

  collectServices();
  svcInterval = setInterval(collectServices, SERVICE_INTERVAL);

  send({ type: "system", data: collectSystem() });
}

function stopCollecting() {
  if (sysInterval) clearInterval(sysInterval);
  if (svcInterval) clearInterval(svcInterval);
  sysInterval = null;
  svcInterval = null;
}

connect();
