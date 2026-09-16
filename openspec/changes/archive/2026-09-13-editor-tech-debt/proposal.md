# Proposal: Editor Tech Debt & Any Reduction

## Context
innfo-editor accumulated gratuitous s any casts around parseFrontmatter(), ModelNode.fields traversals, and validation severity mappings.
This change cleans up unnecessary type assertions, aligns with the typed SpecFrontmatter and ValidationCheck contracts from @cognnitive/innfo-core, and verifies strict typechecking in innfo-editor.

## Objectives
1. Remove gratuitous s any casts on parseFrontmatter() return values across composables and layout components.
2. Type-guard FieldValue property access and validation severities.
3. Validate full TypeScript compilation via 
pm --prefix iNNfo/apps/innfo-editor run typecheck.
