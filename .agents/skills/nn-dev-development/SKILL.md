---
name: nn-dev-development
version: "0.1.0"
description: Internal developer skill for cogNNitive maintainers. Guards the working tree against concurrent AI agents and enforces branch-first hygiene. On session start it detects other agent processes (Claude Code, Cursor, OpenCode, Copilot, etc.) that are touching the repo, and immediately before any write to a repository file it asks whether the change should live on a dedicated git branch, suggesting three conventional branch names. Trigger: any development session, concurrency check, branch decision, working-tree guard, session start.
---

# nn-dev-development Skill (Session & Branch Guard)

## Overview

`nn-dev-development` is an internal maintenance skill for maintainers of `cogNNitive`.
It guards the shared working tree against concurrent AI agents and enforces
**branch-first** discipline before any write lands in the repository.

It exists because the monorepo is edited from multiple agents (this one, Claude Code,
Cursor, Copilot, other OpenCode sessions). Two failures recur:

- **Concurrent sessions share a working tree** — one agent's commit can switch the
  branch under another, `main` advances mid-task, foreign stashes appear, and planned
  fixes get half-applied by a sibling session.
- **Unbranched writes collide** — two agents editing `main` at once step on each other
  and dirty the tree for everyone.

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
git stash list                          # foreign stashes?
git branch --show-current               # explicit branch name
```

Check for **worktrees** too — another agent may have checked out the same work:

```powershell
git worktree list
```

### 1c. Report the findings

Report as a compact block, then proceed. Do **not** block unless something is clearly
wrong (see the ❌ rules in `nn-dev-check-integrity` Group 0):

```
🌿 Concurrent work scan:
- Active agent processes: <none | Claude Code PID x · Cursor PID y · ...>
- Branch: main (behind origin/main by 2) · worktrees: <none | 1>
- Stashes: <none | 1 uncommitted-...>
- Modified/untracked paths: <list — flag any you did NOT expect>
```

- ❌ if the current branch / HEAD is not what the maintainer expects, or a stash they do
  not recognise exists.
- ⚠️ list every staged/modified path; flag any outside the set this conversation expects
  to touch (it may belong to a concurrent agent — never stage it).
- If another agent process is actively holding the tree, state it plainly and, only if
  the maintainer asks, pause.

---

## 2. Branch-First Consent Gate (before ANY repo write)

Immediately **before writing, creating, moving, or deleting any file inside the
repository**, this skill MUST ask whether the change should live on a dedicated git
branch, and suggest three conventional names.

### When the gate fires

- The user asks to edit/create/delete a repo file, or the work in progress is about to
  write one.
- The conversation has drifted toward implementation and the first write is imminent.
- Exception: read-only work, generated artifacts already covered by an existing change
  branch, or a fix the maintainer explicitly says "just commit on the current branch".

### The prompt (one gate, three suggestions)

Ask with a short numbered menu. Always put the safe/recommended option first and mark
it `(Recommended)`:

```markdown
🌿 ¿Crear una rama para estos cambios? (ante cualquier escritura en el repo)

  [1] Sí — crear una rama dedicada (Recomendado)
  [2] No — trabajar sobre la rama actual (main)
  [x] Cancelar / no tocar nada

Si elegís [1], sugerencias de nombre (convención: <tipo>/<kebab-case>):
  a. <branch-name-1>
  b. <branch-name-2>
  c. <branch-name-3>
  (o proponé el tuyo)
```

The three suggested names must be **derived from the actual task**, using the repo's
branch convention seen on `origin` (`feat/...`, `fix/...`, `docs/...`, `refactor/...`,
`chore/...`). Generate them from the current task's intent and scope, not boilerplate.
Examples of real names from this repo's history:
`feat/tag-selection-and-template-cache-guards`, `fix/integrity-audit-blockers`.

If the maintainer picks a suggestion or provides their own, create the branch **before
any write**:

```powershell
git switch -c <branch-name>
```

Confirm the switch with `git status -sb` and proceed.

### Consent is one-time per session per branch

Ask **once** at the first write. Once a branch is chosen, subsequent writes on that
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
```

- If the branch or HEAD moved since the gate, stop and tell the maintainer before
  writing.
- Never trust a plan written several tool calls earlier; re-read the file immediately
  before editing it.

---

## 4. Report / handoff

At the end of the session (or before a PR), close the loop concisely:

```markdown
🌿 Session guard:
- Branch: <branch> · created from <base> · clean/dirty
- Concurrent agents observed: <none | ...>
- Writes on: <branch> · N files
- Next: commit + push + PR (use nn-dev-release / nn-dev-check-integrity before push)
```

---

## Core Rules

1. **Never guess git state** — run `git status -sb` / `git fetch` right before
   reporting or writing, never from values read earlier.
2. **Detect first, act second** — concurrency scan is the opening move of any session;
   report findings before doing anything else.
3. **Ask before any repo write** — the branch-first gate is mandatory; never write to a
   repo file without the branch decision being made.
4. **Suggest three real branch names** — derived from the task, following the repo's
   `<tipo>/<kebab-case>` convention, not generic placeholders.
5. **Consent once per branch** — do not re-ask on every write; re-ask only on scope
   change or tree switch.
6. **Read-only inspection** — this skill detects and asks; it never moves, renames, or
   deletes user files, and it never stages/commits anything on its own.
7. **Monorepo scope** — `D:\Users\lucas\Documents\GitHub\cogNNitive` only.
