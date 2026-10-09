# Run 1: Investigate (n8n execution 44, 9 Oct 2026 13:23)

Answer key unchanged since commit e0de1ab (13:14, before any data).

| Break | Expected | Got | Match | Why |
|---|---|---|---|---|
| B1 | R5 reviewer | R0 chaser | MISS | Agent output cut off (thinking used the 1,500 token limit). Unreadable output was treated as "no evidence" |
| B2 | R5 reviewer | R2 human | MISS | Agent reported the credited total (EUR 44,687.60), not the EUR 312.40 difference. Rules stopped it (explained amount larger than the break) |
| B3 | R5 reviewer | R5 reviewer | match | |
| B4 | R4 sign-off | R4 sign-off | match | Money out goes to manual sign-off |
| B5 | R1 human | R1 human | match | Conflict EUR 1,200.00 vs EUR 1,020.00 caught, no proposal |
| B6 | R0 chaser | R0 chaser | match, but for the wrong reason | Agent output was also cut off; right rung by luck |
| B7 | R2 human | R2 human | match | Agent matched the EUR 900.00 notice; the account check (GGF-EUR-002) stopped it |
| B8 | R3 chaser EUR 15 | R0 chaser EUR 40 | MISS | Output cut off. The partial text shows the agent also pulled E1 and E4 (same counterparty, different payment references) |

**Score: 5 of 8 on rung, 4 of 8 for the right reason.**

## What run 1 taught (kept, not hidden)

1. **A failure must never look like "no evidence".** Unreadable agent output fell through to R0. In a real team that is a silent wrong chaser. Fix: unreadable output is its own rule and goes to a person.
2. **The agent answered a vague question vaguely.** "amount_eur" did not say which amount. It picked the payment total. The rules caught it, which is the point of the rules, but the prompt was mine to fix.
3. **The agent over-includes.** Asked for anything related, it pulls messages from the same counterparty with different payment references. The reference is the key: a message for another payment is not evidence for this break.
