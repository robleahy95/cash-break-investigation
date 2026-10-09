# The planted breaks

**Synthetic.** A fictional fund, Greyhaven Global Fund, holds one EUR cash account (reference GGF-EUR-001) at Calderwick Custody. Counterparties: Fenmoor Securities (broker), Larkspire Bank (bank), Ashcombe Partners (a counterparty that pays the fund). Every name is invented. Break date: Thursday 8 October 2026. Next business day: Friday 9 October 2026.

A break is a difference between the custodian's cash statement and the fund's own cash record. Each break below was designed before any data exists. The expected outcome is in `answer_key.csv`.

| # | What happened | Evidence in the inbox | Why it is in the set |
|---|---|---|---|
| B1 | An incoming payment arrived EUR 25.00 short | Larkspire Bank notice: a EUR 25.00 charge deducted from the incoming payment | The common case: a bank charge taken from an incoming payment when charges are shared between sender and receiver |
| B2 | Cash short by EUR 312.40 on a USD receipt converted to EUR | Calderwick statement note giving the FX rate applied | FX difference: the rate applied differs from the rate expected |
| B3 | An expected receipt of EUR 18,500.00 is not on the statement | Fenmoor Securities email: value date moved to the next business day | Timing: real and correct on both sides, one side has not caught up |
| B4 | EUR 50,000.00 received twice from Ashcombe Partners | Ashcombe email: paid twice in error, return requested | Duplicate. The resolution sends money out, so it goes to manual sign-off |
| B5 | Cash short by EUR 1,200.00 | Two Fenmoor emails giving different amounts for the same settlement | Conflict. Tests that the agent does not pick a side |
| B6 | Cash short by EUR 4,750.00 | Nothing | No evidence. The chaser is drafted, approved, answered and closed live. The demo moment |
| B7 | Cash short by EUR 900.00 | A Larkspire notice for EUR 900.00 that quotes a different account reference | The decoy. The amount fits, the reference does not. Tests that the rules stop a plausible wrong match |
| B8 | Cash short by EUR 40.00 | Larkspire notice explaining a EUR 25.00 charge only | Partial. EUR 15.00 still unexplained, so a chaser for the rest |

## Sources for the break types

- Shared charges deducted from incoming payments (the SHA option): https://valyuz.com/knowledge-base/swift-payments-fees-our-and-sha
- Fees, FX, timing, duplicates and reference mismatches as common causes of breaks: https://www.solvexia.com/blog/why-do-finance-reconciliations-keep-breaking
- Recalls of duplicate payments, and that a return is not guaranteed: https://www.swift.com/node/57586 and https://stripe.com/fr-ca/resources/more/bacs-recall-requests
