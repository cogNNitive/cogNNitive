---
name: nn-dev-multimodel-review
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Runs an in-depth multi-model review of ONE repo component (about 3,000 lines at most) to find refactors, changes and improvements - N independent analyses, a cross critique, then a consolidated plan, with a roster and cost estimate confirmed before launch. Read-only; never applies changes. Trigger: multi-model review, multimodel analysis, three models, cross review, refactor opportunities, improvement analysis of a component, cost estimate for a review.
---

# nn-dev-multimodel-review

Distilled from two runs on 2026-11-14 (the domain console builder review and the
repo improvement-plan review). Maintainer-only; sibling of `nn-dev-development` and
`nn-dev-backlog`. Agent-agnostic except for the delegation step, which assumes a
`delegate_task`-style tool that can target other providers' models.

## Greeting (once per conversation)

```
🔬 You're using skill: nn-dev-multimodel-review (🔬)
```

## 1. When to use

- **Use** for one component or a handful of files, up to about 3,000 lines, where you want
  independent opinions on refactors, changes and improvements.
- **Do not use** for a whole repo (a repo-wide run needed a mid-flight process document and
  unequal inputs skewed the results), for a bug fix, or for anything you will apply
  right away. The output is a plan, never a patch.
- Measure the target (`wc -l`) before anything else. Over the cap: ask the maintainer to cut
  the scope. Exclude generated, vendored and minified files.

## 2. Preflight (each item prevented a real stall)

1. Work in a session worktree (`nn-dev-development` §1). Write everything under
   `temp/analysis/<slug>/` (already gitignored). Never write in the primary checkout.
2. **Build and confirm the roster. Run §2a before launching anything.** The roster is a
   proposal, not a fixed three: the maintainer unmarks, adds and swaps models, and sees the
   cost delta of every change.
3. Ask the maintainer to pre-approve every provider's workspace-trust prompt before
   launching. An untrusted workspace stalled one analyst for 2 hours.
4. Runtime mode: the least permissive mode that lets a delegate write its own file without
   asking (prefer `auto-accept-edits`). Never `approval-required`.
5. Record BASELINE: `git status --porcelain` and `git rev-parse HEAD`. Every analyst gets the
   same inputs and the same SHA.
6. Copy the two assets into `temp/analysis/<slug>/`: fill `assets/orchestrator-prompt.md`
   (placeholders in braces) and copy `assets/review-panel_spec_NN.md` unchanged.

### 2a. Roster and cost estimate (mandatory, before the first launch)

The three-model default is a proposal that keeps three different providers, so the panel
never shares one lineage's wrong premise. It is not a fixed list: the maintainer confirms it,
and may unmark any entry or add one that is not proposed.

**Step 1 — Measure the corpus.** Never estimate a cost from a guess about size.

```bash
wc -l <each target file>     # corpus_lines
```

`corpus_tokens ≈ corpus_lines × 40` (rough heuristic for code; say it is a heuristic).
Add the format contract (`review-panel_spec_NN.md`, about 5,900 tokens).

**Step 2 — Model each phase.** Entry and exit tokens per analyst:

| Phase | Input per analyst | Expected output |
|---|---|---|
| 1 Independent analysis | corpus + spec | 5–12 findings, ≈1,200–2,000 tok |
| 2 Cross critique | corpus + spec + the other reports | ≈2,500 tok |
| 3 Consolidation | every report + spec | ≈3,200 tok |

With e analysts the run costs `e × phase1 + e × phase2 + phase3`. Cost each candidate at its
own input/output rates; cache reads only apply when the same prompt prefix repeats, so do not
claim them without evidence.

**Step 3 — Show the roster and the total.** One table, cost per entry, then the delta of the
alternatives the maintainer could swap in:

```
Analysed: <files> (<N> lines ≈ <T> tokens)

Roster proposed — prices at <YYYY-MM-DD>

  #  role           model                 provider    estimate
  1  analyst        gemini-3.8-flash      Google      $0.36
  2  analyst        gpt-6-luna            OpenAI      $0.04
  3  analyst        deepseek-v4.1-flash   DeepSeek    $0.07
  -  consolidator   claude-sonnet-5-5     Anthropic   $0.11
  ──────────────────────────────────────────────────────────
                                    TOTAL ESTIMATE   $0.58

  Also available: <model> $X · <model> $Y · <model> $Z

  ⚠ Orientative prices at <YYYY-MM-DD>. They may be out of date (name the
    scheduled change you know about, e.g. a model whose price doubles on a
    published date) and they may contain errors: a misread rate, the wrong
    tier, or a model that was renamed. This is not a quote. Verify against
    the provider's page when the figure decides a purchase.
```

**Step 4 — Apply the maintainer's edits.** Unmarking and adding are both allowed. After each
edit the total and the delta update. A model with no published rate is listed as
`unknown price`, announced to the maintainer, and does not block the run: it stays in the
roster with that label so nobody later reads an estimate that silently omitted it.

**Step 5 — Enforce the floor.** At least one analyst is required. One analyst is allowed, but
it must be declared: with a single analyst there is no cross-critique, so the report carries
`no_cross_critique: true`, phase 2 does not run, and the verdict is not multi-model. Say it
inline before launching:

```
  ⚠ One analyst only: no cross-critique. The report will declare
    no_cross_critique: true and the verdict is not multi-model.
```

**Step 6 — Freeze.** Copy the confirmed roster, the estimate and the price date into the
brief. An edited roster is the roster the run uses.

Rate table, verification dates and the unknown-price rule: see `## 10. Cost model`.

## 3. Phases

| # | Who | Output | Rule |
|---|---|---|---|
| 1 | <N> analysts, in parallel | `independent-analysis-<key>.md` | Isolated: nobody reads another report |
| 2 | the same analysts, fresh threads | `cross-critique-<key>.md` | One critique per foreign finding; new findings are `N1`.. |
| 3 | orchestrator | `consolidated-plan-and-verdict.md` | Verify only the disagreements in code |

Phase 2 does not run when the confirmed roster has one analyst. Phase 1 runs with however many
the maintainer confirmed; the phased shape does not change because an entry was unmarked or
added.

Between phases run the integrity check: `git status --porcelain` equals BASELINE, each
report exists with level 3 frontmatter, critiques cover every foreign finding. A change outside
`temp/analysis/<slug>/` stops the run; do not revert it yourself.

## 4. Brief rules (every analyst prompt must carry them)

- Scope: the exact files; everything else is out of scope.
- Evidence: every finding needs a `path:line` the analyst read; `evidence` is `verified`,
  `inferred` or `unverified`. Findings without evidence are dropped.
- YAGNI: "do not invent problems to fill a quota"; 5 to 12 findings; flag over-engineering.
- Write only the assigned file, in the current checkout. **No worktree, no skill loading, no
  `AGENTS.md` session ritual**: one analyst created its own worktree otherwise.
- Write the report section by section. One huge single write timed out twice on a slow model.
- UTF-8 without BOM, LF endings.
- Last line of the reply: the relative path, the model actually run and the SHA.

## 5. Consolidation rules

- No majority vote. Record minority objections.
- Agreement among models is not proof: they can share a wrong premise.
- One decision per action; merge duplicates. Group: first batch (3 to 5 decisions), next queue,
  deferred (name the trigger), rejected or already solved.
- Single-reviewer claims nobody confirmed are deferred, not adopted.

## 6. Failures

- Do not poll; wait for each delegate's completion event.
- Failed or malformed delegate: retry once with the same model. Still failing: record the gap and
  ask the maintainer. Never swap models silently.
- A delegate waiting on a prompt you cannot answer: ask the maintainer, do not answer for them.

## 7. Output

Report to the maintainer: files produced, verdict in 2 to 3 sentences, the first-batch
decisions, retries and gaps, the models actually run, and the preflight estimate next to
`not measured` (the run does not instrument real token spend; see §10). Applying anything is
a separate decision; register items through `nn-dev-backlog`. Delete
`temp/analysis/<slug>/` only when the maintainer says so.

## 8. Hand-off: preserve, audit, register

`temp/analysis/<slug>/` is scratch. Before it is deleted, and before anything becomes
backlog work:

1. **Preserve.** In a session worktree, commit the raw reports, the filled brief, the format
   contract and a provenance `README.md` (date, analyzed SHA, models and settings,
   deviations, how to read the ids) to `openspec/analysis/<date>-<slug>/`. Keep the reports
   verbatim and label them as model output. Worked example:
   `openspec/analysis/2026-11-14-console-builder-review/`.
2. **Audit before registering.** Run `nn-dev-backlog` Phase 1 over the decisions: verify each
   against the current code with a cited verdict, find overlaps with existing entries,
   apply the lane rule of `nn-dev-development` §2 literally, and score value, effort and
   risk. Archive what the items cannot carry (corrections to the plan, overlaps, answers to
   its open questions) as `audit-verdicts.md` in the same folder.
3. **Make it traceable.** Item ids start with `<slug>-d<nn>-`, `ref::` names the decision,
   batch ids contain the slug, Ideas name it in their text. One `grep` lists everything that
   came from the review.
4. **Approval gate.** `nn-dev-backlog` §4 applies; a blanket approval given before the audit
   does not count. Deferred decisions become Ideas; rejected ones get no entry (the reason
   stays in the audit file).

## 9. Lessons from the console builder audit

What the audit found after the consolidator was done (15 corrections to its plan):

1. Line numbers hold only for the analyzed SHA: check `git diff <sha> HEAD -- <files>`.
2. The consolidator verifies only disagreements; the rest stays unverified until the audit.
   One correction was a false premise about who calls a function.
3. Check callers before ranking a concurrency or contract finding.
4. Impact claims, especially performance, are inflated without measurement; mark them unproven.
5. The consolidator's lane and risk calls are unreliable: run the lane rule yourself.
6. `consensus: split` means one reviewer only, not "disputed"; audit those first.
7. Providers write CRLF and sometimes a BOM. The repo normalizes `.md` to LF on commit; strip
   BOMs and do not trust a delegate's claim about line endings.

A walkthrough of the first run in T3 Code (roster, settings, quirks) is in
[`references/t3-code.md`](references/t3-code.md); it is non-normative.

## 10. Cost model

### Rate table

USD per million tokens at the provider's standard (non-batch) tier. Re-read every row
against the provider's own pricing page before a run where the figure decides anything; the
table exists so the preflight has a starting point, not so the run inherits stale numbers.

| Model | Provider | Input | Output | Cached input | Verified | Note |
|---|---|---|---|---|---|---|
| Gemini 3.8 Flash | Google | $0.75 | $3.75 | $0.075 | 2026-11-15 | Introductory rate; $1.50 / $7.50 from 2027-01-01 |
| Gemini 4 Argon | Google | $2.00 | $10.00 | $0.10 | 2026-11-15 | $4.00 / $20.00 from 2026-12-01 |
| GPT-6 Luna | OpenAI | $0.10 | $0.50 | $0.01 | 2026-11-15 | Over 272K input the whole request doubles |
| GPT-6.1 Terra | OpenAI | $1.00 | $5.00 | $0.05 | 2026-11-15 | Same long-context rule |
| GPT-6.1 Sol | OpenAI | $2.00 | $10.00 | $0.10 | 2026-11-15 | Same long-context rule |
| DeepSeek V4.1 Flash | DeepSeek | $0.15–0.30 | $0.60–1.20 | $0.003–0.006 | 2026-11-15 | Peak doubles; 01–04 and 06–10 UTC, Mon–Fri |
| Claude Haiku 5.5 | Anthropic | $0.10 | $0.50 | — | 2026-11-15 | |
| Claude Sonnet 5.5 | Anthropic | $2.00 | $10.00 | $0.10 | 2026-11-15 | |
| Claude Opus 5.5 | Anthropic | $4.00 | $20.00 | $0.20 | 2026-11-15 | |

When a rate is unknown for a model the maintainer asks for, list it as `unknown price`,
tell the maintainer, and keep it in the roster. Never invent a rate, never silently drop the
model, and never let an omission turn into a total that reads complete.

### Two columns, and what each one means

Every estimate states both, and never mixes them:

- **List price.** What the same tokens would cost paid per token at API rates. Absolute and
  comparable across models; it is what decides whether a plan beats an API key.
- **Plan consumption.** How much of an existing subscription the run eats. Measured in
  dollars only where the provider meters in dollars (OpenCode Go bills per model in dollars);
  everywhere else the plan publishes no token or dollar cap, so it is an imputation, and the
  report must label it that way rather than present a percentage it cannot know.

### Worked estimate: the 2026-11-14 console builder review

Corpus 3,200 lines ≈ 128,000 input tokens per analyst; format contract ≈ 5,900 tokens;
three analysts and one consolidator.

| Phase | Input tokens | Output tokens |
|---|---|---|
| 1 Independent analysis | 3 × (128,000 + 5,900) = 402,000 | 4,776 |
| 2 Cross critique | 3 × (128,000 + 12,000 + 5,900) ≈ 438,000 | 7,360 |
| 3 Consolidation | 31,000 | 4,275 |
| **Total** | **≈ 871,000** | **≈ 16,400** |

List price: Gemini $0.36, GPT-6 Luna $0.04, DeepSeek $0.07, Sonnet $0.11 — **≈$0.58** at the
2026-11-15 rates, ≈$0.89 with Gemini and DeepSeek at peak, ≈$0.95 with Opus as consolidator.
Plan consumption for that same run: OpenCode $0.07 (0.07% of the month); the other three are
imputations. The number to remember is that a well-scoped review of about 3,000 lines costs
cents, so roster choice is a quality decision, not a budget one.

### Measuring the real cost is out of scope

The run does not instrument token spend: delegates are not required to report usage, so no
figure here is measured. Say `not measured` next to the estimate. A general per-delegate
cost-metering mechanism would serve every phase that launches subagents, not only this skill,
so it is registered as a backlog Idea rather than bolted onto this skill.

