
"""Tests for COGNIT's conceptual transfer questions."""

from cognit_ai.question_variants import (
    TEMPLATES,
    TRANSFER_PAIRS,
    make_variant,
    make_transfer_variant,
    validate_variant,
)
from cognit_ai.adapt import (
    LearnerState,
    Evidence,
    select_next,
)


passed = 0


def check(name, condition):
    global passed
    assert condition, name
    passed += 1
    print(f"PASS: {name}")


for template_id, partner_id in TRANSFER_PAIRS.items():
    original = make_variant(template_id, 42)

    transfer = make_transfer_variant(
        original,
        99,
        existing_ids={original.id},
    )

    check(
        f"{template_id}: correct partner",
        transfer.function_signature
        == TEMPLATES[partner_id]["signature"],
    )

    check(
        f"{template_id}: different problem",
        original.statement != transfer.statement,
    )

    check(
        f"{template_id}: different function",
        original.function_signature
        != transfer.function_signature,
    )

    check(
        f"{template_id}: related skill",
        bool(
            set(original.skill_tags)
            & set(transfer.skill_tags)
        ),
    )

    check(
        f"{template_id}: linked to original",
        transfer.transfer_id == original.id,
    )

    check(
        f"{template_id}: valid question",
        validate_variant(transfer)[0],
    )

    state = LearnerState()

    reason = state.record(
        Evidence(
            question_id=original.id,
            skill=original.skill_tags[0],
            difficulty=original.difficulty,
            score=90,
            assisted=True,
        )
    )

    selected = select_next(
        state,
        [transfer],
        reason,
    )

    check(
        f"{template_id}: transfer selected",
        selected is not None
        and selected.id == transfer.id,
    )

    state.record(
        Evidence(
            question_id=transfer.id,
            skill=transfer.skill_tags[0],
            difficulty=transfer.difficulty,
            score=85,
            assisted=False,
            transfer=True,
        )
    )

    check(
        f"{template_id}: transfer completed",
        not state.pending_transfer,
    )


# Check that all six templates produce valid questions.
for template_id in TEMPLATES:
    q = make_variant(template_id, 123)
    check(
        f"{template_id}: generation valid",
        validate_variant(q)[0],
    )


# Ensure deterministic generation.
q1 = make_variant("first_unique", 55)
q2 = make_variant("first_unique", 55)

check(
    "Same seed produces identical question",
    q1.model_dump() == q2.model_dump(),
)


# Ensure transfer source must be approved.
unapproved = make_variant("count_target", 5)
unapproved.review_status = "draft"

try:
    make_transfer_variant(unapproved, 9)
    rejected = False
except ValueError:
    rejected = True

check(
    "Unvetted transfer source rejected",
    rejected,
)


print(
    f"\nALL {passed} CONCEPTUAL TRANSFER TESTS PASSED"
)
