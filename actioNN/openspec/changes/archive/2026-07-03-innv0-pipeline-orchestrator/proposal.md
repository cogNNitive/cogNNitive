# Proposal: innv0-pipeline-orchestrator

## Intent

Today, iNNv0 skills are autonomous â€” they don't know about each other. Users must manually chain: "run this through traNNsform, now through FORMAT, now back through traNNsform". No declarative file describes the full pipeline. This change introduces a meta-skill orchestrator that reads declarative pipeline files and coordinates multi-skill execution sequences.

## Scope

### In Scope
- **Template FORMAT `pipeline`** â€” new specialization. Concepts: Pipeline, Stage, Skill, Artifact, Transformation. Matrices: Stage-Skill, Stage-Artifact.
- **Skill `innv0-pipeline-orchestrator`** â€” meta-skill that reads pipeline files, scans user-chosen locations for `.pipeline` FORMAT files, and executes stages in sequence by loading child skills.
- **Sample pipeline** â€” a working pipeline from `raw/` (video, PDF, DOCX) â†’ `innv0-trannsform` (normalize) â†’ `innv0-format` (business template) â†’ `innv0-trannsform` (AnyDeo script).
- **Registry update** â€” add entry to `.cogNNitive/skill-registry.md`.
- **README update** â€” add pipeline-orchestrator row.

### Out of Scope
- AnyDeo template implementation (future change or within trannsform).
- GUI or standalone CLI.
- Modifying existing skills (trannsform, format, etc.).

## Capabilities

### New Capabilities
- `pipeline-definition`: declarative FORMAT specialization for describing multi-skill pipelines with chained stages. Stored as `.pipeline` files accessible at user-chosen locations.
- `pipeline-orchestration`: meta-skill that scans locations for pipeline files, lets users pick existing or create new, reads the pipeline, loads child skills sequentially, and passes stage outputs as next stage inputs.

### Modified Capabilities
- None â€” pure addition, no existing capability changes at the spec level.

## Approach

1. Author the `pipeline` FORMAT template at `docs/templates/pipeline/V_0-1-0/`, defining concepts, markers, and matrices.
2. Write `skills/innv0-pipeline-orchestrator/SKILL.md` â€” the orchestrator behavior: ask user for pipeline choice, scan locations, load FORMAT files, execute stages by loading child skills.
3. Create a sample pipeline file demonstrating the complete rawâ†’sourcesâ†’formatâ†’anydeo flow.
4. Update `.cogNNitive/skill-registry.md` and `README.md`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/templates/pipeline/V_0-1-0/` | New | FORMAT template directory with pipeline spec |
| `skills/innv0-pipeline-orchestrator/` | New | Meta-skill with SKILL.md |
| `.cogNNitive/skill-registry.md` | Modified | +1 pipeline-orchestrator entry |
| `README.md` | Modified | +1 skill row in table |
| `openspec/changes/innv0-pipeline-orchestrator/` | New | SDD lifecycle artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Orchestrator depends on child skills having known interfaces | Medium | Document expected interface per child skill in SKILL.md |
| Template pipeline is new and untested with real use | Low | Ship sample pipeline as validation; iterate after first real use |
| Pipeline location discovery UX may confuse users | Low | Orchestrator asks explicitly; no auto-scan without consent |

## Rollback Plan

1. Revert all commits for this change.
2. Delete `docs/templates/pipeline/` and `skills/innv0-pipeline-orchestrator/`.
3. Revert `.cogNNitive/skill-registry.md` and `README.md` to previous state.
4. Archive `openspec/changes/innv0-pipeline-orchestrator/` to archive with destructive-delta warning.

## Dependencies

- FORMAT specification V_0-2-0 (template structure reference).
- Existing skills: `innv0-trannsform` (normalization, template application), `innv0-format` (business model authoring).

## Success Criteria

- [ ] Pipeline FORMAT template validates against FORMAT spec (frontmatter, concepts, markers, matrices).
- [ ] Orchestrator SKILL.md describes complete user interaction flow (choose pipeline â†’ scan â†’ execute).
- [ ] Sample pipeline is syntactically valid and documents the rawâ†’sourcesâ†’formatâ†’anydeo flow.
- [ ] `.cogNNitive/skill-registry.md` includes pipeline-orchestrator entry with correct path and triggers.
- [ ] README.md table includes pipeline-orchestrator row.
