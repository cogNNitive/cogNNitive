# quality-gates Specification

## Purpose

Deterministic verification covers the existing root manifest suites, tracked-text
encoding validity, local pre-push CI parity (coverage and spec URLs), git-aware
repository scans, offline and deterministic verification in every mode, quiet buffered
reporting, independent CDN bundle staging, Console release documentation, and template
version synchronization without network.
## Requirements
### Requirement: Manifest suites in deterministic verification

`scripts/verify.js` MUST dynamically discover and execute all conforming root test suites matching `*.test.js` and `*.test.mjs` (excluding `node_modules`), along with any explicitly registered non-conforming test runners, before reporting deterministic verification as successful. The verification MUST run the full roster and report the complete set of failures before exiting non-zero; it SHALL NOT stop at the first failing suite.

#### Scenario: All manifest and script test suites run via dynamic discovery

- **GIVEN** `node scripts/verify.js` is invoked
- **WHEN** deterministic verification performs test suite discovery across root script and skill directories
- **THEN** it SHALL dynamically discover and execute all conforming files matching `*.test.js` and `*.test.mjs` (including root manifest test suites and `scripts/lib/shared-libs.test.js`) while excluding `node_modules`
- **AND** it SHALL execute explicitly registered non-conforming suites (`skills/nn-trannsform/test/run.js`, `iNNfo/specs/scripts/test-vocabulary.js`).

#### Scenario: Existing manifest suites are not replaced

- **GIVEN** the discovered test suites
- **WHEN** they pass
- **THEN** the implementation SHALL NOT duplicate their assertions in `scripts/verify.js`.

#### Scenario: Every failure is reported before exit

- **GIVEN** `node scripts/verify.js` is invoked and more than one discovered suite fails
- **WHEN** verification completes the roster
- **THEN** it SHALL report every failing suite in a single run
- **AND** it SHALL exit non-zero only after the full roster has executed.

### Requirement: Tracked-text encoding guard

The deterministic checks MUST fail when a tracked text file is known-invalid.

#### Scenario: Replacement character fails fast

- **GIVEN** a tracked text file containing `U+FFFD` or bytes that cannot be
  decoded as UTF-8
- **WHEN** the encoding guard runs
- **THEN** verification SHALL fail and name the file and reason.

#### Scenario: Binary and fixture behavior is explicit

- **GIVEN** binary files, generated bundles, or explicitly allowlisted fixtures
- **WHEN** the guard evaluates them
- **THEN** it SHALL either skip the category by documented rule or require a
  reviewer note for an explicit exception.

### Requirement: Coverage and spec URLs in the local pre-push mirror

The local pre-push CI mirror MUST preserve the two checks that previously
surfaced only in CI. (Previously: Group 5 also ran the `innfo-editor` test suite, which is frozen with S5-freeze and no longer part of any gate.)

#### Scenario: Coverage ratchet is visible locally

- **GIVEN** `node scripts/check-integrity.js --pre-push`
- **WHEN** Group 5 executes
- **THEN** it SHALL run:
  - `npm --prefix iNNfo/packages/innfo-core test`
  - `npm --prefix iNNfo/packages/innfo-mcp run test:coverage`
- **AND** a coverage-threshold failure SHALL fail the gate.

#### Scenario: Spec-URL resolution is visible locally

- **GIVEN** the same pre-push gate
- **WHEN** Group 5 executes
- **THEN** it SHALL run:
  - `npm --prefix iNNfo run check:spec-urls`
- **AND** a URL or legacy-reference failure SHALL fail the gate.

#### Scenario: Residual CI nonequivalence is documented

- **GIVEN** the pre-push implementation
- **WHEN** a CI-only behavior remains intentionally unmirrored
- **THEN** `scripts/check-integrity.js` or its Group 5 documentation SHALL name
  the behavior and reason.

### Requirement: Git-aware repository scans

Repository integrity scans MUST distinguish project files from gitignored local
artifacts when repository metadata is available.

#### Scenario: Ignored caches are excluded

- **GIVEN** a git checkout containing gitignored local artifacts
- **WHEN** `check-spec-version.mjs` collects repository files
- **THEN** tracked files and nonignored untracked files SHALL be scanned
- **AND** gitignored files SHALL be excluded.

#### Scenario: No git metadata

- **GIVEN** git metadata is unavailable
- **WHEN** the scan runs
- **THEN** it SHALL preserve the previous filesystem behavior rather than fail.

#### Scenario: Allowlist categories remain explicit

- **GIVEN** archive, dist, generated, or fixture exclusions
- **WHEN** scanning
- **THEN** existing explicit exclusions SHALL remain in force and SHALL NOT be
  broadened implicitly by git filtering.

### Requirement: Shared temporary-cleanup helper

Temporary-directory cleanup in `innfo-mcp` tests MUST use one shared resilient
helper.

#### Scenario: Transient Windows cleanup failures retry

- **GIVEN** `EBUSY`, `EPERM`, or `ENOTEMPTY` during temporary cleanup
- **WHEN** the shared helper executes
- **THEN** it SHALL retry briefly with a bounded delay.

#### Scenario: Nontransient failures still fail

- **GIVEN** any other filesystem error
- **WHEN** cleanup executes
- **THEN** it SHALL throw without masking the original error.

#### Scenario: No duplicated cleanup logic

- **GIVEN** `check-workspace.spec.ts` and `resolver-node.spec.ts`
- **WHEN** temporary cleanup runs
- **THEN** both SHALL import the shared helper rather than implementing local
  retry loops.

### Requirement: Console release documentation and tag shape

`nn-dev-release` MUST name Console explicitly and reject a tag that cannot
validate.

#### Scenario: Console is a release option

- **GIVEN** a maintainer asks for a Console release
- **WHEN** the release flow identifies the subsystem
- **THEN** `nn-dev-release` SHALL include a Console option covering the bundle, CDN check, and tag
- **AND** the manifest pin SHALL be described as produced by the release workflow, not edited by hand.

#### Scenario: Console stable tag shape is normative

- **GIVEN** a Console release for the stable channel
- **WHEN** a tag is proposed
- **THEN** the tag SHALL match the repository snapshot shape requiring `-v`
  before the semantic version, for example `innfo-console-v0.1.0`.
- **AND** a non-`-v` stable tag SHALL stop the release flow.

### Requirement: Comprehensive template version synchronization and verification

`npm run sync:versions` MUST regenerate all generated artifacts invalidated by template version changes (including `iNNfo/specs/bluepriNNts/catalog.json`), and `npm run check:versions` MUST verify the freshness of all generated artifacts (including `catalog.json`) against their source definitions. Neither command MUST generate or check a stable manifest or channel refs, because those are release outputs.

#### Scenario: Sync regenerates template catalog alongside version copies

- **GIVEN** a template version bump or template file modification
- **WHEN** `npm run sync:versions` is executed
- **THEN** it SHALL synchronize remaining code-coupled generated version copies (template versions, `samples.ts`, innfo-core version and dependency range)
- **AND** it SHALL regenerate `iNNfo/specs/bluepriNNts/catalog.json` via `scripts/blueprint-catalog.mjs`
- **AND** it SHALL NOT generate a stable manifest.

#### Scenario: Version freshness check detects stale template catalog

- **GIVEN** `iNNfo/specs/bluepriNNts/catalog.json` is missing or out-of-sync with template definitions
- **WHEN** `npm run check:versions` is executed
- **THEN** it SHALL detect the catalog drift via `scripts/blueprint-catalog.mjs --check`
- **AND** it SHALL exit with a non-zero status code.

#### Scenario: Version check passes when all artifacts are synchronized

- **GIVEN** remaining generated version copies and the template catalog are up-to-date
- **WHEN** `npm run check:versions` is executed
- **THEN** all verification steps SHALL pass with exit code 0
- **AND** no step SHALL perform a network request.

### Requirement: Verification is offline and deterministic in every mode

`node scripts/verify.js` MUST NOT require network access or GitHub API access, or the existence of any release tag, in any mode, including `--release`. Its result MUST depend only on the committed tree and local git. No step MAY resolve tags, SHAs, or remote content over the network. Reading local git (for example the non-blocking `freshness.js` tag baseline) is allowed. The success criterion is "no network or GitHub API access"; local git lookups do not violate it. Push-to-main and push-to-`dev` CI MUST NOT perform any GitHub API request or remote tag lookup for release state.

Offline mode MUST be enforced, not merely asserted: `verify.js` MUST set `NN_OFFLINE=1` for every child process and MUST preload a fail-closed guard (`scripts/lib/offline-guard.js`, via `NODE_OPTIONS=--require`) that refuses every non-loopback outbound connection at the `net`/`tls`/`dns`/`fetch` level before any socket I/O, so no verify child (including suites that bypass or stub the GitHub client) can reach the network. Loopback (`localhost`, `127.0.0.0/8`, `::1`) MUST stay allowed. Production code (the GitHub client) MUST NOT carry offline or test-detection logic of its own. `verify.js` MUST NOT call `gh auth token`.

#### Scenario: Verify passes with no network
- GIVEN a clean checkout and no network access
- WHEN `node scripts/verify.js` runs
- THEN it completes without attempting a network request

#### Scenario: Verify does not need release tags
- GIVEN a repository with no release tags
- WHEN `node scripts/verify.js --release` runs
- THEN no step fails because a tag is missing

#### Scenario: The preload refuses non-loopback network for every verify child
- GIVEN `NN_OFFLINE=1` and the offline guard preloaded
- WHEN any verify child process attempts a non-loopback connection (raw `net`/`tls`/`dns`, `http(s)`, `fetch`, or via the GitHub client)
- THEN the attempt fails with `ENN_OFFLINE` before any socket I/O
- AND loopback connections still succeed

#### Scenario: Local git lookups are allowed
- GIVEN the non-blocking `freshness.js` reads the newest local `<key>-v*` tag
- WHEN `verify.js` or push CI runs
- THEN this is permitted because it uses no network or GitHub API access

#### Scenario: Push CI makes no release-state lookups
- GIVEN a push to `main`
- WHEN CI jobs run
- THEN no job calls the GitHub API or performs a remote tag lookup to determine release state
- AND `publish-web` no longer depends on a networked manifest check

### Requirement: Quiet buffered reporter

`verify.js` MUST write each step's complete output to a per-step log file `.verify-logs/<id>.log` (gitignored), by connecting the child's stdout and stderr directly to the file descriptor so no `maxBuffer` limit applies, and MUST NOT stream passing steps' output to the console. It MUST print one line per step (`✔ desc (duration)` or `✖ desc → log path`) and, for a failing step, the last 60 lines of its log. A `--verbose` flag MUST restore full streaming (inherited) output. `verify.js` MUST run every step and print a summary, exiting non-zero if any step failed, rather than stopping at the first failure. In CI the tail MUST be wrapped in a log group and `.verify-logs/` MUST be uploaded as an artifact when the run fails.

#### Scenario: Passing suite is quiet
- GIVEN a suite that passes and prints 5 MB of output
- WHEN `verify.js` runs
- THEN the console shows only a one-line result for that suite
- AND the full output is in its log file

#### Scenario: Failing suite shows the tail
- GIVEN a suite that fails
- WHEN `verify.js` completes
- THEN the console shows the last 60 lines of that suite's log and the path under `.verify-logs/`
- AND all other failing suites are reported in the same run

#### Scenario: Verbose restores full output
- GIVEN `node scripts/verify.js --verbose`
- WHEN suites run
- THEN their output is shown in full

#### Scenario: Large output does not crash the runner
- GIVEN a suite whose output exceeds 1 MB
- WHEN it runs under `verify.js`
- THEN the run neither fails with a buffer-overflow error nor loses the suite's exit status

### Requirement: MCP CDN bundle staging is independent of the docs build

The innfo-mcp CDN bundle MUST be staged by a dedicated script (`scripts/stage-mcp-bundle.mjs`) that copies the committed `bin/innfo-mcp.bundle.js` byte-for-byte, so CDN bytes equal the raw-pinned bytes. Staging MUST NOT be a `verify.js` step and MUST NOT be part of `scripts/build-docs.mjs`; the release workflow performs it, and the single-file (no code-splitting) guard moves with it. The `verify` CI job MUST NOT run the docs build; a separate `site` job builds the docs and uploads the pages artifact. Building the docs MUST NOT be required to stage the CDN bundle, and staging MUST NOT be required to build the docs.

#### Scenario: Bundle staged without the docs build
- GIVEN the docs build has not run
- WHEN the staging script runs
- THEN the CDN bundle is staged with bytes equal to the committed bundle

#### Scenario: Docs build does not stage the bundle
- GIVEN `scripts/build-docs.mjs` runs
- WHEN it completes
- THEN it did not perform the CDN bundle staging

### Requirement: A frozen app is outside every gate

An app that is frozen (source kept in place, no longer maintained) MUST NOT be an npm workspace member and MUST NOT be built, typechecked, linted, tested or version-synced by any gate: root `package.json` scripts, the pre-push hook, CI jobs, `scripts/build-docs.mjs`, `scripts/sync-versions.mjs`, `scripts/check-integrity.js`, `scripts/verify.js` suite discovery and the repo-wide source guards. A frozen app MUST carry a `FROZEN.md` explaining the state and the thaw steps. Dependencies that gated suites import MUST be declared by a gated package, never only by the frozen app.

A frozen app that is hosted MUST be published from a committed static build (`docs/innfo/app/`) so that the full-replace Pages publish keeps serving it.

#### Scenario: Gated surfaces never reference the frozen editor
- GIVEN the frozen `iNNfo/apps/innfo-editor`
- WHEN `test/no-editor-references.test.mjs` scans the root workspaces, CI workflows, the pre-push hook, build scripts and `verify.js`
- THEN none of them references `innfo-editor` or builds `iNNfo/apps`

#### Scenario: Gated suites do not depend on the frozen app for test environments
- GIVEN a gated test imports `jsdom`
- WHEN the editor workspace is absent
- THEN the package resolves from root `devDependencies`

#### Scenario: The hosted app survives a Pages publish
- GIVEN the site is built without building the editor
- WHEN `docs/innfo/app/` is staged into the Pages artifact
- THEN `index.html` and `assets/` from the committed snapshot are present and `FROZEN.md` exists next to the editor source

