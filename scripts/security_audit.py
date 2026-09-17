import os
import re
import subprocess

def run_security_audit():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    res = subprocess.run(["git", "ls-files"], capture_output=True, text=True, cwd=repo_root)
    tracked_files = [f.strip() for f in res.stdout.splitlines() if f.strip()]

    secret_patterns = [
        re.compile(r"hf_[a-zA-Z0-9]{20,}"),
        re.compile(r"lsv2_[a-zA-Z0-9_]{20,}"),
        re.compile(r"sk-[a-zA-Z0-9]{20,}"),
        re.compile(r"sbp_[a-zA-Z0-9_]{20,}"),
    ]

    findings = []
    for f in tracked_files:
        path = os.path.join(repo_root, f)
        if os.path.isfile(path):
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as fl:
                    for idx, line in enumerate(fl, 1):
                        for pat in secret_patterns:
                            if pat.search(line):
                                if (
                                    "re.sub" in line
                                    or "_scrub_secrets" in line
                                    or "dummy" in line
                                    or "mock" in line
                                    or "test_key" in line
                                    or "test_" in line
                                    or "example" in line
                                    or "abcdefghijklmnopqrstuvwxyz" in line
                                    or "your_" in line
                                    or "replace_with" in line
                                    or "pattern" in line
                                ):
                                    continue
                                findings.append((f, idx))
            except Exception:
                pass

    print(f"Tracked files checked: {len(tracked_files)}")
    print(f"Active real hardcoded secrets found: {len(findings)}")
    for f, idx in findings:
        print(f"  Warning: potential credential pattern in {f}:{idx}")

    return len(findings)

if __name__ == "__main__":
    exit(run_security_audit())
