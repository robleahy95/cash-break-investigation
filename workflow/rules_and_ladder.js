// Rules check the agent, then the step-in ladder. Runs once for all items.
// Source of truth: workflow/rules_and_ladder.js
const pkgs = $('Build the question').all();
const evidence = $('Evidence inbox').all().map(i => i.json);
const byId = Object.fromEntries(evidence.map(e => [e.evidence_id, e]));
const runId = $('Build the question').first().json.run_id;
// Fix after Rob's test (9 Oct): a break that already has a chaser out (draft or sent) does not get a second
// automatic chaser. The follow-up is a person's call.
const alreadyChased = new Set($('Chasers already out').all().map(i => i.json)
  .filter(c => c.break_id && ['draft', 'sent'].includes(c.status)).map(c => c.break_id));
// Fix after Rob's test (9 Oct): record who each source is really from, so the reviewer sees the sender,
// not the agent's summary of it.
const label = id => byId[id] ? `${id} · ${byId[id].from_party} · ${byId[id].channel}` : `${id} · not in the inbox`;

function aiText(j) {
  if (typeof j === 'string') return j;
  if (Array.isArray(j)) { for (const x of j) { const t = aiText(x); if (t) return t; } return null; }
  if (j && typeof j === 'object') {
    if (typeof j.text === 'string' && j.text.includes('{')) return j.text;
    for (const k of Object.keys(j)) { const t = aiText(j[k]); if (t && t.includes('{')) return t; }
  }
  return null;
}
function parseAi(j) {
  const t = aiText(j) || '';
  const s = t.indexOf('{'), e = t.lastIndexOf('}');
  if (s < 0 || e < 0) return { items: [], explanation: '', parse_error: true };
  try { return JSON.parse(t.slice(s, e + 1)); } catch (err) { return { items: [], explanation: '', parse_error: true }; }
}
function nextBusinessDay(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  do { d.setUTCDate(d.getUTCDate() + 1); } while ([0, 6].includes(d.getUTCDay()));
  return d.toISOString().slice(0, 10);
}
// Break-it fix 2: read amounts written with thousands commas (4,750.00) the same as 4750.00.
const eur = n => Number(String(n).replace(/,/g, '')).toFixed(2);

const out = [];
$input.all().forEach((aiItem, i) => {
  const b = pkgs[i].json.break;
  const ai = parseAi(aiItem.json);
  const items = Array.isArray(ai.items) ? ai.items : [];
  const window = [b.break_date, nextBusinessDay(b.break_date)];

  // Rules check every message the agent relied on. The rules read the message itself, not the agent's summary of it.
  // Fix 3 (run 1): the payment reference is the key. A message about a different payment is not evidence
  // for this break. It is set aside and logged, not escalated. A message with the right reference but a
  // wrong detail still fails the checks below and goes to a person.
  // Break-it fix 1: only a message that exists can be set aside. A cited message that does not exist
  // stays in and fails evidence_not_found, so an invented source always reaches a person (R2).
  const setAside = items.filter(it => byId[it.evidence_id] && !byId[it.evidence_id].body.includes(b.payment_ref));
  const relevant = items.filter(it => !setAside.includes(it));
  const checked = relevant.map(it => {
    const ev = byId[it.evidence_id];
    const body = ev ? ev.body : '';
    const fails = [];
    if (!ev) fails.push('evidence_not_found');
    if (!it.quote || !body.includes(it.quote)) fails.push('quote_not_found');
    if (!body.includes(b.account_ref)) fails.push('account_mismatch');
    if (!body.includes(b.payment_ref)) fails.push('reference_mismatch');
    if (it.amount_eur == null || !body.includes(eur(it.amount_eur))) fails.push('amount_not_in_message');
    if (it.value_date && !window.includes(it.value_date)) fails.push('date_outside_window');
    return { ...it, fails };
  });
  const passing = checked.filter(c => c.fails.length === 0);
  const failed = checked.filter(c => c.fails.length > 0);
  const amounts = [...new Set(passing.map(c => eur(c.amount_eur)))];
  const explained = passing.length ? Math.max(...passing.map(c => Number(eur(c.amount_eur)))) : 0;
  const unexplained = Math.round((Number(b.break_amount_eur) - explained) * 100) / 100;
  const moneyOut = b.direction === 'excess' || passing.some(c => /\b(return|recall|refund)\b/i.test(byId[c.evidence_id].body));

  // The step-in ladder. First match wins.
  let rung, who, status, reason, chaser = null;
  if (ai.parse_error) {
    // Fix 1 (run 1): an unreadable agent answer is a failed check, never "no evidence".
    rung = 'R2'; who = 'human_only'; status = 'with_person';
    reason = 'Agent output could not be read. A person investigates; no chaser is drafted.';
  } else if (checked.length === 0) {
    rung = 'R0'; who = 'chaser_then_human'; status = 'chaser_drafted';
    reason = 'No evidence found for this break. Chaser drafted; a person approves the send.';
    chaser = Number(b.break_amount_eur);
  } else if (amounts.length > 1) {
    rung = 'R1'; who = 'human_only'; status = 'with_person';
    reason = `Evidence conflicts: messages give EUR ${amounts.join(' and EUR ')}. No proposal made.`;
  } else if (failed.length > 0 || passing.length === 0) {
    rung = 'R2'; who = 'human_only'; status = 'with_person';
    reason = 'Agent proposal failed a rule check: ' + failed.map(f => `${f.evidence_id} ${f.fails.join(', ')}`).join('; ');
  } else if (unexplained > 0.01) {
    rung = 'R3'; who = 'chaser_then_human'; status = 'chaser_drafted';
    reason = `Evidence explains EUR ${eur(explained)} of EUR ${eur(b.break_amount_eur)}. Chaser drafted for EUR ${eur(unexplained)}.`;
    chaser = unexplained;
  } else if (unexplained < -0.01) {
    rung = 'R2'; who = 'human_only'; status = 'with_person';
    reason = `Explained amount EUR ${eur(explained)} is more than the break EUR ${eur(b.break_amount_eur)}.`;
  } else if (moneyOut) {
    rung = 'R4'; who = 'human_signoff'; status = 'awaiting_signoff';
    reason = 'Explanation supported, but resolving it sends money back or out of the account. Manual sign-off.';
  } else {
    rung = 'R5'; who = 'reviewer'; status = 'awaiting_review';
    reason = 'Explanation fully supported by the evidence. Reviewer approves, amends or overrides.';
  }
  if (chaser != null && alreadyChased.has(b.break_id)) {
    chaser = null; who = 'human_only'; status = 'with_person';
    reason = reason.replace(/ Chaser drafted.*$/, '') + ' Already chased: nothing since explains it, so a person follows up instead of a second automatic chaser.';
  }
  const behaviour = { R0: 'no_proposal', R1: 'no_proposal', R2: 'stopped_by_rules', R3: 'proposes_partial', R4: 'proposes_supported', R5: 'proposes_supported' }[rung];
  const category = rung === 'R0' ? 'no_evidence' : rung === 'R1' ? 'conflict' : (passing[0] || checked[0] || {}).category || 'other';
  const first = passing[0] || checked[0] || {};

  out.push({ json: {
    run_id: runId, break_id: b.break_id, rung, who_acts: who, category, agent_behaviour: behaviour,
    explanation: ai.explanation || '', evidence_ids: checked.map(c => c.evidence_id).join(','),
    quote: first.quote || '', explained_amount_eur: explained, unexplained_amount_eur: chaser != null ? chaser : Math.max(unexplained, 0),
    checks: JSON.stringify(checked), failed_check: ai.parse_error ? 'agent_output_unreadable' : failed.map(f => `${f.evidence_id}:${f.fails.join('|')}`).join('; '),
    set_aside: setAside.map(s => s.evidence_id).join(','),
    sources: [checked.length ? 'Used: ' + checked.map(c => label(c.evidence_id)).join('; ') : 'Used: none',
              setAside.length ? 'Set aside (does not mention this payment): ' + setAside.map(x => label(x.evidence_id)).join('; ') : ''].filter(Boolean).join(' | '),
    status, reason,
    chaser: chaser == null ? null : {
      chaser_id: `${runId}-${b.break_id}`, break_id: b.break_id, to_party: b.counterparty,
      subject: `Query on ${b.payment_ref}: EUR ${eur(chaser)} unexplained`,
      body: `We expected EUR ${eur(b.ledger_amount_eur)} under ${b.payment_ref} to account ${b.account_ref} on ${b.break_date}. EUR ${eur(b.statement_amount_eur)} was credited, leaving EUR ${eur(chaser)} unexplained. Please confirm the reason and any supporting detail.`,
      amount_eur: chaser, status: 'draft', approved_by: '', approved_at: ''
    },
    ai_parse_error: !!ai.parse_error
  }});
});
return out;
