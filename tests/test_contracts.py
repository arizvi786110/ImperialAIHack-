
from pydantic import ValidationError

from cognit_ai.contracts import (
    PublicQuestion,
    PrivateQuestion,
    AssistRequest,
    AssistResponse,
    AttemptRequest,
    ClientTestResult,
    ConceptGrade,
    Envelope,
)
from cognit_ai.question_variants import make_variant


def check(name, condition):
    print(f"{'PASS' if condition else 'FAIL'}: {name}")
    assert condition, name


# TEST 1: Generate a private question
private = make_variant("count_target", 42)

check(
    "Private question contains grading information",
    bool(private.reference_solution)
    and bool(private.hidden_tests)
    and bool(private.rubric),
)


# TEST 2: Convert to public question
public = private.public()

check(
    "Private question converts to PublicQuestion",
    isinstance(public, PublicQuestion),
)


# TEST 3: Sensitive fields are not exposed
public_data = public.model_dump()

sensitive = {
    "reference_solution",
    "hidden_tests",
    "rubric",
    "concept_key",
}

check(
    "Public question excludes sensitive fields",
    not any(field in public_data for field in sensitive),
)


# TEST 4: PublicQuestion rejects private fields
try:
    PublicQuestion.model_validate(private.model_dump())
    rejected = False
except ValidationError:
    rejected = True

check(
    "PublicQuestion rejects unexpected private fields",
    rejected,
)


# TEST 5: Valid tutor request
assist = AssistRequest(
    session_id="session_001",
    question_id=public.id,
    mode="hint",
    query="Can you help me understand the approach?",
    current_attempt_id="attempt_001",
)

check(
    "AssistRequest validates successfully",
    assist.mode == "hint",
)


# TEST 6: Invalid tutor mode rejected
try:
    AssistRequest(
        session_id="session_001",
        question_id=public.id,
        mode="solution",
        query="Give me the answer",
    )
    rejected = False
except ValidationError:
    rejected = True

check(
    "Invalid assistance mode rejected",
    rejected,
)


# TEST 7: Valid conceptual grade
grade = ConceptGrade(
    core_idea=12,
    complexity=8,
    edge_cases=4,
    rationale="Good understanding with minor omissions.",
    confidence=0.9,
)

check(
    "Conceptual grading totals 24/30",
    grade.total == 24,
)


# TEST 8: Invalid grade rejected
try:
    ConceptGrade(
        core_idea=20,
        complexity=8,
        edge_cases=4,
        rationale="Invalid score",
        confidence=0.9,
    )
    rejected = False
except ValidationError:
    rejected = True

check(
    "Out-of-range grading rejected",
    rejected,
)


# TEST 9: Client test result supports pass alias
result = ClientTestResult.model_validate({
    "id": "test_1",
    "pass": True,
    "actual": 5,
})

check(
    "Client test result accepts pass alias",
    result.passed is True,
)


# TEST 10: Valid student attempt
attempt = AttemptRequest(
    session_id="session_001",
    question_id=public.id,
    code="def count_target(values, target): pass",
    explanation="I would iterate over the list.",
    client_test_results=[result],
    help_events=[],
)

check(
    "Student attempt validates successfully",
    attempt.question_id == public.id,
)


# TEST 11: Envelope serialization
envelope = Envelope(
    ok=True,
    data={"message": "Success"},
)

check(
    "API envelope serializes correctly",
    envelope.model_dump()["ok"] is True,
)


# TEST 12: Tutor response validation
response = AssistResponse(
    decision="limit",
    content="What happens with an empty list?",
    hint_level=1,
    reason_code="BOUNDED_GUIDANCE",
)

check(
    "Tutor response validates successfully",
    response.decision == "limit",
)


print("\nALL 12 CONTRACT TESTS PASSED")
