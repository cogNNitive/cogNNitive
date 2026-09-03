# Template Version Pruning & Safety Backups

## Purpose

Establish reference reachability analysis across workspace models, mandate interactive safety backup consent and git working tree integrity checks during template version migrations (`bump_version`), and provide a safe orphaned spec pruning mechanism (`prune_orphaned_specs` MCP tool).

## Requirements

### Requirement: Workspace Spec Reference Reachability Analysis

The `innfo-mcp` engine MUST analyze workspace models (`models/`), root entrypoints (`workspace_NN.md`, `index.md`), and Level 2 templates (`templates/`) to build a complete spec reference graph. The graph MUST include parent spec references and transitive `includes` inheritance dependencies. Any spec version in `specs/` or `specs/templates/` not present in the active reference set MUST be marked as an orphan candidate.

#### Scenario: Active spec reachable via model parent reference is preserved
- GIVEN a model `models/ProjectAlpha_NN.md` declaring `parent_spec: "projects_V_0-2-0"`
- WHEN reachability analysis constructs the spec reference graph
- THEN `projects` `V_0-2-0` is marked active and protected from pruning

#### Scenario: Transitive includes dependencies marked as active
- GIVEN a Level 2 spec `business` `V_0-2-0` that includes `taxonomy` `V_0-1-0`
- AND `business` `V_0-2-0` is referenced by an active workspace model
- WHEN reachability analysis constructs the reference graph
- THEN both `business` `V_0-2-0` and `taxonomy` `V_0-1-0` are included in the active set

#### Scenario: Unreferenced old template version identified as orphan candidate
- GIVEN `specs/templates/business/V_0-1-0/` exists on disk
- BUT no active model or template references `business` `V_0-1-0`
- WHEN reachability analysis runs
- THEN `business` `V_0-1-0` is flagged as an orphaned spec candidate

---

### Requirement: Pre-Migration Safety Check and Backup Consent

Before executing `bump_version` or spec pruning operations, the system MUST verify working tree cleanliness or prompt the user for backup consent. If uncommitted changes exist or `--backup` is specified, the system MUST generate a backup archive snapshot (`.backup/specs_<timestamp>.zip`) or git commit checkpoint prior to mutating disk state.

#### Scenario: Safety check triggers backup archive creation when uncommitted changes exist
- GIVEN uncommitted changes exist in the workspace `specs/` directory
- WHEN `bump_version` or `prune_orphaned_specs` is invoked
- THEN a timestamped backup zip archive is created in `.backup/` before any spec files are deleted or overwritten

#### Scenario: User backup consent prompt during version migration
- GIVEN an interactive execution of `bump_version`
- WHEN migrating model parent references to a new spec version
- THEN a prompt `needs decision: Create backup checkpoint of specs directory before migrating? [Y/n]` is displayed
- AND migration proceeds only after user confirmation or automatic `--yes` flag approval

---

### Requirement: Orphaned Spec Pruning Engine (`prune_orphaned_specs`)

`innfo-mcp` MUST expose a `prune_orphaned_specs` tool with parameters `dry_run` (default `true`) and `backup` (default `true`). In `dry_run` mode, the tool MUST list all orphaned spec files/directories without deleting them. When `dry_run: false`, the tool MUST create a backup snapshot (if `backup: true`) and delete orphaned files.

#### Scenario: Dry-run execution lists candidates without deleting
- GIVEN orphaned spec package `specs/templates/legacy/V_0-1-0/`
- WHEN `prune_orphaned_specs` is executed with `dry_run: true`
- THEN the tool returns a report listing `specs/templates/legacy/V_0-1-0/` as a deletion candidate
- AND no files are deleted from disk

#### Scenario: Pruning execution with backup snapshot
- GIVEN `prune_orphaned_specs` is executed with `dry_run: false` and `backup: true`
- WHEN execution starts
- THEN a `.backup/specs_<timestamp>.zip` archive is written containing all candidate specs
- AND orphaned spec files are permanently deleted from `specs/templates/`
- AND execution returns a detailed summary of removed files and created archive path
