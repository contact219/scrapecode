import { Router } from "express";
import { readdirSync, statSync, existsSync } from "fs";
import { join, basename } from "path";
import { createReadStream } from "fs";

const router = Router();
const HOME = process.env.REPL_HOME ?? ".";
const OUTPUT_DIR = join(HOME, "output");

router.get("/output/files", (_req, res) => {
  try {
    if (!existsSync(OUTPUT_DIR)) return res.json({ files: [] });
    const files = readdirSync(OUTPUT_DIR)
      .filter((f) => f.endsWith(".xlsx"))
      .map((f) => {
        const fp = join(OUTPUT_DIR, f);
        const stat = statSync(fp);
        return {
          name: f,
          size: stat.size,
          modified: new Date(stat.mtimeMs).toISOString().slice(0, 16).replace("T", " "),
          download_url: `/api/output/download/${encodeURIComponent(f)}`,
        };
      })
      .sort((a, b) => b.modified.localeCompare(a.modified));
    res.json({ files });
  } catch {
    res.json({ files: [] });
  }
});

router.get("/output/download/:filename", (req, res) => {
  const filename = decodeURIComponent(req.params.filename);
  const filepath = join(OUTPUT_DIR, basename(filename));
  if (!existsSync(filepath)) return res.status(404).json({ error: "File not found" });

  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  createReadStream(filepath).pipe(res);
});

export default router;
