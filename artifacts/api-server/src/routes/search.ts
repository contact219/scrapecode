import { Router } from "express";
import { spawn, execFileSync } from "child_process";
import { join, resolve } from "path";
import { randomBytes } from "crypto";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import pool from "../lib/db";
import { loadProfile } from "./profiles";

const router = Router();

// Resolve workspace root reliably across dev and production:
// 1. If REPL_HOME points to a dir that contains search_worker.py, use it
// 2. Otherwise climb from __dirname (dist/ -> api-server -> artifacts -> root)
function resolveWorkspace(): string {
  const fromEnv = process.env.REPL_HOME;
  if (fromEnv && existsSync(join(fromEnv, "search_worker.py"))) return fromEnv;
  // __dirname in the compiled bundle is artifacts/api-server/dist/
  const fromDir = resolve(__dirname, "../../..");
  if (existsSync(join(fromDir, "search_worker.py"))) return fromDir;
  // Last resort: cwd
  return process.cwd();
}

// Prefer python3; fall back to python
function resolvePython(): string {
  for (const cmd of ["python3", "python"]) {
    try { execFileSync(cmd, ["--version"], { stdio: "ignore" }); return cmd; } catch {}
  }
  return "python3";
}

const WORKSPACE = resolveWorkspace();
const PYTHON = resolvePython();
const WORKER = join(WORKSPACE, "search_worker.py");
const TEMP_HOME = "/tmp/scrapedata";

console.log(`[search] WORKSPACE=${WORKSPACE} PYTHON=${PYTHON} WORKER=${WORKER}`);

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
  progress_pct: number;
  progress_msg: string;
}

const _jobs = new Map<string, Job>();

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
  _jobs.set(jobId, {
    status: "running", jobs: [], total: 0, filepath: "", error: "",
    profile_name, new_count: 0, progress_pct: 0, progress_msg: "Starting search worker...",
  });

  const args = [WORKER, profile_name];
  if (mock) args.push("--mock");

  console.log(`[search] Spawning worker: ${PYTHON} ${args.join(" ")}`);

  const proc = spawn(PYTHON, args, {
    cwd: WORKSPACE,
    env: { ...process.env, REPL_HOME: TEMP_HOME },
  });
  let buffer = "";

  proc.on("error", (err) => {
    console.error("[search_worker spawn error]", err.message);
    const job = _jobs.get(jobId)!;
    job.status = "error";
    job.error = `Failed to start search worker: ${err.message}`;
    job.progress_msg = job.error;
    _jobs.set(jobId, job);
  });

  proc.stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed);
        const job = _jobs.get(jobId);
        if (!job) continue;

        if (event.type === "progress") {
          job.progress_pct = event.pct ?? job.progress_pct;
          job.progress_msg = event.msg ?? job.progress_msg;
          _jobs.set(jobId, job);
        } else if (event.type === "status") {
          job.progress_msg = event.msg ?? job.progress_msg;
          _jobs.set(jobId, job);
        } else if (event.type === "done") {
          markDuplicates(event.jobs ?? [], profile_name).then(async ({ jobs: markedJobs, newCount }) => {
            const j = _jobs.get(jobId)!;
            j.status = "completed";
            j.jobs = markedJobs;
            j.total = event.total ?? 0;
            j.filepath = event.filepath ?? "";
            j.new_count = newCount;
            j.progress_pct = 100;
            j.progress_msg = "Search complete!";
            _jobs.set(jobId, j);
            try {
              const sourcesSummary: Record<string, number> = {};
              for (const job of markedJobs) {
                const src = job.source ?? "unknown";
                sourcesSummary[src] = (sourcesSummary[src] ?? 0) + 1;
              }
              await pool.query(
                `INSERT INTO sc_run_history (profile_name, total_jobs, new_jobs, filepath, sources_summary)
                 VALUES ($1, $2, $3, $4, $5)`,
                [profile_name, event.total ?? 0, newCount, event.filepath ?? "", JSON.stringify(sourcesSummary)]
              );
              console.log(`[search] Saved history: ${profile_name} → ${event.total ?? 0} jobs`);
            } catch (dbErr) {
              console.error("[search] Failed to save history:", dbErr);
            }
          });
        } else if (event.type === "error") {
          job.status = "error";
          job.error = event.msg ?? "Unknown error";
          job.progress_msg = job.error;
          _jobs.set(jobId, job);
        }
      } catch {}
    }
  });

  proc.stderr.on("data", (chunk: Buffer) => {
    console.error("[search_worker stderr]", chunk.toString());
  });

  proc.on("close", (code) => {
    console.log(`[search] Worker exited with code ${code}`);
    const job = _jobs.get(jobId);
    if (job && job.status === "running") {
      job.status = "error";
      job.error = `Worker exited unexpectedly (code ${code})`;
      job.progress_msg = job.error;
      _jobs.set(jobId, job);
    }
  });

  res.json({ job_id: jobId, message: "Search started" });
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
    progress_pct: job.progress_pct,
    progress_msg: job.progress_msg,
  });
});

export default router;
