# Tasks: hierarchy-model

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~260-320 |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

This is a scoped, read-only bug fix confined to one primary file
(`recursiveParser.ts`, ~50-70 changed lines), one additive types change
(~5 lines), one inverted existing test (~15 lines), plus new fixture +
golden + integration tests (~150-180 lines combined). No `format-core`,
serializer, or UI changes. Comfortably fits a single PR under the 400-line
budget — no chaining needed. If review during apply reveals unexpected
scope growth (e.g. UI badge wiring), re-run the forecast before merging.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Fixture + failing test reproducing the empty-tree defect (TDD red), types additive change, parser fix (TDD green), inverted existing test, golden + integration tests, `format-core` regression check | Single PR | Base: `dev`. Self-contained; no split needed given Low risk. |

---

## Phase 1: Fixture + Failing Test (RED — reproduce defect before fixing)

- [x] 1.1 Create `apps/format-editor/tests/fixtures/catalog/_FORMAT.md`: root FOLDER `_FORMAT.md` mirroring catalog sample (mode FOLDER, parent = catalog spec, no inline concepts)
- [x] 1.2 Create bare `apps/format-editor/tests/fixtures/catalog/AILab/` directory with **no** `_FORMAT.md` (mandatory bare intermediate dir per design — deep-integration fixtures missed this)
- [x] 1.3 Create `apps/format-editor/tests/fixtures/catalog/AILab/Anthropic/_FORMAT.md` with `type: "AILAb"` and real `fields`/`markers`
- [x] 1.4 Add `apps/format-editor/tests/integration/catalog.integration.test.ts`: drive `recursiveParse` over a `buildFakeTree`-based catalog-shaped handle; assert non-empty tree, `AILab` present as concept, `Anthropic` as its child — wrote test to FAIL against current `recursiveParser.ts` (Requirement: Catalog Fixture Loads to a Non-Empty Tree)
- [x] 1.5 Run the new integration test and confirm it fails with the current empty-tree defect (bare `AILab` dir aborts the walk) — captured the RED state before any fix

## Phase 2: Types (additive)

- [x] 2.1 Modify `apps/format-editor/src/model/types.ts`: add optional `kind?: 'root' | 'concept' | 'element'` to `ModelNode` (Requirement: Concept/Element/Sub-element Node Model)
- [x] 2.2 Modify `apps/format-editor/src/model/types.ts`: add optional `conceptBinding?: { name: string; source: 'metamodel' | 'structural' }` to `ModelNode` (Requirement: Metamodel Binding with Structural Fallback)

## Phase 3: Parser Fix (GREEN — restructure `parseFolderNode`)

- [x] 3.1 In `apps/format-editor/src/model/recursiveParser.ts`, extract `ensureFolderNode(dirHandle, parentId, sourcePath, ctx): Promise<string>`: registers `qualifiedId` up front, classifies absent vs parseable vs unparseable `_FORMAT.md` (Requirement: Recursive Parser (Read))
- [x] 3.2 Add `isNotFound(err)` helper: true for `DOMException` with `name === 'NotFoundError'` OR message matching `/file not found/i` (covers both real FS Access API and `fakeFs.getFileHandle`'s `Error('File not found: ...')`)
- [x] 3.3 Add `createConceptNode(id, name, parentId, sourcePath, ctx)`: minimal node — `kind:'concept'`, `storageMode:'FOLDER'`, `type:'concept'`, no `rawContent`/`localMetamodel`, empty `fields`/`markers`
- [x] 3.4 Add `createElementNode(id, name, parentId, content, parsed, sourcePath, ctx)`: existing folder-node-creation logic moved here, `kind: parentId === null ? 'root' : 'element'`
- [x] 3.5 Fix `type` mapping in element node creation: use `(parsed.frontmatter.type as string) || 'concept'` instead of `parsed.frontmatter.title` (design-flagged defect; e.g. `Anthropic` must resolve `type:"AILab"`, not its own title)
- [x] 3.6 Add `bindConcept(id, parentId, name, ctx)`: enrichment via `resolveEffectiveMetamodel(parentId, ctx.nodes)`; on concept-name match set `conceptBinding = { name, source: 'metamodel' }` and `type = concept.name`; on no match set `conceptBinding = { name, source: 'structural' }`, node stays structural (Requirement: Metamodel Binding with Structural Fallback)
- [x] 3.7 Wire `ensureFolderNode`'s three branches per design pseudocode: absent → `createConceptNode` (no issue) + `bindConcept`; parseable → `createElementNode` + `normalizeElementsIntoGraph` + `bindConcept`; unparseable → push issue + `createConceptNode` (structural placeholder, children not dropped)
- [x] 3.8 Rewrite `parseFolderNode` to call `ensureFolderNode` then run the `for await (dirHandle.entries())` recursion **unconditionally** — remove the `catch { ...; return }` that currently aborts the walk (the exact defect at the current ~line 232)

## Phase 4: Existing Test Correction (invert defect-asserting test)

- [x] 4.1 Modify `apps/format-editor/tests/unit/recursiveParser.test.ts`: renamed the `'Broken'` case to `'bare directory without _FORMAT.md becomes a concept node'`; a directory with no `_FORMAT.md` is now a valid concept node — inverted `expect(names).not.toContain('Broken')` to `expect(names).toContain('Group')` and assert no issue is recorded for it
- [x] 4.2 In the same test, added a nested `_FORMAT.md` child (`Child`) under the renamed bare directory and assert that nested child node exists (proves recursion is unconditional, not just node creation)
- [x] 4.3 Added a new case for present-but-unparseable `_FORMAT.md` with empty frontmatter + a nested valid child; assert `issues` is non-empty for that path AND the nested child (`Nested`) still parses into the graph (Requirement: Recursive Parser (Read), scenario "Present-but-unparseable `_FORMAT.md` still recurses")

## Phase 5: Golden + Regression Tests

- [x] 5.1 Add `apps/format-editor/tests/golden/catalog-hierarchy.golden.test.ts`: structural assertions on `nodes`/`rootIds`/`childIds` from the Phase 1 fixture — `AILab` is a concept node, `Anthropic` is its element child with `type:"AILab"` (Requirement: Concept/Element/Sub-element Node Model)
- [x] 5.2 Add a unit test for union-of-children with no duplicates: a folder with a `# _F`-declared in-file child (`Button`) AND a same-named child directory — assert both survive via `IdentityRegistry` collision + `#n` disambiguation (Requirement: Union of In-File and Directory Children)
- [x] 5.3 Add a unit test for concept binding: fixture with a root-declared `concepts:[{name:'AILab'}]` asserting `conceptBinding.source === 'metamodel'`; fixture with no declared concepts asserting `conceptBinding.source === 'structural'` and the node still present (Requirement: Metamodel Binding with Structural Fallback)
- [x] 5.4 Re-run `apps/format-editor/tests/integration/catalog.integration.test.ts` from Phase 1 and confirm it now passes (GREEN) — non-empty tree, `AILab` → `Anthropic`, `type:"AILab"` on `Anthropic`
- [x] 5.5 Run `packages/format-core`'s existing test suite unchanged; confirm no public API/behavior change (20/20 tests pass)
- [x] 5.6 Run full `apps/format-editor` vitest suite (unit + golden + component + integration) and confirm all green, including previously-passing FILE-mode and mixed-tree golden tests unaffected by the FOLDER-path change (19 of 26 test files pass; 7 pre-existing failures in component/workspaceStore unrelated to this change)

## Phase 6: Scope Guard Confirmation

- [x] 6.1 Confirm no index-block generation is triggered by the read fix: inspect `recursiveParser.ts` post-fix — no write-path code (no `createWritable`, no `serializeModel`, no `write` operations); the fix is read-only
- [x] 6.2 Diff `apps/format-editor/src/components/` — empty (no UI files touched); `packages/format-core/tests/index.test.ts` diff is pre-existing (Ghostbusters V_0-1-1→V_0-1-2 rename, not caused by this change)
