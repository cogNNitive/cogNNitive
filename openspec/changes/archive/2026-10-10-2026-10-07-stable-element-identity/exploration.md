# Exploration Report: Stable Element Identity (Slice S1)

**Change Target:** `openspec/changes/2026-10-07-stable-element-identity`  
**Slice ID:** `S1` (`stable-element-identity`)  
**Backlog Decisions:** D1, D3, D4, D5, D6, D18, D19  
**Status:** Explored & Ready for Proposal  
**Artifact Mode:** Hybrid (`exploration.md` + Engram `sdd/2026-10-07-stable-element-identity/explore`)

---

## 1. Executive Summary

Slice S1 addresses the fundamental identity model of cogNNitive knowledge graphs. Today, element identity derives strictly from display names (Philosophy 5 of `iNNfo_V_0-3-0`: "One name, one identity"). This causes severe structural flaws:
1. **Renaming destroys identity:** Renaming an element alters its graph node ID, invalidates all citations and references, and in `mutate.ts:578` explicitly wipes `element.slug = undefined`.
2. **Artificial uniqueness constraint (R-IE-02):** Two elements in the same model cannot share a display name, even if they represent the same real-world entity under different concepts (e.g., `Winston Zeddemore` as a `Stakeholder`, `Person`, and `Shareholder`). In `recursiveParser/normalize.ts`, elements violating R-IE-02 are **silently dropped from the graph**, causing silent data loss on document load.
3. **Fragile address resolution:** Graph citations and changeset targets lack a unified, human-readable, immutable address grammar that distinguishes model elements and matrix cells from source file headings and CSV rows.

S1 introduces **immutable slug identity**:
- Every element carries an explicit, immutable `slug::` property; concepts and matrices define slugs in their bluepriNNt declarations.
- Every model carries an immutable `model_slug` and `workspace_id` in frontmatter, preserved by serializer allow-lists.
- Slugs (not names) form graph node identity, reversing R-IE-02 and permitting same-named elements across concepts within a model.
- A new address unit kind in `sourceRef.ts` unifies citations, changesets, and references into `model_slug@slug`, `model_slug@slug&field`, and `model_slug@matrix&row&col`.
- Freezing happens per-model (`freeze_slugs` on first agent mutation, domain-wide in `nn-upgrade`).
- Vue editor becomes read-only for kNNowledge models (D18).
- Normative Level-1 specification bumps to `iNNfo_V_0-4-0` with bluepriNNt version updates.

---

## 2. Architecture & Component-Level Current vs Target State

### 2.1 Frontmatter & Element Primitives (D1, D4)

| Aspect | Current State (`V_0-3-0`) | Target State (S1 / `V_0-4-0`) |
|---|---|---|
| **Model Frontmatter** | Path-based identity. Frontmatter carries `title`, `level`, `parent_spec`, etc. No standard `model_slug`. | Frontmatter requires `model_slug` (extension-less, path-free, unique per domain) and `workspace_id`. |
| **Serializer Allow-list** | `serializer.ts:170-215` drops unknown keys when YAML is rewritten. `model_slug` and `workspace_id` would be lost. | `SpecFrontmatter` and `serializer.ts` explicitly include `model_slug` and `workspace_id` in the serialization allow-list. |
| **Element Identity** | Display name `## NN Concept: Element Name` is the node identity. `slug::` is optional and purely derived. | Every element carries explicit, immutable `slug:: <slug>`. Derived slugs only exist in legacy un-migrated models. |
| **Concept & Matrix Definitions** | BluepriNNts define `# NN Concept Definition: <Name>` without slugs. | BluepriNNt definitions carry explicit `slug:: <concept-slug>` and `slug:: <matrix-slug>`. |
| **Serializer Element Emission** | `serializer.ts:350` emits `slug::` only `if (node.slugExplicit && node.slug)`. | Frozen/explicit elements always emit `slug:: <slug>`. |

### 2.2 Mutation Engine (`mutate.ts:560-600`) (D1, D3)

- **The Bug in `rename_element` (line 578):**
  ```ts
  // CURRENT CODE (mutate.ts:577-578)
  element.name = newName
  element.slug = undefined // <-- Clears slug, forcing re-derivation or losing identity!
  ```
  **Fix:** Under D1, renames modify `element.name = newName` and **never** touch `element.slug`. The slug remains immutable.
- **Model-Wide Uniqueness Check (lines 561-569 & 296-304):**
  ```ts
  // CURRENT CODE
  const existingNames = getKnowledgeWideElementNames(model)
  if (existingNames.has(newName)) return { success: false, errors: [...] }
  ```
  **Target:** Model-wide name uniqueness is repealed. Instead, `addElement` and `renameElement` enforce model-wide **slug uniqueness** (`existingSlugs.has(slug)`). If an `addElement` call provides no slug or an existing model is unfrozen, `freeze_slugs` is invoked or required.

### 2.3 Address Grammar & SourceRef (`sourceRef.ts`) (D5)

Currently, `sourceRef.ts` recognizes three unit kinds:
1. `header`: Markdown headings (`path.md@## Heading`)
2. `row`: CSV rows (`path.csv@row_id`)
3. `pointer`: JSON pointers (`path.json@/pointer`)

All existing kinds require a file extension (`.md`, `.csv`, `.json`). If a path has no extension, `resolveUnitPath` rejects it (`null`).

**New Grammar Extension (D5):**
When the target document has **no extension**, it represents a `model_slug`:
- Element reference: `model_slug@element-slug`
- Field reference: `model_slug@element-slug&field_name`
- Matrix cell reference: `model_slug@matrix-slug&row_slug&col_slug`

```ts
export interface ModelElementUnit {
  kind: 'element'
  slug: string
}

export interface ModelMatrixCellUnit {
  kind: 'matrixCell'
  matrixSlug: string
  rowSlug: string
  colSlug: string
}

export type KnowledgeUnit = HeaderUnit | RowUnit | PointerUnit | ModelElementUnit | ModelMatrixCellUnit
```

- `parseKnowledgeUnitRef`:
  When `@` is present:
  If `doc` has no file extension and is a valid slug (`[a-z0-9]+(?:-[a-z0-9]+)*`), resolve as `kind: 'model'`, `unit: { kind: 'element', slug: unitRaw }`, with subunits parsed as field name or matrix coordinates.
- `serializeKnowledgeUnitRef`:
  Round-trips canonical model addresses: `model_slug@slug`, `model_slug@slug&field`, `model_slug@matrix&row&col`.
- **Exhaustive Unit Dispatch:**
  Update `exhaustiveUnitKind.test.ts` fixtures (`ok.ts`, `missing-case.ts`, `fake-kind.ts`) to maintain 100% compile-time exhaustive switch safety across all consumers.

### 2.4 Graph Normalization & Identity Registry (`normalize.ts`, `identity.ts`) (D3, D6)

| Mechanism | Current State | Target State |
|---|---|---|
| **`IdentityRegistry`** | Tracks sibling names: `register(parentQualifiedId, name)`. Throws `DuplicateNameError` on sibling name collision. | Tracks sibling/model slugs: `register(parentQualifiedId, slug)`. Slugs are unique model-wide. Display names may be identical across different concepts. |
| **`normalize.ts` (lines 172-229)** | Iterates `allElements`. Enforces `modelWideElementNames.has(el.name)`. On collision, emits error and **drops element from graph**. | Enforces `modelWideElementSlugs.has(el.slug)`. Elements with identical display names under different concepts are both registered and retained in the graph. |
| **Qualified ID Structure** | `buildQualifiedId` joins `ParentName/ElementName`. | `buildQualifiedId` joins `ParentSlug/ElementSlug` (or model-unique slug). |
| **Matrix Grid Keys** | `knowledge.ts:155-168` computes cell keys as `matrixName||<rowId>||<colId>` where `rowId` was mapped from `cell.row` (name). | Mapped via slug: headers in `.md` body are slugs; cells map directly to element slugs. Tolerant fallback maps name if slug is not matched. |
| **Reference Resolution** | References in fields resolve against element names. | Reference fields resolve against element slugs. Prose wikilinks resolve against slugs first; fallback to display name. Ambiguous display names generate diagnostics. |

### 2.5 Validation Diagnostics (`knowledge-checks.ts`, `references.ts`) (D3, D6, D19)

1. **Retire R-IE-02:** Remove display name collision as an error. Two elements sharing a name is valid.
2. **`DUPLICATE_SLUG` (Error):** Two elements in the same model have identical `slug::` values.
3. **`UNFROZEN_MODEL` (Warning):** A model contains elements without explicit `slug::` or lacks `model_slug` in frontmatter.
4. **`AMBIGUOUS_ELEMENT_NAME` (Warning):** A prose wikilink `[[Name]]` or legacy name-based reference matches multiple elements with that display name in the model.
5. **Dangling Reference:** Reference fields must resolve to an element slug (or tolerantly to a name under legacy mode).

### 2.6 Slug Freezing & Migration (`freeze_slugs`, `nn-upgrade`) (D19)

- **Why Model-Wide Freezing:** A derived slug (`uniqueSlugify`) appends `-1`, `-2` on collision. If an element is added, renamed, or deleted, sibling suffixes shift unpredictably. Freezing one element at a time cannot guarantee stability. Therefore, freezing must be atomic per model.
- **In-Memory Freeze (`freezeSlugs` in `innfo-core`):**
  When invoked on a `ParsedKnowledge`:
  1. Assigns `model_slug = slugify(frontmatter.title || fileNameWithoutExt)` if missing.
  2. Runs `deriveElementSlugs` with collision resolution.
  3. Sets `slug::` on every element and marks `slugExplicit = true`.
- **Agent Mutation Precondition:** On any mutating agent command, if the target model has unfrozen elements, the agent must first apply `freeze_slugs` as part of the changeset.
- **Domain-wide `nn-upgrade`:** A migration command in `skills/nn-upgrade` scans all models in `kNNowledge/`, freezes slugs in-place, writes backups, journals changes, and runs MCP validation.

### 2.7 Vue Editor Read-Only Status (`innfo-editor`) (D18)

- **Context:** The Vue editor is scheduled for deprecation in S5. Patching its complex internal persistence and state management to support `slug::` authoring is waste.
- **Implementation in S1:**
  1. In `WorkspacePersistenceService.ts:saveActiveFile`, check whether the file being saved has `role === 'knowledge'` / `level === 3`. If so, throw an explicit error: `"kNNowledge models are read-only in innfo-editor. Changes must be proposed via agent chat."`
  2. In `Header.vue` and `WorkspaceView.vue`, detect kNNowledge models and disable the Save button / show a persistent `Read-Only kNNowledge` badge.
  3. Level-2 templates/bluepriNNts retain editing capabilities until editor retirement.

### 2.8 Spec Version Bumps (D3, D5, Write-Once Specs)

- **Normative Level-1 Spec:** Add `iNNfo/specs/iNNfo_V_0-4-0_NN.md`.
  - Replaces Principle 5 ("One name, one identity") with "Stable Slug Identity".
  - Defines `model_slug` and `workspace_id` in Level-3 frontmatter.
  - Specifies `slug::` syntax on elements and root primitive definitions.
  - Documents the `<model_slug>@<slug>&<field>` address grammar.
- **`init-knowledge.ts`:** Update default scaffolded spec version from `iNNfo_V_0-3-0` to `iNNfo_V_0-4-0`.
- **bluepriNNts:** Add `slug::` to Concept and Matrix definitions in canonical bluepriNNts.

---

## 3. Tolerant Read & Legacy Deprecation Strategy (D16)

Existing repositories contain models without `model_slug` and without explicit `slug::` on elements, with wikilinks and reference fields authored using display names.

To maintain backward compatibility during migration:
1. **Tolerant Element Lookup:**
   - Primary: Lookup by `slug`.
   - Secondary (Legacy): If not found by slug, search by lowercase display name.
   - If multiple elements match the name: emit `AMBIGUOUS_ELEMENT_NAME` diagnostic.
2. **Legacy Ledger Entry:**
   - Mark the tolerant fallback in `innfo-core` with `// legacy:tolerant-name-read`.
   - Add entry to `legacy-ledger.yaml` under `tolerant-name-read`.
3. **Migration Path:**
   - `nn-upgrade` freezes slugs in S1.
   - Reference field and matrix header rewriting from names to slugs is planned for S4 (`domain-reference-migration`).

---

## 4. Downstream Impact Analysis & Generated Mirrors

Core changes affect multiple downstream artifacts that must be kept in sync:
1. **`nn-trannsform` Core Mirror:** `node scripts/build-trannsform-core-mirror.mjs` updates `skills/nn-trannsform/scripts/lib/innfo-core.generated.cjs`.
2. **Preflight Primitives:** `node scripts/build-preflight-primitives.mjs` updates `legacy-detect.generated.cjs` and `legacy-migrate.generated.cjs`.
3. **Console Bundles:** `node scripts/build-console-bundle.mjs` and `scripts/build-console-payload.mjs` regenerate `innfo-console.bundle.js` and `console-payload.generated.cjs`.
4. **MCP Bundle:** `node scripts/stage-mcp-bundle.mjs` updates `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`.
5. **Fixtures & Tests:** Ghostbusters and test fixtures with duplicated names (e.g. Winston Zeddemore) should be tested to ensure elements are preserved in the graph without dropping.

---

## 5. Work Unit Decomposition & Implementation Roadmap (Strict TDD)

Slice S1 is partitioned into 6 cohesive units with strict TDD requirements:

### Unit 1: Data Model, Frontmatter & Serializer Allow-List
- **Test:** Test `SpecFrontmatter` parsing and serializing `model_slug` and `workspace_id`. Verify round-trip preserves both fields even when frontmatter is reformatted.
- **Impl:** Update `SpecFrontmatter` type, `serializer.ts` allow-list and frontmatter emit logic.

### Unit 2: Address Grammar & SourceRef Units
- **Test:** Test `parseKnowledgeUnitRef` and `serializeKnowledgeUnitRef` with `model_slug@slug`, `model_slug@slug&field`, and `model_slug@matrix&row&col`. Test `exhaustiveUnitKind.test.ts` fixtures.
- **Impl:** Update `sourceRef.ts` with `ModelElementUnit` and `ModelMatrixCellUnit`, update unit path parsing and serialization.

### Unit 3: Mutation Engine Fixes & Freezing Logic
- **Test:** Test `rename_element` retains `element.slug`. Test `freeze_slugs` mutation freezes all elements in an unfrozen model and adds `model_slug`. Test `addElement` slug collision checks.
- **Impl:** Fix line 578 in `mutate.ts`, implement `freeze_slugs` handler and helper in `innfo-core`.

### Unit 4: Node Identity, Graph Normalization & R-IE-02 Reversal
- **Test:** Test model with two elements having the same display name under different concepts. Verify neither element is dropped from the graph. Test `IdentityRegistry` keyed on slug.
- **Impl:** Refactor `normalize.ts` and `identity.ts` to key node identity and qualified IDs on slugs.

### Unit 5: Validator Diagnostics & Tolerant References
- **Test:** Test `DUPLICATE_SLUG` error, `AMBIGUOUS_ELEMENT_NAME` warning, and `UNFROZEN_MODEL` warning. Test slug-first reference resolution with name fallback.
- **Impl:** Update `knowledge-checks.ts` and `references.ts`. Register tolerant read in `legacy-ledger.yaml`.

### Unit 6: Vue Editor Read-Only & Upgrade Tooling
- **Test:** Test `saveActiveFile` rejection for kNNowledge models in `WorkspacePersistenceService`. Test `nn-upgrade` slug freeze command.
- **Impl:** Add read-only guard in `WorkspacePersistenceService.ts`, UI indicator in `Header.vue`. Add slug freeze migration flow in `skills/nn-upgrade`.
- **Specs & Mirrors:** Create `iNNfo_V_0-4-0_NN.md`, update `init-knowledge.ts`, run mirror builds and `verify.js`.

---

## 6. Verification Plan & Quality Gates

1. **Unit & Spec Tests:**
   - `npm --workspace=@cognnitive/innfo-core test` (all 132+ files passing).
   - `npm --workspace=@cognnitive/innfo-mcp test`.
   - `npm --workspace=@cognnitive/innfo-editor test`.
2. **Mirror Drift & Integrity Checks:**
   - `node scripts/build-trannsform-core-mirror.mjs --check`
   - `node scripts/build-preflight-primitives.mjs --check`
   - `node scripts/build-console-bundle.mjs --check`
   - `node scripts/check-integrity.js`
   - `node scripts/verify.js`
3. **No-Regression Invariant:**
   - Shipped workspaces, sample workspaces, and existing tests continue to parse cleanly under tolerant reading.
