# Proposal: empty-sections-mode

## Intent

Users transforming documents with templates sometimes lack source material for certain template sections. Without guidance, the agent either leaves gaps (broken output), guesses silently (unreliable output), or forces the user to micro-manage every section. This change adds a control mechanism: preview which sections are incomplete, then choose a handling mode.

## Scope

### In Scope
- Frontmatter field `empty_sections_mode` in SKILL.md (6 values)
- New subsection between 3c and 3c-i: summary of incomplete sections + mode selection
- Implementation for each mode (comment, omit, generate, generate-tagged, ask-per-section, template-default)
- New capability spec at `openspec/specs/empty-sections-mode/spec.md`

### Out of Scope
- Changing existing template format or markers
- Modifying the draft generation flow (step 4)
- Changes to non-transform skills
- Auto-detection of template sections vs. content sections

## Capabilities

### New Capabilities
- `empty-sections-mode`: Control how the trannsform skill handles template sections where source material is insufficient

### Modified Capabilities
- None

## Approach

1. Add YAML frontmatter field `empty_sections_mode` with default `ask-per-section`
2. After user picks "final version" (3c) and before generating the document (3d), insert a new step:
   - **Summary**: Scan the template sections against available source content, present a table of which sections are incomplete/cannot be completed
   - **Mode selection**: Present the 6 modes as labeled options with descriptions
   - Apply per-section or globally depending on mode
3. Each mode maps to a concrete output behavior (insert comment, omit section, generate, etc.)

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/innv0-trannsform/SKILL.md` | Modified | Add frontmatter field + empty-sections-mode subsection after 3c |
| `openspec/specs/empty-sections-mode/spec.md` | New | Capability spec with requirements and scenarios |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| List of incomplete sections may be inaccurate (agent hallucination) | Medium | Always show the summary to the user for validation before mode selection |
| `generate`/`generate-tagged` may produce misleading content | Medium | Tagged mode warns user; untagged mode is deliberate user choice |

## Rollback Plan

Revert all changes to `skills/innv0-trannsform/SKILL.md`. Delete `openspec/specs/empty-sections-mode/spec.md` if created.

## Dependencies

- None

## Success Criteria

- [ ] Frontmatter field `empty_sections_mode` is documented in SKILL.md with all 6 values
- [ ] Summary step displays incomplete sections before mode selection
- [ ] Each mode produces correct output per its specification
- [ ] Existing draft generation and citation flows are unchanged
