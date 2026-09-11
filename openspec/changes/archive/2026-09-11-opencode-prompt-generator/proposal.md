# Proposal: On-the-fly OpenCode Prompt Generator

## Intent
Provide an easy, frictionless way to generate and copy a contextual prompt for OpenCode / AI agents from any element, concept, or model in the iNNfo editor, complete with custom user notes/instructions and structural metadata.

## Scope
- `iNNfo/apps/innfo-editor/src/` (prompt generator utility, modal component or sheet extension, clipboard copy action).
- Integration in `BlockSheet.vue`, `ModelInfoPanel.vue`, or editor headers/sidebars.
- Test coverage for prompt generation and clipboard handling.
