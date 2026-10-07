# Implementation Tasks: Stable Element Identity (Slice S1)

**Change ID**: `2026-10-07-stable-element-identity`  
**Slice**: `S1 (stable-element-identity)`  
**Status**: `Ready for Implementation`  
**Target Specification**: `iNNfo_V_0-4-0_NN.md`  
**Artifact Mode**: Hybrid (`Engram` + `OpenSpec filesystem`)  
**Input Documents**:
- `proposal.md`
- `design.md` (authoritative architectural design & decisions D1, D3, D4, D5, D6, D16, D18, D19)
- `specs/stable-element-identity/spec.md`
- `specs/typed-source-references/spec.md`
- `specs/model-mutation-references/spec.md`
- `specs/editor-lineage-ui/spec.md`

---

## 1. Workload Forecast & Delivery Strategy

- **Estimated changed lines**: 600–900 lines across packages, apps, scripts, specs, and fixtures.
- **400-line budget risk**: **High**
- **Chained PRs recommended**: **No** (User explicitly granted line budget exception for S1)
- **Delivery strategy**: `exception-ok`
- **Chain strategy**: `size-exception`
- **Justification**: Slice S1 is the foundational architectural milestone for stable identities across cogNNitive. It touches type contracts, serialization, addressing grammar, graph normalization, mutation engine, validator diagnostics, Vue editor guards, and normative specs. Splitting into partial PRs would break cross-package type checks and exhaustive dispatch guards (`exhaustiveUnitKind.test.ts`).

---

## 2. Engineering Conventions & TDD Protocol

- **Strict TDD Order**: Every task sequence strictly follows:
  1. **RED**: Write or update failing unit test fixture. Run test command and verify clean failure.
  2. **GREEN**: Implement minimal production change to satisfy contract. Run test command and verify green.
  3. **VERIFY**: Run related suite and typecheck.
  4. **REFACTOR**: Clean up, adhere to code standards, and ensure no regressions.
- **Paths**: Repo-root relative.
  - Core: `iNNfo/packages/innfo-core`
  - MCP: `iNNfo/packages/innfo-mcp`
  - Editor: `iNNfo/apps/innfo-editor`
  - Upgrade skill: `skills/nn-upgrade`
- **Primary Test Commands**:
  - Core: `npm --workspace=@cognnitive/innfo-core test`
  - MCP: `npm --workspace=@cognnitive/innfo-mcp test` (requires fresh `innfo-core` build)
  - Editor: `npm --workspace=@cognnitive/innfo-editor test`
  - Skills: `node --test skills/nn-upgrade/scripts`
  - Full Gate: `node scripts/check-integrity.js`
- **NodeNext Imports**: Relative imports in `innfo-core` must carry explicit `.js` extensions.
- **Legacy Quarantine**: Any legacy fallback logic must carry the marker `legacy:lineage-reference-name-fallback` matching its entry in `legacy-ledger.yaml`.
- **Exhaustive Dispatch**: All switches on `KnowledgeUnit.kind` must exhaustively handle `header`, `row`, `pointer`, `element`, `matrix`, terminating with `assertNever`.

---

## 3. Hierarchical Implementation Tasks

### Phase 1: Core Type Contracts, Frontmatter Allow-List & Serializer

**Focus**: Establish types for `model_slug`, `workspace_id`, concept/matrix slugs, and serializer allow-list.  
**Files**:
- `iNNfo/packages/innfo-core/src/types/parser.ts`
- `iNNfo/packages/innfo-core/src/parser/serializer.ts`
- `iNNfo/packages/innfo-core/tests/serializer.test.ts` (or `parser.test.ts`)

- [ ] **1.1 Unit Tests (RED)**: Write unit tests in `iNNfo/packages/innfo-core/tests/` verifying:
  - [ ] 1.1.1 Frontmatter parsing preserves optional `model_slug` and `workspace_id` in `SpecFrontmatter`.
  - [ ] 1.1.2 Serialization with `serializeKnowledge` (`useRawFrontmatter: false`) retains `model_slug` and `workspace_id` in emitted YAML block (D4).
  - [ ] 1.1.3 Element serialization emits `slug:: <slug>` when `slugExplicit === true` (D1).
  - [ ] 1.1.4 Concepts and matrix definitions parse explicit `slug` declarations.
- [ ] **1.2 Type Contracts (GREEN)**:
  - [ ] 1.2.1 Update `SpecFrontmatter` in `iNNfo/packages/innfo-core/src/types/parser.ts` with `model_slug?: string` and `workspace_id?: string`.
  - [ ] 1.2.2 Update `Concept` and `MatrixDecl` interfaces with optional `slug?: string`.
  - [ ] 1.2.3 Ensure `ElementNode` exposes `slug?: string` and `slugExplicit?: boolean`.
- [ ] **1.3 Serializer Emission (GREEN)**:
  - [ ] 1.3.1 In `iNNfo/packages/innfo-core/src/parser/serializer.ts`, update frontmatter reconstruction allow-list (lines 171–215) to emit `model_slug` and `workspace_id`.
  - [ ] 1.3.2 In `serializeKnowledge`, ensure elements with explicit/frozen slugs emit `slug:: ${node.slug}` directly under element declaration.
- [ ] **1.4 Verification & Refactor**:
  - [ ] 1.4.1 Run `npm --workspace=@cognnitive/innfo-core test` to confirm Phase 1 tests pass.
  - [ ] 1.4.2 Verify round-trip formatting preserves indentation and property ordering.

---

### Phase 2: Addressing Grammar & Universal Citation Resolution in `sourceRef.ts`

**Focus**: Extend `@` addressing grammar to support `model_slug@element-slug`, field subunits, and matrix cell coordinates.  
**Files**:
- `iNNfo/packages/innfo-core/src/sourceRef.ts`
- `iNNfo/packages/innfo-core/src/unitResolve.ts`
- `iNNfo/packages/innfo-core/src/console/citations.ts`
- `iNNfo/packages/innfo-core/src/validator/workspaceSources.ts`
- `iNNfo/packages/innfo-core/tests/sourceRef.test.ts`
- `iNNfo/packages/innfo-core/tests/exhaustiveUnitKind.test.ts`
- `iNNfo/packages/innfo-core/tests/fixtures/exhaustive/ok.ts`
- `iNNfo/packages/innfo-core/tests/fixtures/exhaustive/missing-case.ts`
- `iNNfo/apps/innfo-editor/src/components/editor/FilePreviewModal.vue`

- [ ] **2.1 Addressing Tests (RED)**: Write tests in `iNNfo/packages/innfo-core/tests/sourceRef.test.ts` verifying:
  - [ ] 2.1.1 `parseCitation("model-slug@element-slug")` parses as `kind: 'model'` with `ElementUnit` (`kind: 'element'`, `slug: 'element-slug'`) (D5).
  - [ ] 2.1.2 `parseCitation("model-slug@element-slug&field_name")` parses as `ElementUnit` with `subunits: ['field_name']`.
  - [ ] 2.1.3 `parseCitation("model-slug@matrix-slug&row&col")` parses as `MatrixUnit` (`kind: 'matrix'`, `matrixSlug: 'matrix-slug'`, `rowSlug: 'row'`, `colSlug: 'col'`).
  - [ ] 2.1.4 `serializeKnowledgeUnitRef` round-trips `ElementUnit` and `MatrixUnit` back to valid strings.
  - [ ] 2.1.5 Backwards compatibility: `.md@## Heading`, `.csv@42`, and `.json@/pointer` parse identically to existing behavior.
- [ ] **2.2 Exhaustive Typecheck Tests (RED)**:
  - [ ] 2.2.1 Update `tests/fixtures/exhaustive/ok.ts` with all 5 unit kinds (`header`, `row`, `pointer`, `element`, `matrix`).
  - [ ] 2.2.2 Update `tests/fixtures/exhaustive/missing-case.ts` to assert compile failure if `element` or `matrix` is unhandled.
  - [ ] 2.2.3 Verify `exhaustiveUnitKind.test.ts` asserts red until all dispatches are implemented.
- [ ] **2.3 Grammar Implementation (GREEN)**:
  - [ ] 2.3.1 Define `ElementUnit` and `MatrixUnit` interfaces in `src/sourceRef.ts`; expand `KnowledgeUnit` union to 5 kinds.
  - [ ] 2.3.2 Update `resolveUnitPath` to recognize extension-less `model_slug` matching `^[a-z0-9]+(?:-[a-z0-9]+)*$` and assign `kind: 'model'`.
  - [ ] 2.3.3 Update `parseKnowledgeUnitRef` to split model slug citations into `ElementUnit` and `MatrixUnit`.
  - [ ] 2.3.4 Update `serializeKnowledgeUnitRef` and `unitLabel` to handle `element` and `matrix` kinds.
- [ ] **2.4 Exhaustive Dispatches (GREEN)**:
  - [ ] 2.4.1 Update `src/unitResolve.ts` with `element` and `matrix` cases.
  - [ ] 2.4.2 Update `src/console/citations.ts` with `element` and `matrix` cases.
  - [ ] 2.4.3 Update `src/validator/workspaceSources.ts` with `element` and `matrix` cases.
  - [ ] 2.4.4 Update `iNNfo/apps/innfo-editor/src/components/editor/FilePreviewModal.vue` with `element` and `matrix` cases.
- [ ] **2.5 Verification & Refactor**:
  - [ ] 2.5.1 Run `npm --workspace=@cognnitive/innfo-core test` including `exhaustiveUnitKind.test.ts`. Confirm 100% green.

---

### Phase 3: Mutate Engine Slug Immutability & `freeze_slugs` (`mutate.ts`)

**Focus**: Preserve slugs on rename, decouple model-wide display names, and implement atomic model slug freezing.  
**Files**:
- `iNNfo/packages/innfo-core/src/mutate.ts`
- `iNNfo/packages/innfo-core/tests/mutate.test.ts`

- [ ] **3.1 Mutation Tests (RED)**: Write unit tests in `iNNfo/packages/innfo-core/tests/mutate.test.ts` verifying:
  - [ ] 3.1.1 `rename_element` updates display name while leaving `element.slug` untouched and immutable (D1).
  - [ ] 3.1.2 `rename_element` allows renaming to a display name that matches an element in a *different* concept within the same model (D3).
  - [ ] 3.1.3 `freeze_slugs` assigns unique, deterministic slugs derived via `uniqueSlugify` to all unfrozen elements and sets `slugExplicit = true` (D19).
  - [ ] 3.1.4 Calling any mutation on a model containing unfrozen elements automatically triggers `freeze_slugs` before applying the mutation.
- [ ] **3.2 Rename Hygiene Implementation (GREEN)**:
  - [ ] 3.2.1 In `src/mutate.ts`, delete line 578 (`element.slug = undefined`).
  - [ ] 3.2.2 In `src/mutate.ts`, replace global display name check (lines 561–569) with concept-scoped sibling uniqueness check.
  - [ ] 3.2.3 In `add_element`, replace global display name check with concept-scoped sibling check; validate slug uniqueness.
- [ ] **3.3 Slug Freezing Implementation (GREEN)**:
  - [ ] 3.3.1 Implement `freeze_slugs(model: ParsedKnowledge): MutationResult` in `src/mutate.ts`.
  - [ ] 3.3.2 Wire mutation dispatcher in `mutate.ts` to inspect target model and auto-invoke `freeze_slugs` if any element has `!el.slugExplicit`.
- [ ] **3.4 Verification & Refactor**:
  - [ ] 3.4.1 Run `npm --workspace=@cognnitive/innfo-core test` to confirm mutation and freeze behavior.

---

### Phase 4: Normalization & Identity Registry Reversing R-IE-02 (`normalize.ts`, `identity.ts`)

**Focus**: Eliminate destructive model-wide element dropping and allow identical display names across distinct concepts.  
**Files**:
- `iNNfo/packages/innfo-core/src/recursiveParser/normalize.ts`
- `iNNfo/packages/innfo-core/src/identity.ts`
- `iNNfo/packages/innfo-core/tests/normalize.test.ts` (or `recursiveParser.test.ts`)

- [ ] **4.1 Normalization Tests (RED)**: Write unit tests verifying:
  - [ ] 4.1.1 Model with identical element names under two distinct concepts (`Product/Name` and `Vendor/Name`) retains both elements in normalized graph (reversing R-IE-02).
  - [ ] 4.1.2 Sibling elements with duplicate display names under the *same* concept are rejected with a duplicate sibling error.
  - [ ] 4.1.3 Both cross-concept elements receive distinct qualified IDs in `IdentityRegistry`.
- [ ] **4.2 Reverse R-IE-02 Dropping (GREEN)**:
  - [ ] 4.2.1 In `src/recursiveParser/normalize.ts`, delete `modelWideElementNames = new Set<string>()` and lines 187–191.
  - [ ] 4.2.2 Scope sibling name uniqueness checks strictly to parent concept.
  - [ ] 4.2.3 Ensure `qualifiedIdByElementName` or node registration supports distinct qualified IDs per concept hierarchy.
- [ ] **4.3 Identity Registry Adaptation (GREEN)**:
  - [ ] 4.3.1 In `src/identity.ts`, verify `IdentityRegistry` accommodates sibling-scoped naming without global key collision.
- [ ] **4.4 Verification & Refactor**:
  - [ ] 4.4.1 Run normalization test suites and ensure all graph nodes are cleanly created and linked.

---

### Phase 5: Reference Resolution, Diagnostics & Legacy Ledger (`validator/references.ts`, `validator/knowledge-checks.ts`, `legacy-ledger.yaml`)

**Focus**: Resolve references slug-first with name fallback, add ambiguity and slug diagnostics, and register legacy ledger.  
**Files**:
- `iNNfo/packages/innfo-core/src/validator/references.ts`
- `iNNfo/packages/innfo-core/src/validator/knowledge-checks.ts`
- `legacy-ledger.yaml`
- `iNNfo/packages/innfo-core/tests/validator/references.test.ts`
- `iNNfo/packages/innfo-core/tests/validator/knowledge-checks.test.ts`

- [ ] **5.1 Reference & Diagnostic Tests (RED)**: Write unit tests verifying:
  - [ ] 5.1.1 Structural references and wikilinks `[[target]]` match element slugs before falling back to display names (D6).
  - [ ] 5.1.2 When display name fallback resolves to > 1 element across concepts, emit `AMBIGUOUS_ELEMENT_NAME` warning/error and halt binding.
  - [ ] 5.1.3 Two elements in the same model with identical slugs emit `DUPLICATE_SLUG` error diagnostic.
  - [ ] 5.1.4 Level-3 model containing elements lacking `slugExplicit` emits `UNFROZEN_MODEL` warning diagnostic.
  - [ ] 5.1.5 Name fallback path records marker `legacy:lineage-reference-name-fallback` (D16).
- [ ] **5.2 Reference Resolution & Ambiguity Guard (GREEN)**:
  - [ ] 5.2.1 In `src/validator/references.ts`, implement 3-tier precedence: exact slug -> exact name fallback -> normalized name fallback.
  - [ ] 5.2.2 Emit `AMBIGUOUS_ELEMENT_NAME` when name fallback matches multiple elements across concepts.
  - [ ] 5.2.3 Mark name fallback code with `legacy:lineage-reference-name-fallback`.
- [ ] **5.3 Diagnostic Checks (GREEN)**:
  - [ ] 5.3.1 In `src/validator/knowledge-checks.ts`, add check for duplicate element slugs emitting `DUPLICATE_SLUG` error.
  - [ ] 5.3.2 In `src/validator/knowledge-checks.ts`, add check emitting `UNFROZEN_MODEL` warning on Level-3 models with unfrozen elements.
- [ ] **5.4 Legacy Ledger Registration (GREEN)**:
  - [ ] 5.4.1 Register `lineage-reference-name-fallback` entry in `legacy-ledger.yaml`.
  - [ ] 5.4.2 Run `node scripts/lib/legacy-ledger-guard.js` and verify zero discrepancies.
- [ ] **5.5 Verification & Refactor**:
  - [ ] 5.5.1 Run `npm --workspace=@cognnitive/innfo-core test` to confirm all validation suites pass.

---

### Phase 6: Vue Editor Read-Only Guard (D18 in `innfo-editor/src/stores/workspaceStore.ts` & UI)

**Focus**: Block mutation and persistence of Level 3 kNNowledge documents in `innfo-editor` per decision D18.  
**Files**:
- `iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts`
- `iNNfo/apps/innfo-editor/src/components/layout/` / editor toolbar
- `iNNfo/apps/innfo-editor/tests/stores/workspaceStore.test.ts`

- [ ] **6.1 Editor Guard Tests (RED)**: Write unit tests in `iNNfo/apps/innfo-editor/tests/` verifying:
  - [ ] 6.1.1 `saveActiveFile` throws error with D18 message when active document is Level 3 kNNowledge model (`role === 'knowledge'` or `level === 3`).
  - [ ] 6.1.2 `saveActiveFileWithVersionBump` throws error with D18 message for Level 3 models.
  - [ ] 6.1.3 Level 1 specifications and Level 2 bluepriNNt templates save normally without error.
- [ ] **6.2 Store Guard Implementation (GREEN)**:
  - [ ] 6.2.1 In `iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts`, add Level 3 check throwing:
    `"kNNowledge models are read-only in the Vue editor per architectural decision D18. Please use agent-assisted changesets."`
  - [ ] 6.2.2 Expose `isReadOnlyActiveDocument: computed(() => ...)` in `workspaceStore`.
- [ ] **6.3 UI Banner / Badge (GREEN)**:
  - [ ] 6.3.1 Render a read-only badge/banner in the editor toolbar/header when `isReadOnlyActiveDocument` is true.
  - [ ] 6.3.2 Disable mutation controls for Level 3 documents.
- [ ] **6.4 Verification & Refactor**:
  - [ ] 6.4.1 Run `npm --workspace=@cognnitive/innfo-editor test` and verify editor test suite passes.

---

### Phase 7: Specification Bump, Scaffolding Repin & Tooling (`iNNfo_V_0-4-0_NN.md`, `init-knowledge.ts`, `skills/nn-upgrade`)

**Focus**: Author `iNNfo_V_0-4-0_NN.md`, update MCP init tooling, and add workspace domain-wide slug freeze migration.  
**Files**:
- `iNNfo/specs/iNNfo_V_0-4-0_NN.md`
- `iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts`
- `skills/nn-upgrade/scripts/migrate-domain.js`
- `skills/nn-upgrade/scripts/test/migrate-domain.test.js` (or related test)

- [ ] **7.1 Tooling & Migration Tests (RED)**: Write tests verifying:
  - [ ] 7.1.1 `init-knowledge` outputs `spec_version: "V_0-4-0"` with `model_slug` frontmatter.
  - [ ] 7.1.2 `skills/nn-upgrade` migration routine scans workspace Level-3 models and freezes all unfrozen slugs in place.
- [ ] **7.2 Normative Spec Authoring (GREEN)**:
  - [ ] 7.2.1 Create `iNNfo/specs/iNNfo_V_0-4-0_NN.md` based on `V_0-3-0`.
  - [ ] 7.2.2 Update Principle 5 to "Stable identity via immutable slugs" (D1).
  - [ ] 7.2.3 Document `model_slug`, explicit element/concept/matrix slugs, and `@` addressing grammar.
- [ ] **7.3 Scaffolding Repin (GREEN)**:
  - [ ] 7.3.1 Repin `iNNfo/packages/innfo-mcp/src/tools/init-knowledge.ts` to `iNNfo_V_0-4-0_NN.md` and `V_0-4-0`.
- [ ] **7.4 Domain-Wide Slug Freezing Tooling (GREEN)**:
  - [ ] 7.4.1 In `skills/nn-upgrade/scripts/migrate-domain.js`, implement `freeze-domain-slugs` routine to traverse models and run `freeze_slugs`.
- [ ] **7.5 Verification & Refactor**:
  - [ ] 7.5.1 Run `node --test skills/nn-upgrade/scripts` or relevant test suite.

---

### Phase 8: Verification & Integrity Gate Run (`npm test`, `check-integrity.js`)

**Focus**: Rebuild mirrors, execute all workspace suites, run legacy ledger guard, and verify full integrity gate.  
**Files**:
- All workspace packages and scripts

- [ ] **8.1 Mirror & Primitive Builds**:
  - [ ] 8.1.1 Build `innfo-core` distribution: `npm --workspace=@cognnitive/innfo-core run build`.
  - [ ] 8.1.2 Regenerate core and preflight mirrors if applicable: `node scripts/build-trannsform-core-mirror.mjs`, `node scripts/build-preflight-primitives.mjs`.
  - [ ] 8.1.3 Synchronize versions if applicable: `node scripts/sync-versions.mjs --check`.
- [ ] **8.2 Multi-Package Test Suite**:
  - [ ] 8.2.1 Run Core tests: `npm --workspace=@cognnitive/innfo-core test`.
  - [ ] 8.2.2 Run MCP tests: `npm --workspace=@cognnitive/innfo-mcp test`.
  - [ ] 8.2.3 Run Editor tests: `npm --workspace=@cognnitive/innfo-editor test`.
- [ ] **8.3 Lint & Typecheck**:
  - [ ] 8.3.1 Run `npm run typecheck`.
  - [ ] 8.3.2 Run `npm run typecheck:scripts`.
  - [ ] 8.3.3 Run `npm run lint`.
- [ ] **8.4 Deterministic Integrity Gate**:
  - [ ] 8.4.1 Run `node scripts/lib/legacy-ledger-guard.js`.
  - [ ] 8.4.2 Run `node scripts/check-integrity.js` and verify all groups (0–4, 7+) pass cleanly.
