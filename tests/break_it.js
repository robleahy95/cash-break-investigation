// Break-it pass for the rules and the step-in ladder (workflow/rules_and_ladder.js).
// Feeds hand-written agent answers, including ones Claude would rarely give, and checks the rung.
// Expected results are written in CASES below and were committed before the first run.
// Run: node tests/break_it.js
const fs = require('fs');
const path = require('path');
const code = fs.readFileSync(path.join(__dirname, '..', 'workflow', 'rules_and_ladder.js'), 'utf8');

function csv(file) {
  const lines = fs.readFileSync(path.join(__dirname, '..', 'data', file), 'utf8').split('\n').filter(l => l && !l.startsWith('#'));
  const head = lines[0].split(',');
  return lines.slice(1).map(l => {
    const parts = l.split(',');
    const row = {};
    head.forEach((h, i) => { row[h] = i === head.length - 1 ? parts.slice(i).join(',') : parts[i]; });
    return row;
  });
}
const breaks = Object.fromEntries(csv('breaks.csv').map(b => [b.break_id, b]));
const inbox = csv('evidence.csv');

function run(breakId, aiText, evidence = inbox) {
  const b = breaks[breakId];
  const $ = name => ({
    'Build the question': { all: () => [{ json: { run_id: 'test', break: b } }], first: () => ({ json: { run_id: 'test', break: b } }) },
    'Evidence inbox': { all: () => evidence.map(e => ({ json: e })) },
  })[name];
  const $input = { all: () => [{ json: { content: [{ type: 'text', text: aiText }] } }] };
  return new Function('$', '$input', code)($, $input)[0].json;
}
const item = (id, quote, amount, extra = {}) => ({ evidence_id: id, quote, amount_eur: amount, ...extra });
const ai = (items, explanation = 'test') => JSON.stringify({ items, explanation });
const E1 = 'Charges of EUR 25.00 have been deducted from incoming payment ASH-77310 credited to account GGF-EUR-001 on 8 October 2026.';
const REPLY = 'We paid EUR 20250.00 under ASH-77412 to account GGF-EUR-001 because EUR 4750.00 was netted against your open invoice INV-2207.';

const CASES = [
  { name: 'Quote not word for word (agent paraphrases E1)', break: 'B1', ai: ai([item('E1', 'A EUR 25 charge was taken from ASH-77310.', '25.00')]), expect: 'R2', check: 'quote_not_found' },
  { name: 'Unreadable agent output (cut off mid-answer)', break: 'B1', ai: '{"items":[{"evidence_id":"E1","quote":"Charges of EUR', expect: 'R2', check: 'agent_output_unreadable', noChaser: true },
  { name: 'Empty inbox, agent finds nothing', break: 'B1', ai: ai([], 'No evidence found'), evidence: [], expect: 'R0', chaser: 25 },
  { name: 'Agent cites a message that does not exist (empty inbox)', break: 'B1', ai: ai([item('E1', E1, '25.00')]), evidence: [], expect: 'R2', check: 'evidence_not_found' },
  { name: 'Agent states the wrong amount (EUR 30.00 vs EUR 25.00 in the message)', break: 'B1', ai: ai([item('E1', E1, '30.00')]), expect: 'R2', check: 'amount_not_in_message' },
  { name: 'Value date outside the window (20 Oct)', break: 'B3', ai: ai([item('E3', 'Settlement FEN-4407 of EUR 18500.00 to account GGF-EUR-001 will now value 9 October 2026 due to a late instruction on our side.', '18500.00', { value_date: '2026-10-20' })]), expect: 'R2', check: 'date_outside_window' },
  { name: 'Agent writes the amount with a thousands comma (4,750.00)', break: 'B6', ai: ai([item('R-1', REPLY, '4,750.00')]), evidence: [...inbox, { evidence_id: 'R-1', body: REPLY }], expect: 'R5' },
  { name: 'Duplicate reply (same message twice)', break: 'B6', ai: ai([item('R-1', REPLY, '4750.00'), item('R-2', REPLY, '4750.00')]), evidence: [...inbox, { evidence_id: 'R-1', body: REPLY }, { evidence_id: 'R-2', body: REPLY }], expect: 'R5' },
  { name: 'Reply about another payment, agent includes it for B1', break: 'B1', ai: ai([item('E1', E1, '25.00'), item('R-1', REPLY, '4750.00')]), evidence: [...inbox, { evidence_id: 'R-1', body: REPLY }], expect: 'R5', setAside: 'R-1' },
  { name: 'Excess with a supported explanation still needs sign-off', break: 'B4', ai: ai([item('E4', 'We sent EUR 50000.00 under ASH-77318 to account GGF-EUR-001 twice in error on 8 October 2026.', '50000.00')]), expect: 'R4' },
];

let pass = 0;
for (const c of CASES) {
  const r = run(c.break, c.ai, c.evidence);
  const fails = [];
  if (r.rung !== c.expect) fails.push(`rung ${r.rung}, expected ${c.expect}`);
  if (c.check && !(r.failed_check || '').includes(c.check)) fails.push(`failed_check "${r.failed_check}", expected ${c.check}`);
  if (c.noChaser && r.chaser) fails.push('a chaser was drafted');
  if (c.chaser != null && (!r.chaser || r.chaser.amount_eur !== c.chaser)) fails.push(`chaser ${r.chaser && r.chaser.amount_eur}, expected ${c.chaser}`);
  if (c.setAside && r.set_aside !== c.setAside) fails.push(`set aside "${r.set_aside}", expected ${c.setAside}`);
  const ok = fails.length === 0;
  if (ok) pass++;
  console.log(`${ok ? 'PASS' : 'MISS'} | ${c.name} | got ${r.rung}${r.failed_check ? ' (' + r.failed_check + ')' : ''}${ok ? '' : ' | ' + fails.join('; ')}`);
}
console.log(`\n${pass} of ${CASES.length} as expected`);
