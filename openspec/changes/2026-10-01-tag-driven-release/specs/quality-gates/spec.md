# Delta for quality-gates

## ADDED Requirements

### Requirement: Verification is offline and deterministic in every mode

`node scripts/verify.js` MUST NOT require network access or GitHub API access, or the existence of any release tag, in any mode, including `--release`. Its result MUST depend only on the committed tree and local git. No step MAY resolve tags, SHAs, or remote content over the network. Reading local git (for example the non-blocking `freshness.js` tag baseline) is allowed. The success criterion is "no network or GitHub API access"; local git lookups do not violate it. Push-to-main and push-to-`dev` CI MUST NOT perform any GitHub API request or remote tag lookup for release state.

Offline mode MUST be enforced, not merely asserted: `verify.js` MUST set `NN_OFFLINE=1` for every child process, and the GitHub client (`apiRequest`, `fetchString`) MUST throw when `NN_OFFLINE=1` is set. `verify.js` MUST NOT call `gh auth token`.

#### Scenario: Verify passes with no network
- GIVEN a clean checkout and no network access
- WHEN `node scripts/verify.js` runs
- THEN it completes without attempting a network request

#### Scenario: Verify does not need release tags
- GIVEN a repository with no release tags
- WHEN `node scripts/verify.js --release` runs
- THEN no step fails because a tag is missing

#### Scenario: GitHub client throws when offline
- GIVEN `NN_OFFLINE=1`
- WHEN any code calls the GitHub client `apiRequest` or `fetchString`
- THEN it throws instead of issuing a request

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

### Requirement: MCP CDN bundle staging is independent of the editor build

The innfo-mcp CDN bundle MUST be staged by a dedicated script (`scripts/stage-mcp-bundle.mjs`) that copies the committed `bin/innfo-mcp.bundle.js` byte-for-byte, so CDN bytes equal the raw-pinned bytes. Staging MUST NOT be a `verify.js` step and MUST NOT be part of `scripts/build-docs.mjs`; the release workflow performs it, and the single-file (no code-splitting) guard moves with it. The `verify` CI job MUST NOT run the docs build; a separate `site` job builds the docs and uploads the pages artifact. Building the editor MUST NOT be required to stage the CDN bundle, and staging MUST NOT be required to build the editor.

#### Scenario: Bundle staged without the editor build
- GIVEN the editor build has not run
- WHEN the staging script runs
- THEN the CDN bundle is staged with bytes equal to the committed bundle

#### Scenario: Editor build does not stage the bundle
- GIVEN `scripts/build-docs.mjs` runs the editor build
- WHEN it completes
- THEN it did not perform the CDN bundle staging

## MODIFIED Requirements

### Requirement: Console release documentation and tag shape

`nn-dev-release` MUST name Console explicitly and reject a tag that cannot validate.

#### Scenario: Console is a release option
- GIVEN a maintainer asks for a Console release
- WHEN the release flow identifies the subsystem
- THEN `nn-dev-release` SHALL include a Console option covering the bundle, CDN check, and tag
- AND the manifest pin SHALL be described as produced by the release workflow, not edited by hand.

#### Scenario: Console stable tag shape is normative
- GIVEN a Console release for the stable channel
- WHEN a tag is proposed
- THEN the tag SHALL match the repository snapshot shape requiring `-v` before the semantic version, for example `innfo-console-v0.1.0`
- AND a non-`-v` stable tag SHALL stop the release flow.

### Requirement: Comprehensive template version synchronization and verification

`npm run sync:versions` MUST regenerate all generated artifacts invalidated by template version changes (including `iNNfo/specs/templates/catalog.json`), and `npm run check:versions` MUST verify the freshness of all generated artifacts (including `catalog.json`) against their source definitions. Neither command MUST generate or check a stable manifest or channel refs, because those are release outputs.

#### Scenario: Sync regenerates template catalog alongside version copies
- GIVEN a template version bump or template file modification
- WHEN `npm run sync:versions` is executed
- THEN it SHALL synchronize remaining code-coupled generated version copies (template versions, `samples.ts`, innfo-core version and dependency range)
- AND it SHALL regenerate `iNNfo/specs/templates/catalog.json` via `scripts/template-catalog.mjs`
- AND it SHALL NOT generate a stable manifest.

#### Scenario: Version freshness check detects stale template catalog
- GIVEN `iNNfo/specs/templates/catalog.json` is missing or out-of-sync with template definitions
- WHEN `npm run check:versions` is executed
- THEN it SHALL detect the catalog drift via `scripts/template-catalog.mjs --check`
- AND it SHALL exit with a non-zero status code.

#### Scenario: Version check passes when all artifacts are synchronized
- GIVEN remaining generated version copies and the template catalog are up-to-date
- WHEN `npm run check:versions` is executed
- THEN all verification steps SHALL pass with exit code 0
- AND no step SHALL perform a network request.
