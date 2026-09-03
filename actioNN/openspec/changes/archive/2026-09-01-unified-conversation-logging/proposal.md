# Proposal: Unified Conversation Logging (2026-09-01-unified-conversation-logging)

## Intent
Establish a unified conversation logging protocol across all Neural Network (NN) skills to ensure consistent, traceable, and easily accessible interaction histories.

## Scope
- Affects all NN skills within the system.
- Defines standardized logging location and file naming conventions.
- Requires updates to system governance documentation (`actioNN/skills/nn-router/SKILL.md`) and agent definitions (`actioNN/AGENTS.md`).

## Capabilities & Approach
- **Logging Location:** All conversations must be logged to `<workspace_root>/conversations/`.
- **Naming Convention:** Files must be named using the format `YYYY-MM-DD_<nombre_modelo>_<titulo_3_a_6_palabras>.md`. If there is no actively engaged model, the format simplifies to `YYYY-MM-DD_<titulo_3_a_6_palabras>.md`.
- **Implementation Strategy:** Minimize codebase disruption by codifying this as a mandatory UX governance rule within existing architectural documentation rather than sprawling code changes.

## Affected Areas
- `actioNN/skills/nn-router/SKILL.md` (System Governance & UX Protocol)
- `actioNN/AGENTS.md` (Agent definitions and expected behaviors)

## Risks & Mitigation
- **Risk:** Agents fail to adhere to the new naming convention.
  - **Mitigation:** Clear documentation in governance files and potential future linter/validation hooks.
- **Risk:** Directory clutter in `<workspace_root>/conversations/`.
  - **Mitigation:** The structured date prefix (`YYYY-MM-DD`) allows for easy chronological sorting and eventual archival scripts if necessary.

## Rollback Plan
Revert the documentation additions in `SKILL.md` and `AGENTS.md`. No strict code rollback is required as this is a governance rule change.

## Dependencies
None. This is an organizational and behavioral update.

## Success Criteria
- The `conversations` directory is consistently used by all NN skills.
- Logged files adhere strictly to the specified naming format.
- Documentation accurately reflects these mandatory rules.
