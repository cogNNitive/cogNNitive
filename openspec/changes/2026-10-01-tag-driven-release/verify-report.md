# Verify Report: tag-driven-release, PR 1 (tasks 1.1-1.9, AD-7)

Mode: openspec, Strict TDD. Scope: `git diff ea17b810..HEAD`. Fresh-context review.

## Evidence
- `node scripts/verify.js` -> exit 0, "All deterministic pre-checks passed."
- `node scripts/check-integrity.js` -> exit 0, "ALL INTEGRITY GATES PASSED."
- Tasks 1.1-1.9: 9/9 checked, each backed by an existing test or CI/code change.

## Spec compliance (quality-gates)
| Scenario | Result |
|---|---|
| Verify passes with no network | FAILING (see C1: skills-manager.test.js reaches codeload.github.com / raw.githubusercontent.com) |
| Verify does not need release tags | COMPLIANT (buildSteps identical with/without --release; verify-offline.test.js) |
| GitHub client throws when offline | COMPLIANT (github-client.test.js; apiRequest, fetchString, downloadFile guarded; downloadFile untested) |
| Local git lookups allowed | COMPLIANT (github-client.test.js, git rev-parse under NN_OFFLINE=1) |
| Push CI makes no release-state lookups | COMPLIANT (dev coherence step removed, no GITHUB_TOKEN env, no --release) |
| Passing suite quiet / failing tail / verbose / >1MB | COMPLIANT (verify-reporter.test.js) |
| Bundle staged without editor build / editor build does not stage | COMPLIANT (stage-mcp-bundle.test.mjs) |
| CI uploads .verify-logs on failure | PARTIAL (see W1) |

## Findings

### CRITICAL
- C1. Offline guard is disabled for three suites and one of them uses the live network. `scripts/skills-manager.test.js:7` (`delete process.env.NN_OFFLINE`); test 5 (`bootstrap`, ~line 181) downloads a pinned template tarball from `codeload.github.com` and raw files from `raw.githubusercontent.com`. Evidence: running the suite with a connect/DNS trap and `NN_OFFLINE=1` logged `NET/DNS codeload.github.com:443` and `raw.githubusercontent.com:443` (exit 0, i.e. it needs the network to pass). `scripts/lib/shared-libs.test.js:19` and `scripts/manifest/validate-manifest.test.js:7` showed zero non-loopback traffic today, but nothing enforces that. The apply-progress claim "they never touch the real network" is false for skills-manager. This violates "Verify passes with no network" and the "enforced, not merely asserted" paragraph. Fix: do not delete the guard. Either stub the tarball/raw transport in that test (loopback server, as test 1/2 already do) or move the live-bootstrap case out of verify.

### WARNING
- W1. `ci.yml` "Upload verify logs" uses `actions/upload-artifact@v4` with `path: .verify-logs`. v4.4+ excludes hidden files/dirs by default, so the dot-directory is likely uploaded empty ("No files were found"). Add `include-hidden-files: true` (or log to a non-dot dir). Spec requires the upload.
- W2. Safer design for the guard than `delete process.env.NN_OFFLINE`: keep the `assertOnline()` check in github-client but allow loopback hosts (127.0.0.1, localhost, ::1) by URL; and for suites that stub `globalThis.fetch`, they replace the transport after the check, so a stub that is missed still hits `assertOnline` and fails closed. Today `delete` makes any missed stub fail OPEN, the exact failure mode in the project memory (github-client tests stub https.get). Better still, inject a preload (`NODE_OPTIONS=--require scripts/lib/offline-guard.js`, set in `childEnv`) that wraps `net.Socket.connect`/`dns.lookup` for non-loopback hosts; it also covers `skills-commands.js` (http/https.request, not github-client only) and any child process a suite spawns. Note `skills-commands.js` uses https.request directly (lines 12-13, 84-87), so the github-client guard alone does not cover all network paths.
- W3. Coverage gap until PR 2: removing the stable-manifest drift check (`generate-manifest --check`), live `validate-manifest --channel stable` and `check-parity` from verify (planned by 1.7) leaves `docs/use/manifest.md` (still tracked until PR 4) with no drift or pin validation on main between PR 1 and the first tag-driven release. Accepted by the freeze in tasks.md, but record it explicitly. `--release` is now a silent no-op (documented in verify.js header; not warned at runtime).
- W4. `verify-offline.test.js` assertions 1 and 6 are source-regex checks (`/gh auth token/`, `/if \(!runVerification\(/`), and no test proves the whole step list makes zero network calls; that is why C1 slipped through. Add a test that runs the suites with a network trap, or the preload from W2 in `childEnv`.
- W5. `scripts/build-console-payload.mjs:33-38` (`preserveSymlinks: true`) is not a PR 1 task; it is a worktree-environment fix. It passes here, but with workspace symlinks (`@cognnitive/*`) in CI it changes esbuild path output vs. resolved real paths; verified only in the worktree, not on a CI-like checkout. Move to its own commit/PR or confirm on CI.

### SUGGESTION
- S1. `ci.yml` publish-web comment still says "pushes the artifact `verify` already built"; now `site` builds it. `Download built docs` comment likewise.
- S2. `downloadFile` is guarded (`github-client.js`) but has no offline test; add one beside apiRequest/fetchString.
- S3. Verbose mode (`verify-reporter.js:60-62`) swallows spawn errors (ENOENT yields status 1 with no message); quiet mode prints them.
- S4. Reporter reads whole log with `readFileSync` to tail (`verify-reporter.js:93`); fine for tested 5 MB, but a bounded tail read would be safer for very large failing logs.
- S5. Diff size: ~846 insertions / 319 deletions across 20 files (about 1,160 changed lines) is mostly required (verify.js rewrite 405, reporter + tests 247, staging + test 135, offline test 66, github-client test 69, ci.yml 76). Movable out without breaking PR 1 tasks: `build-console-payload.mjs` fix (W5), the cosmetic comment edit in `iNNfo/packages/innfo-mcp/tsup.config.ts`, and the `.verify-logs` CI upload tweak if split. Realistically this saves about 20 lines; the PR needs the 800-line exception or a split of stage-mcp-bundle (135 lines incl. test) into its own PR, since CI `site` is the only consumer.

## Other checks
- Reporter: fd-based stdio avoids maxBuffer; exit status propagates (null -> 1); run-all summary verified; `::group::` only when `GITHUB_ACTIONS`; passes on Windows.
- ci.yml: valid YAML; jobs `verify, site, quality, spec-integrity, publish-web`; `publish-web` needs `site` and downloads `pages-docs`, which `site` uploads on main only; freshness moved to `site` (needs fetch-depth 0, present).
- check-integrity.js: still meaningful; `if (!runVerification(...)) exit 1` honours the boolean, other groups unchanged; retained `tag-pin-freshness` uses local git only.
- Remaining network capable code outside verify steps: `scripts/manifest/*`, `skills-commands.js`, `export-console.mjs` URLs are strings only. No remaining `gh`/network call in verify step list except via the C1 suite.

## Verdict: FAIL (1 CRITICAL). Next: sdd-apply to fix C1 (and W1), then re-verify.
