import cron from "node-cron";
import { spawn } from "child_process";
import { join } from "path";
import { readdirSync, readFileSync, existsSync } from "fs";

const WORKSPACE = process.env.REPL_HOME ?? process.cwd();
const PROFILES_DIR = join(WORKSPACE, "profiles");
const WORKER = join(WORKSPACE, "search_worker.py");

function loadProfileFile(filePath: string): Record<string, any> | null {
  try { return JSON.parse(readFileSync(filePath, "utf-8")); } catch { return null; }
}

function runScheduledSearch(profileName: string) {
  console.log(`[scheduler] Running scheduled search for: ${profileName}`);
  const proc = spawn("python", [WORKER, profileName], { cwd: WORKSPACE });
  proc.stdout.on("data", (d: Buffer) => console.log(`[scheduler:${profileName}]`, d.toString().trim()));
  proc.stderr.on("data", (d: Buffer) => console.error(`[scheduler:${profileName}:err]`, d.toString().trim()));
  proc.on("close", (code: number) => console.log(`[scheduler] ${profileName} finished (code ${code})`));
}

export function startScheduler() {
  cron.schedule("* * * * *", () => {
    if (!existsSync(PROFILES_DIR)) return;
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentWeekday = now.getDay();

    const files = readdirSync(PROFILES_DIR).filter(
      f => f.endsWith(".json") && f !== "config.json" && f !== "auth.json"
        && !f.startsWith("seen_") && f !== "job_tracker.json"
    );

    for (const file of files) {
      const profile = loadProfileFile(join(PROFILES_DIR, file));
      if (!profile || !profile.name || !profile.schedule || profile.schedule === "none") continue;

      const schedHour = profile.schedule_hour ?? 8;
      const schedMin = profile.schedule_minute ?? 0;

      if (currentHour !== schedHour || currentMinute !== schedMin) continue;

      if (profile.schedule === "daily") {
        runScheduledSearch(profile.name);
      } else if (profile.schedule === "weekly") {
        const schedDay = profile.schedule_weekday ?? 1;
        if (currentWeekday === schedDay) runScheduledSearch(profile.name);
      }
    }
  });

  console.log("[scheduler] Started — checking profile schedules every minute");
}
