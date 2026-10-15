# Simplification & Cleanup Plan — cogNNitive

**Date**: 2026-10-14
**Scope**: Repo hygiene, OpenSpec change consolidation, issue/backlog de-duplication,
and concurrency governance for the cogNNitive monorepo.
**Status**: Draft — awaiting execution. Phase 1 is blocked until the concurrent
session finishes (see *Root cause*).

---

## Root cause

The "chaos" is not clutter — it is **multi-agent concurrency**. During a single
audit window (~30 min) on 2026-10-14, `dev` moved `b1e06bbc → b8cd1cd5 → 52debbeb`,
a live worktree (`nn-dev-skills-cleanup`) with uncommitted edits disappeared, a new
worktree (`s3-domain-console`) appeared, and the **S2c change was merged and archived
by another session**. Every symptom below (ghost branches, orphan directories, a stale
dependency doc, a split issue backlog) is a downstream effect of sessions that were
never garbage-collected.

**Implication**: no phase may assume the state read earlier. Re-baseline before every
action. Land each phase as a small PR to `dev`, never a mega-change.

## Tree state at authoring

- Primary checkout: `dev @ 52debbeb`, clean, in sync with `origin/dev`.
- Pending batch (`origin/main..origin/dev`): **2 commits**.
- Local worktrees: 8 (7 session + primary).
- Remote `session/*` branches: **51**, of which **46 are already merged** into `origin/main`.
- `stash@{0}`: `temp-primary-build-residue` (one binary bundle diff only).

---

## Phase 0 — Concurrency guards (apply to every phase)

1. **Re-baseline before each action**: `node scripts/nn-session.mjs status`.
2. **Never touch a worktree you did not create** without re-running
   `git status --porcelain` in it *immediately* before. A live session can edit a
   reused id minutes after the last look (observed on 2026-10-06 and again today).
3. **One phase = one PR to `dev`.** Conventional commits, no AI attribution.
4. **Do not delete branches automatically.** Ghost branches are *candidates*; the
   maintainer confirms the batch.

---

## Phase 1 — Disk & trash

### 1.1 Orphan directories — `cogNNitive-LC-DELL-PC-{12820,25120,7040}` (~1.3 GB)

Three full checkouts **without a `.git`** (not registered as worktrees, no admin
entry under `.git/worktrees/`), last modified 2026-10-12.

**Evidence they are redundant snapshots, not unique work:**
- `12820/scripts` vs `7040/scripts` → **identical** (empty diff).
- `12820` vs `25120` → differ by **1 file** (`skills/nn-preflight/scripts/preflight-check.js`, 4 lines).
- All three are 440.1 MB.

**Action**: delete directly, or — if a safety net is wanted — compress to
`../cogNNitive-backups/` first, keep for a few days, then delete.

```powershell
foreach ($d in 'cogNNitive-LC-DELL-PC-12820','cogNNitive-LC-DELL-PC-25120','cogNNitive-LC-DELL-PC-7040') {
  Remove-Item -LiteralPath "D:/Users/lucas/Documents/GitHub/$d" -Recurse -Force
}
```

Reclaims ~1.3 GB.

### 1.2 Ghost branches — 46 merged remote `session/*`

All 46 tips are ancestors of `origin/main`. Delete them; preserve the live ones
(`LC-DELL-PC-1516`, `LC-DELL-PC-29192`, `backlog-video-review-console`,
`skills-lifecycle-external`, `testlab-console-regen`, and any newer session).

```powershell
$live = 'LC-DELL-PC-1516','LC-DELL-PC-29192','backlog-video-review-console','skills-lifecycle-external','testlab-console-regen'
git fetch origin --prune
foreach ($b in (git branch -r --format='%(refname:short)' | Where-Object { $_ -like 'origin/session/*' })) {
  $name = $b -replace '^origin/',''
  if ($live -contains ($name -replace '^session/','')) { continue }
  git merge-base --is-ancestor $b origin/main 2>$null
  if ($LASTEXITCODE -eq 0) { git push origin --delete ($name -replace '^session/',''); git branch -D $name 2>$null }
}
```

The full candidate list is in the Appendix.

### 1.3 Stash

`stash@{0}` = `temp-primary-build-residue` (only `innfo-mcp.bundle.js`, regenerated
by `npm run stage:mcp-bundle`). **`git stash drop` is blocked by the guard hook**
(`/git\s+(add|commit|stash)/`). The maintainer drops it, or it is left as harmless.

### 1.4 Locked leftover directory

`cogNNitive-consolidate-console/` was de-registered and its branch deleted, but the
directory is held by a live process. Delete it once the lock clears:

```powershell
Remove-Item -LiteralPath "D:/Users/lucas/Documents/GitHub/cogNNitive-consolidate-console" -Recurse -Force
```

### 1.5 Scratch

`temp/` (0.3 MB) is disposable scratch per the skill. Clear it.

### 1.6 Untracked junk already removed this audit (for the record)

- **53** `specs/*.tmp-*` files (crashed-write residue, PID 9912; untracked + gitignored).
- **155** `.verify-logs/*` gate logs (regenerable).
- **3** merged worktrees stopped + local branches deleted: `consolidate-console`,
  `lineage-changeset`, `single-console-shell`.
- **2** empty orphan dirs deleted: `cogNNitive-archive-nested-l3`, `cogNNitive-console-hardening-plan`.

---

## Phase 2 — OpenSpec consolidation

### 2.1 `openspec/changes/2026-10-13-DEPENDENCIES.md` is STALE — fix first

It lists **SCS**, **#1A** (`changeset-first-class-and-lineage`), **#1B**
(`changeset-immutability-and-snapshot-removal`), **#1C**
(`console-changes-view-and-slug-ids`) and now **S2c** as pending, but **all five are
already archived** under `openspec/changes/archive/`. Rewrite or retire the doc so the
apply-order graph reflects reality.

### 2.2 Shrink 8 active changes toward ~3–4

Active changes today:
`nn-quarantine-removal`, `nn-domain-git-workflow`, `blueprint-external-skills`,
`video-script-contract-additions`, `s3-domain-console-and-edit-modal`,
`s4-retire-legacy-migration-flows`, `s5-retire-innfo-editor`,
`s6-console-regeneration-and-propose`.

- **Lineage cluster S3/S4/S5/S6** (~2,400 lines of spec across 4 dirs) → collapse under
  one umbrella change (`stable-identity-and-changesets`) with numbered slices, or
  re-cut to 2. The slice-per-directory split plus a 130-line dependency doc is pure
  overhead.
- **`nn-quarantine-removal`** — with S2c shipped, the unblock is closer; **S4 remains a
  prerequisite** (the migration half). Keep BLOCKED until S4 lands.
- **`nn-domain-git-workflow`** — 13 lines, proposal-only, **no `tasks.md`**, pending
  since 2026-10-01. Decide: **delete or complete**. It is a ghost.
- `blueprint-external-skills` (409 lines) and `video-script-contract-additions`
  (293 lines) are well-scoped; leave them.

### 2.3 Keep the standing rule

No new OpenSpec change while the active backlog is large. Prefer draining.

---

## Phase 3 — Issues & backlog

### 3.1 Move the 16 product issues out of `cogNNitive/cogNNitive-web`

That repo is *"generated output only — never hand-edited"*, yet it hosts 16 monorepo
issues (console export, changeset DX, video-engine, TTS, preflight). Consolidate them
into `cogNNitive/cogNNitive` (transfer or re-file), and add a rule: the web repo accepts
only *distribution* issues.

### 3.2 Split `openspec/backlog.md`

795 lines / 34 items, mixing active work with `deferred` / `someday-maybe`. Split into
`backlog.md` (active) + `backlog-deferred.md`. Halves the reading noise.

---

## Phase 4 — Governance (the root)

- **Reproducible GC**: a script/alias that prunes merged worktrees and merged remote
  `session/*` branches (today it is manual, so it accumulates).
- **Concurrency policy**: cap parallel sessions and a naming convention so
  "who has what" stays legible.
- **Fix the `dev/` directory vs `dev` branch collision**: it breaks `git log dev`
  (ambiguous revision/filename). Use `refs/heads/dev`, or rename the directory.

---

## Execution order

**1 → 2 → 3 → 4.** Phase 1 reclaims disk and visual noise immediately; Phase 2 is what
actually reduces conceptual chaos.

**Gate**: Phase 1 does not start until the concurrent session finishes. Re-run
`node scripts/nn-session.mjs status` at that moment and confirm `origin/dev` is stable.

---

## Appendix — inventories

### Live (unmerged) remote `session/*` branches — DO NOT DELETE

`session/LC-DELL-PC-1516`, `session/LC-DELL-PC-29192`,
`session/backlog-video-review-console`, `session/skills-lifecycle-external`,
`session/testlab-console-regen`.

### Merged remote `session/*` branches — deletion candidates (46)

```
session/88863064                      session/console-seal-fix
session/LC-DELL-PC-10128              session/console-shell-mockup2
session/LC-DELL-PC-34460              session/console-stale-banner
session/archive-closeout              session/consolidate-console
session/archive-nested-l3             session/deepseek-archive
session/cards-mockups                 session/domainn-proc-drift
session/cleanup-dead-types            session/drift-skills-ts
session/cleanup-vus-plumbing          session/drift-tsconfig
session/cognnitive-dogfooding         session/external-skills-pin
session/conditional-fields            session/fix-domainn-drift
session/console-field-badge           session/fix-skills-ts
session/console-gaps                  session/fix-video-script-version-bump
session/console-hardening-plan        session/ghostbusters-sample
session/console-ku-badges             session/integrate-pending
session/console-model-predicate       session/lineage-changeset
session/longtail-refactors            session/release-dev-green
session/openspec-reconcile            session/review-fixes
session/proposal-sha-recompute        session/s2c-legacy-provenance
session/purge-villabotijos-from-repo  session/single-console-shell
session/testlab-procedures            session/tier3-hygiene
session/testlab-regen-origin          session/tier3-license
session/tier0-tier1-closeout          session/tier4-backlog
session/trannsform-mirror-fix         session/video-script-innfo-model
```

### Already archived but still referenced as pending by `DEPENDENCIES.md`

`single-console-shell` (SCS), `2026-10-13-changeset-first-class-and-lineage` (#1A),
`2026-10-13-changeset-immutability-and-snapshot-removal` (#1B),
`2026-10-13-console-changes-view-and-slug-ids` (#1C),
`2026-10-13-s2c-retire-legacy-provenance` (S2c).
