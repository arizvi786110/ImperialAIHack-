"""Regression tests for Ahmed's objective scoring verification."""
from backend.app.scoring import score_attempt
from cognit_ai.question_variants import safe_variant
from contracts.models import ClientTestResult


def reports(question):
    return [
        ClientTestResult.model_validate({"id": f"example-{i}", "pass": True, "actual": case.expected})
        for i, case in enumerate(question.example_tests, 1)
    ]


def test_correct_report_scores_seventy_code_points():
    q = safe_variant("count_target", 42)
    score = score_attempt(q, reports(q), 30)
    assert score.code_score == 70
    assert score.total == 100


def test_untrue_pass_flags_cannot_earn_credit():
    q = safe_variant("count_target", 42)
    fake = [
        ClientTestResult.model_validate({"id": f"example-{i}", "pass": True, "actual": "invented"})
        for i, _ in enumerate(q.example_tests, 1)
    ]
    assert score_attempt(q, fake, 0).code_score == 0


def test_duplicate_results_are_ambiguous_and_fail_closed():
    q = safe_variant("count_target", 42)
    original = reports(q)
    duplicated = original + [original[0]]
    result = score_attempt(q, duplicated, 0)
    assert result.code_score < 70
    assert result.tests.passed == len(q.example_tests) - 1


def test_boolean_does_not_equal_integer_score():
    q = safe_variant("count_target", 42)
    cases = reports(q)
    cases[0] = ClientTestResult.model_validate({"id": "example-1", "pass": True, "actual": True})
    assert score_attempt(q, cases, 0).code_score < 70
