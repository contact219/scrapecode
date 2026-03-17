import cron from "node-cron";
import { spawn } from "child_process";
import { join } from "path";
import { mkdirSync, writeFileSync } from "fs";
import { listProfiles, loadProfile } from "./routes/profiles";

const WORKSPACE = process.env.REPL_HOME ?? process.cwd();
const WORKER = join(WORKSPACE, "search_worker.py");
const TEMP_HOME = "/tmp/scrapedata";

mkdirSync(join(TEMP_HOME, "profiles"), { recursive: true });
mkdirSync(join(TEMP_HOME, "output"), { recursive: true });
mkdirSync(join(TEMP_HOME, "logs"), { recursive: true });

function writeTempProfile(profile: Record<string, any>) {
  const safeName = profile.name.replace(/[ /]/g, "_");
  const dest = join(TEMP_HOME, "profiles", `${safeName}.json`);
  writeFileSync(dest, JSON.stringify(profile, null, 2));
}

function runScheduledSearch(profile: Record<string, any>) {
  console.log(`[scheduler] Running scheduled search for: ${profile.name}`);
  writeTempProfile(profile);
  const proc = spawn("python", [WORKER, profile.name], {
    cwd: WORKSPACE,
    env: { ...process.env, REPL_HOME: TEMP_HOME },
  });
  proc.stdout.on("data", (d: Buffer) => console.log(`[scheduler:${profile.name}]`, d.toString().trim()));
  proc.stderr.on("data", (d: Buffer) => console.error(`[scheduler:${profile.name}:err]`, d.toString().trim()));
  proc.on("close", (code: number) => console.log(`[scheduler] ${profile.name} finished (code ${code})`));
}

export function startScheduler() {
  cron.schedule("* * * * *", async () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentWeekday = now.getDay();

    try {
      const names = await listProfiles();
      for (const name of names) {
        const profile = await loadProfile(name);
        if (!profile || !profile.name || !profile.schedule || profile.schedule === "none") continue;

        const schedHour = profile.schedule_hour ?? 8;
        const schedMin = profile.schedule_minute ?? 0;

        if (currentHour !== schedHour || currentMinute !== schedMin) continue;

        if (profile.schedule === "daily") {
          runScheduledSearch(profile);
        } else if (profile.schedule === "weekly") {
          const schedDay = profile.schedule_weekday ?? 1;
          if (currentWeekday === schedDay) runScheduledSearch(profile);
        }
      }
    } catch (e) {
      console.error("[scheduler] Error reading profiles:", e);
    }
  });

  console.log("[scheduler] Started — checking profile schedules every minute");
}
