# Procedure consolidation: multi-model design review

Date: 2026-11-21. This folder archives, unedited, a three-phase review of the draft design
`odd/designs/procedure-consolidation.md` by two independent models, plus the consolidation by a
third. It reviews a DESIGN, not code to patch: the output is a set of decisions about the draft,
not a patch. The reports are model output; read them as opinions with citations, not as facts.

## Provenance

- **Reviewed draft:** `odd/designs/procedure-consolidation.md` as it stood uncommitted on branch
  `session/runner-consolidation-design`, sha256
  `380fbdd69880a1bd5e9993655b8c68d6abb19a7ec197d6abba2fd66713c825e2`. A byte copy is kept here as
  `reviewed-draft.md`. Every `odd/designs/procedure-consolidation.md:<line>` citation in the reports
  refers to that copy.
- **Analyzed code:** `main` `b7ecfa1877b2fca876f8774694bd93e3880390eb`. Commits after it may shift
  line numbers: re-locate a line before acting on it.
- **Corpus:** listed with line ranges in `orchestrator-prompt.md` (4,477 lines measured, trimmed
  to about 3,020). Citations of `temp/analysis/procedure-consolidation-design/corpus/usage_procedures_NN.md`
  point at a read-only copy of a maintainer domaiNN file outside the repo (lines 403-580:
  "Plan an Episode", "Produce an Episode", the Artifact list). That copy is not archived.
- **Analysts (phase 1) and critics (phase 2):**

| Key | Provider | Model | Setting |
|---|---|---|---|
| `gpt` | Codex | `gpt-6.1-terra` | `reasoningEffort: high` |
| `deepseek` | OpenCode | `opencode-go/deepseek-v4.1-flash` | `variant: high` |

- **Orchestrator and consolidator (phase 3):** `claude-opus-5-5`. It coordinated phases 1 and 2
  without analyzing, then read all four reports and verified only the disputed claims in code.

## Deviations

- A third analyst (`gemini-4-neon`, Google) was proposed and removed by the maintainer;
  Antigravity was unavailable (version incompatible with T3 Code).
- Delegates ran in the thread's inherited `full-access` mode instead of `auto-accept-edits`.
- Cost: preflight estimate about $0.51 at 2026-11-15 list prices; not measured.
- Integrity: `git status --porcelain` equalled the baseline after every phase, the draft's hash
  never changed, phase-1 reports were unchanged during phase 2. No retries, no gaps.

## Files

| File | Phase | Content |
|---|---|---|
| `orchestrator-prompt.md` | brief | corpus, questions, roster, estimate |
| `review-panel_spec_NN.md` | contract | the report format |
| `reviewed-draft.md` | input | byte copy of the reviewed draft |
| `independent-analysis-gpt.md` | 1 | 9 findings |
| `independent-analysis-deepseek.md` | 1 | 11 findings |
| `cross-critique-gpt.md` | 2 | critiques of deepseek's report, plus N1-N2 |
| `cross-critique-deepseek.md` | 2 | critiques of gpt's report, plus N1-N2 |
| `consolidated-plan-and-verdict.md` | 3 | verdict, vote table, decisions D1-D11, order, answers |
| `audit-verdicts.md` | audit | `nn-dev-backlog` phase-1 verdicts, overlaps and placement |

## How to read the ids

`gpt:F3` is finding F3 of the gpt report; `N1`, `N2` are findings first raised in a cross
critique. `D1`..`D11` are the consolidated decisions. Backlog entries derived from this review
start with `procedure-consolidation-design-`.
