"""
core/profile_manager.py
Named search profiles stored as individual JSON files.
"""

import json
import shutil
from pathlib import Path


DEFAULT_PROFILE = {
    "name": "",
    "salary_min": 0,
    "work_type": "remote",
    "sources": ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"],
    "queries": [],
    "resume_ref": "",
}


class ProfileManager:
    def __init__(self, cfg):
        self.profiles_dir = Path(cfg.get("profiles_dir", "profiles"))
        self.profiles_dir.mkdir(parents=True, exist_ok=True)

    def _path(self, name: str) -> Path:
        safe = name.replace(" ", "_").replace("/", "_")
        return self.profiles_dir / f"{safe}.json"

    def list_profiles(self) -> list[str]:
        return [p.stem.replace("_", " ") for p in sorted(self.profiles_dir.glob("*.json"))
                if p.stem != "config"]

    def load(self, name: str) -> dict:
        path = self._path(name)
        if not path.exists():
            raise FileNotFoundError(f"Profile '{name}' not found")
        with open(path) as f:
            data = json.load(f)
        profile = dict(DEFAULT_PROFILE)
        profile.update(data)
        return profile

    def save(self, profile: dict):
        name = profile["name"]
        path = self._path(name)
        with open(path, "w") as f:
            json.dump(profile, f, indent=2)

    def create(self, name: str, **kwargs) -> dict:
        profile = dict(DEFAULT_PROFILE)
        profile["name"] = name
        profile.update(kwargs)
        self.save(profile)
        return profile

    def delete(self, name: str):
        path = self._path(name)
        if path.exists():
            path.unlink()

    def duplicate(self, source: str, new_name: str) -> dict:
        profile = self.load(source)
        profile["name"] = new_name
        self.save(profile)
        return profile

    def exists(self, name: str) -> bool:
        return self._path(name).exists()
