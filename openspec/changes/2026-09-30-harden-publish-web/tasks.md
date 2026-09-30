# Tasks: Harden publish-web

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 650-900 (about 60% tests) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (guard + diff) -> PR 2 (git auth/redaction) -> PR 3 (tree + runPublish + entrypoint) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Deep guard + allowlist + `publish-diff.js` fix | PR 1 | Base = tracker/main; standalone, nothing wired yet |
| 2 | `publish-web-git.js` (auth env, redact, runGit) | PR 2 | Base = PR 1 branch (feature-branch-chain) or main; independent of PR 1 |
| 3 | Tree replace, `runPublish`, thin entrypoint | PR 3 | Base = PR 2 branch; depends on 1 and 2 |

## Phase 0: Pre-apply (manual)

- [ ] 0.1 Check whether `cogNNitive-web` still has `docs/.nojekyll`; if missing, restore it once manually (preservation cannot recreate it).
- [ ] 0.2 Note: the deep guard refuses local runs from a tree containing `skills/nn-trannsform/node_modules`. For local dry or real runs, use a detached worktree: `git worktree add --detach <tmp> <sha>`.

## Phase 1: Guard and diff contract (Unit 1)

- [ ] 1.1 RED: `scripts/lib/publish-web-guard.test.js` covering the Deep Source Guard, Nested Manifest Allowlist and root-level scenarios (nested `node_modules`, `.env`, `.env.local`, root `src`/`package.json`, single-file surface, allowlisted vs non-allowlisted manifest, allowlist not relaxing `node_modules`, all offenders collected in one error).
- [ ] 1.2 RED: regression case, fixture mirroring real surfaces minus `node_modules` passes (nn-trannsform manifests included).
- [ ] 1.3 GREEN: create `scripts/lib/publish-web-guard.js` (`findSourceOffenders` with lstat walk, `assertNoSource` throwing, `MANIFEST_ALLOWLIST`).
- [ ] 1.4 RED then GREEN: extend `scripts/lib/publish-diff.test.js` for `PUBLIC_OWNED`; in `publish-diff.js` export it and fix the header (CNAME is compared, not excluded).

## Phase 2: Git auth and redaction (Unit 2)

- [ ] 2.1 RED: `scripts/lib/publish-web-git.test.js` for `buildGitAuthEnv` (no token in values other than the base64 header, `GIT_TERMINAL_PROMPT=0`) and `redact` (raw, base64, full header forms).
- [ ] 2.2 RED: `runGit` forced failure with a fake token yields a `PublishError` with no token or base64 (Failed git command is redacted).
- [ ] 2.3 GREEN: create `scripts/lib/publish-web-git.js` (`buildGitAuthEnv`, `redact`, `runGit`, `PublishError`; emit `::add-mask::` under `GITHUB_ACTIONS`).

## Phase 3: Tree replace and orchestration (Unit 3)

- [ ] 3.1 RED: `scripts/lib/publish-web-tree.test.js` (keeps `.nojekyll`; keeps CNAME only if the artifact lacks it; artifact CNAME wins).
- [ ] 3.2 GREEN: create `scripts/lib/publish-web-tree.js` (`replaceSiteTree` with preserve, `copyDistributionPath`).
- [ ] 3.3 RED: `scripts/lib/publish-web.test.js` against a local bare repo: changed site keeps `.nojekyll` in the commit; identical artifact creates no commit; clone `.git/config` has no token; local (non-CI) real publish proceeds.
- [ ] 3.4 RED: failure paths: guard failure creates no temp dir and no clone; forced git failure and dry run leave `tmpRoot` empty.
- [ ] 3.5 GREEN: create `scripts/lib/publish-web.js` (`runPublish(config, { tmpRoot, remoteUrl })`: guard all surfaces, mkdtemp, clone, stage, commit/push, `finally` rm).
- [ ] 3.6 GREEN: reduce `scripts/publish-web.mjs` to a thin entrypoint with a single catch and `process.exitCode = 1`; no `process.exit` below it.

## Phase 4: Verification

- [ ] 4.1 Run the new suites plus `node scripts/verify.js` (from a detached worktree if `skills/nn-trannsform/node_modules` exists); confirm auto-discovery by `collectTestSuites`.
- [ ] 4.2 Run `publish-web.mjs --dry-run` from a clean detached worktree against current `dev`; confirm no `publish-web-*` remains in tmp.
- [ ] 4.3 Note in the PR: first `main` publish validates env auth on the runner.
