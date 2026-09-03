# Proposal: Pipeline Validation Gates

## Intent

When `innv0-trannsform` generates an iNNfo model, there is zero validation that the output is spec-compliant. The user discovered this in a real session: wrong naming, missing frontmatter, wrong location â€” 5+ reactive corrections that should have been caught automatically. We need validation gates between pipeline stages that enforce iNNfo compliance before delivery.

## Scope

### In Scope
- **Validation gate**: verify name (`_NN.md`, no `_draft.md`), frontmatter (spec_version, level, parent_spec, model_version, title, status), document notice present, `validate_model()` via innfo-mcp passes
- **Integration gate**: read model version, increment patch (e.g. `V_0-1-0` â†’ `V_0-1-1`), move file to correct workspace location, update `index.md` with WikiLink
- **Gate stage type** in workflow-orchestrator: a non-skill stage that runs deterministic checks + transformations, with fail-stop on validation failure
- **Init pre-flight**: verify innfo-mcp tools respond, trannsform skill installed, template URL accessible
- **Skill cross-reference metadata**: trannsform declares `depends_on: [innfo-mcp]`; innfo declares what it validates

### Out of Scope
- No UI changes in the editor app
- No changes to the generation logic inside trannsform itself
- No dashboard renderer changes
- No retroactive validation of existing models

## Capabilities

### New Capabilities
- `pipeline-gates`: Deterministic validation and integration gates for iNNfo model pipelines

### Modified Capabilities
- None

## Approach

1. Create `packages/pipeline-gates/` with two core functions:
   - `validateGate(modelPath)`: runs naming check, frontmatter parse, notice check, delegates to innfo-mcp `validate_model`
   - `integrateGate(modelPath, baseUrl)`: reads version, increments patch, rewrites file with new version, writes `index.md` entry
2. Enhance `packages/innfo-mcp/` with a `validate_model_url` tool that accepts a URL (so the gate can validate without writing to disk first)
3. Create a CLI script `scripts/pipeline-gate.js` callable from skill context
4. Update `innv0-workflow-orchestrator` SKILL.md to define `Gate` as a stage type alongside `Skill`, with fail-stop semantics and structured error messages
5. Update `innv0-trannsform` SKILL.md to declare innfo-mcp dependency
6. Add Init check procedure: before any workflow, verify MCP connectivity + template URL accessibility

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/pipeline-gates/` | **New** | Validation + integration gate logic |
| `packages/innfo-mcp/src/` | Modified | Add `validate_model_url` tool |
| `scripts/pipeline-gate.js` | **New** | CLI entry point for skill invocation |
| `~/.agents/skills/innv0-workflow-orchestrator/SKILL.md` | Modified | Add Gate stage type, fail-stop, validation flow |
| `~/.agents/skills/innv0-trannsform/SKILL.md` | Modified | Add `depends_on` metadata, post-generation gate call |
| `~/.agents/skills/innv0-innfo/SKILL.md` | Modified | Define validation contract for gates |
| `openspec/specs/pipeline-gates/spec.md` | **New** | Spec for the gates capability |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Skills are in external repos, not this monorepo | High | Gate logic lives in iNNfo; skill SKILL.md updates are tracked separately as a paired delivery step |
| innfo-mcp `validate_model_url` doesn't exist yet | Med | Gate can validate from disk (write temp file, validate, delete); `validate_model_url` is optimization |
| Version increment logic is ambiguous (major/minor/patch) | Low | Define semantic: patch for generated-from-sources, minor for manual edits, major for template changes. Gate auto-increments patch. |

## Rollback Plan

- Revert `packages/pipeline-gates/` â€” delete directory
- Revert `packages/innfo-mcp/` changes â€” revert commits
- Revert skill SKILL.md changes â€” revert per-skill repo
- No backward compatibility break: existing workflows continue without gates

## Dependencies

- innfo-mcp MCP server must be registered in OpenCode config
- Node.js for pipeline-gate CLI script
- Skills repos (`iNNv0_skills`, `~/.agents/skills/`) are writable

## Success Criteria

- [ ] `validateGate()` rejects file with `_NN_draft.md` naming
- [ ] `validateGate()` rejects file missing frontmatter
- [ ] `validateGate()` passes file that passes `validate_model()` via MCP
- [ ] `integrateGate()` increments `V_0-1-0` â†’ `V_0-1-1`
- [ ] `integrateGate()` writes WikiLink to `index.md`
- [ ] workflow-orchestrator SKILL.md documents `Gate` stage type with example
- [ ] Init pre-flight reports success/failure of MCP connectivity
- [ ] All existing tests pass
