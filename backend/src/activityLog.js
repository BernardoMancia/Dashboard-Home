import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const LOG_FILE = path.join(DATA_DIR, "activity.json");
const MAX_LOGS = 2000;

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadLogs() {
  ensureDir();
  try {
    return JSON.parse(readFileSync(LOG_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveLogs(logs) {
  ensureDir();
  writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), "utf8");
}

export function addLog(entry) {
  const logs = loadLogs();
  logs.unshift({
    id: Date.now(),
    timestamp: new Date().toISOString(),
    ...entry,
  });
  if (logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  saveLogs(logs);
}

export function getLogs(limit = 200, offset = 0) {
  const logs = loadLogs();
  return {
    total: logs.length,
    logs: logs.slice(offset, offset + limit),
  };
}
