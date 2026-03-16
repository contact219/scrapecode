import { Router } from "express";
import { spawn } from "child_process";
import { join } from "path";
import { mkdirSync, unlinkSync, existsSync } from "fs";
import multer from "multer";
import { randomBytes } from "crypto";

const router = Router();

const HOME = process.env.REPL_HOME ?? ".";
const WORKSPACE = HOME;
const WORKER = join(WORKSPACE, "parse_resume_worker.py");
const UPLOAD_DIR = join(HOME, "output", "uploads");

mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = file.originalname.split(".").pop() ?? "bin";
    cb(null, `${randomBytes(8).toString("hex")}.${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = /\.(pdf|docx|doc)$/i.test(file.originalname);
    cb(null, ok);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/resume/parse", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded or unsupported type (.pdf, .docx only)" });

  const filePath = req.file.path;

  const proc = spawn("python", [WORKER, filePath], { cwd: WORKSPACE });
  let output = "";

  proc.stdout.on("data", (chunk: Buffer) => { output += chunk.toString(); });
  proc.stderr.on("data", (chunk: Buffer) => { console.error("[resume_worker stderr]", chunk.toString()); });

  proc.on("close", () => {
    try { if (existsSync(filePath)) unlinkSync(filePath); } catch {}
    try {
      const result = JSON.parse(output.trim());
      if (result.error) return res.status(500).json({ error: result.error });
      res.json(result);
    } catch {
      res.status(500).json({ error: "Failed to parse resume output", raw: output });
    }
  });
});

export default router;
