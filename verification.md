# Verification

Every test on this build, in the order it ran, scored against expected results written before the run. Misses are kept, not quietly fixed. Times are Irish time on 9 October 2026 and match the git log.

## The rule behind every test

The expected result comes first and goes into git before anything runs:

| What was written first | Commit | Time |
|---|---|---|
| The 8 planted breaks, the step-in ladder and the answer key | e0de1ab | 13:14 |
| The synthetic data (after the key) | 857d077 | 13:15 |
| The expected result for B6 after the scripted reply, before the reply lane existed | 8649382 | 13:36 |
| Break-it cases 1 to 10 with expected results | 744895f | 15:04 |
| Break-it case 11 with its expected result, before the fix | 29de3c9 | 15:18 |

## Summary

| Test | What it checks | Result | Detail |
|---|---|---|---|
| Run 1 | Agent plus rules on the 8 breaks | 5 of 8 (4 for the right reason) | `output/run1.md` |
| Run 2 | Same, after three fixes | 8 of 8 | `output/run2.md` |
| Reply test | B6 after the scripted counterparty reply | R5 as expected | `output/final_run.md` |
| Break-it pass 1 | Rules against 10 hand-written agent answers | 8 of 10 | `output/break_it_run1.md` |
| Break-it pass 2 | Same, after two fixes | 10 of 10 | `output/break_it_run2.md` |
| Live regression | Full run after the break-it fixes | 8 of 8 | n8n execution 56 |
| Rob's live test | All three lanes by hand | 2 new problems found | below |
| Break-it pass 3 | 11 cases, one new | 11 of 11 | `output/break_it_run3.md` |
| Live regression | Full run plus an empty reply on B8 | 8 of 8, no second chaser | n8n executions 62 and 63 |
| Final run | Clean start, all three lanes by hand | 10 of 10 against the key | `output/final_run.md` |

## What each round found, and the fix

**Run 1 (5 of 8).** Three problems, all real:
1. The agent's answers for three breaks were cut off (its reasoning used the length limit). Unreadable output fell through to "no evidence" and drafted a wrong chaser. Fix: a higher limit, and unreadable output is its own failed check that goes to a person, never to "no evidence".
2. The prompt asked for "the amount" without saying which. The agent gave the payment total for the FX break. The rules caught it. Fix: ask for the amount that accounts for the break.
3. The agent pulled in messages about other payments. Fix: the payment reference is the key, so a message that does not mention this payment is set aside and logged.

**Run 2 (8 of 8).** The agent still reached for other payments on 2 of 8 breaks. The rules, not the agent, kept them out.

**Break-it pass 1 (8 of 10).** Two misses in my own rules:
1. If the agent cites a message that does not exist, fix 3 from run 1 set it aside as "another payment" and the break fell to "no evidence". An invented source was hidden. Fix: only a message that exists can be set aside; a missing one fails `evidence_not_found` and goes to a person.
2. An amount written as "4,750.00" could not be read, so a fully supported break went to a person. Fix: read thousands commas. The amount must still appear exactly in the message.

**Rob's live test.** Two problems the scripted tests had not covered:
1. A reply that explained nothing re-opened a break and drafted a second chaser for the same amount. Fix: a break with a chaser already out goes to a person for follow-up. Break-it case 11 was written before this fix.
2. The agent's explanation named the wrong sender for a reply. The rules check quotes, amounts, references and dates, not the agent's prose. Fix: each proposal records its sources with sender and channel from the inbox itself, and the review page shows those.

**Final run (10 of 10).** No misses against the key. Two gaps published in `output/final_run.md`: a draft chaser is not cancelled when its break closes, and the agent's prose can still mislead a reader even though no decision rests on it.

## What is checked where

| Check | Where | How |
|---|---|---|
| Quote exists word for word in the cited message | Rules | String match on the message itself |
| Account and payment reference match the break | Rules | String match on the message itself |
| Amount appears in the message and fits the break | Rules | Exact match, then compared with the break |
| Value date inside the break date or next business day | Rules | Date check |
| Messages that disagree | Rules | Two different supported amounts means R1 |
| Money back or out | Rules | Excess or return wording means R4, manual sign-off |
| A decision has a reason | Review form | Required field |
| Only decisions that fit the rule are offered | Review form | Options depend on the rung |
| Every agent and human action | Audit log | One row each, with before and after state |

## How to re-run

- Rules only: `node tests/break_it.js` (no n8n needed).
- End to end: import `workflow/the-break-chaser.n8n.json` and `workflow/reset-demo.n8n.json` into n8n (see `workflow/README.md`), run the reset, then Run investigation. Results land in `bc_scorecard`.
