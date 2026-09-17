# Console Export CLI

## Purpose
Provide status inspection, hierarchical tree visualization, hash-based freshness/staleness detection, and selective compilation in the console export CLI (`scripts/export-console.mjs`).

## Requirements

### Requirement: Status Reporting and Staleness Detection
The console export CLI MUST support a `--status` flag to report compilation state for all Level 3 models in the workspace.
- The status report MUST classify each model as `fresh`, `stale`, `uncompiled`, or `version_mismatch`.
- Staleness MUST be determined by comparing source model content (SHA-256 hash or modification timestamp) against the existing compiled console artifact under `export/<stem>_console/`.

#### Scenario: Inspecting model compilation status
- **GIVEN** a workspace containing compiled, modified, and newly created Level 3 models
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --status`
- **THEN** the CLI outputs each model's path and status tag (`[fresh]`, `[stale]`, `[uncompiled]`, or `[mismatch]`)
- **AND** no console artifacts are compiled or written to disk during status inspection

---

### Requirement: Tree Hierarchy Visualization
The console export CLI MUST support a `--tree` flag to render a hierarchical view of workspace models and their corresponding console export artifacts.

#### Scenario: Visualizing model hierarchy and artifacts
- **GIVEN** a workspace with models in subdirectories and compiled artifacts in `export/`
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --tree`
- **THEN** the CLI prints a structured tree representation showing models and linked console HTML files
- **AND** exits with status code 0

---

### Requirement: Selective Compilation and Filtering
The console export CLI MUST support targeted compilation flags while maintaining backward compatibility with existing arguments.
- The CLI MUST support `--stale` to compile only models detected as stale or uncompiled.
- The CLI MUST support `--filter <pattern>` to compile only models whose name or relative path matches `<pattern>`.
- The CLI MUST support `--all` to compile all discovered Level 3 models.
- The CLI MUST retain support for `--list` and positional substring arguments.

#### Scenario: Compiling only stale models
- **GIVEN** a workspace where 1 model was modified since last export and 2 models remain unchanged
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --stale`
- **THEN** only the modified model is compiled into `export/<stem>_console/<stem>_console.html`
- **AND** unchanged models are skipped with an informational notice

#### Scenario: Filtering compilation by pattern
- **GIVEN** a workspace with multiple models
- **WHEN** running `node scripts/export-console.mjs <workspaceRoot> --filter business`
- **THEN** only models matching substring `business` in name or path are compiled
