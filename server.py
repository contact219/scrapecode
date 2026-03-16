#!/usr/bin/env python3
"""
server.py
Flask API server for JobSearch Pro dashboard.
Exposes REST endpoints + SSE streaming for real-time search progress.
"""

import json
import os
import queue
import sys
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

from flask import Flask, jsonify, request, Response, send_file
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from core.config_manager import ConfigManager, DEFAULTS
from core.profile_manager import ProfileManager
from core.resume_parser import ResumeParser
from core.scraper import JobScraper
from core.spreadsheet import SpreadsheetBuilder
from core.emailer import Emailer

REPLIT_HOME = Path(os.environ.get("REPL_HOME", "."))
DEFAULTS["output_dir"]   = str(REPLIT_HOME / "output")
DEFAULTS["log_dir"]      = str(REPLIT_HOME / "logs")
DEFAULTS["profiles_dir"] = str(REPLIT_HOME / "profiles")
DEFAULTS["nas_enabled"]  = False

for d in ["output", "logs", "profiles"]:
    (REPLIT_HOME / d).mkdir(parents=True, exist_ok=True)

import core.profile_manager as pm_module
_orig_init = pm_module.ProfileManager.__init__

def _patched_init(self, cfg):
    _orig_init(self, cfg)
    self.profiles_dir = REPLIT_HOME / "profiles"
    self.profiles_dir.mkdir(parents=True, exist_ok=True)

pm_module.ProfileManager.__init__ = _patched_init

app = Flask(__name__)
CORS(app, origins="*")

cfg = ConfigManager()
pm = ProfileManager(cfg)

RUN_HISTORY_FILE = REPLIT_HOME / "output" / "run_history.json"

# In-memory store for running/completed search jobs
_jobs: dict[str, dict] = {}
_job_queues: dict[str, queue.Queue] = {}


def load_history():
    if RUN_HISTORY_FILE.exists():
        try:
            with open(RUN_HISTORY_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def save_history(entry):
    history = load_history()
    history.insert(0, entry)
    history = history[:20]
    RUN_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(RUN_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


# ─── Health ──────────────────────────────────────────────────────────────────

@app.route("/api/healthz")
def health():
    return jsonify({"status": "ok"})


# ─── Profiles ─────────────────────────────────────────────────────────────────

@app.route("/api/profiles", methods=["GET"])
def list_profiles():
    profiles = pm.list_profiles()
    active = cfg.get("active_profile")
    return jsonify({"profiles": profiles, "active": active})


@app.route("/api/profiles", methods=["POST"])
def create_profile():
    data = request.json or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "Name required"}), 400
    if pm.exists(name):
        return jsonify({"error": f"Profile '{name}' already exists"}), 409
    profile = pm.create(
        name,
        salary_min=data.get("salary_min", 0),
        work_type=data.get("work_type", "remote"),
        sources=data.get("sources", ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"]),
        queries=data.get("queries", []),
    )
    cfg.set("active_profile", name)
    return jsonify(profile), 201


@app.route("/api/profiles/active", methods=["GET"])
def get_active():
    return jsonify({"active": cfg.get("active_profile")})


@app.route("/api/profiles/active", methods=["POST"])
def set_active():
    data = request.json or {}
    name = data.get("name")
    cfg.set("active_profile", name)
    return jsonify({"message": f"Active profile set to '{name}'", "success": True})


@app.route("/api/profiles/<name>", methods=["GET"])
def get_profile(name):
    try:
        profile = pm.load(name)
        return jsonify(profile)
    except FileNotFoundError:
        return jsonify({"error": "Not found"}), 404


@app.route("/api/profiles/<name>", methods=["PUT"])
def update_profile(name):
    data = request.json or {}
    try:
        profile = pm.load(name)
    except FileNotFoundError:
        return jsonify({"error": "Not found"}), 404
    profile.update(data)
    pm.save(profile)
    return jsonify(profile)


@app.route("/api/profiles/<name>", methods=["DELETE"])
def delete_profile(name):
    pm.delete(name)
    if cfg.get("active_profile") == name:
        cfg.set("active_profile", None)
    return jsonify({"message": f"Deleted '{name}'", "success": True})


# ─── Config ───────────────────────────────────────────────────────────────────

@app.route("/api/config", methods=["GET"])
def get_config():
    keys = [
        "max_results_per_query", "request_delay",
        "email_enabled", "email_from", "email_to",
        "smtp_host", "smtp_port", "smtp_user", "smtp_password",
    ]
    return jsonify({k: cfg.get(k) for k in keys})


@app.route("/api/config", methods=["PUT"])
def update_config():
    data = request.json or {}
    allowed = [
        "max_results_per_query", "request_delay",
        "email_enabled", "email_from", "email_to",
        "smtp_host", "smtp_port", "smtp_user", "smtp_password",
    ]
    for k in allowed:
        if k in data:
            cfg.set(k, data[k])
    return jsonify({"message": "Config updated", "success": True})


# ─── Resume Parsing ───────────────────────────────────────────────────────────

@app.route("/api/resume/parse", methods=["POST"])
def parse_resume():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    f = request.files["file"]
    ext = Path(f.filename).suffix.lower()
    if ext not in (".pdf", ".docx", ".doc"):
        return jsonify({"error": "Unsupported file type. Upload .pdf or .docx"}), 400

    upload_dir = REPLIT_HOME / "output" / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    save_path = upload_dir / f"{uuid.uuid4().hex}{ext}"
    f.save(str(save_path))

    try:
        parser = ResumeParser()
        result = parser.parse(str(save_path))
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            save_path.unlink()
        except Exception:
            pass


# ─── Search ───────────────────────────────────────────────────────────────────

def _run_search_background(job_id: str, profile: dict, use_mock: bool):
    q = _job_queues[job_id]
    _jobs[job_id] = {"status": "running", "jobs": [], "total": 0, "filepath": "", "error": ""}

    if use_mock:
        os.environ["JOBSEARCH_MOCK"] = "1"
    else:
        os.environ.pop("JOBSEARCH_MOCK", None)
        os.environ.pop("MOCK", None)

    scraper_cfg = {
        "request_delay": cfg.get("request_delay", 2.0),
        "max_results_per_query": cfg.get("max_results_per_query", 25),
    }
    scraper = JobScraper(type("Cfg", (), {"get": lambda self, k, d=None: scraper_cfg.get(k, d)})())

    all_jobs = []

    def progress(step, total, msg):
        pct = int(100 * step / max(total, 1))
        event = json.dumps({"type": "progress", "step": step, "total": total, "pct": pct, "msg": msg})
        q.put(event)

    try:
        all_jobs = scraper.search(profile, progress_cb=progress)
        _jobs[job_id]["jobs"] = all_jobs
        _jobs[job_id]["total"] = len(all_jobs)

        if all_jobs:
            q.put(json.dumps({"type": "status", "msg": f"Building Excel spreadsheet..."}))
            builder = SpreadsheetBuilder(type("Cfg", (), {"get": lambda self, k, d=None: {"output_dir": str(REPLIT_HOME / "output")}.get(k, d)})())
            filepath = builder.build(all_jobs, profile)
            _jobs[job_id]["filepath"] = filepath

            save_history({
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "profile": profile["name"],
                "total": len(all_jobs),
                "filepath": filepath,
            })

        _jobs[job_id]["status"] = "completed"
        q.put(json.dumps({"type": "done", "total": len(all_jobs), "filepath": _jobs[job_id].get("filepath", "")}))

    except Exception as e:
        _jobs[job_id]["status"] = "error"
        _jobs[job_id]["error"] = str(e)
        q.put(json.dumps({"type": "error", "msg": str(e)}))
    finally:
        q.put(None)


@app.route("/api/search", methods=["POST"])
def run_search():
    data = request.json or {}
    profile_name = data.get("profile_name", "").strip()
    use_mock = bool(data.get("mock", False))

    if not profile_name:
        return jsonify({"error": "profile_name required"}), 400

    try:
        profile = pm.load(profile_name)
    except FileNotFoundError:
        return jsonify({"error": f"Profile '{profile_name}' not found"}), 404

    if not profile.get("queries"):
        return jsonify({"error": "Profile has no search queries. Add some first."}), 400

    job_id = str(uuid.uuid4())[:8]
    _job_queues[job_id] = queue.Queue()

    thread = threading.Thread(target=_run_search_background, args=(job_id, profile, use_mock), daemon=True)
    thread.start()

    return jsonify({"job_id": job_id, "message": "Search started"})


@app.route("/api/search/stream/<job_id>")
def stream_search(job_id):
    if job_id not in _job_queues:
        return jsonify({"error": "Job not found"}), 404

    def generate():
        q = _job_queues[job_id]
        while True:
            try:
                event = q.get(timeout=30)
                if event is None:
                    yield "data: {\"type\": \"end\"}\n\n"
                    break
                yield f"data: {event}\n\n"
            except queue.Empty:
                yield "data: {\"type\": \"heartbeat\"}\n\n"

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/api/search/results/<job_id>")
def get_results(job_id):
    if job_id not in _jobs:
        return jsonify({"error": "Job not found"}), 404
    job = _jobs[job_id]
    return jsonify({
        "job_id": job_id,
        "status": job.get("status", "unknown"),
        "jobs": job.get("jobs", []),
        "total": job.get("total", 0),
        "filepath": job.get("filepath", ""),
        "error": job.get("error", ""),
    })


# ─── History ──────────────────────────────────────────────────────────────────

@app.route("/api/history")
def get_history():
    return jsonify({"history": load_history()})


# ─── Output Files ─────────────────────────────────────────────────────────────

@app.route("/api/output/files")
def list_output_files():
    output_dir = REPLIT_HOME / "output"
    files = []
    for f in sorted(output_dir.glob("*.xlsx"), key=lambda x: x.stat().st_mtime, reverse=True):
        stat = f.stat()
        files.append({
            "name": f.name,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
            "download_url": f"/api/output/download/{f.name}",
        })
    return jsonify({"files": files})


@app.route("/api/output/download/<filename>")
def download_file(filename):
    output_dir = REPLIT_HOME / "output"
    filepath = output_dir / filename
    if not filepath.exists() or not filepath.is_file():
        return jsonify({"error": "File not found"}), 404
    return send_file(str(filepath), as_attachment=True, download_name=filename)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    print(f"JobSearch Pro API starting on port {port}")
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
