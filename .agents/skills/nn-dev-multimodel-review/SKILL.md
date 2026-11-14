---
name: nn-dev-multimodel-review
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Runs an in-depth multi-model review of ONE repo component (about 3,000 lines at most) to find refactors, changes and improvements - three independent analyses, a cross critique, then a consolidated plan. Read-only; never applies changes. Trigger: multi-model review, multimodel analysis, three models, cross review, refactor opportunities, improvement analysis of a component.
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
2. Ask which three models to use, one question at a time. Defaults: three fast, cheap models
   from three different providers. The orchestrator is a fourth model and does not analyze
   until phase 3. Verify real ids with `orchestrator_capabilities` (call it once).
3. Ask the maintainer to pre-approve every provider's workspace-trust prompt before
   launching. An untrusted workspace stalled one analyst for 2 hours.
4. Runtime mode: the least permissive mode that lets a delegate write its own file without
   asking (prefer `auto-accept-edits`). Never `approval-required`.
5. Record BASELINE: `git status --porcelain` and `git rev-parse HEAD`. Every analyst gets the
   same inputs and the same SHA.
6. Copy the two assets into `temp/analysis/<slug>/`: fill `assets/orchestrator-prompt.md`
   (placeholders in braces) and copy `assets/review-panel_spec_NN.md` unchanged.

## 3. Phases

| # | Who | Output | Rule |
|---|---|---|---|
| 1 | 3 analysts, in parallel | `independent-analysis-<key>.md` | Isolated: nobody reads another report |
| 2 | the same 3, fresh threads | `cross-critique-<key>.md` | One critique per foreign finding; new findings are `N1`.. |
| 3 | orchestrator | `consolidated-plan-and-verdict.md` | Verify only the disagreements in code |

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
decisions, retries and gaps, and the models actually run. Applying anything is a separate
decision; register items through `nn-dev-backlog`. Delete `temp/analysis/<slug>/` only when
the maintainer says so.

Not yet measured in either run: token and money cost. Say so instead of guessing.
