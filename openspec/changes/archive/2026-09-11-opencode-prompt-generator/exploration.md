# Exploration: On-the-fly OpenCode Prompt Generator

## Existing Patterns
- `BlockSheet.vue` and `ModelInfoPanel.vue` already feature "Copy prompt" functionality for static migration/template guidance prompts.
- `ValidationReport.vue` provides prompt hints per check with clipboard copy and "Copied!" feedback.
- We need a modal or expandable dialog where users can type custom instructions ("Escribe aquí tu comentario o nota tus instrucciones para el agente...") combined with the item's context.

## Requirements
1. Modal or dialog triggered by a button on elements, concepts, or models.
2. Textarea for custom user notes/instructions.
3. Automated prompt assembly: metadata (file, path, concept, element) + user instructions.
4. One-click copy to clipboard with visual feedback ("Copied!").
5. Preview of the generated prompt.
