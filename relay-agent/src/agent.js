import WebSocket from "ws";
import axios from "axios";
import { readFileSync } from "fs";

const VPS_URL = process.env.VPS_URL || "ws://82.112.245.99:3001/ws/agent";
const WS_SECRET_KEY = process.env.WS_SECRET_KEY || "";
const HA_URL = process.env.HA_URL || "http://localhost:8123";
const HA_TOKEN = process.env.HA_TOKEN || "";
const PIHOLE_URL = process.env.PIHOLE_URL || "http://localhost/admin/api.php";
const PIHOLE_TOKEN = process.env.PIHOLE_TOKEN || "";

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

async function collectPihole() {
  try {
    const [summary, overTime, topItems] = await Promise.all([
      axios.get(`${PIHOLE_URL}?summary`),
      axios.get(`${PIHOLE_URL}?overTimeData10mins`),
      axios.get(
        `${PIHOLE_URL}?topItems=10${PIHOLE_TOKEN ? `&auth=${PIHOLE_TOKEN}` : ""}`
      ),
    ]);
    return {
      ...summary.data,
      status: summary.data.status || "unknown",
      overTime: overTime.data || {},
      topQueries: topItems.data?.top_queries || {},
      topAds: topItems.data?.top_ads || {},
    };
  } catch (err) {
    console.error("[Agent] Pi-hole error:", err.message);
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
    const { domain, service, entity_id } = msg.data;
    try {
      await axios.post(
        `${HA_URL}/api/services/${domain}/${service}`,
        { entity_id },
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
    const { action, seconds } = msg.data;
    try {
      let url = `${PIHOLE_URL}?${action}`;
      if (action === "disable" && seconds) url += `=${seconds}`;
      if (PIHOLE_TOKEN) url += `&auth=${PIHOLE_TOKEN}`;
      await axios.get(url);
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
