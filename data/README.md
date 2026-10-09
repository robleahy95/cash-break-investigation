# Data (synthetic)

Fictional fund (Greyhaven Global Fund), account (GGF-EUR-001) and counterparties (Calderwick Custody, Fenmoor Securities, Larkspire Bank, Ashcombe Partners). Written after `design/answer_key.csv` was committed.

- `breaks.csv`: 8 open breaks, the difference between the custodian statement and the fund's own cash record.
- `evidence.csv`: 9 messages in the evidence inbox. E9 is noise (it explains nothing). B6 has no evidence on purpose.

Loaded into n8n Data Tables: `bc_breaks`, `bc_evidence`, `bc_answer_key`. Empty tables written by the workflows: `bc_proposals`, `bc_outbox`, `bc_audit_log`.
