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

**Testing in a worktree.** A junctioned worktree resolves `@cognnitive/*` to the
**primary's** source, so a test or gate there exercises the wrong tree. When the session
needs a trustworthy local test run, start a fresh one with `--fresh` (one-time `npm ci`
inside the worktree, ~60s): `node scripts/nn-session.mjs start --id <id> --fresh`. Otherwise
run tests/gates in the primary, or rely on CI. `--fresh` only applies to a new worktree —
it prints a note and does nothing if the worktree already exists.

⚠️ It junctions the root `node_modules`, `iNNfo/node_modules`, and every workspace
(`iNNfo/packages/*`, `iNNfo/apps/*`) and skill `node_modules` that exists in the primary.
A dependency missing from the **local install** (a partial / `--omit=dev` install — e.g.
`vitest` present in neither the root nor the workspace) is an environment gap, not a code error. `start` now
detects a stale install (declared range vs installed version) and prints a `STALE DEPENDENCIES`
warning naming the fix — do not trust the worktree as a test baseline until that warning is gone. The `pre-push` hook detects a session
worktree (its `git-dir` differs from the shared `git-common-dir`) and **skips the local
typecheck with a clear message**, because the workspace symlinks resolve `@cognnitive/*` to the
primary checkout and a local typecheck would check the wrong tree. CI runs the real typecheck
on the pushed ref; watch the run. No `--no-verify` and no per-session `npm install` needed.

⚠️ The same junction problem makes a session worktree a **poor baseline for test
diagnosis**. `node_modules/@cognnitive/*` resolves to the **primary**, so a test run
"at main" in a junctioned worktree is not really main — it may fail (or pass) for the
wrong reason. When you need a trustworthy baseline to decide whether a failure is
pre-existing:
- Do NOT `git worktree add --detach <tmp> <sha>` + junction — that is contaminated.
- Prefer the **primary checkout** if it has real `npm ci` deps and a built
  `innfo-core/dist`; run the test there with the workspace's own `vitest`.
- The `innfo-mcp` suite is also **slow** in a worktree (junctions + Windows fs):
  several cascade tests take ~5-7s and cross vitest's default 5s timeout, which
  surfaces as misleading `expected false to be true` assertion errors, not "timed out".
  When a fast-looking assertion error appears on a test known to be slow, re-run it
  alone with `--testTimeout=30000` before believing it.

### 1b. Primary-tree health check

Isolation makes write collisions impossible, so there is no process scan. What *does*
drift is the primary checkout itself: it must stay on `dev`, clean, and in sync with
`origin/dev` (it is the base every session worktree is cut from). One command reports it
all — branch, dirtiness, `origin/dev` sync, pending batch, worktrees, stash, and stale deps:

```powershell
node scripts/nn-session.mjs status
```

`status` fetches (best-effort, offline-safe) and prints one block; it always exits 0.
It also flags **stale dependencies** — an installed version below the declared range —
because a session worktree inherits the primary's install through junctions, so a stale
primary silently poisons every test and gate run in the worktree (the false-baseline trap
of issue #122). `start` prints the same warning. The fix is `npm install` in the **primary**.

If the primary is not on `dev`, is dirty, or is behind, **say so first** — do not write
into it. A clean-but-behind primary may be fast-forwarded (`git switch dev` then
`git merge --ff-only origin/dev`). A dirty one is someone's residue: save the diff as a patch
outside the repo, then revert it with `git apply --reverse <patch>`, and tell the maintainer.
Flag `origin/main` advancing past the session baseline (rebase before the batched merge).

### 1c. Record the baseline

`$baselineHead`, `$baselineBranch`, `$baselineMain` — anchor points for the merge checks
in Section 4.

---

## 2. Branch Discipline

- **Work on `session/<id>`** inside the session worktree. It is cut from `dev`; `dev` is
  the integration branch, never a place to edit directly. No other per-feature branches.
- **Commit early and often** on the session branch. A `wip:<session-id>: <reason>` commit is
  the durability mechanism, not a first-write gate. `wip:` commits are session-branch
  checkpoints, **not integration content**: squash or drop them before landing on `dev`
  (squash-merge the PR, or `git reset --soft` back to the last real commit and re-commit).
  A `wip:` commit must never reach `dev`.
- **A commit that exists only locally is not durable.** Push the session branch
  (`git push origin session/<id>`) as soon as it holds anything you would mind losing.
- **Landing on `dev`:** push the session branch and merge it into `dev` (a PR on GitHub is
  the normal path; a local `--ff-only` merge in the primary is fine for a single clean
  commit). Run `git merge origin/dev` into the session branch first if `dev` moved.
  Then `nn-session.mjs stop`.
- `git add -A` / `git add .` / `git commit -a` are **permitted** (the worktree only holds
  your own work). The destructive commands `reset --hard`, `clean`, `stash`, `branch -D`,
  and `checkout/restore .` stay **blocked** by `.claude/hooks/block-dangerous-git.mjs` —
  they can still erase your own uncommitted work.

### 2a. Maintainer requests a dedicated branch

If the maintainer explicitly requests a dedicated branch, honor it with the conventional
shape `<tipo>/<kebab-case>`; treat it as the session's integration target.

---

## 2b. Change size decides the process lane

For a solo developer driving agents, the full SDD + integrity ceremony on every change is
the main source of drag. Match the ceremony to the blast radius — never run the heavy lane
"just in case":

- **Light lane (default).** A change that touches one module, adds no public contract, and
  needs no release: work in the session worktree, commit on `session/<id>`, push, open a PR,
  and let CI be the verifier. **No** OpenSpec proposal/design/spec/tasks, **no** full
  `check-integrity`. This covers most bug fixes and internal refactors.
- **Heavy lane.** Public contract changes, product behavior, a release/version bump, a
  migration, or anything cross-cutting: run the full SDD cycle (`nn-dev-check-integrity`
  after apply) and the batched merge in §4.

Rule of thumb: if CI can catch a mistake before it reaches `main`, the light lane is enough.

### 2c. Keep the backlog shrinking

Do not register a new OpenSpec change while the active backlog is large. At the time of
writing there were **14 active changes against 154 archived** — the backlog was growing
faster than it drained, which is bureaucracy feeding itself. Prefer draining over proposing:
fix in place, or fold a small finding into the change already open for that area.

---

## 3. Worktree Lifecycle

- `node scripts/nn-session.mjs stop --id <session-id>` removes the worktree and its
  `session/<id>` branch **only if** the branch is merged into `dev` (local or `origin/dev`);
  otherwise it refuses and lists the unique commits. It also refuses a dirty worktree:
  save what matters, then revert the rest (`git apply --reverse` of a saved patch).
  A missing, empty, or process-locked leftover dir is tolerated: `stop` deregisters the
  worktree, deletes the merged branch, cleans an empty leftover dir, and reports any dir a
  live process still holds — it never crashes on one (recovery for the 2026-10-08 lock bug).
- `node scripts/nn-session.mjs list` shows each session worktree and its branch.
- A worktree that is clean **and** merged is safe to `stop` as soon as the session ends;
  do not let them pile up. Never remove one whose branch has unique commits, and never
  delete other branches automatically (ghost branches are candidates for the maintainer).
- **A session worktree you did not create may be live.** Ids get reused, and another agent
  can start editing in a worktree minutes after you last looked at it. Before reverting or
  stopping one, re-run `git status --porcelain` on it, and revert **only the named paths**
  (`git diff -- <path> > patch`), never a bare `git diff`/`git apply --reverse` of the
  whole tree. On 2026-10-06 a whole-tree revert silently undid another session's
  uncommitted edits; they were recoverable only because the patch had been saved first.
- Known noise: `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` shows as modified
  in worktrees (esbuild writes `../<repo>/node_modules/...` paths through the junction).
  Never commit it from a worktree; revert it before `stop`.

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
git diff --name-only origin/main..origin/dev | grep '^iNNfo/specs/bluepriNNts/'
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
   `npm run check:versions`. Resolve drift before pushing. Ensure the tree is
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
   run for the pushed sha completes; require `verify`, `quality`, `spec-integrity`, `site`,
   `publish-web` all `success`. Distinguish red-caused-by-batch (fix-forward) from pre-existing red
   (maintainer-approved `MERGE-GATE EXCEPTION`).
   - **Confirm pre-existing red before attributing it.** A red job on `dev` is not proof
     the batch caused it. Before fixing: run the failing test/guard against the batch
     base (`origin/main`) in a trustworthy checkout (see §1a - not a junctioned worktree),
     or compare against a CI run of the batch base. Only a failure that reproduces on the
     base is pre-existing. On 2026-10-04 a red `console-golden-parity` (mcp suite) looked
     batch-caused and cost hours of guessing; it reproduced on `main` and was a
     pre-existing resolver bug (issue #122), unrelated to the batch.
   - **Do not fix pre-existing red as a rider.** A pre-existing failure gets its own issue
     and its own verified change; folding an unrelated fix into the batch mixes scopes and
     multiplies blast radius. Record the exception and proceed, or stop and ask the
     maintainer - never silently expand the batch.
   - **A partial fix that does not turn CI green is worse than none.** If a fix removes
     one blocker but exposes a second (the 2026-10-04 resolver fix exposed a schema-parity
     diff AND regressed `listBlueprintProcedures`), revert it and file the finding - a fix
     that leaves CI red adds churn and hides the real state.
   - **Release freeze:** once a release tag is cut, no session may push `dev`/`main`
     until that tag's workflow concludes — a moved `origin/main` breaks the tag's own
     verification and its already-limited re-run. See `nn-dev-release` §4/§4b.
4. **Release tagging** (only for a version bump): run `nn-dev-release` to create and push
   an annotated release tag (`<key>-v<semver>`: `skills-v*`, `blueprints-v*`, `innfo-mcp-v*`,
   `innfo-console-v*`); a red `main` blocks tagging.
5. **Persist the milestone** in Engram for sibling sessions.

---

## 5. Pre-Refactor Snapshot & Rollback Protocol (Restore Point Gate)

Before high-impact changes, establish an immutable restore point.

- **Formal release** (`dev` clean + gates green): merge `dev → main`, create annotated
  tag `<key>-v<semver>` (e.g. `innfo-console-v0.6.0`, `skills-v0.12.0`), push tag to trigger
  `release.yml`.
- **Checkpoint tag** (mid-flight): `git tag -a checkpoint/<topic>-YYYYMMDD -m ...` and push.

### Rollback (scoped, non-destructive)

```powershell
git diff -- <explicit/path> > ../backup.patch; git apply --reverse ../backup.patch   # revert one file, with a backup (a bare `checkout <ref> -- path` is blocked)
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
