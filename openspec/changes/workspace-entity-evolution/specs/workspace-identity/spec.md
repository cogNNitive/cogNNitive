# Workspace Identity

## Purpose

Provide a stable, human-readable `workspace_id` anchor on the workspace entrypoint's frontmatter so a workspace retains a correlatable identity across renames and moves, surfaced on the derived `WorkspaceIndex` for future cross-workspace and tooling use.

## Requirements

### Requirement: Optional `workspace_id` on the Entrypoint Frontmatter

Exactly one document — whichever file `findPrimaryWorkspaceFile` resolves as the workspace entrypoint (a `workspace*.md` file or, when present, a `*_base_NN.md` overview root) — MAY declare a `workspace_id` frontmatter key holding a stable slug. The field is optional; its absence MUST NOT produce a validation error or warning in v1. `innfo-core` MUST NOT enforce uniqueness of `workspace_id` across workspaces in v1.

#### Scenario: Entrypoint declares a workspace_id
- GIVEN a workspace entrypoint `workspace_01.md` with frontmatter `workspace_id: acme-portfolio`
- WHEN the workspace is scaffolded or parsed
- THEN `workspace_id` is treated as a valid, recognized frontmatter field
- AND no validation issue is reported for its presence or its value

#### Scenario: Entrypoint without workspace_id parses unaffected
- GIVEN a workspace entrypoint with no `workspace_id` frontmatter key
- WHEN the workspace is parsed
- THEN parsing succeeds identically to a workspace that declares `workspace_id`
- AND no missing-identity warning is emitted

### Requirement: `workspace_id` Surfaced on the Workspace Index

`buildWorkspaceIndex()` MUST read `workspace_id` from the entrypoint node's frontmatter and expose it as `WorkspaceIndex.workspaceId` when present, and MUST leave `workspaceId` unset when the entrypoint declares no such field.

#### Scenario: workspace_id propagated to the derived index
- GIVEN an entrypoint node with frontmatter `workspace_id: acme-portfolio`
- WHEN `buildWorkspaceIndex()` derives the index over the parsed workspace
- THEN `WorkspaceIndex.workspaceId` equals `"acme-portfolio"`

#### Scenario: Missing workspace_id leaves the index field unset
- GIVEN an entrypoint node with no `workspace_id` frontmatter key
- WHEN `buildWorkspaceIndex()` runs
- THEN `WorkspaceIndex.workspaceId` is `undefined`
