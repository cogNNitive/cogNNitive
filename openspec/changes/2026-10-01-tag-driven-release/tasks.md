# Tasks: Tag-Driven Release ("build once, release by tag")

Conventions: `[TEST]` = failing test first (RED), `[IMPL]` = make it pass (GREEN), `[MANUAL]` = maintainer-only, not automatable. Test files are `*.test.js` / `*.test.mjs` next to the module, discovered by `collectTestSuites` (`scripts/verify.js`). Spec refs are `capability / Requirement or Scenario`. Every PR must leave `main` green on its own. Releases are frozen from PR 1 merge until the first tag-driven release (Rollout 6).

## Step 0 - Manual prerequisites (before PR 2 rehearsal; no code)

- [ ] S0.1 [MANUAL] Create a fine-grained PAT on `cogNNitive-web` only (Contents read/write, covers tags). Ref: tag-driven-release-workflow / Release credential and server-side guards - Token scope.
- [ ] S0.2 [MANUAL] Create GitHub Environment `release` restricted to `*-v*` tags; store the PAT as `WEB_RELEASE_TOKEN`. Ref: same requirement.
- [ ] S0.3 [MANUAL] Add a web repo tag ruleset blocking update/deletion of `*-v*`. Ref: Published tag cannot be moved.
- [ ] S0.4 [MANUAL] Create repo variable `vars.RELEASE_ENABLED=false` (flipped to `true` in Rollout 5). Ref: Disabling the workflow is safe.

## PR 1 - Offline verify, quiet reporter, CDN staging split (AD-7, ~450 lines)

- [x] 1.1 [TEST] `scripts/lib/verify-reporter.test.js`: quiet pass, failure tail (last 60 lines), `--verbose`, >1 MB output without crash. Ref: quality-gates / Quiet buffered reporter (4 scenarios).
- [x] 1.2 [IMPL] Create `scripts/lib/verify-reporter.js` (`runStep`, log fd to `.verify-logs/<id>.log`); add `.verify-logs/` to `.gitignore`.
- [x] 1.3 [TEST] Extend `scripts/lib/github-client` test: `apiRequest`/`fetchString` throw under `NN_OFFLINE=1`; local git lookups still allowed. Ref: quality-gates / GitHub client throws when offline; Local git lookups are allowed.
- [x] 1.4 [IMPL] `scripts/lib/github-client.js`: throw when `NN_OFFLINE` is set.
- [x] 1.5 [TEST] `scripts/stage-mcp-bundle.test.mjs`: stages the committed bundle byte-for-byte, fails on code-split output; `build-docs.mjs` no longer stages it. Ref: quality-gates / MCP CDN bundle staging is independent of the editor build.
- [x] 1.6 [IMPL] Create `scripts/stage-mcp-bundle.mjs` (moves code from `build-docs.mjs:68-114`, code-split guard `:93-106`); strip CDN staging from `scripts/build-docs.mjs`.
- [x] 1.7 [IMPL] `scripts/verify.js`: drop `gh auth token` (`:30-37`) and steps 0, 3, 8, 9; set `NN_OFFLINE=1` on children; use `runStep`; run all steps then summarize (exit 1 on any failure); add `--verbose`. Ref: quality-gates / Verification is offline - Verify passes with no network, Verify does not need release tags.
- [x] 1.8 [IMPL] `.github/workflows/ci.yml`: remove `build:docs` from `verify` (`:46-49`); add `site` job (build docs, stage bundle, upload `pages-docs`); `::group::` tail and upload `.verify-logs/` on failure. Ref: Push CI makes no release-state lookups.
- [x] 1.9 [IMPL] `scripts/check-integrity.js`: drop `cdn-bundle-staged` check (`:73-81`) (moves to release, PR 2).
- Verify: `node scripts/verify.js` (offline, with network disabled), `node scripts/check-integrity.js`, `node --test scripts/lib/verify-reporter.test.js`.

## PR 2 - Release engine, gated (AD-1..AD-5, ~750 lines)

- [x] 2.1 [TEST] `scripts/release/release-keys.test.js`: table for 4 keys; `DISTRIBUTION_PATHS` derived from it. Ref: public-web-distribution / Additive versioned publish.
- [x] 2.2 [IMPL] Create `scripts/release/release-keys.js`; derive `DISTRIBUTION_PATHS` in `scripts/lib/publish-web*.js`.
- [x] 2.3 [TEST] `scripts/release/parse-release-tag.test.js`: valid per key, unknown key, malformed version, lightweight tag, not on main, console alone. Ref: Release tag shape and allowed keys (6 scenarios).
- [x] 2.4 [IMPL] Create `scripts/release/parse-release-tag.js` (`parseReleaseTag`, annotated + ancestor-of-main checks).
- [x] 2.5 [TEST] `scripts/release/publish-decision.test.js`: every AD-3 row. Ref: Idempotent re-run on the same tag; Mirror tags are written once (Re-run keeps the tag, Divergent tag never moved).
- [x] 2.6 [IMPL] Create `scripts/release/publish-decision.js` (`decidePublish`).
- [x] 2.7 [TEST] `scripts/manifest/lib/entry-version.test.js`: SKILL.md, spec, mcp, console readers. Ref: release-version-generation / Entry versions are read from their single authored source.
- [x] 2.8 [IMPL] Create `scripts/manifest/lib/entry-version.js`; use it from `manifest-rules.js:207,481`.
- [x] 2.9 [TEST] `scripts/release/assemble-manifest.test.js`: preserve other pins, nested mcp pin retained, regression guard, unit add/drop, determinism, snapshot, unresolved retained pin. Ref: Manifest content is assembled per unit and published last; New tag version strictly greater (Version below the previous pin).
- [x] 2.10 [IMPL] Create `scripts/release/assemble-manifest.js` (pure; reuses `renderFrontmatter`/`normalizeOutput` from `generate-manifest.js:223-253`).
- [x] 2.11 [TEST] `scripts/manifest/validate-manifest.test.js`: `--manifest <path|url>`; `checkBlueprintMainCoherence` gone. Ref: monorepo-release-manifest / Stable Template Main Coherence (REMOVED); Staged validation failure.
- [x] 2.12 [IMPL] `validate-manifest.js` add `--manifest`; remove `checkBlueprintMainCoherence` (`manifest-rules.js:247-274`, call `:495-500`).
- [x] 2.13 [TEST] `scripts/lib/publish-web-tree.test.js`: `releaseOwned` paths preserved; build artifact containing a release-owned path fails; versioned CDN file with different bytes fails. Ref: public-web-distribution / Publishing never prunes, Build artifact containing a release-owned path, Versioned file with different bytes.
- [x] 2.14 [IMPL] `publish-web-tree.js` (`replaceSiteTree` releaseOwned globs, `:21-49`), `publish-web.js` guard.
- [x] 2.15 [TEST] `scripts/release/run-release.test.js`: temp bare repo as web (`remoteUrl`), run twice (idempotent), conflicting tag, push-race retry (5x), validator stubbed, dry-run writes nothing. Ref: Release stages run in a fixed order; Idempotent re-run; Releases are serialized and safe to re-run.
- [x] 2.16 [IMPL] Create `scripts/release/run-release.js` (reuses `runGit`/`buildGitAuthEnv`, `diffTrees`, `copyDistributionPath`); add to orchestrator line-count guard (`verify.js:320-326`).
- [x] 2.17 [TEST] `scripts/release/smoke.test.js`: polling until byte-equal, MCP bundle sha256, failure after M keeps tag. Ref: Staged validation and post-publish smoke test (4 scenarios).
- [x] 2.18 [IMPL] Create `scripts/release/smoke.js`.
- [x] 2.19 [TEST] `scripts/release/restore-cdn-bundles.test.js` on a temp repo with deleted bundles. Ref: Previously deleted bundles are restored once.
- [x] 2.20 [IMPL] Create `scripts/release/restore-cdn-bundles.js` and `.github/workflows/restore-cdn.yml` (`workflow_dispatch`, one-shot).
- [x] 2.21 [IMPL] Create `.github/workflows/release.yml` (tags `skills-v*|blueprints-v*|innfo-mcp-v*|innfo-console-v*`, `group: release`, `cancel-in-progress: false`, env `release`, writes gated by `vars.RELEASE_ENABLED`, `workflow_dispatch` forced dry-run, upload `.verify-logs/` on failure). Ref: Release workflow is triggered only by monorepo tags.
- Verify: `node scripts/verify.js`, `node scripts/check-integrity.js`, `node --test scripts/release/*.test.js`. If PR exceeds 800 lines, split 2.19-2.21 into PR 2b.

## PR 3 - Single version source and guard removal (AD-6, ~650 lines, mostly deletions)

- [x] 3.1 [TEST] Update `console-shell.test.ts:112` and a `console-release-info` test to read `iNNfo/specs/bluepriNNts/console/package.json`. Ref: release-version-generation / Console version has its own source.
- [x] 3.2 [IMPL] Create `iNNfo/specs/bluepriNNts/console/package.json` (`private`, `version`); re-source `console-release-info.js`, `console-shell-guard.js`.
- [x] 3.3 [TEST] `scripts/release/version-agreement.test.js`: mcp/console tag = package version; skills/blueprints monotonic across both repos. Ref: New tag version strictly greater (Version not greater, Authored version mismatch for innfo-mcp).
- [x] 3.4 [IMPL] Implement the agreement check in `scripts/release/` and call it from `run-release.js`.
- [x] 3.5 [TEST] Inventory guard test: every `source.yaml` path exists (replaces `check-parity`). Ref: release-version-generation / Source paths still exist.
- [x] 3.6 [IMPL] `manifest/source.yaml`: remove all `version:` and `channels:` (`:227-257`); preview refs become constant `main` in code. Ref: monorepo-release-manifest / Source inventory carries no versions or channels.
- [x] 3.7 [IMPL] `sync-versions.mjs`: drop `syncSourceYaml` (`:181-238`); keep `samples.ts`/innfo-core checks; update `package.json` scripts. Ref: Comprehensive template version synchronization.
- [x] 3.8 [IMPL] Delete `channel-refs.js`, `check-parity.js`, `tag-pin-freshness.js`, `check-tag-pin-freshness-cli.js`, `cdn-bundle-staged.js` and their tests; remove from `verify.js` step 3/7, `check-integrity.js:61-71`, `.githooks/pre-push:53-61`. Ref: Obsolete synchronization guards are removed (Every removed guard has a disposition).
- [x] 3.9 [TEST]+[IMPL] `scripts/lib/freshness.js`: baseline = newest monorepo `<key>-v*` tag (local git), non-blocking, moved to `site` job (`ci.yml:72-75`); remove dev validate step `ci.yml:61-66`. Ref: ci-stable-manifest-on-dev (REMOVED requirements).
- [x] 3.10 [IMPL] `scripts/manifest/generate-manifest.js`: stable derives ref from tag (no API); `--check` no longer a gate. Ref: release-version-generation / The tag determines the ref; Generation is not a verification gate.
- Verify: `node scripts/verify.js`, `node scripts/check-integrity.js`, `node scripts/lib/legacy-ledger-guard.js`, `node --test scripts/release/*.test.js`.

## PR 4 - Manifest leaves the repo (~300 lines)

- [x] 4.1 [TEST] Test that `docs/use/manifest.md` is untracked and `build-docs.mjs` output omits stable manifest/CDN; main publish preserves web manifest. Ref: monorepo-release-manifest / Monorepo does not track the stable manifest; public-web-distribution / Build artifact containing a release-owned path.
- [x] 4.2 [IMPL] `git rm --cached docs/use/manifest.md`, add to `.gitignore`; `build-docs.mjs:141-154` remove stable copy (keep `manifest-next`).
- [x] 4.3 [IMPL] Enforce strict release-owned guard in `publish-web` (same PR as 4.2, required for green main).
- [x] 4.4 [IMPL] Remove stable path from `generate-manifest.js`; delete `verify.js` step 8 remnants.
- Verify: `node scripts/verify.js`, `node scripts/check-integrity.js`, then after merge confirm first main publish keeps the web manifest.

## PR 5 - Docs, specs, fallback URL, cleanup (AD-9, ~350 lines)

- [x] 5.1 [TEST] Test both consumers export the same fallback URL `https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/docs/use/manifest.md`. Ref: monorepo-release-manifest / Both consumers agree.
- [x] 5.2 [IMPL] Update `scripts/lib/skills-commands.js:45` and `skills/nn-preflight/scripts/preflight-check.js:41-42`.
- [x] 5.3 [IMPL] Rewrite `.agents/skills/nn-dev-release/SKILL.md` as "tag, push, watch" incl. failure/re-run states and manual snapshot rollback. Ref: dev-skills / The release procedure is "tag, push, watch"; Failure and re-run states are documented.
- [x] 5.4 [IMPL] Merge delta specs into `openspec/specs/*` (8 capabilities); keep `check:spec-urls` happy (split code spans for bare slugs).
- [x] 5.5 [IMPL] Delete `.github/workflows/restore-cdn.yml` and `scripts/release/restore-cdn-bundles.js` (+ test).
- [x] 5.6 [IMPL] Delete `openspec/changes/2026-10-01-decoupled-release-pipeline/` (superseded; maintainer request).
- Verify: `node scripts/verify.js`, `node scripts/check-integrity.js`, spec-integrity job.

## Rollout (mirrors design Migration)

- [x] R.1 Merge PR 1 (releases frozen from here).
- [x] R.2 Merge PR 2; [MANUAL] run `restore-cdn.yml` once; confirm old `innfo-mcp-v*.bundle.js` URLs resolve.
- [x] R.3 [MANUAL] Dry-run rehearsal via `release.yml` `workflow_dispatch` per key (4 runs); review decisions and staged manifest.
- [x] R.4 Merge PR 3, then PR 4, then PR 5.
- [ ] R.5 [MANUAL] Set `vars.RELEASE_ENABLED=true`.
- [ ] R.6 [MANUAL] Canary releases in order: `innfo-console`, `blueprints`, `skills` (ships fallback fix), `innfo-mcp`. Each version > highest tag in both repos. Watch smoke test per key. Freeze ends after the first.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | PR 1 ~450, PR 2 ~750, PR 3 ~650, PR 4 ~300, PR 5 ~350; total ~2,500 |
| 800-line budget risk | PR 1 Low, PR 2 High (close to limit; split 2b if exceeded), PR 3 Medium, PR 4 Low, PR 5 Low |
| Delivery strategy | ask-on-risk (threshold 800) |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
800-line budget risk: High (PR 2); Low/Medium for others
Note: the generic guard line `400-line budget risk` is not used; this project's threshold is 800.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Offline verify + reporter + staging split | PR 1 | base main (or tracker); standalone |
| 2 | Gated release engine | PR 2 | depends on PR 1; inert until `RELEASE_ENABLED` |
| 3 | Single version source | PR 3 | depends on PR 2 |
| 4 | Manifest untracked + strict guard | PR 4 | depends on PR 3 |
| 5 | Docs, specs, fallback URL, cleanup | PR 5 | depends on PR 4; deletes superseded change |

Release-freeze window: no releases from PR 1 merge until the first tag-driven release (R.6). Step 0 is manual and must finish before R.3.
