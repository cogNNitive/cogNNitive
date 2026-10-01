---
name: nn-dev-development
version: "1.0.0"
description: Internal developer skill for cogNNitive maintainers. Enforces session isolation on a single-developer, multi-agent repo: each write-intended session works in its own git worktree of `dev` (created by `scripts/nn-session.mjs start`), leaving the primary checkout as a read-only integration/release point. Reports agent processes and git state as an informational scan, enforces commit-early on `dev`, and orchestrates the batched `dev -> main` merge through nn-dev-check-integrity + nn-dev-release. Trigger: any development session, concurrency check, branch decision, session start, session isolation.
---

# nn-dev-development Skill (Session Isolation & Integration Guard)

## Overview

`nn-dev-development` is the maintainer-only session guard for `cogNNitive`. This repo is
operated by **one developer** driving several AI agents (OpenCode, Claude Code, Antigravity)
that may run concurrently. The recurring failure is mechanical — N processes writing one
directory — and the fix is **isolation, not attribution** (attribution already failed twice;
it is undecidable from git alone).

### The model

- **One integration branch: `dev`.** All day-to-day work lands on `dev`; `main` only
  absorbs batched merges.
- **One worktree per session.** Every write-intended session works in its own
  `git worktree` of `dev`, created by `scripts/nn-session.mjs start`. No two sessions
  share a directory.
- **The primary checkout is read-only.** It exists for integration and release only:
  merge `dev -> main`, `push`, `tag`, `fetch`, and gate runs. A `PreToolUse` hook
  (`.claude/hooks/guard-primary-tree.mjs` + `.agents/hooks.json`) denies file edits and
  `git add`/`commit`/`stash` there.
- **Commit early.** A session commits to `dev` frequently; `wip:<session-id>: <reason>`
  checkpoints keep work durable across a crash. Never hold a dirty tree.
- **Never guess git state.** Run `git status -sb` / `git fetch` right before reporting or
  writing, never from values read earlier.

This skill is maintainer-only, not distributed, and not registered in `manifest/source.yaml`.
Scope: cogNNitive repository root only.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-development (🌿)
```

Session-scoped: once per conversation.

---

## 1. Session Start: isolate, then scan

### 1a. Enter a session worktree

Before the first write, create (or reuse) this session's worktree and work there:

```powershell
node scripts/nn-session.mjs start --id <session-id>
# prints the absolute worktree path; the session works there from now on
```

`start` reuses an existing worktree for the same id, junctions the primary tree's
`node_modules`, and creates the branch `session/<id>` off `dev`. Never write to the
primary checkout; the primary-tree guard blocks it.

### 1b. Informational concurrency scan

Run and report (do **not** block on it — isolation already makes collisions impossible):

```powershell
Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'code|Cursor|claude|opencode|copilot|gemini' } | Select ProcessId,Name
git status -sb
git rev-parse HEAD
git fetch origin
git rev-list --left-right --count origin/main...dev
git worktree list
git stash list
```

Report the block, then proceed:

```
🌿 Concurrent work scan:
- Active agent processes: <list>
- Branch: dev · HEAD <sha> · ahead/behind origin/dev
- origin/main vs dev: <0/N> (dev-only commits pending merge)
- Worktrees: <list>
```

Flag only if `origin/main` advanced since the session baseline (rebase before the batched
merge).

### 1c. Record the baseline

`$baselineHead`, `$baselineBranch`, `$baselineMain` — anchor points for the merge checks
in Section 4.

---

## 2. Branch Discipline

- **Work on `dev`** via the session worktree (`session/<id>`). No per-feature branches.
- **Commit early and often** on `dev`. A `wip:<session-id>: <reason>` commit is the
  durability mechanism, not a first-write gate.
- `git add -A` / `git add .` / `git commit -a` are **permitted** (the worktree only holds
  your own work). The destructive commands `reset --hard`, `clean`, `stash`, `branch -D`,
  and `checkout/restore .` stay **blocked** by `.claude/hooks/block-dangerous-git.mjs` —
  they can still erase your own uncommitted work.

### 2a. Maintainer requests a dedicated branch

If the maintainer explicitly asks for a dedicated branch, honor it with the conventional
shape `<tipo>/<kebab-case>`; treat it as the session's integration target.

---

## 3. Worktree Lifecycle

- `node scripts/nn-session.mjs stop --id <session-id>` removes the worktree and its
  `session/<id>` branch **only if** the branch is merged into `dev` or pushed; otherwise it
  refuses and lists the unique commits.
- `node scripts/nn-session.mjs list` shows session worktrees and flags abandoned ones.
- Never auto-delete worktrees or branches; abandoned ones are surfaced to the maintainer.

---

## 4. Batched Merge to `main`

### 4a. Did origin/main advance?

```powershell
git fetch origin
git log --oneline -3 origin/main
```

Compare against `$baselineMain`. If `origin/main` advanced, rebase `dev` before merging.

### 4b. What is on `dev` but not `main`?

Always compare remote tracking refs (`origin/main..origin/dev`), never local `main`:

```powershell
git log --oneline origin/main..origin/dev
git diff --stat origin/main..origin/dev
git diff --name-only origin/main..origin/dev | grep '^iNNfo/specs/templates/'
```

### 4c. Ghost-branch sweep

List feature branches whose tip is already in `main` (`git merge-base --is-ancestor
<branch> origin/main`); flag them as safe-to-delete **candidates**. Never delete branches
automatically.

### 4d. Handoff block

```markdown
🌿 Session guard:
- Branch: dev · based on origin/main @ <sha> · clean/dirty
- Session: <session-id> · worktree <path>
- origin/main advanced during session: <yes|no>
- Pending batch (origin/main..dev): <commits> · <stat>
- Next: run nn-dev-check-integrity, then nn-dev-release to merge dev → main
```

### 4e. Batched merge orchestration

When the maintainer says the accumulated `dev` work is ready:

1. **Pre-push integrity gate**: `node scripts/check-integrity.js` and
   `npm run check:versions`. Resolve drift before pushing. Any change under `skills/**`
   or `iNNfo/specs/templates/**/spec_NN.md` requires cutting a new `skills-v*`/`templates-v*`
   tag **and** re-pinning `manifest/source.yaml` in the SAME batch. Ensure the tree is
   clean and `git push origin dev` succeeds.
2. **Server-side fast-forward (`dev → main`)** — never checks out `main`, leaves the tree
   untouched:
   ```powershell
   git push origin dev
   git push origin dev:main
   git rev-list --left-right --count origin/main...dev   # expect 0 0
   ```
   On rejection: `git fetch origin && git merge origin/main` on `dev`. If tagging, tag
   immediately after this push, before any further commit on `dev`.
3. **Post-push CI gate on `main` — blocking**: poll `gh run list --branch main` until the
   run for the pushed sha completes; require `verify`, `quality`, `deploy-pages` all
   `success`. Distinguish red-caused-by-batch (fix-forward) from pre-existing red
   (maintainer-approved `MERGE-GATE EXCEPTION`).
4. **Release tagging** (only for a version bump): run `nn-dev-release`; a red `main`
   blocks tagging.
5. **Persist the milestone** in Engram for sibling sessions.

---

## 6. Pre-Refactor Snapshot & Rollback Protocol (Restore Point Gate)

Before high-impact changes, establish an immutable restore point.

- **Formal release** (`dev` clean + gates green): merge `dev → main`, bump the version,
  tag `v<version>` / `innfo-mcp-v<version>`, `gh release create`.
- **Checkpoint tag** (mid-flight): `git tag -a checkpoint/<topic>-YYYYMMDD -m ...` and push.

### Rollback (scoped, non-destructive)

```powershell
git checkout HEAD -- <explicit/path>                       # revert one authored file
git worktree add --detach temp/rollback <tag>              # inspect a tag without touching the tree
git update-ref refs/heads/dev '<tag>^{commit}' <old-sha>   # atomic compare-and-swap
git push origin dev --force-with-lease                     # only with maintainer consent
```

`git restore .`, `git clean -fd`, `git reset --hard` and `git stash` remain **blocked**.

---

## Core Rules

1. **Isolate first** — enter a session worktree (`nn-session.mjs start`) before any write;
   never write to the primary checkout.
2. **Never guess git state** — re-read `git status -sb` / `HEAD` right before reporting
   or writing.
3. **Single branch** — day-to-day work lands on `dev`; `main` only absorbs batched merges.
4. **Commit early** — prefer a `wip:<session-id>` commit over a dirty tree.
5. **Never run destructive git** — `reset --hard`, `clean`, `stash`, `branch -D`,
   `checkout/restore .` are blocked and must not be prescribed.
6. **Never delete branches automatically** — ghost branches are candidates, the maintainer
   deletes.
7. **Read-only inspection** — this skill detects and asks; it never moves, renames, or
   deletes user files, and never stages/commits on its own.
8. **Monorepo scope** — cogNNitive repository root only.
9. **Disposable scratch lives in `temp/`** — throwaway fixtures and workspaces go under
   the gitignored `temp/` directory, deleted after the run.
