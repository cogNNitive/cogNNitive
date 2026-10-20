# Technical Design: Verify Pipeline & Session Workflow Speedup

## Technical Approach

Eliminate Windows process-spawning bottlenecks across `scripts/verify.js`, test suites, `.githooks/pre-push`, and `scripts/nn-session.mjs` without reducing test or gate coverage:
1. **Parallelize `verify.js`**: Promote 26 read-only child-process steps (`0c`, `4`, `4b`, `5`–`7d`, `12`–`15`) into the async worker pool (`parallel: true`), convert `docs-facts-drift` to a parallel child step backed by a single `git cat-file --batch` stream, raise the default worker cap, add `--only` filtering, and expand `SLOW_SUITES`.
2. **Eliminate test subprocess storms**: Build template git repositories once in `before()` and clone via `fs.cpSync` per test; export an in-process `runExportConsole(argv, options)` API from `scripts/export-console.mjs` and reuse read-only `JSDOM` instances across assertions.
3. **Streamline session & pre-push workflows**: Run `FRESHNESS_GUARDS` concurrently in `scripts/pre-push-check.js`, fast-path `wip:` checkpoint pushes on `session/*` branches, junction `node_modules` in `nn-session.mjs start` when lockfile SHA-256 hashes match the primary checkout, and codify tiered verification in maintainer skills.

## Architecture Decisions

### D1: Worker Pool Expansion, Parallel Guards & `--only` Filtering (`scripts/verify.js`)
- **Choice**: Mark all 26 read-only child-process guards (`test-nn-sources`, `test-vocabulary`, `vocabulary-doc`, `typecheck-scripts`, `check-licenses`, freshness guards `5`–`7d`, `samples-version`, `procedures-version`, `usage-procedure`, `docs-facts-drift`, and guards `12`–`15`) as `parallel: true`. Raise `resolveJobs()` default to `Math.min(8, Math.max(1, Math.floor(cpuCount * 0.75)))`. Add `--only=<substring>` / `--only <substring>` filtering on `step.id` and `step.desc`. Add 8 suites (>7s) to `SLOW_SUITES` (`scripts/check-licenses.test.mjs`, `scripts/generate-docs-facts.test.mjs`, `scripts/pre-push-check.test.js`, `scripts/skills-manager.test.js`, `scripts/sync-samples.test.mjs`, `scripts/verify.test.js`, `test/console-draft-Reconcile.test.mjs`, `test/console-golden-parity.test.mjs`).
- **Alternatives**: Keep guards serial after test suites; cap workers at 4.
- **Rationale**: All 26 guards are strictly read-only (`--check` or AST/regex scans) and safe to run concurrently. Raising the cap utilizes modern multi-core CPUs while preserving output ordering.

### D2: Single `git cat-file --batch` in `checkHandTypedFactsAtRef`
- **Choice**: Replace 74 sequential `git show <ref>:<path>` calls with one `git cat-file --batch` invocation fed with `<ref>:<path>\n` lines on stdin, parsing `<sha> <type> <size>\n<bytes>\n` records in memory.
- **Alternatives**: Spawn `git show` with `Promise.all`; read working-tree files directly.
- **Rationale**: Working-tree reads violate D5 (`build:docs` mutates files before `verify.js` in CI). A single `git cat-file --batch` process cuts ~75 Windows process spawns down to 2 (`ls-tree` + `cat-file`).

### D3: Template Repo Cloning (`fs.cpSync`) & Stubbed Install in Git-Heavy Suites
- **Choice**: Create baseline git repositories once in `before()` and copy them per test via `fs.cpSync(templateDir, testDir, { recursive: true })` in `batch-status.test.mjs`, `nn-session.test.mjs`, and `run-release.test.js`. In `nn-session.test.mjs`, pass `NN_SESSION_TEST_NPM_STUB` or test junction reuse instead of running two real `npm ci` installs per run, keeping one lightweight stubbed/junction verification.
- **Alternatives**: Run `git init`/`commit`/`tag`/`push` in every `beforeEach()`.
- **Rationale**: Copying a small `.git` tree via `fs.cpSync` takes <5ms vs. 500–1500ms of sequential `git.exe` spawns per test.

### D4: In-Process `runExportConsole(argv, options)` & Shared `JSDOM`
- **Choice**: Export `runExportConsole(argv, options)` from `scripts/export-console.mjs` that captures stdout/stderr, returns `{ code, stdout, stderr, result }`, and never calls `process.exit()`. Migrate `scripts/export-console.test.mjs`, `test/console-export.test.mjs`, `test/console-export-view.test.mjs`, and `test/console-sample-custom-view.test.mjs` to call `runExportConsole` in-process (keeping 2–3 real CLI smoke tests) and share read-only `JSDOM` instances per `describe` block where tests only inspect DOM state.
- **Alternatives**: Keep spawning `node scripts/export-console.mjs` per `it()` block.
- **Rationale**: Eliminates ~68 Node startup + module-parse cycles and redundant JSDOM parses.

### D5: Parallel Pre-Push Freshness Guards & `session/*` `wip:` Fast-Path
- **Choice**: In `scripts/pre-push-check.js`, run `FRESHNESS_GUARDS` concurrently via `execFile` + `Promise.all`. In `.githooks/pre-push` and `scripts/pre-push-check.js`, detect when `<remote_ref>` is `refs/heads/session/*` and `<local_sha>`'s commit subject starts with `wip:`; skip `npm run typecheck`, `build:dist`, and `FRESHNESS_GUARDS`, running only dirty-tree and scoped `eslint` checks (or exiting 0 in hook before heavy steps).
- **Alternatives**: Require `--no-verify` on `wip:` pushes.
- **Rationale**: Preserves hook discipline while making durable checkpoint pushes on `session/*` near-instant.

### D6: Lockfile-Verified `node_modules` Junctions in `nn-session.mjs start`
- **Choice**: For each dir in `INSTALL_DIRS` (`''` and `'skills/nn-sources'`), compare SHA-256 of `<root>/<rel>/package-lock.json` and `<target>/<rel>/package-lock.json`. When both exist, hashes match, `<root>/<rel>/node_modules` exists, and `--full-install` is not set, link `node_modules` via `fs.symlinkSync(src, dest, 'junction')` (and re-point `@cognnitive/*` workspace links to the worktree's own `iNNfo/packages/*` if needed, or fall back to `npm ci` when `--full-install` is passed). `removeNodeModulesLinks` on `stop` already safely unlinks junctions before worktree removal.
- **Alternatives**: Always run `npm ci` in every worktree (~90s).
- **Rationale**: Cuts worktree creation from ~90s to <2s when lockfiles are unchanged.

## Data Flow

```
verify.js CLI -> parseArgs (--fast, --only, --jobs) -> buildSteps(repoRoot, opts)
  -> runSteps(steps, { jobs: min(8, floor(cpus*0.75)) })
     ├─ Worker Pool (parallel: true): test suites + 26 read-only guards + docs-facts-drift (git cat-file --batch)
     └─ Serial Queue: SERIAL_SUITES + inline fs checks -> .verify-logs/<id>.log -> Summary
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/verify.js` | Modify | Parallelize 26 guards, batch `checkHandTypedFactsAtRef` via `git cat-file --batch`, update `resolveJobs()`, add `--only`, update `SLOW_SUITES`. |
| `package.json` | Modify | Add `"verify:fast": "node scripts/verify.js --fast"`. |
| `scripts/export-console.mjs` | Modify | Export `runExportConsole(argv, options)` programmatic runner. |
| `scripts/export-console.test.mjs` | Modify | Use `runExportConsole` in-process; keep 2–3 subprocess CLI smoke tests. |
| `test/console-export.test.mjs` | Modify | Use `runExportConsole` in-process and reuse read-only `JSDOM` instances. |
| `test/console-export-view.test.mjs` | Modify | Use `runExportConsole` in-process and reuse read-only `JSDOM` instances. |
| `test/console-sample-custom-view.test.mjs` | Modify | Use `runExportConsole` in-process. |
| `scripts/lib/batch-status.test.mjs` | Modify | Build template git fixture in `before()` and clone via `fs.cpSync`. |
| `scripts/nn-session.test.mjs` | Modify | Clone git fixture via `fs.cpSync`; test junction reuse and `--full-install`. |
| `scripts/release/run-release.test.js` | Modify | Build seed git repos in `before()` and clone via `fs.cpSync`. |
| `scripts/pre-push-check.js` | Modify | Run `FRESHNESS_GUARDS` in parallel via `Promise.all`; support `wip:` on `session/*` fast-path. |
| `.githooks/pre-push` | Modify | Fast-path `wip:` commits pushed to `refs/heads/session/*`. |
| `scripts/nn-session.mjs` | Modify | Reuse `node_modules` via `'junction'` when lockfile SHA-256 matches; add `--full-install`. |
| `scripts/check-integrity.js` | Modify | Forward `--fast` and `--only` flags to `scripts/verify.js`. |
| `.agents/skills/nn-dev-development/SKILL.md` | Modify | Prescribe `--only` / `--fast` inner-loop checks and document junction / `wip:` fast-path. |
| `.agents/skills/nn-dev-check-integrity/SKILL.md` | Modify | Document `--fast` / `--only` options and tiered gate usage. |

## Interfaces / Contracts

- **`scripts/verify.js`**:
  - `buildSteps(repoRoot, options?: { release?: boolean, fast?: boolean, only?: string })`
  - `runVerification(options?: { release?: boolean, fast?: boolean, verbose?: boolean, jobs?: number, only?: string }): Promise<boolean>`
  - CLI flags: `--fast`, `--only=<pattern>` / `--only <pattern>`, `--jobs=<N>`, `--verbose`, `--release`.
- **`scripts/export-console.mjs`**:
  - `runExportConsole(argv: string[], options?: { cwd?: string, env?: NodeJS.ProcessEnv, open?: boolean, launcher?: Function }): Promise<{ code: number, stdout: string, stderr: string }>`
- **`scripts/nn-session.mjs`**:
  - `nn-session.mjs start [--id <id>] [--no-install] [--full-install] [--root <path>]`

## Testing Strategy

- Run unit suites for modified modules: `node scripts/verify.js --only=verify`, `--only=nn-session`, `--only=batch-status`, `--only=run-release`, `--only=export-console`, `--only=pre-push-check`.
- Execute `node scripts/verify.js --fast` and full `node scripts/verify.js` to confirm 100% pass rate and wall-clock speedup.

## Migration / Rollout

No data migration required. Existing worktrees and hooks remain backward-compatible.

## Open Questions

None.
