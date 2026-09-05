# Spec: Monorepo Release Integrity & Parity Guards

## Capability: elease-parity-guards

### Requirement: Local Workspace Parity Guard
The workspace MUST include a deterministic parity validation script (scripts/manifest/check-parity.js) that validates local files against manifest/source.yaml.

#### Scenario: All local versions match manifest
- **GIVEN** manifest/source.yaml declares skills, templates, and MCP with specific versions
- **WHEN** 
ode scripts/manifest/check-parity.js is executed
- **THEN** it verifies each SKILL.md frontmatter version matches skill.version
- **AND** it verifies each template file exists and matches 	emplate.version
- **AND** it verifies innfo-mcp bundle exists and packages/innfo-mcp/package.json version matches mcp.version
- **AND** the script exits with code 0.

#### Scenario: Version drift detected
- **GIVEN** a local SKILL.md or template or package.json has a version bump not reflected in manifest/source.yaml
- **WHEN** 
ode scripts/manifest/check-parity.js is executed
- **THEN** it reports an explicit version mismatch error identifying the file and both version numbers
- **AND** the script exits with code 1.

### Requirement: Remote MCP Asset Validation
alidateMcp in scripts/manifest/lib/manifest-rules.js MUST verify that the declared MCP asset path exists at the pinned commit on GitHub.

#### Scenario: MCP bundle missing at commit
- **GIVEN** a manifest entry for MCP where path does not exist in the repository at commit
- **WHEN** alidateManifest is executed
- **THEN** it reports a violation that the MCP path was not found at that commit.

### Requirement: Monorepo Developer Skill
.agents/skills/nn-dev-release/SKILL.md MUST operate exclusively on the monorepo root cogNNitive/cogNNitive without referencing separate sub-repositories.
