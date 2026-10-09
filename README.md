# The Break Chaser

Investigating a cash reconciliation break usually means chasing someone: the bank, the custodian, the broker. Read the thread, chase, wait, chase again. Addetto names this pain on its homepage: operations teams spend too much time "checking outputs and reconstructing context" (https://addetto.ai).

The Break Chaser is a small version of that loop, built in n8n to understand the problem properly. An agent reads the evidence behind each break and reports what it found, quoting the line it relied on. Rules check the agent. Where there is no evidence, it drafts a chaser. A person approves anything that leaves the system, every decision is logged, and approved decisions are kept as precedents for the next similar break.

**The rules set the route. A person decides.**

![The whole workflow in n8n](screenshots/00-whole-workflow.png)

## Walk-through

**1. Get ready.** The right answers are written down first, so the work can be marked later. Then the money that does not add up, and every message about it.

![Get ready](screenshots/01-get-ready.png)

**2. The AI reads.** Claude reads every message and copies out the exact words that explain each problem. It does not decide anything.

![The AI reads](screenshots/02-the-ai-reads.png)

**3. Double check.** Simple rules check the AI got it right: same amount, same account, same payment, words copied exactly. Then they decide who deals with it.

![Double check](screenshots/03-double-check.png)

**4. Write it down.** Mark the work against the right answers, save what was found, and draft a message if something is missing. Nothing is sent.

![Write it down](screenshots/04-write-it-down.png)

**A reply comes back.** The answer joins the pile and the AI reads that one problem again.

![A reply comes back](screenshots/05-a-reply-comes-back.png)

**5. A person decides.** Only sensible options are offered, and a reason is required.

![A person decides](screenshots/06-a-person-decides.png)

**6. Keep a record.** Who decided what, and why, so anyone can check it later.

![Keep a record](screenshots/07-keep-a-record.png)

**7. What happens next.** An approved message is marked as sent. Good decisions are saved, so the next similar problem shows what was done before.

![What happens next](screenshots/08-what-happens-next.png)

## What each box on the canvas does

| Box | In plain words |
|---|---|
| Run investigation | The start button |
| Answer key (loaded first) | The right answers, written before any data existed, loaded first so every run can be marked |
| Evidence inbox | Every message about the money: bank notices, statement notes, emails, replies |
| Chasers already out | Messages already drafted or sent, so nobody gets chased twice for the same thing |
| Open breaks | The money that does not add up and still needs looking at |
| Build the question | Puts one problem and the whole inbox in front of the AI |
| The agent reads the evidence | Claude reads the inbox and copies out what each relevant message says, word for word |
| Rules check the agent + step-in ladder | Checks the AI's answer against the message itself, then decides who deals with it |
| Score against the answer key, Save scorecard | Marks the run against the right answers |
| Save proposals, Log to audit trail, Mark break investigated | Saves what was found, logs it, and marks the problem as looked at |
| Needs a chaser?, Draft chaser (not sent) | Drafts a message when something is missing. A person approves before anything goes |
| Reviewer: open a break | The form where a person picks a problem to review |
| Latest proposal, Precedent | Pulls up what was found, and what was decided last time on a similar problem |
| Decide | The page where the person chooses what to do and says why |
| Record decision on proposal, Update break status, Log decision to audit trail, Decision logged | Writes the decision down everywhere it needs to go |
| What happens next, Mark chaser sent, Save precedent | Marks an approved message as sent, and saves good decisions for next time |
| Counterparty reply, Add reply to evidence inbox, Reopen the break | The other side answers, the answer joins the inbox, and the problem is looked at again |

## What it does

Three lanes in one n8n workflow:

| Lane | Trigger | What happens |
|---|---|---|
| 1. Investigate | Run by hand | Loads the answer key first, then the open breaks, the evidence inbox and any chasers already out. Claude reads the inbox for each break and extracts what each relevant message says. The rules check every quote, account, reference, amount and date against the message itself, then the step-in ladder decides who acts. Results go to proposals, the audit log, chaser drafts and the scorecard |
| 2. Review | A two-page form | Pick a break by counterparty, reference and amount. Page 2 shows what it looks like, the rule that fired and why, what the agent found, the quoted evidence, the real sources, and any precedent. Only the decisions that fit the rule are offered, and a reason is required |
| 3. Counterparty reply | A form | Play the bank or counterparty. The reply goes into the inbox, the break reopens, and lane 1 re-reads that break only |

## The step-in ladder

First match wins. The rung that fired travels with the break into the audit log.

| Rung | Fires when | Who acts |
|---|---|---|
| R0 | No evidence found | Agent drafts a chaser, a person approves the send |
| R1 | The evidence contradicts itself | A person only |
| R2 | The agent's answer fails a rule check, cites a message that does not exist, or cannot be read | A person only, with the failed check shown |
| R3 | The evidence explains only part of the gap | Chaser drafted for the rest, a person approves the send |
| R4 | Resolving it sends money back or out of the account | Manual sign-off, whatever the agent says |
| R5 | Fully supported by the evidence | Reviewer approves, amends or overrides, with a reason |

A break that already has a chaser out does not get a second automatic one. The follow-up goes to a person.

## The test data

Eight planted breaks on a fictional fund cash account, each written to test one thing: a bank charge, an FX difference, a value date moved to the next day, a payment received twice, two messages that disagree, a break with no evidence at all, a decoy notice with the right amount on the wrong account, and a charge that explains only part of the gap. Details in `design/breaks.md`. Break types checked against public sources, listed there.

## What testing found

Every test was scored against expected results committed to git before it ran. Full record in `verification.md`.

| Test | Result |
|---|---|
| Run 1 | 5 of 8 |
| Run 2, after three fixes | 8 of 8 |
| Break-it pass 1 (hand-written agent answers) | 8 of 10 |
| Break-it pass 3, after fixes | 11 of 11 |
| Final run, all three lanes by hand | 10 of 10 |

Five things worth knowing, all found by the tests, not designed in up front:

1. **A failure looked like "no evidence".** Cut-off agent answers fell through to "draft a chaser". Unreadable output now goes to a person.
2. **A vague question got a vague answer.** Asked for "the amount", the agent gave the payment total. The rules caught it; the prompt was mine to fix.
3. **The agent reaches.** Even after fixes it pulled in messages about other payments on 2 of 8 breaks. The rules, not the agent, kept them out.
4. **A fix created a new hole.** The rule that set aside other payments also hid an invented source. The break-it pass found it; only a message that exists can now be set aside.
5. **The agent's prose is the one thing the rules do not check.** It named the wrong sender for a reply. Decisions never rest on that sentence, and the review page now shows each source's real sender from the inbox.

## Honest scope

- **All data is synthetic.** A fictional fund cash account and fictional counterparties. Nothing here is about any real client, fund, person, or about Addetto's own work.
- **The AI's outputs are scored, not trusted.** The answer key was committed before any data existed, and every miss is published.
- **Who did what:** Rob designed the breaks, the step-in ladder, the rule checks and the money-out rule, tested every lane by hand and found two of the problems listed above. Claude Code built the workflows through the n8n MCP and wrote the code.
- Rob has not worked in fund operations. The closest he has: reconciliation reporting at Utmost, and bank statement flows at SAP. This is not a copy of Addetto's product.
- **Known gaps:** a draft chaser is not cancelled when its break closes, and the agent's prose can still mislead a reader. Both are in `output/final_run.md`.

## How to run it

1. Import `workflow/the-break-chaser.n8n.json` and `workflow/reset-demo.n8n.json` into n8n, and create the tables from `data/` and `design/answer_key.csv` (steps in `workflow/README.md`).
2. Run **Break Chaser: reset demo**.
3. In **The Break Chaser**, start each lane from its own trigger: Run investigation, then the review form, then the reply form.
4. Rules only, no n8n: `node tests/break_it.js`.

## What is in this repo

| Path | What |
|---|---|
| `design/` | The planted breaks, the step-in ladder (with every change and why), the answer key |
| `data/` | The synthetic breaks and evidence inbox |
| `workflow/` | n8n exports, the rules code, the scoring code |
| `tests/` | The break-it cases |
| `output/` | Every run and test pass, as recorded |
| `verification.md` | All of it in one place |

## Next

- Cancel a draft chaser when its break closes.
- Real procedures and tolerances from a client's operations expert, in place of the ones written for this test.
- A second chase as a person's step with a drafted follow-up, rather than a hand-over with nothing drafted.
