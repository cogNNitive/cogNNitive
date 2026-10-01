# Specification: Canonical Layout, Gate Interceptor & Migration

## MODIFIED Requirements

### Requirement: Diagnostic MCP Tool Access on Mixed / Legacy Domains
The `innfo-mcp` server MUST allow diagnostic and introspection tools (`check_domain`, `validate_knowledge_url`, `get_spec`, `list_blueprints`) to execute on domains in `mixed` or `legacy` layout, returning full diagnostics instead of an execution-blocking error. Mutating tools (`apply_change`, `init_knowledge`, `hydrate_blueprint`, `sync_domain_manifest`) SHALL remain gated until layout migration is executed.

#### Scenario: Running check_domain on a mixed domain
- GIVEN a domain directory with `mixed` layout (e.g. holding legacy folders alongside canonical structure)
- WHEN `check_domain` is called via MCP
- THEN the tool MUST return the domain diagnostic report
- AND MUST NOT return a fatal legacy layout error result.

### Requirement: Complete Migration of Legacy Specs and Templates
`nn-upgrade`'s domain migration script (`migrate-domain.js`) MUST migrate legacy `specs/templates/` folders to `specs/bluepriNNts/`, ensuring that a completed migration does not leave the workspace in a `mixed` layout state.

#### Scenario: Migrating domain containing specs/templates
- GIVEN a domain with `specs/templates/` present
- WHEN `migrate-domain.js` executes with `--apply`
- THEN `specs/templates/` MUST be migrated to `specs/bluepriNNts/`
- AND the post-migration layout check MUST report `current`.
