---
name: nn-dev-development
version: "0.2.1"
description: Internal developer skill for cogNNitive maintainers. Guards the shared working tree against concurrent AI agents and enforces single-branch (dev) hygiene with batched merges to main. On session start it detects other agent processes (Claude Code, Cursor, OpenCode, Copilot, etc.), checks whether origin/main advanced, and reports worktree/stash/HEAD state. Before any write to a repository file it confirms the change belongs on the shared dev branch (one-time consent per session), then re-checks the tree before each chunk and, when HEAD/branch was moved by a concurrent agent, runs the safe stash-switch-pop recovery protocol. At session close it reports what is on dev vs origin/main, flags ghost branches whose content already landed in main, and hands off to nn-dev-check-integrity + nn-dev-release for the batched merge to main. Trigger: any development session, concurrency check, branch decision, working-tree guard, session start.
---

# nn-dev-development Skill (Session & Integration Guard)

## Overview

`nn-dev-development` is an internal maintenance skill for maintainers of `cogNNitive`.
It guards the shared working tree against concurrent AI agents and enforces
**single-branch (`dev`) discipline with batched merges to `main`**.

It exists because the monorepo is edited from multiple agents (this one, Claude Code,
Cursor, Copilot, other OpenCode sessions), and the failures below recur:

- **Concurrent sessions share a working tree** — one agent's commit can switch the
  branch under another, `main` advances mid-task, foreign stashes appear, and planned
  fixes get half-applied by a sibling session.
- **Unbranched writes collide** — two agents editing the same branch at once step on
  each other and dirty the tree for everyone.
- **Parallel branches became an illusion of isolation** — in practice other agents
  merged work into `main` on their own (same commit hashes), leaving feature branches
  with 0 unique commits vs `main` and empty PRs to reconcile. The repo's real workflow
  is *continuous integration*: everyone writes to one integration branch and `main`
  absorbs it. This skill aligns the process with that reality.

### The model

- **One integration branch: `dev`.** All day-to-day work lands on `dev`. No per-feature
  branches.
- **Batched merges to `main`.** When a meaningful set of changes is accumulated on
  `dev` (e.g. a completed SDD change), run the integrity gate and release flow, then
  merge `dev` → `main` as one conscious act — not a silent merge by a sibling agent.
- **Never guess git state.** Run `git status -sb` / `git fetch` right before reporting
  or writing, never from values read earlier.

This skill does **not** block work. It *detects*, *reports*, and *asks* — always with
an explicit consent gate before writing. It never moves, renames, or deletes user files.

This skill is maintainer-only. It is **not** distributed: it is not under
`actioNN/skills/` and is not registered in `manifest/source.yaml`. It is a sibling of
`nn-dev-release`, `nn-dev-check-integrity`, and `nn-template-audit`.

Scope: all operations limited to `D:\Users\lucas\Documents\GitHub\cogNNitive`.

---

## Greeting Protocol (MANDATORY)

When this skill is loaded or activated, the agent MUST print as its very first line:

```
🔧 You're using skill: nn-dev-development (🌿)
```

Session-scoped: once per conversation.

---

## 1. Concurrency Detection (run at session start)

The **very first** thing this skill does when a conversation starts is scan for other
processes that may be touching the repo, then report what it finds. This is the same
idea as `nn-dev-check-integrity` Group 0 (expediente:
`concurrent-sessions-share-working-tree.md`), but it runs **proactively** at session
open, not as a post-change gate.

### 1a. Detect agent processes

Search the local process table for known AI coding agents and editors:

```powershell
Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -match 'code|Cursor|claude|opencode|copilot|continue|windsurf|aider|gemini'
  } |
  Select-Object ProcessId, Name, @{N='CmdLine';E={$_.CommandLine}} | Format-Table -Auto
```

- A hit does **not** prove that agent is editing this repo — but if it is, list it and
  tell the maintainer.
- Windows falls back cleanly; on `git-bash`/WSL use `ps aux | grep -iE
  'claude|code|cursor|opencode'`.

### 1b. Detect concurrent git access to the working tree

The ground truth is the git state itself, not the process list. Run these immediately
at session start:

```powershell
git status -sb                          # branch, ahead/behind, staged+modified
git rev-parse HEAD                      # what this session is on
git fetch origin
git log --oneline -1 origin/main        # has main moved since we started?
git log --oneline -3 origin/dev         # where is dev relative to main?
git rev-list --left-right --count origin/main...dev  # divergence: <main-only> <dev-only>
git stash list                          # foreign stashes?
git branch --show-current               # explicit branch name
```

Check for **worktrees** too — another agent may have checked out the same work:

```powershell
git worktree list
```

### 1c. Record the baseline

After the scan, record the values you will compare against later:

- `$baselineHead = git rev-parse HEAD`
- `$baselineBranch = git branch --show-current`
- `$baselineMain = git log --oneline -1 origin/main`

These are the anchor points for the stolen-branch detection in Section 3 and for the
"has origin/main advanced since we started?" check in Section 4.

### 1d. Report the findings

Report as a compact block, then proceed. Do **not** block unless something is clearly
wrong (see the ❌ rules in `nn-dev-check-integrity` Group 0):

```
🌿 Concurrent work scan:
- Active agent processes: <none | Claude Code PID x · Cursor PID y · ...>
- Branch: main (behind origin/main by 2) · worktrees: <none | 1>
- Stashes: <none | 1 uncommitted-...>
- Modified/untracked paths: <list — flag any you did NOT expect>
- origin/main vs origin/dev: <in sync | dev ahead N, behind M (from rev-list counts)>
- Divergence read: <if dev behind main by M> expect merge conflicts in <overlapping paths>; reconcile main→dev BEFORE building release pins on top.
```

- ❌ if the current branch / HEAD is not what the maintainer expects, or a stash they do
  not recognise exists.
- ⚠️ list every staged/modified path; flag any outside the set this conversation expects
  to touch (it may belong to a concurrent agent — never stage it).
- ⚠️ **origin/main advanced** — if `origin/main` moved since the last known state, state
  it plainly: your `dev` may be behind, and sibling agents may already have merged work
  into `main` that you planned to deliver. Rebase/reconcile before building on top.
- If another agent process is actively holding the tree, state it plainly and, only if
  the maintainer asks, pause.

### 1e. Stale WIP vs foreign agent (disambiguation)

A dirty tree with no known session behind it is **ambiguous**: it can be the
maintainer's own in-flight work from another session (expediente 2026-09-08: an
uncommitted 0.5.0 version bump first read as interference, then landed cleanly)
or a sibling agent's live edits. Do NOT assume interference:

1. Report the dirty paths with `git diff --stat` and ask the maintainer one
   question: "yours from another session, or foreign?"
2. If it is theirs: continue; never revert or stage it without consent.
3. If foreign and active: pause writes that touch those paths.

Prevention (convention, not enforcement): work that survives more than one
session gets a `wip:` commit on `dev` instead of living as a dirty tree.
A committed `wip:` is attributable; a dirty tree is not.

---

## 2. Single-Branch Consent Gate (before ANY repo write)

Immediately **before writing, creating, moving, or deleting any file inside the
repository**, this skill MUST confirm that the change belongs on the shared integration
branch `dev`, not on `main` and not on a new parallel branch.

### When the gate fires

- The user asks to edit/create/delete a repo file, or the work in progress is about to
  write one.
- The conversation has drifted toward implementation and the first write is imminent.
- Exception: read-only work, generated artifacts already covered by an existing change
  branch, or a fix the maintainer explicitly says "just commit on the current branch".

### The prompt (one gate, two options)

Ask with a short numbered menu. The recommended option is first and marked
`(Recommended)`:

```markdown
🌿 ¿Confirmamos la rama de trabajo? (ante cualquier escritura en el repo)

  [1] Sí — trabajar en dev (Recomendado)
  [2] No — trabajar sobre la rama actual (main)
  [x] Cancelar / no tocar nada
```

- **Default is `dev`.** If `dev` exists locally, switch to it (`git switch dev`). If it
  does not exist locally but exists on origin, track it (`git switch dev` with
  `--track origin/dev`). If it does not exist anywhere, create it from the current
  `origin/main` tip:
  `git switch -c dev origin/main`.
- Only fall back to `main` for trivial, maintainer-approved hotfixes. A parallel branch
  is **not** proposed by this skill — per the repo's real workflow (see Overview),
  day-to-day work is integrated continuously on `dev` and `main` only absorbs batched
  merges. If the maintainer still wants a dedicated branch for a special case, honor it
  (see Section 2a).

Confirm the switch with `git status -sb` and record `$baselineHead` / `$baselineBranch`
again if the branch changed, then proceed.

### 2a. Exception: maintainer requests a dedicated branch

The maintainer is free to override. If they ask for a dedicated branch, create it with
the repo's conventional name shape `<tipo>/<kebab-case>` derived from the task, e.g.
`feat/tag-selection-and-template-cache-guards`, `fix/integrity-audit-blockers`:

```powershell
git switch -c <branch-name>
```

Treat that branch as the session's integration target for consent purposes (see
"Consent is one-time per session per branch" below).

### Consent is one-time per session per branch

Ask **once** at the first write. Once the branch is chosen, subsequent writes on that
session stay on it without re-asking — re-asking every write would be noise. Re-ask
only if the task changes scope or the user switches the working tree.

---

## 3. Re-check Before Writing (hardening)

Even after the consent gate, re-verify the tree is still in the expected state right
before the first write of each new chunk of work (the tree can change under you between
tool calls — expediente `concurrent-sessions-share-working-tree.md`):

```powershell
git status -sb
git rev-parse HEAD
git branch --show-current
```

Compare against the recorded `$baselineBranch` / `$baselineHead` (Section 1c):

- If the branch or HEAD moved since the gate, **stop and tell the maintainer before
  writing** — a concurrent agent may have switched the branch under you.
- Never trust a plan written several tool calls earlier; re-read the file immediately
  before editing it.

### 3a. Stolen-branch recovery protocol

When the check above detects that the current branch / HEAD is not the expected one
(the "agent changed MY branch under me" failure from the 2026-09-06/07 sessions), use
this safe recovery. It only touches **your** files — never stage anything that belongs
to a sibling agent:

```powershell
# 1. Stash ONLY your files (untracked included), never a blanket stash
git stash push -u -- <my-files...>

# 2. Move back to the branch this session is supposed to work on
git switch <my-branch>

# 3. Bring your work back
git stash pop
```

Hard rules:

- **NUNCA stagear archivos ajenos** — never `git add .` / `git add -A`; a concurrent
  agent's untracked files may be in the tree.
- If a stash refuses to pop (conflicts with files a sibling agent changed), do **not**
  force it. Report to the maintainer and ask how to proceed.
- After recovery, record the new `$baselineHead` / `$baselineBranch` for this session.

---

## 4. Report / handoff (batched merge to main)

At the end of the session (or when the maintainer asks), close the loop concisely.

### 4a. Did origin/main advance during this session?

```powershell
git fetch origin
git log --oneline -3 origin/main
```

Compare against `$baselineMain` (Section 1c):

- If `origin/main` advanced, sibling agents merged work while you worked. Say so — your
  `dev` may need a rebase before the batched merge, and some of your planned changes may
  already be in `main`.

### 4b. What is on `dev` but not on `main`?

```powershell
git log --oneline origin/main..origin/dev
git diff --stat origin/main..origin/dev
```

This is the batch pending merge. Report it so the maintainer can decide when `dev` is
ready.

### 4c. Ghost-branch sweep (cleanup candidates)

Feature branches from the old parallel-branch era are usually dead: their content is
already in `main` (merged by hand or by a sibling agent). List them, never delete:

```powershell
git branch -a
git for-each-ref --format='%(refname:short)' refs/remotes/origin | Where-Object { $_ -match 'feat/|fix/|chore/|refactor/|docs/' }
```

For each candidate, check whether its tip is already contained in `main`:

```powershell
git merge-base --is-ancestor <branch> origin/main
```

If yes, flag it in the report as safe-to-delete **candidates** and let the maintainer
confirm. Never delete branches automatically.

### 4d. The handoff block

```markdown
🌿 Session guard:
- Branch: dev · based on origin/main @ <sha> · clean/dirty
- origin/main advanced during session: <yes — rebase before merge | no>
- Writes on: dev · N files
- Pending batch (origin/main..dev): <list of commits> · <stat>
- Ghost branches (content already in main): <list — candidates to delete>
- Next: run nn-dev-check-integrity, then nn-dev-release to merge dev → main
```

### 4e. Batched merge orchestration

When the maintainer says the accumulated changes on `dev` are ready:

1. Run `nn-dev-check-integrity` first — it is the pre-push/post-change gate that
   verifies git hygiene and the MCP version square. Do not merge dirty. This dev
   gate runs `verify.js` in dev mode: it skips the live stable-manifest publication
   check (pins resolving to release tags), which can only pass after the release
   cuts the tag (merge → tag → pin).
2. Run `nn-dev-release` for the merge itself: it manages version bumps, release
   tagging, manifest generation, and distribution validation. The release path runs
   `node scripts/verify.js --release`, which adds the live stable-manifest check
   once the tag exists. **Main-CI-green is a Definition of Done**: the incoming
   batch MUST have a green CI run on `main` (or a green run on `dev` that the merge
   reproduces) before tags are cut; a red main blocks the release.
3. After the merge to `main` lands, return to `dev` for the next batch.

This replaces the old "commit + push + PR" flow: with single-branch workflow there is
no per-change PR to open; `main` absorbs the batch instead.

---

## Core Rules

1. **Never guess git state** — run `git status -sb` / `git fetch` right before
   reporting or writing, never from values read earlier.
2. **Detect first, act second** — concurrency scan is the opening move of any session;
   report findings before doing anything else.
3. **Single branch by default** — day-to-day work lands on `dev`; `main` only absorbs
   batched merges. A dedicated branch is the exception, not the rule.
4. **Ask before any repo write** — the single-branch consent gate is mandatory; never
   write to a repo file without the branch decision being made.
5. **Consent once per branch** — do not re-ask on every write; re-ask only on scope
   change or tree switch.
6. **Never stage foreign files** — never `git add .` / `git add -A`; a concurrent
   agent's files may be in the tree. Stash only your own files.
7. **Stop on stolen branch** — if HEAD/branch moved since the gate, stop and report;
   recover with the stash-switch-pop protocol only for your own files.
8. **Never delete branches automatically** — ghost branches are listed as candidates;
   deletion is always the maintainer's call.
9. **Read-only inspection** — this skill detects and asks; it never moves, renames, or
   deletes user files, and it never stages/commits anything on its own.
10. **Monorepo scope** — `D:\Users\lucas\Documents\GitHub\cogNNitive` only.
11. **Disposable scratch lives in `temp/`** — simulation workspaces, ad-hoc scripts,
   and throwaway fixtures go under the repo-root `temp/` directory (gitignored,
   never committed, deleted after the run). Never scatter `*_tmp`, `scratch/`, or
   fixture copies beside real source.
