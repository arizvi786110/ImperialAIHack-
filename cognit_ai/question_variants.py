"""Vetted, deterministic parameter variation. No unvalidated LLM generation."""
import hashlib
import random
from .contracts import PrivateQuestion, TestCase

TEMPLATES = {
 'count_target': {
    'title':'Count matching values', 'skill':'loops', 'signature':'def count_target(values, target):',
    'statement':'Return how many entries in values equal target. The list may be empty.',
    'solution':'def count_target(values, target):\n    return sum(value == target for value in values)',
    'concept':'Iterate and count equality; O(n) time, O(1) extra space.'},
 'unique_count': {
    'title':'Count distinct values', 'skill':'hashing', 'signature':'def unique_count(values):',
    'statement':'Return the number of distinct integers in values. The list may be empty.',
    'solution':'def unique_count(values):\n    return len(set(values))',
    'concept':'A set tracks distinct values; expected O(n) time, O(n) space.'},
 'first_repeat': {
    'title':'Find first repeated value', 'skill':'complexity', 'signature':'def first_repeat(values):',
    'statement':'Return the first value encountered for the second time while scanning left to right; return None if no repeat.',
    'solution':'def first_repeat(values):\n    seen = set()\n    for value in values:\n        if value in seen:\n            return value\n        seen.add(value)\n    return None',
    'concept':'Track previously seen elements; expected O(n) time, O(n) space.'},
}

def make_variant(template_id: str, seed: int) -> PrivateQuestion:
    if template_id not in TEMPLATES or not isinstance(seed,int) or seed < 0:
        raise ValueError('Unapproved template or seed')
    t = TEMPLATES[template_id]
    rng = random.Random(seed)
    samples = [[rng.randint(-5,5) for _ in range(n)] for n in (0, 5, 12, 20)]
    tests=[]
    for arr in samples:
        if template_id == 'count_target':
            target = rng.randint(-5,5)
            inp = [arr,target]
            expected = sum(x == target for x in arr)
        elif template_id == 'unique_count':
            inp = [arr]
            expected = len(set(arr))
        else:
            inp = [arr]
            seen=set(); expected=None
            for x in arr:
                if x in seen:
                    expected=x; break
                seen.add(x)
        tests.append(TestCase(input=inp, expected=expected))
    digest=hashlib.sha256(f'{template_id}:{seed}'.encode()).hexdigest()[:12]
    return PrivateQuestion(id=f'{template_id}-{digest}', seed=seed, skill_tags=[t['skill']],
       difficulty=1 if template_id == 'count_target' else 2 if template_id == 'unique_count' else 3,
       title=t['title'], statement=t['statement'], function_signature=t['signature'],
       example_tests=tests[:2], hidden_tests=tests[2:], reference_solution=t['solution'],
       rubric={'core_idea':t['concept'], 'complexity':'Explain time and space costs',
              'edge_cases':'Discuss empty inputs, duplicates and negative values'},
       concept_key=t['concept'], transfer_id=None, review_status='vetted')

def validate_variant(q: PrivateQuestion, existing_ids: set[str] | None = None) -> tuple[bool,list[str]]:
    issues=[]
    if q.id in (existing_ids or set()): issues.append('duplicate_id')
    if q.review_status != 'vetted': issues.append('unapproved')
    if not q.example_tests or not q.hidden_tests: issues.append('missing_tests')
    if len({repr(t.input) for t in q.example_tests + q.hidden_tests}) != len(q.example_tests + q.hidden_tests):
        issues.append('duplicate_test_input')
    if q.max_points != 100: issues.append('invalid_points')
    if not q.reference_solution or not q.concept_key: issues.append('missing_reference')
    return not issues, issues

def safe_variant(template_id: str, seed: int, existing_ids: set[str] | None = None) -> PrivateQuestion:
    for offset in range(8):
        q=make_variant(template_id, seed+offset)
        if validate_variant(q, existing_ids)[0]: return q
    raise ValueError('No valid vetted variant available; use approved bank fallback')
