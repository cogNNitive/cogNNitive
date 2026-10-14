# Handoff prompt — console unification arc, state at the end of 2026-10-14 (second session)

> Paste everything below the line into the next AI agent. It supersedes the "what remains"
> sections of `handoff.md` (same folder), which is still correct for the history of the arc
> (§1–§3, §6). Written in English (repo artifact convention); talk to the maintainer in
> Spanish (Rioplatense, short answers, ONE question at a time, then stop).

---

You are the next agent on the cogNNitive repo (`D:\Users\lucas\Documents\GitHub\cogNNitive`),
continuing the "console unification (spine) + changeset/lineage" arc.

## 0. Session isolation (mandatory)

- Load `.agents/skills/nn-dev-development/SKILL.md`. The primary checkout is READ-ONLY (a
  PreToolUse hook blocks edits and `git add/commit/stash` when the **session cwd** is the primary).
- Live session worktrees (all pushed to `origin`):
  | Worktree | Branch | State |
  |---|---|---|
  | `..\cogNNitive-s3-domain-console` | `session/s3-domain-console` @ `6eab1d56` | all S3 docs LANDED on `dev`; use it (or a fresh session) for S3b |
  | `..\cogNNitive-s4-retire-legacy-migration` | `session/s4-retire-legacy-migration` @ `2233616d` | merged into `dev`; S4-2 still to do |
  | `..\cogNNitive-s5-freeze-editor` | `session/s5-freeze-editor` @ `445a49aa` | LANDED on `dev` (fresh review + `verify.js` green); can be stopped with `nn-session.mjs stop` |
- Pick one (or `node scripts/nn-session.mjs start --id <id>` from the primary) and work only there.
- Gotcha: the hook checks the session cwd, not the target path. `mcp__ccd_directory__change_directory`
  moves the cwd only when the turn ends. Meanwhile Bash file writes inside the worktree work, and
  `git -C <worktree> add|commit` is not matched by the hook regex.
- Never `reset --hard`, `clean`, `stash`, `branch -D`, `checkout/restore .` (blocked). Revert one file with
  `cmd /c "git show HEAD:<path> > <path>"`. Never stage
  `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` or `catalog.json` build noise.

## 1. Rules of engagement

- strict_tdd (`openspec/config.yaml`): failing test first. Conventional commits in English, **no
  Co-Authored-By / AI attribution** (the maintainer's global rule overrides any default footer).
- Never hand-edit derived artifacts (console bundle, shells, payload mirror, MCP bundles, docs facts,
  vocabulary doc, canonical registry): regenerate with their scripts.
- Before `node scripts/verify.js`: `npm --workspace=@cognnitive/innfo-core run build` and
  `npm --workspace=@cognnitive/innfo-mcp run build`. `preflight-check.test.js` only passes with an empty
  `HOME`/`USERPROFILE` (it otherwise probes the real home).
- Before commit/push/PR after code changes: a fresh-context review (a sub-agent that did not write it).
  Delegate multi-file writes and 4+-file reads to sub-agents; always pass `model`.
- Landing = merge `origin/dev` into the session branch, `verify.js`, then fast-forward
  `git push origin session/<id>:dev`. Never tag or push `main` without the maintainer. If you touch
  tags, dispatch release workflows ONE AT A TIME.
- Archive gotchas (openspec CLI 1.2.0): only the first line of a requirement body is checked for
  SHALL/MUST; a MODIFIED header must match the living requirement name exactly; new requirements go
  under ADDED; an emptied capability aborts the archive.
- Do not re-litigate settled authority/decisions: `openspec/changes/2026-10-13-DEPENDENCIES.md`
  (Decisions 1–13) and §3 below.

## 2. Where things stand

**On `dev` (`445a49aa`):** the editor FREEZE (reviewed by an independent agent, freeze guard strengthened, `verify.js` green on the merged tree), S3a (audit + D14 tests + D17 vocabulary), S4-1 (tasks 1.1–3.3 of 15:
Flow A, Flow C and `--migrate-references` retired, quarantine migration half dropped, hint/preflight
point to the new-domain recipe).

**Maintainer (later on 2026-10-14): keep advancing step by step, and after EVERY finished piece of work
rewrite this handoff prompt** so a fresh agent can continue if tokens run out. Pieces, in order:
(1) editor freeze landed [DONE], (2) S3 docs commits landed on `dev` [DONE, `6eab1d56`; S3 and S6
now pass `openspec validate --strict`], (3) S3b groups 6→14 [NEXT], (4) S4-2, (5) S6.
`dev` == `session/s3-domain-console` == `6eab1d56` at the time of writing (re-check with `git fetch`).
Nothing is pending on the maintainer except the integration steps in §4.

**S3 docs commits (LANDED on `dev` at `6eab1d56`; kept for the record):**
`40e812fd` S6 decision 8 · `fdac8ae4` audit revision + `widget-study.md` + `editor-freeze-study.md` ·
`709e9e00` task 1.2 closed · `ef8e8d77` S3b plan (P0+P1) · `b6884670` audit bodies aligned ·
`c5637dab` S3b questions resolved. `openspec validate --strict` passed on S3.

**EDITOR FREEZE (variant A3) — LANDED on `dev` 2026-10-14 (`445a49aa`); record of what it did (was 10 commits, `verify.js` green after a clean
`npm ci`, typecheck/tests/lint/`build:docs` pass:** S5 re-scoped (freeze now, delete later; delete-phase
spec deltas parked in `deferred-delete/specs/`, only `quality-gates` stays live); 81-file static snapshot of
the hosted app committed; `jsdom`/`happy-dom` moved to root devDependencies; editor removed from
workspaces, CI, integrity, docs build, `sync-versions` and guard scopes; `FROZEN.md` added.
Not smoke-tested in a browser (serve under `/innfo/app/`). The lockfile diff is large because `dev`'s lock
was already stale — review it as a regeneration. Open items: create the `innfo-editor-frozen` tag at
integration; do the `quality-gates` spec sync (task A4.4) when it lands; `sync-versions.test.mjs` used to
overwrite the live editor `samples.ts` (fixed by dropping that target).

**S4-2 pending** (tasks 4.1, 4.2, 5.1, 6.1, 6.2 in `openspec/changes/2026-10-13-s4-retire-legacy-migration-flows`).
Fresh review of S4-1 said: safe for `dev`, **NOT safe for `main`** until a `templates-v*` tag + repin exist
(workspace `template_version` bumped to V_0-8-2 — same route as `templates-v0.5.1`; remember
`manifest/source.yaml` `version:` is `spec_version`, not `template_version`). Also confirm the S4 delta
spec merges at archive (`workspace-template-upgrade/spec.md:127-158` still describes Flow A), and name
the six regenerated registry consts (PROCEDURES, ORGANIZATION, ANALYSIS, PROJECTS, BUSINESS_MODEL,
BUSINESS) in a commit message.

## 3. Decisions made today (maintainer-confirmed, 2026-10-14)

1. S3 audit review CLOSED. Workspace lineage graph → **drop**. FilePreviewModal → **minimal port** (only
   "open original file"). ValidationReport → **drop** (strict subset of MCP `validate_knowledge` /
   `check_domain`). Submodel nesting → **drop**. D14 "source index" = the already embedded payload
   (`el.citations` + `meta.sources` + excerpt cap 500 chars); task 2.2 stays a no-op.
2. **S3b scope = P0 + P1** (~1 week, chained PRs, tests first) — plan in the S3 change
   (`tasks.md` groups 6–14, `design.md` D-S3b-*, deltas under `specs/`). P0: (1) declared field types reach
   the console keyed by (concept, field) — today `schema.fields` is `{}` in every export; (2) the edit modal
   keeps value types; (3) engine `update_field` preserves scalar type (own PR + `innfo-mcp` release note);
   (4) tags in the payload, `tag:` = AND exact, `tag-any:` = OR. P1: select, reference edit by
   `target_concepts`, media, safe markdown view (DOM-only, no innerHTML) + textarea edit, TagRow, knowledge
   pill click-through, open-original, matrix-cell editor (spike first). Most editor widgets serve types the
   spec does not have (0 declared uses) → drop.
3. Planning questions resolved: first-wins for same (concept, field) + export warning; P0-3 stays in S3b;
   newline round-trip fixed on the read side in group 8 (`parsePropertyValue` JSON-unescapes double-quoted
   values; guard = `tests/roundtrip-fidelity.test.ts`). The maintainer offered to split it into its own
   change "if simpler"; it is NOT simpler, so it stays — mention it if they ask. Arrays in the modal:
   comment-only.
4. **Editor: freeze (A3), not delete.** Deletion (S5-delete) only after S3b + S6 are done, the maintainer
   has dogfooded the console, and signs off.
5. **Decision 8** (bare `apply_change` ops): principle = "every change to Level-3 *content* goes through a
   changeset". Direct ops become a closed, named set — `MAINTENANCE_OPS` (`bump_version`, `generate_index`,
   `freeze_slugs`) and `SCHEMA_OPS` (`add_concept`, `add_field`, `set_marker`, Level-2 blueprint authoring);
   anything else → `UNKNOWN_OPERATION`. Not turned into changesets. Folded into S6 (tasks 7.7/7.8, new
   requirement in `changeset-apply-engine`). Open check: `bump_version` (renames the file) vs changeset sealing.
6. Filter tags: fix and make switchable AND/OR (P0-4).

## 4. Recommended order (maintainer approved the shape; waiting on "go")

1. Fresh-context review of `session/s5-freeze-editor`, then merge `origin/dev`, `verify.js`, land it.
2. Land the S3 docs commits on `dev`.
3. S3b groups 6→14 (P0 before P1), one PR/lot each; S4-2 can run in parallel in its own worktree.
4. S6 (51 tasks + 7.7/7.8; S6c needs S4). 5. Maintainer dogfooding → S5-delete. 6. `nn-quarantine-removal`
(blocked: needs the maintainer's written sign-off, task 1.1).
Release batches: `dev→main` only when the maintainer says; S4's templates tag/repin and the freeze's
`innfo-editor-frozen` tag are integration steps, not agent steps.

## 5. First actions

Read `handoff.md` §1–§3 and §6, `2026-10-13-DEPENDENCIES.md`, this file, then
`git -C <worktree> status -sb` + `git fetch` for each worktree (never trust values written here). Report
state to the maintainer in Spanish, then ask ONE question: whether to start with the freeze review/landing.
