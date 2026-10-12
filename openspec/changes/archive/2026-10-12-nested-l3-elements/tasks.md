# Tasks: Nested Level-3 Elements via Heading Hierarchy

## Review Workload Forecast

| Metric / Dimension | Assessment |
|---|---|
| Estimated changed lines | ~420 lines |
| 400-line budget risk | Medium (cross-component core, compiler, specs, series) |
| Chained PRs recommended | No (atomic cross-component migration) |
| Delivery strategy | single-pr |
| Chain strategy | n/a |

Decision needed before apply: No - design and specs fully approved.
Chained PRs recommended: No
Chain strategy: n/a
400-line budget risk: Medium - spans core parser, validator, compiler, and series; single PR preserves end-to-end atomicity.

---

## Phase 1: `innfo-core` Parser, Slug Resolution & Serializer

- [x] 1.1 Extend `ElementNode` in `innfo-core/src/types/parser.ts` with `headingDepth?: number`, `parentElement?: { concept: string; name: string; slug?: string }`, and `parentSlug?: string`.
- [x] 1.2 Update `UNIFIED_ELEMENT_RE` in `innfo-core/src/parser/sections.ts` to `#{2,6}`; maintain `headingStack` in `parseConceptSection` to track depth and parentage.
- [x] 1.3 In `innfo-core/src/parser/core.ts`, partition child elements into `elements.get(childConcept)`; in `deriveElementSlugs`, propagate `parentSlug` from `parentElement.slug`.
- [x] 1.4 Update `innfo-core/src/parser/serializer.ts` to emit nested children inline (`### NN`) and omit separate child concept sections when fully nested.
- [x] 1.5 In `innfo-core/src/merge.ts`, preserve `headingDepth`, `parentElement`, and `parentSlug` across AST merges.
- [x] 1.6 Add `innfo-core` unit tests verifying multi-depth parsing, slug assignment, AST merge, and round-trip serialization fidelity (nested and flat).

## Phase 2: `innfo-core` Validator & Graph Normalization

- [x] 2.1 In `innfo-core/src/validator/hierarchy.ts`, validate parentage against blueprint taxonomy (`schema.taxonomy`), emitting `INVALID_NESTED_CONCEPT` on illegal nesting.
- [x] 2.2 Enforce depth-2 section conformance in `innfo-core/src/validator/hierarchy.ts` (`## NN` matches `# NN <SectionConcept>`).
- [x] 2.3 Verify `innfo-core/src/validator/content.ts` validates nested child elements against their concept schemas.
- [x] 2.4 Update `innfo-core/src/recursiveParser/normalize.ts` (`resolveParentQualifiedId`, `resolveActualParentId`) to prioritize `parentSlug` and `parentElement` for graph edges.
- [x] 2.5 Add validator unit tests covering valid/invalid nesting diagnostics (`INVALID_NESTED_CONCEPT`), depth-2 mismatches, and normalized parent-child graph links.

## Phase 3: Specifications & `video-script` Compiler

- [x] 3.1 Update `iNNfo/specs/iNNfo_V_0-4-0_NN.md` with L3 heading depth grammar rules.
- [x] 3.2 Update `iNNfo/specs/bluepriNNts/video-script/spec_NN.md` documenting `Layer` nested under `Scene` (`### NN Layer:`) and deprecating flat layer sections.
- [x] 3.3 In `remotion-scene-compiler.mjs`, bind layers by `parentSlug`/`parentElement` before falling back to slug prefix.
- [x] 3.4 Update fallback reader in `knowledge-model.mjs` for hierarchical headings.
- [x] 3.5 Add `video-script` compiler tests for nested layer binding and flat fallback.

## Phase 4: External `video_NN` Series Migration

- [x] 4.1 Update `D:\Users\lucas\Documents\_NN\video_NN\series\villabotijos-today\script_template.md` to declare `Layer` as nested `### NN Layer:` under `## NN Scene:`.
- [x] 4.2 Update `series_rules.md` and `procedure/generate_video_script_procedures_NN.md` in `villabotijos-today` to mandate nested layers.
- [x] 4.3 Update sibling series procedures (`cosicah-explicas-por-un-senor-de-villabotijos`, `inntrevistas`) for nested layer authoring.
- [x] 4.4 Migrate episode scripts in `villabotijos-today/assets/` (including `peluquin-cocaina_video-script_villabotijos-today_NN.md`) to nested headings.
- [x] 4.5 Verify Remotion scene compilation and renders across migrated scripts with zero errors.
