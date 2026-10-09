# Final run (9 October 2026, 15:38 to 15:47)

Clean start (reset demo), then Rob ran all three lanes in the n8n editor. Every row below is transcribed from the n8n Data Tables after the run. Synthetic data throughout. Reviewer names (rob, james, patrick) are the test names typed into the review form.

## 1. Investigation, scored against the answer key (`bc_scorecard`)

Answer key committed 13:14, before any data existed (commit e0de1ab); the B6-after-reply row was committed before the reply lane was built.

| Run | Break | Key row | Expected | Got | Match |
|---|---|---|---|---|---|
| run-20261009-153823 | B1 | B1 | R5 | R5 | yes |
| run-20261009-153823 | B2 | B2 | R5 | R5 | yes |
| run-20261009-153823 | B3 | B3 | R5 | R5 | yes |
| run-20261009-153823 | B4 | B4 | R4 | R4 | yes |
| run-20261009-153823 | B5 | B5 | R1 | R1 | yes |
| run-20261009-153823 | B6 | B6 | R0 | R0 | yes |
| run-20261009-153823 | B7 | B7 | R2 | R2 | yes |
| run-20261009-153823 | B8 | B8 | R3 | R3 | yes |
| run-20261009-154359 | B1 (after a reply) | B1 | R5 | R5 | yes |
| run-20261009-154644 | B6 (after the scripted reply) | B6-after-reply | R5 | R5 | yes |

**10 of 10.**

## 2. What the agent did and what the rules did (`bc_proposals`, selected)

- **B6, no evidence:** the agent pulled E1, E4 and E8 as "Ashcombe-style references". The rules set all three aside (none mentions ASH-77412). Sources line: "Used: none | Set aside (does not mention this payment): E1 · Larkspire Bank · bank notice; E4 · Ashcombe Partners · email; E8 · Larkspire Bank · bank notice".
- **B7, the decoy:** the agent matched the EUR 900.00 notice on the right reference; the account check stopped it (`E7:account_mismatch`).
- **B1 after Rob's reply "25 eur short":** the reply does not mention ASH-77310, so it was set aside; E1 still explains the break. The agent's prose called the reply a confirmation; the sources line shows it was set aside.
- **B6 after the scripted reply:** the reply quotes ASH-77412, GGF-EUR-001 and EUR 4750.00, so it passed every check. R5, approved.

## 3. People's decisions (`bc_audit_log`, reviewer rows)

| Time | Break | Reviewer | Decision | Reason given | Before → after |
|---|---|---|---|---|---|
| 15:44:40 | B1 | rob | Approve | missed costs | awaiting_review → closed |
| 15:45:31 | B8 | james | Approve chaser send | complete | chaser_drafted → chased |
| 15:46:08 | B4 | patrick | Sign off (money out) | sign off | awaiting_signoff → closed |
| 15:47:33 | B6 | james | Approve | paid | awaiting_review → closed |

The audit log also holds one agent row per break per run (14 rows in total).

## 4. Outbox (`bc_outbox`)

| Break | Amount | Status | Approved by |
|---|---|---|---|
| B6 | EUR 4,750.00 | draft | |
| B8 | EUR 15.00 | sent | james, 15:45:33 |

## 5. Precedents (`bc_precedents`)

| Break | Counterparty | Category | Decision | Reason |
|---|---|---|---|---|
| B1 | Ashcombe Partners | bank_charge | Approve | missed costs |
| B4 | Ashcombe Partners | duplicate | Sign off (money out) | sign off |
| B6 | Ashcombe Partners | other | Approve | paid |

B8 (bank charge) was reviewed after B1 was approved, so its review page carried the B1 precedent.

## 6. Break status at the end (`bc_breaks`)

B1, B4, B6 closed · B8 chased · B2, B3, B5, B7 investigated (not reviewed in this run).

## Gaps this run showed (published, not fixed here)

- **A stale draft chaser.** B6 closed on the reply, but its EUR 4,750.00 chaser is still "draft" in the outbox. The B6 chaser was never approved in this run (the reply came first), and nothing cancels a draft when its break closes. Next: closing a break cancels its open draft chaser.
- **The agent's prose is not verified.** On B1 the agent described Rob's reply as confirming the shortfall; the rules had set it aside. Decisions never rest on the prose, and the review page now shows the sources line from the inbox itself, but the sentence can still mislead a reader.
