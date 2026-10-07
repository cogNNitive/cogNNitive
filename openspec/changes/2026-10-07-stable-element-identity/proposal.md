# Proposal: Stable Element Identity (Slice S1)

## Intent

Implement Slice S1 (`stable-element-identity`) of the `stable-identity-and-changesets` architectural initiative, establishing immutable, explicit slug identities for semantic model elements, concepts, and matrices across cogNNitive. This decoupling frees element identities from display names, ensures rename mutations never destroy citations or references, reverses destructive name-collision dropping, and lays the addressing foundation for the changeset-based graph mutation pipeline (S2a–S5).

## Architectural Context & Decisions

This proposal directly implements decisions D1, D3, D4, D5, D6, D18, and D19 established in the architectural grilling session recorded in [`openspec/backlog.md`](file:///d:/Users/lucas/Documents/GitHub/cogNNitive/openspec/backlog.md#L1228-L1250):

| Decision | Summary | Direct Implication in S1 |
|---|---|---|
| **D1** | Every element carries an explicit, immutable `slug::`; concepts and matrices get one in their bluepriNNt definition. Freezing is **per model** (D19). A rename changes the name only, never the slug. | `rename_element` preserves `element.slug`; parsing preserves `slugExplicit`; models are frozen atomically. |
| **D3** | Slugs are unique per model, and the slug (not the name) is the node identity. Two elements may share a display name inside one model across different concepts. Reverses model-wide name-uniqueness (R-IE-02). | Reverse R-IE-02 dropping in `normalize.ts`; allow identical element names across concepts; enforce slug uniqueness per model. |
| **D4** | Each model carries an immutable `model_slug` in frontmatter, extension-less and path-free, unique per domain. Serializer frontmatter allow-list preserves it and `workspace_id`. | Add `model_slug` and `workspace_id` to `SpecFrontmatter` and `serializeKnowledge` allow-list. |
| **D5** | One address grammar for the whole domain, extending citation grammar `<doc>@<unit>&<subunit>` with new unit kinds where `doc` is a `model_slug` (no extension): element `m@el`, field `m@el&field`, matrix cell `m@matrix&row&col`. | Add `ElementUnit` and `MatrixUnit` to `KnowledgeUnit` union in `sourceRef.ts`; resolve extension-less `model_slug` targets. Update `exhaustiveUnitKind.test.ts`. |
| **D6** | Reference fields, matrix row/col headers, and cross-model references are written as slugs. Prose wikilinks resolve slug-first with tolerant name fallback (D16 + legacy ledger). | Slug-first resolution in `references.ts` with legacy fallback tracking. |
| **D16** | Legacy tolerant name-based resolution tracked with `legacy:` marker and registered in `legacy-ledger.yaml`. | Tolerant name fallback annotated with legacy marker; ledger entry created. |
| **D18** | Vue editor (`innfo-editor`) becomes read-only for kNNowledge documents (Level 3 models). | Add read-only guard in `workspaceStore.ts` and UI banner preventing mutations/saves of Level 3 models in the editor. |
| **D19** | Slugs frozen per model on first mutation (`freeze_slugs`), and domain-wide via `nn-upgrade`. Unfrozen models are readable with validator warning (`UNFROZEN_MODEL`), but cannot be mutated without freezing. | Implement `freeze_slugs` operation in `mutate.ts`, `UNFROZEN_MODEL` diagnostic in `knowledge-checks.ts`, and domain freeze script in `skills/nn-upgrade`. |

---

## Detailed Scope & Technical Approach

### 1. Frontmatter Allow-List & Model Types
- **Types (`iNNfo/packages/innfo-core/src/types/parser.ts`)**:
  - Add `model_slug?: string` and `workspace_id?: string` to `SpecFrontmatter`.
  - Add `slug?: string` to `Concept` and `MatrixDecl` interfaces so Level-2 bluepriNNt schemas represent explicit concept and matrix slugs.
- **Serializer (`iNNfo/packages/innfo-core/src/parser/serializer.ts`)**:
  - In `serializeKnowledge`, include `model_slug` and `workspace_id` in the reconstructed frontmatter emission block (lines 171–215) so mutating or re-serializing a model never strips these fields when `useRawFrontmatter` is false.
  - In `serializeKnowledge`, ensure `slug::` is emitted for elements that have an explicit or frozen slug (`slugExplicit === true` or frozen model).

### 2. Element Identity & Reversing R-IE-02
- **Reversing R-IE-02 (`iNNfo/packages/innfo-core/src/recursiveParser/normalize.ts`)**:
  - Remove the destructive model-wide element-name uniqueness check that previously threw an error and dropped valid elements from the graph (`modelWideElementNames.has(el.name)`).
  - Update `IdentityRegistry` (`iNNfo/packages/innfo-core/src/identity.ts`) or node qualification so that elements with identical names under different concepts receive distinct qualified IDs (e.g. `Concept/ElementName` or keyed by slug `slug`).
  - Sibling elements under the same concept still require distinct names (or slugs).
- **Slug Uniqueness per Model**:
  - Check that all element slugs within a model are unique.
  - If two elements declare or derive colliding slugs, detect and register them as collisions.

### 3. Mutate.ts Rename Hygiene
- **`rename_element` (`iNNfo/packages/innfo-core/src/mutate.ts`)**:
  - Remove line 578: `element.slug = undefined`. An element's slug is permanent and immutable (D1).
  - Remove line 567 model-wide name uniqueness rejection. A rename only needs to avoid colliding with siblings in the same concept, or if model-wide display names match, ensure it is permitted per D3.
  - Update references, matrix cells, and taxonomy edges while keeping `element.slug` untouched.

### 4. Grammar & Addressing in `sourceRef.ts`
- **Address Grammar Extensions (`iNNfo/packages/innfo-core/src/sourceRef.ts`)**:
  - Extend `KnowledgeUnit` union with new unit kinds:
    - `ElementUnit`: `{ kind: 'element', slug: string }` representing an element address `model_slug@element-slug` or field `model_slug@element-slug&field_name`.
    - `MatrixUnit`: `{ kind: 'matrix', matrixSlug: string, rowSlug?: string, colSlug?: string }` representing matrix addresses `model_slug@matrix-slug` or matrix cell `model_slug@matrix-slug&row-slug&col-slug`.
  - Extend `resolveUnitPath` / `parseKnowledgeUnitRef` / `parseCitation`:
    - Support document specifiers that lack file extensions when matching a `model_slug` pattern (`[a-z0-9]+(?:-[a-z0-9]+)*`).
    - Parse `<model_slug>@<slug>` into `{ kind: 'model', modelSlug, unit: { kind: 'element', slug } }`.
    - Parse `<model_slug>@<slug>&<field>` into `{ kind: 'model', modelSlug, unit: { kind: 'element', slug }, subunits: [field] }`.
    - Parse `<model_slug>@<matrix>&<row>&<col>` into `{ kind: 'model', modelSlug, unit: { kind: 'matrix', matrixSlug: matrix, rowSlug: row, colSlug: col } }`.
  - Sources (`.md`, `.csv`, `.json`) continue to resolve via today's path-based units without breaking changes.
  - **Exhaustive Unit Dispatch (`iNNfo/packages/innfo-core/tests/exhaustiveUnitKind.test.ts`)**:
    - Update test fixtures `ok.ts` and `missing-case.ts` in `tests/fixtures/exhaustive/` to exhaustively handle the new unit kinds so typecheck and compilation tests remain 100% green.

### 5. References & Wikilinks Resolution
- **Slugs in Structural References (`iNNfo/packages/innfo-core/src/validator/references.ts`)**:
  - Reference fields, matrix row/column headers, and cross-model references may now be written directly as element slugs.
  - Resolution order:
    1. Exact slug match (`element.slug`).
    2. Exact name match (legacy fallback).
    3. Normalized name fallback (legacy separator tolerance).
- **Prose Wikilinks Resolution**:
  - `[[target]]` resolves against element slugs first.
  - If not matched by slug, resolves against element names.
  - If a name resolves to multiple elements across different concepts, emit `AMBIGUOUS_ELEMENT_NAME` diagnostic.
- **Legacy Ledger**:
  - Add `legacy:lineage-reference-name-fallback` marker in `references.ts`.
  - Register the legacy entry in `legacy-ledger.yaml`.

### 6. Diagnostics
- **`DUPLICATE_SLUG` (`iNNfo/packages/innfo-core/src/validator/knowledge-checks.ts`)**:
  - Severity: `error`.
  - Triggered when two elements in the same model have identical slugs.
- **`AMBIGUOUS_ELEMENT_NAME` (`iNNfo/packages/innfo-core/src/validator/references.ts`)**:
  - Severity: `warning` (or `error` for unambiguous resolution requirements).
  - Triggered when a name-based wikilink or reference matches two or more elements that share a display name across concepts.
- **`UNFROZEN_MODEL` (`iNNfo/packages/innfo-core/src/validator/knowledge-checks.ts`)**:
  - Severity: `warning`.
  - Triggered on Level-3 models that contain elements without explicit `slug::` declarations (per D19). Models remain readable, but tools warn that mutation requires freezing first.

### 7. Slug Freezing (`freeze_slugs`)
- **Per-Model Freeze (`iNNfo/packages/innfo-core/src/mutate.ts`)**:
  - Implement `freeze_slugs` mutation operation.
  - Iterates through all elements in the model. Any element missing `slug::` receives its current derived slug (`uniqueSlugify`) explicitly written as `slug:: <derived_slug>`.
  - Sets `element.slugExplicit = true` across the model so the serializer emits them.
  - The first mutation of an unfrozen model automatically applies `freeze_slugs`.
- **Domain-Wide Freeze (`skills/nn-upgrade`)**:
  - Add domain freeze migration routine to `skills/nn-upgrade/scripts/migrate-domain.js` that inspects all Level-3 models in a workspace and freezes slugs systematically.

### 8. Vue Editor Read-Only Guard (D18)
- **Editor Guard (`iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts`)**:
  - Add check in `saveActiveFile`, `saveActiveFileWithVersionBump`, and mutation handlers: if the active document is a Level 3 kNNowledge document (`role === 'knowledge'` or `level === 3`), throw an informative error:
    `"kNNowledge models are read-only in the Vue editor per architectural decision D18. Please use agent-assisted changesets."`
  - Display a prominent read-only badge/banner in the editor UI for Level 3 documents.

### 9. Spec Evolution: `iNNfo_V_0-4-0_NN.md`
- **Spec Bump (`iNNfo/specs/iNNfo_V_0-4-0_NN.md`)**:
  - Create normative specification `iNNfo_V_0-4-0_NN.md` updating Principle 5 from "One name, one identity" to "Stable identity via immutable slugs", documenting `model_slug`, explicit element/concept/matrix slugs, and the `@` addressing grammar.
- **Blueprint Updates & Repin**:
  - Bump core bluepriNNt schemas to include `slug::` where needed.
  - Repin `init-knowledge.ts` to reference `iNNfo_V_0-4-0_NN.md` and `V_0-4-0`.
  - Update sample fixtures and tests.

---

## Capabilities

### New Capabilities
- `stable-element-slugs`: Explicit, immutable `slug::` property support on elements, concepts, and matrices, with serialization and uniqueness validation (`DUPLICATE_SLUG`).
- `model-addressing-grammar`: Extension of `@` addressing syntax to support extension-less `model_slug@slug` and `model_slug@matrix&row&col` units and subunits.
- `slug-freezing-pipeline`: Per-model `freeze_slugs` mutation operation and domain-wide freeze upgrade command in `nn-upgrade`.
- `editor-knowledge-read-only`: Read-only guard in `innfo-editor` for Level 3 kNNowledge models per D18.

### Modified Capabilities
- `element-mutation-hygiene`: `rename_element` preserves element slugs permanently and permits same-name elements across concepts.
- `model-normalization`: Graph normalization (`normalize.ts`) preserves elements sharing display names across distinct concepts without dropping nodes.
- `reference-resolution`: `references.ts` and wikilinks resolve against slugs first, falling back tolerantly to names and emitting `AMBIGUOUS_ELEMENT_NAME` when names collide.
- `frontmatter-serialization`: Serializer allow-list preserves `model_slug` and `workspace_id`.
- `normative-spec`: `iNNfo_V_0-4-0_NN.md` replaces `V_0-3-0` as the current active spec.

---

## Impact & File Surface

- **`iNNfo/packages/innfo-core/`**:
  - `src/types/parser.ts`: `SpecFrontmatter` (`model_slug`, `workspace_id`), `Concept` (`slug`), `MatrixDecl` (`slug`).
  - `src/parser/serializer.ts`: frontmatter allow-list preservation; `slug::` element emission.
  - `src/mutate.ts`: `rename_element` slug preservation; `freeze_slugs` implementation.
  - `src/recursiveParser/normalize.ts`: reverse R-IE-02 dropping; decouple name collisions across concepts.
  - `src/identity.ts`: accommodate cross-concept same-name element registration.
  - `src/sourceRef.ts`: `ElementUnit`, `MatrixUnit`, `model_slug` addressing parser and serializer.
  - `src/validator/knowledge-checks.ts`: `DUPLICATE_SLUG`, `UNFROZEN_MODEL` diagnostics.
  - `src/validator/references.ts`: slug-first reference resolution, `AMBIGUOUS_ELEMENT_NAME` diagnostic, legacy marker.
  - `tests/exhaustiveUnitKind.test.ts` & `tests/fixtures/exhaustive/`: update fixtures for new unit kinds.
- **`iNNfo/packages/innfo-mcp/`**:
  - `src/tools/init-knowledge.ts`: repin to `iNNfo_V_0-4-0_NN.md` and `V_0-4-0`.
- **`iNNfo/apps/innfo-editor/`**:
  - `src/stores/workspaceStore.ts`: read-only guard for Level 3 kNNowledge files per D18.
- **`skills/nn-upgrade/`**:
  - `scripts/migrate-domain.js`: domain-wide slug freeze migration.
- **`iNNfo/specs/`**:
  - `iNNfo_V_0-4-0_NN.md`: new Level 1 normative spec.

---

## Review Line Budget
> [!NOTE]
> An explicit line budget exception was pre-approved by the user due to the foundational, multi-package architectural scope of Slice S1.

---

## Success Criteria & Test Plan

- [ ] **Strict TDD**: All new behaviors (slug preservation, address parsing, diagnostics, freezing, editor read-only guard) have corresponding unit tests written before or in lockstep with implementation.
- [ ] **Rename preservation**: `rename_element` preserves existing `element.slug` without resetting or clearing it.
- [ ] **Non-dropping normalization**: A model with identical element names under two different concepts retains both elements in its parsed graph without error or node dropping.
- [ ] **Frontmatter preservation**: Serializing a model preserves `model_slug` and `workspace_id` in frontmatter even when reconstructed from scratch.
- [ ] **Addressing**: `parseCitation` and `parseKnowledgeUnitRef` correctly parse `model_slug@element-slug`, `model_slug@element-slug&field`, and `model_slug@matrix&row&col`.
- [ ] **Exhaustive tests**: `exhaustiveUnitKind.test.ts` passes compilation checks against the updated `KnowledgeUnit` union.
- [ ] **Diagnostics**:
  - `DUPLICATE_SLUG` is reported when two elements share a slug.
  - `AMBIGUOUS_ELEMENT_NAME` is reported when a wikilink matches multiple elements by name.
  - `UNFROZEN_MODEL` is reported when elements in a Level-3 model lack explicit slugs.
- [ ] **Freeze**: `freeze_slugs` assigns deterministic, unique slugs to all elements in a model and writes explicit `slug::` lines.
- [ ] **Editor Guard**: Attempting to save or mutate a Level-3 model in `innfo-editor` fails safely with the D18 read-only message.
- [ ] **Spec**: `iNNfo_V_0-4-0_NN.md` is present and valid; `init-knowledge.ts` emits `V_0-4-0` documents.
- [ ] Full repository checks (`npm run verify` / `npm test`) pass.
