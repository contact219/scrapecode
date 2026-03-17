import { Router } from "express";
import { spawn } from "child_process";
import { join } from "path";
import { randomBytes } from "crypto";
import { mkdirSync, writeFileSync } from "fs";
import pool from "../lib/db";
import { loadProfile } from "./profiles";

const router = Router();

const WORKSPACE = process.env.REPL_HOME ?? process.cwd();
const WORKER = join(WORKSPACE, "search_worker.py");
const TEMP_HOME = "/tmp/scrapedata";

mkdirSync(join(TEMP_HOME, "profiles"), { recursive: true });
mkdirSync(join(TEMP_HOME, "output"), { recursive: true });
mkdirSync(join(TEMP_HOME, "logs"), { recursive: true });

interface Job {
  status: "running" | "completed" | "error";
  jobs: any[];
  total: number;
  filepath: string;
  error: string;
  profile_name: string;
  new_count: number;
}

const _jobs = new Map<string, Job>();
const _jobStreams = new Map<string, string[]>();

function jobHash(job: any): string {
  return `${(job.title || "").toLowerCase().trim()}|${(job.company || "").toLowerCase().trim()}`;
}

async function loadSeen(profileName: string): Promise<Set<string>> {
  const res = await pool.query(
    "SELECT hash FROM sc_seen_jobs WHERE profile_name = $1",
    [profileName]
  );
  return new Set(res.rows.map((r) => r.hash));
}

async function saveSeen(profileName: string, seen: Set<string>) {
  if (seen.size === 0) return;
  const values = [...seen]
    .map((_, i) => `($1, $${i + 2})`)
    .join(", ");
  const params: any[] = [profileName, ...[...seen]];
  await pool.query(
    `INSERT INTO sc_seen_jobs (profile_name, hash)
     SELECT $1, unnest($2::text[])
     ON CONFLICT DO NOTHING`,
    [profileName, [...seen]]
  );
}

async function markDuplicates(jobs: any[], profileName: string): Promise<{ jobs: any[], newCount: number }> {
  const seen = await loadSeen(profileName);
  let newCount = 0;
  const marked = jobs.map(job => {
    const hash = jobHash(job);
    const isNew = !seen.has(hash);
    if (isNew) newCount++;
    return { ...job, is_new: isNew };
  });
  const newHashes = new Set(marked.map(j => jobHash(j)));
  await saveSeen(profileName, newHashes);
  return { jobs: marked, newCount };
}

function writeTempProfile(profile: Record<string, any>) {
  const safeName = profile.name.replace(/[ /]/g, "_");
  const dest = join(TEMP_HOME, "profiles", `${safeName}.json`);
  writeFileSync(dest, JSON.stringify(profile, null, 2));
}

router.post("/search", async (req, res) => {
  const { profile_name, mock } = req.body ?? {};
  if (!profile_name) { res.status(400).json({ error: "profile_name required" }); return; }

  const profile = await loadProfile(profile_name);
  if (!profile) { res.status(404).json({ error: `Profile '${profile_name}' not found` }); return; }

  writeTempProfile(profile);

  const jobId = randomBytes(4).toString("hex");
  _jobs.set(jobId, { status: "running", jobs: [], total: 0, filepath: "", error: "", profile_name, new_count: 0 });
  _jobStreams.set(jobId, []);

  const args = [WORKER, profile_name];
  if (mock) args.push("--mock");

  const proc = spawn("python", args, {
    cwd: WORKSPACE,
    env: { ...process.env, REPL_HOME: TEMP_HOME },
  });
  let buffer = "";

  proc.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        const streams = _jobStreams.get(jobId) ?? [];
        streams.push(trimmed);
        _jobStreams.set(jobId, streams);

        if (event.type === "done") {
          markDuplicates(event.jobs ?? [], profile_name).then(({ jobs: markedJobs, newCount }) => {
            const job = _jobs.get(jobId)!;
            job.status = "completed";
            job.jobs = markedJobs;
            job.total = event.total ?? 0;
            job.filepath = event.filepath ?? "";
            job.new_count = newCount;
            _jobs.set(jobId, job);
          });
        } else if (event.type === "error") {
          const job = _jobs.get(jobId)!;
          job.status = "error";
          job.error = event.msg ?? "Unknown error";
          _jobs.set(jobId, job);
        }
      } catch {}
    }
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    console.error("[search_worker stderr]", chunk.toString());
  });

  proc.on("close", () => {
    const streams = _jobStreams.get(jobId) ?? [];
    streams.push(JSON.stringify({ type: "end" }));
    _jobStreams.set(jobId, streams);
    const job = _jobs.get(jobId)!;
    if (job.status === "running") {
      job.status = "error";
      job.error = "Worker exited unexpectedly";
      _jobs.set(jobId, job);
    }
  });

  res.json({ job_id: jobId, message: "Search started" });
});

router.get("/search/stream/:jobId", (req, res) => {
  const { jobId } = req.params;
  if (!_jobStreams.has(jobId)) { res.status(404).json({ error: "Job not found" }); return; }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let sentIndex = 0;
  let ended = false;

  const interval = setInterval(() => {
    const streams = _jobStreams.get(jobId) ?? [];
    while (sentIndex < streams.length) {
      const line = streams[sentIndex];
      sentIndex++;
      if (line === undefined) continue;
      try {
        const event = JSON.parse(line);
        res.write(`data: ${line}\n\n`);
        if (event.type === "end" || event.type === "done" || event.type === "error") {
          ended = true;
          break;
        }
      } catch {}
    }
    if (ended) { clearInterval(interval); res.end(); }
  }, 200);

  req.on("close", () => clearInterval(interval));
});

router.get("/search/results/:jobId", (req, res) => {
  const job = _jobs.get(req.params.jobId);
  if (!job) { res.status(404).json({ error: "Job not found" }); return; }
  res.json({
    job_id: req.params.jobId,
    status: job.status,
    jobs: job.jobs,
    total: job.total,
    filepath: job.filepath,
    error: job.error,
    new_count: job.new_count,
  });
});

export default router;
