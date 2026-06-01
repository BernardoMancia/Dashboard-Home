import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import {
  initAuth,
  login,
  requireAuth,
  requireAdmin,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
} from "./auth.js";
import { setupWebSocket, sendToAgent } from "./wsHandler.js";
import { getState } from "./store.js";
import {
  getRooms,
  saveRooms,
  getCustomNames,
  saveCustomNames,
} from "./configStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const {
  PORT = 3001,
  DASHBOARD_USER = "admin",
  DASHBOARD_PASSWORD,
  JWT_SECRET,
  WS_SECRET_KEY,
  NODE_ENV = "development",
} = process.env;

const app = express();
app.use(cors());
app.use(express.json());

const frontendPath = path.resolve(__dirname, "../../frontend/dist");
if (NODE_ENV === "production") {
  app.use(express.static(frontendPath));
}

const auth = requireAuth(JWT_SECRET);

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Credenciais obrigatórias" });
  }
  const token = await login(username, password, DASHBOARD_USER, JWT_SECRET);
  if (!token) {
    return res.status(401).json({ error: "Credenciais inválidas" });
  }
  res.json({ token, user: username });
});

app.get("/api/auth/verify", auth, (req, res) => {
  res.json({ valid: true, user: req.user.user, role: req.user.role });
});

app.get("/api/system", auth, (req, res) => {
  const state = getState();
  res.json({
    connected: state.connected,
    lastUpdate: state.lastUpdate,
    ...state.system,
  });
});

app.get("/api/pihole", auth, (req, res) => {
  const state = getState();
  res.json({ connected: state.connected, ...state.pihole });
});

app.get("/api/ha/states", auth, (req, res) => {
  const state = getState();
  res.json({ connected: state.connected, ...state.ha });
});

app.post("/api/ha/command", auth, (req, res) => {
  const { domain, service, entityId, serviceData } = req.body;
  if (!domain || !service) {
    return res.status(400).json({ error: "domain e service obrigatórios" });
  }
  const sent = sendToAgent({
    type: "ha_command",
    data: { domain, service, entity_id: entityId, service_data: serviceData },
  });
  if (!sent) {
    return res.status(503).json({ error: "Agent desconectado" });
  }
  res.json({ ok: true });
});

app.post("/api/pihole/toggle", auth, (req, res) => {
  const { action, seconds } = req.body;
  const sent = sendToAgent({
    type: "pihole_command",
    data: { action, seconds },
  });
  if (!sent) {
    return res.status(503).json({ error: "Agent desconectado" });
  }
  res.json({ ok: true });
});

app.get("/api/config/rooms", auth, (req, res) => {
  res.json(getRooms());
});

app.put("/api/config/rooms", auth, (req, res) => {
  const rooms = req.body;
  if (!Array.isArray(rooms)) {
    return res.status(400).json({ error: "Body deve ser um array de rooms" });
  }
  saveRooms(rooms);
  res.json({ ok: true });
});

app.get("/api/config/names", auth, (req, res) => {
  res.json(getCustomNames());
});

app.put("/api/config/names", auth, (req, res) => {
  const names = req.body;
  if (typeof names !== "object" || Array.isArray(names)) {
    return res.status(400).json({ error: "Body deve ser um objeto" });
  }
  saveCustomNames(names);
  res.json({ ok: true });
});

app.get("/api/users", auth, requireAdmin, (req, res) => {
  res.json(getUsers());
});

app.post("/api/users", auth, requireAdmin, async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "username e password obrigatórios" });
  }
  const result = await addUser(username, password, role || "user");
  if (result.error) return res.status(409).json(result);
  res.json(result);
});

app.put("/api/users/:username", auth, requireAdmin, async (req, res) => {
  const { password, role } = req.body;
  const result = await updateUser(req.params.username, { password, role });
  if (result.error) return res.status(404).json(result);
  res.json(result);
});

app.delete("/api/users/:username", auth, requireAdmin, (req, res) => {
  if (req.params.username === req.user.user) {
    return res.status(400).json({ error: "Não é possível excluir a si mesmo" });
  }
  const result = deleteUser(req.params.username);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

if (NODE_ENV === "production") {
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

async function start() {
  await initAuth(DASHBOARD_PASSWORD, JWT_SECRET);
  const server = createServer(app);
  setupWebSocket(server, WS_SECRET_KEY);
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] API running on port ${PORT}`);
    console.log(`[Server] WebSocket ready on /ws/agent`);
  });
}

start().catch((err) => {
  console.error("[Server] Failed to start:", err.message);
  process.exit(1);
});
