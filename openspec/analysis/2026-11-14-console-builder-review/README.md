# Console builder: multi-model code review

Date: 2026-11-14. This folder archives, unedited, a three-phase review of the
domaiNN console builder by three independent models, plus the consolidation by a
fourth. It is the supporting documentation for the backlog entries whose ids start
with `console-builder-`.

Scope: `scripts/console-views.mjs` and `scripts/export-console.mjs` (about 3,200
lines). Generated, vendored and minified files were out of scope.

## Provenance

- **Analyzed code:** the primary checkout at `main` `716685b0` (Gemini and DeepSeek).
  GPT-6 Luna worked in its own session worktree cut from `origin/main` `551d5a18`.
  `git diff 716685b0 551d5a18` over the two reviewed files is empty, so line numbers in
  every report are valid for both. Commits after `551d5a18` may shift them: re-locate a
  line before acting on it.
- **Analysts (phase 1) and critics (phase 2),** with the settings requested in the
  brief:

| Key | Provider | Model | Setting |
|---|---|---|---|
| `gemini` | Antigravity | `gemini-3.8-flash` | `thinking_level: medium` |
| `gpt-luna` | Codex | `gpt-6-luna` | `reasoningEffort: medium` |
| `deepseek` | OpenCode | `opencode-go/deepseek-v4.1-flash` | `variant: high` |

- **Orchestrator and consolidator (phase 3):** `claude-sonnet-5-5`, effort `high`.
  It coordinated phases 1 and 2 without analyzing, then read all six reports.

## Files

| File | Phase | Content |
|---|---|---|
| `independent-analysis-gemini.md` | 1 | 10 findings |
| `independent-analysis-gpt-luna.md` | 1 | 5 findings |
| `independent-analysis-deepseek.md` | 1 | 12 findings |
| `cross-critique-gemini.md` | 2 | critiques of the other two reports, plus new findings |
| `cross-critique-gpt-luna.md` | 2 | same |
| `cross-critique-deepseek.md` | 2 | same |
| `consolidated-plan-and-verdict.md` | 3 | verdict, vote table, decisions D1 to D25, execution order, open questions |
| `audit-verdicts.md` | after 3 | the `nn-dev-backlog` audit of the 25 decisions against the code: corrections to the plan, register overlaps, answers to its open questions |
| `review-panel-spec.md` | n/a | the format contract the reports follow (named `review-panel_spec_NN.md` when the reports were written; renamed here so tools that scan `*_NN.md` do not treat it as an iNNfo document) |
| `orchestrator-prompt.md` | n/a | the brief the orchestrator executed |

The reports carry no edits: only the line endings differ, because git normalizes
Markdown to LF (see `.gitattributes`). GPT-6 Luna's phase 1 report was copied from its
worktree and its UTF-8 BOM removed (the files differ by those three bytes).

## How to read them

- A finding id is `<author>:F<n>`; findings raised during phase 2 are `<author>:N<n>`.
- A critique `stance` is `agree`, `partially agree` or `disagree`.
- A decision `D<n>` lists the findings it resolves in `covers`. The chain is
  backlog item, decision, finding, `code_ref` in the code.
- `consensus: split` on a decision means the finding was raised by one reviewer and
  not independently reviewed. It does not mean anyone disagreed.

## Status of the claims

The reports are model output, not verified fact, and they carry no verified/measured/
inferred labels. The orchestrator checked the code only where reviewers disagreed
(listed in section 6 of the consolidated plan). `D4` was verified at
`scripts/export-console.mjs:1988` versus `:2089`. The `nn-dev-backlog` audit in
`audit-verdicts.md` then verified every decision against the code and found 15 corrections
to the plan; the claims in the three analyses and critiques themselves stay model output.

## Process deviations

- The Gemini phase 1 delegate paused on a workspace-trust prompt; the maintainer
  answered "Trust Workspace".
- GPT-6 Luna created its own session worktree instead of writing in the review folder.
- The primary-tree write hook blocked the consolidated plan's first write; the maintainer
  authorized writing that single file with Bash.

## Backlog traceability convention

- Every backlog item id from this review starts with `console-builder-` (for example
  `console-builder-d01-csp-hash`, where `d01` is decision D1). Every batch id contains it
  after the phase prefix (for example `b10a-console-builder-csp-hash`), and every Idea names
  it in its text. `grep console-builder- openspec/backlog_NN.md` lists everything that
  came from this review.
- `ref::` points at the decision:
  `openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D<n>`.
- Any GitHub issue opened from it carries the label `source:console-builder-review`
  and links this folder and the decision id in its body.
