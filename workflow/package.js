// Package each open break with the full evidence inbox, for the agent to read.
const runId = 'run-' + $now.toFormat('yyyyLLdd-HHmmss');
const keyRows = $('Answer key (loaded first)').all().length;
const breaks = $('Open breaks').all().map(i => i.json);
const ev = $('Evidence inbox').all().map(i => i.json);
const inbox = ev.map(e => `[${e.evidence_id}] From: ${e.from_party} | ${e.channel} | ${e.received_at}\nSubject: ${e.subject}\n${e.body}`).join('\n\n');
return breaks.map(b => ({ json: {
  run_id: runId,
  answer_key_rows: keyRows,
  break: b,
  prompt:
`Break to investigate:
- break_id: ${b.break_id}
- account: ${b.account_ref}
- payment reference: ${b.payment_ref}
- counterparty: ${b.counterparty}
- break date: ${b.break_date}
- expected (fund's own record): EUR ${Number(b.ledger_amount_eur).toFixed(2)}
- credited (custodian statement): EUR ${Number(b.statement_amount_eur).toFixed(2)}
- break: EUR ${Number(b.break_amount_eur).toFixed(2)} (${b.direction})

Evidence inbox (${ev.length} messages):

${inbox}

Find every message in the inbox that appears to relate to this break, even if some details in it differ from the break. For each one, report what the message itself says, exactly as written. Do not correct or reconcile anything.

Return JSON only, no other text:
{"items":[{"evidence_id":"E?","quote":"the exact sentence from the message that explains the break, copied word for word","amount_eur":"the amount in the message that accounts for the break (the difference, charge or delayed amount), not the payment total unless the whole payment is the break","account_ref":"as written in the message","payment_ref":"as written in the message","value_date":"YYYY-MM-DD if the message gives a new value date, otherwise null","category":"bank_charge | fx_difference | timing | duplicate | commission | other"}],"explanation":"one plain sentence"}
If no message relates to this break, return {"items":[],"explanation":"No evidence found"}.`
}}));
