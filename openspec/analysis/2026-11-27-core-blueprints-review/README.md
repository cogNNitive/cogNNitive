# 2026-11-27 — Core blueprints review (two analysts, two cross-critiques, one verdict)

Provenance for the review that produced the 16 decisions behind "consolidate the core blueprints or
not". The reports were written on 2026-11-27 against `ed80ad93b` and lived only in `temp/`; they
were moved here so the reasoning survives a cleanup. **Content is unchanged. Only Prettier
formatting was applied**, so the repository's format gate accepts them.

## Question under review

`study-proposal.md` proposed collapsing the eight `tier: core` blueprints into "3 + 1":

1. `domaiNN` absorbing the `sources` and `artifacts` catalog responsibilities;
2. `procedures` absorbing `executions`;
3. `changes` retained as-is;
4. `sidecar` retained as a technical satellite;
5. `blank` reclassified out of the core tier.

The panel was asked to attack the proposal, not restate it.

## Method

- Two independent analyses, different providers: `independent-analysis-gemini.md`,
  `independent-analysis-codex.md`.
- Each analyst cross-critiqued the other: `cross-critique-gemini.md`, `cross-critique-codex.md`.
- One consolidator (Claude Opus 5.5) weighed every claim on its evidence and re-read the
  load-bearing citations at the reviewed commit. No majority voting.
- `orchestrator-prompt.md` is the brief the panel received; `review-panel_spec_NN.md` is its
  iNNfo model.
- Result: `consolidated-plan-and-verdict.md`, whose 16 decisions are the deliverable.

## Verdict in one paragraph

The "8 to 3+1" package was **rejected as a plan of record** (D16). Its two load-bearing premises
were false at that commit — `sources_NN.md` does not duplicate sidecars, and `artifacts_NN.md` is
not redundant with run artifacts and lineage — and the `procedures` + `executions` merge is blocked
by a meta-specification gap (`transitions::` exists only from iNNfo `V_0-9-0`) plus the identity of
`Procedure Execution` in D5 addresses. What survived is a small first batch of documentation-drift
fixes and schema clarifications, plus tooling preparation for a later, evidence-driven
consolidation.

| Bucket | Decisions |
|---|---|
| First batch | D1, D2, D3, D4, D5, D6 |
| Next queue | D7, D8, D9 |
| Deferred | D10, D11 |
| Rejected | D12, D13, D14, D15, D16 |

## What happened to each decision

- **D1–D6** shipped in PR #934 (`df699f18c`, merge `ccb213bd7`).
- **D7** shipped in `d290a77c7`, with `iNNfo/packages/nn-core/tests/schema/executions-fsm-transitions.test.ts`.
- **D8** was not done and stays conditional: it needs evidence that the current grouping confuses
  users, and none was produced.
- **D9** was measured on 2026-11-28 and recorded in
  `openspec/analysis/2026-11-28-d9-catalog-usage/README.md`. It found that none of the six catalog
  fields is derivable, so **D10 is not supported** by its own gate.
- **D11** is coordinated from the procedures thread and is not decided here.
- **D12–D16** are closed rejections, not pending work.

## Reading order

1. `consolidated-plan-and-verdict.md` — the verdict and the 16 decisions.
2. `study-proposal.md` — what was proposed.
3. `independent-analysis-*.md` and `cross-critique-*.md` — the raw input, useful for the evidence
   citations behind each decision.
