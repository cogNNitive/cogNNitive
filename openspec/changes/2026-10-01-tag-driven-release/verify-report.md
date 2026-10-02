# Verify Report: tag-driven-release, PR 1 (tasks 1.1-1.9, AD-7) - RE-VERIFICATION

Mode: openspec, Strict TDD. Scope: diff ea17b810..HEAD (fixes in 7998cdf1, 82f47670, 1a955d9c). Fresh-context review.

## Evidence
- `node scripts/verify.js` -> exit 0, "All deterministic pre-checks passed."
- `node scripts/check-integrity.js` -> exit 0, "ALL INTEGRITY GATES PASSED."
- C1 independent proof: skills-manager, shared-libs, validate-manifest, github-client, offline-guard suites run with `NN_OFFLINE=1`, `NODE_OPTIONS=--require <trap> --require scripts/lib/offline-guard.js`; all exit 0; trap (connect/dns.lookup, non-loopback only, logged after the guard) recorded nothing. Previously the same suite logged codeload.github.com / raw.githubusercontent.com.
- Fail-closed: ad-hoc under the guard, `fetch('https://example.com')`, `https.get`, `net.connect(443,'1.1.1.1')`, `dns.lookup('example.com')`, `fetch('http://[::2]:1/')` all throw `ENN_OFFLINE` before I/O; offline-guard.test.js covers the same plus inert-when-unset.
- Bootstrap route trace (request log on the loopback server): `/manifest.md`, then `/codeload.../tar.gz/<sha>`, then `/raw.../spec_NN.md`. On this Windows machine the tarball is requested, extraction fails (the msys GNU tar is first on PATH), and the CLI falls back to the raw route.

## Previous findings: resolution
- C1 (live network in skills-manager): RESOLVED. `delete process.env.NN_OFFLINE` removed; test uses loopback GitHub fixture + preload; verify-offline.test.js:75 forbids reintroducing the delete; guard is socket-level and fail-closed.
- W1 (hidden dir upload): RESOLVED (`include-hidden-files: true`, ci.yml:51).
- W2 (fail-open / socket-level guard): RESOLVED via offline-guard.js in childEnv (verify.js:219-237).
- W3 (coverage gap until PR 2): ACCEPTED, unchanged; record in PR description.
- W4 (source-regex tests only): RESOLVED in substance (offline-guard.test.js is behavioural; verify runs every suite under the preload).
- W5 (preserveSymlinks): STILL OPEN as scope creep, not CI-verified (see W-C).
- S1: RESOLVED. S2: RESOLVED (downloadFile tested, github-client.test.js:41). S3: RESOLVED (verbose prints spawn error, verify-reporter.js:61). S4: OPEN (readFileSync tail, tolerable). S5: see Size.

## Findings

### CRITICAL
None.

### WARNING
- W-A. Test detection in production code: scripts/lib/github-client.js:16-27,42 (`PLATFORM_FETCH`, `process.__nnPlatformFetch`, `isRealFetch`, early return in `assertOnline`). Not justified now that the preload guarantees offline at the socket level. Evidence: suites that stub `globalThis.fetch` and call real GitHub URLs under NN_OFFLINE=1 (shared-libs.test.js:219-267, validate-manifest.test.js:44/74/210/221) would throw if `assertOnline` were loopback-only; that is the only reason the stand-down exists. It also writes a global onto `process`, and a client first loaded after a stub treats the stub as the platform fetch. Recommendation: delete `isRealFetch`/`PLATFORM_FETCH` and the early return, then either (a) remove `assertOnline` and let the preload's `ENN_OFFLINE` surface from fetch (rewrite github-client.test.js:36-42 to spawn a child under the preload; reword the spec scenario "GitHub client throws when offline" to "outbound call refused by the offline guard"), or (b) keep strict loopback-only `assertOnline` and move the stubbed suites to loopback URLs. (a) is smaller with no behavioural loss: a stub never reaches the network, an unstubbed call dies at the socket. Residual risk of (a): in-process steps in verify.js:404 run in the parent without the preload; they are local file checks, or call `require('./lib/offline-guard.js')` after setting the env. Not blocking.
- W-B. Bootstrap test cannot distinguish the tarball route from the fallback (skills-manager.test.js, fixture server ~lines 220-228, assertion ~265). Tarball and raw payloads are identical and the assertion only requires every request to be codeload OR raw. Observed on Windows: tarball downloaded, extraction fails, raw fallback masks it, test green. On Linux CI the tarball succeeds and raw is never hit. So `extractTarball`/`findRepoRoot` is exercised only on Linux and the fallback only on Windows, and a regression in either is masked (a broken tarball layout on Linux would also pass via raw). Fix: make the raw body distinguishable and assert the expected route per platform, or force bsdtar so the tarball route is deterministic.
- W-C. scripts/build-console-payload.mjs:36 `preserveSymlinks: true` plus removal of the path-normalising regex is not a PR 1 task and changes generated output for every environment; verified only in a worktree, not a CI checkout (the console-mirror step passes here). Split it or confirm on CI.

### SUGGESTION
- S-1. scripts/lib/test-fixtures/github-loopback-preload.js:30-33 patches client exports before `skills-commands.js` destructures them; sound under `--require` (shared module cache). Hermetic: passed only in the child env (not process.env), inert without `SM_TEST_GITHUB_PORT`, and with the guard on unrewritten hosts fail closed. Server and tmp dir closed in `finally`. No leakage found.
- S-2. iNNfo/packages/innfo-mcp/tsup.config.ts:38 comment edit is cosmetic but accurate; keep.
- S-3. verify-reporter.js tail read could be bounded (old S4).

## Size
Diff ea17b810..HEAD: 23 files, 1296 insertions, 321 deletions (previous run 846/319 over 20 files). Growth is the offline guard (106 + 115 test + 19 loopback), loopback preload (33), skills-manager test hermeticity (+42), plus openspec artifacts (apply-progress 55, tasks 18, report 47). Not required by PR 1 tasks/fixes: build-console-payload.mjs (W-C, 7 lines); stage-mcp-bundle (66 + 69) is only consumed by CI `site` and is the natural split. Still over 400 lines: needs `size:exception` or a split. The W-A recommendation would delete about 25 production lines.

## Verdict: PASS (0 CRITICAL, 3 WARNING, 3 SUGGESTION). Next: sdd-archive is acceptable for PR 1; W-A and W-B are recommended before merge, W-C should be split or CI-confirmed.
