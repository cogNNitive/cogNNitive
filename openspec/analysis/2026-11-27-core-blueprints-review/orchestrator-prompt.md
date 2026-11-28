# Multi-model code review: orchestrator brief

You are the orchestrator of a three-phase, multi-model code review of the
cogNNitive repository. You coordinate; you do NOT analyze the code yourself
until phase 3. Everything you write or delegate must be in English. The roster
is fixed: do not add, remove or swap a model.

## Target

Review only these files (about 1,589 lines):

- `temp/analysis/core-blueprints-review/study-proposal.md`
- `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md`
- `iNNfo/specs/bluepriNNts/sources/spec_NN.md`
- `iNNfo/specs/bluepriNNts/artifacts/spec_NN.md`
- `iNNfo/specs/bluepriNNts/sidecar/spec_NN.md`
- `iNNfo/specs/bluepriNNts/procedures/spec_NN.md`
- `iNNfo/specs/bluepriNNts/executions/spec_NN.md`
- `iNNfo/specs/bluepriNNts/changes/spec_NN.md`
- `iNNfo/specs/bluepriNNts/blank/spec_NN.md`

Ignore generated, vendored and minified files anywhere in the repo. The goal is
a list of possible refactors, changes and improvements, not an implementation.
Baseline commit for every analyst: `ed80ad93b344089e00d7aa15062b9519b6e3440a`.

## Hard rules

1. Nobody edits repository files outside `temp/analysis/core-blueprints-review/`. Nobody commits, pushes or installs anything.
2. **One worktree, shared by the whole panel; one owner per file.** Everyone works in the
   thread's single checkout. No analyst creates a worktree of its own, loads a skill or follows
   the session-start ritual of `AGENTS.md`. Each analyst writes exactly one file per phase, named
   after its own key, and never writes or edits another analyst's report: with N analysts there
   are N distinct paths and no file two models can both write, so nothing can be overwritten and
   no conflict can arise. A report written in another checkout, or a shared file an analyst had
   to edit, is a defect to stop on, not a workaround.
3. Analysts never read each other's reports during phase 1.
4. Do not poll delegates. Follow each delegate's returned `next` and wait for completion events.
5. This skill needs `delegate_task` with a cross-provider roster. Call `orchestrator_capabilities` once before the first `delegate_task`, and use the exact provider and model ids it returns.
6. If a delegate waits on a prompt you cannot answer (a workspace-trust or permission question), ask the user. Never answer it yourself.

## Setup

1. Review folder: `temp/analysis/core-blueprints-review/` (gitignored).
2. BASELINE commit: `ed80ad93b344089e00d7aa15062b9519b6e3440a`.
3. Format contract: `temp/analysis/core-blueprints-review/review-panel_spec_NN.md`.

## Analysts

| Key | Provider | Model | Setting | Estimate |
|---|---|---|---|---|
| `gemini` | `antigravity` | `gemini-3.8-flash` | standard | $0.13 |
| `codex` | `codex` | `gpt-6.1-terra` | standard | $0.17 |
| `deepseek` | `opencode` | `opencode-go/deepseek-v4.1-flash` | standard | $0.04 |
| `consolidator` | `claudeAgent` | `claude-opus-5-5` | standard | $0.17 |

## Confirmed cost estimate

- Price date: `2026-11-27`.
- Estimate at confirmed rates: `$0.51 USD`. It is orientative: prices may be out of date.
- Analysts in this run: `3`.
- Real token spend is not measured in this run.
