"""Routing agent never gets to invent unverified Python exercises."""
import json

from cognit_ai import question_router


def test_disabled_router_is_deterministic(monkeypatch):
    monkeypatch.setenv("COGNIT_AI_ENABLED", "false")
    monkeypatch.setenv("COGNIT_DYNAMIC_ROUTER_ENABLED", "true")
    selected, why = question_router.propose(
        skill="loops", difficulty=1, previous_question="Count even values",
        previous_explanation="I loop through the list", probe_answer=None, probe_score=None,
    )
    assert selected is None and why == "disabled"


def test_router_accepts_only_matching_vetted_templates(monkeypatch):
    monkeypatch.setenv("COGNIT_AI_ENABLED", "true")
    monkeypatch.setenv("COGNIT_DYNAMIC_ROUTER_ENABLED", "true")
    monkeypatch.setattr(question_router, "ask", lambda *args, **kw:
                        json.dumps({"template_id": "count_target", "reason": "more examples"}))
    selected, _ = question_router.propose(
        skill="loops", difficulty=1, previous_question="Count things",
        previous_explanation="counter", probe_answer="an empty list is zero", probe_score=12,
    )
    assert selected == "count_target"

    monkeypatch.setattr(question_router, "ask", lambda *args, **kw:
                        json.dumps({"template_id": "first_repeat", "reason": "wrong skill"}))
    selected, why = question_router.propose(
        skill="loops", difficulty=1, previous_question="Count things",
        previous_explanation="counter", probe_answer=None, probe_score=2,
    )
    assert selected is None and why == "rejected_unvetted_selection"


def test_router_never_exposes_generated_code(monkeypatch):
    monkeypatch.setenv("COGNIT_AI_ENABLED", "true")
    monkeypatch.setenv("COGNIT_DYNAMIC_ROUTER_ENABLED", "true")
    monkeypatch.setattr(question_router, "ask", lambda *args, **kw:
                        '{"template_id":"import os; print(123)", "reason":"test"}')
    selected, _ = question_router.propose(
        skill="loops", difficulty=1, previous_question="Count",
        previous_explanation="none", probe_answer=None, probe_score=0,
    )
    assert selected is None
