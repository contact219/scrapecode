#!/usr/bin/env python3
"""
main.py
Local / Agent Zero entry point for JobSearch Pro.
For Replit, use replit_main.py instead.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from ui.menu import MainMenu

if __name__ == "__main__":
    app = MainMenu()
    app.run()
