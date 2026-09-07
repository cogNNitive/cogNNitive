# Delta for Template Version Pruning & Safety Backups

## Purpose

Document the formal retirement of the `template-version-pruning` capability. The adoption of canonical unversioned template source files and immutable tag-hydrated local package directories (`specs/templates/<name>/<version>/`) supersedes reachability analysis and orphaned spec pruning.

## RETIRED Requirements

### Requirement: Workspace Spec Reference Reachability Analysis (Retired)

Reachability analysis across workspace models and orphaned candidate identification are RETIRED. Local template caches are segregated into versioned directories (`specs/templates/<name>/<version>/`) keyed to immutable Git release tags, eliminating versioned file sprawl in project working trees.

#### Scenario: Reachability analysis retired
- GIVEN a workspace with multiple hydrated template package versions in `specs/templates/`
- WHEN template resolution or maintenance commands execute
- THEN reachability analysis is not executed to flag or delete older versions

---

### Requirement: Pre-Migration Safety Check and Backup Consent (Retired)

The interactive safety check and backup archive generation for template pruning are RETIRED as pruning operations are no longer performed on the workspace template cache.

#### Scenario: No backup prompt for pruned specs
- GIVEN template migrations or updates occur
- WHEN templates are resolved or upgraded
- THEN no orphaned spec pruning backup prompt is displayed

---

### Requirement: Orphaned Spec Pruning Engine (`prune_orphaned_specs`) (Retired)

The `prune_orphaned_specs` MCP tool in `innfo-mcp` is RETIRED.

#### Scenario: Deprecated tool removal
- GIVEN an MCP client connected to `innfo-mcp`
- WHEN inspecting available tools
- THEN `prune_orphaned_specs` is no longer exposed as an active tool
