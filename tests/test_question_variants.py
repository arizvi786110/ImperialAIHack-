
from cognit_ai.question_variants import (
    TEMPLATES,
    make_variant,
    validate_variant,
    safe_variant,
)
from cognit_ai.adapt import LearnerState, Evidence, select_next


passed = 0
failed = 0


def check(name, condition):
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS: {name}")
    else:
        failed += 1
        print(f"FAIL: {name}")


# TEST 1: All approved templates generate questions
variants = {}

for template_id in TEMPLATES:
    variants[template_id] = make_variant(template_id, seed=42)

check(
    "All approved templates generate questions",
    all(
        validate_variant(make_variant(template_id, 42))[0]
        for template_id in TEMPLATES
    )
)


# TEST 2: Same seed generates identical questions
q1 = make_variant("count_target", 42)
q2 = make_variant("count_target", 42)

check(
    "Same template and seed produce identical variants",
    q1.model_dump() == q2.model_dump()
)


# TEST 3: Different seeds produce different IDs
q3 = make_variant("count_target", 43)

check(
    "Different seeds generate different question IDs",
    q1.id != q3.id
)


# TEST 4: Every generated question passes validation
check(
    "All generated questions pass validation",
    all(validate_variant(q)[0] for q in variants.values())
)


# TEST 5: Every question has example and hidden tests
check(
    "Every question has example and hidden tests",
    all(
        len(q.example_tests) >= 1 and len(q.hidden_tests) >= 1
        for q in variants.values()
    )
)


# TEST 6: Generated questions contain reference solutions
check(
    "Private questions contain reference solutions",
    all(bool(q.reference_solution) for q in variants.values())
)


# TEST 7: Duplicate IDs are rejected
valid, issues = validate_variant(q1, existing_ids={q1.id})

check(
    "Duplicate IDs are rejected",
    not valid and "duplicate_id" in issues
)


# TEST 8: Unvetted variants are rejected
unvetted = q1.model_copy(update={"review_status": "draft"})
valid, issues = validate_variant(unvetted)

check(
    "Unvetted variants are rejected",
    not valid and "unapproved" in issues
)


# TEST 9: Invalid template IDs are rejected
try:
    make_variant("unapproved_question", 42)
    rejected = False
except ValueError:
    rejected = True

check("Invalid templates are rejected", rejected)


# TEST 10: Negative seeds are rejected
try:
    make_variant("count_target", -1)
    rejected = False
except ValueError:
    rejected = True

check("Negative seeds are rejected", rejected)


# TEST 11: safe_variant avoids an existing ID
replacement = safe_variant(
    "count_target",
    seed=42,
    existing_ids={q1.id},
)

check(
    "safe_variant avoids existing question IDs",
    replacement.id != q1.id
)


# TEST 12: Difficulty levels match templates
check(
    "Templates use expected difficulty levels",
    variants["count_target"].difficulty == 1
    and variants["unique_count"].difficulty == 2
    and variants["first_repeat"].difficulty == 3
)


# TEST 13: Generated variants can be selected
state = LearnerState()

next_question = select_next(
    state,
    list(variants.values()),
    reason="same",
)

check(
    "Adaptive engine can select a generated question",
    next_question is not None
)


# TEST 14: Previously seen questions are excluded
state.seen_question_ids.add(next_question.id)

another_question = select_next(
    state,
    list(variants.values()),
    reason="same",
)

check(
    "Adaptive engine avoids previously seen variants",
    another_question is not None
    and another_question.id != next_question.id
)


# TEST 15: Generated questions have expected test counts
check(
    "Generated questions contain four test cases",
    all(
        len(q.example_tests) + len(q.hidden_tests) == 4
        for q in variants.values()
    )
)


print("\n" + "=" * 45)
print(f"RESULT: {passed} passed, {failed} failed")
print("=" * 45)

if failed:
    raise SystemExit(1)
