# Multi-model code review: orchestrator brief (template)

Fill every `{placeholder}` before launching, then save the result as
`temp/analysis/{slug}/orchestrator-prompt.md`. Delete this paragraph from the copy.
Start the orchestrator with one line: "Read `temp/analysis/{slug}/orchestrator-prompt.md`
and execute it completely. It is your full brief; follow its hard rules exactly."

---

You are the orchestrator of a three-phase, multi-model code review of the
cogNNitive repository. You coordinate; you do NOT analyze the code yourself
until phase 3. Everything you write or delegate must be in English.

## Target

Review only these files (about {N} lines):

{bulleted list of repo-relative paths}

Ignore generated, vendored and minified files anywhere in the repo. The goal is
a list of possible refactors, changes and improvements, not an implementation.
Baseline commit for every analyst: `{git rev-parse HEAD}`.

## Hard rules

1. Nobody edits repository files outside `temp/analysis/{slug}/`. Nobody commits, pushes or installs anything.
2. Everyone works in the current checkout. Nobody creates a git worktree, loads a skill or follows the session-start ritual of `AGENTS.md`.
3. Analysts never read each other's reports during phase 1.
4. Do not poll delegates. Follow each delegate's returned `next` and wait for completion events.
5. Call `orchestrator_capabilities` once before the first `delegate_task`, and use the exact provider and model ids it returns.
6. If a delegate waits on a prompt you cannot answer (a workspace-trust or permission question), ask the user. Never answer it yourself.

## Setup

1. Create `temp/analysis/{slug}/` (it is gitignored).
2. Run `git status --porcelain` and keep the output as BASELINE.
3. Verify that `temp/analysis/{slug}/review-panel_spec_NN.md` exists (the format contract, already placed there). If it is missing, stop and report it.

## Analysts

| Key | Provider | Model | Setting |
|---|---|---|---|
| `{key-1}` | {provider} | `{model id}` | `{option}: {value}` |
| `{key-2}` | {provider} | `{model id}` | `{option}: {value}` |
| `{key-3}` | {provider} | `{model id}` | `{option}: {value}` |

Pass settings through `target.options`. For the runtime mode use the least
permissive mode that lets the delegate write its own file without waiting for
approval (prefer `auto-accept-edits`; use `full-access` only if that is the
only unattended mode the provider offers). `approval-required` is not allowed
because it stalls an unattended run.

## Phase 1: independent analysis

Launch the three analysts in parallel, each in its own thread with no shared
context. Use this prompt, replacing `{KEY}`:

> You are a senior engineer reviewing code for possible refactors, changes and
> improvements. Review ONLY {the files above}, at commit `{SHA}`. Read the format
> contract in `temp/analysis/{slug}/review-panel_spec_NN.md` and follow its writing
> rules and its "Example: independent analysis" exactly.
>
> Write your report to `temp/analysis/{slug}/independent-analysis-{KEY}.md`, section by
> section (do not emit the whole report in one write). Report between 5 and 12
> findings, ordered by impact. Every finding needs a real `code_ref` (path:line) that
> you have verified by reading the file, and an honest `evidence` value; never invent
> paths or line numbers. Do not invent problems to fill a quota; point out
> over-engineering and YAGNI violations too. Prefer concrete, actionable
> recommendations over general advice. Work in the current checkout: do not create a
> worktree or load any skill. Do not modify any other file. Do not read any other file
> inside `temp/analysis/{slug}/` except the spec. When done, reply with only the
> relative path of your report, the model you actually ran and the commit SHA.

After all three finish, run the **integrity check**:

- `git status --porcelain` equals BASELINE (nothing changed outside the review folder).
- Each report file exists, starts with the level 3 frontmatter, and contains at least one `## NN Findings:` element.

If a delegate failed or its file is missing or malformed, retry that delegate
once with the same model. If it still fails, continue with the remaining reports,
record the gap for phase 3 and tell the user. Never swap the model silently. If
the integrity check shows a change outside the review folder, stop and report
it. Do not revert anything yourself.

## Phase 2: cross critique

Launch three new threads, one per analyst key, with the same model and
settings as in phase 1. Use this prompt, replacing `{KEY}` and `{OTHERS}` (the
other analyst keys):

> You are reviewing independent code review reports about {the files above}. Read the
> reports `temp/analysis/{slug}/independent-analysis-{OTHERS}.md` (one file per other
> analyst) and the format contract `temp/analysis/{slug}/review-panel_spec_NN.md`.
> Follow its writing rules and its "Example: cross critique" exactly.
>
> For EVERY finding in the other reports write exactly one `## NN Critiques:` element
> with `target:: <author>:<ID>` and a `stance`, and justify it in prose after checking
> the claim against the actual code. If you find a real issue that no report mentions,
> add it under `# NN Findings` with IDs `N1`, `N2`, and so on. Write everything to
> `temp/analysis/{slug}/cross-critique-{KEY}.md`, section by section. Work in the
> current checkout: do not create a worktree or load any skill. Do not modify any
> other file. Do not read your own phase 1 report. When done, reply with only the
> relative path of your report, the model you actually ran and the commit SHA.

Run the same integrity check, plus: each critique file has one critique per
finding of the other reports.

## Phase 3: consolidation (you)

Now, and only now, read the spec, the analyses and the critiques. Spot-check
against the code only the findings where reviewers disagree. Do not decide by
majority: agreement can come from a shared wrong premise, and minority
objections must be recorded. Write
`temp/analysis/{slug}/consolidated-plan-and-verdict.md` with:

1. A short overall verdict on the health of the target code.
2. A Markdown vote table: findings as rows, reviewers as columns, cells `agree`, `partially agree` or `disagree`.
3. The decisions, one `## NN Decisions:` element per decision following the spec (`covers`, `decision`, `consensus`, `priority`), each with a short rationale. One decision per action; merge duplicates.
4. Findings rejected or deferred, with the reason. A claim confirmed by no second reviewer is deferred, not adopted; name the trigger that would revive each deferred item.
5. A suggested execution order, with a first batch of at most 5 decisions.
6. Open questions, gaps from failed delegates and the models actually run.

## Final report to the user

Reply with a short summary in English: files produced, the verdict in two or
three sentences, the P1 decisions, the models actually run, and any integrity
check problem or retry. State that cost was not measured unless you measured it.
