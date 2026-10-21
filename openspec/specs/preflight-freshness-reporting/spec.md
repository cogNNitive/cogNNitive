# Spec: preflight-freshness-reporting

## Purpose

This spec defines the informational output line in
`skills/nn-preflight/scripts/preflight-check.js` reporting pin identity, pin
age, and whether `main` has diverged. The data is sourced from one additional
guarded fetch of the CI-published `docs/use/freshness.json`. It does not add a
warning state, does not add a severity level or staleness threshold, and MUST
NEVER change the script's exit code under any reachability condition.
## Requirements
### Requirement: One informational freshness line is printed when data is available and the pin matches

`preflight-check.js` MUST make one additional guarded fetch (reusing the
existing `fetchWithTimeout` helper and its budget, issued only after the
manifest fetch already succeeded) of the published freshness JSON, and MUST
print exactly one informational line reporting which tag the install is
pinned to, how old that pin is, and whether `main` has later commits
touching that subsystem, when the fetched freshness data contains those
fields for a subsystem **and** that subsystem's `pinnedTag` in the freshness
data matches the tag the manifest just reported for it.

#### Scenario: Freshness data is fetched and its pinned tag matches the manifest

- **GIVEN** a successfully fetched freshness JSON whose entry for a
  subsystem includes the pin-age and drift fields
- **AND** that entry's `pinnedTag` equals the tag the manifest fetch already
  reported for that subsystem
- **WHEN** `preflight-check.js` runs
- **THEN** it SHALL print one line reporting the pinned tag, its age, and
  the count of later commits on `main` touching that subsystem
- **AND** it SHALL label the line as informational / not a blocker.

#### Scenario: Freshness data is fetched but its pinned tag does not match the manifest (stale freshness file)

- **GIVEN** a successfully fetched freshness JSON whose entry for a
  subsystem names a `pinnedTag` different from the tag the manifest fetch
  just reported for that subsystem (for example, a new tag was cut and
  repinned but the freshness file has not caught up yet)
- **WHEN** `preflight-check.js` runs
- **THEN** it SHALL NOT print a freshness line for that subsystem
- **AND** it SHALL NOT print any warning or notice about the mismatch —
  the line is silently dropped, so a stale freshness file can only
  under-report or fall silent, never report a wrong or alarming number.

#### Scenario: The line reports facts, not a verdict

- **GIVEN** the printed freshness line
- **WHEN** its content is inspected
- **THEN** it SHALL contain the pin identity, pin age, and drift count as
  reported by the fetched freshness data
- **AND** it SHALL NOT render a computed "stale" / "fresh" judgement, a
  severity label, or any threshold-based verdict — the receiving human
  decides what the number means, the tool only states it.

#### Scenario: Zero drift still prints the line

- **GIVEN** freshness data is available and its pinned tag matches the
  manifest
- **AND** the subsystem reports `commitsSincePin: 0`
- **WHEN** the report is rendered
- **THEN** the freshness line SHALL still be printed, reporting the pin
  identity and pin age
- **AND** printing SHALL NOT be conditional on drift being non-zero, because
  "pinned to `skills-v2.0.0`, 6 days old" is useful on its own and an
  unconditional print is one branch fewer than a gated one.

### Requirement: The freshness signal MUST NEVER change `exitCode`

`preflight-check.js`'s `exitCode` MUST be identical with and without the
freshness signal, in every reachability state (data present, data absent,
manifest reachable, manifest unreachable). No configuration of this feature
introduces a new blocking condition.

#### Scenario: Freshness data present, exit code unaffected

- **GIVEN** a run where freshness fields are present and report significant
  drift (for example, more than 5 commits since pin)
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be exactly what it would have been had the
  freshness fields been absent
- **AND** no drift magnitude, however large, SHALL cause a non-zero exit
  code on its own.

#### Scenario: Freshness data absent, exit code unaffected

- **GIVEN** a run where the freshness fetch returns no data for a subsystem
  (fields absent, JSON malformed, or the fetch itself failed)
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be unaffected by their absence.

#### Scenario: Manifest unreachable, exit code unaffected

- **GIVEN** a run where the manifest fetch itself fails or times out (the
  freshness fetch is never attempted in this case, per
  `preflight-check.js:920-934`)
- **WHEN** `preflight-check.js` completes
- **THEN** `exitCode` SHALL be unaffected by the freshness feature
  specifically, consistent with the existing `manifest.reachable=false`
  degrade behavior which already does not fail the run on its own.

### Requirement: A failed, malformed, or field-incomplete freshness fetch is silently omitted, not warned about

For the freshness fetch specifically — because it is optional enrichment issued only after the manifest fetch already succeeded — any failure mode (request throws or times out, response is not valid JSON, a subsystem's fields are absent, or the older-cache/older-script case) MUST produce **silent omission**: no freshness line, no item, no summary key, and no separate warning or "freshness unknown" notice of any kind. This is stricter than the existing `manifest.reachable=false` / `templateCatalogOffline` notices, which are untouched by this change and continue to fire as before for their own conditions (`preflight-check.js:920-934`, `:892-900`).

#### Scenario: The freshness fetch itself fails or times out

- **GIVEN** the freshness JSON fetch throws, times out, or the response is
  not valid JSON
- **WHEN** `preflight-check.js` completes
- **THEN** no freshness line, item, or notice of any kind SHALL be printed
  for the affected subsystem(s)
- **AND** the rest of the report, including the untouched
  `manifest.reachable=false` behavior, SHALL be unaffected.

#### Scenario: Stale cached manifest or freshness response lacks the expected fields

- **GIVEN** a fetched manifest or freshness response that predates this
  feature and is missing the fields it depends on
- **WHEN** `preflight-check.js` runs against it
- **THEN** no freshness line and no warning about missing freshness data
  SHALL be printed
- **AND** the rest of the report SHALL be unaffected.

#### Scenario: An older installed `preflight-check.js` remains forward-compatible

- **GIVEN** a user running a `preflight-check.js` installed before this
  feature shipped, against a manifest and freshness data that now exist
  - **WHEN** that older script runs
- **THEN** it SHALL ignore the unrecognized data and behave exactly as it
  did before this change, printing no freshness line and raising no error.

### Requirement: Uninstalled Optional Catalog Blueprints Are Ignored in Preflight

`skills/nn-preflight/scripts/preflight-check.js` MUST require only Core `bluepriNNts` for baseline installation readiness and MUST ignore optional vertical `bluepriNNts` governed by `catalog.json` when they are not installed locally. Installed optional catalog `bluepriNNts` MAY be reported for version/pin state without blocking uninstalled verticals.

#### Scenario: Uninstalled optional catalog blueprint does not block or warn
- **GIVEN** an environment with all 7 Core `bluepriNNts` installed and optional catalog `bluepriNNts` absent from `~/.agents/bluepriNNts/`
- **WHEN** `preflight-check.js` executes
- **THEN** no missing-blueprint error, warning, or blocker is emitted for uninstalled optional catalog `bluepriNNts`
- **AND** `exitCode` remains `0`

### Requirement: nn-preflight resolves only the nn-mcp name

From PR 3, `skills/nn-preflight/scripts/preflight-check.js` MUST resolve the MCP unit in the fetched manifest by the name `nn-mcp`, the matching freshness subsystem by the key `nn-mcp`, and the installed bundle `~/.agents/mcp/nn-mcp.bundle.js`. It MUST NOT fall back to `innfo-mcp` for any of them. It MUST print at most one freshness line for the MCP unit. The freshness-line rules of this capability (matching `pinnedTag`, silent omission on any failure, `exitCode` unaffected) apply unchanged.

#### Scenario: nn-mcp manifest entry
- GIVEN a manifest with the single `nn-mcp` entry and a `freshness.json` with an `nn-mcp` key
- WHEN `preflight-check.js` runs
- THEN exactly one MCP freshness line is printed
- AND it reports the `nn-mcp` pinned tag

#### Scenario: Pinned tag mismatch is still silent
- GIVEN a freshness entry whose `pinnedTag` differs from the manifest's tag
- WHEN `preflight-check.js` runs
- THEN no freshness line is printed and no warning is emitted

#### Scenario: Legacy-only data is treated as absent
- GIVEN a manifest with only an `innfo-mcp` entry
- WHEN `preflight-check.js` runs
- THEN the MCP entry is treated as absent
- AND no freshness line is printed and `exitCode` is unchanged

#### Scenario: Installed bundle detected
- GIVEN `~/.agents/mcp/nn-mcp.bundle.js` exists
- WHEN `preflight-check.js` runs
- THEN the MCP install is reported as present

### Requirement: skills-manager and the config adapter migrate stale innfo-mcp state

`mcp-config-adapter` and `skills-manager` (`scripts/lib/skills-commands.js`) MUST register the server under `nn-mcp`. When the manifest carries `nn-mcp`, they MUST migrate a stale `innfo-mcp` state entry, installed bundle file and user-config key to `nn-mcp`, so that exactly one MCP server is registered. This is cleanup of user state, not a compatibility path. It MUST be idempotent and is kept permanently. Old copies of preflight and skills-manager are not supported.

#### Scenario: Fresh install registers nn-mcp
- GIVEN a user config with no MCP entry
- WHEN the adapter registers the server
- THEN the entry is named `nn-mcp` and its command is `nn-mcp`

#### Scenario: Stale state is migrated
- GIVEN a state with `mcp['innfo-mcp']`, the `innfo-mcp.bundle.js` file and an `innfo-mcp` config key
- WHEN skills-manager installs a manifest carrying `nn-mcp`
- THEN the state entry, bundle and config key are migrated to `nn-mcp`
- AND exactly one MCP entry named `nn-mcp` remains

#### Scenario: Migration is idempotent
- GIVEN a state already migrated
- WHEN skills-manager runs again
- THEN nothing changes

### Requirement: MCP server identity and tool prefix use nn-mcp

From PR 3 the MCP server MUST identify itself with the server name `nn-mcp`, and skill and documentation references to its tools MUST use the prefix `nn-mcp_` (for example `nn-mcp_validate_knowledge`), including `skills/nn-innfo/SKILL.md`, `nn-console` and `nn-preflight`. Tool names after the prefix (`get_template`, `validate_template`, and the others) MUST NOT change. Blueprint procedures that name the server in `tool:: [[innfo-mcp]]` or `## NN Tools: innfo-mcp` MUST be updated to `nn-mcp` only through a blueprint version bump (`template_version`) and a new `blueprints-v*` tag; published procedure files MUST NOT be edited in place. Only the `procedures` and `visual-catalog` blueprints are bumped. The `workspace` blueprint is listed in `frozen_blueprints` of `manifest/source.yaml`, so its procedure files that still name `innfo-mcp` are not edited and are recorded on the frozen-history allowlist of the retired-reference guard. The `nn-innfo` skill name, the iNNfo term and the `docs/innfo/` URL base are not changed.

#### Scenario: Server announces the new name
- GIVEN the MCP server started from the `nn-mcp` bin
- WHEN a client reads the `initialize` response
- THEN `serverInfo.name` is `nn-mcp`

#### Scenario: Skill prose uses the new prefix
- GIVEN `skills/nn-innfo/SKILL.md` after PR 3
- WHEN it is searched for `innfo-mcp_`
- THEN there are zero matches
- AND the skill name `nn-innfo` is unchanged

#### Scenario: Blueprint procedure rename requires a bump
- GIVEN a published procedure containing `tool:: [[innfo-mcp]]`
- WHEN it is changed to `nn-mcp`
- THEN the blueprint `template_version` is bumped
- AND a new `blueprints-v*` tag is cut and the release pin is updated

#### Scenario: Frozen workspace procedures are allowlisted
- GIVEN the `workspace` blueprint procedure files that name `innfo-mcp`
- WHEN the retired-reference guard runs
- THEN they are accepted through the frozen-history allowlist and are not edited

#### Scenario: Tool names unchanged
- GIVEN the tool list of the server
- WHEN compared with the pre-change list after removing the server prefix
- THEN the names are identical

