# Delta Specification: innfo-mcp

## ADDED Requirements

### Requirement: Model ID Normalization

The system MUST normalize model IDs during resolution using a `normalizeId()` helper that strips trailing `_NN`, `_NN.md`, or `.md` suffixes. Model lookup MUST resolve to the canonical model file path without appending duplicate `_NN` or `.md` suffixes.

#### Scenario: Model ID with trailing _NN suffix resolved

- GIVEN a model ID input containing a trailing `_NN` suffix (e.g., `defiNNe_V_1-0_NN`)
- WHEN model lookup is executed in MCP tool handlers
- THEN `normalizeId()` MUST strip the trailing `_NN`
- AND the resolver MUST search for `defiNNe_V_1-0_NN.md` without duplicating `_NN`

#### Scenario: Model ID with file extension resolved

- GIVEN a model ID input ending with `.md` or `_NN.md`
- WHEN model lookup is executed in MCP tool handlers
- THEN `normalizeId()` MUST normalize the identifier to its canonical base ID
- AND the resolver MUST locate the correct file on disk

### Requirement: Level 2 Template Validation Tool

The MCP server MUST expose a `validate_template` tool for level-2 specialization template validation. The tool MUST auto-detect level-2 templates by inspecting frontmatter metadata (`level === 2`) and validate them against level-1 spec definitions.

#### Scenario: Valid Level 2 template validated via tool

- GIVEN a level-2 template spec with frontmatter declaring `level: 2`
- WHEN `validate_template` is invoked for the template
- THEN the MCP server MUST validate the template against its parent level-1 spec
- AND return valid status with no structural errors

#### Scenario: Level 2 template auto-detection from frontmatter

- GIVEN a spec document passed to template validation tools
- WHEN the frontmatter metadata contains `level === 2`
- THEN the system MUST process the document as a level-2 specialization template
