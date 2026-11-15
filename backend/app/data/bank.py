"""Load and structurally check a hand-written question bank (bank.json).

Format (see bank.example.json):
    {"start": "<question id to start on>", "questions": [<PrivateQuestion>, ...]}

Rules:
- Test `input` is a LIST OF POSITIONAL ARGS: f(values, target) -> [[1, 2], 2].
- A transfer question sets `transfer_id` to the id of the question it transfers FROM,
  and shares at least one skill tag with it (that's what adapt.select_next looks for).
- Only `review_status: "vetted"` questions are ever served.

No code is executed here. To also run each reference solution against its tests,
use scripts/validate_bank.py (offline dev tool).
"""

import json
import re
from pathlib import Path

from contracts.models import PrivateQuestion

KNOWN_SKILLS = {"loops", "hashing", "complexity"}
RUBRIC_KEYS = {"core_idea", "complexity", "edge_cases"}


def function_name(signature: str) -> str | None:
    m = re.match(r"\s*def\s+([A-Za-z_]\w*)\s*\(", signature)
    return m.group(1) if m else None


def load_bank(path: Path) -> tuple[str, list[PrivateQuestion]]:
    raw = json.loads(path.read_text(encoding="utf-8"))
    questions = [PrivateQuestion.model_validate(q) for q in raw["questions"]]
    return raw.get("start", questions[0].id if questions else ""), questions


def check_bank(start: str, questions: list[PrivateQuestion]) -> tuple[list[str], list[str]]:
    """Returns (errors, warnings). Errors make the bank unusable."""
    errors: list[str] = []
    warnings: list[str] = []
    by_id: dict[str, PrivateQuestion] = {}

    for q in questions:
        where = f"[{q.id}]"
        if q.id in by_id:
            errors.append(f"{where} duplicate id")
        by_id[q.id] = q

        fn = function_name(q.function_signature)
        if fn is None:
            errors.append(f"{where} function_signature must look like 'def name(args):'")
        elif not re.search(rf"\bdef\s+{re.escape(fn)}\s*\(", q.reference_solution):
            errors.append(f"{where} reference_solution doesn't define {fn}()")

        for kind, tests in (("example_tests", q.example_tests), ("hidden_tests", q.hidden_tests)):
            if not tests:
                errors.append(f"{where} {kind} is empty")
            for i, t in enumerate(tests):
                if not isinstance(t.input, list):
                    errors.append(f"{where} {kind}[{i}].input must be a list of positional args, got {type(t.input).__name__}")
        if len(q.example_tests) + len(q.hidden_tests) < 6:
            warnings.append(f"{where} plan asks for 3 normal + 3 edge tests; has {len(q.example_tests) + len(q.hidden_tests)}")

        if q.review_status != "vetted":
            warnings.append(f"{where} review_status is '{q.review_status}': it will never be served")
        if not q.skill_tags:
            errors.append(f"{where} skill_tags is empty")
        elif not set(q.skill_tags) & KNOWN_SKILLS:
            warnings.append(f"{where} skill_tags {q.skill_tags} don't include any of {sorted(KNOWN_SKILLS)}")
        if not q.concept_key:
            errors.append(f"{where} concept_key is empty")
        if not isinstance(q.rubric, dict) or not RUBRIC_KEYS <= set(q.rubric):
            warnings.append(f"{where} rubric should have keys {sorted(RUBRIC_KEYS)} (grader scores those)")
        if q.max_points != 100:
            errors.append(f"{where} max_points must be 100")

    for q in questions:
        if q.transfer_id is None:
            continue
        src = by_id.get(q.transfer_id)
        if q.transfer_id == q.id:
            errors.append(f"[{q.id}] transfer_id points to itself")
        elif src is None:
            errors.append(f"[{q.id}] transfer_id '{q.transfer_id}' is not in the bank")
        elif not set(q.skill_tags) & set(src.skill_tags):
            errors.append(f"[{q.id}] shares no skill tag with its transfer source '{src.id}'")
        elif q.function_signature == src.function_signature:
            warnings.append(f"[{q.id}] same function as its transfer source: should be a different task")

    sources_with_transfer = {q.transfer_id for q in questions if q.transfer_id}
    for q in questions:
        if q.transfer_id is None and q.id not in sources_with_transfer:
            warnings.append(f"[{q.id}] has no paired transfer question (backend will generate a template one)")

    if start not in by_id:
        errors.append(f"start '{start}' is not a question id in the bank")
    elif by_id[start].difficulty != 1:
        warnings.append(f"start question '{start}' is difficulty {by_id[start].difficulty}, expected 1")

    return errors, warnings
