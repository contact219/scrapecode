import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { loadAuth } from "../routes/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (typeof req.query.token === "string" && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: "Unauthorized — no token provided" });
    return;
  }

  try {
    const auth = loadAuth();
    jwt.verify(token, auth.jwt_secret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
