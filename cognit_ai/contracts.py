"""Shared AI contracts; backend owns HTTP routes and persistence."""
from typing import Any, Literal
from pydantic import BaseModel, Field, ConfigDict

class TestCase(BaseModel):
    input: Any
    expected: Any

class PublicQuestion(BaseModel):
    model_config = ConfigDict(extra='forbid')
    id: str
    seed: int = 0
    skill_tags: list[str]
    difficulty: Literal[1, 2, 3]
    title: str
    statement: str
    function_signature: str
    example_tests: list[TestCase]
    hint_policy: str = 'Conceptual help only; no solution code.'
    max_points: int = 100

class PrivateQuestion(PublicQuestion):
    reference_solution: str = ''
    rubric: dict[str, Any] = Field(default_factory=dict)
    hidden_tests: list[TestCase] = Field(default_factory=list)
    concept_key: str = ''
    transfer_id: str | None = None
    review_status: str = 'vetted'

    def public(self) -> PublicQuestion:
        return PublicQuestion.model_validate(self.model_dump(include=set(PublicQuestion.model_fields)))

class AssistRequest(BaseModel):
    session_id: str
    question_id: str
    mode: Literal['lookup', 'plan', 'hint']
    query: str = Field(min_length=1, max_length=1500)
    current_attempt_id: str | None = None

class AssistResponse(BaseModel):
    decision: Literal['allow', 'limit', 'deny']
    content: str
    citations: list[str] = Field(default_factory=list)
    hint_level: int = Field(default=0, ge=0, le=3)
    reason_code: str

class ClientTestResult(BaseModel):
    id: str
    passed: bool = Field(alias='pass')
    actual: Any = None
    error: str | None = None

class HelpEvent(BaseModel):
    type: str
    timestamp: str

class AttemptRequest(BaseModel):
    session_id: str
    question_id: str
    code: str
    explanation: str
    plan: str = ''
    client_test_results: list[ClientTestResult] = Field(default_factory=list)
    help_events: list[HelpEvent] = Field(default_factory=list)

class ConceptGrade(BaseModel):
    core_idea: int = Field(ge=0, le=15)
    complexity: int = Field(ge=0, le=10)
    edge_cases: int = Field(ge=0, le=5)
    rationale: str = Field(max_length=1000)
    confidence: float = Field(ge=0, le=1)
    review_required: bool = False
    flags: list[str] = Field(default_factory=list)
    model_used: str = ''
    provisional: bool = True

    @property
    def total(self) -> int:
        return self.core_idea + self.complexity + self.edge_cases

class Envelope(BaseModel):
    ok: bool
    data: dict[str, Any] | None = None
    error: dict[str, str] | None = None
