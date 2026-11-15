
"""Adaptive progression with per-skill state and verified transfer."""

from dataclasses import dataclass, field
from typing import Literal


@dataclass
class Evidence:
    question_id: str
    skill: str
    difficulty: int
    score: float
    assisted: bool
    transfer: bool = False


@dataclass
class SkillProgress:
    difficulty: int = 1
    independent_streak: int = 0
    pending_transfer_from: str | None = None
    evidence: list[Evidence] = field(default_factory=list)


@dataclass
class LearnerState:
    # Legacy fields retained for compatibility with existing callers.
    difficulty: int = 1
    evidence: list[Evidence] = field(default_factory=list)
    pending_transfer: bool = False
    independent_streak: int = 0
    last_skill: str = ""
    seen_question_ids: set[str] = field(default_factory=set)

    # New: independent progression for each skill.
    skill_progress: dict[str, SkillProgress] = field(
        default_factory=dict
    )

    def _progress(self, skill: str) -> SkillProgress:
        if skill not in self.skill_progress:
            self.skill_progress[skill] = SkillProgress(
                difficulty=self.difficulty
                if not self.skill_progress
                else 1
            )
        return self.skill_progress[skill]

    def _sync_active_skill(self, skill: str) -> None:
        """Keep legacy fields aligned with the active skill."""
        progress = self._progress(skill)
        self.last_skill = skill
        self.difficulty = progress.difficulty
        self.independent_streak = progress.independent_streak
        self.pending_transfer = (
            progress.pending_transfer_from is not None
        )

    def record(
        self, e: Evidence
    ) -> Literal["transfer", "harder", "same", "remedial"]:
        if not (
            0 <= e.score <= 100
            and e.difficulty in (1, 2, 3)
        ):
            raise ValueError("Invalid score or difficulty")

        if not e.skill:
            raise ValueError("Skill cannot be empty")

        if e.question_id in self.seen_question_ids:
            raise ValueError("Question already attempted")

        progress = self._progress(e.skill)
        self.evidence.append(e)
        progress.evidence.append(e)
        self.seen_question_ids.add(e.question_id)

        success = e.score >= 70

        # Successful assisted work needs independent verification.
        if e.assisted and success:
            progress.pending_transfer_from = e.question_id
            progress.independent_streak = 0
            reason = "transfer"

        elif e.assisted:
            progress.independent_streak = 0
            reason = "remedial"

        elif progress.pending_transfer_from is not None:
            # A successful independent TRANSFER is required.
            if e.transfer and success:
                progress.pending_transfer_from = None
                progress.independent_streak = 1
                reason = "same"
            else:
                # Unrelated success must not clear the requirement.
                progress.independent_streak = 0
                reason = (
                    "transfer" if success else "remedial"
                )

        elif not success:
            progress.independent_streak = 0
            reason = "remedial"

        else:
            progress.independent_streak += 1
            if (
                progress.independent_streak >= 2
                and progress.difficulty < 3
            ):
                progress.difficulty += 1
                progress.independent_streak = 0
                reason = "harder"
            else:
                reason = "same"

        self._sync_active_skill(e.skill)
        return reason

    def snapshot(self) -> dict:
        result = {}

        for skill, progress in sorted(
            self.skill_progress.items()
        ):
            ev = progress.evidence
            transfers = [
                e for e in ev
                if e.transfer and not e.assisted
            ]
            independent = [
                e for e in ev if not e.assisted
            ]
            assisted = [
                e for e in ev if e.assisted
            ]

            result[skill] = {
                "difficulty": progress.difficulty,
                "independent_streak": (
                    progress.independent_streak
                ),
                "pending_transfer": (
                    progress.pending_transfer_from is not None
                ),
                "pending_transfer_from": (
                    progress.pending_transfer_from
                ),
                "independent_transfer_correct": sum(
                    e.score >= 70 for e in transfers
                ),
                "independent_transfer_total": len(
                    transfers
                ),
                "assisted_mean": (
                    round(
                        sum(e.score for e in assisted)
                        / len(assisted), 1
                    )
                    if assisted else None
                ),
                "independent_mean": (
                    round(
                        sum(e.score for e in independent)
                        / len(independent), 1
                    )
                    if independent else None
                ),
                "heuristic_mastery": (
                    round(
                        sum(e.score for e in independent)
                        / len(independent) / 100, 2
                    )
                    if independent else None
                ),
            }

        return {
            "difficulty": self.difficulty,
            "pending_transfer": self.pending_transfer,
            "independent_streak": self.independent_streak,
            "mastery_by_skill": result,
        }


def select_next(
    state: LearnerState,
    bank: list,
    reason: str
):
    """Choose an unseen, vetted question.

    When transfer is pending, only an explicitly linked
    question is eligible. None means no suitable question
    is currently available.
    """
    if not bank:
        return None

    pool = [
        q for q in bank
        if q.id not in state.seen_question_ids
        and getattr(q, "review_status", "vetted") == "vetted"
    ]

    if not pool:
        return None

    skill = state.last_skill
    progress = state.skill_progress.get(skill)

    if progress is not None:
        target_difficulty = progress.difficulty
        pending_from = progress.pending_transfer_from
    else:
        target_difficulty = state.difficulty
        pending_from = None

    # Legacy state compatibility.
    if pending_from is None and state.pending_transfer:
        pending_from = (
            state.evidence[-1].question_id
            if state.evidence else None
        )

    if pending_from is not None:
        transfers = [
            q for q in pool
            if q.transfer_id == pending_from
            and skill in q.skill_tags
        ]

        # Do not silently substitute an unrelated question.
        if not transfers:
            return None

        return next(
            (
                q for q in transfers
                if q.difficulty == target_difficulty
            ),
            transfers[0]
        )

    skill_pool = [
        q for q in pool if skill in q.skill_tags
    ] or pool

    level_pool = [
        q for q in skill_pool
        if q.difficulty == target_difficulty
    ] or skill_pool

    return level_pool[0]
