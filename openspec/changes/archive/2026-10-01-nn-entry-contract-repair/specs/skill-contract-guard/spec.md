# Spec Delta: Skill Contract Guard

## ADDED Requirements

### Requirement: Skill MCP Contract Verification
The system MUST provide an automated contract test (`scripts/skill-mcp-contract.test.mjs`) that parses all distributed skill files under `skills/**/SKILL.md` and validates that:
1. Every cited MCP tool name matching `innfo-mcp_<tool>` or declared in tool tables corresponds exactly to a registered tool in `iNNfo/packages/innfo-mcp/src/server.ts`.
2. Every cited `node <path>` script invocation references a file that exists on disk.
3. The catalog in `skills/nn-start/SKILL.md` matches the distributed skills in `manifest/source.yaml`.

#### Scenario: Fake MCP tool causes test failure
- GIVEN a skill citing `list_template_procedures`
- WHEN `skill-mcp-contract.test.mjs` runs
- THEN the test fails with a descriptive error indicating the tool does not exist in `server.ts`.

#### Scenario: Non-existent node script causes test failure
- GIVEN a skill citing `node scripts/build-registry.js` where the file does not exist
- WHEN `skill-mcp-contract.test.mjs` runs
- THEN the test fails with a missing script error.
