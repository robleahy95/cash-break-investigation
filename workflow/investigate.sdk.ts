import { workflow, node, trigger, sticky, expr } from '@n8n/workflow-sdk';

const start = trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Run investigation' } });
const answerKey = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: "Answer key (loaded first)", 
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: 'Wd2tmDnXgLQOemmj' }, returnAll: true } }
});
const openBreaks = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: "Open breaks", executeOnce: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: 'piEGNCjRV2gJGLha' }, returnAll: true } }
});
const inbox = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: "Evidence inbox", executeOnce: true,
    parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'id', value: '1FlrgvIrSvuo6bET' }, returnAll: true } }
});
const pack = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Package each break with the inbox", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Package each open break with the full evidence inbox, for the agent to read.\nconst runId = 'run-' + $now.toFormat('yyyyLLdd-HHmmss');\nconst keyRows = $('Answer key (loaded first)').all().length;\nconst breaks = $('Open breaks').all().map(i => i.json);\nconst ev = $('Evidence inbox').all().map(i => i.json);\nconst inbox = ev.map(e => `[${e.evidence_id}] From: ${e.from_party} | ${e.channel} | ${e.received_at}\\nSubject: ${e.subject}\\n${e.body}`).join('\\n\\n');\nreturn breaks.map(b => ({ json: {\n  run_id: runId,\n  answer_key_rows: keyRows,\n  break: b,\n  prompt:\n`Break to investigate:\n- break_id: ${b.break_id}\n- account: ${b.account_ref}\n- payment reference: ${b.payment_ref}\n- counterparty: ${b.counterparty}\n- break date: ${b.break_date}\n- expected (fund's own record): EUR ${Number(b.ledger_amount_eur).toFixed(2)}\n- credited (custodian statement): EUR ${Number(b.statement_amount_eur).toFixed(2)}\n- break: EUR ${Number(b.break_amount_eur).toFixed(2)} (${b.direction})\n\nEvidence inbox (${ev.length} messages):\n\n${inbox}\n\nFind every message in the inbox that appears to relate to this break, even if some details in it differ from the break. For each one, report what the message itself says, exactly as written. Do not correct or reconcile anything.\n\nReturn JSON only, no other text:\n{\"items\":[{\"evidence_id\":\"E?\",\"quote\":\"the exact sentence from the message that explains the break, copied word for word\",\"amount_eur\":0.00,\"account_ref\":\"as written in the message\",\"payment_ref\":\"as written in the message\",\"value_date\":\"YYYY-MM-DD if the message gives a new value date, otherwise null\",\"category\":\"bank_charge | fx_difference | timing | duplicate | commission | other\"}],\"explanation\":\"one plain sentence\"}\nIf no message relates to this break, return {\"items\":[],\"explanation\":\"No evidence found\"}.`\n}}));\n" } }
});
const agent = node({
  type: '@n8n/n8n-nodes-langchain.anthropic', version: 1,
  config: { name: 'The agent reads the evidence',
    parameters: { resource: 'text', operation: 'message',
      modelId: { __rl: true, mode: 'list', value: 'claude-sonnet-5', cachedResultName: 'Claude Sonnet 5' },
      messages: { values: [ { content: expr('{{ $json.prompt }}'), role: 'user' } ] },
      simplify: true,
      options: { system: "You read the evidence behind cash reconciliation breaks for an operations team. Your only job is to extract what each message says, exactly as written. You do not decide anything: rules and a person check your work. Never invent or adjust a quote, amount, account or reference. Return JSON only.", temperature: 0, maxTokens: 1500 } } }
});
const rules = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Rules check the agent + step-in ladder", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// Rules check the agent, then the step-in ladder. Runs once for all items.\n// Source of truth for the \"Rules check the agent + step-in ladder\" Code node in Workflow 1.\nconst pkgs = $('Package each break with the inbox').all();\nconst evidence = $('Evidence inbox').all().map(i => i.json);\nconst byId = Object.fromEntries(evidence.map(e => [e.evidence_id, e]));\nconst runId = $('Package each break with the inbox').first().json.run_id;\n\nfunction aiText(j) {\n  if (typeof j === 'string') return j;\n  if (Array.isArray(j)) { for (const x of j) { const t = aiText(x); if (t) return t; } return null; }\n  if (j && typeof j === 'object') {\n    if (typeof j.text === 'string' && j.text.includes('{')) return j.text;\n    for (const k of Object.keys(j)) { const t = aiText(j[k]); if (t && t.includes('{')) return t; }\n  }\n  return null;\n}\nfunction parseAi(j) {\n  const t = aiText(j) || '';\n  const s = t.indexOf('{'), e = t.lastIndexOf('}');\n  if (s < 0 || e < 0) return { items: [], explanation: '', parse_error: true };\n  try { return JSON.parse(t.slice(s, e + 1)); } catch (err) { return { items: [], explanation: '', parse_error: true }; }\n}\nfunction nextBusinessDay(iso) {\n  const d = new Date(iso + 'T00:00:00Z');\n  do { d.setUTCDate(d.getUTCDate() + 1); } while ([0, 6].includes(d.getUTCDay()));\n  return d.toISOString().slice(0, 10);\n}\nconst eur = n => Number(n).toFixed(2);\n\nconst out = [];\n$input.all().forEach((aiItem, i) => {\n  const b = pkgs[i].json.break;\n  const ai = parseAi(aiItem.json);\n  const items = Array.isArray(ai.items) ? ai.items : [];\n  const window = [b.break_date, nextBusinessDay(b.break_date)];\n\n  // Rules check every message the agent relied on. The rules read the message itself, not the agent's summary of it.\n  const checked = items.map(it => {\n    const ev = byId[it.evidence_id];\n    const body = ev ? ev.body : '';\n    const fails = [];\n    if (!ev) fails.push('evidence_not_found');\n    if (!it.quote || !body.includes(it.quote)) fails.push('quote_not_found');\n    if (!body.includes(b.account_ref)) fails.push('account_mismatch');\n    if (!body.includes(b.payment_ref)) fails.push('reference_mismatch');\n    if (it.amount_eur == null || !body.includes(eur(it.amount_eur))) fails.push('amount_not_in_message');\n    if (it.value_date && !window.includes(it.value_date)) fails.push('date_outside_window');\n    return { ...it, fails };\n  });\n  const passing = checked.filter(c => c.fails.length === 0);\n  const failed = checked.filter(c => c.fails.length > 0);\n  const amounts = [...new Set(passing.map(c => eur(c.amount_eur)))];\n  const explained = passing.length ? Math.max(...passing.map(c => Number(c.amount_eur))) : 0;\n  const unexplained = Math.round((Number(b.break_amount_eur) - explained) * 100) / 100;\n  const moneyOut = b.direction === 'excess' || passing.some(c => /\\b(return|recall|refund)\\b/i.test(byId[c.evidence_id].body));\n\n  // The step-in ladder. First match wins.\n  let rung, who, status, reason, chaser = null;\n  if (checked.length === 0) {\n    rung = 'R0'; who = 'chaser_then_human'; status = 'chaser_drafted';\n    reason = 'No evidence found for this break. Chaser drafted; a person approves the send.';\n    chaser = Number(b.break_amount_eur);\n  } else if (amounts.length > 1) {\n    rung = 'R1'; who = 'human_only'; status = 'with_person';\n    reason = `Evidence conflicts: messages give EUR ${amounts.join(' and EUR ')}. No proposal made.`;\n  } else if (failed.length > 0 || passing.length === 0) {\n    rung = 'R2'; who = 'human_only'; status = 'with_person';\n    reason = 'Agent proposal failed a rule check: ' + failed.map(f => `${f.evidence_id} ${f.fails.join(', ')}`).join('; ');\n  } else if (unexplained > 0.01) {\n    rung = 'R3'; who = 'chaser_then_human'; status = 'chaser_drafted';\n    reason = `Evidence explains EUR ${eur(explained)} of EUR ${eur(b.break_amount_eur)}. Chaser drafted for EUR ${eur(unexplained)}.`;\n    chaser = unexplained;\n  } else if (unexplained < -0.01) {\n    rung = 'R2'; who = 'human_only'; status = 'with_person';\n    reason = `Explained amount EUR ${eur(explained)} is more than the break EUR ${eur(b.break_amount_eur)}.`;\n  } else if (moneyOut) {\n    rung = 'R4'; who = 'human_signoff'; status = 'awaiting_signoff';\n    reason = 'Explanation supported, but resolving it sends money back or out of the account. Manual sign-off.';\n  } else {\n    rung = 'R5'; who = 'reviewer'; status = 'awaiting_review';\n    reason = 'Explanation fully supported by the evidence. Reviewer approves, amends or overrides.';\n  }\n  const behaviour = { R0: 'no_proposal', R1: 'no_proposal', R2: 'stopped_by_rules', R3: 'proposes_partial', R4: 'proposes_supported', R5: 'proposes_supported' }[rung];\n  const category = rung === 'R0' ? 'no_evidence' : rung === 'R1' ? 'conflict' : (passing[0] || checked[0] || {}).category || 'other';\n  const first = passing[0] || checked[0] || {};\n\n  out.push({ json: {\n    run_id: runId, break_id: b.break_id, rung, who_acts: who, category, agent_behaviour: behaviour,\n    explanation: ai.explanation || '', evidence_ids: checked.map(c => c.evidence_id).join(','),\n    quote: first.quote || '', explained_amount_eur: explained, unexplained_amount_eur: chaser != null ? chaser : Math.max(unexplained, 0),\n    checks: JSON.stringify(checked), failed_check: failed.map(f => `${f.evidence_id}:${f.fails.join('|')}`).join('; '),\n    status, reason,\n    chaser: chaser == null ? null : {\n      chaser_id: `${runId}-${b.break_id}`, break_id: b.break_id, to_party: b.counterparty,\n      subject: `Query on ${b.payment_ref}: EUR ${eur(chaser)} unexplained`,\n      body: `We expected EUR ${eur(b.ledger_amount_eur)} under ${b.payment_ref} to account ${b.account_ref} on ${b.break_date}. EUR ${eur(b.statement_amount_eur)} was credited, leaving EUR ${eur(chaser)} unexplained. Please confirm the reason and any supporting detail.`,\n      amount_eur: chaser, status: 'draft', approved_by: '', approved_at: ''\n    },\n    ai_parse_error: !!ai.parse_error\n  }});\n});\nreturn out;\n" } }
});
const propRows = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Proposal rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "return $('Rules check the agent + step-in ladder').all().map(i => ({ json: {\n  run_id: i.json.run_id, break_id: i.json.break_id, rung: i.json.rung, who_acts: i.json.who_acts, category: i.json.category,\n  agent_behaviour: i.json.agent_behaviour, explanation: i.json.explanation, evidence_ids: i.json.evidence_ids, quote: i.json.quote,\n  explained_amount_eur: i.json.explained_amount_eur, unexplained_amount_eur: i.json.unexplained_amount_eur, checks: i.json.checks,\n  failed_check: i.json.failed_check, status: i.json.status, reason: i.json.reason } }));\n" } }
});
const saveProps = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: "Save proposals", 
    parameters: { resource: 'row', operation: 'insert', dataTableId: { __rl: true, mode: 'id', value: 'J5dzcHqmCoe9XgPX' }, columns: { mappingMode: 'autoMapInputData', value: null } } }
});
const auditRows = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Audit rows", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "return $('Rules check the agent + step-in ladder').all().map(i => ({ json: {\n  logged_at: $now.toISO(), run_id: i.json.run_id, break_id: i.json.break_id, actor: 'agent', action: 'investigated',\n  rung: i.json.rung, reason: i.json.reason, before_state: 'open', after_state: i.json.status } }));" } }
});
const saveAudit = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: "Save audit log", 
    parameters: { resource: 'row', operation: 'insert', dataTableId: { __rl: true, mode: 'id', value: 'AaZe22QfVwpzjZmW' }, columns: { mappingMode: 'autoMapInputData', value: null } } }
});
const outboxRows = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: { name: "Chaser drafts (never sent)", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "return $('Rules check the agent + step-in ladder').all().filter(i => i.json.chaser).map(i => ({ json: i.json.chaser }));" } }
});
const saveOutbox = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: "Save chaser drafts", 
    parameters: { resource: 'row', operation: 'insert', dataTableId: { __rl: true, mode: 'id', value: '8CUaVo5g8InAFMKI' }, columns: { mappingMode: 'autoMapInputData', value: null } } }
});

const n1 = sticky('## 1. Load\nThe answer key loads first, so the expected results exist before anything runs. Then the open breaks and the evidence inbox. Synthetic data.', [answerKey, openBreaks, inbox], { color: 7 });
const n2 = sticky('## 2. The agent reads\nClaude reads the whole inbox for each break and reports what each relevant message says, word for word. It extracts. It does not decide.', [pack, agent], { color: 4 });
const n3 = sticky('## 3. Rules check the agent, then the ladder\nQuote, account, reference, amount and date are checked against the message itself. Then R0 to R5, first match wins: who acts on each break.', [rules], { color: 3 });
const n4 = sticky('## 4. Write it down\nProposals, the audit log (rung on every row) and chaser drafts. Nothing is sent: a person approves every chaser.', [propRows, saveProps, auditRows, saveAudit, outboxRows, saveOutbox], { color: 5 });

export default workflow('break-chaser-investigate', 'Break Chaser 1: Investigate')
  .add(start).to(answerKey).to(openBreaks).to(inbox).to(pack).to(agent).to(rules)
  .to(propRows).to(saveProps).to(auditRows).to(saveAudit).to(outboxRows).to(saveOutbox)
  .add(n1).add(n2).add(n3).add(n4);
