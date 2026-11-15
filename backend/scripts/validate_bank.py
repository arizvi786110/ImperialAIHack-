"""Validate a hand-written question bank BEFORE loading it into the backend.

Usage (from repo root):
    backend\\.venv\\Scripts\\python backend\\scripts\\validate_bank.py                 # backend/app/data/bank.json
    backend\\.venv\\Scripts\\python backend\\scripts\\validate_bank.py path\\to\\bank.json

Checks:
1. Structure: the same rules the server applies at startup (app/data/bank.py).
2. Correctness: runs each question's reference_solution against ALL its example and
   hidden tests and compares to `expected`.

OFFLINE DEV TOOL ONLY. It executes the question AUTHOR's reference solutions (trusted
team code) in a separate isolated Python process with a timeout. The server never
executes any code from questions or students.
"""

import json
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
sys.path[:0] = [str(BACKEND), str(BACKEND.parent)]

from app.data.bank import check_bank, function_name, load_bank  # noqa: E402

HARNESS = r"""
import json, sys
job = json.load(sys.stdin)
ns = {}
try:
    exec(job["solution"], ns)
    fn = ns[job["fn"]]
except Exception as e:
    print(json.dumps({"fatal": f"{type(e).__name__}: {e}"})); sys.exit()
out = []
for t in job["tests"]:
    try:
        out.append({"ok": True, "actual": fn(*t["input"])})
    except Exception as e:
        out.append({"ok": False, "error": f"{type(e).__name__}: {e}"})
print(json.dumps(out, default=repr))
"""


def run_reference(q) -> list[str]:
    fn = function_name(q.function_signature)
    tests = [t.model_dump() for t in [*q.example_tests, *q.hidden_tests]]
    labels = [f"example_tests[{i}]" for i in range(len(q.example_tests))] + \
             [f"hidden_tests[{i}]" for i in range(len(q.hidden_tests))]
    try:
        proc = subprocess.run([sys.executable, "-I", "-c", HARNESS],
                              input=json.dumps({"solution": q.reference_solution, "fn": fn, "tests": tests}),
                              capture_output=True, text=True, timeout=10)
    except subprocess.TimeoutExpired:
        return [f"[{q.id}] reference_solution timed out (>10s)"]
    try:
        result = json.loads(proc.stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        return [f"[{q.id}] reference_solution crashed: {proc.stderr.strip()[-300:]}"]
    if isinstance(result, dict):
        return [f"[{q.id}] reference_solution failed to load: {result['fatal']}"]
    problems = []
    for label, t, r in zip(labels, tests, result):
        if not r["ok"]:
            problems.append(f"[{q.id}] {label} input={t['input']!r}: reference raised {r['error']}")
        elif r["actual"] != t["expected"]:
            problems.append(f"[{q.id}] {label} input={t['input']!r}: expected {t['expected']!r}, reference returned {r['actual']!r}")
    return problems


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else BACKEND / "app" / "data" / "bank.json"
    if not path.exists():
        print(f"No bank file at {path}")
        return 2
    try:
        start, questions = load_bank(path)
    except Exception as e:  # bad JSON or fields that don't match PrivateQuestion
        print(f"INVALID: could not parse {path}:\n{e}")
        return 1

    errors, warnings = check_bank(start, questions)
    for q in questions:
        if function_name(q.function_signature):
            errors += run_reference(q)

    print(f"{path.name}: {len(questions)} questions, start = {start}")
    for w in warnings:
        print(f"  warning  {w}")
    for e in errors:
        print(f"  ERROR    {e}")
    print("VALID" if not errors else f"INVALID: {len(errors)} error(s)")
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
