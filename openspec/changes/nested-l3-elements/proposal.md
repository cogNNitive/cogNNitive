# Proposal: Nested Level-3 Elements via Heading Hierarchy

## Intent

Level-2 blueprints define taxonomy via `# NN index` (`Video -> Scene -> Layer`), but Level-3 documents disallow it. Previously, all elements required separate top-level `# NN <Concept>` sections with H2 headings (`## NN`). Documents like `video-script` had to split `Scene` and `Layer`, using fragile slug prefixes to infer parentage. We introduce Markdown heading nesting (`### NN`, `#### NN`), preserving full backward compatibility for flat sections.

## Scope

### In Scope
- **Specs**: Update `iNNfo_V_0-4-0_NN.md` and `video-script` blueprint for nested headings.
- **Core engine**: Update `sections.ts`, `core.ts`, `content.ts`, `hierarchy.ts`, `serializer.ts`, `merge.ts`, and `normalize.ts` to parse, validate, and serialize `parentSlug`.
- **Compiler**: Prioritize explicit parentage in `remotion-scene-compiler.mjs`.
- **External series**: Update `villabotijos-today` templates, procedures, and scripts.

### Out of Scope
- Allowing `# NN index` in L3 documents.
- Deprecating flat sections.

## Capabilities

### New Capabilities
- `nested-l3-elements`: Hierarchical markdown heading parsing, validation, and serialization for L3 documents.

### Modified Capabilities
- `video-script-model`: Syntactic ownership of `Layer` within `Scene`.
- `video-script-skill`: Compiler binds layers via explicit parentage.
- `series-script-templates`: Templates mandate nested layer syntax.

## Approach

Extend `sections.ts` to match `#{2,6} NN <Concept>: <Element>`, tracking heading depth to assign `parentSlug`. Validate nesting legality against blueprint `# NN index` in `hierarchy.ts`. Wire parentage into `normalize.ts` and `serializer.ts`. In `remotion-scene-compiler.mjs`, resolve layers by `parentSlug` before slug-prefix fallback. Migrate `villabotijos-today` scripts.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo_V_0-4-0_NN.md`, `video-script/spec_NN.md` | Modified | Nested heading grammar & specs |
| `innfo-core/src/parser/` | Modified | Parse and serialize nested headings |
| `innfo-core/src/validator/` | Modified | Validate nesting against index |
| `innfo-core/src/recursiveParser/normalize.ts` | Modified | Link parent-child graph nodes |
| `remotion-scene-compiler.mjs` | Modified | Prefer explicit parent ownership |
| `_NN/video_NN/series/villabotijos-today/` | Modified | Templates, procedures, and scripts |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Invalid nesting depths or concepts | Low | Validator checks against blueprint `# NN index` |
| Flat legacy script regressions | Low | Retain flat syntax tests and fallback |

## Rollback Plan

Revert slice commit; flat L3 syntax remains valid without data migration.

## Dependencies

None.

## Success Criteria

- [ ] L3 documents parse `### NN` child elements and populate `parentSlug`.
- [ ] Validator rejects nested elements violating blueprint `# NN index`.
- [ ] Serializer round-trips nested headings faithfully.
- [ ] Compiler binds layers via parent before slug fallback.
- [ ] `villabotijos-today` scripts render identically.
