#!/usr/bin/env python3
"""
parse_resume_worker.py
Called by the Express API to parse a resume file.
Outputs single JSON line to stdout.
Args: <file_path>
"""

import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: parse_resume_worker.py <file_path>"}))
        sys.exit(1)

    path = sys.argv[1]
    try:
        from core.resume_parser import ResumeParser
        parser = ResumeParser()
        result = parser.parse(path)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()
