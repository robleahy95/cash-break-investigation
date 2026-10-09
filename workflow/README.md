# Workflow files

n8n is where the workflows run. These files are exports of the live versions, taken 9 October 2026.

- `the-break-chaser.n8n.json`: the main workflow, 28 nodes in three lanes (Investigate, Review, Counterparty reply). Import into n8n with Workflows > Import from file.
- `reset-demo.n8n.json`: clears the run tables, reopens all breaks and removes counterparty replies, so a demo starts clean.
- `rules_and_ladder.js`: the code inside "Rules check the agent + step-in ladder" (rule checks, then R0 to R5).
- `score.js`: the code inside "Score against the answer key".

On import, the Data Table IDs point at the original n8n project. In a new project, recreate the tables (`bc_breaks`, `bc_evidence`, `bc_answer_key`, `bc_proposals`, `bc_outbox`, `bc_audit_log`, `bc_precedents`, `bc_scorecard`) from `../data/` and `../design/answer_key.csv`, then reselect each table in its node. Column schemas are rebuilt by n8n on import. The Claude step uses n8n's AI gateway credits; on another instance, attach an Anthropic credential.

Earlier build files (SDK sources, the first single-lane workflow) are in git history before this commit.
