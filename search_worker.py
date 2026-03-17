#!/usr/bin/env python3
"""
search_worker.py
Called by the Express API server to run a job search.
Streams JSON progress events to stdout, one per line.
Args: <profile_json_file> [--mock]
"""

import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

REPLIT_HOME = Path(os.environ.get("REPL_HOME", "."))

logging.basicConfig(
    level=logging.WARNING,
    format="[%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)

from core.config_manager import ConfigManager, DEFAULTS
DEFAULTS["output_dir"]   = str(REPLIT_HOME / "output")
DEFAULTS["log_dir"]      = str(REPLIT_HOME / "logs")
DEFAULTS["profiles_dir"] = str(REPLIT_HOME / "profiles")
DEFAULTS["nas_enabled"]  = False

import core.profile_manager as pm_module
_orig_init = pm_module.ProfileManager.__init__
def _patched_init(self, cfg):
    _orig_init(self, cfg)
    self.profiles_dir = REPLIT_HOME / "profiles"
    self.profiles_dir.mkdir(parents=True, exist_ok=True)
pm_module.ProfileManager.__init__ = _patched_init

for d in ["output", "logs", "profiles"]:
    (REPLIT_HOME / d).mkdir(parents=True, exist_ok=True)


def emit(obj):
    print(json.dumps(obj), flush=True)


def main():
    if len(sys.argv) < 2:
        emit({"type": "error", "msg": "Usage: search_worker.py <profile_name> [--mock]"})
        sys.exit(1)

    profile_name = sys.argv[1]
    use_mock = "--mock" in sys.argv

    if use_mock:
        os.environ["JOBSEARCH_MOCK"] = "1"
    else:
        os.environ.pop("JOBSEARCH_MOCK", None)
        os.environ.pop("MOCK", None)

    cfg = ConfigManager()

    from core.profile_manager import ProfileManager
    pm = ProfileManager(cfg)

    try:
        profile = pm.load(profile_name)
    except FileNotFoundError:
        emit({"type": "error", "msg": f"Profile '{profile_name}' not found"})
        sys.exit(1)

    if not profile.get("queries"):
        emit({"type": "error", "msg": "No search queries in this profile"})
        sys.exit(1)

    emit({"type": "started", "profile": profile_name, "queries": len(profile["queries"])})

    class _Cfg:
        def get(self, k, d=None):
            return cfg.get(k, d)

    from core.scraper import JobScraper
    scraper = JobScraper(_Cfg())

    def progress(step, total, msg):
        pct = int(100 * step / max(total, 1))
        emit({"type": "progress", "step": step, "total": total, "pct": pct, "msg": msg})

    try:
        jobs = scraper.search(profile, progress_cb=progress)

        emit({"type": "status", "msg": f"Building spreadsheet for {len(jobs)} jobs..."})

        filepath = ""
        if jobs:
            from core.spreadsheet import SpreadsheetBuilder
            class _BCfg:
                def get(self, k, d=None):
                    return {"output_dir": str(REPLIT_HOME / "output")}.get(k, d)
            builder = SpreadsheetBuilder(_BCfg())
            filepath = builder.build(jobs, profile)

            history_file = REPLIT_HOME / "output" / "run_history.json"
            history = []
            if history_file.exists():
                try:
                    with open(history_file) as f:
                        history = json.load(f)
                except Exception:
                    pass
            history.insert(0, {
                "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "profile": profile_name,
                "total": len(jobs),
                "filepath": filepath,
            })
            history = history[:20]
            with open(history_file, "w") as f:
                json.dump(history, f, indent=2)

        emit({"type": "done", "total": len(jobs), "filepath": filepath, "jobs": jobs})

    except Exception as e:
        emit({"type": "error", "msg": str(e)})
        sys.exit(1)


if __name__ == "__main__":
    main()
