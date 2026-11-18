# Multi-model review: orchestrator brief (frozen)

Runbook for the `arch-opinion-review` run. Frozen at preflight; do not edit after the
first launch.

---

You are the orchestrator of a three-phase, multi-model review of the cogNNitive
repository. You coordinate; you do NOT analyze until phase 3. Everything you write or
delegate is in English. The roster is fixed: do not add, remove or swap a model.

## Target

The object under review is a **set of six improvement proposals (A–F) made by an external
AI about this architecture**, saved verbatim at
`temp/analysis/arch-opinion-review/opinion.md`. The proposals cite the documentation, so
the evidence for or against each one lives in the documentation.

Review only these inputs:

- `docs/documentation/master.md`, **only these line ranges** (≈ 2,700 lines total):
  - `1255–2858` mental model, the four levels, entity-relationship model, ecosystem
    architecture, the specification chain, vocabulary, knowledge lifecycle, sources and
    lineage, storage and identity
  - `2947–3063` validator behavior
  - `3064–3181` integrations and discipline overlaps, including Part A "MCP vs CLI"
  - `3182–3265` interaction flows
  - `3266–3335` MCP tools
  - `3383–3435` CLI and scripts
  - `3480–4042` the skill pages `nn`, `nn-sources`, `nn-innfo`, `nn-preflight`, `nn-update`
  - `4177–4267` the skill page `nn-skills-lifecycle`
- `temp/analysis/arch-opinion-review/opinion.md`, whole file.

Everything outside those ranges is **out of scope**: the tutorials (lines 1–1254), the
tags chapter (2859–2946), the glossary and blueprint catalog (3436–3479), and the site
generator / design presets pages (4043–4176). Do not read them, do not cite them, do not
build findings on them.

Ignore generated, vendored and minified files anywhere in the repo. The goal is a
judgement on each proposal, not an implementation.
Baseline commit for every analyst: `ce776f9d366ec6b5920595aea08006f11ac2be7a`.

## The question every finding answers

For each claim in `opinion.md`: **does it hold against what the documentation actually
says the system does, and is the proposed cure better than the disease?**

A finding is allowed to say "the proposal is right". It is also allowed to say "the
diagnosis is right and the cure is wrong" or "the diagnosis is wrong". What it may not do
is restate the proposal approvingly without checking it, or invent a problem to fill a
quota. The opinion contains claims that are probably false; finding those is the point of
the run. It also contains claims that are probably true and expensive to act on; saying
which and why is equally the point.

## Hard rules

1. Nobody edits repository files outside `temp/analysis/arch-opinion-review/`. Nobody
   commits, pushes or installs anything.
2. **One worktree, shared by the whole panel; one owner per file.** The shared worktree is
   `D:\Users\lucas\Documents\GitHub\cogNNitive-arch-opinion-review`. The primary checkout
   `D:\Users\lucas\Documents\GitHub\cogNNitive` is **read-only**: never write there, never
   create a worktree of your own, never load a skill, never follow the `AGENTS.md`
   session-start ritual. Each analyst writes exactly one file per phase, named after its
   own key, and never writes or edits another analyst's report: with N analysts there are
   N distinct paths and no file two models can both write.
3. Analysts never read each other's reports during phase 1.
4. Do not poll delegates. Follow each delegate's returned `next` and wait for completion
   events.
5. This run needs `delegate_task` with a cross-provider roster. `orchestrator_capabilities`
   was called before the first launch and the exact ids it returned are used below.
6. If a delegate waits on a prompt the orchestrator cannot answer (workspace-trust,
   permission), ask the maintainer. Never answer it on their behalf.

## Setup (done)

1. Session worktree created: `nn-session start --id arch-opinion-review`, branch
   `session/arch-opinion-review`, from `ce776f9d`.
2. `temp/analysis/arch-opinion-review/` created (gitignored).
3. `review-panel_spec_NN.md` copied unchanged from the skill assets.
4. BASELINE: `git status --porcelain` was **empty** at `ce776f9d`.

## Known deviation (record in the provenance README)

T3 Code's MCP tools (`delegate_task`, `orchestrator_capabilities`) are bound to the
thread's project root. Moving the session into the session worktree removed them; the
session therefore stays in the primary checkout as its process cwd, while **every file read
and write in this run uses absolute paths inside the session worktree**. The panel still
has exactly one checkout for its artifacts. No analyst may write to the primary checkout.

## Analysts (confirmed in preflight, not a default)

| Key | Provider | Model | Setting | Estimate |
|---|---|---|---|---|
| `luna` | OpenAI (Codex) | `gpt-6-luna` | `reasoningEffort: high` | $0.03 |
| `sonnet` | Anthropic (Claude) | `claude-sonnet-5-5` | `effort: high` | $0.51 |

## Confirmed cost estimate

- Price date: `2026-11-17`.
- Estimate at preflight rates: **≈ $0.54** total, consolidation runs inline in the parent
  thread. Orientative: prices may be out of date and may contain reading, tier or rename
  errors. Not a quote.
- Analysts in this run: `2`, across two providers (OpenAI, Anthropic). Phase 2 runs; the
  verdict is multi-model.
- Real token spend is not measured in this run. Do not invent a measured figure.

Runtime mode for delegates: `auto-accept-edits` (parent is `full-access`; least permissive
unattended mode).

## Phase 1: independent analysis

Launch both analysts in parallel, each in its own thread with no shared context. Prompt,
replacing `{KEY}`:

> You are a senior engineer reviewing an external architecture critique of this repository.
> Your job is to judge the critique, not to write your own refactor wishlist.
>
> Read the format contract at
> `D:\Users\lucas\Documents\GitHub\cogNNitive-arch-opinion-review\temp\analysis\arch-opinion-review\review-panel_spec_NN.md`
> and follow its writing rules and its "Example: independent analysis" exactly.
>
> Then read the proposal set:
> `D:\Users\lucas\Documents\GitHub\cogNNitive-arch-opinion-review\temp\analysis\arch-opinion-review\opinion.md`
>
> Then read `D:\Users\lucas\Documents\GitHub\cogNNitive-arch-opinion-review\docs\documentation\master.md`
> **only inside these line ranges**: 1255–2858, 2947–3063, 3064–3181, 3182–3265,
> 3266–3335, 3383–3435, 3480–4042, 4177–4267. Everything outside them is out of scope and
> must not be cited. Use offset/limit reads; do not dump the whole file.
>
> The opinion makes six numbered proposals (A: collapse the four levels to two; B: replace
> the `key:: value` DSL with YAML frontmatter and hash canonical JSON; C: one file = one
> entity with paths as ids; D: unify MCP and CLI and cut the tool surface to 8–10
> primitives; E: cut eight skills to two and delete the skills manager; F: drop the `NN`
> branding from technical names) plus a set of "what is well resolved" claims and a list of
> weaknesses.
>
> For each proposal and each weakness claim you judge, decide whether it is **sustained**,
> **partially sustained**, or **refuted** by what the documentation says the system
> actually does — and whether the proposed cure leaves the system better or worse. Tag
> every finding `tags:: [proposal-X, <area>]` (`proposal-A` … `proposal-F`, or
> `verdict-claim` / `weakness-claim` for the other two groups) so the proposal it belongs
> to is machine-readable. Say the verdict in the prose, in one sentence, before the
> argument.
>
> Report between 5 and 12 findings, ordered by impact. Every finding needs a real
> `code_ref` as `path:line` that you have verified by reading the file, and an honest
> `evidence` value. Never invent paths or line numbers. Cite `master.md` line numbers from
> the ranges above, or `opinion.md` line numbers.
>
> Do not invent problems to fill a quota, and do not manufacture objections to a proposal
> that is sound: if the best answer is "this is right and cheap", write that finding.
> Equally, do not accept a proposal because it sounds reasonable — the cost of the cure
> (migration, breaking existing domains, losing provenance) is part of the judgement.
>
> Write your report to
> `D:\Users\lucas\Documents\GitHub\cogNNitive-arch-opinion-review\temp\analysis\arch-opinion-review\independent-analysis-{KEY}.md`,
> section by section, not in one giant write.
>
> Work in the current checkout but write **only** that one file, and only under the
> session worktree path above. Do not create a worktree, do not load any skill, do not
> follow `AGENTS.md` rituals, do not modify or read any other file under
> `temp/analysis/arch-opinion-review/` except the spec and `opinion.md`.
>
> When done, reply with only the relative path of your report, the model you actually ran
> and the commit SHA.

After every analyst finishes, run the **integrity check**:

- `git -C <worktree> status --porcelain` equals BASELINE (nothing changed outside the
  review folder).
- Each report exists, starts with the level 3 frontmatter, and contains at least one
  `## NN Findings:` element.

If a delegate failed or its file is missing or malformed, retry that delegate once with the
same model. If it still fails, continue with the remaining report, record the gap for
phase 3 and tell the maintainer. Never swap the model silently. If the integrity check
shows a change outside the review folder, stop and report it. Do not revert anything.

## Phase 2: cross critique

One new thread per analyst key, same model and settings as phase 1. Prompt, replacing
`{KEY}` and `{OTHER}`:

> You are reviewing an independent review of an external architecture critique of this
> repository. Read `...\temp\analysis\arch-opinion-review\independent-analysis-{OTHER}.md`
> and the format contract `...\review-panel_spec_NN.md`, and follow its writing rules and
> its "Example: cross critique" exactly.
>
> For EVERY finding in that report write exactly one `## NN Critiques:` element with
> `target:: {OTHER}:<ID>` and a `stance`, and justify it in prose after checking the claim
> against the actual documentation. Check the cited line really says what the finding
> claims, and check that the citation falls inside the in-scope ranges (1255–2858,
> 2947–3063, 3064–3181, 3182–3265, 3266–3335, 3383–3435, 3480–4042, 4177–4267 of
> `docs/documentation/master.md`).
>
> If you find a real issue that the report misses, add it under `# NN Findings` with IDs
> `N1`, `N2`, and so on, following the same rules as phase 1.
>
> Write everything to `...\cross-critique-{KEY}.md`, section by section. Do not read your
> own phase 1 report. Work in the current checkout but write only that one file, and only
> under the session worktree path. Do not create a worktree, do not load any skill, and do
> not modify any other file.
>
> When done, reply with only the relative path of your report, the model you actually ran
> and the commit SHA.

Same integrity check, plus: each critique file has one critique per finding of the other
report.

## Phase 3: consolidation (the orchestrator)

Only now read the spec, both analyses and both critiques. Spot-check against the
documentation only the findings where reviewers disagree. Do not decide by majority:
agreement can come from a shared wrong premise, and minority objections must be recorded.
Write `temp/analysis/arch-opinion-review/consolidated-plan-and-verdict.md` with:

1. A short overall verdict: which proposals survive contact with the documentation, which
   do not, and what that says about the critique as a whole.
2. A Markdown vote table: findings as rows, `luna` and `sonnet` as columns, cells `agree`,
   `partially agree` or `disagree`.
3. The decisions, one `## NN Decisions:` element per decision (`covers`, `decision`,
   `consensus`, `priority`), each with a short rationale. One decision per action; merge
   duplicates. A `reject` decision is a legitimate, expected outcome here.
4. Findings rejected or deferred, with the reason. A claim confirmed by no second reviewer
   is deferred, not adopted; name the trigger that would revive it.
5. A suggested execution order, with a first batch of at most 5 decisions.
6. Open questions, gaps from failed delegates, and the models actually run.

## Final report to the maintainer

Short summary: files produced, the verdict on the six proposals in two or three sentences,
the P1 decisions, the models actually run, any integrity problem or retry, and the
preflight estimate labelled `not measured`.
