# Generates break_chaser.sdk.ts, the n8n Workflow SDK source for "The Break Chaser".
# Run: python3 build_sdk.py  (from this folder). The JS for the two Code nodes lives in rules_and_ladder.js and score.js.
import json

J = json.dumps
Q = chr(39)  # single quote, kept out of f-strings for Python 3.9
T = {'breaks': 'piEGNCjRV2gJGLha', 'evidence': '1FlrgvIrSvuo6bET', 'key': 'Wd2tmDnXgLQOemmj', 'props': 'J5dzcHqmCoe9XgPX',
     'outbox': '8CUaVo5g8InAFMKI', 'audit': 'AaZe22QfVwpzjZmW', 'prec': 'JRznDPCV8VdthTnp', 'score': 'NNu95y5lb4iSoKSP'}


def tid(t):
    return "{ __rl: true, mode: 'id', value: '" + T[t] + "' }"


def e(s):
    return 'expr(' + J('{{ ' + s + ' }}') + ')'


def cols(d):
    vals = ', '.join(k + ': ' + v for k, v in d.items())
    schema = ', '.join("{ id: '" + k + "', displayName: '" + k + "', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }" for k in d)
    return "{ mappingMode: 'defineBelow', value: { " + vals + " }, schema: [ " + schema + " ] }"


def filt(conds):
    c = ', '.join("{ keyName: '" + k + "', condition: 'eq', keyValue: " + v + " }" for k, v in conds)
    return "matchType: 'allConditions', filters: { conditions: [ " + c + " ] }"


nodes = []


def add(var, s):
    nodes.append('const ' + var + ' = ' + s + ';')


def dt(var, name, pos, params, extra=''):
    add(var, "node({ type: 'n8n-nodes-base.dataTable', version: 1.1, config: { name: " + J(name) + ", position: " + pos + ", " + extra +
        " parameters: { resource: 'row', " + params + " } } })")


def code(var, name, pos, js):
    add(var, "node({ type: 'n8n-nodes-base.code', version: 2, config: { name: " + J(name) + ", position: " + pos +
        ", parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: " + J(js) + " } } })")


def bool_cond(left):
    return ("{ options: { caseSensitive: true, leftValue: '', typeValidation: 'loose' }, conditions: [ { leftValue: " + left +
            ", rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } } ], combinator: 'and' }")


rules = open('rules_and_ladder.js').read()
rules = rules.replace("$('Package each break with the inbox').all()", "$('Build the question').all()")
rules = rules.replace("$('Package each break with the inbox').first().json.run_id", "$('Build the question').first().json.run_id")
rules = rules.replace('// Source of truth for the "Rules check the agent + step-in ladder" Code node in Workflow 1.', '// Source of truth: workflow/rules_and_ladder.js')
assert 'Package each' not in rules
score = open('score.js').read()

prompt = (
    "'Break to investigate:\\n- break_id: ' + $json.break_id + '\\n- account: ' + $json.account_ref + '\\n- payment reference: ' + $json.payment_ref"
    " + '\\n- counterparty: ' + $json.counterparty + '\\n- break date: ' + $json.break_date"
    " + '\\n- expected (fund record): EUR ' + Number($json.ledger_amount_eur).toFixed(2)"
    " + '\\n- credited (custodian statement): EUR ' + Number($json.statement_amount_eur).toFixed(2)"
    " + '\\n- break: EUR ' + Number($json.break_amount_eur).toFixed(2) + ' (' + $json.direction + ')'"
    " + '\\n\\nEvidence inbox (' + $('Evidence inbox').all().length + ' messages):\\n\\n'"
    " + $('Evidence inbox').all().map(m => '[' + m.json.evidence_id + '] From: ' + m.json.from_party + ' | ' + m.json.channel + ' | ' + m.json.received_at + '\\nSubject: ' + m.json.subject + '\\n' + m.json.body).join('\\n\\n')"
    " + '\\n\\nFind every message in the inbox that appears to relate to this break, even if some details in it differ from the break. For each one, report what the message itself says, exactly as written. Do not correct or reconcile anything.\\n\\nReturn JSON only, no other text:\\n'"
    " + '{\"items\":[{\"evidence_id\":\"E?\",\"quote\":\"the exact sentence from the message that explains the break, copied word for word\",\"amount_eur\":\"the amount in the message that accounts for the break (the difference, charge or delayed amount), not the payment total unless the whole payment is the break\",\"account_ref\":\"as written in the message\",\"payment_ref\":\"as written in the message\",\"value_date\":\"YYYY-MM-DD if the message gives a new value date, otherwise null\",\"category\":\"bank_charge | fx_difference | timing | duplicate | commission | other\"}],\"explanation\":\"one plain sentence\"}'"
    " + '\\nIf no message relates to this break, return {\"items\":[],\"explanation\":\"No evidence found\"}.'"
)
assert '}}' not in prompt
system = ("You read the evidence behind cash reconciliation breaks for an operations team. Your only job is to extract what each message says, exactly as written. "
          "You do not decide anything: rules and a person check your work. Never invent or adjust a quote, amount, account or reference. Return JSON only.")

# ---------- Lane 1: Investigate ----------
add('runInv', "trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { name: 'Run investigation', position: [0, 0] } })")
dt('answerKey', 'Answer key (loaded first)', '[240, 0]', "operation: 'get', dataTableId: " + tid('key') + ", returnAll: true")
dt('inbox', 'Evidence inbox', '[480, 0]', "operation: 'get', dataTableId: " + tid('evidence') + ", returnAll: true", 'executeOnce: true,')
dt('openBreaks', 'Open breaks', '[720, 0]', "operation: 'get', dataTableId: " + tid('breaks') + ", " + filt([('status', J('open'))]) + ", returnAll: true", 'executeOnce: true,')
run_id_expr = Q + 'run-' + Q + ' + $now.toFormat(' + Q + 'yyyyLLdd-HHmmss' + Q + ')'
add('question', "node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Build the question', position: [960, 0], parameters: { mode: 'manual', includeOtherFields: false, assignments: { assignments: [ "
    "{ id: 'a1', name: 'run_id', value: " + e(run_id_expr) + ", type: 'string' }, "
    "{ id: 'a2', name: 'break', value: " + e('$json') + ", type: 'object' }, "
    "{ id: 'a3', name: 'prompt', value: " + e(prompt) + ", type: 'string' } ] } } } })")
add('agent', "node({ type: '@n8n/n8n-nodes-langchain.anthropic', version: 1, config: { name: 'The agent reads the evidence', position: [1200, 0], parameters: { resource: 'text', operation: 'message', "
    "modelId: { __rl: true, mode: 'list', value: 'claude-sonnet-5', cachedResultName: 'Claude Sonnet 5' }, messages: { values: [ { content: " + e('$json.prompt') + ", role: 'user' } ] }, "
    "simplify: true, options: { system: " + J(system) + ", maxTokens: 8000 } } } })")
code('rules', 'Rules check the agent + step-in ladder', '[1440, 0]', rules)
pcols = {k: e('$json.' + k) for k in ['run_id', 'break_id', 'rung', 'who_acts', 'category', 'agent_behaviour', 'explanation', 'evidence_ids', 'quote',
                                       'explained_amount_eur', 'unexplained_amount_eur', 'checks', 'failed_check', 'set_aside', 'status', 'reason']}
dt('saveProps', 'Save proposals', '[1680, 0]', "operation: 'insert', dataTableId: " + tid('props') + ", columns: " + cols(pcols))
acols = {'logged_at': e('$now.toISO()'), 'run_id': e('$json.run_id'), 'break_id': e('$json.break_id'), 'actor': J('agent'), 'action': J('investigated'),
         'rung': e('$json.rung'), 'reason': e('$json.reason'), 'before_state': J('open'), 'after_state': e('$json.status')}
dt('logAgent', 'Log to audit trail', '[1920, 0]', "operation: 'insert', dataTableId: " + tid('audit') + ", columns: " + cols(acols))
dt('markInv', 'Mark break investigated', '[2160, 0]', "operation: 'update', dataTableId: " + tid('breaks') + ", " + filt([('break_id', e('$json.break_id'))]) + ", columns: " + cols({'status': J('investigated')}))
chaser_left = e('[' + Q + 'R0' + Q + ', ' + Q + 'R3' + Q + '].includes($json.rung)')
add('needsChaser', "node({ type: 'n8n-nodes-base.filter', version: 2.2, config: { name: 'Needs a chaser?', position: [1680, 240], parameters: { conditions: " + bool_cond(chaser_left) + " } } })")
ccols = {k: e('$json.chaser.' + k) for k in ['chaser_id', 'break_id', 'to_party', 'subject', 'body', 'amount_eur', 'status']}
dt('draftChaser', 'Draft chaser (not sent)', '[1920, 240]', "operation: 'insert', dataTableId: " + tid('outbox') + ", columns: " + cols(ccols))
code('scoreIt', 'Score against the answer key', '[1680, -240]', score)
scols = {k: e('$json.' + k) for k in ['run_id', 'break_id', 'key_used', 'expected_rung', 'got_rung', 'match', 'note']}
dt('saveScore', 'Save scorecard', '[1920, -240]', "operation: 'insert', dataTableId: " + tid('score') + ", columns: " + cols(scols))

# ---------- Lane 2: Review ----------
P = "$('Latest proposal').first().json"
PR = "$('Precedent').first().json"
D = "$('Decide').first().json.decision"
R = "$('Decide').first().json.reason"
WHO = "$('Reviewer: open a break').first().json.reviewer"
desc = ("'<p><b>Rule fired:</b> ' + " + P + ".rung + ' (' + " + P + ".who_acts + ')</p><p>' + " + P + ".reason + '</p>'"
        " + '<p><b>Agent explanation:</b> ' + (" + P + ".explanation || 'none') + '</p><p><b>Quote:</b> <i>' + (" + P + ".quote || 'none') + '</i></p>'"
        " + '<p><b>Evidence used:</b> ' + (" + P + ".evidence_ids || 'none') + (" + P + ".set_aside ? ' (set aside: ' + " + P + ".set_aside + ')' : '') + '</p>'"
        " + '<p><b>Precedent:</b> ' + (" + PR + ".decision ? " + PR + ".decision + ' on ' + " + PR + ".break_id + ', reason: ' + " + PR + ".reason : 'none yet') + '</p><p><i>Synthetic data.</i></p>'")
assert '}}' not in desc
add('openReview', "trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.6, config: { name: 'Reviewer: open a break', position: [0, 560], parameters: { formTitle: 'Break Chaser: review a break', "
    "formDescription: 'Pick a break. You will see what the agent found, the rule that fired and any precedent. Synthetic data.', formFields: { values: [ "
    "{ fieldLabel: 'Break', fieldName: 'break_id', fieldType: 'dropdown', requiredField: true, fieldOptions: { values: [ { option: 'B1' }, { option: 'B2' }, { option: 'B3' }, { option: 'B4' }, { option: 'B5' }, { option: 'B6' }, { option: 'B7' }, { option: 'B8' } ] } }, "
    "{ fieldLabel: 'Reviewer name', fieldName: 'reviewer', fieldType: 'text', requiredField: true } ] }, options: { appendAttribution: false, buttonLabel: 'Open break' } } } })")
dt('latest', 'Latest proposal', '[240, 560]', "operation: 'get', dataTableId: " + tid('props') + ", " + filt([('break_id', e('$json.break_id'))]) +
   ", returnAll: false, limit: 1, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC'")
dt('precedent', 'Precedent', '[480, 560]', "operation: 'get', dataTableId: " + tid('prec') + ", " + filt([('category', e('$json.category'))]) +
   ", returnAll: false, limit: 1, orderBy: true, orderByColumn: 'createdAt', orderByDirection: 'DESC'", 'alwaysOutputData: true,')
title = Q + 'Break ' + Q + ' + ' + P + '.break_id + ' + Q + ': ' + Q + ' + ' + P + '.category'
add('decide', "node({ type: 'n8n-nodes-base.form', version: 2.5, config: { name: 'Decide', position: [720, 560], parameters: { operation: 'page', formFields: { values: [ "
    "{ fieldLabel: 'Decision', fieldName: 'decision', fieldType: 'dropdown', requiredField: true, fieldOptions: { values: [ { option: 'Approve' }, { option: 'Amend' }, { option: 'Override' }, { option: 'Approve chaser send' }, { option: 'Sign off (money out)' }, { option: 'Take it myself' } ] } }, "
    "{ fieldLabel: 'Reason (required)', fieldName: 'reason', fieldType: 'textarea', requiredField: true }, "
    "{ fieldLabel: 'Amended explanation (only if amending)', fieldName: 'amended_explanation', fieldType: 'textarea', requiredField: false } ] }, "
    "options: { formTitle: " + e(title) + ", formDescription: " + e(desc) + ", buttonLabel: 'Log decision', appendAttribution: false } } } })")
dt('recordDecision', 'Record decision on proposal', '[960, 560]', "operation: 'update', dataTableId: " + tid('props') + ", " + filt([('id', e(P + '.id'))]) + ", columns: " + cols({'status': e('$json.decision')}))
bstatus = D + " === 'Approve chaser send' ? 'chased' : (" + D + " === 'Take it myself' ? 'with_person' : 'closed')"
dt('breakStatus', 'Update break status', '[1200, 560]', "operation: 'update', dataTableId: " + tid('breaks') + ", " + filt([('break_id', e(P + '.break_id'))]) + ", columns: " + cols({'status': e(bstatus)}))
rcols = {'logged_at': e('$now.toISO()'), 'run_id': e(P + '.run_id'), 'break_id': e(P + '.break_id'), 'actor': e(WHO), 'action': e(D),
         'rung': e(P + '.rung'), 'reason': e(R), 'before_state': e(P + '.status'), 'after_state': e(bstatus)}
dt('logDecision', 'Log decision to audit trail', '[1440, 560]', "operation: 'insert', dataTableId: " + tid('audit') + ", columns: " + cols(rcols))
add('done', "node({ type: 'n8n-nodes-base.form', version: 2.5, config: { name: 'Decision logged', position: [1680, 560], parameters: { operation: 'completion', respondWith: 'text', "
    "completionTitle: 'Decision logged', completionMessage: 'Your decision and reason are in the audit trail.' } } })")
prec_left = e('[' + Q + 'Approve' + Q + ', ' + Q + 'Amend' + Q + '].includes(' + D + ')')
add('next', "node({ type: 'n8n-nodes-base.switch', version: 3.2, config: { name: 'What happens next', position: [1920, 560], parameters: { rules: { values: [ "
    "{ outputKey: 'chaser', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [ { leftValue: " + e(D) + ", operator: { type: 'string', operation: 'equals' }, rightValue: 'Approve chaser send' } ], combinator: 'and' } }, "
    "{ outputKey: 'precedent', conditions: " + bool_cond(prec_left) + " } ] } } } })")
dt('markSent', 'Mark chaser sent', '[2160, 460]', "operation: 'update', dataTableId: " + tid('outbox') + ", " + filt([('break_id', e(P + '.break_id')), ('status', J('draft'))]) +
   ", columns: " + cols({'status': J('sent'), 'approved_by': e(WHO), 'approved_at': e('$now.toISO()')}))
pcols2 = {'decided_at': e('$now.toISO()'), 'break_id': e(P + '.break_id'), 'counterparty': J(''), 'category': e(P + '.category'),
          'decision': e(D), 'reason': e(R), 'decided_by': e(WHO)}
dt('savePrec', 'Save precedent', '[2160, 660]', "operation: 'insert', dataTableId: " + tid('prec') + ", columns: " + cols(pcols2))

# ---------- Lane 3: Counterparty reply ----------
add('reply', "trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.6, config: { name: 'Counterparty reply', position: [0, 960], parameters: { formTitle: 'Reply to a chaser', "
    "formDescription: 'Play the counterparty. Your reply goes into the evidence inbox and the agent re-reads the break. Synthetic data.', formFields: { values: [ "
    "{ fieldLabel: 'From', fieldName: 'from_party', fieldType: 'dropdown', requiredField: true, fieldOptions: { values: [ { option: 'Ashcombe Partners' }, { option: 'Fenmoor Securities' }, { option: 'Larkspire Bank' }, { option: 'Calderwick Custody' } ] } }, "
    "{ fieldLabel: 'Payment reference', fieldName: 'payment_ref', fieldType: 'text', requiredField: true }, "
    "{ fieldLabel: 'Message', fieldName: 'message', fieldType: 'textarea', requiredField: true } ] }, options: { appendAttribution: false, buttonLabel: 'Send reply' } } } })")
ecols = {'evidence_id': e(Q + 'R-' + Q + ' + $now.toFormat(' + Q + 'HHmmss' + Q + ')'), 'received_at': e('$now.toISO()'), 'from_party': e('$json.from_party'),
         'channel': J('email reply'), 'subject': e(Q + 'Reply on ' + Q + ' + $json.payment_ref'), 'body': e('$json.message')}
dt('addEvidence', 'Add reply to evidence inbox', '[240, 960]', "operation: 'insert', dataTableId: " + tid('evidence') + ", columns: " + cols(ecols))
dt('reopen', 'Reopen the break', '[480, 960]', "operation: 'update', dataTableId: " + tid('breaks') + ", " +
   filt([('payment_ref', e("$('Counterparty reply').first().json.payment_ref"))]) + ", columns: " + cols({'status': J('open')}))

wf = """export default workflow('break-chaser', 'The Break Chaser')
  .add(runInv).to(answerKey).to(inbox).to(openBreaks).to(question).to(agent).to(rules)
  .add(rules).to(saveProps).to(logAgent).to(markInv)
  .add(rules).to(needsChaser).to(draftChaser)
  .add(rules).to(scoreIt).to(saveScore)
  .add(openReview).to(latest).to(precedent).to(decide).to(recordDecision).to(breakStatus).to(logDecision).to(done).to(next.onCase(0, markSent).onCase(1, savePrec))
  .add(reply).to(addEvidence).to(reopen).to(answerKey);"""
out = "import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';\n\n" + "\n".join(nodes) + "\n\n" + wf + "\n"
open('break_chaser.sdk.ts', 'w').write(out)
print(len(out))
