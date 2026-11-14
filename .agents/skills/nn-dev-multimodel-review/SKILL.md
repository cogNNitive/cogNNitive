---
name: nn-dev-multimodel-review
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Runs a three-phase, multi-model review of one bounded piece of code: independent analyses by three models, a cross critique of each other's reports, and a consolidated plan with a verdict by a separate model. Preserves every report, then hands the result to nn-dev-backlog. Trigger: multi-model review, cross review, panel review, review with several models, independent analysis, consensus review of a component.
---

# nn-dev-multimodel-review Skill (Independent Analysis, Cross Critique, Consolidation)

## Overview

`nn-dev-multimodel-review` gets a second, third and fourth opinion on one component
without letting the opinions contaminate each other. Three models analyze the same code
independently, each critiques the other two reports, and a fourth model consolidates a plan
and a verdict. Every report is kept verbatim, so nothing is lost to summarizing.

It is **agent-agnostic**: it names no tool of any specific AI agent. Where a step needs a
capability (start an isolated delegate on a chosen model, wait for it, read files, run a
read-only command), use whatever your agent offers. A non-normative walkthrough for one
agent lives in [`references/t3-code.md`](references/t3-code.md).

Maintainer-only: not under `skills/`, not registered in `manifest/source.yaml`. Sibling of
`nn-dev-backlog`, which receives its output. Version 0.1.0 is distilled from **one** run
(the console builder, 2026-11-14, archived in
`openspec/analysis/2026-11-14-console-builder-review/`); treat the protocol as a first
draft and amend it after the next run.

Read first: `nn-dev-development` (session isolation, lanes) and `nn-dev-backlog` (where the
result goes).

---

## Greeting Protocol (MANDATORY)

When loaded, print as the very first line, once per conversation:

```
🔀 You're using skill: nn-dev-multimodel-review (🔀)
```

---

## 1. When to use it, and when not

Use it for a bounded component where a wrong refactor would be expensive and a single
model's blind spots matter: a builder, a parser, a guard, a public entry point.

Do not use it for a one-file fix, a question with a known answer, a whole package, or code
changing under you. It costs several delegate runs; the payoff is breadth and a record of
disagreement, not speed.

## 2. Setup, before any delegate starts

1. **Scope.** One component, at most about 3,500 lines across a few files. Name the exact
   files. Exclude generated, vendored and minified files; they only add noise. If the
   component is larger, run it per slice.
2. **One code state for everyone.** Record the commit all analysts will read. A delegate that
   starts its own checkout may read a different commit. Verify with
   `git diff <analyzed> <current> -- <files>`: empty means line numbers hold for both.
3. **Roster.** Three analysts from three different providers or model families, at a fast,
   inexpensive tier and a medium reasoning effort, so the opinions are really independent
   and the cost stays proportional. A separate, stronger consolidator that does not analyze
   before phase 3. Record every model id and setting; ids age.
4. **Orchestrator.** One session coordinates and **does not analyze** until phase 3. It
   launches, waits and checks; it never polls.
5. **Where the files go.** A local folder, `.analysis/<topic>/`, excluded in
   `.git/info/exclude` **before** the baseline `git status` is taken (otherwise the excluded
   folder makes the baseline differ). Decide now how the consolidated plan gets written
   (see section 6, lesson 3).
6. **Permissions.** Delegates run unattended, so each needs a mode that lets it write its own
   file without waiting for approval, and nothing broader than that. Expect one provider to
   ask for workspace trust: that is a maintainer decision, never answered by the orchestrator.
7. **Language.** Reports and file names are in English, like every artifact in this repo.

## 3. The three phases

### Phase 1: independent analysis

Each analyst reads only the scoped files and the format contract, and writes one report
`independent-analysis-<key>.md` with 5 to 12 findings ordered by impact. Every finding needs
a `code_ref` (`path:line`) the analyst verified by reading. The prompt must also say: work in
the primary checkout and do not create a worktree, modify nothing else, read no other report.

### Integrity check (after every phase)

- `git status --porcelain` equals the baseline: nothing changed outside the review folder.
- Every expected file exists, has the agreed frontmatter, and every finding has the required
  fields.
- Phase 2 only: each critique covers every finding of the other two reports.

On a missing or malformed report, retry that delegate once; if it still fails, continue
without it and record the gap. On a change outside the folder, stop and report it. Never
revert anything yourself.

### Phase 2: cross critique

Fresh delegates, same models and settings, each reads the **other two** reports and the
code. For every finding of the other two, one critique with a stance (`agree`,
`partially agree`, `disagree`) justified after checking the claim against the code. New
issues go in as findings with ids `N1`, `N2`, and so on; the others never saw them.

### Phase 3: consolidation

The consolidator reads the contract, the three analyses and the three critiques, and
spot-checks against the code **only where reviewers disagree**. It writes
`consolidated-plan-and-verdict.md` with: a short verdict; a vote table (findings by
reviewers); the decisions (covers, decision, consensus, priority, rationale); what was
rejected or deferred and why; a suggested execution order; open questions and every process
gap. It must say which claims it verified and which it did not.

## 4. The format contract

The reports follow a small iNNfo-inspired format: Concepts `Findings`, `Critiques` and
`Decisions`, `key:: value` fields, prose below the fields. It is a convention, not a
validated Level 2 blueprint: no changesets, no matrices, no nn-mcp dependency. The worked
example, with the exact fields, rules and three sample documents, is
`openspec/analysis/2026-11-14-console-builder-review/review-panel-spec.md`; the brief that
drove the run is `orchestrator-prompt.md` in the same folder. Copy both and change the
target, the folder and the roster.

## 5. Hand the result to the backlog

1. **Preserve first.** Commit the raw reports, the format contract, the brief and a
   `README.md` of provenance (date, analyzed commit, models and settings, deviations, how to
   read the ids) under `openspec/analysis/<date>-<topic>/`, in a session worktree. Reports
   are model output: label them as such.
2. **Audit before anything becomes an item.** Run `nn-dev-backlog` Phase 1 over the decisions:
   verify each against the current code with a cited verdict, find overlaps with existing
   entries, apply the lane rule of `nn-dev-development` §2 literally, and score
   value, effort and risk. Archive what the backlog items cannot carry (corrections to the
   plan, overlaps, answers to its open questions) as `audit-verdicts.md` in the same folder.
3. **Make it traceable.** Item ids start with `<topic>-`, `ref::` names the decision, batch
   ids contain the topic, and Ideas name it in their text. One `grep` must list everything
   that came from the review.
4. **Approval gate.** `nn-dev-backlog` §4 applies: nothing is written to the repo or to
   GitHub until the maintainer approves the refined plan. A blanket approval given before
   the audit does not count.
5. Deferred decisions become Ideas, rejected ones get no entry (their reason stays in the
   audit file).

## 6. Lessons from the first run

1. **A delegate may create its own worktree.** One analyst did, and wrote its report there.
   Say "work in the primary checkout" in every prompt, and check the worktree list.
2. **Trust prompts stop an unattended run.** One provider asked whether to trust the
   workspace's hooks. It is a maintainer decision; the orchestrator relays it and waits.
3. **The primary-checkout write hook blocks the orchestrator's own write tool**, even inside
   an excluded folder, while delegates writing through their own runtimes are not blocked.
   Decide before starting: write the consolidated plan from a session worktree, or have the
   maintainer authorize one shell write of that single file.
4. **Line endings and BOMs vary by provider.** Expect CRLF and occasional BOMs. The repo
   normalizes `.md` to LF on commit; strip BOMs and note it in the README. Do not trust a
   delegate's claim about line endings without checking.
5. **Line numbers hold only for the analyzed commit.** Check the diff before acting.
6. **The consolidator verifies only disagreements.** Everything else stays unverified until
   the audit. In the first run the audit corrected 15 points of the plan, among them a false
   premise about who calls a function and a dependency order that did not hold.
7. **Impact claims are inflated without measurement,** especially performance. Mark them
   unproven until measured.
8. **Risk and lane calls by the consolidator are unreliable.** The first plan said two
   decisions "may count as heavy"; applying the lane rule literally made none of them heavy.
   Always run the lane rule yourself.
9. **Single-reviewer findings are weak.** A `consensus: split` decision means "not
   independently reviewed", not "disputed". Audit those first.
10. **Callers decide priority.** Check who actually calls a function before ranking a
    concurrency or contract finding.

## Core Rules

1. **Independence first**: no analyst sees another report in phase 1; the orchestrator does
   not analyze before phase 3.
2. **One code state**: every analyst reads the same commit, verified.
3. **Nothing outside the review folder changes**; check it after every phase.
4. **Keep every report verbatim**; summaries point to the originals, they never replace them.
5. **Reports are model output**, not facts, until the audit gives them a cited verdict.
6. **Audit before backlog**; approval is per item or batch, after the audit.
7. **Run the lane rule yourself**; never inherit it from the consolidator.
8. **Maintainer decisions stay with the maintainer**: trust prompts, write exceptions, lane
   borderlines, publishing.
9. **Stay agent-agnostic** in this file; agent-specific steps go in `references/`.
10. **Amend after every run**: this protocol comes from one run.
