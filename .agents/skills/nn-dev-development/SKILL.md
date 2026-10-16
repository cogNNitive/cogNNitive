---
name: nn-dev-development
version: "1.4.0"
description: Internal developer skill for cogNNitive maintainers. Enforces session isolation on a single-developer, multi-agent repo: each write-intended session works in its own git worktree of `dev` (created by `scripts/nn-session.mjs start`), leaving the primary checkout as a read-only integration/release point. Enforces commit-early, picks the process lane by change size, manages UI console feedback cycles from annotated images, and orchestrates the batched `dev -> main` merge through verify.js + CI + nn-dev-release. Trigger: any development session, concurrency check, branch decision, session start, session isolation, UI feedback loop.
---

# nn-dev-development Skill (Session Isolation & Integration Guard)

## Overview

`nn-dev-development` is the maintainer-only session guard for `cogNNitive`. This repo is
operated by **one developer** driving several AI agents (OpenCode, Claude Code, Antigravity)
that may run concurrently. The recurring failure is mechanical — N processes writing one
directory — and the fix is **isolation, not attribution** (attribution failed twice; it is
undecidable from git alone).

### The model

- **One integration branch: `dev`.** All day-to-day work lands on `dev`; `main` only
  absorbs batched merges.
- **One worktree per session.** Every write-intended session works in its own
  `git worktree` of `dev`, created by `scripts/nn-session.mjs start`.
- **The primary checkout is read-only.** It exists for integration and release only:
  merge `dev -> main`, `push`, `tag`, `fetch`, and gate runs. A `PreToolUse` hook
  (`.claude/hooks/guard-primary-tree.mjs` + `.agents/hooks.json`) denies file edits and
  `git add`/`commit`/`stash` there.
- **Commit early.** Never hold a dirty tree; `wip:<session-id>: <reason>` checkpoints keep
  work durable across a crash.
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

## 1. Session Start

### 1a. Isolate (before any write)

From the primary checkout:

```powershell
node scripts/nn-session.mjs start --id <short-kebab-id>
```

This creates the worktree `../cogNNitive-<id>` on branch `session/<id>` cut from
`origin/dev`, and runs a real `npm ci` there (root + `skills/nn-sources`). Pass
`--no-install` only for docs-only work. Do all writes, commits and pushes from that
worktree. If the tool environment refuses a worktree as `cwd`, keep the primary as `cwd`
and use absolute paths or `git -C <worktree>`.

### 1b. Primary-tree health check

```powershell
node scripts/nn-session.mjs status
```

One block: branch, dirtiness, `origin/dev` sync, pending batch, worktrees, stash. It fetches
best-effort and always exits 0. If the primary is not on `dev`, is dirty, or is behind,
**say so first** — do not write into it. A clean-but-behind primary may be fast-forwarded
(`git switch dev` then `git merge --ff-only origin/dev`). A dirty one is someone's residue:
save the diff as a patch outside the repo, revert only the named paths, and tell the
maintainer.

### 1c. Concurrency check (read-only)

`status` lists every session worktree. Before touching shared files (skills, scripts,
hooks, workflows), check that no other worktree has them modified:

```powershell
git -C <worktree> status --porcelain -- <paths>
git -C <worktree> diff --name-only origin/dev...HEAD -- <paths>
```

A worktree you did not create may be live; do not stop or revert it (§3).

---

## 2. Branch Discipline

- **Work on `session/<id>`** inside the session worktree. `dev` is the integration
  branch, never a place to edit directly. No other per-feature branches.
- **Commit early and often.** `wip:<session-id>: <reason>` commits are session-branch
  checkpoints, **not integration content**: squash or drop them before landing on `dev`
  (squash-merge the PR, or `git reset --soft` to the last real commit and re-commit).
  A `wip:` commit must never reach `dev`.
- **A commit that exists only locally is not durable.** Push the session branch
  (`git push origin session/<id>`) as soon as it holds anything you would mind losing.
  If the pre-push typecheck crashes for environmental reasons (out-of-memory, exit 134 /
  `0x80000003`), retry once, then `--no-verify` is acceptable **for session-branch
  checkpoints only** — CI typechecks at integration.
- **Landing on `dev`:** merge `origin/dev` into the session branch if it moved, push, then
  merge via PR (normal path) or a server-side fast-forward `git push origin session/<id>:dev`
  for a single clean commit. Cleanup of the worktree/branch is deferred to the §4c sweep. "Land my changes" means landing
  **this session's own branch** — never "commit everything that is dirty". Another agent's
  uncommitted or unpushed work is not yours to commit, push or land.
- `git add -A` / `git add .` / `git commit -a` are **permitted** (the worktree only holds
  your own work). `reset --hard`, `clean`, `stash`, `branch -D`, and `checkout/restore .`
  stay **blocked** by `.claude/hooks/block-dangerous-git.mjs`.
- To revert one file to a ref without the blocked `checkout`:
  `git show <ref>:<path> > <path>` (or the `node -e` read-through in
  `nn-dev-check-integrity` §Group 3c).

### 2a. Maintainer requests a dedicated branch

If the maintainer explicitly requests a dedicated branch, honor it with the shape
`<tipo>/<kebab-case>` and treat it as the session's integration target.

---

## 2b. Change size decides the process lane

Match the ceremony to the blast radius — never run the heavy lane "just in case":

- **Light lane (default).** One module, no public contract, no release: work in the
  session worktree, commit, push, PR, and let CI verify. **No** OpenSpec change, **no**
  `nn-dev-check-integrity`. Covers most bug fixes and internal refactors.
- **Heavy lane.** Public contract changes, product behavior, a release/version bump, a
  migration, or anything cross-cutting: full SDD cycle, then the batched merge in §4.

Rule of thumb: if CI can catch a mistake before it reaches `main`, the light lane is enough.

### 2c. Keep the backlog shrinking

Do not register a new OpenSpec change while the active backlog is large. Count it live
instead of trusting a number written here:

```powershell
(Get-ChildItem openspec/changes -Directory | Where-Object Name -ne archive).Count
```

Prefer draining over proposing: fix in place, or fold a small finding into the change
already open for that area.

---

## 2d. UI Console Feedback Protocol (Annotated Images & Fixture Export)

When UI improvements or adjustments to the iNNfo console (`iNNfo/specs/bluepriNNts/console/...`)
are driven by annotated screenshots or visual feedback from the maintainer, adhere to the following
strict cycle:

1. **Analyze & Summarize**: Inspect every attached image, deduce all visual/structural changes,
   and present a clear summary of the changes to the user.
2. **Confirm Before Coding**: Ask for explicit confirmation before touching any code. Never
   assume or start implementing speculative UI changes.
3. **Session Worktree Isolation**: All edits must happen inside a dedicated `nn-session` worktree.
4. **Rebuild Bundle & Regenerate Fixture**:
   - Whenever console styles (`innfo-ui.css`), components (`ui-kit.js`), runtime (`innfo-runtime.js`),
     review tools (`review.js`), or shell (`artifact_shell.html`) are updated, compile the bundle:
     ```powershell
     node scripts/build-console-bundle.mjs
     ```
   - Regenerate the testlab domain console fixture:
     ```powershell
     node scripts/export-console.mjs test/fixtures/testlab --domain --no-open
     ```
   - `export-console.mjs` automatically updates inline script sha256 hashes via `allowInlineScripts`
     in the `<meta http-equiv="Content-Security-Policy">` tag. Never edit generated inline script
     hashes by hand.
5. **Fixture Persistence in Git**:
   - The generated fixture (`test/fixtures/testlab/domaiNN_console.html`) MUST be committed in the
     session branch together with the source modifications. Never leave the fixture uncommitted or
     stranded in an unmerged/deleted worktree.
6. **Provide Working Link & Gate**:
   - Verify that the regenerated file contains the expected changes.
   - Provide a clickable `file:///...` link to the active worktree's fixture (or to the primary checkout
     only after landing on `dev`).
   - STOP and wait for the maintainer's confirmation before landing the changes or closing the session.

---

## 3. Worktree Lifecycle

- `node scripts/nn-session.mjs stop --id <session-id>` removes the worktree and its
  `session/<id>` branch **only if** the branch is merged into `dev` (local or `origin/dev`);
  otherwise it refuses and lists the unique commits. It also refuses a dirty worktree:
  save what matters, then revert the rest. A missing, empty, or locked leftover dir is
  tolerated and reported, never a crash.
- `node scripts/nn-session.mjs list` shows each session worktree and its branch.
- `node scripts/nn-session.mjs batch-status` is the read-only batch precheck (§4-pre).
- A session does **not** have to `stop` its own worktree when it ends: cleanup is batched
  into the offered sweep at batch/release time (§4c). A clean **and** merged worktree is
  always safe to `stop` earlier if the maintainer asks. Never remove one whose branch has
  unique commits, and never delete other branches automatically (ghost branches are
  candidates for the maintainer).
- **A session worktree you did not create may be live.** Ids get reused and another agent
  can start editing minutes after you last looked. Before reverting or stopping one,
  re-run `git status --porcelain` on it, and revert **only the named paths**
  (`git diff -- <path> > patch`), never a bare whole-tree `git diff`/`git apply --reverse`
  (2026-10-06: a whole-tree revert silently undid another session's uncommitted edits).

---

## 4. Batched Merge to `main`

### 4-pre. Batch precheck (MANDATORY, read-only)

Before any step below, run:

```powershell
node scripts/nn-session.mjs batch-status          # add --json for machine output
```

It fetches best-effort and reports, without writing anything: the `origin/main...origin/dev`
ahead/behind and the commits that would land; open PRs; every non-primary worktree (dirty
files, commits not in `origin/dev`, whether its branch exists on origin — `UNBACKED` means
local commits with no remote branch); CI for both tips and any run in progress on another
branch (an active agent); and, per release key, the latest remote tag, the files changed
since it, and "bump needed" when files changed but the authored version equals the tag.

The last line is the verdict:

- `READY` — proceed with 4a onward.
- `NOT READY` or `UNKNOWN` (e.g. `gh` unavailable) — **STOP.** Report the listed reasons to
  the maintainer. Do not wait, retry in a loop, or work around it.

Hard non-goals — the batch **never**:

- commits or pushes another agent's uncommitted or unbacked work;
- touches a worktree it did not create (read-only inspection only, §1c/§3);
- cuts a tag without the maintainer's explicit confirmation in chat. It may **prepare and
  propose** the tags and their order from the per-key output, following `nn-dev-release`.

### 4a. Did origin/main advance?

```powershell
git fetch origin
git log --oneline -3 origin/main
```

Compare against the session baseline. If `origin/main` advanced, merge it into `dev` first.

### 4b. What is on `dev` but not `main`?

Always compare remote tracking refs, never local `main`:

```powershell
git log --oneline origin/main..origin/dev
git diff --stat origin/main..origin/dev
```

### 4c. Cleanup sweep (offered, never automatic)

Session worktrees and branches are **not** removed one conversation at a time; they are
swept here, at batch/release time, once the maintainer says yes. Build the candidate list
read-only and present it:

- **Worktree + `session/<id>` branch:** candidate only if the worktree is clean (or an
  empty leftover dir) **and** its work is in `origin/dev` — branch is an ancestor of
  `origin/dev`, or its PR is merged (`gh pr list --state merged --head session/<id>`).
  A squash-merged branch is never an ancestor, so `stop` will refuse it: report it as
  "merged via PR, `stop` will refuse" and let the maintainer decide.
- **Other branches** whose tip is already in `main`
  (`git merge-base --is-ancestor <branch> origin/main`): flag as safe-to-delete candidates.
- **Never a candidate:** a dirty worktree, unique or `UNBACKED` commits, or any worktree
  `batch-status` shows as active. Those are reported, never touched.

After an explicit yes in chat, run `node scripts/nn-session.mjs stop --id <id>` per
candidate. Remote branches (`git push --delete`) are blocked for agents: list them for the
maintainer. Until the sweep, merged worktrees may pile up — that is accepted; leftover
squash-merged ones can make `batch-status` report `NOT READY`, so sweep before the precheck
when it does.

### 4d. Batched merge orchestration

When the maintainer says the accumulated `dev` work is ready:

1. **Gate = `node scripts/verify.js` + CI on `dev`.** `verify.js` is the deterministic,
   offline gate (every step runs, it never stops on first failure). A green CI run on the
   `dev` tip is required (`gh run list --branch dev --limit 1`). `check-integrity.js` is
   **not** part of the merge gate: it hangs in this environment (observed 2026-10-13, no
   output after the video-script suite) and `verify.js` + CI cover the same batch. Run it
   only on request, with a bounded timeout, and file a hang as its own issue — never as a
   batch blocker. Also run `npm run check:versions`.
2. **Server-side fast-forward (`dev -> main`)** — never checks out `main`:
   ```powershell
   git push origin dev
   git push origin dev:main
   git rev-list --left-right --count origin/main...dev   # expect 0 0
   ```
   On rejection: `git fetch origin && git merge origin/main` on `dev`. If tagging, tag
   immediately after this push, before any further commit on `dev`.
3. **Post-push CI gate on `main` — blocking**: poll `gh run list --branch main` until the
   run for the pushed sha completes; require `verify`, `quality`, `spec-integrity`, `site`,
   `publish-web` all `success`. Distinguish red-caused-by-batch (fix-forward) from
   pre-existing red (maintainer-approved `MERGE-GATE EXCEPTION`).
   - **Confirm pre-existing red before attributing it.** Run the failing test/guard against
     the batch base (`origin/main`) in a checkout with real deps, or compare against a CI
     run of the base. Only a failure that reproduces on the base is pre-existing
     (2026-10-04 `console-golden-parity` cost hours of guessing; it was a pre-existing
     resolver bug, issue #122).
   - **Do not fix pre-existing red as a rider.** It gets its own issue and verified
     change. Record the exception and proceed, or stop and ask the maintainer.
   - **A partial fix that does not turn CI green is worse than none.** Revert it and file
     the finding.
   - **Release freeze:** once a release tag is cut, no session may push `dev`/`main`
     until that tag's workflow concludes. See `nn-dev-release` §4/§4b.
4. **Release tagging** (only for a version bump): run `nn-dev-release`
   (`<key>-v<semver>`: `skills-v*`, `blueprints-v*`, `innfo-mcp-v*`, `innfo-console-v*`);
   a red `main` blocks tagging.
5. **Persist the milestone** in Engram for sibling sessions.

Handoff block:

```markdown
🌿 Session guard:
- Branch: dev · based on origin/main @ <sha> · clean/dirty
- Session: <session-id> · worktree <path>
- origin/main advanced during session: <yes|no>
- Pending batch (origin/main..dev): <commits> · <stat>
- Next: verify.js + green dev CI, then nn-dev-release to merge dev → main
```

---

## 5. Snapshot & Rollback

- **Formal release** (`dev` clean + gates green): merge `dev → main`, create annotated
  tag `<key>-v<semver>`, push the tag to trigger `release.yml`.
- **Checkpoint tag** (mid-flight): `git tag -a checkpoint/<topic>-YYYYMMDD -m ...` and push.

```powershell
git diff -- <explicit/path> > ../backup.patch; git apply --reverse ../backup.patch   # revert one file, with backup
git worktree add --detach temp/rollback <tag>                                        # inspect a tag without touching the tree
git update-ref refs/heads/dev '<tag>^{commit}' <old-sha>                             # atomic compare-and-swap
git push origin dev --force-with-lease                                               # only with maintainer consent
```

---

## Core Rules

1. **Isolate first** — `nn-session.mjs start` before any write; never write to the primary.
2. **Never guess git state** — re-read `git status -sb` / `HEAD` before reporting or writing.
3. **Single branch** — day-to-day work lands on `dev`; `main` only absorbs batched merges.
4. **Commit early** — prefer a `wip:<session-id>` commit over a dirty tree; never land it on `dev`.
5. **Never run destructive git** — `reset --hard`, `clean`, `stash`, `branch -D`,
   `checkout/restore .` are blocked and must not be prescribed.
6. **Never delete branches automatically** — ghost branches are candidates.
7. **Read-only inspection of other sessions** — never touch a worktree you did not create.
8. **Monorepo scope** — cogNNitive repository root only.
9. **Disposable scratch lives in `temp/`** (gitignored), deleted after the run.
