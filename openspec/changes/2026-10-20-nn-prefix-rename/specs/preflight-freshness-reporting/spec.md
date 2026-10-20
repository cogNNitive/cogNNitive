# Delta Spec: preflight-freshness-reporting

Scope guard: only the MCP and console distribution names handled by `nn-preflight` change. The `nn-innfo` skill, the iNNfo term and the `docs/innfo/` URL base are out of scope.

## ADDED Requirements

### Requirement: nn-preflight resolves either MCP name in the manifest and in freshness data

From slice S4a (which MUST be released as a `skills-v*` release before the S5 cutover), `skills/nn-preflight/scripts/preflight-check.js` MUST resolve the MCP unit in the fetched manifest by the name `nn-mcp`, and while the transition window is open MUST fall back to the legacy name `innfo-mcp` when no `nn-mcp` entry exists. It MUST resolve the matching freshness subsystem by the key `nn-mcp`, falling back to `innfo-mcp` under the same condition. When both names are present it MUST use the `nn-mcp` entry and MUST print at most one freshness line for the MCP unit, never one per name. The freshness-line rules of this capability (matching `pinnedTag`, silent omission on any failure, `exitCode` unaffected) apply unchanged to whichever name was resolved.

#### Scenario: nn-mcp manifest entry with dual-key freshness data
- GIVEN a manifest with the single `nn-mcp` entry and a freshness JSON that carries both `nn-mcp` and `innfo-mcp` keys
- WHEN `preflight-check.js` runs
- THEN exactly one MCP freshness line is printed
- AND it reports the `nn-mcp` pinned tag

#### Scenario: Legacy-only manifest during the window
- GIVEN a manifest that carries only `innfo-mcp` (published before the first `nn-*` release)
- WHEN `preflight-check.js` runs
- THEN the MCP entry and its freshness line are resolved through the legacy name
- AND `exitCode` is unchanged

#### Scenario: Pinned tag mismatch is still silent
- GIVEN a freshness entry for the resolved name whose `pinnedTag` differs from the manifest's tag
- WHEN `preflight-check.js` runs
- THEN no freshness line is printed and no warning is emitted

#### Scenario: Neither name present
- GIVEN a manifest with neither `nn-mcp` nor `innfo-mcp`
- WHEN `preflight-check.js` runs
- THEN it behaves as it did before for an absent MCP entry
- AND no freshness line is printed

### Requirement: nn-preflight and the config adapter reconcile the installed MCP name

`nn-preflight` MUST look for the installed bundle `~/.agents/mcp/nn-mcp.bundle.js` and, while the transition window is open, also accept `~/.agents/mcp/innfo-mcp.bundle.js` as an installed legacy copy. `mcp-config-adapter` and `skills-manager` MUST register the server under `nn-mcp` and MUST remove a stale `innfo-mcp` entry from user configs when registering it. A user config that still names `innfo-mcp` MUST keep working until the user's tooling is updated: the legacy bundle and bin MUST remain available through S5. The removal of a stale `innfo-mcp` config entry MUST remain after S6, because it is a cleanup of user state and not a compatibility path.

#### Scenario: Fresh install registers nn-mcp
- GIVEN a user config with no MCP entry
- WHEN the adapter registers the server
- THEN the entry is named `nn-mcp` and its command is `nn-mcp`

#### Scenario: Stale legacy entry is replaced
- GIVEN a user config containing an `innfo-mcp` entry
- WHEN the adapter registers `nn-mcp`
- THEN the `innfo-mcp` entry is removed
- AND exactly one MCP entry named `nn-mcp` remains

#### Scenario: Legacy installed bundle detected during the window
- GIVEN only `~/.agents/mcp/innfo-mcp.bundle.js` exists and the window is open
- WHEN `preflight-check.js` runs
- THEN the MCP install is reported as present
- AND `exitCode` is unchanged

### Requirement: A pre-change preflight copy keeps working against the S5 manifest

An installed `preflight-check.js` that predates this change (it hardcodes `m.name === 'innfo-mcp'`) MUST NOT raise an error against the manifest and `freshness.json` published from S5 until S6, and MUST keep its skills and console freshness lines. Because the S5 manifest carries a single `nn-mcp` entry, the old copy silently omits only the informational MCP line (silent omission on any failure, ADR-005). This is verified by running a frozen pre-change snapshot of the script (`test/fixtures/legacy-nn-preflight/`, taken at the S0 commit) in an automated test with an empty home directory (`USERPROFILE` and `HOME` unset or pointing to an empty directory), so the result does not depend on the maintainer's machine.

#### Scenario: Old script, S5 data
- GIVEN the frozen pre-change copy of `preflight-check.js` and the S5-shaped manifest and `freshness.json`
- WHEN the copy runs with an empty home directory
- THEN it prints the skills and console freshness lines and no MCP freshness line
- AND its `exitCode` equals the value it returned before this change

#### Scenario: Old script after the sunset
- GIVEN the same copy and data published after S6 (no `innfo-*` freshness keys)
- WHEN the copy runs
- THEN the missing lines are silently omitted as for any absent subsystem
- AND `exitCode` is not changed by the omission

### Requirement: MCP server identity and tool prefix use nn-mcp

From slice S4 the MCP server MUST identify itself with the server name `nn-mcp`, and skill and documentation references to its tools MUST use the prefix `nn-mcp_` (for example `nn-mcp_validate_knowledge`), including `skills/nn-innfo/SKILL.md`, `nn-console` and `nn-preflight`. Tool names after the prefix (`get_template`, `validate_template`, and the others) MUST NOT change. Blueprint procedures that name the server in `tool:: [[innfo-mcp]]` or `## NN Tools: innfo-mcp` MUST be updated to `nn-mcp` only through a blueprint version bump (`template_version`) and a new `blueprints-v*` tag; published procedure files MUST NOT be edited in place. Only the `procedures` and `visual-catalog` blueprints are bumped. The `workspace` blueprint is listed in `frozen_blueprints` of `manifest/source.yaml`, so its procedure files that still name `innfo-mcp` are not edited and are recorded on the frozen-history allowlist of the retired-reference guard. The `nn-innfo` skill name, the iNNfo term and the `docs/innfo/` URL base are not changed.

#### Scenario: Server announces the new name
- GIVEN the MCP server started from the `nn-mcp` bin
- WHEN a client reads the `initialize` response
- THEN `serverInfo.name` is `nn-mcp`

#### Scenario: Skill prose uses the new prefix
- GIVEN `skills/nn-innfo/SKILL.md` after S4
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

### Requirement: Legacy name fallback is removed at the sunset

When slice S6 lands, `preflight-check.js` MUST stop resolving `innfo-mcp` in manifest entries, freshness keys and installed bundle paths. Only `nn-mcp` MUST be resolved.

#### Scenario: Legacy-only data after S6
- GIVEN the post-S6 `preflight-check.js` and a manifest with only `innfo-mcp`
- WHEN it runs
- THEN the MCP entry is treated as absent
- AND no freshness line is printed
