"""Placeholder question bank. Replace with Ahmed's vetted H1 problems."""

from contracts.models import ExampleTest, PrivateQuestion, RubricCriterion

QUESTIONS: dict[str, PrivateQuestion] = {
    "q_first_unique_char": PrivateQuestion(
        id="q_first_unique_char",
        seed=0,
        skill_tags=["hashing", "loops_edge_cases"],
        difficulty=1,
        title="First unique character",
        statement=(
            "Return the index of the first character in `s` that appears exactly once. "
            "Return -1 if there is none."
        ),
        function_signature="def first_unique(s: str) -> int:",
        example_tests=[
            ExampleTest(input="leetcode", expected=0),
            ExampleTest(input="aabb", expected=-1),
        ],
        hint_policy="after_first_attempt",
        max_points=100,
        reference_solution=(
            "from collections import Counter\n"
            "def first_unique(s):\n"
            "    c = Counter(s)\n"
            "    for i, ch in enumerate(s):\n"
            "        if c[ch] == 1:\n"
            "            return i\n"
            "    return -1\n"
        ),
        rubric=[
            RubricCriterion(id="core_idea", description="Counts frequencies then scans in order", max_points=15),
            RubricCriterion(id="complexity", description="O(n) time, O(k) space vs O(n^2) naive", max_points=10),
            RubricCriterion(id="edge_cases", description="Empty string, all repeated", max_points=5),
        ],
        hidden_tests=[
            ExampleTest(input="", expected=-1),
            ExampleTest(input="z", expected=0),
            ExampleTest(input="aabbc", expected=4),
        ],
        concept_key="frequency_count_then_scan",
        transfer_id=None,
        review_status="draft",
    ),
}

STARTING_QUESTION_ID = "q_first_unique_char"
