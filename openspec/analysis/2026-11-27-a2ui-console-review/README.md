# 2026-11-27 — A2UI fit review (four analysts, four providers)

Provenance for the raw reports preserved in this folder. They are **verbatim model output**,
not edited. The only post-processing was moving them here from `temp/analysis/`.

## Question under review

Whether A2UI (Google's agent-to-UI protocol) has a role in cogNNitive: as a definition format
for knowledge units and console components, or as the interchange format of an agent-facing
edit surface that a person could use instead of the console.

The orchestrator's prior answer was expressed as five claims, C1–C5, and the panel was asked to
attack them rather than restate them. The consolidated verdict is in
`consolidated-plan-and-verdict.md`.

## Baseline

- Commit: `ad1ffe0aa1fe3e1842b22c7296a5396cb6f7418a`
- Worktree: `cogNNitive-a2ui-console-review`, branch `session/a2ui-console-review`
- Corpus: `iNNfo/specs/bluepriNNts/console/review.js`, `scripts/console-views.mjs`, and three
  regions of `iNNfo/specs/bluepriNNts/console/ui-kit.js` (L1600-1900, L4180-4260, L5260-5345)
- Lines of corpus: ~3,400 (about 13% over the skill's ~3,000 guideline; `ui-kit.js` was sliced
  from 5,345 lines on purpose)

## Roster and what actually ran

| Key | Provider | Model | Setting | Role |
|---|---|---|---|---|
| alpha | Codex (OpenAI) | `gpt-6.1-terra` | `reasoningEffort: high` | analyst; also critic of beta and gamma |
| beta | Claude (Anthropic) | `claude-sonnet-5-5` | `effort: high` | analyst |
| gamma | Antigravity (Google) | `gemini-4-argon` | `thought_level: high` | analyst; critic of delta |
| delta | OpenCode (DeepSeek) | `opencode-go/deepseek-v4-pro` | `variant: max` | analyst; critic of alpha |
| consolidator | Claude (Anthropic) | `claude-opus-5-5` | `effort: high` | consolidation |

Cost estimate at preflight: **$1.75 + `unknown price` for delta**. Real token spend: **not
measured** — the run does not instrument usage.

## Phases

1. Independent analysis — four reports, isolated, 39 findings total (alpha 9, beta 12, gamma 7,
   delta 11), every one with a real `code_ref` and no `unverified` evidence.
2. Cross critique — 39 critiques, one per finding. **Ring design**, chosen by the maintainer:
   each artifact has exactly one critic instead of three. alpha critiqued beta and, after a
   reassignment, gamma; gamma critiqued delta; delta critiqued alpha.
3. Consolidation — 12 decisions (11 `adopt with changes`, 1 `defer`); 4 `unanimous`, 8 `split`.

## Deviations

1. **A first phase-2 batch was cancelled.** Its prompt carried a wrong total critique count
   written by the orchestrator. It produced no artifacts.
2. **beta was blocked by a Claude rate limit** (5-hour cap, reset 18:20 Europe/Berlin). Its
   assignment, the critique of gamma, was reassigned to alpha, so alpha critiqued two reports
   and the ring became `alpha -> {beta, gamma}`.
3. **Five consolidator attempts.** `claude-opus-5-5` was rate-limited first; `gpt-6-sol` and
   `gpt-6.2-astra` returned HTTP 400 with and without options; `gemini-4-hydrogen` was launched
   and then cancelled by the maintainer when the rate limit was about to reset. The final run
   used `claude-opus-5-5`, the roster model, so the consolidation carries no model deviation.
4. **delta's critique of alpha was soft** (8 agree, 1 partially agree, 0 disagree), so alpha's
   findings carry weaker adversarial testing than the others. The consolidator recorded this.
5. **Ring confirmation rule adapted.** With one critic per finding, the skill's "deferred
   without a second reviewer" rule would have deferred all 39 findings. The adaptation: a
   `disagree` makes a finding contested and the consolidator verifies it in the code; an
   `agree` without a substantive check lowers confidence and priority.

## Findings that came out of the run about this repository

- The brief's console fact "warn 5 MB / fail 15 MB" was **wrong**. `CONSOLE_SIZE_BUDGET` is
  30 MB warn / 100 MB fail (`scripts/console-views.mjs:819`), overridable per domain with
  `console_size_budget_warn` / `console_size_budget_fail`. `skills/nn-console/SKILL.md` and
  `skills/nn-innfo/SKILL.md` repeated the stale numbers and were corrected in the same session.
- `openspec/backlog_NN.md` does not validate at this baseline: batch `b5d-conntent-procedures`
  has `state:: in-review`, which the private blueprint does not allow (only `planned`,
  `in-progress`, `done`). Pre-existing at `ad1ffe0`, not introduced by this work.
- A pre-existing defect outside the A2UI decision: `saveDraft` sets `draft.address`
  (`review.js:795`) but `normalizeDraft` does not keep it (`review.js:101-142`), so every stored
  draft falls back to the legacy `'@' + element_id + fieldPart` key (`review.js:1613`). Whether a
  model-qualified `element_id` reaches `saveDraft` was not verified. It belongs in its own
  backlog item, not in this plan.

## How to read the ids

- `F1`..`Fn` are findings, unique per analyst and never reused.
- `N1`..`Nn` are findings added by a critic in phase 2.
- `target:: alpha:F3` means "this critique is about alpha's finding F3".
- `author:ID` is the addressing form used in `covers::` and in the consolidated vote table.

## Where the decisions went

Registered in `openspec/backlog_NN.md` in the same session:

- Items: `a2ui-d2-edit-projection`, `a2ui-d7-authority-boundary`,
  `a2ui-d9-no-renderer-in-bundle`, `step-request-interactive-input`.
- Ideas: A2UI as host-side rendering (carries D4 step 2, D8, D10, D11, D12), MCP App for the
  single-view export, draft intake validation, draft record versioning.

`step-request-interactive-input` extends the open `openspec/changes/step-request`; it must be
added to that change's delta, never opened as a parallel spec.
