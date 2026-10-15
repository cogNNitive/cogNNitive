# Handoff prompt — cogNNitive console-unification arc: finish it (S5-delete, then close the batch)

You are an AI coding agent taking over the last part of an in-progress body of work in the
cogNNitive repository. Read this whole prompt before doing anything. The maintainer will NOT be
available: you have standing permission to carry the batch to the end WITHOUT asking, within the
limits in section 6. Do things one after another, agilely: implement a whole unit, verify ONCE
(bounded), move on. Do not verify after every edit.

## 0. Repository and non-negotiable session protocol

- Repo: cogNNitive. Primary checkout: D:\Users\lucas\Documents\GitHub\cogNNitive
  (Windows; shell is PowerShell/Git Bash; `&&` is not a PowerShell statement separator).
- The primary checkout is READ-ONLY (integration/release only), guarded by a PreToolUse hook.
  NEVER write to it. MANDATORY first action: load the skill `nn-dev-development`
  (`.agents/skills/nn-dev-development/SKILL.md`), then isolate:
  `node scripts/nn-session.mjs start --id <short-kebab-id>`
  (use `--no-install` only for docs-only work; then the pre-push typecheck cannot run and a
  docs-only push may use `git push --no-verify`, CI typechecks at integration).
- `start` cuts the worktree from a possibly stale local `dev`. Immediately in the worktree:
  `git fetch origin` then `git merge --ff-only origin/dev`; confirm
  `git rev-list --left-right --count origin/dev...HEAD` is `0 0`.
- Landing: work on `session/<id>`, conventional commits, NEVER add AI attribution /
  Co-Authored-By (the maintainer rule overrides any default). Land on `dev` with a fast-forward
  `git push origin HEAD:dev` (merge `origin/dev` first if it moved). A fresh-context review
  (agent `jd-judge-a`, read-only, bounded) is required before pushing code to `dev`.
  Afterwards `node scripts/nn-session.mjs stop --id <id>` (only when merged and the tree clean).
- Tool gotchas learned the hard way:
  - `guard-primary-tree` blocks Edit/Write and any staging or commit command when the session cwd
    is the primary checkout, even for worktree or scratchpad paths. Write files through
    Bash/python/node scripts and run git as `git -C <worktree> ...`. A command whose TEXT mentions
    those git verbs can also be blocked.
  - A Bash command with a heredoc that contains a lone apostrophe can fail to parse: avoid
    apostrophes in text you write that way, and write long files in several chunks.
  - Python/Windows edits write CRLF and break shebangs (`scripts/export-console.mjs` must keep an
    LF shebang, zero CRs). Keep LF.
  - The Bash tool collapses double backslashes in heredocs: re-check any regex written that way.
  - The CC Safety Net hook blocks `git checkout <ref> -- <path>`; use `git show <ref>:<path> > <path>`.
  - Do not use cat/grep/find/sed/ls; use the dedicated tools or rg/fd/bat.
  - NEVER run `npm ci` from a subagent/worktree you did not create with `start` (node_modules can be
    junctions; it corrupts the primary). Builds only.
  - Running all `test/console-*.test.mjs` in ONE `node --test` call runs out of memory: run them
    one file at a time.
  - A `sleep` chained before another command is blocked: use the Monitor tool with an until-loop
    to wait for CI / release workflows.

## 1. Where things stand (verify, do not trust blindly)

`origin/dev` tip at handoff: `d93d633c` (CI green), plus the handoff commit that adds this file.
`origin/main` is at `299708a1`.

DONE, applied, ARCHIVED and RELEASED in this batch:
`single-console-shell`, #1A, #1B, #1C, S2c, `blueprint-external-skills`, S3 (domain console and
edit modal, all groups, archived 2026-10-15), S4 (retire legacy migration flows), S6
(console regeneration, `add_model`, `propose_changeset`, `init_domain`, archived 2026-10-14),
`matrix-header-context-resolution`.
Published tags: `blueprints-v0.33.0`, `innfo-mcp-v0.21.0`, `innfo-console-v0.14.0`,
`skills-v2.21.0`.

STILL OPEN in the batch: only `2026-10-13-s5-retire-innfo-editor` (S5). Section A (freeze) is
applied; only task `A4.4` (spec bookkeeping at integration) and the whole of Section B
(S5-delete, deferred deltas under `deferred-delete/specs/`) remain.
Read first: `openspec/changes/2026-10-13-DEPENDENCIES.md` and the S5 `proposal.md`,
`design.md`, `tasks.md`, and `iNNfo/apps/innfo-editor/FROZEN.md`.

Other active changes that are NOT part of this batch (leave alone unless told otherwise):
`2026-09-30-nn-quarantine-removal` (BLOCKED by design; its scope shrinks once S5 lands: after
S5 re-read it and update/unblock it only if its proposal says so),
`2026-10-01-nn-domain-git-workflow` (uncoupled; the one that reddens
`openspec validate --changes`), `2026-10-11-video-script-contract-additions` (uncoupled).

## 2. Your task, in order

### 2.1 S5-delete (maintainer sign-off GRANTED)

The maintainer gave explicit sign-off on 2026-10-15 ("Adelante con ese 5 delete"), after
dogfooding S3b and S6. Record this as task B.0.3 (and B.0.1 with the commit shas, B.0.2 as
dogfooded by the maintainer). Then run the SDD cycle for Section B (explore if needed, spec,
design amendments, tasks, apply, verify) following `tasks.md` B0..B7:
B1 MCP live preview removal, B2 delete `iNNfo/apps/innfo-editor/**` and `docs/innfo/app/**`
(see the notice-page exception below), B3 scripts, B4 tests and baseline, B5/B6 badge retarget
(bump `template_version`, never edit a published `_V_x-y-z_` file), docs, CTAs, B7 guards and
verification.

MAINTAINER OVERRIDE of the plan (new requirement; reflect it in the S5 specs/design BEFORE
implementing): the old plan says "No redirect page" (B6.3) and deletes ALL of `docs/innfo/app/**`.
The maintainer now wants the public URL `https://cognnitive.com/innfo/app/` to serve ONE static,
English page explaining that the hosted app was retired and that cogNNitive now uses the
**domain console** (the self-contained `domaiNN_console.html` generated locally by
`export-console.mjs` / the MCP `regenerate_console`, review through changesets), with links to the
relevant docs pages (usage, console docs, how to generate it). Requirements: simple and on-brand
(see the `nn-design-presets` skill), no JS app, no redirect, no dead links, fine at mobile width;
`docs/innfo/app/404.html` must not bounce users into a deleted SPA. Consequently
`docs/innfo/app/index.html` (the notice page) is the ONLY file kept under `docs/innfo/app/`;
adjust the allowlist of the B7.1 guard (`test/no-editor-references.test.mjs`), the Pages publish
guard that asserts `index.html` + `assets/`, and every "Open App" CTA (becomes "Read the docs" or
points to the notice page where that is the better UX). Write the delta spec for the notice page
and record the deviation in design.md with date and reason.

Releases for S5-delete (task B7.3, after the `dev -> main` batch): decide by what actually changed
and follow `.agents/skills/nn-dev-release/SKILL.md`: `innfo-mcp` (preview server removed),
`innfo-console` if console files changed, `blueprints` if any bluepriNNt `template_version`
bumped (badge retarget, B5.3), `skills` if any `skills/**` changed. If a batch adds a blueprint
absent from the published manifest, dispatch `blueprints` FIRST. Pre-release checklist: `main` CI
green on the exact tip, authored versions match the tags, `vars.RELEASE_ENABLED` is `true`, release
freeze (no other pushes to dev/main while a release workflow is in flight), tag `origin/main`
(never local `main`), one tag at a time and wait for each workflow with Monitor, then verify the
mirror tags in `cogNNitive/cogNNitive-web`, the smoke step and the live manifest at
https://cognnitive.com/use/manifest.md. Never delete or move a published tag. Regenerate derived
artifacts in the SAME commit as each bump (`npm run sync:versions`, mcp `build` and `build:bundle`,
`node scripts/build-console-bundle.mjs`, `node scripts/build-console-shells.mjs`,
`node scripts/build-console-payload.mjs`).

Finally: fresh-context review of the whole S5-delete diff (focus: nothing still imports or links
the editor, the Pages publish still works and serves the notice page, guards not silently
weakened, no accidental deletion of write-once/published specs), then archive S5 yourself
(`npx openspec archive 2026-10-13-s5-retire-innfo-editor -y`; ALWAYS compare `wc -l` of the archived
design/tasks/proposal with the originals afterwards: a small-model archive once truncated files),
and validate every touched living spec with `npx openspec validate <spec> --strict`.

### 2.2 Close the loose ends

- A4.4: do the spec bookkeeping the S5 task describes, as part of the S5 archive.
- Revisit `2026-09-30-nn-quarantine-removal` after S5 lands (its scope shrinks); report what is now
  unblocked, do not apply it unless its own tasks say it is ready.
- Backlog items #35, #36 and #37 in `openspec/backlog.md` are registered and are NOT part of this
  batch; do not start them.
- Persist the milestone in Engram and write a final session summary.

## 3. Registered follow-ups (do NOT implement; they are in the backlog on purpose)

- #35 `chore/sample-media-fields`: no sample declares an audio/video/file field, so declared media
  rendering is untested end to end.
- #36 `fix/validate-workspace-sources-tests`: 2 of 6 tests in
  `iNNfo/packages/innfo-mcp/test/validate-workspace-sources.test.ts` fail locally on every run
  (resolver "Local tier missed ... defiNNition_V_0-1-0 ... ENOENT"); CI is green; not caused by this
  batch. They are the only known red in the innfo-mcp suite: do not attribute them to your work and
  do not skip them.
- #37 `chore/markers-review`: a general review of the concept of markers (the maintainer is
  considering merging them with tags). It includes the issues from the S3b review recorded in
  `openspec/changes/archive/2026-10-15-2026-10-13-s3-domain-console-and-edit-modal/design.md` under
  "S3b review follow-ups": the domain console merges marker/matrix declarations by name across
  bluepriNNts (first declaration wins); the boolean matrix cell proposes `false` on uncheck; the
  ambiguous basename fallback in `resolveKnowledgeModel`. Also open: whether R-MM-08 (a cell outside
  the declared values) becomes an apply-time rejection, and whether a boolean cell proposes `true`
  or the declared `Assumes`. The maintainer tolerates the current behaviour for now.

## 4. Verification gates and environment facts

- `node scripts/verify.js` is the deterministic gate (every step runs). It needs built artifacts:
  `npm --workspace=@cognnitive/innfo-core run build` then
  `npm --workspace=@cognnitive/innfo-mcp run build` (dists are gitignored; the committed
  `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js` MUST be committed whenever it changes). The
  docs-facts guard compares to `HEAD`: commit first, then re-run `verify.js`.
- Also: `npm run typecheck`, `npm run check:versions`, package tests
  (`npm --workspace=@cognnitive/innfo-core test`, `npm --workspace=@cognnitive/innfo-mcp test`).
  Strict TDD is on (`openspec/config.yaml`): behaviour changes lead with their failing test. Verify
  ONCE per unit, bounded, max 2 fix rounds, then move on.
- `validate-manifest --release` fails before a release by design (it compares with the live web
  repo); `verify.js` does not run release-state checks, the release workflow does.
- Pre-existing red you must not attribute to yourself: `openspec validate --changes` fails
  `2026-10-01-nn-domain-git-workflow`; `--specs` has ~33 unrelated failures; the 2 innfo-mcp tests
  of #36. Confirm against the base before blaming a change.
- `check-integrity.js` can hang; it is not part of the merge gate (bounded timeout only).
- Tests must never open a real browser (`INNFO_CONSOLE_NO_OPEN=1`, `--no-open`, `open: false`).
- `openspec archive` needs `<change> -y`; bare `--strict` errors, use `<item>`, `--changes`,
  `--specs` or `--all`.
- Consoles generated before the S6 change refuse to re-export until regenerated (the payload meta
  now carries the `changes` bluepriNNt version): expected.

## 5. Working style (maintainer preference)

Agile, not tedious: prudent but not over-prudent. Do not stop to verify every two minutes; verify
once per unit of work. Delegate multi-file writing, builds and test runs to sub-agents
(`sdd-apply`, model sonnet) with precise prompts that include the gotchas of section 0; keep the
reviewer (`jd-judge-a`) read-only and bounded; keep the orchestration thread thin. Keep replies to
the maintainer short. Generated artifacts (code, docs, commits, specs) are in English.

## 6. Limits of your standing permission

You may: implement S5-delete as described, the notice page, archive S5, run the releases in
section 2.1 once `main` CI is green, close sessions/worktrees you created.
You may NOT: delete branches (ghost branches are for the maintainer to decide; the remote branch
`origin/session/s4-matrix-ctx` is a known merged ghost), force-push, rewrite published history,
edit/delete a published `_V_x-y-z_` spec file, delete or move a published tag, skip or weaken a
guard to get green, start the registered follow-ups (#35, #36, #37) or any change outside this
batch. If a gate stays red for a reason you cannot attribute, stop, record the exception in Engram
and in your final report instead of forcing it.

## 7. Entry points

- Plan/order: `openspec/changes/2026-10-13-DEPENDENCIES.md`
- S5: `openspec/changes/2026-10-13-s5-retire-innfo-editor/`
- Living specs: `openspec/specs/` · Release skill: `.agents/skills/nn-dev-release/SKILL.md`
- Console source: `iNNfo/specs/bluepriNNts/console/` · Exporter: `scripts/export-console.mjs`
- Core: `iNNfo/packages/innfo-core/src/` · MCP: `iNNfo/packages/innfo-mcp/src/`
- Docs site: `docs/` (hosted app snapshot: `docs/innfo/app/`)
