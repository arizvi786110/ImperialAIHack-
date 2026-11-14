"""Illustrative backend usage. Aalia owns actual FastAPI endpoints and persistence."""
from cognit_ai import (AssistRequest, TutorService, GraderService, LearnerState,
                       Evidence, safe_variant)

question = safe_variant('count_target', 42)
public_question = question.public()  # only this goes to the browser/tutor
request = AssistRequest(session_id='demo', question_id=question.id,
                        mode='lookup', query='How do Python lists work?')
print('Assist:', TutorService().assist(request, public_question, prior_attempts=0).model_dump())
print('Grade:', GraderService().grade(question, explanation='').model_dump())
state = LearnerState()
reason = state.record(Evidence(question.id, 'loops', 1, 80, assisted=True))
print('Next action:', reason, state.snapshot())
