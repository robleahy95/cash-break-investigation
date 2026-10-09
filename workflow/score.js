// Score each break against the answer key written before the data.
const key = Object.fromEntries($('Answer key (loaded first)').all().map(i => [i.json.break_id, i.json]));
return $('Rules check the agent + step-in ladder').all().map(i => {
  const r = i.json;
  const afterReply = (r.evidence_ids || '').split(',').some(id => id.startsWith('R-'));
  const keyId = afterReply ? r.break_id + '-after-reply' : r.break_id;
  const k = key[keyId];
  return { json: { run_id: r.run_id, break_id: r.break_id, key_used: keyId, expected_rung: k ? k.expected_rung : 'no key', got_rung: r.rung, match: !!k && k.expected_rung === r.rung, note: r.reason } };
});
