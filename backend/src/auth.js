import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SALT_ROUNDS = 12;

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadUsers() {
  ensureDir();
  try {
    return JSON.parse(readFileSync(USERS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveUsers(users) {
  ensureDir();
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
}

export async function initAuth(adminPassword, jwtSecret) {
  if (!adminPassword || !jwtSecret) {
    throw new Error("DASHBOARD_PASSWORD and JWT_SECRET must be set in .env");
  }
  const users = loadUsers();
  if (users.length === 0) {
    const hash = await bcrypt.hash(adminPassword, SALT_ROUNDS);
    saveUsers([{ username: "admin", password: hash, role: "admin", createdAt: Date.now() }]);
    console.log("[Auth] Admin user created from .env");
  }
}

export async function login(username, password, _expectedUser, jwtSecret) {
  const users = loadUsers();
  const user = users.find((u) => u.username === username);
  if (!user) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  const token = jwt.sign({ user: username, role: user.role }, jwtSecret, { expiresIn: "24h" });
  return token;
}

export function verifyToken(token, jwtSecret) {
  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

export function requireAuth(jwtSecret) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token não fornecido" });
    }
    const token = header.split(" ")[1];
    const decoded = verifyToken(token, jwtSecret);
    if (!decoded) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }
    req.user = decoded;
    next();
  };
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores" });
  }
  next();
}

export function getUsers() {
  return loadUsers().map(({ password, ...u }) => u);
}

export async function addUser(username, plainPassword, role = "user") {
  const users = loadUsers();
  if (users.find((u) => u.username === username)) {
    return { error: "Usuário já existe" };
  }
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  users.push({ username, password: hash, role, createdAt: Date.now() });
  saveUsers(users);
  return { ok: true };
}

export async function updateUser(username, updates) {
  const users = loadUsers();
  const idx = users.findIndex((u) => u.username === username);
  if (idx === -1) return { error: "Usuário não encontrado" };
  if (updates.password) {
    users[idx].password = await bcrypt.hash(updates.password, SALT_ROUNDS);
  }
  if (updates.role) {
    users[idx].role = updates.role;
  }
  saveUsers(users);
  return { ok: true };
}

export function deleteUser(username) {
  const users = loadUsers();
  if (users.length <= 1) return { error: "Não é possível remover o último usuário" };
  const target = users.find((u) => u.username === username);
  if (!target) return { error: "Usuário não encontrado" };
  saveUsers(users.filter((u) => u.username !== username));
  return { ok: true };
}
