import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12;
let hashedPassword = null;

export async function initAuth(plainPassword, jwtSecret) {
  if (!plainPassword || !jwtSecret) {
    throw new Error("DASHBOARD_PASSWORD and JWT_SECRET must be set in .env");
  }
  hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return true;
}

export async function login(username, password, expectedUser, jwtSecret) {
  if (username !== expectedUser) return null;
  const valid = await bcrypt.compare(password, hashedPassword);
  if (!valid) return null;
  const token = jwt.sign({ user: username }, jwtSecret, { expiresIn: "24h" });
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
