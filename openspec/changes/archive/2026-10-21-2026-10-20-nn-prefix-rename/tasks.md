# Tasks: Distribution Prefix Rename (`innfo-*` to `nn-*`)

Source of truth: `design.md` (revision 2, direct cutover). Revision 1 (dual emission, S0-S6) is superseded.

## Review Workload Forecast

| PR | Est. changed lines (hand-written; lockfile, bundles, `git mv` and regenerated files excluded) | 400-line risk |
|---|---|---|
| 1 | ~700, mechanical | Medium-High (split in two commits: core, mcp) |
| 2 | ~600 | Medium-High |
| 3 | ~500 | Medium |
| Cleanup | ~100 | Low |

| Field | Value |
|---|---|
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |
| Suggested split | PR 1 -> PR 2 -> PR 3 -> cleanup commit, merged to main in order |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium-High (mechanical diffs)

### Suggested Work Units

| Unit | Goal | PR | Notes |
|---|---|---|---|
| PR 1 | Package graph rename and lockfile fix | PR 1 -> main | Release names stay `innfo-*` |
| PR 2 | `nn-*` release identity and console rename | PR 2 -> main | After PR 1; then cut `nn-console-v*` |
| PR 3 | MCP identity, preflight, skills-manager migration, prose, blueprint bump | PR 3 -> main | After PR 2; then cut `nn-mcp-v*`, `skills-v*`, `blueprints-v*` |
| Cleanup | Remove transient pin lookup, add retired-identifier guard | direct small PR | After the first `nn-*` releases publish |

Rules for every PR: Strict TDD (RED test first, then GREEN, then REFACTOR). Standard verification: `node scripts/verify.js`, `node scripts/check-integrity.js`, `node scripts/sync-versions.mjs --check`, `node scripts/manifest/validate-manifest.js`. Worktree writers run builds only, never `npm ci`/`npm install` (junction hazard); the lockfile uses `npm install --package-lock-only --ignore-scripts`. Preflight suites also re-run with empty `USERPROFILE`/`HOME`. Tag/release steps are marked "needs maintainer confirmation" and are never run by apply.

## PR 1: Package graph

- [x] 1.1 [RED] Create `scripts/lockfile-agreement.test.mjs`: the lockfile entry for the mcp package must match `package.json` bins and the core range (red today: `^0.24.0`). Run `node --test scripts/lockfile-agreement.test.mjs`.
- [x] 1.2 [GREEN] Run `npm install --package-lock-only --ignore-scripts` and commit `package-lock.json` as its own first commit.
- [x] 1.3 [RED] Filename guard `describe` in `test/no-retired-references.test.mjs` for `innfo-(core|mcp)` package and generated stems, with a planted-red case. Also `sync-versions.test.mjs` (drift on `@cognnitive/nn-core`), `build-preflight-primitives.test.mjs` and `skills/nn-sources/test/unit/test-core-mirror.js` (default output `nn-core.generated.cjs`), and `release-keys.test.js`/`freshness.test.js` (`repoPaths` exist on disk, `SUBSYSTEM_PATHS` use the new dirs).
- [x] 1.4 [GREEN] Commit A (core): `git mv iNNfo/packages/innfo-core iNNfo/packages/nn-core`; package `@cognnitive/nn-core`; mcp dependency; `sync-versions.mjs`, `nn-session.mjs`, `regen.js`, `build-docs.mjs`, `check-integrity.js`, `pre-push-check.js`, root `package.json` scripts, `ci.yml`, `release.yml`, vitest alias, tsup `noExternal`, `license-inventory.js`, `eslint.config.mjs`, `.prettierignore`, `run-dev.bat`, `PROVENANCE_SKIP_PREFIXES`. Generated (D9): `innfo-core.generated.cjs` to `nn-core.generated.cjs` via `build-trannsform-core-mirror.mjs` and `build-preflight-primitives.mjs`, with importers and the guards `nn-name-invariant-guard.js` and `lineage-drift-guard.js`.
- [x] 1.5 [GREEN] Commit B (mcp): `git mv iNNfo/packages/innfo-mcp iNNfo/packages/nn-mcp`; package `@cognnitive/nn-mcp`; `RELEASE_TABLE.repoPaths`/`DISTRIBUTION_PATHS` to `iNNfo/packages/nn-mcp/bin/...`; `source.yaml` `mcp.path`; `SUBSYSTEM_PATHS`; `stage-mcp-bundle.mjs`, `batch-status.mjs`, `version-agreement.js`, `run-release.js`, `smoke.js`, `generate-manifest.js`; `--workspace=` in `ci.yml`/`release.yml`; `git mv scripts/innfo-mcp-bootstrap-url.test.mjs scripts/nn-mcp-bootstrap-url.test.mjs`. The release name stays `innfo-mcp`.
- [x] 1.6 [GREEN] Regenerate the lockfile again (`--package-lock-only --ignore-scripts`).
- [x] 1.7 [VERIFY] Standard verification plus `npm run typecheck && npm test`. CI `npm ci` is the final check.
- [x] 1.8 [POST-MERGE] Refresh the primary `node_modules` (needs maintainer confirmation).
- Boundary/rollback: revert the merge commit; the `git mv` reverses.

## PR 2: Release identity and console

- [x] 2.1 [RED] `scripts/release/parse-release-tag.test.js`: `nn-mcp-v0.30.0` and `nn-console-v1.0.0` accepted; `innfo-mcp-v0.30.0` rejected.
- [x] 2.2 [RED] `scripts/release/release-keys.test.js`: `release.yml` `tags:` equals `RELEASE_KEYS` mapped to `-v*` (anti-drift); keys are `[skills, blueprints, nn-mcp, nn-console]`.
- [x] 2.3 [RED] `scripts/freshness.test.js`: only `nn-mcp`/`nn-console` keys. `scripts/stage-mcp-bundle.test.mjs`: stages only `nn-mcp-v<ver>.bundle.js`. `scripts/lib/publish-web-tree.test.js`: `isReleaseOwnedPath` preserves `nn-mcp-v*` and existing `innfo-mcp-v*`/`innfo-console-v*` files. `batch-status.test.mjs`, `run-release.test.js`, `smoke.test.js`, `version-agreement.test.js`, `console-asset-lists.test.js` updated for the new keys.
- [x] 2.4 [VERIFY-DATA] Read the last published manifest and record how console entries are keyed (file names, `ref`, `url`) so the D3 map is exact. Needs maintainer confirmation if the published data differs from the design.
- [x] 2.5 [RED] `scripts/release/assemble-manifest.test.js`: with a previous manifest pinning `innfo-mcp-v0.29.0` and an `innfo-console` asset, a skills release retains both under the `nn-*` names (console `file`/`url` verbatim); `nn-mcp-v0.29.0` is rejected and `0.30.0` accepted.
- [x] 2.6 [RED] Console: `console-release-info.test.js` (`cdnRef === 'nn-console-v…'`), `console-shell-guard.test.js` (a repo shell pinning `@innfo-console-v` is rejected), `console-shell-sync.test.js`, `console-bundle.test.js`, the export-console suite (re-pin rewrites a stamped `@innfo-console-v0.20.0/…/innfo-console.bundle.js` to the `nn` ref and file). Extend the filename guard with the console stems.
- [x] 2.7 [GREEN] Release plumbing: `release-keys.js` (keys, `nn-mcp-v*` owned glob, no aliases), `parse-release-tag.js`, `assemble-manifest.js` (D3 `PREVIOUS_PIN_RENAMES`), `run-release.js`, `smoke.js`, `version-agreement.js`, `generate-manifest.js`, `freshness.js`, `batch-status.mjs`, `publish-web-tree.js` (D5, derive from `RELEASE_OWNED_GLOBS`), `stage-mcp-bundle.mjs`, `release.yml` triggers, `.agents/skills/nn-dev-release/SKILL.md`.
- [x] 2.8 [GREEN] Console: `git mv` the sources `innfo-{runtime,icons,preact-init}.js` and generated `innfo-{slug,address}.generated.js` to `nn-*`; update `console-bundle.js`, `console-shell-sync.js`, `console-shell-guard.js`, `console-release-info.js`, `export-console.mjs`, `build-console-bundle.mjs`, console `package.json` (name, version bump), `source.yaml` console assets. Delete `innfo-console.bundle.js` and `innfo-ui.css`. Regenerate the payload, bundles and shells (`node scripts/build-console-shells.mjs`).
- [x] 2.9 [VERIFY] Standard verification, `npm run check:console-bundle`.
- [x] 2.10 [RELEASE] Cut `nn-console-v<version>` right after merge. Needs maintainer confirmation.
- Boundary/rollback: revert the merge commit; leave any cut tag unused.

## PR 3: Runtime identity, prose, blueprints

- [x] 3.1 [RED] Preflight: `skills/nn-preflight/scripts/preflight-check.test.js` reports `Channel freshness: nn-mcp` against an `nn-mcp` manifest entry.
- [x] 3.2 [RED] Skills-manager and `mcp-config-adapter` tests: a state with `mcp['innfo-mcp']`, the legacy bundle file and the `innfo-mcp` config key are migrated to `nn-mcp` and the legacy bundle deleted; running twice changes nothing.
- [x] 3.3 [RED] Guards: zero `innfo-mcp_` in `skills/nn-innfo/SKILL.md`; the retired-reference guard allowlists the `workspace` procedure files (C9) and fails on a planted `tool:: [[innfo-mcp]]` in `procedures`/`visual-catalog`; filename guard extended to wrapper and bundle stems.
- [x] 3.4 [GREEN] `nn-mcp/src/server.ts` (`name: 'nn-mcp'`); `manifest/source.yaml` `mcp.name: nn-mcp` and re-render `docs/use/manifest-next.md`; `preflight-check.js`; `skills-commands.js` and `mcp-config-adapter.js` migration (D10).
- [x] 3.5 [GREEN] Delete `bin/innfo-mcp.bundle.js` (+ tsup entry and bin); `git mv scripts/innfo-mcp.{sh,ps1,cmd}` to `scripts/nn-mcp.*`.
- [x] 3.6 [GREEN] Prose: `skills/nn-innfo/SKILL.md`, `nn-console`, `nn-preflight` and docs use `nn-mcp_*`. List inbound links to the three doc files, fix live ones, then `git mv docs/innfo/documentation/{innfo-core,innfo-mcp,opencode-innfo-agent}.md` to `nn-*` (keep one filename if a frozen file links it); `docs/innfo/mcp-setup.md` uses `nn-mcp.*`.
- [x] 3.7 [GREEN] Bump `template_version` for `procedures` and `visual-catalog` (`tool:: [[nn-mcp]]`); do NOT edit `workspace` files.
- [x] 3.8 [VERIFY] Standard verification, `npm run typecheck && npm test`, preflight suites with empty `USERPROFILE`/`HOME`.
- [x] 3.9 [RELEASE] After merge cut, in order: `nn-mcp-v<version>` (strictly greater than the highest `innfo-mcp-v*` tag, >= 0.30.0, equal to the `nn-mcp` `package.json` version), `skills-v<next>`, `blueprints-v<next>`. Confirm the smoke test serves `nn-mcp-v*.bundle.js`. Then update skills on the maintainer machine. If two MCP servers register, delete the `innfo-mcp` config key. Needs maintainer confirmation.
- Boundary/rollback: revert; cut a skills release to re-render the manifest.

## Cleanup commit (after the first `nn-*` releases publish)

- [x] 4.1 [RED] Content guard row in `test/no-retired-references.test.mjs` for retired names, with a plant; `release-keys.test.js` (`innfo-mcp-v0.31.0` rejected); `validate-manifest.test.js` (legacy entry rejected); assemble test no longer uses `PREVIOUS_PIN_RENAMES`.
- [x] 4.2 [GREEN] Delete `PREVIOUS_PIN_RENAMES` and its tests; drop transitional filename-guard entries.
- [x] 4.3 [GREEN] Add retired entries to `iNNfo/specs/vocabulary.json` `retired_identifiers`.
- [x] 4.4 [VERIFY] Standard verification, `npm run typecheck && npm test`, and `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` returns 0 outside frozen classes. Old tags and CDN URLs still resolve.
- Boundary/rollback: revert the commit.

## Acceptance

- [x] `node scripts/verify.js` and CI are green on `main` after every PR.
- [x] `nn-console-v*` and `nn-mcp-v*` are published; `nn-mcp-v*.bundle.js` resolves on the CDN; the first `nn-mcp` version is greater than the highest `innfo-mcp-v*`.
- [x] The published manifest has one MCP entry, `nn-mcp`; `freshness.json` carries only `nn-*` keys.
- [x] `rg 'innfo-(core|mcp|console|shell|export|ui-css|payload)'` is 0 outside frozen/allowlisted paths after the cleanup commit.
- [x] `innfo-*-v*` tags and pinned CDN URLs still resolve.
