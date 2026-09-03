# Design: consolidate-format-drivers

## Technical Approach

Refactor the two existing driver implementations (`driver-file.ts`, `driver-folder.ts`) behind a common `ModelDriver` interface, move the recursive parser (and its dependency chain: types, identity, metamodel resolution) from the Vue app into `packages/format-core`, then fix all derived defects in dependency order across 3 chained PRs.

No new runtime dependencies. No UI changes in PR 1 or PR 2. No framework migrations.

## Architecture Decisions

### Decision: Interface over abstract class for ModelDriver

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Abstract class | Can share base logic (e.g. path normalization) but couples to inheritance hierarchy | âŒ Reject |
| Interface | Structural typing, trivially faked in tests, no coupling | âœ… Adopt |

The interface is kept minimal (4 methods). Shared logic (path joining, file extension checks) lives in standalone helpers.

### Decision: Factory function over DI container

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Dependency injection container | More ceremony, no existing DI in project | âŒ Reject |
| `createDriver(type, uri)` factory | Simple, explicit, easy to swap in tests | âœ… Adopt |

```ts
export function createDriver(type: DriverType, baseUri: string): ModelDriver {
  switch (type) {
    case 'FILE':  return new FileDriver(baseUri)
    case 'FOLDER': return new FolderDriver(baseUri)
  }
}
```

### Decision: `recursiveParser` moves to core, not stays in app

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Keep in app with driver abstraction | App-only, non-browser clients (MCP, CLI) must reimplement | âŒ Reject |
| Move to `format-core` | Single import for all clients, app becomes pure consumer | âœ… Adopt |

The migration path: types â†’ identity â†’ metamodel â†’ recursiveParser move in that dependency order, each as a file move (not rewrite). The app's `model/types.ts` becomes a thin re-export file.

### Decision: `sourceMode` as new field, not storageMode modification

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reuse `storageMode` with new semantics | Risk of breaking existing UI switches | âŒ Reject |
| Add `sourceMode` field | Backward-compatible, explicit intent | âœ… Adopt |

`storageMode` stays as-is (indicates the storage container). `sourceMode` indicates how this specific node was produced (parsed from a `_FORMAT.md` vs structural placeholder).

### Decision: Asset paths as relative strings, not a dedicated store

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Asset content in IndexedDB | Heavy, out of scope | âŒ Reject |
| Asset paths only | Lightweight, driver resolves them. Sufficient for display. | âœ… Adopt |

Assets are stored as relative path strings on `ModelNode.assets`. The driver resolves them to actual files when needed.

### Decision: `spec_consolidation.md` refactored to meta-document, not deleted

The document contains valuable rationale that doesn't belong in a spec (repo structure decisions, migration plans, diff tables). It should be kept but stripped of spec-duplicating content.

### Decision: Validator migration is a move, not a rewrite

The app validator (`validateFormatContent()`, 287 lines) is proven and tested. Moving it into `format-core` is a mechanical relocation plus import path update. No behavior changes.

### Decision: AST parser for byte-fidelity is future work (not in this change)

`serializeModel()` canonical formatting is a known lossy path. The `fidelityWarning` flag (FR-2.9) is a pragmatic intermediate step. A full AST-based parser that preserves trivia (comments, whitespace, field ordering) is the correct long-term solution, but it is a substantial project (~1,500â€“2,000 lines) with its own parser design, AST types, and non-destructive serializer. It belongs in a dedicated SDD change.

## Architecture

### Before

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚          format-editor (Vue)          â”‚
                    â”‚                                      â”‚
                    â”‚  recursiveParser.ts                   â”‚
                    â”‚    â”œâ”€â”€ walks DirectoryHandleLike      â”‚
                    â”‚    â”œâ”€â”€ imports parseModel()           â”‚
                    â”‚    â””â”€â”€ produces ModelNode[]           â”‚
                    â”‚                                      â”‚
                    â”‚  recursiveSerializer.ts               â”‚
                    â”‚    â”œâ”€â”€ walks DirectoryHandleLike      â”‚
                    â”‚    â”œâ”€â”€ parseModel â†’ serializeModel    â”‚
                    â”‚    â””â”€â”€ writes through FileHandleLike  â”‚
                    â”‚                                      â”‚
                    â”‚  types.ts / identity.ts / metamodel.tsâ”‚
                    â”‚  validator.ts (full, 287 lines)       â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚        format-core (library)          â”‚
                    â”‚                                      â”‚
                    â”‚  parser.ts â†â”€â”€ driver-file.ts        â”‚
                    â”‚  (FILE only)     (FileDriver API)    â”‚
                    â”‚                                      â”‚
                    â”‚  driver-folder.ts                     â”‚
                    â”‚    (FolderDriver API â†’ FolderElement) â”‚
                    â”‚                                      â”‚
                    â”‚  validator.ts (minimal, 112 lines)    â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

                    Non-browser clients (MCP, CLI):
                      â†¯ No access to recursiveParser â€” must reimplement
```

### After (PR 1 + PR 2 complete)

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚          format-editor (Vue)          â”‚
                    â”‚                                      â”‚
                    â”‚  recursiveSerializer.ts               â”‚
                    â”‚    â”œâ”€â”€ accepts ModelDriver            â”‚
                    â”‚    â”œâ”€â”€ driver.writeModel(uri)         â”‚
                    â”‚    â””â”€â”€ (+) fidelity warning          â”‚
                    â”‚                                      â”‚
                    â”‚  types.ts (thin re-export from core)  â”‚
                    â”‚  validator.ts (thin re-export)        â”‚
                    â”‚  workspaceStore.ts (creates driver)   â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚  import { recursiveParse }
                               â”‚  import { ModelDriver }
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚        format-core (library)          â”‚
                    â”‚                                      â”‚
                    â”‚  driver.ts â†â”€â”€ ModelDriver interface  â”‚
                    â”‚    â”œâ”€â”€ driver-file.ts implements     â”‚
                    â”‚    â””â”€â”€ driver-folder.ts implements   â”‚
                    â”‚                                      â”‚
                    â”‚  recursiveParser.ts (MOVED from app)  â”‚
                    â”‚    â”œâ”€â”€ accepts ModelDriver            â”‚
                    â”‚    â”œâ”€â”€ driver.readModel(uri)          â”‚
                    â”‚    â”œâ”€â”€ driver.listChildren(uri)       â”‚
                    â”‚    â””â”€â”€ produces ModelNode[]           â”‚
                    â”‚                                      â”‚
                    â”‚  types.ts â† ModelNode + all graph typesâ”‚
                    â”‚  identity.ts â† IdentityRegistry       â”‚
                    â”‚  metamodel.ts â† resolveEffective...   â”‚
                    â”‚                                      â”‚
                    â”‚  parser.ts (FILE parsing, unchanged)   â”‚
                    â”‚  validator.ts (unified, ~350 lines)   â”‚
                    â”‚    â”œâ”€â”€ validateModel() â† existing    â”‚
                    â”‚    â”œâ”€â”€ validateFormatContent() â† new â”‚
                    â”‚    â””â”€â”€ validateFormatSyntax() â† new  â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

                    Non-browser clients (MCP, CLI):
                      import { recursiveParse, createDriver } from '@cognnitive/format-core'
                      const driver = createDriver('FOLDER', '/path/to/model')
                      const { nodes, rootIds } = await recursiveParse(handle, driver)
```

### Flow per operation

**Open workspace (PR 2):**
```
workspaceStore.open(handle)
  â†’ detect mode (handle.kind === 'directory' ? 'FOLDER' : 'FILE')
  â†’ createDriver(mode, handle.name)
  â†’ import { recursiveParse } from '@cognnitive/format-core'
  â†’ recursiveParse(handle, driver)
      â†’ for each root entry:
          driver-driven dispatch (same code path for both modes)
          â†’ driver.readModel(uri) â†’ ParsedModel â†’ normalize â†’ ModelNode
      â†’ enhanced in PR 3:
          driver.listAssets(uri) â†’ populate node.assets
          parse graph_edges â†’ populate node.relationships
  â†’ modelStore.setGraph(nodes, rootIds)
```

**Save changes:**
```
recursiveSerialize(root, nodes, dirtyIds, driver)
  â†’ for each dirty root node:
      if node has relationships (FOLDER mode):
        â†’ inject graph_edges into frontmatter before write (PR 3)
      driver.writeModel(node.source.path, serializeNode(node))
      â†’ fidelity: rawContent preserved? 'exact' : 'canonical' (warning)
```

## Testing Strategy

| Test file | PR | Type | What it covers |
|-----------|----|------|---------------|
| `driver-folder.test.ts` | 1 | Unit (fake FS) | Discovery, assets, empty dirs, nested elements, round-trip |
| `driver-file.test.ts` | 1 | Unit (temp file) | Read/write round-trip, sync/async, error handling |
| `recursive-parser.test.ts` | 2 | Unit (fake handles) | Mixed trees, graph_edges, collisions, concept types |
| `folder-integration.test.ts` | 3 | Integration (real sample) | Music_History + graph_edges round-trip |
| Existing tests (unchanged) | All | Regression | All FILE-mode tests continue passing |

## Backward Compatibility

| Concern | Strategy |
|---------|----------|
| `recursiveParse()` existing callers | Optional `driver` param â€” omitted = old behavior |
| `driver-file.ts` / `driver-folder.ts` old exports | Kept as `@deprecated` wrappers delegating to `ModelDriver` |
| `validateModel()` in format-core | Signature unchanged |
| App `types.ts` | Becomes thin re-export â€” all existing imports keep working |
| App `modelStore.ts` | Imports `recursiveParse` from `@cognnitive/format-core` â€” path change only |
| Non-browser clients (new) | `import { recursiveParse, createDriver } from '@cognnitive/format-core'` |

## File Change Map

### PR 1 â€” Core Abstraction

```
CREATE:
  packages/format-core/src/driver.ts           â† ModelDriver interface + factory

MOVE (from apps/format-editor/src/model/ â†’ packages/format-core/src/):
  types.ts                                     â† ModelNode + all graph types
  identity.ts                                  â† IdentityRegistry
  metamodel.ts                                 â† resolveEffectiveMetamodel
  recursiveParser.ts                           â† accepts optional ModelDriver

MODIFY:
  packages/format-core/src/driver-file.ts       â† implement ModelDriver
  packages/format-core/src/driver-folder.ts     â† implement ModelDriver
  packages/format-core/src/index.ts             â† export new + moved symbols

CREATE (tests):
  packages/format-core/tests/driver-folder.test.ts
  packages/format-core/tests/driver-file.test.ts
```

### PR 2 â€” App Wiring & Alignment

```
MODIFY:
  apps/format-editor/src/model/types.ts         â† thin re-export from core
  apps/format-editor/src/model/recursiveSerializer.ts â† import from core, accept driver
  apps/format-editor/src/stores/workspaceStore.ts   â† createDriver, pass to recursiveParse
  apps/format-editor/src/shared/validator.ts    â† thin re-export from core
  packages/format-core/src/validator.ts         â† add validateFormatContent + validateFormatSyntax
  packages/format-core/src/index.ts             â† export new validator symbols
  apps/format-editor/src/model/recursiveParser.ts â† deleted (moved to core in PR 1)
  docs/spec_consolidation.md                    â† strip duplicated spec content

MOVE:
  specs/FORMAT_V_0-1-0_FORMAT.md               â†’ archive/specs/
  specs/FORMAT_V_0-1-1_FORMAT.md               â†’ archive/specs/

CREATE:
  specs/CHANGELOG.md
  packages/format-core/tests/recursive-parser.test.ts
```

### PR 3 â€” Data Completeness & Fixes

```
MODIFY:
  packages/format-core/src/types.ts             â† add assets, sourceMode
  packages/format-core/src/recursiveParser.ts   â† listAssets + graph_edges read
  apps/format-editor/src/model/recursiveSerializer.ts â† graph_edges write
  apps/format-editor/src/components/MatricesGrid.vue â† D14 fix (dropdown outside v-else)
  packages/format-core/src/validator.ts         â† any additional syntax checks

CREATE:
  packages/format-core/tests/folder-integration.test.ts
```

## Future Work (not in this change)

- **AST parser**: Replace `serializeModel`'s canonical reformatting with a non-destructive AST that preserves trivia (comments, whitespace, field ordering). Requires new parser, AST types, and serializer â€” ~1,500â€“2,000 lines.
- **Asset UI**: Display and manage assets within format-editor.
- **TABLE/CSV driver**: Third storage mode for tabular data with companion `_FORMAT.md`.
- **FOLDER â†’ FILE conversion**: Export a FOLDER model as a single FILE document.
