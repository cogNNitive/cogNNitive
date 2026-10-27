# Delta for preflight-freshness-reporting

## ADDED Requirements

### Requirement: Preflight Checks Declared Dependencies Of Installed Blueprints

For each installed catalog bluepriNNt, `preflight-check.js` MUST evaluate its `depends_on`: the installed CLI version against the pin in the skill's `package.json`, required binaries on PATH, the Node version against the floor, and required env keys. A wrong CLI version, a missing binary or a Node version below the floor MUST be reported with the fix. A missing required env key MUST be reported as a warning only. Optional MCP absence MUST NOT be reported as a problem.

#### Scenario: Wrong CLI version
- GIVEN the skill's `package.json` pins `hyperframes` at P and version Q is installed
- WHEN `preflight-check.js` runs
- THEN it reports the mismatch and the command that installs P

#### Scenario: Missing env key warns only
- GIVEN a required env key is unset
- WHEN `preflight-check.js` runs
- THEN it prints a warning naming the key
- AND the warning does not by itself change `exitCode`

#### Scenario: Node below floor
- GIVEN the running Node is below the declared floor
- WHEN `preflight-check.js` runs
- THEN it reports the floor and the detected version

## MODIFIED Requirements

### Requirement: Uninstalled Optional Catalog Blueprints Are Ignored in Preflight

`skills/nn-preflight/scripts/preflight-check.js` MUST require only Core `bluepriNNts` for baseline installation readiness and MUST ignore optional vertical `bluepriNNts` governed by `catalog.json` when they are not installed locally. Installed optional catalog `bluepriNNts` and their embedded skills MUST be compared to the catalog `release_tag` and reported as current or outdated.
(Previously: installed optional catalog `bluepriNNts` MAY be reported for version/pin state.)

#### Scenario: Uninstalled optional catalog blueprint does not block or warn
- **GIVEN** an environment with all 7 Core `bluepriNNts` installed and optional catalog `bluepriNNts` absent from `~/.agents/bluepriNNts/`
- **WHEN** `preflight-check.js` executes
- **THEN** no missing-blueprint error, warning, or blocker is emitted for uninstalled optional catalog `bluepriNNts`
- **AND** `exitCode` remains `0`

#### Scenario: Installed catalog blueprint is drifted
- **GIVEN** `video-script` is installed and its state differs from the catalog `release_tag`
- **WHEN** `preflight-check.js` executes
- **THEN** `video-script` and its embedded skill are reported as outdated
