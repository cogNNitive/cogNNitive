# Design: Harden publish-web

## Technical Approach

Split `scripts/publish-web.mjs` into pure/testable CommonJS modules under `scripts/lib/` (same style as `publish-diff.js`), leaving the `.mjs` as a thin entrypoint: parse env/argv, call `runPublish(config)`, catch once, print the (already-redacted) message, set `process.exitCode = 1`. No `process.exit` anywhere below the entrypoint, so every `finally` runs.

Order of operations changes: **guard every surface -> mkdtemp -> clone -> stage -> commit/push -> finally rm temp**. A guard violation therefore never creates a temp dir or touches the network.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| Token auth | Env-scoped git config: `GIT_CONFIG_COUNT=1`, `GIT_CONFIG_KEY_0=http.https://github.com/.extraheader`, `GIT_CONFIG_VALUE_0=AUTHORIZATION: basic <base64("x-access-token:"+token)>`, plus `GIT_TERMINAL_PROMPT=0`; passed only via `execFileSync`'s `env` | (a) token in URL (today); (b) `GIT_ASKPASS` helper script; (c) `-c http.extraheader=...` / `credential.helper` in argv | Same mechanism `actions/checkout` uses. Never in argv (visible in `ps` and in `Command failed:` messages), never in the remote URL, never written to `.git/config` (dies with the child env). Askpass needs a helper file on disk with per-OS shebang/`.cmd` variants on Windows -- more surface, same guarantee. Requires git >= 2.31 (runner and local Git for Windows both satisfy it). |
| Output redaction | Every git call goes through `runGit`, which catches, and rethrows `PublishError` whose message/stderr has the raw token, its base64 form, and the full header value replaced by `***` | Rely on Actions masking | Masking covers only the literal secret and not local runs; base64 is never masked. Under `GITHUB_ACTIONS=true` also emit `::add-mask::<base64>` as defense in depth. |
| Guard semantics | Deep walk (lstat, no symlink follow) over repo-relative paths. Any depth: `node_modules/`, `.env`, `.env.*`. Surface root: `src`, `packages`, `apps`, `package.json`, `package-lock.json`, `tsconfig.json`. Nested `package.json`/`package-lock.json`: offender unless its dir is in `MANIFEST_ALLOWLIST = ['skills/nn-trannsform']`. All offenders across all surfaces collected, one `PublishError` | Silently filtering `node_modules` during copy | The guard is a contract assertion; silent filtering would hide a dirty tree. Collecting all offenders gives one actionable message. |
| Public-owned files | `replaceSiteTree(src, dst, { preserve })`: read preserved files from the clone's site dir into memory, rm, copy artifact, write preserved files back unless the artifact provides them. `preserve = ['.nojekyll', 'CNAME']` (CNAME only when absent from the artifact) | Generate `.nojekyll` in `build:docs` | Keeps `PUBLISH_EXCLUDED` meaning "public repo owns it" effective, not just diff-invisible. No build change. |
| `publish-diff.js` | Keep `PUBLISH_EXCLUDED = {.git, .nojekyll}`; fix header (CNAME is compared, not excluded); export `PUBLIC_OWNED = ['.nojekyll']` consumed by the tree module | Add CNAME to exclusion | Private `docs/CNAME` exists; comparing it is correct. |
| Local real publishes | Allowed (no CI-only gate) | Refuse when `!GITHUB_ACTIONS` | Automatic-mode default. Redaction + env auth make local runs safe; the deep guard forces a clean tree (e.g. a detached worktree without `node_modules`). |

## Data Flow

```
entry (.mjs) --config--> runPublish
   runPublish: guardSurfaces([docs, ...DISTRIBUTION_PATHS])  --throws--> entry catch
             -> mkdtemp(tmpRoot) ─┐
             -> runGit(clone, env=auth)                       │ finally
             -> diffTrees -> replaceSiteTree(preserve)        │ rmSync(work)
             -> copy distribution paths                       │
             -> runGit(add/commit/push, env=auth) ────────────┘
   runGit error -> redact(secrets) -> PublishError -> entry prints, exitCode=1
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/publish-web.mjs` | Modify | Thin entrypoint; single catch; `process.exitCode` |
| `scripts/lib/publish-web.js` | Create | `runPublish(config, { tmpRoot, remoteUrl })`; owns temp lifecycle |
| `scripts/lib/publish-web-guard.js` | Create | `findSourceOffenders`, `assertNoSource`, rule constants, allowlist |
| `scripts/lib/publish-web-git.js` | Create | `buildGitAuthEnv(token)`, `redact(text, secrets)`, `runGit`, `PublishError` |
| `scripts/lib/publish-web-tree.js` | Create | `replaceSiteTree`, `copyDistributionPath` |
| `scripts/lib/publish-diff.js` | Modify | Header fix, export `PUBLIC_OWNED` |
| `scripts/lib/publish-web-{guard,git,tree}.test.js`, `publish-web.test.js` | Create | Plain-node suites (auto-discovered by `collectTestSuites` in `scripts/verify.js`) |
| `openspec/changes/2026-09-30-harden-publish-web/specs/public-web-distribution/spec.md` | Create (spec phase) | Delta |

`.github/workflows/ci.yml`: unchanged.

## Interfaces / Contracts

```js
// publish-web-git.js
buildGitAuthEnv(token) // -> { GIT_CONFIG_COUNT, GIT_CONFIG_KEY_0, GIT_CONFIG_VALUE_0, GIT_TERMINAL_PROMPT, secrets: string[] }
runGit(args, { cwd, env, secrets }) // -> stdout; throws PublishError with redacted message
// publish-web-guard.js
findSourceOffenders(repoRoot, surfaces, { manifestAllowlist }) // -> string[] repo-relative
```

`runPublish` accepts `remoteUrl` (tests pass a local bare repo) and `tmpRoot` (tests pass an isolated dir) as parameters only -- no new env vars.

## Testing Strategy (strict TDD)

| Layer | What | Approach |
|---|---|---|
| Unit | Guard: nested `node_modules`, `.env.local`, root `src`, allowlisted vs non-allowlisted nested manifest, single-file surface | `mkTree` fixtures |
| Unit | `redact` covers raw, base64, header forms | Pure strings |
| Unit | `replaceSiteTree` keeps `.nojekyll`, keeps CNAME only if artifact lacks it | Fixture trees |
| Integration | Clone/commit/push against a local bare repo; changed site keeps `.nojekyll`; identical artifact = no commit | `git init --bare` in tmp |
| Integration | Forced git failure with a fake token: error text has no token/base64; `tmpRoot` empty afterwards; guard failure creates no temp dir | Bad `remoteUrl`, isolated `tmpRoot` |
| Regression | Current repo surfaces minus `node_modules` pass the guard | Fixture mirroring real layout |

## Migration / Rollout

No migration. First `main` publish validates env auth on the runner. Check whether upstream `docs/.nojekyll` still exists before apply; if a prior publish deleted it, restore it manually once in `cogNNitive-web` (preservation cannot recreate what is gone).

## Open Questions

- [ ] Upstream `docs/.nojekyll` state (manual check, non-blocking).
