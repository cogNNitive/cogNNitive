---
name: nn-dev-check-integrity
version: "0.2.0"
description: Internal developer skill for cogNNitive maintainers. Post-change integrity gate — a regression net for known failure modes across specs, templates, MCP distribution, tests, docs, and GitHub sync, plus an optional deep code-review pass (QA, bug hunt, easy refactors). Run it after any large change to the monorepo, before pushing or opening a PR.
---

# nn-dev-check-integrity Skill (Post-Change Integrity Gate)

## Overview

`nn-dev-check-integrity` is an internal maintenance skill for maintainers of `cogNNitive`,
meant for **heavy-lane** changes (see `nn-dev-development` §2b): public contracts, releases,
migrations, cross-cutting work. Light-lane changes rely on CI and do not need it.

It is **NOT a generic linter**. It is a **regression net for failure modes that have actually
broken this repo before**, plus two hygiene groups (tests / docs) the maintainer opted into.
Every deterministic check traces to a documented incident (its *expediente*). If a risk has
no history and no concrete preventive action, it does not belong here.

Maintainer-only: not under `skills/`, not registered in `manifest/source.yaml`. Sibling of
`nn-dev-development`, `nn-dev-release` and `nn-template-audit`. Scope: repository root only.

The detailed group catalog lives in [`references/catalog.md`](references/catalog.md). Read
only the groups you are about to run.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-check-integrity (🩺)
```

Session-scoped: once per conversation.

---

## 0. Engram Recall (if available)

1. `mem_search` for `"merge incident OR drift OR verify OR spec write-once OR CDN OR stale dist"`
   scoped to this project.
2. `mem_get_observation` on any hit that looks like a new failure mode not in the catalog.
3. If a genuinely new recurring incident shows up, run the relevant checks and tell the
   maintainer the catalog should be extended.

If engram is unavailable, say so once and proceed.

---

## 1. Execution Protocol (optimistic, no menu)

Default: **do not block on a menu.** Announce the scope and run it:

```markdown
🩺 Running the post-change deterministic gate (preset [d]). Tell me now if you want another
scope ([p] pre-push, [q] deep QA, [a] everything) or want to stop.
```

Only show the group list if the maintainer asks for it or passes custom flags. Preset `[q]`
defaults to the diff vs `origin/main` without a secondary scope question.

| Preset | Groups | Command |
|--------|--------|---------|
| `[d]` Post-change (default) | 1 2 3 3b 4 6 7 | `node scripts/check-integrity.js` |
| `[p]` Pre-push | `[d]` + 5 (CI mirror, slow) | `node scripts/check-integrity.js --pre-push` |
| `[q]` Deep QA | `[p]` + 10 (code review, very slow) | `[p]`, then Group 10 |
| `[a]` / `[r]` Everything / release | all | per catalog |

Group 0 (working tree and sessions) is owned by `nn-dev-development`, not run here.

### The runner can hang — bound it

`check-integrity.js` is long and stalls in this environment (observed 2026-10-13: no output
after the video-script suite; the isolated test runs fine). Never wait open-ended: watch the
output length, and treat no change for 3 minutes as hung. On a hang, run
`node scripts/verify.js` as the gate, **say so explicitly**, and record the hang as its own
issue — it is not a batch blocker. `nn-dev-development` §4d already uses `verify.js` + CI as
the merge gate, so this skill is an optional, stricter layer on top.

---

## 2. Groups

Summary (details, commands, verdict rules and expedientes in the catalog):

| Group | Topic |
|-------|-------|
| 0 | Working tree & sessions (delegated to `nn-dev-development`) |
| 1 / 1b / 1c / 1d | GitHub sync, merge gate, tag/pin freshness, release workflow auth |
| 2 | Version SSOT & inventory (sample version coherence is a `verify.js` step, see the catalog) |
| 3 / 3b / 3c | Published `_V_x-y-z_` immutability, canonical blueprint versioning, blocked `checkout` read-through |
| 4 | New blueprint folders registered in the manifest |
| 5 | CI mirror (slow) |
| 6 / 7 | Tests and docs keep up with code |
| 8 | Preflight + skill-flow coherence (part judgement) |
| 9 | Environment (Node engines, `npm ci`, rollup win32, `gh auth`) |
| 10 | General code review (QA, bug hunt, easy refactors) — default OFF |
| 11 | cogNNitive-web issue triage — advisory |

---

## 3. Report Format

One consolidated report; per group, per check, a line:

```markdown
## nn-dev-check-integrity — <date>  ·  groups: <selected>

### ❌ Blockers
- [G2] <what failed> — Impact: <...> — Fix: <exact command>

### ⚠️ Warnings
- [G6] <file> changed, no test touched in <package>.

### ✅ OK
- [G3] No published _V_x-y-z_ spec edited in place.

### 🔍 Code review (Group 10) — informational, does not fail the gate
- CONFIRMED <file:line> — <bug>
- PLAUSIBLE <file:line> — <suspected issue>
```

- Conclude **non-zero** only on a ❌ from Groups 0–9. Group 10 never fails the gate alone.
- A check that was skipped or could not run is a ⚠️, never a ✅.

---

## Core Rules

1. **Never guess git state** — re-read `git status -sb` / `git fetch` right before reporting.
2. **Optimistic by default** — announce the preset and run it; show the menu only on request.
   Never run the full battery (`[a]`) unprompted.
3. **Build `innfo-core` first** — any group that runs tests starts with
   `npm --prefix iNNfo/packages/innfo-core run build`.
4. **Changed files only for format** — never repo-wide `format` / `prettier --write`.
5. **Read-only** — inspects and reports; never edits code, specs, SKILL.md, manifests or
   generated docs. It may suggest exact fix commands.
6. **Group 10 delegates** to `code-review` / `simplify` / `judgment-day`; it does not
   reimplement a reviewer, and still obeys Rule 5.
7. **Never fabricate a pass** — skipped or errored check ⇒ ⚠️.
8. **Authenticate gh** — `$env:GITHUB_TOKEN = (gh auth token).Trim()` before manifest or `gh` calls.
9. **Every deterministic check cites its expediente** — extend the catalog when a new
   recurring incident appears; do not add history-less checks.
10. **Monorepo scope** — repository root only.
