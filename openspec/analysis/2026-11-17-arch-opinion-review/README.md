# arch-opinion-review — multi-model review of an external architecture critique

Run 2026-11-17, completed 2026-11-18. Skill: `nn-dev-multimodel-review` (V of record at
`.agents/skills/nn-dev-multimodel-review`).

## What was reviewed

An architecture opinion the maintainer received from an external AI: five "well resolved"
claims, six "excessive complexity" weaknesses, and six proposals (A–F) to simplify the four
levels, the DSL, the storage model, the MCP/CLI split, the eight skills, and the `NN`
branding.

The object under review is the **documentation's account** of the architecture, not the
implementation. Every claim in these reports is about what `docs/documentation/master.md`
says the system does. A code audit is a separate step.

- Analyzed commit: `ce776f9d366ec6b5920595aea08006f11ac2be7a`
- Corpus: `docs/documentation/master.md` restricted to lines `1255–2858`, `2947–3063`,
  `3064–3181`, `3182–3265`, `3266–3335`, `3383–3435`, `3480–4042`, `4177–4267` (≈ 2,700
  lines), plus the verbatim opinion (`opinion.md`).
- Out of scope: tutorials (1–1254), tags chapter (2859–2946), glossary and blueprint
  catalog (3436–3479), site generator and design presets (4043–4176).

## Models actually run

| Key | Provider | Model | Setting | Phases |
|---|---|---|---|---|
| `luna` | OpenAI (Codex) | `gpt-6-luna` | `reasoningEffort: high` | 1, 2 |
| `sonnet` | Anthropic (Claude) | `claude-sonnet-5-5` | `effort: high` | 1, 2 |

Two providers, so the panel is multi-model; `single_provider_panel: false`. Consolidation
ran in the parent thread (OpenCode / `deepseek-v4.1-flash`). Estimate ≈ $0.54 list price,
**not measured** — the run does not instrument token spend.

## Files

Reports are **verbatim model output**, committed unchanged except for the LF normalization
that this repository's own git hooks apply to Markdown. They are model claims, not audited
facts.

| File | Author | Role |
|---|---|---|
| `opinion.md` | the external AI, via the maintainer | the object under review |
| `orchestrator-prompt.md` | the orchestrator | frozen brief: scope, roster, phase prompts |
| `review-panel_spec_NN.md` | skill asset | format contract, copied unchanged |
| `independent-analysis-luna.md` | gpt-6-luna | phase 1 |
| `independent-analysis-sonnet.md` | claude-sonnet-5-5 | phase 1 |
| `cross-critique-luna.md` | gpt-6-luna | phase 2, critiques sonnet |
| `cross-critique-sonnet.md` | claude-sonnet-5-5 | phase 2, critiques luna |
| `consolidated-plan-and-verdict.md` | orchestrator | phase 3, after spot-checking claims |

## How to read the ids

- `luna:F1`, `sonnet:F8` — a finding from that analyst's phase-1 report.
- `sonnet:N3` — a finding introduced during phase 2 by sonnet alone (no second reviewer).
- `D1`…`D10` — consolidated decisions, in `consolidated-plan-and-verdict.md`.
- `master.md:NNNN` — a line in `docs/documentation/master.md` **at the analyzed commit**.
  Line numbers are valid only for that SHA.

## Outcome

Five of six proposals are rejected as stated; one contains a change worth making on its own
terms (`remove_model`), and two contain a salvageable slice (folding true sibling MCP tools,
merging the two UI skills). Three of the opinion's premises are refuted outright: the
network/cache failure that proposal A claims to remove does not exist, the CRLF hazard that
proposal B claims to solve is already handled by policy, and the "silent preflight" of
proposal E is already the documented behaviour on success.

## Deviations from the skill

1. **Session cwd.** T3 Code's MCP tools (`delegate_task`, `orchestrator_capabilities`) are
   bound to the thread's project root: moving the session into the session worktree removed
   them. The session therefore stayed in the primary checkout as its process cwd, while
   every read and write in the run used absolute paths inside the session worktree
   (`../cogNNitive-arch-opinion-review`). The panel still had exactly one checkout for its
   artifacts; nothing was written to the primary.
2. **Panel size.** The preflight default is three analysts across three providers. The
   maintainer reduced it to two (OpenAI + Anthropic). Phase 2 still ran, and the verdict is
   multi-model, but there is no third lineage to break a shared wrong premise.
3. **Corpus above the cap.** `master.md` is 4,267 lines, over the skill's ~3,000-line cap.
   The maintainer confirmed a section cut rather than a whole-file review.

## Gaps recorded by the run

- Both analysts produced exactly 12 findings, the stated maximum, and the critiques found
  padding in both. Where padding was found it is recorded in the consolidated verdict; no
  adopted decision rests on a padded finding.
- `sonnet:N1`–`N5` have no second reviewer. N2–N5 were verified independently by the
  consolidator against the cited lines; N1 is accepted for one half and corrected on the
  other.
- The documentation contradicts itself on the MCP tool count (24 in prose, 23 table rows),
  which this run could not resolve.
