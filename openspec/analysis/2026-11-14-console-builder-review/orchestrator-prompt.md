# Multi-model code review: orchestrator brief

You are the orchestrator of a three-phase, multi-model code review of the
cogNNitive repository. You coordinate; you do NOT analyze the code yourself
until phase 3. Everything you write or delegate must be in English.

## Target

Review only these two files (about 3,200 lines):

- `scripts/console-views.mjs`
- `scripts/export-console.mjs`

They build the domaiNN console. Ignore generated, vendored and minified files
anywhere in the repo (`nn-console.bundle.js`, `console-payload.generated.cjs`,
`nn-*.generated.js`, `vendor/`, `*.min.js`). The goal is a list of possible
refactors, changes and improvements, not an implementation.

## Hard rules

1. Nobody edits repository files outside `.analysis/domain-console/`. Nobody commits, pushes or installs anything.
2. Analysts never read each other's reports during phase 1.
3. Do not poll delegates. Follow each delegate's returned `next` and wait for completion events.
4. Call `orchestrator_capabilities` once before the first `delegate_task`, and use the exact provider and model ids it returns.

## Setup

1. Add the line `.analysis/` to `.git/info/exclude` if it is not already there (a local exclude; do not touch `.gitignore`).
2. Run `git status --porcelain` and keep the output as BASELINE. Do this after step 1 so the review folder does not appear in it.
3. Verify that `.analysis/domain-console/review-panel_spec_NN.md` exists (the format contract, already placed there). If it is missing, stop and report it.

## Analysts

| Key | Provider | Model | Setting |
|---|---|---|---|
| `gemini` | antigravity | `gemini-3.8-flash` | `thinking_level: medium` |
| `gpt-luna` | codex | `gpt-6-luna` | `reasoningEffort: medium` |
| `deepseek` | opencode | `opencode-go/deepseek-v4.1-flash` | `variant: high` |

Pass settings through `target.options`. For the runtime mode use the least
permissive mode that lets the delegate write its own file without waiting for
approval (prefer `auto-accept-edits`; use `full-access` only if that is the
only unattended mode the provider offers). `approval-required` is not allowed
because it stalls an unattended run.

## Phase 1: independent analysis

Launch the three analysts in parallel, each in its own thread with no shared
context. Use this prompt, replacing `{KEY}`:

> You are a senior engineer reviewing code for possible refactors, changes and
> improvements. Review ONLY `scripts/console-views.mjs` and
> `scripts/export-console.mjs` in this repository. Read the format contract in
> `.analysis/domain-console/review-panel_spec_NN.md` and follow its writing
> rules and its "Example: independent analysis" exactly.
>
> Write your report to `.analysis/domain-console/independent-analysis-{KEY}.md`.
> Report between 5 and 12 findings, ordered by impact. Every finding needs a
> real `code_ref` (path:line) that you have verified by reading the file; never
> invent paths or line numbers. Prefer concrete, actionable recommendations
> over general advice. Do not modify any other file. Do not read any other file
> inside `.analysis/domain-console/` except the spec. When done, reply with
> only the path of your report.

After all three finish, run the **integrity check**:

- `git status --porcelain` equals BASELINE (nothing changed outside the review folder).
- Each of the three report files exists, starts with the level 3 frontmatter, and contains at least one `## NN Findings:` element.

If a delegate failed or its file is missing or malformed, retry that delegate
once. If it still fails, continue with the remaining reports and record the
gap for phase 3. If the integrity check shows a change outside the review
folder, stop and report it. Do not revert anything yourself.

## Phase 2: cross critique

Launch three new threads, one per analyst key, with the same model and
settings as in phase 1. Use this prompt, replacing `{KEY}` and `{OTHERS}` (the
other two keys):

> You are reviewing two independent code review reports about
> `scripts/console-views.mjs` and `scripts/export-console.mjs`. Read the
> reports `.analysis/domain-console/independent-analysis-{OTHERS}.md` (one file
> per other analyst) and the format contract
> `.analysis/domain-console/review-panel_spec_NN.md`. Follow its writing rules
> and its "Example: cross critique" exactly.
>
> For EVERY finding in the two reports write exactly one
> `## NN Critiques:` element with `target:: <author>:<ID>` and a `stance`, and
> justify it in prose after checking the claim against the actual code. If you
> find a real issue that neither report mentions, add it under `# NN Findings`
> with IDs `N1`, `N2`, and so on. Write everything to
> `.analysis/domain-console/cross-critique-{KEY}.md`. Do not modify any other
> file. Do not read your own phase 1 report. When done, reply with only the
> path of your report.

Run the same integrity check, plus: each critique file has one critique per
finding of the other two reports.

## Phase 3: consolidation (you)

Now, and only now, read the spec, the three analyses and the three critiques.
Spot-check against the code only the findings where reviewers disagree. Write
`.analysis/domain-console/consolidated-plan-and-verdict.md` with:

1. A short overall verdict on the health of the target code.
2. A Markdown vote table: findings as rows, reviewers as columns, cells `agree`, `partially agree` or `disagree`.
3. The decisions, one `## NN Decisions:` element per decision following the spec (`covers`, `decision`, `consensus`, `priority`), each with a short rationale.
4. Findings rejected or deferred, with the reason.
5. A suggested execution order.
6. Open questions and any gaps from failed delegates.

## Final report to the user

Reply with a short summary in English: files produced, the verdict in two or
three sentences, the P1 decisions, and any integrity check problem or retry.
