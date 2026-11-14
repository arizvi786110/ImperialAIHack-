"""COGNIT integration contract (frozen 18:45 GMT).

Single source of truth for API request/response shapes. The frontend TS mirror
(committed by DS) must match these. No silent changes: discuss in #dev-backend.

PRIVATE fields (reference_solution, rubric, hidden_tests, concept_key,
transfer_id, review_status) live only on PrivateQuestion and must never be sent
to the frontend or the tutor. Use PrivateQuestion.to_public().
"""

from __future__ import annotations

from typing import Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Envelope: every response is {ok, data?, error?}
# ---------------------------------------------------------------------------

T = TypeVar("T")


class ApiError(BaseModel):
    code: str
    message: str


class Envelope(BaseModel, Generic[T]):
    ok: bool
    data: Optional[T] = None
    error: Optional[ApiError] = None


# ---------------------------------------------------------------------------
# Questions
# ---------------------------------------------------------------------------

Difficulty = Literal[1, 2, 3]


class ExampleTest(BaseModel):
    input: Any
    expected: Any


class PublicQuestion(BaseModel):
    id: str
    seed: int
    skill_tags: list[str]
    difficulty: Difficulty
    title: str
    statement: str
    function_signature: str
    example_tests: list[ExampleTest]
    hint_policy: str
    max_points: int = 100


class RubricCriterion(BaseModel):
    id: str
    description: str
    max_points: int


class PrivateQuestion(PublicQuestion):
    """Server-only. Never serialise this to a client or the tutor."""

    reference_solution: str
    rubric: list[RubricCriterion]
    hidden_tests: list[ExampleTest]
    concept_key: str
    transfer_id: Optional[str] = None
    review_status: Literal["draft", "vetted", "rejected"] = "draft"

    def to_public(self) -> PublicQuestion:
        # Explicit allowlist: only fields declared on PublicQuestion survive.
        return PublicQuestion.model_validate(
            self.model_dump(include=set(PublicQuestion.model_fields))
        )


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------

Stage = Literal["attempt", "plan", "transfer", "complete"]
HelpMode = Literal["lookup", "plan", "hint"]


class SessionState(BaseModel):
    stage: Stage
    difficulty: Difficulty
    allowed_help: list[HelpMode]


# POST /api/session/start
class SessionStartRequest(BaseModel):
    student_alias: str = Field(min_length=1, max_length=64)


class SessionStartResponse(BaseModel):
    session_id: str
    question: PublicQuestion
    state: SessionState


# ---------------------------------------------------------------------------
# POST /api/attempt
# ---------------------------------------------------------------------------


class ClientTestResult(BaseModel):
    id: str
    pass_: bool = Field(alias="pass")
    actual: Any = None
    error: Optional[str] = None

    model_config = {"populate_by_name": True}


class HelpEvent(BaseModel):
    type: str
    timestamp: str


class AttemptRequest(BaseModel):
    session_id: str
    question_id: str
    code: str
    explanation: str = ""
    plan: str = ""
    client_test_results: list[ClientTestResult] = []
    help_events: list[HelpEvent] = []


NextAction = Literal["next", "retry", "plan", "transfer", "complete"]


class AttemptResponse(BaseModel):
    attempt_id: str
    provisional_score: float
    code_score: float
    concept_score: float
    flags: list[str]  # always includes "client_tests_untrusted" until a trusted runner exists
    feedback: str
    mastery_snapshot: dict[str, float]
    next_action: NextAction


# ---------------------------------------------------------------------------
# POST /api/assist
# ---------------------------------------------------------------------------


class AssistRequest(BaseModel):
    session_id: str
    question_id: str
    mode: HelpMode
    query: str = Field(max_length=2000)
    current_attempt_id: Optional[str] = None


class Citation(BaseModel):
    title: str
    url: str


class AssistResponse(BaseModel):
    decision: Literal["allow", "limit", "deny"]
    content: str
    citations: list[Citation] = []
    hint_level: int = 0
    reason_code: str


# ---------------------------------------------------------------------------
# POST /api/next
# ---------------------------------------------------------------------------


class NextRequest(BaseModel):
    session_id: str
    previous_attempt_id: str


class NextResponse(BaseModel):
    question: PublicQuestion
    reason: Literal["transfer", "harder", "same", "remedial"]
    state: SessionState


# ---------------------------------------------------------------------------
# Teacher (demo-only, no real student data)
# ---------------------------------------------------------------------------


class TeacherSessionResponse(BaseModel):
    attempts: list[dict[str, Any]]
    score_breakdown: dict[str, Any]
    mastery_by_skill: dict[str, Any]
    assisted_vs_independent: dict[str, Any]
    help_log: list[dict[str, Any]]
    review_flags: list[dict[str, Any]]


class TeacherReviewRequest(BaseModel):
    attempt_id: str
    override_concept_score: Optional[float] = Field(default=None, ge=0, le=30)
    approved: Optional[bool] = None
    reviewer_note: str


class TeacherReviewResponse(BaseModel):
    review_status: Literal["pending", "approved", "overridden"]
    effective_score: float
