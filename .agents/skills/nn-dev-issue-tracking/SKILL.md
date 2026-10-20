---
name: nn-dev-issue-tracking
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Owns the two-repo issue model — cogNNitive (source-of-truth engineering tracker) and cogNNitive-web (public intake surface). Sweeps the public intake, triages every open web issue (fixes-here / web-only / already-fixed), imports engineering issues into cogNNitive with traceability, and guarantees no open web issue is left untriaged. Trigger: issue triage, web issues, intake sweep, import issues, transfer issues, backlog review, cogNNitive-web inbox.
---

# nn-dev-issue-tracking Skill (Two-Repo Issue Model & Web Intake)

## Overview

`nn-dev-issue-tracking` is an internal maintenance skill for maintainers of `cogNNitive`.
It owns **where an issue lives and how it moves**, so the backlog has a single
source of truth and the public intake never silently rots.

It exists because two repos both expose Issues and nothing owned the boundary:

- **`cogNNitive`** — the monorepo, **source of truth** for all code. Holds **engineering
  issues**: bugs, tech debt, refactors, specs. *Intended to be private* (currently public
  only because of GitHub private-repo operational limits — treat it as if it were private).
- **`cogNNitive-web`** — the **public distribution** (built site + canonically hosted specs/
  blueprints/bundles). Holds the **public intake**: user-reported issues about the shipped
  product. Its Issues stay **enabled** — when `cogNNitive` returns to private, this is the
  only surface an external user can reach.

Maintainer-only: not under `skills/`, not registered in `manifest/source.yaml`. Sibling of
`nn-dev-development`, `nn-dev-release`, `nn-dev-check-integrity` and `nn-template-audit`.
Scope: repository root plus the two GitHub repos.

Read [`references/imported-issues.md`](references/imported-issues.md) for the traceability
ledger of issues already imported into `cogNNitive`.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🎫 You're using skill: nn-dev-issue-tracking (🎫)
```

Session-scoped: once per conversation.

---

## 0. Engram Recall (if available)

1. `mem_search` for `"issue triage OR web intake OR transfer OR backlog OR cogNNitive-web"`
   scoped to this project.
2. `mem_get_observation` on any hit about a prior sweep or an unresolved triage.
3. If a genuinely new pattern shows up, record it and tell the maintainer this skill should
   be extended.

If engram is unavailable, say so once and proceed.

---

## 1. When to run

- Before a release batch or a `dev → main` merge (alongside `nn-dev-check-integrity` Group 11).
- When the maintainer asks to triage the backlog, "check web issues", or "import the inbox".
- Periodically, so the public intake does not drift (its whole point is to be monitored).

The sweep is **GitHub mutations, not repo edits** — it needs no `nn-dev-development` worktree.
If a triage spawns an actual code fix, that fix follows `nn-dev-development` (isolate first),
and this skill only keeps the issue links straight.

---

## 2. The two-repo model

| Repo | Role | Issues | Visibility |
|------|------|--------|------------|
| `cogNNitive` | Source-of-truth **engineering tracker** | Bugs, tech debt, refactors, specs | intended private (currently public) |
| `cogNNitive-web` | **Public intake** for the shipped product | User reports about the distribution | public |

Rule: **an engineering issue lives in `cogNNitive`. The web tracker is a mailbox, not a
backlog.** Keep `cogNNitive-web` Issues enabled; never disable them while `cogNNitive` is
private, or external users have nowhere to report.

---

## 3. Intake sweep protocol

### 3a. List the public intake

```powershell
gh issue list --repo cogNNitive/cogNNitive-web --state open --limit 100 --json number,title,author,createdAt,labels
```

### 3b. Triage every open web issue — none may be left untouched

Classify each into exactly one bucket:

| Bucket | Meaning | Action |
|--------|---------|--------|
| **fixes-here** | The defect is in `skills/`, `iNNfo/`, or `scripts/` (ships to web via `manifest/source.yaml`) | Import into `cogNNitive` (§4) |
| **web-only** | Path does not exist in this monorepo, or it belongs to a different product (e.g. the editor app `innfo-editor`), or is a stale/renamed skill (`nn-trannsform` → `nn-sources`) | Comment the classification; keep in web or re-file elsewhere |
| **already-fixed-here** | Source already carries the fix (verify the code, do not trust the title) | Comment the evidence (file:line + test); close |

Verify against **current code**, never against the issue title. A title can lie in both
directions (see the 2026-10-20 sweep: 10 of 18 open web issues were already fixed).

### 3c. Never invent a fix

If a web issue references a path that does not exist in this monorepo, say so plainly. Do not
map it to a plausible-looking file.

---

## 4. Import protocol (web → cogNNitive)

Use GitHub's native transfer so comments and authorship move with the issue.

```powershell
gh issue transfer <web-number> cogNNitive/cogNNitive --repo cogNNitive/cogNNitive-web
```

Then, on the **destination** issue, add a traceability comment:

```markdown
🔀 **Transferred from the public intake tracker `cogNNitive-web`.**

- Original: https://github.com/cogNNitive/cogNNitive-web/issues/<web-number> (web#<web-number>)
- Reason: consolidated into `cogNNitive`, the source-of-truth engineering tracker.
  `cogNNitive-web` remains the public intake surface; engineering issues are imported here.
- Protocol: `nn-dev-issue-tracking`.
```

Notes:

- Transfer **preserves comments and author**; **the number changes** in the destination and the
  old web URL redirects. Record the mapping in the ledger (§6).
- Labels transfer only if they also exist in `cogNNitive`. Keep the `area:*` label set defined
  in **both** repos so grouping survives the move.
- `transferred` timeline events are the authoritative, tamper-proof record; the ledger is a
  human-readable convenience.

### 4a. External reporters — do NOT transfer blind

If the reporter is **not** a maintainer, transferring moves their issue into a repo that will
be private, so **they lose visibility**. For external reports:

1. Keep the issue in `cogNNitive-web` (public), and
2. open a **linked** engineering issue in `cogNNitive` (`Related: cogNNitive-web#<n>`) instead
   of transferring, **unless** the reporter is gone / the issue is internal-only.

Maintainer-authored issues (the common case) are transferred directly.

---

## 5. Verify the sweep

```powershell
gh issue list --repo cogNNitive/cogNNitive-web --state all --limit 200 --json number,state
```

- A completed import leaves **no open web issue that is a `fixes-here`**.
- State the before/after counts (`open`/`closed`) for both repos in the report.

---

## 6. Traceability ledger

Append every import to [`references/imported-issues.md`](references/imported-issues.md):
`| cogNNitive# | web# | title | date |`. One row per transfer, newest last. The ledger is
append-only; corrections are new rows, never edits to history.

If a `cogNNitive` issue is later closed without a code change (wontfix, duplicate), note the
reason in its traceability comment — the ledger only records the crossing.

---

## 7. Report format

```markdown
## nn-dev-issue-tracking — <date>

### Intake sweep (cogNNitive-web)
- open before: <n>  →  fix-here: <n> · web-only: <n> · already-fixed: <n>
- imported: <web#x → cogNNitive#y, ...>
- closed-as-fixed: <web#...>
- left in web (external / web-only): <web#...>

### Engineering tracker (cogNNitive)
- open after: <n>

### Ledger
- appended <n> rows to references/imported-issues.md
```

---

## Core Rules

1. **`cogNNitive` is the source of truth** for engineering issues; `cogNNitive-web` is a
   public mailbox, not a backlog.
2. **Keep `cogNNitive-web` Issues enabled** — it is the only public surface when `cogNNitive`
   is private.
3. **No open web issue stays untriaged** — every sweep ends with each open issue in exactly
   one bucket.
4. **Verify against code, never the title** — an issue may already be fixed, or be a
   different bug than its title suggests.
5. **Transfer, don't recreate** — preserve comments and authorship; the GitHub `transferred`
   event is the authoritative record.
6. **Never transfer an external reporter's issue blind** — they lose visibility when
   `cogNNitive` returns to private.
7. **Trace every crossing** — a destination comment plus a ledger row.
8. **Read-only on code** — this skill mutates GitHub issues only; any code fix is its own
   `nn-dev-development` session.
9. **Monorepo scope** — repository root plus `cogNNitive` and `cogNNitive-web`.
