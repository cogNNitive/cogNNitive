---
name: nn-dev-backlog
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Audits the three work registers (OpenSpec changes, open GitHub issues, the backlog document), verifies each entry against current code, finds overlaps, proposes the right home for each entry, and plans implementation in batches by effort, risk and value. Two phases with a maintainer approval gate between them. Trigger: audit backlog, backlog review, triage ideas, backlog migration, plan batches, capture idea.
---

# nn-dev-backlog Skill (Backlog Audit & Batch Planning)

## Overview

`nn-dev-backlog` keeps the cogNNitive work registers honest. It exists because the old
`openspec/backlog.md` grew to ~1100 lines and was pruned by hand six times.

It is **agent-agnostic**: it names no tool of any specific AI agent. Where a step needs a
capability (read files, run a command, delegate), use whatever your agent offers.

Maintainer-only: not under `skills/`, not registered in `manifest/source.yaml`.
Sibling of `nn-dev-development`, `nn-dev-issue-tracking`, `nn-dev-release`.
Scope: repository root plus the `cogNNitive` GitHub repo.

Read first: `nn-dev-development` (session isolation, change-size lanes §2b) and
`nn-dev-issue-tracking` (it owns every GitHub issue mutation).

---

## Greeting Protocol (MANDATORY)

When loaded, print as the very first line, once per conversation:

```
🗂️ You're using skill: nn-dev-backlog (🗂️)
```

---

## 1. The registers

| Register | Where | Holds |
|----------|-------|-------|
| **Changes** | `openspec/changes/` (excluding `archive/`) | Heavy-lane work with a proposal |
| **Issues** | GitHub issues of `cogNNitive` | Reproducible defects, small light-lane work |
| **Backlog** | `openspec/backlog_NN.md` | Ideas and triaged items not yet started |

`backlog_NN.md` is a kNNowledge document structured by the private bluepriNNt
[`blueprint/spec_NN.md`](blueprint/spec_NN.md) (`parent_spec.url` is the repo-relative path
`.agents/skills/nn-dev-backlog/blueprint/spec_NN.md`). The blueprint is private: it is **not**
distributed and must stay outside `iNNfo/specs/bluepriNNts/` (that tree is covered by the
template inventory guard).

The document has three zones:

1. **Inbox** — `Idea` elements: one line of text plus a `captured` date. Nothing else.
2. **Triaged** — `Item` elements with `value` (L/M/H), `effort` (S/M/L), `risk` (L/M/H),
   `status`, `lane`, `verdict`, `evidence`, `merged_from`, `done_when`, optional `ref`/`batch`.
3. **Batches** — `Batch` elements: the **approved** plan (order, lane, items, risk, state).

There is no Now/Next/Later: batches already encode order.

---

## 2. Capture (any time, no ceremony)

Adding an idea is one line in the Inbox. No scoring, no analysis, no audit.

- It needs a write, so it needs a session worktree (`nn-dev-development` §1a). Every write
  session already has one; add the line there and let it travel with the session's commit.
- From a read-only conversation in the primary checkout, start a worktree solely for the line.
- Never triage while capturing.

---

## 3. Phase 1 — Audit (read-only)

On demand only. Produces a report; writes nothing to the repo.

### 3a. Inventory
List every open change, every open issue, every Inbox idea and Triaged item.

### 3b. Verify against current code
Give every entry exactly one verdict:

| Verdict | Requirement |
|---------|-------------|
| **current** | The symptom or gap is still reproducible. Cite `file:line`, a test, or a commit. |
| **obsolete** | Already fixed or shipped, or superseded. Cite `file:line`, a test, or the commit/PR. |
| **unverifiable** | Evidence is inconclusive. The maintainer decides. |

Rules: no verdict without a citation except `unverifiable`; verify against code, **never**
against the title or the entry's own status text; never retire by default; do not map a
reference to a plausible-looking path when the path does not exist. A reasoning shortcut
("sounds fixed") is not evidence.

### 3c. Overlaps
Find entries describing the same functionality, defect or code area, across registers
(a change and an issue, two items, an item and an issue). Propose one consolidated entry and
list what it absorbs in `merged_from`. Show the evidence of overlap, not just similar titles.

### 3d. Placement
Propose the best home for each entry on this ladder (least to most ceremony):

1. **Idea** — one line, unevaluated.
2. **Item** — described, scored, not scheduled.
3. **Issue** — reproducible defect, or small light-lane work (one module, no public contract).
4. **Change** — heavy lane only: public contract, product behavior, release, migration,
   cross-cutting (`nn-dev-development` §2b).

Two conversions to look for: **demotion** (an open change without enough substance or
description becomes an issue or item) and **promotion** (an item with clear scope and high
risk becomes a change). Proposals only; never applied in this phase.

### 3e. Batch plan
Score each surviving item (value, effort, risk) and group into batches:

- Low risk, high value, low effort first.
- **High-risk items get one isolated batch each**, run in series, never mixed.
- Risk means risk to the continuity of the code: public contracts, distributed bundles,
  release artifacts, anything CI cannot catch before `main`.
- Heavy-lane items are marked `heavy` and go through the full SDD cycle, not direct work.
- Respect the review budget: if a batch would exceed ~400 changed lines, split it
  (`chained-pr`, `work-unit-commits`).

### 3f. Report
Single document: verdict table with citations, overlap groups, placement proposals,
proposed batches with the reasoning behind each score. The maintainer reviews and edits it.
Persist nothing here; it is disposable (use a gitignored scratch dir if a file is needed).

---

## 4. Approval gate

Nothing is written to the repo or to GitHub until the maintainer explicitly approves the
refined plan, in chat. Approval is per item or per batch as stated, never generalized.
Closing issues, moving changes, retiring items and creating issues are all outward-facing
or hard to reverse: confirm each class before doing it.

---

## 5. Phase 2 — Apply the approved plan

### 5a. Write the registers
In a session worktree: write the approved items, retirements and the **Batches** zone into
`openspec/backlog_NN.md`, and validate it against the blueprint (see §7). Issue changes
(close, create, transfer, comment) follow `nn-dev-issue-tracking`; this skill proposes them
and delegates the mutation.

### 5b. Delegate each batch
This skill **does not implement batches**. For each batch the maintainer wants to run, emit
a self-contained text brief (the receiving session starts with no memory) and stop:

```markdown
# Batch <id> — <short title>

**Lane:** light | heavy (heavy: run the SDD cycle per item; do not implement directly)
**Items:** <ids + one-line summary each, verified current as of <commit sha>>
**Done when:** <observable criteria per item, copied from the backlog>
**Area:** <files/modules expected to change; files NOT to touch>
**Risk:** <L/M/H + what could break>

## Rules
- Start in an isolated session worktree (`node scripts/nn-session.mjs start --id <id>`);
  never write to the primary checkout.
- One commit per work unit; PR into `dev` (merge commit, not squash). Never merge to `main`.
- Verify with `node scripts/verify.js --only=<suite>` before pushing.
- Retire this batch's items in `openspec/backlog_NN.md` **in the same PR** as the code.
- If an item is obsolete or larger than described, STOP and report. Do not widen scope.

## Report back
PR link; items done / skipped (with reason); anything left for the backlog.
```

An item without `done_when` is not briefed: send it back to refinement. The brief is a plain
text file or message — the maintainer hands it to any agent. If the current agent can start
a session on its own, that is a convenience, never a requirement of this skill.

### 5c. No long-lived planner
The planning session does not stay open. Each implementation session retires its own items
in its own PR; the next audit (§3) repairs anything left behind.

---

## 6. First run = migration

The first execution replaces the legacy `openspec/backlog.md` (~1100 lines):

1. Run Phase 1 over the legacy file, every change and every issue.
2. After approval, write the live entries into `openspec/backlog_NN.md`.
3. Delete `openspec/backlog.md` (history stays in git) and update every reference to the old
   name in one hard rename — no alias, no redirect.

---

## 7. Validating the document

`parent_spec.url` is resolved relative to the **repo root**. Validate with the root set to
the repo root and the document passed as content: id-mode validation only works inside a
domaiNN, and `openspec/` is not one. Wrap this in a small script when it becomes routine.

---

## Core Rules

1. **Audit before action** — Phase 1 is read-only; Phase 2 needs explicit approval.
2. **Cited evidence or no verdict** — `unverifiable` is a valid answer; guessing is not.
3. **Never retire by default** — when unsure, the maintainer decides.
4. **Capture is one line** — no scoring or analysis at capture time.
5. **Delegate, do not implement** — batches run as briefs in their own sessions.
6. **High-risk items run alone** — one isolated batch each.
7. **Backlog changes travel with the code** — the implementing PR retires its items.
8. **GitHub mutations go through `nn-dev-issue-tracking`.**
9. **Stay agent-agnostic** — name no tool of a specific agent.
10. **Keep the blueprint private** — never under `iNNfo/specs/bluepriNNts/`.
