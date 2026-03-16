import { Router } from "express";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const router = Router();
const HOME = process.env.REPL_HOME ?? ".";
const HISTORY_FILE = join(HOME, "output", "run_history.json");

router.get("/history", (_req, res) => {
  try {
    if (!existsSync(HISTORY_FILE)) return res.json({ history: [] });
    const history = JSON.parse(readFileSync(HISTORY_FILE, "utf8"));
    res.json({ history });
  } catch {
    res.json({ history: [] });
  }
});

export default router;
