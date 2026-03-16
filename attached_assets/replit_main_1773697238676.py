#!/usr/bin/env python3
"""
replit_main.py
──────────────
Replit-compatible entry point for JobSearch Pro.
Runs the same menu system as main.py but with Replit-aware path handling
and a NAS-free fallback (downloads the xlsx instead of uploading to NAS).

Usage in Replit:
    python replit_main.py
"""

import os
import sys
from pathlib import Path

# ── Replit path adjustments ───────────────────────────────────────────────────
REPLIT_HOME = Path(os.environ.get("REPL_HOME", "."))
BASE_DIR    = Path(__file__).resolve().parent

# Override config defaults for Replit environment
os.environ["JOBSEARCH_OUTPUT_DIR"] = str(REPLIT_HOME / "output")
os.environ["JOBSEARCH_LOG_DIR"]    = str(REPLIT_HOME / "logs")
os.environ["JOBSEARCH_PROFILES"]   = str(REPLIT_HOME / "profiles")

sys.path.insert(0, str(BASE_DIR))

# Patch ConfigManager defaults before import
from core.config_manager import ConfigManager, DEFAULTS
DEFAULTS["output_dir"]   = str(REPLIT_HOME / "output")
DEFAULTS["log_dir"]      = str(REPLIT_HOME / "logs")
DEFAULTS["nas_enabled"]  = False   # NAS not available in Replit
DEFAULTS["email_enabled"]= False   # configure manually if desired

# Patch ProfileManager directory
import core.profile_manager as pm_module
_orig_init = pm_module.ProfileManager.__init__

def _patched_init(self, cfg):
    _orig_init(self, cfg)
    self.profiles_dir = REPLIT_HOME / "profiles"
    self.profiles_dir.mkdir(parents=True, exist_ok=True)

pm_module.ProfileManager.__init__ = _patched_init

# ── Print Replit welcome banner ───────────────────────────────────────────────
print("\033[96m")
print("╔══════════════════════════════════════════════════════╗")
print("║       JobSearch Pro — Running on Replit              ║")
print("║  NAS upload replaced with local file download        ║")
print("║  Spreadsheets saved to:  /output/                    ║")
print("╚══════════════════════════════════════════════════════╝")
print("\033[0m")
print("  Tip: After a run, find your .xlsx in the Files panel → output/")
print()

# ── Launch main menu ──────────────────────────────────────────────────────────
from ui.menu import MainMenu

if __name__ == "__main__":
    app = MainMenu()
    app.run()
