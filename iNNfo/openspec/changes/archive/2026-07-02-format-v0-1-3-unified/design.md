# Design: format-v0-1-3-unified

## Technical Approach

Eliminate FILE/FOLDER dichotomy across the entire stack. Parser changes from recursive directory walk to declarative `index.md` entry point. Serializer follows — no tree walk, no `graph_edges` injection. Types, drivers, validators, stores shed all FOLDER-specific paths. Each layer independently verifiable.

## Architecture Decisions

### Remove `Mode` and `StorageMode` types

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep as `'FILE'` union | Future-proofing; adds noise | **Remove** — dead abstraction |
| Keep field as `undefined` | Backward compat | **Remove field from `ModelNode`** — always `'FILE'`, pure noise |

### `index.md` as single entry point

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Fallback if no index.md | Eases transition, hides errors | **No fallback** — error immediately. V_0-1-2 models don't parse |
| Inline model in index.md | Convenient for tiny workspaces | **Not in this change** — index.md declares membership only |

### `normalizeElementsIntoGraph` kept unchanged

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Inline into new parser | DRY violation | **Keep as-is** — tested, mode-agnostic |
| Move location | Cleaner boundaries | **Keep in recursiveParser.ts** — file is being rewritten anyway |

### Delete `driver-folder.ts`, rename `driver-file.ts` → `driver-unified.ts`

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep both, deprecate FOLDER | Less disruptive | **Delete** — dead weight |
| Don't rename file driver | Less churn | **Rename** — `file` no longer contrasts with anything |

### No `graph_edges` injection in serializer

FOLDER nodes serialized relationships as `graph_edges` in frontmatter. With FOLDER removed, this path is dead code. Serializer becomes per-node `serializeNodeContent()` → write.

## Data Flow

```
recursiveParse(root)
  Step 1: Read "index.md" from root handle
    Not found → error
  Step 2: parseModel(indexContent) + parseIndexBlock() → model list (wikilinks)
  Step 3: For each wikilink target → resolve to "name_FORMAT.md"
    parseModel(file)    ← UNCHANGED
    IdentityRegistry.register() ← global uniqueness
    normalizeElementsIntoGraph() ← UNCHANGED
  Step 4: GetCollisions() → issues[] with "Name (Concept)" suggestions
  Return: { nodes, rootIds, issues }

Save: recursiveSerialize(nodes, dirtyIds)
  For each dirty node with rawContent:
    serializeNodeContent() → write file directly
  No tree walk, no driver branching
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/format-core/src/recursiveParser.ts` | **Rewrite** | ~650→~100 lines. Remove `ensureFolderNode`, `parseFolderNode`, `createConceptNode`, `parseFileNode`, `bindConcept`. Keep `normalizeElementsIntoGraph`, `resolveGraphEdgeTarget`, `isNotFound`. |
| `packages/format-core/src/types.ts` | **Modify** | Remove `Mode`, `StorageMode`, `ModelNode.storageMode`, `ValidationReport.mode`, `FolderDriverOptions`, `FolderElement`, `GraphEdge`. `SpecFrontmatter.mode` optional. |
| `packages/format-core/src/driver.ts` | **Modify** | Remove `DriverType`, `FolderDriver` import. `createDriver()` loses type param. |
| `packages/format-core/src/driver-folder.ts` | **Delete** | Entire file. Also `discoverFolder`, `buildElementMap`, `FolderModel`. |
| `packages/format-core/src/driver-file.ts` | **Rename→unified** | `FileDriver`→`UnifiedDriver`. Remove legacy wrappers. |
| `packages/format-core/src/validator.ts` | **Modify** | Remove `mode` param from both validators. Remove all `if (mode === 'FOLDER')` branches. |
| `packages/format-core/src/index.ts` | **Modify** | Remove `discoverFolder`, `buildElementMap` exports. Update driver exports. |
| `apps/format-editor/src/model/recursiveSerializer.ts` | **Rewrite** | ~175→~50 lines. Remove `walkAndWrite`, `graph_edges` injection, driver branching. |
| `apps/format-editor/src/stores/workspaceStore.ts` | **Modify** | Remove `driverType`, mode detection from `open()`. |
| `apps/format-editor/src/stores/modelStore.ts` | **Modify** | Remove `storageMode: parent.storageMode ?? 'FOLDER'` from `createChild`. |
| `apps/format-editor/src/views/WorkspaceView.vue` | **Modify** | Remove `mode` derivation in `runValidation()`. |
| FOLDER fixtures (4 dirs, ~10 files) | **Delete** | `catalog-distributed/`, `folder-model/`, `synthetic-folder*`, `mixed-tree*` |
| `tests/fixtures/catalog-single-file_FORMAT.md` | **Modify** | Rename to remove "single-file" references. |
| `tests/fixtures/workspace-index.md` | **Create** | OKF-compatible workspace index. |
| `tests/fixtures/sample-model_FORMAT.md` | **Create** | Basic V_0-1-3 model. |

## Interfaces / Contracts

```typescript
// REMOVED: Mode, StorageMode, DriverType, FolderElement, FolderDriverOptions

// NEW parser — no mode dispatch
async function recursiveParse(root: DirectoryHandleLike, driver?: UnifiedDriver): Promise<RecursiveParseResult>

// NEW serializer — direct node-to-file, no handle walk
async function recursiveSerialize(nodes: Record<string, ModelNode>, dirtyIds: Set<string>, driver?: UnifiedDriver): Promise<WriteReport[]>

// MODIFIED — no type param
function createDriver(baseUri: string): UnifiedDriver

// MODIFIED — no mode param
function validateFormatContent(content: string, fileName: string): ValidationReport

// ModelNode — storageMode removed
interface ModelNode {
  id: string; name: string; parentId: string | null; childIds: string[];
  type: string; fields: Record<string, FieldValue>; markers: Record<string, number | string>;
  relationships: ModelRelationship[]; rawSections: Record<string, string>;
  rawContent?: string; localMetamodel?: LocalMetamodel;
  kind?: 'root' | 'concept' | 'element';
  conceptBinding?: { name: string; source: 'metamodel' | 'structural' };
  source: { path: string }; sourceMode?: 'parsed' | 'structural'; assets?: string[];
}
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Parser | index.md → correct graph | Fixture + mock handle, verify `nodes`, `rootIds` |
| Parser | Missing index.md → error | Handle without index.md, verify rejection |
| Parser | Name collision → issue with suggestion | Two models sharing element name, verify collision in `issues` |
| Serializer | Dirty node → file written | Mock file handle, verify write content |
| Serializer | No dirty → empty report | Empty dirtyIds |
| Validator | No FOLDER branches remain | Run against valid model, grep checks for FOLDER |
| Roundtrip | Parse → serialize → parse | Structural equivalence verified |
| App | workspaceStore.open() | Loads index.md, populates modelStore |
| App | saveActiveFile() | Correct file written, dirty flags cleared |
| Audit | No FOLDER refs | grep for FOLDER/folder-model/catalog-distributed → 0 hits |

## Migration / Rollout

No migration. V_0-1-2 FOLDER models don't parse under V_0-1-3 by design. Single-file V_0-1-2 models work when wrapped with `index.md`. Rollback: revert each layer's PR independently.

## Open Questions

None. All architecture questions resolved in the proposal phase.
