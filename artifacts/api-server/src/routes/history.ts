import { Router } from "express";
import pool from "../lib/db";

const router = Router();

router.get("/history", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, profile_name, run_date, total_jobs, new_jobs, filepath, sources_summary
       FROM sc_run_history
       ORDER BY run_date DESC
       LIMIT 50`
    );
    const history = result.rows.map((r) => ({
      id: r.id,
      date: new Date(r.run_date).toISOString().slice(0, 16).replace("T", " "),
      profile: r.profile_name,
      total: r.total_jobs,
      new_jobs: r.new_jobs,
      filepath: r.filepath,
      sources_summary: r.sources_summary ?? {},
    }));
    res.json({ history });
  } catch (e) {
    console.error("[history] DB error:", e);
    res.json({ history: [] });
  }
});

export default router;
