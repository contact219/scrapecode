import { Router } from "express";
import { spawn } from "child_process";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync, readFileSync, writeFileSync } from "fs";

const router = Router();

const WORKSPACE = process.env.REPL_HOME ?? process.cwd();
const PROFILES_DIR = join(WORKSPACE, "profiles");
const WORKER = join(WORKSPACE, "search_worker.py");

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

function seenFile(profileName: string): string {
  return join(PROFILES_DIR, `seen_${profileName.replace(/[ /]/g, "_")}.json`);
}

function loadSeen(profileName: string): Set<string> {
  const f = seenFile(profileName);
  if (!existsSync(f)) return new Set();
  try { return new Set(JSON.parse(readFileSync(f, "utf-8"))); } catch { return new Set(); }
}

function saveSeen(profileName: string, seen: Set<string>) {
  writeFileSync(seenFile(profileName), JSON.stringify([...seen], null, 2));
}

function markDuplicates(jobs: any[], profileName: string): { jobs: any[], newCount: number } {
  const seen = loadSeen(profileName);
  let newCount = 0;
  const marked = jobs.map(job => {
    const hash = jobHash(job);
    const isNew = !seen.has(hash);
    if (isNew) newCount++;
    return { ...job, is_new: isNew };
  });
  const updated = new Set(seen);
  marked.forEach(j => updated.add(jobHash(j)));
  saveSeen(profileName, updated);
  return { jobs: marked, newCount };
}

router.post("/search", (req, res) => {
  const { profile_name, mock } = req.body ?? {};
  if (!profile_name) { res.status(400).json({ error: "profile_name required" }); return; }

  const jobId = randomBytes(4).toString("hex");
  _jobs.set(jobId, { status: "running", jobs: [], total: 0, filepath: "", error: "", profile_name, new_count: 0 });
  _jobStreams.set(jobId, []);

  const args = [WORKER, profile_name];
  if (mock) args.push("--mock");

  const proc = spawn("python", args, { cwd: WORKSPACE });
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
          const job = _jobs.get(jobId)!;
          const { jobs: markedJobs, newCount } = markDuplicates(event.jobs ?? [], profile_name);
          job.status = "completed";
          job.jobs = markedJobs;
          job.total = event.total ?? 0;
          job.filepath = event.filepath ?? "";
          job.new_count = newCount;
          _jobs.set(jobId, job);
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
