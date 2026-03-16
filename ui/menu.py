"""
ui/menu.py
Full interactive terminal menu for JobSearch Pro.
ANSI color codes render correctly in Replit's console.
"""

import json
import logging
import os
import shutil
import sys
from datetime import datetime
from pathlib import Path

from core.config_manager import ConfigManager
from core.profile_manager import ProfileManager
from core.resume_parser import ResumeParser
from core.scraper import JobScraper
from core.spreadsheet import SpreadsheetBuilder
from core.nas_uploader import NASUploader
from core.emailer import Emailer

# ANSI color helpers
C = {
    "reset":  "\033[0m",
    "bold":   "\033[1m",
    "cyan":   "\033[96m",
    "green":  "\033[92m",
    "yellow": "\033[93m",
    "red":    "\033[91m",
    "blue":   "\033[94m",
    "magenta":"\033[95m",
    "dim":    "\033[2m",
    "white":  "\033[97m",
}


def c(color, text):
    return f"{C.get(color,'')}{text}{C['reset']}"


def clear():
    os.system("cls" if os.name == "nt" else "clear")


def divider(ch="─", n=60):
    print(c("dim", ch * n))


def banner(title="JobSearch Pro", subtitle=""):
    clear()
    print(c("cyan", "╔" + "═" * 58 + "╗"))
    pad = (58 - len(title)) // 2
    print(c("cyan", "║") + " " * pad + c("bold", title) + " " * (58 - pad - len(title)) + c("cyan", "║"))
    if subtitle:
        pad2 = (58 - len(subtitle)) // 2
        print(c("cyan", "║") + " " * pad2 + c("dim", subtitle) + " " * (58 - pad2 - len(subtitle)) + c("cyan", "║"))
    print(c("cyan", "╚" + "═" * 58 + "╝"))
    print()


def prompt(text, default=""):
    try:
        val = input(f"  {c('yellow', '›')} {text}" + (f" [{default}]" if default else "") + ": ").strip()
        return val if val else default
    except (EOFError, KeyboardInterrupt):
        return default


def prompt_int(text, default=0, min_val=0, max_val=9999):
    while True:
        raw = prompt(text, str(default))
        try:
            val = int(raw)
            if min_val <= val <= max_val:
                return val
            print(c("red", f"    Enter a number between {min_val} and {max_val}"))
        except ValueError:
            print(c("red", "    Please enter a valid number"))


def choose(options, prompt_text="Select", back_label="Back"):
    print()
    for i, opt in enumerate(options, 1):
        print(f"  {c('cyan', str(i)+'.')} {opt}")
    if back_label:
        print(f"  {c('dim', '0.')} {back_label}")
    print()
    while True:
        raw = prompt(prompt_text, "")
        if raw == "0":
            return None
        try:
            idx = int(raw) - 1
            if 0 <= idx < len(options):
                return options[idx]
        except ValueError:
            pass
        print(c("red", "    Invalid choice"))


def choose_idx(options, prompt_text="Select", back_label="Back"):
    print()
    for i, opt in enumerate(options, 1):
        print(f"  {c('cyan', str(i)+'.')} {opt}")
    if back_label:
        print(f"  {c('dim', '0.')} {back_label}")
    print()
    while True:
        raw = prompt(prompt_text, "")
        if raw == "0":
            return -1
        try:
            idx = int(raw) - 1
            if 0 <= idx < len(options):
                return idx
        except ValueError:
            pass
        print(c("red", "    Invalid choice"))


def pause(msg="Press Enter to continue..."):
    try:
        input(f"\n  {c('dim', msg)}")
    except (EOFError, KeyboardInterrupt):
        pass


def confirm(text) -> bool:
    raw = prompt(f"{text} (y/n)", "n").lower()
    return raw in ("y", "yes")


PRESETS = {
    "Procurement": [
        "procurement manager remote",
        "procurement specialist remote",
        "strategic sourcing manager remote",
        "category manager remote",
        "purchasing manager remote hybrid",
    ],
    "Contracts": [
        "contract administrator remote",
        "subcontracts manager remote",
        "contract manager remote",
        "contract specialist remote hybrid",
        "contracts administrator remote",
    ],
    "Vendor Management": [
        "vendor manager remote",
        "supplier relationship manager remote",
        "vendor specialist remote",
        "supplier manager remote hybrid",
    ],
    "Operations": [
        "operations manager remote hybrid",
        "business operations manager remote",
        "director of operations remote",
        "operations director remote",
    ],
    "Client Success": [
        "client success manager remote",
        "customer success manager remote",
        "account manager remote hybrid",
        "account executive remote",
    ],
    "Supply Chain": [
        "supply chain manager remote",
        "logistics manager remote hybrid",
        "supply chain analyst remote",
        "demand planning manager remote",
    ],
    "Defense / Aerospace": [
        "subcontracts manager defense remote",
        "contract administrator defense hybrid",
        "program manager defense remote",
        "procurement manager aerospace remote",
    ],
    "Healthcare": [
        "procurement manager healthcare remote",
        "vendor manager healthcare remote",
        "supply chain manager healthcare remote",
        "contract administrator healthcare remote",
    ],
    "Technology / SaaS": [
        "procurement manager saas remote",
        "vendor manager technology remote",
        "operations manager tech remote",
        "program manager saas remote",
    ],
}

RUN_HISTORY_FILE = Path("output") / "run_history.json"


def load_run_history() -> list[dict]:
    if RUN_HISTORY_FILE.exists():
        try:
            with open(RUN_HISTORY_FILE) as f:
                return json.load(f)
        except Exception:
            pass
    return []


def save_run_history(entry: dict):
    history = load_run_history()
    history.insert(0, entry)
    history = history[:20]
    RUN_HISTORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(RUN_HISTORY_FILE, "w") as f:
        json.dump(history, f, indent=2)


class MainMenu:
    def __init__(self):
        self.cfg = ConfigManager()
        self.pm = ProfileManager(self.cfg)
        self._setup_logging()

    def _setup_logging(self):
        log_dir = Path(self.cfg.get("log_dir", "logs"))
        log_dir.mkdir(parents=True, exist_ok=True)
        logging.basicConfig(
            level=logging.INFO,
            format="%(asctime)s [%(levelname)s] %(message)s",
            handlers=[
                logging.FileHandler(log_dir / "job_scraper.log"),
            ],
        )

    def run(self):
        while True:
            self._main_menu()

    def _main_menu(self):
        active = self.cfg.get("active_profile")
        banner("JobSearch Pro v2.0", "Multi-source · Resume-aware · Excel export")

        status = c("green", active) if active else c("red", "None selected")
        print(f"  Active profile: {status}")
        print()
        divider()
        options = [
            "Run Job Search",
            "Manage Search Profiles",
            "Upload & Parse Resume",
            "Configure Search Terms",
            "Configure Output & Email",
            "View Run History",
            "Settings",
        ]
        for i, opt in enumerate(options, 1):
            print(f"  {c('cyan', str(i)+'.')} {opt}")
        print(f"  {c('dim', '0.')} Exit")
        divider()
        print()

        choice = prompt("Select option", "")
        if choice == "0":
            print(c("cyan", "\n  Goodbye!\n"))
            sys.exit(0)
        elif choice == "1":
            self._run_search()
        elif choice == "2":
            self._manage_profiles()
        elif choice == "3":
            self._parse_resume()
        elif choice == "4":
            self._configure_search_terms()
        elif choice == "5":
            self._configure_output()
        elif choice == "6":
            self._view_history()
        elif choice == "7":
            self._settings()

    # ─────────────────────────────────────────────────────────────
    # 1. Run Job Search
    # ─────────────────────────────────────────────────────────────
    def _run_search(self):
        banner("Run Job Search")
        active = self.cfg.get("active_profile")
        if not active:
            print(c("red", "  No active profile. Please create or select a profile first."))
            pause()
            return

        try:
            profile = self.pm.load(active)
        except Exception as e:
            print(c("red", f"  Error loading profile: {e}"))
            pause()
            return

        queries = profile.get("queries", [])
        if not queries:
            print(c("red", "  No search queries in this profile. Add queries first."))
            pause()
            return

        print(f"  Profile:    {c('green', profile['name'])}")
        print(f"  Work Type:  {profile.get('work_type','remote').capitalize()}")
        print(f"  Sources:    {', '.join(profile.get('sources', []))}")
        print(f"  Queries:    {len(queries)}")
        print(f"  Salary Min: ${profile.get('salary_min', 0):,}")
        print()

        if not confirm("Start search now?"):
            return

        print()
        divider()
        print(c("cyan", "  Searching job boards..."))
        print()

        scraper = JobScraper(self.cfg.all() if hasattr(self.cfg, 'all') else {
            "request_delay": self.cfg.get("request_delay", 2.0),
            "max_results_per_query": self.cfg.get("max_results_per_query", 25),
        })

        total_steps = [0]

        def progress(step, total, msg):
            total_steps[0] = total
            bar_len = 30
            filled = int(bar_len * step / max(total, 1))
            bar = "█" * filled + "░" * (bar_len - filled)
            pct = int(100 * step / max(total, 1))
            print(f"\r  [{bar}] {pct:3d}%  {c('dim', msg[:40]):<45}", end="", flush=True)

        try:
            jobs = scraper.search(profile, progress_cb=progress)
        except Exception as e:
            print()
            print(c("red", f"\n  Search error: {e}"))
            pause()
            return

        print()
        print()
        print(c("green", f"  ✓ Found {len(jobs)} unique listings"))

        if not jobs:
            print(c("yellow", "  No jobs found. Check your queries or try enabling MOCK mode for testing."))
            pause()
            return

        print(c("cyan", "  Building Excel spreadsheet..."))
        builder = SpreadsheetBuilder(self.cfg.all() if hasattr(self.cfg, 'all') else {
            "output_dir": self.cfg.get("output_dir", "output"),
        })
        try:
            filepath = builder.build(jobs, profile)
            print(c("green", f"  ✓ Saved: {filepath}"))
        except Exception as e:
            print(c("red", f"  Spreadsheet error: {e}"))
            filepath = ""

        save_run_history({
            "date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "profile": profile["name"],
            "total": len(jobs),
            "filepath": filepath,
        })

        if filepath and self.cfg.get("email_enabled"):
            print(c("cyan", "  Sending email..."))
            emailer = Emailer(self.cfg.all() if hasattr(self.cfg, 'all') else {})
            ok, msg = emailer.send(filepath, profile["name"])
            print(c("green" if ok else "yellow", f"  {'✓' if ok else '!'} {msg}"))

        print()
        print(c("cyan", "  Download your spreadsheet from the Files panel → output/"))
        pause()

    # ─────────────────────────────────────────────────────────────
    # 2. Manage Profiles
    # ─────────────────────────────────────────────────────────────
    def _manage_profiles(self):
        while True:
            banner("Manage Search Profiles")
            profiles = self.pm.list_profiles()
            active = self.cfg.get("active_profile")

            if profiles:
                print(c("bold", "  Existing Profiles:"))
                for p in profiles:
                    marker = c("green", " ✓ [ACTIVE]") if p == active else ""
                    print(f"    • {p}{marker}")
                print()

            options = [
                "Create new profile",
                "Select active profile",
                "Edit profile",
                "Duplicate profile",
                "Delete profile",
            ]
            choice = choose_idx(options, "Select action")
            if choice == -1:
                return
            elif choice == 0:
                self._create_profile()
            elif choice == 1:
                self._select_active_profile()
            elif choice == 2:
                self._edit_profile()
            elif choice == 3:
                self._duplicate_profile()
            elif choice == 4:
                self._delete_profile()

    def _create_profile(self):
        banner("Create New Profile")
        name = prompt("Profile name (e.g. 'Defense Contracts')", "")
        if not name:
            return

        if self.pm.exists(name):
            print(c("red", f"  Profile '{name}' already exists."))
            pause()
            return

        salary = prompt_int("Minimum salary (0 = no filter)", 0, 0, 500000)
        work_type = choose(["remote", "hybrid", "both"], "Work type", "")
        if not work_type:
            work_type = "remote"

        sources = ["indeed", "linkedin", "ziprecruiter", "glassdoor", "adzuna"]
        print(c("bold", "\n  Select sources (enter numbers, comma-separated, or press Enter for all):"))
        for i, s in enumerate(sources, 1):
            print(f"    {c('cyan', str(i)+'.')} {s}")
        raw = prompt("Sources", "all")
        if raw.lower() != "all" and raw:
            try:
                idxs = [int(x.strip()) - 1 for x in raw.split(",")]
                sources = [sources[i] for i in idxs if 0 <= i < len(sources)]
            except ValueError:
                pass

        profile = self.pm.create(name, salary_min=salary, work_type=work_type, sources=sources)
        self.cfg.set("active_profile", name)
        print(c("green", f"\n  ✓ Profile '{name}' created and set as active."))
        pause()

    def _select_active_profile(self):
        banner("Select Active Profile")
        profiles = self.pm.list_profiles()
        if not profiles:
            print(c("red", "  No profiles found. Create one first."))
            pause()
            return
        choice = choose(profiles, "Select profile")
        if choice:
            self.cfg.set("active_profile", choice)
            print(c("green", f"\n  ✓ Active profile: {choice}"))
            pause()

    def _edit_profile(self):
        banner("Edit Profile")
        profiles = self.pm.list_profiles()
        if not profiles:
            print(c("red", "  No profiles found."))
            pause()
            return
        choice = choose(profiles, "Select profile to edit")
        if not choice:
            return

        profile = self.pm.load(choice)
        print(f"\n  Editing: {c('green', choice)}")
        print(f"  (Press Enter to keep current value)")
        print()

        name = prompt(f"Name", profile["name"]) or profile["name"]
        salary = prompt_int(f"Salary minimum", profile.get("salary_min", 0))
        work_type_opts = ["remote", "hybrid", "both"]
        print(f"\n  Current work type: {profile.get('work_type','remote')}")
        wt = choose(work_type_opts, "New work type (or 0 to keep current)", "Keep current")
        if not wt:
            wt = profile.get("work_type", "remote")

        profile["name"] = name
        profile["salary_min"] = salary
        profile["work_type"] = wt
        self.pm.save(profile)

        if self.cfg.get("active_profile") == choice and name != choice:
            self.cfg.set("active_profile", name)

        print(c("green", f"\n  ✓ Profile updated."))
        pause()

    def _duplicate_profile(self):
        banner("Duplicate Profile")
        profiles = self.pm.list_profiles()
        if not profiles:
            print(c("red", "  No profiles found."))
            pause()
            return
        choice = choose(profiles, "Select profile to duplicate")
        if not choice:
            return
        new_name = prompt(f"New profile name", f"{choice} Copy")
        if new_name and not self.pm.exists(new_name):
            self.pm.duplicate(choice, new_name)
            print(c("green", f"\n  ✓ Duplicated as '{new_name}'"))
        else:
            print(c("red", "  Name empty or already exists."))
        pause()

    def _delete_profile(self):
        banner("Delete Profile")
        profiles = self.pm.list_profiles()
        if not profiles:
            print(c("red", "  No profiles found."))
            pause()
            return
        choice = choose(profiles, "Select profile to delete")
        if not choice:
            return
        if confirm(f"Delete '{choice}'? This cannot be undone."):
            self.pm.delete(choice)
            if self.cfg.get("active_profile") == choice:
                self.cfg.set("active_profile", None)
            print(c("green", f"\n  ✓ Deleted '{choice}'"))
        pause()

    # ─────────────────────────────────────────────────────────────
    # 3. Upload & Parse Resume
    # ─────────────────────────────────────────────────────────────
    def _parse_resume(self):
        banner("Upload & Parse Resume")
        print("  Upload your .pdf or .docx resume to the Replit Files panel,")
        print("  then enter the path below.")
        print()
        print(c("dim", "  Example: /home/runner/workspace/MyResume.pdf"))
        print()

        path = prompt("Resume file path", "")
        if not path:
            return

        if not Path(path).exists():
            alt = Path("output") / Path(path).name
            if alt.exists():
                path = str(alt)
            else:
                print(c("red", f"  File not found: {path}"))
                pause()
                return

        print()
        print(c("cyan", "  Parsing resume..."))
        parser = ResumeParser()
        try:
            result = parser.parse(path)
        except Exception as e:
            print(c("red", f"  Parse error: {e}"))
            pause()
            return

        print()
        divider()
        print(c("bold", "  Extracted Skills & Signals"))
        divider()

        sections = [
            ("Job Titles", result["titles"]),
            ("Procurement / Contract Skills", result["skills"]),
            ("Tools & Systems", result["tools"]),
            ("Certifications", result["certifications"]),
            ("Industries", result["industries"]),
        ]
        for label, items in sections:
            if items:
                print(f"  {c('cyan', label + ':')} {', '.join(items[:8])}")

        print()
        print(c("bold", "  Suggested Search Queries:"))
        queries = result["suggested_queries"]
        for i, q in enumerate(queries, 1):
            print(f"    {c('dim', str(i)+'.')} {q}")

        print()
        divider()
        print("  Options:")
        print(f"  {c('cyan', '1.')} Add queries to active profile")
        print(f"  {c('cyan', '2.')} Create new profile with these queries")
        print(f"  {c('cyan', '3.')} Review/edit queries before saving")
        print(f"  {c('dim', '0.')} Back (don't save)")
        print()

        choice = prompt("Select option", "")
        if choice == "0" or not choice:
            return
        elif choice == "3":
            queries = self._edit_query_list(queries)
            if not queries:
                return
            choice = prompt("Now save to: [1] active profile  [2] new profile", "1")

        if choice in ("1", "3"):
            active = self.cfg.get("active_profile")
            if not active:
                print(c("red", "  No active profile. Creating one..."))
                self._create_profile()
                active = self.cfg.get("active_profile")
                if not active:
                    return

            try:
                profile = self.pm.load(active)
            except Exception:
                profile = self.pm.create(active)

            existing = {(q["query"] if isinstance(q, dict) else q) for q in profile.get("queries", [])}
            added = 0
            for q in queries:
                if q not in existing:
                    profile.setdefault("queries", []).append({"query": q, "category": "resume"})
                    existing.add(q)
                    added += 1
            self.pm.save(profile)
            print(c("green", f"\n  ✓ Added {added} queries to profile '{active}'"))

        elif choice == "2":
            name = prompt("New profile name", "My Resume Profile")
            if name:
                q_list = [{"query": q, "category": "resume"} for q in queries]
                self.pm.create(name, queries=q_list)
                self.cfg.set("active_profile", name)
                print(c("green", f"\n  ✓ Created profile '{name}' with {len(queries)} queries"))

        pause()

    def _edit_query_list(self, queries: list[str]) -> list[str]:
        banner("Edit Suggested Queries")
        while True:
            print(c("bold", "  Current queries:"))
            for i, q in enumerate(queries, 1):
                print(f"    {c('cyan', str(i)+'.')} {q}")
            print()
            print(f"  {c('cyan', 'a.')} Add query")
            print(f"  {c('cyan', 'r.')} Remove query")
            print(f"  {c('cyan', 'e.')} Edit query")
            print(f"  {c('cyan', 'd.')} Done")
            print()

            ch = prompt("Action", "d").lower()
            if ch == "d":
                return queries
            elif ch == "a":
                q = prompt("New query", "")
                if q:
                    queries.append(q)
            elif ch == "r":
                idx = prompt_int("Remove query #", 1, 1, len(queries)) - 1
                removed = queries.pop(idx)
                print(c("dim", f"    Removed: {removed}"))
            elif ch == "e":
                idx = prompt_int("Edit query #", 1, 1, len(queries)) - 1
                new_q = prompt("New text", queries[idx])
                if new_q:
                    queries[idx] = new_q
        return queries

    # ─────────────────────────────────────────────────────────────
    # 4. Configure Search Terms
    # ─────────────────────────────────────────────────────────────
    def _configure_search_terms(self):
        while True:
            banner("Configure Search Terms")
            active = self.cfg.get("active_profile")
            if not active:
                print(c("red", "  No active profile. Select or create a profile first."))
                pause()
                return

            try:
                profile = self.pm.load(active)
            except Exception:
                print(c("red", "  Could not load active profile."))
                pause()
                return

            queries = profile.get("queries", [])
            print(f"  Profile: {c('green', active)}")
            print(f"  Queries: {len(queries)}")
            print()

            if queries:
                print(c("bold", "  Current search queries:"))
                for i, q in enumerate(queries, 1):
                    text = q["query"] if isinstance(q, dict) else q
                    cat = q.get("category", "") if isinstance(q, dict) else ""
                    cat_str = c("dim", f" [{cat}]") if cat else ""
                    print(f"    {c('dim', str(i)+'.')} {text}{cat_str}")
                print()

            options = [
                "Add query",
                "Edit query",
                "Remove query",
                "Add from preset library",
                "Import from resume",
                "Clear all queries",
            ]
            choice = choose_idx(options, "Select action")
            if choice == -1:
                return
            elif choice == 0:
                q = prompt("New search query", "")
                if q:
                    profile.setdefault("queries", []).append({"query": q, "category": "custom"})
                    self.pm.save(profile)
                    print(c("green", f"  ✓ Added: {q}"))
                    pause()
            elif choice == 1:
                if not queries:
                    print(c("red", "  No queries to edit.")); pause(); continue
                idx = prompt_int("Edit query #", 1, 1, len(queries)) - 1
                current = queries[idx]["query"] if isinstance(queries[idx], dict) else queries[idx]
                new_q = prompt("New text", current)
                if new_q:
                    if isinstance(queries[idx], dict):
                        queries[idx]["query"] = new_q
                    else:
                        queries[idx] = new_q
                    self.pm.save(profile)
                    print(c("green", "  ✓ Updated"))
                pause()
            elif choice == 2:
                if not queries:
                    print(c("red", "  No queries to remove.")); pause(); continue
                idx = prompt_int("Remove query #", 1, 1, len(queries)) - 1
                removed = queries.pop(idx)
                text = removed["query"] if isinstance(removed, dict) else removed
                self.pm.save(profile)
                print(c("green", f"  ✓ Removed: {text}"))
                pause()
            elif choice == 3:
                self._add_presets(profile)
            elif choice == 4:
                self._parse_resume()
            elif choice == 5:
                if confirm("Clear ALL queries from this profile?"):
                    profile["queries"] = []
                    self.pm.save(profile)
                    print(c("green", "  ✓ All queries cleared"))
                pause()

    def _add_presets(self, profile):
        banner("Preset Query Library")
        categories = list(PRESETS.keys())
        choice = choose(categories, "Select category")
        if not choice:
            return
        presets = PRESETS[choice]
        print()
        print(c("bold", f"  Presets for '{choice}':"))
        for i, q in enumerate(presets, 1):
            print(f"    {c('cyan', str(i)+'.')} {q}")
        print(f"  {c('cyan', 'a.')} Add all")
        print(f"  {c('dim', '0.')} Back")
        print()

        raw = prompt("Add which? (numbers, comma-separated, or 'a' for all)", "a")
        existing = {(q["query"] if isinstance(q, dict) else q) for q in profile.get("queries", [])}
        added = 0

        if raw.lower() == "a":
            to_add = presets
        else:
            try:
                idxs = [int(x.strip()) - 1 for x in raw.split(",")]
                to_add = [presets[i] for i in idxs if 0 <= i < len(presets)]
            except ValueError:
                to_add = []

        for q in to_add:
            if q not in existing:
                profile.setdefault("queries", []).append({"query": q, "category": choice.lower()})
                existing.add(q)
                added += 1

        self.pm.save(profile)
        print(c("green", f"\n  ✓ Added {added} preset queries"))
        pause()

    # ─────────────────────────────────────────────────────────────
    # 5. Configure Output & Email
    # ─────────────────────────────────────────────────────────────
    def _configure_output(self):
        while True:
            banner("Configure Output & Email")
            options = [
                "Set output directory",
                "Configure email (SMTP)",
                "Test email",
                "Toggle email enabled",
            ]
            choice = choose_idx(options, "Select option")
            if choice == -1:
                return
            elif choice == 0:
                d = prompt("Output directory", self.cfg.get("output_dir", "output"))
                if d:
                    Path(d).mkdir(parents=True, exist_ok=True)
                    self.cfg.set("output_dir", d)
                    print(c("green", f"  ✓ Output directory: {d}"))
                pause()
            elif choice == 1:
                self._configure_email()
            elif choice == 2:
                emailer = Emailer(self.cfg.all() if hasattr(self.cfg, 'all') else {})
                ok, msg = emailer.test()
                print(c("green" if ok else "red", f"  {msg}"))
                pause()
            elif choice == 3:
                current = self.cfg.get("email_enabled", False)
                self.cfg.set("email_enabled", not current)
                state = "enabled" if not current else "disabled"
                print(c("green", f"  ✓ Email {state}"))
                pause()

    def _configure_email(self):
        banner("Configure Email / SMTP")
        print(c("dim", "  For Gmail, use an App Password (not your regular password)."))
        print(c("dim", "  Get one at: myaccount.google.com/security → App Passwords"))
        print()

        fields = [
            ("email_from", "From address", ""),
            ("email_to", "To address (recipient)", ""),
            ("smtp_host", "SMTP host", "smtp.gmail.com"),
            ("smtp_port", "SMTP port", "587"),
            ("smtp_user", "SMTP username", ""),
            ("smtp_password", "SMTP password / App Password", ""),
        ]
        for key, label, default in fields:
            current = self.cfg.get(key, default)
            val = prompt(label, current)
            if val:
                self.cfg.set(key, val)

        self.cfg.set("email_enabled", True)
        print(c("green", "\n  ✓ Email configured and enabled"))
        pause()

    # ─────────────────────────────────────────────────────────────
    # 6. View Run History
    # ─────────────────────────────────────────────────────────────
    def _view_history(self):
        banner("Run History")
        history = load_run_history()
        if not history:
            print(c("dim", "  No runs recorded yet."))
            pause()
            return

        print(f"  {'Date':<20} {'Profile':<22} {'Jobs':>6}  {'File'}")
        divider()
        for entry in history:
            date = entry.get("date", "")[:16]
            prof = entry.get("profile", "")[:20]
            total = entry.get("total", 0)
            fp = entry.get("filepath", "")
            fname = Path(fp).name if fp else "—"
            print(f"  {c('dim', date):<28} {c('cyan', prof):<30} {c('green', str(total)):>6}  {c('dim', fname)}")

        pause()

    # ─────────────────────────────────────────────────────────────
    # 7. Settings
    # ─────────────────────────────────────────────────────────────
    def _settings(self):
        while True:
            banner("Settings")
            max_res = self.cfg.get("max_results_per_query", 25)
            delay = self.cfg.get("request_delay", 2.0)
            print(f"  Max results per query:  {c('cyan', str(max_res))}")
            print(f"  Request delay (seconds): {c('cyan', str(delay))}")
            print()

            options = [
                "Set max results per query",
                "Set request delay",
                "Reset to defaults",
                "Enable MOCK mode (test without scraping)",
                "Disable MOCK mode",
            ]
            choice = choose_idx(options, "Select option")
            if choice == -1:
                return
            elif choice == 0:
                val = prompt_int("Max results per query", max_res, 1, 200)
                self.cfg.set("max_results_per_query", val)
                print(c("green", f"  ✓ Set to {val}"))
                pause()
            elif choice == 1:
                raw = prompt("Delay in seconds", str(delay))
                try:
                    self.cfg.set("request_delay", float(raw))
                    print(c("green", f"  ✓ Delay set to {raw}s"))
                except ValueError:
                    print(c("red", "  Invalid value"))
                pause()
            elif choice == 2:
                if confirm("Reset all settings to defaults?"):
                    self.cfg.set("max_results_per_query", 25)
                    self.cfg.set("request_delay", 2.0)
                    print(c("green", "  ✓ Defaults restored"))
                pause()
            elif choice == 3:
                os.environ["JOBSEARCH_MOCK"] = "1"
                print(c("green", "  ✓ MOCK mode enabled (fake jobs returned for testing)"))
                pause()
            elif choice == 4:
                os.environ.pop("JOBSEARCH_MOCK", None)
                os.environ.pop("MOCK", None)
                print(c("green", "  ✓ MOCK mode disabled"))
                pause()
