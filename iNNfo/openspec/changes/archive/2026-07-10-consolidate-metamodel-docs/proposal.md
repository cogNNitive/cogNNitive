# Proposal: Consolidate Metamodel Documentation

## Intent
Consolidate legacy template documentation files into Level-2 specifications to prevent data drift, simplify the spec loading pipeline in the editor, and enforce documentation requirements via the validator.

## Scope
| Category | In Scope | Out of Scope |
|---|---|---|
| **Content** | <ul><li>Extract business/procedures docs into L2 specs.</li><li>Create minimal catalog docs inside its L2 spec.</li><li>Deduplicate structural metadata from markdown.</li><li>Bump Level-1 iNNfo spec to V_0-1-1.</li></ul> | <ul><li>Modifying Level-3 models directly.</li><li>Altering custom concepts not in standard templates.</li></ul> |
| **Logic** | <ul><li>Local spec cache resolution first, then HTTP fetch.</li><li>Parse concept guidance from spec rawContent.</li><li>Validator warning for undocumented concepts.</li></ul> | <ul><li>Visual editing of specs.</li><li>Auto-generating documentation.</li></ul> |

## Capabilities
*   **New**: Warning in model validation if Level-2 parent template is missing concept docs.
*   **New**: Local-first spec parsing fallback from workspace `specs/` cache directory.
*   **Modified**: Editor guidance system parses descriptions, summaries, methodologies, and prompts directly from the spec's `rawContent` (storing it as a synthetic node in `modelStore`).

## Approach
1.  **Migrate Docs**: Append H2 sections (`## ConceptName`) with H3 sub-sections (`### Summary`, `### Description`, `### Methodologies`, `### Prompts`) to `business_V_0-1-2_NN.md`, `procedures_V_0-1-2_NN.md`, and `catalog_V_0-1-3_NN.md`.
2.  **iNNfo Bump**: Bump iNNfo Level-1 spec to `V_0-1-1` to add the consolidation requirement.
3.  **Validator**: Update `validateModel` in `packages/innfo-core/src/validator/model.ts` to scan template rawContent and warn if a concept is undocumented.
4.  **Pinia Stores**: Update `modelStore.ts` to store raw spec contents and `metamodelStore.ts` to parse guidance from spec `rawContent`, looking up local workspace specs first.
5.  **Clean up**: Delete legacy `documentation.md` files.

## Affected Areas
*   `specs/v0.1.0/level2/business/business_V_0-1-2_NN.md`
*   `specs/v0.1.0/level2/procedures/procedures_V_0-1-2_NN.md`
*   `specs/v0.1.0/level2/catalog/catalog_V_0-1-3_NN.md`
*   `specs/v0.1.0/level1/iNNfo_V_0-1-1_NN.md`
*   `specs/latest/level2/{business,procedures,catalog}/{business,procedures,catalog}_NN.md`
*   `specs/latest/level1/iNNfo_NN.md`
*   `apps/innfo-editor/src/stores/{modelStore,metamodelStore}.ts`
*   `packages/innfo-core/src/validator/model.ts`
*   `FORMAT/docs/documentation/templates/{business,procedures}/V_0-1-0/documentation.md` (to delete)

## Risks & Mitigations
*   **Drift/Performance**: Parsing large spec files. *Mitigation*: Parse and cache documentation on demand inside `metamodelStore`.
*   **Missing Docs**: Legacy or undocumented templates. *Mitigation*: Graceful validator warnings and Slate fallbacks in editor.

## Rollback Plan
1. Revert Git commits for store and validator updates.
2. Restore legacy `documentation.md` files from Git history.

## Success Criteria
1. Legacy `documentation.md` files are deleted.
2. Validator emits warnings for undocumented Level-2 concepts.
3. Editor app loads all guidance/prompts correctly local-first.
