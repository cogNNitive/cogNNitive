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

## Batch 2 - verify-report fixes (partial)

Done:
- Fail-closed offline guard preload `scripts/lib/offline-guard.js` (+ `loopback.js`, `offline-guard.test.js`): refuses non-loopback net/tls/dns/fetch before any socket I/O when `NN_OFFLINE=1`; loopback allowed (commit `feat(verify): add a fail-closed offline guard preload`).
- W1: `.verify-logs` upload now has `include-hidden-files: true`.
- S1: publish-web comments say `site` builds the artifact.
- S3: verbose mode reports spawn errors like quiet mode (test first).

BLOCKED (not done): wiring the guard into `childEnv`, `assertOnline(url)` loopback support, removing the three `delete process.env.NN_OFFLINE` lines, and making the `skills-manager.test.js` bootstrap case hermetic. The edit script was rejected by the CC Safety Net hook (rule `secret.basename.env`, a false positive on `.env`-like text in the command). Per the hook's instruction it was not retried or worked around. RED tests for it are in the working tree (`verify-offline.test.js` check 7, `github-client.test.js` loopback case).

W3 (recorded): between PR 1 and PR 2-4, main CI has NO manifest drift check (`generate-manifest --check`), NO live pin validation (`validate-manifest --channel stable`) and NO `check-parity`; `docs/use/manifest.md` stays tracked until PR 4 without validation. Accepted by the release freeze (no releases from PR 1 merge until the first tag-driven release). `--release` is a silent no-op.
