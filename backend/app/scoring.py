"""Attempt scoring. Routes only call `score_attempt` and `effective_score`.

Test verification in `summarise_tests` is Ahmed's (H3): each example test counts only
if exactly one `example-N` result reports the expected value with the expected type.
Regression tests: tests/test_scoring_integrity.py.

Plan rubric (per question, 100 points):
  functional tests 50 + edge-case tests 20 + conceptual explanation 30
Difficulty weights: level 1 = x1, level 2 = x1.5, level 3 = x2 (prototype choice, not calibrated).

Known limitation (agreed in A4, see backend/RUNNER_CONTRACT.md): hidden tests are never
sent to the browser, so the 70 code points are scaled from the EXAMPLE tests the browser
reports. These results are untrusted client evidence.
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
    """Check each public case exactly once, including actual value and type.

    This detects inaccurate or duplicate client reports but DOES NOT attest that
    the submitted code produced the reported actual values.
    """
    reported: dict[str, list[ClientTestResult]] = {}
    for r in results:
        reported.setdefault(r.id, []).append(r)
    passed = 0
    for index, case in enumerate(question.example_tests, start=1):
        matches = reported.get(f"example-{index}", [])
        if len(matches) != 1:
            continue
        r = matches[0]
        if (r.passed and not r.error and
                type(r.actual) is type(case.expected) and r.actual == case.expected):
            passed += 1
    return TestSummary(passed=passed, total=len(question.example_tests))


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
