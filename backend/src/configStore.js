import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const CONFIG_FILE = path.join(DATA_DIR, "config.json");

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadConfig() {
  ensureDir();
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return { rooms: [], customNames: {} };
  }
}

function saveConfig(data) {
  ensureDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function getRooms() {
  return loadConfig().rooms || [];
}

export function saveRooms(rooms) {
  const cfg = loadConfig();
  cfg.rooms = rooms;
  saveConfig(cfg);
}

export function getCustomNames() {
  return loadConfig().customNames || {};
}

export function saveCustomNames(names) {
  const cfg = loadConfig();
  cfg.customNames = names;
  saveConfig(cfg);
}
