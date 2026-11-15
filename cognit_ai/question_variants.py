
"""Vetted deterministic question generation and conceptual transfer.

Only approved templates are used. Private solutions and hidden
tests must never be sent to the frontend.
"""

import hashlib
import random

from .contracts import PrivateQuestion, TestCase


TEMPLATES = {
    "count_target": {
        "title": "Count matching values",
        "skill": "loops",
        "difficulty": 1,
        "signature": "def count_target(values, target):",
        "statement": (
            "Return how many entries in values equal target. "
            "The list may be empty."
        ),
        "solution": (
            "def count_target(values, target):\n"
            "    return sum(value == target for value in values)"
        ),
        "concept": (
            "Iterate and count equality; O(n) time, "
            "O(1) extra space."
        ),
    },
    "count_above": {
        "title": "Count values above a threshold",
        "skill": "loops",
        "difficulty": 1,
        "signature": "def count_above(values, threshold):",
        "statement": (
            "Return the number of integers strictly greater "
            "than threshold. The list may be empty."
        ),
        "solution": (
            "def count_above(values, threshold):\n"
            "    return sum(value > threshold for value in values)"
        ),
        "concept": (
            "Iterate and count values satisfying a condition; "
            "O(n) time, O(1) extra space."
        ),
    },
    "unique_count": {
        "title": "Count distinct values",
        "skill": "hashing",
        "difficulty": 2,
        "signature": "def unique_count(values):",
        "statement": (
            "Return the number of distinct integers in values. "
            "The list may be empty."
        ),
        "solution": (
            "def unique_count(values):\n"
            "    return len(set(values))"
        ),
        "concept": (
            "A set tracks distinct values; "
            "expected O(n) time, O(n) space."
        ),
    },
    "unique_in_order": {
        "title": "Keep distinct values in original order",
        "skill": "hashing",
        "difficulty": 2,
        "signature": "def unique_in_order(values):",
        "statement": (
            "Return a list containing each integer once, "
            "preserving the order of first appearance."
        ),
        "solution": (
            "def unique_in_order(values):\n"
            "    seen = set()\n"
            "    result = []\n"
            "    for value in values:\n"
            "        if value not in seen:\n"
            "            seen.add(value)\n"
            "            result.append(value)\n"
            "    return result"
        ),
        "concept": (
            "Use a set to identify unseen values while "
            "preserving encounter order; expected O(n) time "
            "and O(n) extra space."
        ),
    },
    "first_repeat": {
        "title": "Find first repeated value",
        "skill": "complexity",
        "difficulty": 3,
        "signature": "def first_repeat(values):",
        "statement": (
            "Return the first value encountered for the "
            "second time while scanning left to right; "
            "return None if no repeat."
        ),
        "solution": (
            "def first_repeat(values):\n"
            "    seen = set()\n"
            "    for value in values:\n"
            "        if value in seen:\n"
            "            return value\n"
            "        seen.add(value)\n"
            "    return None"
        ),
        "concept": (
            "Track previously seen elements; "
            "expected O(n) time, O(n) space."
        ),
    },
    "first_unique": {
        "title": "Find first non-repeating value",
        "skill": "complexity",
        "difficulty": 3,
        "signature": "def first_unique(values):",
        "statement": (
            "Return the first integer in the list that occurs "
            "exactly once. Return None if none exists."
        ),
        "solution": (
            "def first_unique(values):\n"
            "    counts = {}\n"
            "    for value in values:\n"
            "        counts[value] = counts.get(value, 0) + 1\n"
            "    for value in values:\n"
            "        if counts[value] == 1:\n"
            "            return value\n"
            "    return None"
        ),
        "concept": (
            "Track occurrence frequencies and scan in input "
            "order; expected O(n) time and O(n) space."
        ),
    },
}


# Approved pairs test related concepts using different tasks.
TRANSFER_PAIRS = {
    "count_target": "count_above",
    "count_above": "count_target",
    "unique_count": "unique_in_order",
    "unique_in_order": "unique_count",
    "first_repeat": "first_unique",
    "first_unique": "first_repeat",
}


def _expected_result(template_id, arr, rng):
    """Build a test input and its independently computed result."""

    if template_id == "count_target":
        target = rng.randint(-5, 5)
        return [arr, target], sum(x == target for x in arr)

    if template_id == "count_above":
        threshold = rng.randint(-5, 5)
        return [arr, threshold], sum(x > threshold for x in arr)

    if template_id == "unique_count":
        return [arr], len(set(arr))

    if template_id == "unique_in_order":
        return [arr], list(dict.fromkeys(arr))

    if template_id == "first_repeat":
        seen = set()
        for value in arr:
            if value in seen:
                return [arr], value
            seen.add(value)
        return [arr], None

    if template_id == "first_unique":
        counts = {}
        for value in arr:
            counts[value] = counts.get(value, 0) + 1

        for value in arr:
            if counts[value] == 1:
                return [arr], value

        return [arr], None

    raise ValueError("Unsupported template")


def make_variant(
    template_id: str,
    seed: int,
    *,
    transfer_id: str | None = None,
) -> PrivateQuestion:
    """Generate one reproducible approved question."""

    if (
        template_id not in TEMPLATES
        or type(seed) is not int
        or seed < 0
    ):
        raise ValueError("Unapproved template or seed")

    if transfer_id is not None and (
        not isinstance(transfer_id, str) or not transfer_id
    ):
        raise ValueError("Invalid transfer ID")

    template = TEMPLATES[template_id]
    rng = random.Random(seed)

    # Four deterministic tests: two public and two private.
    samples = [
        [rng.randint(-5, 5) for _ in range(n)]
        for n in (0, 5, 12, 20)
    ]

    tests = []

    for arr in samples:
        test_input, expected = _expected_result(
            template_id, arr, rng
        )
        tests.append(
            TestCase(input=test_input, expected=expected)
        )

    digest = hashlib.sha256(
        f"{template_id}:{seed}".encode()
    ).hexdigest()[:12]

    return PrivateQuestion(
        id=f"{template_id}-{digest}",
        seed=seed,
        skill_tags=[template["skill"]],
        difficulty=template["difficulty"],
        title=template["title"],
        statement=template["statement"],
        function_signature=template["signature"],
        example_tests=tests[:2],
        hidden_tests=tests[2:],
        reference_solution=template["solution"],
        rubric={
            "core_idea": template["concept"],
            "complexity": "Explain time and space costs",
            "edge_cases": (
                "Discuss empty inputs, duplicates "
                "and negative values"
            ),
        },
        concept_key=template["concept"],
        transfer_id=transfer_id,
        review_status="vetted",
    )


def validate_variant(
    q: PrivateQuestion,
    existing_ids: set[str] | None = None,
) -> tuple[bool, list[str]]:
    """Validate a generated question before it is served."""

    issues = []

    if q.id in (existing_ids or set()):
        issues.append("duplicate_id")

    if q.review_status != "vetted":
        issues.append("unapproved")

    if not q.example_tests or not q.hidden_tests:
        issues.append("missing_tests")

    all_tests = q.example_tests + q.hidden_tests

    if len({
        repr(t.input) for t in all_tests
    }) != len(all_tests):
        issues.append("duplicate_test_input")

    if q.max_points != 100:
        issues.append("invalid_points")

    if not q.reference_solution or not q.concept_key:
        issues.append("missing_reference")

    if q.transfer_id == q.id:
        issues.append("self_transfer")

    return not issues, issues


def safe_variant(
    template_id: str,
    seed: int,
    existing_ids: set[str] | None = None,
    *,
    transfer_id: str | None = None,
) -> PrivateQuestion:
    """Find an unseen, validated variant within eight seeds."""

    for offset in range(8):
        q = make_variant(
            template_id,
            seed + offset,
            transfer_id=transfer_id,
        )

        valid, _ = validate_variant(q, existing_ids)

        if valid:
            return q

    raise ValueError(
        "No valid vetted variant available; "
        "use approved bank fallback"
    )


def make_transfer_variant(
    source: PrivateQuestion,
    seed: int,
    existing_ids: set[str] | None = None,
) -> PrivateQuestion:
    """Generate a different approved task for the same skill."""

    if source.review_status != "vetted":
        raise ValueError("Source question is not vetted")

    source_template = next(
        (
            template_id
            for template_id, template in TEMPLATES.items()
            if (
                source.function_signature
                == template["signature"]
                and template["skill"] in source.skill_tags
                and source.concept_key == template["concept"]
                and source.statement == template["statement"]
            )
        ),
        None,
    )

    if source_template is None:
        raise ValueError(
            "Source does not match an approved template"
        )

    partner_id = TRANSFER_PAIRS.get(source_template)

    if partner_id is None:
        raise ValueError("No approved transfer partner")

    used_ids = set(existing_ids or set())
    used_ids.add(source.id)

    transfer = safe_variant(
        partner_id,
        seed,
        used_ids,
        transfer_id=source.id,
    )

    if not set(source.skill_tags).intersection(
        transfer.skill_tags
    ):
        raise ValueError("Transfer skill mismatch")

    if (
        transfer.function_signature
        == source.function_signature
    ):
        raise ValueError("Transfer must use a different task")

    if transfer.statement == source.statement:
        raise ValueError(
            "Transfer statement must differ"
        )

    return transfer
