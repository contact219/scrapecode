import { Router } from "express";
import { readFileSync, writeFileSync, existsSync, unlinkSync, readdirSync } from "fs";
import { join } from "path";
import { mkdirSync } from "fs";

const router = Router();

const HOME = process.env.REPL_HOME ?? ".";
const PROFILES_DIR = join(HOME, "profiles");
const CONFIG_FILE = join(PROFILES_DIR, "config.json");

mkdirSync(PROFILES_DIR, { recursive: true });

function safeName(name: string) {
  return name.replace(/[ /]/g, "_");
}

function profilePath(name: string) {
  return join(PROFILES_DIR, `${safeName(name)}.json`);
}

function loadConfig(): Record<string, any> {
  try {
    if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
  } catch {}
  return {};
}

function saveConfig(cfg: Record<string, any>) {
  writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

function listProfiles(): string[] {
  try {
    return readdirSync(PROFILES_DIR)
      .filter((f) => f.endsWith(".json") && f !== "config.json")
      .map((f) => f.slice(0, -5).replace(/_/g, " "));
  } catch {
    return [];
  }
}

function loadProfile(name: string): Record<string, any> | null {
  const p = profilePath(name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function saveProfile(profile: Record<string, any>) {
  writeFileSync(profilePath(profile.name), JSON.stringify(profile, null, 2));
}

const DEFAULT_PROFILE = {
  salary_min: 0,
  work_type: "remote",
  sources: ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"],
  queries: [],
  resume_ref: "",
};

router.get("/profiles", (_req, res) => {
  const cfg = loadConfig();
  res.json({ profiles: listProfiles(), active: cfg.active_profile ?? null });
});

router.post("/profiles", (req, res) => {
  const data = req.body ?? {};
  const name = (data.name ?? "").trim();
  if (!name) return res.status(400).json({ error: "Name required" });
  if (existsSync(profilePath(name))) return res.status(409).json({ error: `Profile '${name}' already exists` });

  const profile = { ...DEFAULT_PROFILE, ...data, name };
  saveProfile(profile);

  const cfg = loadConfig();
  cfg.active_profile = name;
  saveConfig(cfg);

  res.status(201).json(profile);
});

router.get("/profiles/active", (_req, res) => {
  const cfg = loadConfig();
  res.json({ active: cfg.active_profile ?? null });
});

router.post("/profiles/active", (req, res) => {
  const { name } = req.body ?? {};
  const cfg = loadConfig();
  cfg.active_profile = name ?? null;
  saveConfig(cfg);
  res.json({ message: `Active profile set to '${name}'`, success: true });
});

router.get("/profiles/:name", (req, res) => {
  const profile = loadProfile(req.params.name);
  if (!profile) return res.status(404).json({ error: "Not found" });
  res.json(profile);
});

router.put("/profiles/:name", (req, res) => {
  const existing = loadProfile(req.params.name);
  if (!existing) return res.status(404).json({ error: "Not found" });
  const updated = { ...existing, ...req.body, name: existing.name };
  saveProfile(updated);
  res.json(updated);
});

router.delete("/profiles/:name", (req, res) => {
  const p = profilePath(req.params.name);
  if (existsSync(p)) unlinkSync(p);
  const cfg = loadConfig();
  if (cfg.active_profile === req.params.name) {
    cfg.active_profile = null;
    saveConfig(cfg);
  }
  res.json({ message: `Deleted '${req.params.name}'`, success: true });
});

export { loadConfig, saveConfig, profilePath, listProfiles, loadProfile };
export default router;
