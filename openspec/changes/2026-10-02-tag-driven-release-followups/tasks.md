# Tasks: Tag-Driven Release Follow-ups

Conventions: `[TEST]` = failing test first (RED), `[IMPL]` = make it pass (GREEN), `[INVESTIGATE]` = evidence gathering, `[DOC]` = record a disposition. Test files are `*.test.js` / `*.test.mjs` discovered by `collectTestSuites` (`scripts/verify.js`). Each work unit must leave `main` green on its own.

## F3 - Local verify failures (highest signal first)

- [ ] T3.1 [INVESTIGATE] `scripts/export-console.test.mjs` Phase 4: determine which `innfo-console.bundle.js` the CLI resolves and why it reports `Version 0.6.0` while the vendored bundle and `console/package.json` are `0.7.3`. Compare the local resolution path against the clean `npm ci` CI path. Decide: real latent bug vs local build artifact.
- [ ] T3.2 [IMPL] If T3.1 finds a real bug: [TEST] reproduce it in a hermetic test (a fixture bundle with a mismatched banner), then [IMPL] fix the reader so the CDN pin always derives from the vendored bundle banner / `console/package.json`. Keep the existing assertions intact.
- [ ] T3.3 [DOC] If T3.1 finds environment-only: record the exact reproduction (base `cfc7a43c`, primary + worktree) and why CI differs, in `apply-progress.md`.
- [ ] T3.4 [INVESTIGATE] `skills/nn-preflight/scripts/preflight-check.test.js`: identify the workspace/watch-root source of the `visual-catalog.md` blocker and stop the test from reading a root outside the checkout.
- [ ] T3.5 [DOC] `build-trannsform-core-mirror --check`: record the junction-drift reproduction (worktree drift vs primary `OK`) as a known environment case.

## F1 - Smoke test spec/implementation divergence

- [ ] T1.1 [INVESTIGATE] Reconcile `openspec/specs/tag-driven-release-workflow/spec.md` ("A failing smoke test MUST fail the job...") with `.github/workflows/release.yml` (`continue-on-error: true`). Gather the evidence that motivated `b9f87555`.
- [ ] T1.2 [IMPL] Option (a): [TEST] assert the smoke step is not advisory in a workflow-config test, then remove `continue-on-error`. Rehearse a release run to confirm no CDN-propagation flakiness within the poll window.
- [ ] T1.3 [IMPL] Option (b): add a delta spec MODIFIED requirement making the smoke advisory, with the rationale and the retained guarantee (mirror tag + M remain; re-run converges). Update the DoD wording in `.agents/skills/nn-dev-release/SKILL.md`.
- [ ] T1.4 [DOC] Record the chosen option and why in `design.md`.

## F2 - Duplicate release runs

- [ ] T2.1 [INVESTIGATE] Root-cause the two runs for one tag push (runs `36999574864`, `36999575465`/`36999575415`): GitHub duplicate delivery vs a second trigger. Inspect the workflow `on:` config, the tag object, and the repo's workflow list.
- [ ] T2.2 [DOC] If not reproducible, record the invariant "releases are idempotent under duplicate runs" with the observed single-commit evidence, and add a duplicate-run check to the release rehearsal procedure.

## Verify (per work unit)

- [ ] `node scripts/verify.js` (offline), `node scripts/check-integrity.js`.
- [ ] For any F1 code change: a rehearsal `workflow_dispatch` run inspected; for a real `push` tag, the full 4-leg DoD.
