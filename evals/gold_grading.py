"""Optional live grader check; requires API key and human-approved expected ranges.
Run: python -m evals.gold_grading. This spends API credits.
"""
import json
from dotenv import load_dotenv
from cognit_ai import GraderService, safe_variant
load_dotenv()
q = safe_variant('count_target', 42)
CASES = [
 ('strong', 'I scan every element and increment a counter when it equals the target. Time O(n), extra space O(1). An empty list returns zero.', (25,30)),
 ('partial', 'I loop over the items and count matches.', (10,22)),
 ('syntax_bug_sound_concept', 'Even if I miss a colon in Python, the intended method is one pass comparing each item, O(n) time and constant extra memory; empty input yields zero.', (22,30)),
 ('passing_code_weak_explanation', 'It works.', (0,8)),
 ('false_explanation', 'I can always return the length of the list because every element equals the target; this is O(1).', (0,8)),
 ('edge_only', 'An empty list must give zero and negative targets should be supported.', (1,12)),
]
results=[]
for label, explanation, (low, high) in CASES:
    g=GraderService().grade(q, explanation=explanation)
    results.append({'case':label,'score':g.total,'human_expected_range':[low,high],
                    'within_range':low<=g.total<=high and 'GRADER_UNAVAILABLE' not in g.flags,
                    'review_required':g.review_required,'flags':g.flags,'model':g.model_used})
print(json.dumps({'agreement_count':sum(r['within_range'] for r in results),
                  'total':len(results),'cases':results,
                  'note':'Ranges are preliminary illustrative expectations; obtain human approval before claiming agreement.'},indent=2))
