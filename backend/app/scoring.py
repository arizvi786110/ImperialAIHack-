"""TEMPORARY scoring stand-in until Ahmed's scoring.py (H3) lands.

Swap point: replace the bodies of `score_attempt` and `effective_score` (or import
Ahmed's functions here). Routes only call these two functions.

Plan rubric (per question, 100 points):
  functional tests 50 + edge-case tests 20 + conceptual explanation 30
Difficulty weights: level 1 = x1, level 2 = x1.5, level 3 = x2 (prototype choice, not calibrated).

Known limitation (agreed, revisit in A4): hidden tests are never sent to the browser,
so the 70 code points are scaled from the EXAMPLE tests the browser reports. These
results are untrusted client evidence.
"""

from dataclasses import dataclass
from typing import Optional

from contracts.models import ClientTestResult, PrivateQuestion

FUNCTIONAL_MAX = 50
EDGE_MAX = 20
CODE_MAX = FUNCTIONAL_MAX + EDGE_MAX  # 70
CONCEPT_MAX = 30
DIFFICULTY_WEIGHT = {1: 1.0, 2: 1.5, 3: 2.0}


@dataclass
class TestSummary:
    passed: int
    total: int

    def as_dict(self) -> dict:
        return {"passed": self.passed, "total": self.total, "source": "browser_example_tests_UNTRUSTED"}


@dataclass
class AttemptScore:
    tests: TestSummary
    code_score: float  # 0-70
    concept_score: float  # 0-30
    total: float  # 0-100


def summarise_tests(question: PrivateQuestion, results: list[ClientTestResult]) -> TestSummary:
    total = len(question.example_tests)
    # De-duplicate by id so repeating a passing result can't inflate the score.
    passed_ids = {r.id for r in results if r.passed}
    return TestSummary(passed=min(len(passed_ids), total), total=total)


def score_attempt(question: PrivateQuestion, results: list[ClientTestResult], concept_score: float) -> AttemptScore:
    tests = summarise_tests(question, results)
    ratio = tests.passed / tests.total if tests.total else 0.0
    code = round(CODE_MAX * ratio, 1)
    concept = max(0.0, min(float(concept_score), CONCEPT_MAX))
    return AttemptScore(tests=tests, code_score=code, concept_score=concept, total=round(code + concept, 1))


def effective_score(code_score: float, concept_score: float, override_concept_score: Optional[float]) -> float:
    """Score after teacher review: teacher override replaces the AI concept score."""
    concept = override_concept_score if override_concept_score is not None else concept_score
    return round(code_score + concept, 1)


def weight(difficulty: int) -> float:
    return DIFFICULTY_WEIGHT.get(difficulty, 1.0)
