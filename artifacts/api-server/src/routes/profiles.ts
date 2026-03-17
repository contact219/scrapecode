import { Router } from "express";
import pool from "../lib/db";

const router = Router();

const DEFAULT_PROFILE = {
  salary_min: 0,
  work_type: "remote",
  sources: ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"],
  queries: [],
  resume_ref: "",
};

export async function listProfiles(): Promise<string[]> {
  const res = await pool.query("SELECT name FROM sc_profiles ORDER BY name");
  return res.rows.map((r) => r.name);
}

export async function loadProfile(name: string): Promise<Record<string, any> | null> {
  const res = await pool.query("SELECT data FROM sc_profiles WHERE name = $1", [name]);
  if (res.rowCount === 0) return null;
  return res.rows[0].data;
}

export async function saveProfile(profile: Record<string, any>) {
  const name = profile.name;
  await pool.query(
    `INSERT INTO sc_profiles (name, data, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (name) DO UPDATE SET data = $2, updated_at = now()`,
    [name, JSON.stringify(profile)]
  );
}

export async function loadConfig(): Promise<Record<string, any>> {
  const res = await pool.query("SELECT key, value FROM sc_config");
  const cfg: Record<string, any> = {};
  for (const row of res.rows) {
    try { cfg[row.key] = JSON.parse(row.value); } catch { cfg[row.key] = row.value; }
  }
  return cfg;
}

export async function saveConfigKey(key: string, value: any) {
  const v = typeof value === "string" ? value : JSON.stringify(value);
  await pool.query(
    `INSERT INTO sc_config (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = $2`,
    [key, v]
  );
}

router.get("/profiles", async (_req, res) => {
  try {
    const [profiles, cfg] = await Promise.all([listProfiles(), loadConfig()]);
    res.json({ profiles, active: cfg.active_profile ?? null });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.post("/profiles", async (req, res) => {
  try {
    const data = req.body ?? {};
    const name = (data.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "Name required" });

    const existing = await loadProfile(name);
    if (existing) return res.status(409).json({ error: `Profile '${name}' already exists` });

    const profile = { ...DEFAULT_PROFILE, ...data, name };
    await saveProfile(profile);
    await saveConfigKey("active_profile", name);

    res.status(201).json(profile);
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.get("/profiles/active", async (_req, res) => {
  try {
    const cfg = await loadConfig();
    res.json({ active: cfg.active_profile ?? null });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.post("/profiles/active", async (req, res) => {
  try {
    const { name } = req.body ?? {};
    if (name) {
      const profiles = await listProfiles();
      if (!profiles.includes(name)) {
        return res.status(400).json({ error: `'${name}' is not a valid profile` });
      }
    }
    await saveConfigKey("active_profile", name ?? null);
    res.json({ message: `Active profile set to '${name}'`, success: true });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.get("/profiles/:name", async (req, res) => {
  try {
    const profile = await loadProfile(req.params.name);
    if (!profile) return res.status(404).json({ error: "Not found" });
    res.json(profile);
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.put("/profiles/:name", async (req, res) => {
  try {
    const existing = await loadProfile(req.params.name);
    if (!existing) return res.status(404).json({ error: "Not found" });
    const resolvedName = existing.name ?? req.params.name;
    const updated = { ...existing, ...req.body, name: resolvedName };
    await saveProfile(updated);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.delete("/profiles/:name", async (req, res) => {
  try {
    await pool.query("DELETE FROM sc_profiles WHERE name = $1", [req.params.name]);
    const cfg = await loadConfig();
    if (cfg.active_profile === req.params.name) {
      await saveConfigKey("active_profile", null);
    }
    res.json({ message: `Deleted '${req.params.name}'`, success: true });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

export default router;

export async function saveConfig(cfg: Record<string, any>) {
  for (const [key, value] of Object.entries(cfg)) {
    await saveConfigKey(key, value);
  }
}
