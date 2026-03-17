import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import pool from "../lib/db";

interface AuthData {
  password_hash: string;
  jwt_secret: string;
}

let _authCache: AuthData | null = null;

export async function initAuth(): Promise<void> {
  const res = await pool.query(
    "SELECT password_hash, jwt_secret FROM sc_auth WHERE id = 1"
  );
  if (res.rowCount === 0) {
    const auth: AuthData = {
      password_hash: bcrypt.hashSync("admin", 10),
      jwt_secret: randomBytes(32).toString("hex"),
    };
    await pool.query(
      "INSERT INTO sc_auth (id, password_hash, jwt_secret) VALUES (1, $1, $2)",
      [auth.password_hash, auth.jwt_secret]
    );
    _authCache = auth;
  } else {
    _authCache = {
      password_hash: res.rows[0].password_hash,
      jwt_secret: res.rows[0].jwt_secret,
    };
  }
}

export function loadAuth(): AuthData {
  if (!_authCache) {
    return {
      password_hash: bcrypt.hashSync("admin", 10),
      jwt_secret: "bootstrap_secret",
    };
  }
  return _authCache;
}

async function saveAuth(auth: AuthData) {
  await pool.query(
    `INSERT INTO sc_auth (id, password_hash, jwt_secret) VALUES (1, $1, $2)
     ON CONFLICT (id) DO UPDATE SET password_hash = $1, jwt_secret = $2`,
    [auth.password_hash, auth.jwt_secret]
  );
  _authCache = auth;
}

const router = Router();

router.post("/auth/login", async (req, res) => {
  const { password } = req.body ?? {};
  if (!password) {
    res.status(400).json({ error: "Password required" });
    return;
  }
  const auth = loadAuth();
  if (!bcrypt.compareSync(password as string, auth.password_hash)) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  const token = jwt.sign({ authenticated: true }, auth.jwt_secret, { expiresIn: "7d" });
  res.json({ token });
});

router.post("/auth/change-password", async (req, res) => {
  const { current_password, new_password } = req.body ?? {};
  if (!current_password || !new_password) {
    res.status(400).json({ error: "Both current and new password are required" });
    return;
  }
  const auth = loadAuth();
  if (!bcrypt.compareSync(current_password as string, auth.password_hash)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  if ((new_password as string).length < 4) {
    res.status(400).json({ error: "New password must be at least 4 characters" });
    return;
  }
  const updated: AuthData = { ...auth, password_hash: bcrypt.hashSync(new_password as string, 10) };
  await saveAuth(updated);
  res.json({ message: "Password changed successfully" });
});

router.post("/auth/reset-password", async (_req, res) => {
  const auth = loadAuth();
  const updated: AuthData = { ...auth, password_hash: bcrypt.hashSync("admin", 10) };
  await saveAuth(updated);
  res.json({ message: "Password reset to 'admin'" });
});

export default router;
