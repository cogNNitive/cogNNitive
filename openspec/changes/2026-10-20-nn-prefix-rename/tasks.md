# Tasks: Distribution Prefix Rename (`innfo-*` to `nn-*`)

Source of truth: `design.md` (code-verified). Where proposal/specs disagreed, they were patched to match it (single MCP manifest entry, only `procedures`/`visual-catalog` bumped, alias fields in `source.yaml` S1-S6, S4a released before S5, nn-mcp >= 0.30.0).

## Review Workload Forecast

| Slice | Est. changed lines (hand-written; lockfile, bundles and regenerated files excluded) | 400-line risk |
|---|---|---|
| S0 | ~60 (+ generated lockfile) | Low |
| S1 | ~300 | Medium |
| S2 | ~350 | Medium |
| S3a | ~350 (mostly `git mv` + path edits) | Medium |
| S3b | ~350 | Medium |
| S4a | ~250 | Low |
| S4b | ~200 | Low |
| S5 | ~150 + release ops | Low |
| S6 | ~250 | Low |

| Field | Value |
|---|---|
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |
| Suggested split | PR S0 -> S1 -> S2 -> S3a -> S3b -> S4a -> S4b -> S5 -> S6, each merged to main in order |

Decision needed before apply: No for S0-S5. Yes for S6 only (deprecation-window length, see Open Decisions)
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium (High if S3 or S4 were not split)

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| S0 | Regenerate stale lockfile | PR 1 -> main | Independent |
| S1 | Release plumbing accepts both families (alias map) | PR 2 -> main | After S0 |
| S2 | Console source rename, `@nn-console-v` pin | PR 3 -> main | After S1; then cut `nn-console-v*` |
| S3a | Rename `nn-core` package and dir | PR 4 -> main | After S1 |
| S3b | Rename `nn-mcp` package and dir (server name stays `innfo-mcp`) | PR 5 -> main | After S3a |
| S4a | Server identity, preflight, skills-manager reconcile | PR 6 -> main | After S3b; release `skills-v*` BEFORE S5 |
| S4b | Prose, doc renames, blueprint bump | PR 7 -> main | After S4a |
| S5 | Cutover: manifest MCP entry becomes `nn-mcp` | PR 8 -> main | After S4a released |
| S6 | Sunset of legacy emission | PR 9 -> main | After the deprecation window |

Rules for every slice: Strict TDD (RED test first, then GREEN, then REFACTOR). Standard verification: `node scripts/verify.js`, `node scripts/check-integrity.js`, `node scripts/sync-versions.mjs --check`, `node scripts/manifest/validate-manifest.js`. Worktree writers run builds only, never `npm ci`/`npm install` (junction hazard). Preflight suites also re-run with empty `USERPROFILE`/`HOME`. Tag/release steps are marked "needs maintainer confirmation" and are never run by apply.

## Phase S0: Lockfile (PR 1)

- [ ] 0.1 [RED] Create `scripts/lockfile-agreement.test.mjs`: `package-lock.json` entry `packages["iNNfo/packages/innfo-mcp"]` must match `package.json` bins and the `@cognnitive/innfo-core` range (red today: `^0.24.0`). Run `node --test scripts/lockfile-agreement.test.mjs`.
- [ ] 0.2 [GREEN] Run `npm install --package-lock-only --ignore-scripts` (never writes `node_modules`) and commit `package-lock.json`.
- [ ] 0.3 [VERIFY] `node --test scripts/lockfile-agreement.test.mjs` plus standard verification; CI `npm ci` is the final check.
- Boundary/rollback: lockfile and one test only; revert the merge commit.

## Phase S1: Release plumbing (PR 2)

- [ ] 1.1 [RED] `scripts/release/parse-release-tag.test.js`: `parseReleaseTag('innfo-mcp-v0.30.0')` gives `key:'nn-mcp', prefix:'innfo-mcp'`; `nn-console-v1.0.0` accepted.
- [ ] 1.2 [RED] `scripts/release/release-keys.test.js`: `release.yml` `tags:` list equals `ACCEPTED_TAG_PREFIXES` mapped to `-v*` (anti-drift); `RELEASE_KEYS` holds canonical keys only.
- [ ] 1.3 [RED] `scripts/release/assemble-manifest.test.js`: previous pin `innfo-mcp-v0.29.0` rejects `nn-mcp-v0.29.0` and accepts `0.30.0`; a skills release retains the MCP pin via `legacy_names` and a console asset via `legacy_files` emitting the previous `file`/`url` verbatim.
- [ ] 1.4 [RED] `scripts/freshness.test.js`: `computeFreshness` emits `nn-mcp` and `innfo-mcp` (and console pair) with the same `pinnedTag`, newest across both families.
- [ ] 1.5 [RED] `scripts/stage-mcp-bundle.test.mjs` (stages `nn-mcp-v<ver>.bundle.js` and `innfo-mcp-v<ver>.bundle.js`, identical bytes), `scripts/lib/publish-web-tree.test.js` (`isReleaseOwnedPath('innfo/cdn/nn-mcp-v1.2.3.bundle.js')` true), `scripts/lib/batch-status.test.mjs`, `run-release.test.js`, `smoke.test.js`, `version-agreement.test.js`, `console-asset-lists.test.js` (keys `[skills, blueprints, nn-mcp, nn-console]`, `latestTag` across families, smoke checks both bundle names).
- [ ] 1.6 [GREEN] `scripts/release/release-keys.js`: `RELEASE_FAMILIES`, `canonicalKey`, `familyPrefixes`, `familyTagRe`, `ACCEPTED_TAG_PREFIXES`, `nn-mcp-v*` owned glob.
- [ ] 1.7 [GREEN] `parse-release-tag.js`, `assemble-manifest.js` (match previous entry by current OR legacy identifier), `run-release.js`, `smoke.js`, `version-agreement.js`, `scripts/manifest/generate-manifest.js` (rename dead channel branches mechanically).
- [ ] 1.8 [GREEN] `scripts/freshness.js` (dual keys, union of both tag families, old and new path lists), `scripts/lib/batch-status.mjs`, `scripts/lib/publish-web-tree.js` (derive `isReleaseOwnedPath` from `RELEASE_OWNED_GLOBS`), `scripts/stage-mcp-bundle.mjs`.
- [ ] 1.9 [GREEN] `.github/workflows/release.yml` (add `nn-mcp-v*`, `nn-console-v*` triggers), `.agents/skills/nn-dev-release/SKILL.md` (family table).
- [ ] 1.10 [VERIFY] `node --test scripts/release/*.test.js scripts/freshness.test.js scripts/stage-mcp-bundle.test.mjs scripts/lib/batch-status.test.mjs scripts/lib/publish-web-tree.test.js`, then standard verification and `npm run verify:fast`.
- Boundary/rollback: one commit (coupling A). Revert the merge; tags stay valid. Tags in the new families are legal only after this lands on `main`.

## Phase S2: Console rename (PR 3)

- [ ] 2.1 [RED] `console-release-info.test.js` (`cdnRef === 'nn-console-v...'`), `console-shell-guard.test.js` (repo shell pinning `@innfo-console-v` rejected), `console-shell-sync.test.js` and the export-console suite under `test/` (re-pin rewrites a stamped `@innfo-console-v0.20.0/.../innfo-console.bundle.js` to the `nn` ref and file), `console-bundle.test.js`.
- [ ] 2.2 [RED] Add the filename guard `describe` in `test/no-retired-references.test.mjs` (`git ls-files` matching `(^|/)innfo-(core|mcp|console|runtime|icons|preact-init|slug|address|ui)[./-]` fails outside `FROZEN_PATH_PREFIXES`; planted-red case). List the S2 stems.
- [ ] 2.3 [GREEN] `git mv` `iNNfo/specs/bluepriNNts/console/innfo-{runtime,icons,preact-init}.js` and `innfo-{slug,address}.generated.js` to `nn-*`.
- [ ] 2.4 [GREEN] Edit `scripts/lib/console-bundle.js`, `console-shell-sync.js`, `console-shell-guard.js` (strict `nn` pin), `console-release-info.js`, `scripts/export-console.mjs` (readers accept `(?:nn|innfo)-console`), `scripts/build-console-bundle.mjs`, console `package.json` (name + version bump), `manifest/source.yaml` (asset `name`/`file` + `legacy_files`).
- [ ] 2.5 [GREEN] Regenerate payload, both bundles and shells: `node scripts/build-console-shells.mjs`.
- [ ] 2.6 [VERIFY] `npm run check:console-bundle` plus standard verification.
- [ ] 2.7 [RELEASE] Cut `nn-console-v<ver>` right after merge (shell pin points at a not-yet-existing tag). Needs maintainer confirmation.
- Boundary/rollback: revert the merge commit; leave any cut tag; `innfo-console-v*` still parses.

## Phase S3a: Rename nn-core (PR 4)

- [ ] 3a.1 [RED] `scripts/sync-versions.test.mjs` (drift reported on `@cognnitive/nn-core`), `scripts/build-preflight-primitives.test.js`/`.mjs` and `skills/nn-sources/test/unit/test-core-mirror.js` (default output `nn-core.generated.cjs`); extend the filename guard with the `innfo-core` stem.
- [ ] 3a.2 [GREEN] `git mv iNNfo/packages/innfo-core iNNfo/packages/nn-core`; package `@cognnitive/nn-core`; mcp dependency updated.
- [ ] 3a.3 [GREEN] Path edits in one commit: `sync-versions.mjs`, `scripts/nn-session.mjs`, `scripts/regen.js`, `build-docs.mjs`, `check-integrity.js`, `pre-push-check.js`, root `package.json` scripts, `ci.yml`, `release.yml`, vitest alias, tsup `noExternal`, `license-inventory.js`, `eslint.config.mjs`, `.prettierignore`, `run-dev.bat`, `PROVENANCE_SKIP_PREFIXES` in `test/no-retired-references.test.mjs`.
- [ ] 3a.4 [GREEN] D9 order: change the constant, `git mv skills/{nn-sources,nn-upgrade}/scripts/lib/innfo-core.generated.cjs` to `nn-core.generated.cjs`, `node scripts/regen.js`, update importers and `nn-name-invariant-guard.js`, `lineage-drift-guard.js`; then `npm install --package-lock-only --ignore-scripts`.
- [ ] 3a.5 [VERIFY] `npm run typecheck && npm test` plus standard verification.
- Boundary/rollback: one commit (coupling C). Revert (the `git mv` reverses), then refresh the primary `node_modules`.

## Phase S3b: Rename nn-mcp dir and package (PR 5)

- [ ] 3b.1 [RED] `release-keys.test.js` (`RELEASE_TABLE['nn-mcp'].repoPaths` exists on disk), `freshness.test.js` (`SUBSYSTEM_PATHS` cover both dirs); filename guard gets the `innfo-mcp` stem.
- [ ] 3b.2 [GREEN] `git mv iNNfo/packages/innfo-mcp iNNfo/packages/nn-mcp`; package `@cognnitive/nn-mcp`; `server.ts` name STAYS `innfo-mcp`.
- [ ] 3b.3 [GREEN] `RELEASE_TABLE`/`DISTRIBUTION_PATHS` to `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js`; `manifest/source.yaml` `mcp.path`; `SUBSYSTEM_PATHS`; `stage-mcp-bundle.mjs`, `batch-status.mjs`, `version-agreement.js`, `run-release.js`, `smoke.js`, `generate-manifest.js:39`; `ci.yml`/`release.yml` `--workspace=`; `git mv scripts/innfo-mcp-bootstrap-url.test.mjs scripts/nn-mcp-bootstrap-url.test.mjs`; then lockfile `--package-lock-only`.
- [ ] 3b.4 [VERIFY] `npm run typecheck && npm test` plus standard verification.
- Boundary/rollback: one commit; revert, then refresh the primary `node_modules`.

## Phase S4a: Server identity and client reconcile (PR 6)

- [ ] 4a.1 [FIXTURE] Create `test/fixtures/legacy-nn-preflight/` as a frozen snapshot of `skills/nn-preflight/` taken at the S0 commit (`git show <S0-sha>:...`); add it to `FROZEN_PATH_PREFIXES`.
- [ ] 4a.2 [RED] `skills/nn-preflight/scripts/preflight-check.test.js`: `Channel freshness: nn-mcp` against an `nn-mcp` entry and against a legacy `innfo-mcp` manifest; one MCP line when both freshness keys exist; legacy bundle path accepted.
- [ ] 4a.3 [RED] `test/legacy-preflight-compat.test.mjs`: fixture preflight against an S5-shaped manifest + `freshness.json` (empty HOME) prints skills and console lines, no MCP line, same `exitCode`.
- [ ] 4a.4 [RED] skills-commands suite and `mcp-config-adapter` tests: `state.mcp['innfo-mcp']` migrates to `nn-mcp`, legacy bundle deleted after `nn-mcp` installs, stale config entry replaced by one `nn-mcp` entry; server `initialize` reports `nn-mcp`.
- [ ] 4a.5 [GREEN] `nn-mcp/src/server.ts` (`name: 'nn-mcp'`), `skills/nn-preflight/scripts/preflight-check.js` (names `['nn-mcp','innfo-mcp']`, `nn-*` freshness keys with `innfo-*` fallback, bundle fallback), `scripts/lib/skills-commands.js`, `mcp-config-adapter.js`.
- [ ] 4a.6 [VERIFY] `npm run typecheck && npm test`; `node --test skills/nn-preflight/scripts/preflight-check.test.js test/legacy-preflight-compat.test.mjs` re-run with empty `USERPROFILE`/`HOME`; standard verification.
- [ ] 4a.7 [RELEASE] Cut `skills-v<next>` after merge, BEFORE S5. Needs maintainer confirmation.
- Boundary/rollback: revert and re-pin the previous `skills-v*`.

## Phase S4b: Prose and blueprint bump (PR 7)

- [ ] 4b.1 [RED] Test asserting zero `innfo-mcp_` matches in `skills/nn-innfo/SKILL.md`; the retired-reference guard accepts the `workspace` procedure files via an allowlist entry (C9) and fails on a planted `tool:: [[innfo-mcp]]` in `procedures`/`visual-catalog`.
- [ ] 4b.2 [GREEN] Prefix prose (name both prefixes until S6) in `skills/nn-innfo/SKILL.md`, `nn-console`, `nn-preflight`, docs; `git mv docs/innfo/documentation/{innfo-core,innfo-mcp,opencode-innfo-agent}.md` to `nn-*` names and fix links; `docs/innfo/mcp-setup.md` uses `nn-mcp.*`. The public URL rename without redirect needs maintainer confirmation (Open Decisions).
- [ ] 4b.3 [GREEN] Bump `template_version` for `procedures` and `visual-catalog` (`tool:: [[nn-mcp]]`); do NOT edit `workspace` files.
- [ ] 4b.4 [VERIFY] Standard verification (template version guard included).
- [ ] 4b.5 [RELEASE] Cut `blueprints-v<next>`. Needs maintainer confirmation.
- Boundary/rollback: revert; re-pin the previous `blueprints-v*`.

## Phase S5: Cutover (PR 8)

- [ ] 5.1 [PRECHECK] Confirm `skills-v*` from S4a is published and answer the open question on pre-82efdbad skills-manager copies. Needs maintainer confirmation.
- [ ] 5.2 [RED] `scripts/release/assemble-manifest.test.js` and `scripts/manifest/validate-manifest.test.js`: assembled manifest has exactly one MCP entry named `nn-mcp`, no `innfo-mcp`; `freshness.json` still has both keys.
- [ ] 5.3 [GREEN] `manifest/source.yaml`: `mcp.name: nn-mcp`, `legacy_names: [innfo-mcp]`; re-render `docs/use/manifest-next.md`.
- [ ] 5.4 [VERIFY] Standard verification plus `node --test test/legacy-preflight-compat.test.mjs` (empty HOME).
- [ ] 5.5 [RELEASE] Cut `nn-mcp-v<version>` with version strictly greater than the highest `innfo-mcp-v*` tag (>= 0.30.0) and equal to the `nn-mcp` `package.json` version; confirm the smoke test serves both `nn-mcp-v*.bundle.js` and `innfo-mcp-v*.bundle.js`. Needs maintainer confirmation.
- Boundary/rollback: set `mcp.name` back to `innfo-mcp` and cut a skills release; the `nn-mcp-v*` tag stays unused.

## Phase S6: Sunset (PR 9) - blocked on deprecation-window decision

- [ ] 6.1 [DECISION] Maintainer sets the window length and confirms it elapsed. Needs maintainer confirmation.
- [ ] 6.2 [RED] Content guard row in `test/no-retired-references.test.mjs` for retired names with a plant; `release-keys.test.js` (`innfo-mcp-v0.31.0` rejected); `validate-manifest.test.js` (legacy entry rejected); preflight test (legacy-only data treated as absent); freshness test (only `nn-*` keys); filename guard drops transitional entries.
- [ ] 6.3 [GREEN] Delete `bin/innfo-mcp.bundle.js` (+ tsup entry and bin), `innfo-console.bundle.js`, `innfo-ui.css`, `scripts/innfo-mcp.{sh,ps1,cmd}`, legacy CDN staging, `RELEASE_FAMILIES` aliases, legacy `release.yml` triggers, legacy freshness keys and old paths, `legacy_names`/`legacy_files`, `test/fixtures/legacy-nn-preflight/`, legacy preflight fallbacks. Keep the user-config cleanup of stale `innfo-mcp` entries.
- [ ] 6.4 [GREEN] Add retired entries to `iNNfo/specs/vocabulary.json` `retired_identifiers`.
- [ ] 6.5 [VERIFY] Standard verification, `npm run typecheck && npm test`, and `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` returns 0 outside frozen classes. Old tags and CDN URLs must still resolve.
- Boundary/rollback: revert the merge commit; nothing published needs recovery.

## Open Decisions

- S6 deprecation-window length (blocks S6 only).
- Rename of the three public doc URLs with no redirect vs a stub page (blocks 4b.2 only).
- Whether pre-82efdbad skills-manager copies exist (checked in 5.1).

## Acceptance

- [ ] `node scripts/verify.js` and CI are green on `main` after every slice.
- [ ] `nn-console-v*` and `nn-mcp-v*` are published; `nn-mcp-v*.bundle.js` resolves on the CDN; first `nn-mcp` version > highest `innfo-mcp-v*`.
- [ ] The published manifest never lists `innfo-mcp` and `nn-mcp` together.
- [ ] The frozen pre-change preflight runs without error against the S5 manifest and keeps skills and console lines.
- [ ] `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` is 0 outside frozen/allowlisted paths after S6.
- [ ] `innfo-*-v*` tags and pinned CDN URLs still resolve after S6.
