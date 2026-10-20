# Delta Spec: preflight-freshness-reporting

Scope guard: only the MCP and console distribution names handled by `nn-preflight` change. The `nn-innfo` skill, the iNNfo term and the `docs/innfo/` URL base are out of scope.

## ADDED Requirements

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
