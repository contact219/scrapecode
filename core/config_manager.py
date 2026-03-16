"""
core/config_manager.py
Persistent JSON-backed application configuration.
"""

import json
import os
from pathlib import Path

DEFAULTS = {
    "output_dir": "output",
    "log_dir": "logs",
    "profiles_dir": "profiles",
    "nas_enabled": False,
    "nas_path": "",
    "nas_user": "",
    "nas_password": "",
    "email_enabled": False,
    "email_from": "",
    "email_to": "",
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_user": "",
    "smtp_password": "",
    "max_results_per_query": 25,
    "request_delay": 2.0,
    "active_profile": None,
}

CONFIG_FILE = Path("profiles") / "config.json"


class ConfigManager:
    def __init__(self):
        self._cfg = dict(DEFAULTS)
        self._load()

    def _load(self):
        try:
            if CONFIG_FILE.exists():
                with open(CONFIG_FILE) as f:
                    saved = json.load(f)
                self._cfg.update(saved)
        except Exception:
            pass

    def save(self):
        CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CONFIG_FILE, "w") as f:
            json.dump(self._cfg, f, indent=2)

    def get(self, key, default=None):
        return self._cfg.get(key, DEFAULTS.get(key, default))

    def set(self, key, value):
        self._cfg[key] = value
        self.save()

    def all(self):
        return dict(self._cfg)
