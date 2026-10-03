#!/usr/bin/env python3
"""
Enterprise File Watcher & Auto-Rebuilder for หมูกรอบ มี จำกัด (Crispy Pork System)
Detects code changes in backend/ and frontend/ and automatically rebuilds & restarts
the corresponding Docker container without hardcoding or third-party dependencies.
"""

import os
import sys
import time
import argparse
import subprocess
from pathlib import Path

# Configurable defaults via environment variables (Zero Hardcoding)
DEFAULT_DEBOUNCE = float(os.environ.get("WATCH_DEBOUNCE_SECONDS", "1.5"))
DEFAULT_POLL_INTERVAL = float(os.environ.get("WATCH_POLL_INTERVAL_SECONDS", "0.8"))

BACKEND_EXTENSIONS = {".go", ".sql", ".mod", ".sum", "Dockerfile", ".sh"}
FRONTEND_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".html",
    ".css",
    ".svg",
    ".template",
    "Dockerfile",
}

BACKEND_IGNORES = {".git", "bin", "tmp", ".vscode", "coverage", ".DS_Store"}
FRONTEND_IGNORES = {
    ".git",
    "node_modules",
    "dist",
    ".vscode",
    "coverage",
    ".DS_Store",
    ".vite",
}


def get_files_snapshot(directory: Path, allowed_exts: set, ignore_dirs: set):
    """Recursively collects file modification times and sizes."""
    snapshot = {}
    if not directory.exists():
        return snapshot

    for root, dirs, files in os.walk(directory):
        # Prune ignored directories in-place for performance
        dirs[:] = [d for d in dirs if d not in ignore_dirs and not d.startswith(".")]

        for file in files:
            if file in ignore_dirs or file.startswith(".DS_Store"):
                continue

            path = Path(root) / file
            # Match extension or exact filename (e.g. Dockerfile)
            ext = path.suffix
            if ext in allowed_exts or file in allowed_exts:
                try:
                    stat = path.stat()
                    snapshot[str(path)] = (stat.st_mtime, stat.st_size)
                except (OSError, FileNotFoundError):
                    continue
    return snapshot


def diff_snapshots(old_snap, new_snap):
    """Returns list of added, modified, or removed file paths."""
    changed = []
    # Check for additions and modifications
    for path, (mtime, size) in new_snap.items():
        if path not in old_snap:
            changed.append(f"added: {path}")
        elif old_snap[path] != (mtime, size):
            changed.append(f"modified: {path}")

    # Check for deletions
    for path in old_snap:
        if path not in new_snap:
            changed.append(f"deleted: {path}")

    return changed


def execute_rebuild(script_path: str, command: str, component_name: str):
    """Executes rebuild command via the docker-run orchestrator."""
    print(f"\n\033[1;33m[WATCH] 🔨 Triggering auto-rebuild for {component_name}...\033[0m")
    start_time = time.time()
    try:
        proc = subprocess.run(
            [script_path, command],
            check=True,
            text=True,
        )
        elapsed = time.time() - start_time
        print(
            f"\033[1;32m[WATCH] ✅ {component_name} successfully rebuilt and healthy in {elapsed:.1f}s!\033[0m\n"
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"\033[1;31m[WATCH] ❌ Rebuild failed with exit code {e.returncode}\033[0m\n")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Auto-detect source changes and rebuild Docker containers."
    )
    parser.add_argument(
        "--root-dir",
        default=str(Path(__file__).resolve().parent.parent),
        help="Workspace root directory",
    )
    parser.add_argument(
        "--script",
        default=os.environ.get("DOCKER_RUN_SCRIPT", "./scripts/docker-run.sh"),
        help="Path to docker-run.sh script",
    )
    parser.add_argument(
        "--debounce",
        type=float,
        default=DEFAULT_DEBOUNCE,
        help="Debounce duration in seconds",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=DEFAULT_POLL_INTERVAL,
        help="File check polling interval in seconds",
    )
    parser.add_argument(
        "--scope",
        choices=["all", "backend", "frontend"],
        default=os.environ.get("WATCH_SCOPE", "all"),
        help="Watch scope (all, backend, or frontend)",
    )
    args = parser.parse_args()

    root = Path(args.root_dir)
    backend_dir = root / "backend"
    frontend_dir = root / "frontend"
    script_path = str(root / args.script) if not Path(args.script).is_absolute() else args.script

    print("==========================================================================")
    print("\033[1;36m[WATCH] 🚀 Moo Krob Watcher & Auto-Rebuilder Started\033[0m")
    print(f"  • Root Directory   : {root}")
    print(f"  • Watch Scope      : {args.scope}")
    print(f"  • Debounce Window  : {args.debounce}s")
    print(f"  • Polling Interval : {args.poll_interval}s")
    print("  • Monitoring:")
    if args.scope in ("all", "backend"):
        print(f"    - Backend  : {backend_dir}")
    if args.scope in ("all", "frontend"):
        print(f"    - Frontend : {frontend_dir}")
    print("  (Press Ctrl+C to stop)")
    print("==========================================================================\n")

    # Initial snapshots
    backend_snap = (
        get_files_snapshot(backend_dir, BACKEND_EXTENSIONS, BACKEND_IGNORES)
        if args.scope in ("all", "backend")
        else {}
    )
    frontend_snap = (
        get_files_snapshot(frontend_dir, FRONTEND_EXTENSIONS, FRONTEND_IGNORES)
        if args.scope in ("all", "frontend")
        else {}
    )

    last_backend_change_time = 0.0
    pending_backend_changes = []

    last_frontend_change_time = 0.0
    pending_frontend_changes = []

    try:
        while True:
            time.sleep(args.poll_interval)
            now = time.time()

            # --- Check Backend ---
            if args.scope in ("all", "backend"):
                new_b_snap = get_files_snapshot(backend_dir, BACKEND_EXTENSIONS, BACKEND_IGNORES)
                b_diff = diff_snapshots(backend_snap, new_b_snap)
                if b_diff:
                    pending_backend_changes.extend(b_diff)
                    last_backend_change_time = now
                    backend_snap = new_b_snap
                    first_item = b_diff[0]
                    more_str = f" and {len(b_diff) - 1} more" if len(b_diff) > 1 else ""
                    print(
                        f"\033[1;34m[WATCH] 📝 Detected change in Backend: {first_item}{more_str}\033[0m"
                    )

                # Debounced trigger
                if last_backend_change_time > 0 and (now - last_backend_change_time) >= args.debounce:
                    execute_rebuild(script_path, "rebuild-backend", "Backend API")
                    pending_backend_changes.clear()
                    last_backend_change_time = 0.0
                    backend_snap = get_files_snapshot(backend_dir, BACKEND_EXTENSIONS, BACKEND_IGNORES)

            # --- Check Frontend ---
            if args.scope in ("all", "frontend"):
                new_f_snap = get_files_snapshot(frontend_dir, FRONTEND_EXTENSIONS, FRONTEND_IGNORES)
                f_diff = diff_snapshots(frontend_snap, new_f_snap)
                if f_diff:
                    pending_frontend_changes.extend(f_diff)
                    last_frontend_change_time = now
                    frontend_snap = new_f_snap
                    first_item = f_diff[0]
                    more_str = f" and {len(f_diff) - 1} more" if len(f_diff) > 1 else ""
                    print(
                        f"\033[1;35m[WATCH] 🎨 Detected change in Frontend: {first_item}{more_str}\033[0m"
                    )

                # Debounced trigger
                if last_frontend_change_time > 0 and (now - last_frontend_change_time) >= args.debounce:
                    execute_rebuild(script_path, "rebuild-frontend", "Frontend Web")
                    pending_frontend_changes.clear()
                    last_frontend_change_time = 0.0
                    frontend_snap = get_files_snapshot(frontend_dir, FRONTEND_EXTENSIONS, FRONTEND_IGNORES)

    except KeyboardInterrupt:
        print("\n\033[1;33m[WATCH] Stopped by user.\033[0m")
        sys.exit(0)


if __name__ == "__main__":
    main()
