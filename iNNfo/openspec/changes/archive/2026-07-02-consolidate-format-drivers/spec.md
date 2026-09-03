# Spec: consolidate-format-drivers

> Delta spec for creating a unified `ModelDriver` abstraction, moving the recursive parser to the core library, fixing 15 defects between FILE and FOLDER pipelines, and consolidating duplicated code.

---

## PR 1 â€” Core Abstraction

### Functional Requirements

**FR-1.1**: Create `packages/format-core/src/driver.ts` that exports:

```ts
export type DriverType = 'FILE' | 'FOLDER'

export interface ModelEntry {
  name: string
  uri: string
  kind: 'element' | 'asset' | 'concept'
}

export interface ModelDriver {
  readModel(uri: string): Promise<ParsedModel>
  writeModel(uri: string, model: ParsedModel): Promise<void>
  listChildren(uri: string): Promise<ModelEntry[]>
  listAssets(uri: string): Promise<string[]>
}

export function createDriver(type: DriverType, baseUri: string): ModelDriver
```

**FR-1.2**: Refactor `driver-file.ts` to implement `ModelDriver`:
- `readModel()` â€” calls `parseModel()` on the file content (existing logic)
- `writeModel()` â€” calls `serializeModel()` and writes to file (existing logic)
- `listChildren()` â€” returns taxonomy-derived children from the parsed model
- `listAssets()` â€” returns empty array (FILE mode has no assets)

**FR-1.3**: Refactor `driver-folder.ts` to implement `ModelDriver`:
- `readModel()` â€” reads root `_FORMAT.md`, calls `parseModel()`, walks subdirectories
- `writeModel()` â€” serializes each node's `_FORMAT.md` back to disk
- `listChildren()` â€” returns subdirectories containing `_FORMAT.md`
- `listAssets()` â€” returns non-`_FORMAT.md` files in the directory

**FR-1.4**: Move `apps/format-editor/src/model/types.ts` â†’ `packages/format-core/src/types.ts`:
- `ModelNode`, `StorageMode`, `LocalMetamodel`, `MetamodelConcept`, `MetamodelMarker`, `ModelRelationship`, `FieldValue`, `Author`, `Provenance`
- Keep app-specific type extensions in a thin `apps/format-editor/src/model/types.ts` that re-exports from core and adds app-only types

**FR-1.5**: Move `IdentityRegistry` and `buildQualifiedId` from `apps/format-editor/src/model/identity.ts` â†’ `packages/format-core/src/identity.ts`.

**FR-1.6**: Move `resolveEffectiveMetamodel()` from `apps/format-editor/src/model/metamodel.ts` â†’ `packages/format-core/src/metamodel.ts`.

**FR-1.7**: Move `recursiveParser.ts` from `apps/format-editor/src/model/` â†’ `packages/format-core/src/`:
- Accept optional `ModelDriver` as first param
- When driver is provided, use it instead of raw `DirectoryHandleLike`
- When driver is omitted, keep current behavior (backward compat for any app code not yet migrated)
- Export `recursiveParse()`, `RecursiveParseResult`, `ParseIssue`

**FR-1.8**: Update `packages/format-core/src/index.ts` to export all new symbols and moved modules.

### Non-functional Requirements

**NFR-1.1**: All existing tests must pass unchanged after the refactor.
**NFR-1.2**: The public API of `recursiveParse()` must remain backward-compatible (same params, same return type).
**NFR-1.3**: `createDriver('FILE', uri)` must not walk directories; `createDriver('FOLDER', uri)` must not require a single file.
**NFR-1.4**: A `tsc --noEmit && vitest run` on `packages/format-core/` must pass without any app code.

---

## PR 2 â€” App Wiring & Alignment

### Functional Requirements

**FR-2.1**: Wire `createDriver()` into `workspaceStore.ts`:
- On `open()`, detect storage mode from the handle (directory = FOLDER, file = FILE)
- Call `createDriver(mode, uri)` and store the driver instance
- Pass the driver to `recursiveParse()` and `recursiveSerialize()` instead of raw handles

**FR-2.2**: `recursiveParser.ts` (now in core) operates through `ModelDriver` when provided:
- `parseFileNode()` â†’ `driver.readModel()` + lightweight normalization
- `parseFolderNode()` â†’ `driver.listChildren()` + `driver.readModel()` per child
- Preserve the existing `RecursiveParseResult` contract â€” callers see no change

**FR-2.3**: `recursiveSerializer.ts` (in app) accepts a `ModelDriver` and writes through it:
- `walkAndWrite()` â†’ `driver.writeModel()` per dirty root node
- Nested element nodes (no own file) are skipped as before
- Import `recursiveParser` from `@cognnitive/format-core` instead of local path

**FR-2.4**: Move `validateFormatContent()` and `validateFormatSyntax()` from `apps/format-editor/src/shared/validator.ts` into `packages/format-core/src/validator.ts`:

```ts
// New exports from format-core/validator.ts
export function validateFormatContent(
  content: string,
  fileName: string,
  declaredMode?: string
): ValidationReport

export function validateFormatSyntax(
  content: string,
  mode: 'FILE' | 'FOLDER'
): SyntaxCheck[]
```

**FR-2.5**: Convert `apps/format-editor/src/shared/validator.ts` to a thin re-export:

```ts
import { validateFormatContent } from '@cognnitive/format-core'
export { validateFormatContent }
```

**FR-2.6**: Move `FORMAT_V_0-1-0_FORMAT.md` and `FORMAT_V_0-1-1_FORMAT.md` from `specs/` to `archive/specs/`.

**FR-2.7**: Create `specs/CHANGELOG.md` documenting the changes between versions.

**FR-2.8**: Refactor `docs/spec_consolidation.md`:
- Remove sections that duplicate FORMAT spec content (representation modes, conceptual model, relationship types)
- Keep only: architecture decisions, rationale for unifications, migration plans, repository structure
- Replace duplicated content with references to canonical spec URLs

**FR-2.9**: Add `fidelityWarning` flag to the serializer's write report when a dirty node was serialized through `serializeModel()` (lossy path) vs preserved `rawContent` (lossless path).

**FR-2.10**: In `recursiveParser.ts` `createConceptNode()`, change:

```ts
// Before:
type: 'concept',
// After:
type: 'category',
```

**FR-2.11**: Add `sourceMode` to `ModelNode`:

```ts
export interface ModelNode {
  // ... existing fields ...
  sourceMode?: 'parsed' | 'structural'
}
```

- `createElementNode()` â†’ `sourceMode: 'parsed'`
- `createConceptNode()` â†’ `sourceMode: 'structural'`

**FR-2.12**: Verify that no UI component in format-editor depends on `type: 'concept'` â€” update any that do to check `node.kind === 'concept'` instead.

### Non-functional Requirements

**NFR-2.1**: All validator tests must pass after migration â€” same behavior, different import path.
**NFR-2.2**: `spec_consolidation.md` must be <300 lines after refactor (down from 893).
**NFR-2.3**: `apps/format-editor/src/model/` types are thin re-exports â€” no logic duplication.

---

## PR 3 â€” Data Completeness & Fixes

### Functional Requirements

**FR-3.1**: Extend `ModelNode` â€” add `assets?: string[]` to `ModelNode` in core types:

```ts
export interface ModelNode {
  // ... existing fields ...
  /** Relative paths of physical assets in this node's directory (FOLDER mode only). */
  assets?: string[]
}
```

**FR-3.2**: In `recursiveParser.ts`, after `ensureFolderNode()` creates a node, call `driver.listAssets()` and populate `node.assets`.

**FR-3.3**: In `recursiveParser.ts`, parse `graph_edges` from the `_FORMAT.md` frontmatter and populate `node.relationships`:

```ts
if (parsed.frontmatter.graph_edges) {
  for (const edge of parsed.frontmatter.graph_edges) {
    node.relationships.push({
      targetId: resolveGraphEdgeTarget(edge.target, sourcePath),
      label: edge.label,
      value: edge.weight,
    })
  }
}
```

**FR-3.4**: Implement `resolveGraphEdgeTarget()` â€” resolves relative paths (e.g. `../Queen`) to absolute qualified ids in the graph. Supports `../` for sibling directories, `../../` for ancestor jumps.

**FR-3.5**: In `recursiveSerializer.ts`, serialize `node.relationships` back to `graph_edges` in the `_FORMAT.md` frontmatter before writing:

```ts
// Before writeModel():
if (node.storageMode === 'FOLDER' && node.relationships.length > 0) {
  model.frontmatter.graph_edges = node.relationships.map(rel => ({
    target: resolveQualifiedIdToPath(rel.targetId, node.source.path),
    label: rel.label,
    weight: typeof rel.value === 'number' ? rel.value : undefined,
  }))
}
```

**FR-3.6**: Fix `MatricesGrid.vue` D14 â€” move the matrix `<select>` dropdown outside the `v-else` conditional block so it is visible even when `activeMatrixIndex === -1`:

```vue
<!-- Before: dropdown inside v-else -->
<div v-if="activeMatrixIndex >= 0">
  <select v-model="activeMatrixIndex">...</select>
  <MatrixGrid />
</div>
<div v-else>
  <p>Select a matrix from the sidebar to begin</p>
</div>

<!-- After: dropdown always visible -->
<select v-model="activeMatrixIndex">...</select>
<div v-if="activeMatrixIndex >= 0">
  <MatrixGrid />
</div>
<div v-else>
  <p>Select a matrix from the sidebar to begin</p>
</div>
```

### Non-functional Requirements

**NFR-3.1**: Nodes without `_FORMAT.md` (concept/group nodes) have `assets: undefined`.
**NFR-3.2**: FILE-mode nodes have `assets: undefined` or `[]`.
**NFR-3.3**: Existing `ModelRelationship` interface is reused â€” no new relationship type needed.
**NFR-3.4**: `graph_edges` round-trip must survive parse â†’ edit â†’ serialize â†’ re-parse without data loss.

---

## PR 3b â€” Tests

### Functional Requirements

**FR-T.1**: Create `packages/format-core/tests/driver-folder.test.ts`:
- `discoverFolder()` with valid directory structure
- Discovery of subdirectories with `_FORMAT.md`
- Asset file detection (non-`_FORMAT.md` files)
- Empty directory handling (no `_FORMAT.md`)
- `buildElementMap()` with nested elements

**FR-T.2**: Create `packages/format-core/tests/driver-file.test.ts`:
- `readFileModel()` and `writeFileModel()` round-trip
- `readFileModelSync()` and `writeFileModelSync()` round-trip on minimal model
- Error handling on non-existent file

**FR-T.3**: Create `packages/format-core/tests/recursive-parser.test.ts`:
- Mixed tree with FILE and FOLDER roots
- FOLDER node with `_FORMAT.md` containing taxonomy
- Bare concept directories â†’ `type: 'category'`
- `graph_edges` in frontmatter â†’ populated `ModelRelationship[]`
- Identity collision reporting
- Parse issues for malformed files

**FR-T.4**: Create `packages/format-core/tests/folder-integration.test.ts`:
- Load the `Music_History_V_1-0-0_catalog/` sample through the FOLDER driver
- Assert all elements are discovered (Artists, Albums, Genres)
- Assert assets are listed correctly
- Assert round-trip serialization preserves graph_edges

### Non-functional Requirements

**NFR-T.1**: Tests must run in <30s total.
**NFR-T.2**: FOLDER driver tests must use in-memory fakes, not real filesystem, for speed.
**NFR-T.3**: FR-T.1 and FR-T.2 ship in PR 1. FR-T.3 ships in PR 2. FR-T.4 ships in PR 3.
