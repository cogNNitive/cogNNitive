# Proposal: Gated Workspace-to-Git Review Workflow (nn-domain-git)

Status: pending

## Intent

Provide an isolated, gated workspace-to-Git review layer for domaiNN maintainers and technical users who wish to version-control their local domain. This keeps iNNfo semantic models as the primary system of record (SSOT) while utilizing Git purely as an immutable review and change-tracking layer.

## Key Capabilities

1. **Private Repository Initialization:** Initialize a private repository with an opinionated `.gitignore` tailored for domaiNN workspaces (ignoring `staging/`, `sources/original/`, cached `specs/`, and secrets).
2. **Branch per Change + Gated PRs:** Branch-per-change workflow where PRs require passing `innfo-mcp_validate_knowledge` and `check_domain` before merging.
3. **Two-Layer Version Map:** Explicitly maintain bidirectional mapping rows between semantic model versions (`V_x-y-z`) and Git commit SHAs.
4. **Out-of-Tree Backups:** Create timestamped filesystem snapshots outside the workspace prior to structural migrations.

## Current State & Next Steps

- This skill is maintained under `skills/nn-domain-git/` as an internal/experimental capability (`disable-model-invocation: true`).
- Not distributed in `manifest/source.yaml` until formal test coverage and CLI orchestration scripts are implemented.
- Tool references inside `skills/nn-domain-git/SKILL.md` are aligned with canonical MCP tools (`validate_knowledge`, `check_domain`).
