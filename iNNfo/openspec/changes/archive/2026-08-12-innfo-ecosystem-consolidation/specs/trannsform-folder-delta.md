# Delta: traNNsform-folder — AGENT.md Pointer + workflows/ Subdirectory

## Change Type

**Modified capability**: The `traNNsform/` folder structure gains a `workflows/` subdirectory with two pipeline files, and `AGENT.md` is simplified from full instructions to a short pointer referencing the workflow files.

## Old Structure

```
traNNsform/
├── AGENT.md          ← 82 lines — full instructions: bootstrap, import, export, post-generation
├── README.md
├── input/
├── output/
├── templates/
│   ├── business.md
│   ├── procedures.md
│   ├── catalog.md
│   ├── organization.md
│   └── _generic.md
└── snippets/
    └── chart-patterns.md
```

`AGENT.md` was the single entry point containing:
- Pre-flight MCP activation protocol
- Bootstrap instructions (creates missing directories/files)
- Import documents procedure (5 steps)
- Import naming convention reference (defiNNe §6)
- Future incremental import note
- Export generation procedure (11 steps)
- Post-edit suggestion
- Post-generation feedback loop

## New Structure

```
traNNsform/
├── AGENT.md          ← simplified pointer (~5 lines)
├── README.md
├── input/
├── output/
├── workflows/        ← NEW directory
│   ├── export.workflow.md   ← NEW — export pipeline
│   └── import.workflow.md   ← NEW — import pipeline
├── templates/
└── snippets/
```

## Requirements

### R-TRF-D01: AGENT.md Is a Pointer

The `traNNsform/AGENT.md` file content MUST be replaced with a short pointer document that directs the agent to the workflow files. The new content:

```markdown
# traNNsform — Agent Pointers

This directory uses **workflow files** for structured pipelines.
Open the appropriate workflow file in `workflows/`:

- **Import documents** → `workflows/import.workflow.md`
- **Export visualizers** → `workflows/export.workflow.md`

For setup instructions (workspace structure, templates, snippets):
see `README.md` in this directory.
```

#### Scenario: Agent reads pointer file
- GIVEN the agent opens `traNNsform/AGENT.md`
- WHEN it reads the content
- THEN it sees the pointer with 2 workflow references + README reference
- AND opens `workflows/export.workflow.md` or `workflows/import.workflow.md` as needed
- AND finds full pipeline instructions there

#### Scenario: Old workspaces retain old AGENT.md
- GIVEN an existing workspace created before this change
- WHEN the workspace is opened
- THEN the old `AGENT.md` remains on disk (not modified)
- AND the agent can still operate with the old content
- AND the new workflow files are NOT created for old workspaces

### R-TRF-D02: workflows/ Directory Added

A new `workflows/` subdirectory is created under `traNNsform/` containing two pipeline definition files. These follow the `_NN` format as defined in `nn-workflow-orchestrator/reference/workflow-format.md`.

### R-TRF-D03: New Workspaces Get workflow/ Directory

When a new workspace is created via SetupWizard, `initWorkspaceStructure()` MUST:
1. Create `traNNsform/workflows/` directory
2. Download `export.workflow.md` and `import.workflow.md` from the GitHub raw URL (same pattern as existing transform files)
3. Include them in the `transformFiles` download array

#### Scenario: SetupWizard creates workflow files alongside existing files
- GIVEN a user creates a new workspace via SetupWizard
- WHEN the workspace is initialized
- THEN `traNNsform/workflows/` exists
- AND `traNNsform/workflows/export.workflow.md` exists with valid content
- AND `traNNsform/workflows/import.workflow.md` exists with valid content
- AND all existing transform files (AGENT.md, README.md, templates, snippets) still download correctly

### R-TRF-D04: Old AGENT.md Content Preserved in Workflow Files

The operational content removed from `AGENT.md` must be preserved in the new workflow files:

| Old AGENT.md section | Moved to |
|---------------------|----------|
| Pre-flight MCP activation | (removed — handled by router infrastructure) |
| Bootstrap instructions | (removed — wizard handles creation; agent should not bootstrap) |
| Import documents procedure (5 steps) | `workflows/import.workflow.md` stages 1-7 |
| Import naming convention | `workflows/import.workflow.md` (in stage 5 notes) |
| Export generation procedure (11 steps) | `workflows/export.workflow.md` stages 1-7 |
| Post-edit suggestion | (removed — editor UI handles this; not agent's concern) |
| Post-generation feedback loop | `workflows/export.workflow.md` (in stage 7 notes) |

#### Scenario: Agent gets same operational guidance from workflow files
- GIVEN an agent that previously worked with the old `AGENT.md`
- WHEN it reads `workflows/import.workflow.md` and `workflows/export.workflow.md`
- THEN it can perform the same import/export operations with the same outcomes
- AND the structured stage format may make execution more reliable (sequential, verifiable steps)

### R-TRF-D05: AGENT.md Updated in Git Repo

The `AGENT.md` file at the repository root (`traNNsform/AGENT.md`) MUST be replaced with the pointer content. This ensures new workspaces (downloaded via SetupWizard) get the pointer.

## Acceptance Criteria

- [ ] `traNNsform/AGENT.md` contains only the pointer text (no bootstrap, import, export, or feedback instructions)
- [ ] `traNNsform/workflows/` directory exists
- [ ] `traNNsform/workflows/export.workflow.md` contains all export stages previously in AGENT.md
- [ ] `traNNsform/workflows/import.workflow.md` contains all import stages previously in AGENT.md
- [ ] SetupWizard creates `workflows/` and downloads both workflow files
- [ ] Old workspaces are NOT migrated (no workflow files created)
- [ ] `README.md` reference in pointer text is correct

## File Paths Affected

| File | Action | Notes |
|------|--------|-------|
| `traNNsform/AGENT.md` | Modify | Replace 82-line content with ~10-line pointer |
| `traNNsform/workflows/export.workflow.md` | **Create** | Export pipeline stages (moved from AGENT.md §"Generate an export") |
| `traNNsform/workflows/import.workflow.md` | **Create** | Import pipeline stages (moved from AGENT.md §"Import documents") |
| `apps/innfo-editor/src/components/layout/SetupWizard.vue` | Modify | Add `workflows/` dir creation + 2 file downloads to `initWorkspaceStructure()` |
