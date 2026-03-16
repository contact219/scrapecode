import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { randomBytes } from "crypto";

const WORKSPACE = process.env.REPL_HOME ?? process.cwd();
const PROFILES_DIR = join(WORKSPACE, "profiles");
const AUTH_FILE = join(PROFILES_DIR, "auth.json");

interface AuthData {
  password_hash: string;
  jwt_secret: string;
}

export function loadAuth(): AuthData {
  if (!existsSync(AUTH_FILE)) {
    if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR, { recursive: true });
    const auth: AuthData = {
      password_hash: bcrypt.hashSync("admin", 10),
      jwt_secret: randomBytes(32).toString("hex"),
    };
    writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
    return auth;
  }
  return JSON.parse(readFileSync(AUTH_FILE, "utf-8")) as AuthData;
}

function saveAuth(auth: AuthData) {
  writeFileSync(AUTH_FILE, JSON.stringify(auth, null, 2));
}

const router = Router();

router.post("/auth/login", (req, res) => {
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

router.post("/auth/change-password", (req, res) => {
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
  auth.password_hash = bcrypt.hashSync(new_password as string, 10);
  saveAuth(auth);
  res.json({ message: "Password changed successfully" });
});

router.post("/auth/reset-password", (_req, res) => {
  const auth = loadAuth();
  auth.password_hash = bcrypt.hashSync("admin", 10);
  saveAuth(auth);
  res.json({ message: "Password reset to 'admin'" });
});

export default router;
