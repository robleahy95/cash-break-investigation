# Run 2: Investigate (n8n execution 45, 9 Oct 2026 13:28), after the three run 1 fixes

Answer key unchanged since commit e0de1ab (13:14, before any data).

| Break | Expected | Got | Match | Note |
|---|---|---|---|---|
| B1 | R5 reviewer | R5 reviewer | match | Agent also pulled E8 (same EUR 25.00, different payment). Set aside by the reference rule |
| B2 | R5 reviewer | R5 reviewer | match | Agent now reports EUR 312.40, the difference |
| B3 | R5 reviewer | R5 reviewer | match | Value date 9 Oct inside the window |
| B4 | R4 sign-off | R4 sign-off | match | Money out, manual sign-off |
| B5 | R1 human | R1 human | match | EUR 1,200.00 vs EUR 1,020.00, no proposal |
| B6 | R0 chaser EUR 4,750 | R0 chaser EUR 4,750 | match | Agent pulled E1, E4 and E8 as "close" references. All three set aside; this time R0 for the right reason |
| B7 | R2 human | R2 human | match | Right reference, wrong account (GGF-EUR-002). Stopped |
| B8 | R3 chaser EUR 15 | R3 chaser EUR 15.00 | match | EUR 25.00 explained by E8 |

**Score: 8 of 8 on rung, 8 of 8 for the right reason.** 

**What still shows in run 2:** the agent over-includes on 2 of 8 breaks (B1, B6). The rules, not the agent, kept those messages out. That is the case for rules behind the agent: the agent improved with a clearer question, but it still reaches.
