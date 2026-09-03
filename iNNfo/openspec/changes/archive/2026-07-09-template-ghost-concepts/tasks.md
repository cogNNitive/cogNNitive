# Tasks: Template Ghost Concepts

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~285 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Ghost concepts: utility, stores, components, tests | PR 1 | Single PR under 400 lines |

## Phase 1: Foundation (Utility + Store State)

- [x] 1.1 Create `apps/innfo-editor/src/utils/ghostDetection.ts` — pure `isConceptPresent()` with type-aware rules for text/weight/list/steps/sequence/category
- [x] 1.2 Add `ghostFilterMode` ref (`'model'\|'template'\|'all'`) and `setGhostFilterMode()` to `apps/innfo-editor/src/stores/uiStore.ts`
- [x] 1.3 Add `addConceptElement(conceptName, elementName)` action wrapper to `apps/innfo-editor/src/stores/modelStore.ts`

## Phase 2: Core Implementation (Ghost Computation + Components)

- [x] 2.1 Add `ghostConcepts` computed to `apps/innfo-editor/src/stores/metamodelStore.ts` — diff template concepts against present model instances using `isConceptPresent()`
- [x] 2.2 Add `ghost` prop to `apps/innfo-editor/src/components/layout/VirtualGroupNode.vue` — ghost styling: opacity 0.55, dashed border, italic name, "Add first element" indicator
- [x] 2.3 Render ghost VirtualGroupNodes and filter toggle in `apps/innfo-editor/src/components/layout/LeftSidebar.vue` — import ghostConcepts + ghostFilterMode; filter tree per selected mode

## Phase 3: Testing

- [x] 3.1 Unit test `isConceptPresent()` for each type rule (text/weight/list/category) and edge cases (empty model, unknown type)
- [x] 3.2 Unit test `ghostConcepts` computed with mocked modelStore (correct diff, category cascading)
- [x] 3.3 Unit test VirtualGroupNode ghost rendering (opacity, dashed border, italic name, Add button)
- [x] 3.4 Integration test filter toggle cycling (model→template→all→model) and correct subset rendering
- [x] 3.5 Integration test "Add" on ghost group → `addConceptElement` called → group transitions to present
- [x] 3.6 E2E test full lifecycle (Playwright): "All" shows both, "Model only" hides ghosts, "Template only" shows only ghosts, add element removes ghost

## Phase 4: Quality Verification

- [x] 4.1 Run `npm run lint` — pre-existing errors only (bundled JS), zero new warnings
- [x] 4.2 Run `npm run typecheck` — no type errors
- [x] 4.3 Run `npm run test` — 364 tests pass (46 files)
- [x] 4.4 Run `npm run format` — formatting passes
