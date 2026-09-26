# Proposal: Separate Procedure Definitions vs. Execution Runs in iNNfo Workspaces

## Intent

Resolve the ontological and architectural collision between declarative procedure definitions (`# NN Procedures`) and append-only execution traces (`# NN Executions`). Currently, CLI pipelines (`traNNsform`) write timestamped execution logs as `## NN Procedures: <command> @ <timestamp>` into the workspace manifest, polluting the Modeler UI navigation tree and causing validation drift when users attempt manual reorganization.

## Scope

### In Scope
- Define `# NN Executions` in the Level 2 workspace template (`workspace_spec_NN.md`) with concept metadata (`icon:: terminal`, `type:: list`, `color:: grey`) and field definitions (`command`, `flags`, `run_at`, `inputs`, `outputs`).
- Restrict `# NN Procedures` strictly to declarative workflows and procedure catalogs (`type:: model`, PROV Plan).
- Update `traNNsform` (`provenance-model.js` and CLI runners) to write execution traces under `# NN Executions`.
- Provide backward compatibility in `traNNsform` and `innfo-core` for legacy manifests containing `## NN Procedures: <cmd> @ <ISO>`.
- Update Modeler UI (`innfo-editor` Left Sidebar & components) to render Executions with terminal/history icon and collapsible grouping for timestamped traces.
- Update `openspec/specs/lineage-record-sync/spec.md` and related tests.

### Out of Scope
- Modifying Level 3 domain model syntax outside of workspace manifests.
- Redesigning unrelated CLI pipeline execution semantics.

## Capabilities

### New Capabilities
- `workspace-executions-provenance`: Declares `# NN Executions` as the dedicated append-only concept for pipeline runs and provenance traces in iNNfo workspaces.

### Modified Capabilities
- `lineage-record-sync`: Updates lineage filesystem sync requirements so execution traces are recorded under `# NN Executions` instead of `# NN Procedures`.

## Approach

1. **Spec & Metamodel**: Add `Executions` concept and field definitions to `iNNfo/specs/templates/workspace_spec_NN.md` (and canonical sync copies).
2. **CLI & Engine**: Update `appendProcedureRun` in `skills/nn-trannsform/scripts/lib/provenance-model.js` to target `# NN Executions` (with legacy fallback).
3. **Editor & Modeler UI**: Update `innfo-editor` Left Sidebar and `VirtualGroupNode` / `ConceptTreeNode` to handle execution log nodes cleanly without cluttering model definitions.
4. **Validation & Tests**: Update unit and integration tests across `innfo-core`, `innfo-editor`, and `nn-trannsform`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/workspace_spec_NN.md` | Modified | Add `# NN Concept Definition: Executions` and its field definitions |
| `skills/nn-trannsform/scripts/lib/provenance-model.js` | Modified | Update `appendProcedureRun` and template generators to `# NN Executions` |
| `skills/nn-trannsform/test/` | Modified | Update unit tests for lineage sync and execution provenance |
| `iNNfo/apps/innfo-editor/src/` | Modified | Update sidebar visuals and node presentation for execution runs |
| `openspec/specs/lineage-record-sync/` | Modified | Update spec requirements to reflect `# NN Executions` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Legacy workspaces break on missing `Executions` section | Low | Parser & CLI maintain backward compatibility, reading both or migrating transparently |
| Template catalog hash / integrity checks drift | Medium | Run `npm run check:versions` and `npm run check:integrity` to keep canonical specs in sync |

## Rollback Plan

Revert git changes on `dev` to restore previous `workspace_spec_NN.md` and `provenance-model.js`.

## Dependencies

- None.

## Success Criteria

- [ ] `workspace_spec_NN.md` formally declares `# NN Executions` alongside `# NN Procedures`.
- [ ] `traNNsform` writes runs under `# NN Executions: <cmd> @ <ISO>`.
- [ ] Modeler UI renders `Executions` with distinct icon (`terminal`) and groups/distinguishes runs from domain models.
- [ ] Legacy workspaces with `## NN Procedures: <cmd> @ <timestamp>` parse without crash or regression.
- [ ] All test suites (`nn-trannsform`, `innfo-core`, `innfo-editor`) pass cleanly.
