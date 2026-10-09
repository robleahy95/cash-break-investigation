# The step-in ladder

Who acts on each break. Read top to bottom, first match wins. The rung that fired travels with the break into the audit log, so the log and the written rule cannot disagree.

| Rung | Fires when | Who acts |
|---|---|---|
| **R0** | No evidence found for the break | The agent drafts a chaser to the counterparty. A person approves the send |
| **R1** | The evidence contradicts itself (two messages give different amounts for the same item) | A person only. The agent makes no proposal |
| **R2** | The agent's proposal fails a rule check (quote not found word for word, amount does not equal the break, reference does not match, date outside the window) | A person only, with the failed check shown |
| **R3** | The explanation is supported but covers only part of the break | The agent drafts a chaser for the amount still unexplained. A person approves the send |
| **R4** | The resolution would send money back or out of the account (a return, a recall, a payment) | A person only. Manual sign-off, whatever the agent proposes |
| **R5** | The explanation is fully supported by the evidence | The reviewer approves, amends or overrides. A reason is required |

## Why this order

- **Conflicts before the agent (R1).** If the evidence disagrees with itself, the agent's reading of it does not matter. Conflicts are surfaced, never resolved silently.
- **Rule checks before acting (R2).** The agent suggests, the rules decide. A proposal that cannot be traced to a quote, an amount and a reference is not a proposal.
- **Money out is always a person (R4).** Rob's rule: anything that moves money back or out of our hands is signed off by a person, even when the explanation is perfect.
- **Nothing leaves the system without a person.** Chasers (R0, R3) are drafted by the agent and sent only on approval.

## The rule checks behind R2

1. The quoted text exists word for word in the evidence message it cites.
2. The amount the agent reads equals the break amount within EUR 0.01 (or, for R3, is less than it).
3. The account reference in the evidence matches the break's reference.
4. Any date in the evidence falls inside the window: the break date or the next business day.

## Changes after run 1 (9 Oct 2026, 13:30, answer key unchanged)

- **Unreadable agent output is R2**, never R0. In run 1 three answers were cut off and fell through to "no evidence". A failure must not look like an empty inbox.
- **A message about a different payment reference is set aside and logged**, not escalated. The reference is the key. A message with the right reference but a wrong detail (B7) still fails the checks and goes to a person.

## Changes after break-it pass 1 (9 Oct 2026, cases committed before the run)

- **Only a message that exists can be set aside.** Pass 1 showed an invented source (agent cites a message that is not in the inbox) was set aside as "another payment" and the break fell to R0. Now it fails `evidence_not_found` and goes to R2, a person.
- **Amounts with thousands commas are read correctly.** "4,750.00" was unreadable to the amount check and sent a supported break to a person. The check still requires the exact amount to appear in the message.
