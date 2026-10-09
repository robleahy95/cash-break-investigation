# Break-it pass 3 (after Rob's live test, case 11 added before the fix)

```
PASS | Quote not word for word (agent paraphrases E1) | got R2 (E1:quote_not_found)
PASS | Unreadable agent output (cut off mid-answer) | got R2 (agent_output_unreadable)
PASS | Empty inbox, agent finds nothing | got R0
PASS | Agent cites a message that does not exist (empty inbox) | got R2 (E1:evidence_not_found|quote_not_found|account_mismatch|reference_mismatch|amount_not_in_message)
PASS | Agent states the wrong amount (EUR 30.00 vs EUR 25.00 in the message) | got R2 (E1:amount_not_in_message)
PASS | Value date outside the window (20 Oct) | got R2 (E3:date_outside_window)
PASS | Agent writes the amount with a thousands comma (4,750.00) | got R5
PASS | Duplicate reply (same message twice) | got R5
PASS | Reply about another payment, agent includes it for B1 | got R5
PASS | Already chased, reply explains nothing: no second automatic chaser | got R3
PASS | Excess with a supported explanation still needs sign-off | got R4

11 of 11 as expected
```

Live check (n8n exec 62 and 63): investigation 8 of 8 against the key; an empty reply on ASH-77355 sent B8 to a person with no second chaser (outbox: one B8 chaser).
