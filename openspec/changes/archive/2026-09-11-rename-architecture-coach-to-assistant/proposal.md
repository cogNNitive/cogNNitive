# Proposal: Rename Architecture Coach to Architecture Assistant

## Intent

Rename the term "Architecture Coach" to "Architecture Assistant" across all skills, documentation, registry files, and system prompts to reflect a more precise, collaborative tool role.

## Scope

### In Scope
- Rename occurrences of "Architecture Coach" to "Architecture Assistant" in `nn-innfo/SKILL.md` and related documentation.
- Rebuild the skill registry.

### Out of Scope
- Changing structural behaviors or audit workflows of the assistant.

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- nn-innfo: Update terminology from Architecture Coach to Architecture Assistant.

## Approach

Perform precise string replacements across relevant Markdown and skill files, then regenerate the skill registry.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `actioNN/skills/nn-innfo/SKILL.md` | Modified | Replace Architecture Coach with Architecture Assistant |
| `docs/actionn/documentation/` | Modified | Update documentation terminology |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Broken references | Low | Exhaustive search and replace |

## Rollback Plan

Revert git commit.

## Dependencies

- None

## Success Criteria

- [ ] All occurrences of "Architecture Coach" renamed to "Architecture Assistant".
- [ ] Skill registry successfully rebuilt.
