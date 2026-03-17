import { Router } from "express";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { randomBytes } from "crypto";

const router = Router();
const WORKSPACE = process.env.REPL_HOME ?? process.cwd();
const TRACKER_FILE = join(WORKSPACE, "profiles", "job_tracker.json");

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

function loadTracker(): TrackedJob[] {
  if (!existsSync(TRACKER_FILE)) return [];
  try { return JSON.parse(readFileSync(TRACKER_FILE, "utf-8")); } catch { return []; }
}

function saveTracker(jobs: TrackedJob[]) {
  writeFileSync(TRACKER_FILE, JSON.stringify(jobs, null, 2));
}

router.get("/tracker", (_req, res) => {
  res.json({ jobs: loadTracker() });
});

router.post("/tracker", (req, res) => {
  const body = req.body ?? {};
  if (!body.title || !body.company) {
    res.status(400).json({ error: "title and company are required" });
    return;
  }
  const jobs = loadTracker();
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
  jobs.push(job);
  saveTracker(jobs);
  res.status(201).json(job);
});

router.put("/tracker/:id", (req, res) => {
  const jobs = loadTracker();
  const idx = jobs.findIndex(j => j.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Job not found" }); return; }
  jobs[idx] = { ...jobs[idx], ...req.body, id: jobs[idx].id, added_at: jobs[idx].added_at };
  saveTracker(jobs);
  res.json(jobs[idx]);
});

router.delete("/tracker/:id", (req, res) => {
  const jobs = loadTracker();
  const filtered = jobs.filter(j => j.id !== req.params.id);
  saveTracker(filtered);
  res.json({ message: "Removed", success: true });
});

export default router;
