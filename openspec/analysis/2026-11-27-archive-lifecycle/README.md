# Archive lifecycle: multi-model design review

Date: 2026-11-27. This folder archives, unedited, a three-phase review of the proposal
`openspec/changes/archive-lifecycle` by three independent models, plus the consolidation
by a fourth. The reports are model output: read them as opinions with cited evidence,
not as decisions.

Subject: unbounded collections in a domaiNN (procedure runs, artifact-template instances,
very frequent compact elements) bury the active elements in the console and grow every
scan. The proposal answered with an archive lifecycle; the panel judged whether that is
the right lever and what the smallest correct first slice is.

## Provenance

- **Analyzed commit:** `732af61f103c4c4b79aba5d0881dd853c7092283` on `session/archive-lifecycle`
  (the commit that added the proposal). Every `path:line` in the reports refers to it;
  re-locate a line before acting on it.
- **Corpus (1,969 lines):** the proposal delta, `iNNfo/specs/bluepriNNts/executions/spec_NN.md`,
  `iNNfo/specs/bluepriNNts/changes/spec_NN.md`, `nn-core` `naming/contract.ts`,
  `schema/storage.ts`, `lineage/fs-snapshot.ts`, `nn-mcp` `tools/procedure-state.ts`, and the
  open deltas `private-run-outputs` and `execution-rebase-rows`.
- **Analysts (phase 1) and critics (phase 2):**

| Key | Provider | Model | Setting |
|---|---|---|---|
| `argon` | Antigravity | `gemini-4-argon` | `thought_level: high` (default) |
| `luna` | Codex | `gpt-6-luna` | `reasoningEffort: medium` (default) |
| `deepseek` | OpenCode | `opencode-go/deepseek-v4.1-flash` | `variant: high` (default) |

- **Orchestrator and consolidator (phase 3):** `claude-opus-5-5`. It spot-checked in code
  only the claims the reviewers disputed.
- **Cost:** preflight estimate $0.58 at 2026-11-15 rates. Real spend was not measured.

## Deviations

- A single-model critique by Codex `gpt-6.2-sol` preceded the panel in the same conversation.
  It was withheld from the analysts and used in phase 3 only as corroboration.
- The first DeepSeek phase-1 delegate ended `interrupted` without a file. A retry was
  launched; meanwhile a run with a different task id delivered the report, and the retry was
  cancelled before writing so that two writers never shared one file. The delivered report
  was coherent and did not change after completion.
- The format contract was renamed `review-panel-spec.md` here (it was
  `review-panel_spec_NN.md` in the run); the reports' `parent_spec` still name the old file.

## Files

- `orchestrator-prompt.md`: the filled brief (problem, maintainer intent verbatim, corpus, roster).
- `review-panel-spec.md`: the format contract every report follows.
- `independent-analysis-<key>.md`: phase 1, findings `F1`..`Fn` per analyst.
- `cross-critique-<key>.md`: phase 2, one critique per foreign finding, new findings `N1`..
- `consolidated-plan-and-verdict.md`: phase 3, vote table, decisions `D1`..`D11`, execution order.

Ids read as `<key>:<ID>` (for example `deepseek:N1`); decisions as `D<n>`.

## Outcome in one paragraph

Not adoptable as written. Archival is a visibility axis, never a run state or a write to a
closed model (D1). Cold placement, changeset relocation with a seal, compact segment
rotation and a universal archive op are rejected because each breaks an existing contract
(D2, D3, D4, D6). The first slice is an Active / History (N) projection over runs with
`closed: true`, with no writes and no moves (D5), measured separately before any
performance claim (D8). `archive_policy` and the scope of high-volume transactional data are
deferred (D7, D10).
