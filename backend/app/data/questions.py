"""Question bank seeded into the `problems` table at startup.

- Placeholder hand-written question (replace with Ahmed's vetted H1 bank).
- Shreyaa's vetted parametrised variants (cognit_ai.question_variants), one per level.

Test `input` is a list of positional args: first_unique("aab") -> input=["aab"].
"""

from cognit_ai.question_variants import safe_variant
from contracts.models import PrivateQuestion, TestCase

PLACEHOLDER = PrivateQuestion(
    id="q_first_unique_char",
    seed=0,
    skill_tags=["hashing"],
    difficulty=1,
    title="First unique character",
    statement=(
        "Return the index of the first character in `s` that appears exactly once. "
        "Return -1 if there is none."
    ),
    function_signature="def first_unique(s: str) -> int:",
    example_tests=[
        TestCase(input=["leetcode"], expected=0),
        TestCase(input=["aabb"], expected=-1),
    ],
    hint_policy="Conceptual help only; no solution code.",
    max_points=100,
    reference_solution=(
        "from collections import Counter\n"
        "def first_unique(s):\n"
        "    c = Counter(s)\n"
        "    for i, ch in enumerate(s):\n"
        "        if c[ch] == 1:\n"
        "            return i\n"
        "    return -1\n"
    ),
    rubric={
        "core_idea": "Count character frequencies, then scan in order for the first count of 1.",
        "complexity": "O(n) time, O(k) extra space vs O(n^2) nested scan.",
        "edge_cases": "Empty string, all characters repeated, single character.",
    },
    hidden_tests=[
        TestCase(input=[""], expected=-1),
        TestCase(input=["z"], expected=0),
        TestCase(input=["aabbc"], expected=4),
    ],
    concept_key="frequency_count_then_scan",
    transfer_id=None,
    review_status="vetted",
)

_VARIANTS = [safe_variant(t, seed=42) for t in ("count_target", "unique_count", "first_repeat")]

QUESTIONS: dict[str, PrivateQuestion] = {q.id: q for q in [PLACEHOLDER, *_VARIANTS]}

STARTING_QUESTION_ID = PLACEHOLDER.id
