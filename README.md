# The Break Chaser

Investigating a cash reconciliation break usually means chasing someone: the bank, the custodian, the broker. Read the thread, chase, wait, chase again. Addetto names this pain on its homepage: operations teams spend too much time "checking outputs and reconstructing context."

The Break Chaser is a small version of that loop, built in n8n to understand the problem properly. An agent reads the evidence behind each break and proposes an explanation, quoting the line it relied on. Rules check the agent. Where there is no evidence, it drafts a chaser. A person approves anything that leaves the system, and every decision is logged.

## Honest scope

- **All data is synthetic.** A fictional fund cash account and fictional counterparties. Nothing here is about any real client, fund, person, or about Addetto's own work.
- **The AI's outputs are scored, not trusted.** An answer key was written and committed before any data existed, and the misses are published.
- **Who did what:** Rob designed the breaks, the step-in ladder and the rule checks, and checked every result. Claude Code built the workflows through the n8n MCP.
- Rob has not worked in fund operations. The closest he has: reconciliation reporting at Utmost, and bank statement flows at SAP. This is not a copy of Addetto's product.
