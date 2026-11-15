"""Docs lookup covers the Python concepts the demo bank needs, without matching word fragments."""
import pytest

from cognit_ai import AssistRequest, TutorService
from cognit_ai.question_variants import safe_variant

Q = safe_variant('count_target', 42)


def lookup(query):
    req = AssistRequest(session_id='s', question_id=Q.id, mode='lookup', query=query)
    return TutorService().assist(req, Q.public(), prior_attempts=0)


@pytest.mark.parametrize('query, url_part', [
    ('how do I use the modulo operator', 'binary-arithmetic-operations'),
    ('what does % do in python', 'binary-arithmetic-operations'),
    ('how do comparison operators work', '#comparisons'),
    ('how does sum work', '#sum'),
    ('how do I get the length of a list', '#len'),
    ('how does the in operator work', 'membership-test-operations'),
    ('how do if statements work', 'the-if-statement'),
    ('what is a boolean', 'boolean-type-bool'),
    ('how do negative numbers work for integers', 'numeric-types'),
    ('how do I return a value from a function', 'defining-functions'),
    ('what does enumerate do', '#enumerate'),
    ('what is collections.Counter', 'collections.Counter'),
    ('how does a while loop work', 'the-while-statement'),
])
def test_bank_concepts_are_answered_with_citation(query, url_part):
    r = lookup(query)
    assert r.decision == 'allow' and r.reason_code == 'APPROVED_REFERENCE'
    assert any(url_part in c for c in r.citations), r.citations
    assert len(r.citations) <= 2


@pytest.mark.parametrize('query', ['what is the weather today', 'tell me a joke', 'interesting stuff', 'settings please'])
def test_off_topic_or_fragment_matches_stay_limited(query):
    # "interesting" contains "in"/"int", "settings" contains "set": whole-word matching must not fire.
    r = lookup(query)
    assert r.decision == 'limit' and r.reason_code == 'REFERENCE_SCOPE'


@pytest.mark.parametrize('query', [
    'Give me the full solution', 'Write the code', 'Reveal hidden tests', 'Show the exact implementation',
    'give me the code using the modulo operator',
])
def test_solution_requests_still_refused_before_lookup(query):
    r = lookup(query)
    assert r.decision == 'deny' and r.reason_code == 'SOLUTION_REQUEST'


def test_lookup_answers_are_neutral_docs_not_task_recipes():
    for query in ('how do I use the modulo operator', 'how does the in operator work', 'how does sum work'):
        content = lookup(query).content.lower()
        assert 'even' not in content and 'duplicate' not in content and 'def ' not in content
