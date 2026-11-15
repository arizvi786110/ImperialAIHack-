"""COGNIT integration contract.

ONE source of truth per shape:
- Question, assist, attempt-request and grade shapes are owned by Shreyaa in
  `cognit_ai/contracts.py` and re-exported here. Change them there (and tell #dev-backend).
- HTTP envelope, session, attempt-response, next and teacher shapes are owned by
  the backend (Aalia) and defined below.

PRIVATE fields (reference_solution, rubric, hidden_tests, concept_key,
transfer_id, review_status) live only on PrivateQuestion and must never be sent
to the frontend or the tutor. Always use PrivateQuestion.public().

Test-case `input` is a LIST OF POSITIONAL ARGS, e.g. f(values, target) -> [[1, 2], 2].
"""

from __future__ import annotations

from typing import Any, Generic, Literal, Optional, TypeVar

from pydantic import BaseModel, Field

# Shared with the AI services (owned by Shreyaa).
from cognit_ai.contracts import (  # noqa: F401
    AssistRequest,
    AssistResponse,
    AttemptRequest,
    ClientTestResult,
    ConceptGrade,
    HelpEvent,
    PrivateQuestion,
    PublicQuestion,
    TestCase,
)

ExampleTest = TestCase  # backwards-compatible alias

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
# Session state
# ---------------------------------------------------------------------------

Difficulty = Literal[1, 2, 3]
Stage = Literal["attempt", "plan", "transfer", "complete"]
HelpMode = Literal["lookup", "plan", "hint"]


class SessionState(BaseModel):
    stage: Stage
    difficulty: Difficulty
    allowed_help: list[HelpMode]


# POST /api/session/start  (and GET /api/session/{id}, same response shape)
class SessionStartRequest(BaseModel):
    student_alias: str = Field(min_length=1, max_length=64)


class SessionStartResponse(BaseModel):
    session_id: str
    question: PublicQuestion
    state: SessionState


# ---------------------------------------------------------------------------
# POST /api/attempt  (request = AttemptRequest from cognit_ai)
# ---------------------------------------------------------------------------

NextAction = Literal["next", "retry", "plan", "transfer", "complete"]


class AttemptResponse(BaseModel):
    attempt_id: str
    provisional_score: float
    code_score: float
    concept_score: float
    flags: list[str]  # always includes "client_tests_untrusted" until a trusted runner exists
    feedback: str
    mastery_snapshot: dict[str, Any]
    next_action: NextAction


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
