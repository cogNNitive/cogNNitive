# Spec: Canonical Workspace Layout (kNNowledge/)

## ADDED Requirements

### Requirement: Canonical Knowledge Directory
The system MUST use `kNNowledge/` as the sole canonical directory for domain models (kNNowledge documents).
All readers, writers, linters, preflight scripts, and MCP tools MUST target `kNNowledge/`.
Unledgered fallback reads to `models/` MUST be removed.

#### Scenario: Newly bootstrapped workspace uses kNNowledge
- GIVEN a new workspace created via `bootstrap.js`
- WHEN inspecting the directory layout
- THEN `kNNowledge/` exists and `models/` does not.

#### Scenario: Lineage scanner discovers models in kNNowledge
- GIVEN a canonical workspace with models in `kNNowledge/`
- WHEN `nn-trannsform --lineage` runs
- THEN all models in `kNNowledge/` are indexed.
