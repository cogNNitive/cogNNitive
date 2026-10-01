# Apply Progress: Tag-Driven Release

## Batch 1 - PR 1 (offline verify, quiet reporter, CDN staging split; AD-7)

Status: tasks 1.1-1.9 done (9/9). PR 2..5 not started.

### Baseline (before changes, worktree `session/release-redesign`, base `ea17b810`)

- `node scripts/verify.js` failed at step 0: staged CDN bundle missing (expected on a fresh worktree).
- `npm run build:docs` crashed in the editor build (`vue-tsc`, exit 3221226505, environment). The bundle was staged by hand (copy) to get past step 0.
- With the bundle present, the old fail-fast verify stopped at `Check Console Payload Mirror Fresh` (drift). This is pre-existing and environmental (worktree `node_modules` is a junction to the primary checkout). It is unchanged by this PR and is the only failure in the new run-all output.

### Tasks and evidence (RED -> GREEN)

| Task | RED | GREEN |
|------|-----|-------|
| 1.1/1.2 reporter | `Cannot find module './verify-reporter.js'` | `verify-reporter tests passed` (quiet pass with 5 MB, 60-line tail, verbose, >1 MB with exit status 7, stderr to log, inline steps) |
| 1.3/1.4 offline client | `Missing expected rejection` (apiRequest swallowed fetch) | `github-client offline tests passed` |
| 1.5/1.6 staging | `ERR_MODULE_NOT_FOUND stage-mcp-bundle.mjs`, then the build-docs assertion failed until the staging was removed | 4 checks pass (byte-for-byte, code-split rejected, missing bundle, build-docs clean) |
| 1.7 verify.js | `verify.js must not call gh auth token` / missing exports | `verify-offline tests passed` (no retired steps, NN_OFFLINE forced, run-all summary, `--release` no-op) |
| 1.8 ci.yml | n/a (workflow) | YAML parses; jobs `verify, site, quality, spec-integrity, publish-web`; publish-web needs site |
| 1.9 check-integrity | `check-integrity must not check CDN staging` | `verify-offline tests passed` |

### Deviations / decisions

1. **Suites that stub fetch or use a loopback server** (`scripts/lib/shared-libs.test.js`, `scripts/manifest/validate-manifest.test.js`, `scripts/skills-manager.test.js`) now `delete process.env.NN_OFFLINE` at the top. Enforcement correctly broke them under `NN_OFFLINE=1`; they never touch the real network. The spec's "client throws when offline" is unchanged (no loopback exception).
2. **`ci.yml` dev "Stable-manifest coherence check" step removed in PR 1** (design schedules it in 3.9). It calls the GitHub API on push to dev, which the PR 1 requirement "Push CI makes no release-state lookups" forbids. It was `continue-on-error`.
3. **`freshness.js` step moved into the `site` job in PR 1** (design schedules it in 3.9) because it writes `docs/use/freshness.json` into the `pages-docs` artifact, and `verify` no longer builds docs. Baseline stays the pin (unchanged; the tag-based baseline is 3.9).
4. **`site` job stages the CDN bundle BEFORE `build:docs`** so CDN bytes equal the committed bytes (the docs build rebuilds `bin/innfo-mcp.bundle.js`). Added `npm run stage:mcp-bundle`.
5. `verify.js`: `--release` is accepted and ignored; `runVerification` now returns a boolean (callers exit); `check-integrity.js` was updated to honour it. `NN_OFFLINE` is restored after the run so `check-integrity` does not leak it.
6. `check-parity.js` stays in the line-count orchestrator list (file is deleted in PR 3).

### Remaining

- PR 2..5 and manual S0.x / R.x tasks.
- The `cdn-bundle-staged` lib and its test are intentionally kept until PR 2/3 (moves to release).

## Batch 2 - verify-report fixes (C1, W1-W4, S1, S3)

PR 1 ships as size:exception (approved by maintainer 2026-10-01; ~1,160+ changed lines, mostly tests).

Completed after the hook block (all edits via Read/Edit/Write):
- `verify.js` `childEnv` adds `NODE_OPTIONS=--require "<abs>/scripts/lib/offline-guard.js"` (existing NODE_OPTIONS preserved, no double add).
- `github-client.js` `assertOnline(url)` allows loopback. It also stands down when `globalThis.fetch` is a test double (a double cannot reach the network; one that falls through to the real fetch is refused by the socket-level preload). The review's W2 premise that stubs run after the client check was wrong: the client checks first, so without this rule stubbed suites (validate-manifest, shared-libs) would fail.
- The three `delete process.env.NN_OFFLINE` lines are gone.
- `skills-manager.test.js` bootstrap is hermetic: a loopback server serves the fixture tarball and the raw fallback; the CLI runs with `scripts/lib/test-fixtures/github-loopback-preload.js`, which rewrites GitHub URLs to that server. On this Windows machine PATH `tar` is GNU tar and cannot read `C:\` paths, so the CLI uses the raw fallback route (same as before); on CI the tarball route is used.
- Proof: `shared-libs`, `validate-manifest`, `skills-manager`, `verify-offline`, `github-client`, `offline-guard` suites run with `childEnv()` (NN_OFFLINE=1 + preload): all exit 0, zero `ENN_OFFLINE`/offline refusals.

Batch 3 (re-verify warnings):
- W-A: all offline/test-detection logic removed from `scripts/lib/github-client.js` (`assertOnline`, `isRealFetch`, `PLATFORM_FETCH`, `process.__nnPlatformFetch`) and the detection-only fetch marker removed from the guard. Enforcement is solely the preload. `github-client.test.js` now spawns children under the preload and asserts `ENN_OFFLINE` (fetchString, fetchJson, downloadFile reject; apiRequest returns status 0 with the error), loopback works, local git works, and the client source has no offline logic. Spec scenario reworded ("The preload refuses non-loopback network for every verify child"). Stubbed suites (shared-libs, validate-manifest) and skills-manager pass under the preload with zero refusals.
- W-B: the bootstrap test serves distinguishable bodies (`ROUTE=tarball` / `ROUTE=raw`) and asserts the installed template is `ROUTE=tarball`. On Windows it puts `System32\tar.exe` (bsdtar) first on PATH for both the fixture build and the CLI (asserting it exists), so the tarball route is exercised on every OS; no silent fallback and no skip.

Earlier in this batch:
- Fail-closed offline guard preload `scripts/lib/offline-guard.js` (+ `loopback.js`, `offline-guard.test.js`): refuses non-loopback net/tls/dns/fetch before any socket I/O when `NN_OFFLINE=1`; loopback allowed (commit `feat(verify): add a fail-closed offline guard preload`).
- W1: `.verify-logs` upload now has `include-hidden-files: true`.
- S1: publish-web comments say `site` builds the artifact.
- S3: verbose mode reports spawn errors like quiet mode (test first).

W3 (recorded): between PR 1 and PR 2-4, main CI has NO manifest drift check (`generate-manifest --check`), NO live pin validation (`validate-manifest --channel stable`) and NO `check-parity`; `docs/use/manifest.md` stays tracked until PR 4 without validation. Accepted by the release freeze (no releases from PR 1 merge until the first tag-driven release). `--release` is a silent no-op.

## Batch 4 - PR 2 (release engine, gated; AD-1..AD-5)

Status: tasks 2.1-2.21 done (21/21).

### Implemented Components
1. `scripts/release/release-keys.js` & `.test.js`: defines release keys table (`skills`, `blueprints`, `innfo-mcp`, `innfo-console`), derived distribution paths and release-owned paths.
2. `scripts/release/parse-release-tag.js` & `.test.js`: tag shape validation, key/semver extraction, ancestor-of-main verification, annotated tag requirement.
3. `scripts/release/publish-decision.js` & `.test.js`: AD-3 pure state matrix decision engine (detects whether content C and mirror tag need publishing or are idempotent re-runs).
4. `scripts/manifest/lib/entry-version.js` & `.test.js`: single source of truth readers for entry versions from SKILL.md frontmatter, blueprint specs, MCP package.json, and console specs.
5. `scripts/release/assemble-manifest.js` & `.test.js`: pure release manifest assembler combining previous web manifest, content SHA, tagged inventory, version regression guard, and snapshot creation.
6. `scripts/manifest/validate-manifest.js`: added `--manifest <path|url>` support, removed `checkBlueprintMainCoherence`, compact orchestrator under 200 lines.
7. `scripts/lib/publish-web-tree.js`: preserves `releaseOwned` paths on publish, rejects build artifacts colliding with release paths or conflicting versioned CDN files.
8. `scripts/release/run-release.js` & `.test.js`: complete release orchestration engine with serialized stages, push-race retries (up to 5x with exponential backoff), staged validation, commit C and mirror tag, commit M and snapshot, and smoke test.
9. `scripts/release/smoke.js` & `.test.js`: post-publish polling smoke test verifying byte-level manifest parity and CDN bundle integrity.
10. `scripts/release/restore-cdn-bundles.js` & `.test.js` & `.github/workflows/restore-cdn.yml`: one-shot restoration workflow for historical CDN bundles.
11. `.github/workflows/release.yml`: tag-triggered release workflow with concurrency grouping, `release` environment, and `vars.RELEASE_ENABLED` gate.

### Verification
- `verify.js`: 96/96 steps pass offline.
- `check-integrity.js`: ALL INTEGRITY GATES PASSED.

