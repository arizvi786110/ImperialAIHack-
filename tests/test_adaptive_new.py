
from cognit_ai.adapt import (
    Evidence,
    LearnerState,
    select_next,
)
from cognit_ai.question_variants import (
    make_variant,
    make_transfer_variant,
    validate_variant,
)


def check(name, condition):
    assert condition, name
    print(f"PASS: {name}")


def evidence(
    question_id,
    skill,
    score,
    assisted=False,
    transfer=False,
    difficulty=1,
):
    return Evidence(
        question_id=question_id,
        skill=skill,
        difficulty=difficulty,
        score=score,
        assisted=assisted,
        transfer=transfer,
    )


# TEST 1: Different skills progress independently.
state = LearnerState()
state.record(evidence("loops-1", "loops", 85))
state.record(evidence("hash-1", "hashing", 90))

check(
    "Different skills do not combine streaks",
    state.skill_progress["loops"].difficulty == 1
    and state.skill_progress["hashing"].difficulty == 1,
)

# TEST 2: Two independent successes in one skill.
state.record(evidence("loops-2", "loops", 90))

check(
    "Two loop successes increase loop difficulty",
    state.skill_progress["loops"].difficulty == 2,
)

check(
    "Hashing difficulty stays unchanged",
    state.skill_progress["hashing"].difficulty == 1,
)

# TEST 3: Assisted success creates transfer requirement.
state2 = LearnerState()
reason = state2.record(
    evidence("original", "loops", 90, assisted=True)
)

check(
    "Assisted success requires transfer",
    reason == "transfer"
    and state2.pending_transfer,
)

# TEST 4: Unrelated independent success cannot clear it.
state2.record(evidence("unrelated", "loops", 85))

check(
    "Ordinary success does not clear transfer",
    state2.pending_transfer,
)

# TEST 5: Generate linked transfer question.
original = make_variant("count_target", 42)
transfer = make_transfer_variant(
    original,
    seed=99,
    existing_ids={original.id},
)

check(
    "Transfer question links to original",
    transfer.transfer_id == original.id
    and transfer.id != original.id,
)

check(
    "Transfer question passes validation",
    validate_variant(transfer)[0],
)

# TEST 6: Selection chooses linked transfer.
state3 = LearnerState()
state3.record(
    evidence(original.id, "loops", 90, assisted=True)
)

selected = select_next(
    state3,
    [make_variant("count_target", 100), transfer],
    "transfer",
)

check(
    "Selector chooses the linked transfer",
    selected is not None
    and selected.id == transfer.id,
)

# TEST 7: No unrelated fallback during transfer.
unrelated = make_variant("count_target", 100)

check(
    "Missing transfer returns None",
    select_next(state3, [unrelated], "transfer") is None,
)

# TEST 8: Successful independent transfer clears pending.
state3.record(
    evidence(
        transfer.id,
        "loops",
        90,
        assisted=False,
        transfer=True,
    )
)

check(
    "Independent transfer clears requirement",
    not state3.pending_transfer,
)

# TEST 9: Different skill retains its own requirement.
state4 = LearnerState()
state4.record(
    evidence("loops-assisted", "loops", 90, assisted=True)
)
state4.record(
    evidence("hash-independent", "hashing", 90)
)

check(
    "Other skill cannot clear loops transfer",
    state4.skill_progress[
        "loops"
    ].pending_transfer_from == "loops-assisted",
)

# TEST 10: Transfer cannot reference itself.
bad = make_variant("count_target", 55)
bad.transfer_id = bad.id

check(
    "Self-linked transfer is rejected",
    "self_transfer" in validate_variant(bad)[1],
)


# Additional regression tests for adaptive learning

# TEST 13: Difficulty never exceeds level 3.
max_state = LearnerState()
max_state.record(evidence("max-1", "loops", 90))
max_state.record(evidence("max-2", "loops", 90))
max_state.record(evidence("max-3", "loops", 90))
max_state.record(evidence("max-4", "loops", 90))
max_state.record(evidence("max-5", "loops", 90))

check(
    "Difficulty does not exceed level 3",
    max_state.skill_progress["loops"].difficulty == 3,
)

# TEST 14: Failed attempts trigger remedial learning.
fail_state = LearnerState()
reason = fail_state.record(
    evidence("failed-1", "loops", 40)
)

check(
    "Failed attempt triggers remedial learning",
    reason == "remedial",
)

# TEST 15: Invalid scores are rejected.
invalid_state = LearnerState()
try:
    invalid_state.record(
        evidence("invalid-score", "loops", 110)
    )
    rejected = False
except ValueError:
    rejected = True

check("Invalid scores are rejected", rejected)

# TEST 16: Invalid difficulty is rejected.
try:
    invalid_state.record(
        evidence(
            "invalid-difficulty",
            "loops",
            80,
            difficulty=5,
        )
    )
    rejected = False
except ValueError:
    rejected = True

check("Invalid difficulty is rejected", rejected)

# TEST 17: Empty question bank is handled.
empty_state = LearnerState()

check(
    "Empty question bank returns None",
    select_next(empty_state, [], "same") is None,
)

# TEST 18: Already attempted questions are excluded.
seen_state = LearnerState()
seen_question = make_variant("count_target", 300)

seen_state.record(
    evidence(seen_question.id, "loops", 80)
)

check(
    "Previously attempted question is not repeated",
    select_next(
        seen_state,
        [seen_question],
        "same",
    ) is None,
)

# TEST 19: Unvetted questions are excluded.
unvetted_state = LearnerState()
unvetted_question = make_variant("count_target", 301)
unvetted_question.review_status = "draft"

check(
    "Unvetted questions are not selected",
    select_next(
        unvetted_state,
        [unvetted_question],
        "same",
    ) is None,
)

# TEST 20: Mastery statistics are generated.
mastery_state = LearnerState()
mastery_state.record(
    evidence("mastery-1", "loops", 80)
)

snapshot = mastery_state.snapshot()

check(
    "Mastery snapshot includes skill statistics",
    "loops" in snapshot["mastery_by_skill"]
    and snapshot["mastery_by_skill"]["loops"][
        "independent_mean"
    ] == 80.0,
)

print("\nALL ADAPTIVE LEARNING TESTS PASSED")

