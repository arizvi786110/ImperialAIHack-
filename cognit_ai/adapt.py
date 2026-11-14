"""Per-skill heuristic progression, not a validated ability estimate."""
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class Evidence:
    question_id: str
    skill: str
    difficulty: int
    score: float  # 0..100
    assisted: bool
    transfer: bool = False

@dataclass
class LearnerState:
    difficulty: int = 1
    evidence: list[Evidence] = field(default_factory=list)
    pending_transfer: bool = False
    independent_streak: int = 0
    last_skill: str = ''
    seen_question_ids: set[str] = field(default_factory=set)

    def record(self, e: Evidence) -> Literal['transfer', 'harder', 'same', 'remedial']:
        if not (0 <= e.score <= 100 and e.difficulty in (1,2,3)):
            raise ValueError('Invalid score or difficulty')
        self.evidence.append(e)
        self.seen_question_ids.add(e.question_id)
        self.last_skill = e.skill
        success = e.score >= 70
        if e.assisted and success:
            self.pending_transfer = True
            self.independent_streak = 0
            return 'transfer'
        if e.assisted:
            self.independent_streak = 0
            return 'remedial'
        if not success:
            self.independent_streak = 0
            self.pending_transfer = False
            return 'remedial'
        self.pending_transfer = False
        self.independent_streak += 1
        if self.independent_streak >= 2 and self.difficulty < 3:
            self.difficulty += 1
            self.independent_streak = 0
            return 'harder'
        return 'same'

    def snapshot(self) -> dict:
        skills = sorted({e.skill for e in self.evidence})
        result = {}
        for skill in skills:
            ev = [e for e in self.evidence if e.skill == skill]
            transfers = [e for e in ev if e.transfer and not e.assisted]
            independent = [e for e in ev if not e.assisted]
            assisted = [e for e in ev if e.assisted]
            result[skill] = {
                'independent_transfer_correct':sum(e.score >= 70 for e in transfers),
                'independent_transfer_total':len(transfers),
                'assisted_mean':round(sum(e.score for e in assisted)/len(assisted),1) if assisted else None,
                'independent_mean':round(sum(e.score for e in independent)/len(independent),1) if independent else None,
                'heuristic_mastery':round(sum(e.score for e in independent)/len(independent)/100,2) if independent else None,
            }
        return {'difficulty':self.difficulty, 'pending_transfer':self.pending_transfer,
                'independent_streak':self.independent_streak, 'mastery_by_skill':result}

def select_next(state: LearnerState, bank: list, reason: str):
    """Prefer unseen, vetted matching-skill tasks. Never loop if bank exhausted."""
    if not bank:
        return None
    pool = [q for q in bank if q.id not in state.seen_question_ids and getattr(q,'review_status','vetted') == 'vetted']
    if not pool:
        return None
    skill_pool = [q for q in pool if state.last_skill in q.skill_tags] or pool
    level_pool = [q for q in skill_pool if q.difficulty == state.difficulty] or skill_pool
    if reason == 'transfer' or state.pending_transfer:
        last = state.evidence[-1].question_id if state.evidence else None
        transfers = [q for q in level_pool if q.id != last and any(e.question_id == q.transfer_id for e in state.evidence)]
        if transfers:
            return transfers[0]
    return level_pool[0]
