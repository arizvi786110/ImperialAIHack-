"""Question bank seeded into the `problems` table at startup.

Always: Shreyaa's 6 vetted templates (cognit_ai.question_variants), 2 per skill
(loops = level 1, hashing = level 2, complexity = level 3), each with an approved
transfer partner.

Plus, if present: Ahmed's hand-written bank at backend/app/data/bank.json
(or the path in QUESTION_BANK_FILE). Format + rules: app/data/bank.py and
bank.example.json. Check it first with:  python backend/scripts/validate_bank.py
If bank.json exists, its "start" question is where sessions begin.
"""

import logging
import os
from pathlib import Path

from cognit_ai.question_variants import TEMPLATES, safe_variant
from contracts.models import PrivateQuestion

from .bank import check_bank, load_bank

log = logging.getLogger("cognit.bank")

BANK_SEED = 42
BANK_FILE = Path(os.getenv("QUESTION_BANK_FILE") or Path(__file__).with_name("bank.json"))

_templates = [safe_variant(template_id, BANK_SEED) for template_id in TEMPLATES]
QUESTIONS: dict[str, PrivateQuestion] = {q.id: q for q in _templates}
STARTING_QUESTION_ID = next(q.id for q in _templates if q.id.startswith("count_target-"))

if BANK_FILE.exists():
    start, hand_written = load_bank(BANK_FILE)
    errors, warnings = check_bank(start, hand_written)
    for w in warnings:
        log.warning("bank.json: %s", w)
    if errors:
        # Fail loudly at startup rather than serving a broken question mid-demo.
        raise RuntimeError("bank.json is invalid:\n  " + "\n  ".join(errors))
    clash = set(QUESTIONS) & {q.id for q in hand_written}
    if clash:
        raise RuntimeError(f"bank.json ids clash with template ids: {sorted(clash)}")
    QUESTIONS.update({q.id: q for q in hand_written})
    STARTING_QUESTION_ID = start
