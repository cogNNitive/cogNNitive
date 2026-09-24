# Lineage Record Filesystem Sync (Delta)

## MODIFIED Requirements

### Requirement: Execution runs are appended under Executions, never replaced

`# NN Executions` MUST use append semantics. Each pipeline operation (`--scan`, `--import-url`, `--apply`, `--lineage`) MUST append one `## NN Executions:` entry recording `command`, `flags`, `run_at` (ISO 8601), `inputs`, and `outputs`. A refresh of the filesystem-synced sections (`# NN Sources`, `# NN Models`, `# NN Artifacts`) MUST NOT remove existing `# NN Executions` entries.

`# NN Procedures` remains untouched as a declarative catalog of procedures (`type:: model`).

#### Scenario: Scan appends an execution entry
- GIVEN a lineage record with one existing execution entry
- WHEN `traNNsform --scan` runs
- THEN `# NN Executions` has two entries, the new one recording `command:: scan` and an ISO `run_at` timestamp.

#### Scenario: Backward compatibility with legacy Procedures entries
- GIVEN a legacy workspace containing `## NN Procedures: scan @ 2026-09-23T11:44:07.183Z`
- WHEN `traNNsform` processes or syncs the lineage record
- THEN previous traces remain preserved, and new runs are appended under `# NN Executions`.
