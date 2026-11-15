# Cognit: evidence of understanding (hackathon research prototype)

## What we measure

Cognit distinguishes **solving an example** from **understanding a method**. The evidence is intentionally separated, not combined into a scientifically validated IQ or aptitude score.

| Signal | Evidence | Measurement | Limitation |
|---|---|---|---|
| Functional performance | Browser example tests | 0–70 provisional code points | The student browser reports outcomes and may be manipulated |
| Written explanation | Rubric-based model / teacher review | 0–30 conceptual points | LLM confidence is not a calibrated probability |
| Reasoning interview | One targeted follow-up after each submission | 0–15 separate interview evidence points | The model's grade is provisional |
| Independent transfer | Different vetted problem on same skill | Correct/total independently completed transfer questions | Few items and limited validation, so cannot prove mastery |
| Help dependence | Logged hint and plan usage | Assisted vs independent comparisons | Counting help requests is not a penalty |

A working program with a vague explanation may be a good programmer who cannot yet explain the mechanism, or a correct guess. A student who can explain an edge case can show conceptual understanding even when their first code has a syntax error. These are different signals.

## Agent roles

- **Tutor:** approved reference lookups, progressive hints, plan guidance. Does not provide a full solution.
- **Rubric grader:** scores explanation using the 15/10/5 rubric and reports uncertainty.
- **Conceptual interviewer:** asks one specific counterexample, edge-case, or prediction question based on the student's explanation. Responses are stored separately and cannot be used to fabricate code points.
- **Adaptive router:** Claude can choose only among known vetted problem templates. All executable task inputs and expected results are generated deterministically and validated server-side. If the router gives invalid JSON, picks an unapproved ID or times out, deterministic selection takes over.

## Progression rule

The existing adaptive engine considers passing score, difficulty and help dependence. After a completed conceptual interview, a **confident** score below 8/15 blocks an automatic promotion, without rewriting the student's code/explanation score. If the interview is ungraded or low-confidence, it does not block progression and is sent to teacher review.

A user must answer the short interview to continue to the next problem. In an offline no-key demo, the approved follow-up question is still shown and the answer is saved but **not** assigned a fabricated score.

## How to enable live Claude calls safely

1. **Revoke the Anthropic credential previously pasted into chat.** Do not take a potentially exposed token from GitHub or previous messages.
2. Create a fresh API key in the Anthropic Console, store it **only** under Railway service Variables as \`ANTHROPIC_API_KEY\`. Do not paste it in chat or GitHub.
3. Set \`COGNIT_DEMO_ACCESS_CODE\` in Railway to a private team-shared code and give teammates the code separately. This is lightweight demo access protection, **not production login**. Do not enter the API key in the website's access-code field.
4. Set \`COGNIT_AI_ENABLED=true\`, \`COGNIT_DYNAMIC_ROUTER_ENABLED=true\`, and \`COGNIT_PROBE_MODEL=claude-haiku-4-5\`. The usual rubric grader defaults to Sonnet; set \`COGNIT_GRADER_MODEL\` explicitly if you choose a different valid model.
5. Set \`MAX_ATTEMPTS_PER_SESSION=16\` and \`MAX_ASSISTS_PER_SESSION=20\`. Each submitted attempt can invoke a grader, interviewer and, when advancing, router. The model client has a bounded token output, but input length, retries and provider billing still matter.
6. Set an actual usage or spending limit in Anthropic Console to your £50 target. **These app limits are not a strict financial cap.** An exposed shared code or more than one session can still produce calls until the provider stops them.
7. Use synthetic accounts only. The teacher dashboard is public to people with the shared code and session ID. Browser execution is not secure.

## Validation and next research steps

Evaluation against labelled human-scored explanations is needed before claiming accurate assessment of conceptual understanding. Report false positives (polished but wrong explanations), false negatives (brief but correct reasoning), ambiguity and disagreement separately. Test cross-problem transfer, grade stability, prompt-injection resistance and performance when Claude is disabled.

Competitor patterns used as references: CodeSignal's split coding environment and examples, HackerRank's test-case feedback, human review of code quality and conversational follow-ups. Cognit's differentiation is **separate evidence of reasoning and independent transfer** rather than code correctness alone.
