"""Question bank seeded into the `problems` table at startup.

Shreyaa's 6 vetted templates (cognit_ai.question_variants): 2 per skill
(loops = level 1, hashing = level 2, complexity = level 3), each with an approved
transfer partner. Replace/extend with Ahmed's vetted H1 bank when it lands; note
make_transfer_variant() only works for template-based questions.

Test `input` is a list of positional args: count_target([1, 2], 2) -> input=[[1, 2], 2].
"""

from cognit_ai.question_variants import TEMPLATES, safe_variant
from contracts.models import PrivateQuestion

BANK_SEED = 42

_bank = [safe_variant(template_id, BANK_SEED) for template_id in TEMPLATES]

QUESTIONS: dict[str, PrivateQuestion] = {q.id: q for q in _bank}

# Start at level 1 (loops).
STARTING_QUESTION_ID = next(q.id for q in _bank if q.id.startswith("count_target-"))
