import { Router } from "express";
import { randomBytes } from "crypto";
import pool from "../lib/db";

const router = Router();

export interface TrackedJob {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  salary: string;
  profile: string;
  status: "saved" | "applied" | "interview" | "offer" | "rejected";
  notes: string;
  added_at: string;
}

router.get("/tracker", async (_req, res) => {
  try {
    const result = await pool.query("SELECT data FROM sc_tracker ORDER BY added_at DESC");
    const jobs = result.rows.map((r) => r.data);
    res.json({ jobs });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.post("/tracker", async (req, res) => {
  const body = req.body ?? {};
  if (!body.title || !body.company) {
    res.status(400).json({ error: "title and company are required" });
    return;
  }
  const job: TrackedJob = {
    id: randomBytes(6).toString("hex"),
    title: body.title,
    company: body.company,
    location: body.location || "",
    url: body.url || "",
    source: body.source || "",
    salary: body.salary || "",
    profile: body.profile || "",
    status: "saved",
    notes: "",
    added_at: new Date().toISOString(),
  };
  try {
    await pool.query(
      "INSERT INTO sc_tracker (id, data, added_at) VALUES ($1, $2, now())",
      [job.id, JSON.stringify(job)]
    );
    res.status(201).json(job);
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.put("/tracker/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM sc_tracker WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) { res.status(404).json({ error: "Job not found" }); return; }
    const existing = result.rows[0].data;
    const updated = { ...existing, ...req.body, id: existing.id, added_at: existing.added_at };
    await pool.query("UPDATE sc_tracker SET data = $1 WHERE id = $2", [JSON.stringify(updated), req.params.id]);
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

router.delete("/tracker/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM sc_tracker WHERE id = $1", [req.params.id]);
    res.json({ message: "Removed", success: true });
  } catch (e) {
    res.status(500).json({ error: "DB error", detail: String(e) });
  }
});

export default router;
