"""
core/nas_uploader.py
NAS/SMB upload support (disabled on Replit — no local network access).
"""


class NASUploader:
    def __init__(self, cfg):
        self.enabled = cfg.get("nas_enabled", False)

    def upload(self, filepath: str) -> bool:
        if not self.enabled:
            return False
        try:
            import subprocess
            nas_path = self._cfg.get("nas_path", "")
            if not nas_path:
                return False
            import shutil
            shutil.copy(filepath, nas_path)
            return True
        except Exception:
            return False

    def test_connection(self) -> tuple[bool, str]:
        return False, "NAS upload is not available in this environment."
