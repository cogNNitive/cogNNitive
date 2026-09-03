# Design: deep-integration

## Technical Approach

One normalized node graph in `apps/format-editor/` (new Vue 3 SPA). `format-core` stays the logical authority: `parseModel`/`serializeModel` (FILE), `discoverFolder` (FOLDER), and `resolveParentChain`/`getSpecForLevel` (metamodel) are reused as-is and applied **recursively across node nesting** rather than once at workspace root. A recursive parser walks the workspace, dispatches each node to its FILE or FOLDER primitive by that node's representation, and emits normalized `ModelNode`s into a single `modelStore` keyed by qualified identity. Each node records its `storageMode`; a recursive serializer writes each node back through the matching primitive, so round-trip is preserved per-node. Metamodel resolution is inherit-from-root + local subtree override, driving which fields/markers a node's form renders. Editing binds resolved fields/markers to the `shared/` widget substrate (Vue port of folder-format's ~40 widgets) and stamps per-field provenance on write. This slice ships model core + navigation + editing; conversion, wikilinks, relationship view editors, rules/workflows, and AI are deferred behind clean seams. Core API stays stable; only additive `format-editor` helpers are introduced.

## Architecture Decisions

| Decision | Options | Tradeoffs | Choice |
|----------|---------|-----------|--------|
| Graph shape | Nested tree of nodes vs flat map + parent refs | Nested is easy to render but painful to look up by qualified id and to normalize provenance/dirty state. Flat map gives O(1) lookup, stable references, easy identity index. | **Flat normalized `Record<qualifiedId, ModelNode>`** + `rootIds[]`; each node holds `childIds[]` and `parentId`. Tree component derives hierarchy from refs. |
| Node identity key | Bare name vs path vs qualified `Parent/Child` | Bare name collides across branches; raw FS path leaks storage mode into identity. Qualified name is human, wikilink-ready, and mode-agnostic. | **Qualified id = ancestor chain joined `Parent/Child`**, sibling name unique; `name` unique among siblings enforced at parse. |
| Node payload | Reuse `ElementNode`/`FolderElement` directly vs new normalized `ModelNode` | Core types differ per mode (FILE `ElementNode`, FOLDER `FolderElement`); using them directly reintroduces the two-model split. | **New `ModelNode`** `{ id, name, qualifiedId, parentId, childIds, storageMode, type, fields, markers, relationships, rawSections, source }` — one shape both drivers normalize into. |
| Storage mode detection | Infer at save vs record at parse | Inferring later loses the round-trip source. | **Record per node at parse**: FILE primitive → `storageMode: 'FILE'`; FOLDER dir with `_FORMAT.md` → `'FOLDER'`. Serializer reads it back. |
| Fractal folder+file | Folder node whose `_FORMAT.md` also has `# _F` sections | A FOLDER node can carry file-structured element sections AND child dirs. | **Parse both**: run `parseModel` on the folder's `_FORMAT.md` for in-file elements, then recurse into child dirs; both feed the same graph under that folder node. |
| Metamodel resolution | New nesting resolver vs reuse spec-chain | Inventing a parallel resolver risks diverging from proven inherit/override semantics. | **Reuse `resolveParentChain`/`getSpecForLevel`**; generalize inward — a subtree's effective metamodel = root-resolved spec merged with that node's local `concepts`/`markers` override. |
| Widget port scope | Port all ~40 now vs fixture-driven subset | Full port balloons the slice. | **Port only widgets exercised by `models/*` fixtures this slice**; unknown types render a **`FallbackWidget`** (raw value + type badge). Track remainder for later PRs. |
| Provenance shape | Global changelog vs per-field stamp | Global log can't answer "who set this field". | **Per-field record** `{ value, author: {kind:'user'\|'ai'\|'system', id}, timestamp }` written on every widget commit. |
| Core changes | Modify core for recursion vs additive helpers in editor | Core API must stay stable per proposal. | **Additive only in `format-editor`.** One unavoidable additive core export if needed: `parseModelSections` seam is already covered by `rawSections`; no core edit planned. |

## Data Flow

```
Open workspace (FS handle, IndexedDB recovery)
        │
        ▼
workspaceStore.open() ── single parse pass ──┐
        │                                     ▼
        │                        recursiveParse(node)
        │                         ├─ FILE  → parseModel(content)        → ModelNode[]
        │                         ├─ FOLDER→ discoverFolder + parseModel → ModelNode[] + recurse dirs
        │                         └─ assign qualifiedId, storageMode, rawSections
        ▼                                     │
   modelStore  ◄── normalized {id → ModelNode}, rootIds
        │                                     │
        ├──────────────► SidebarTree (derives hierarchy from parentId/childIds)
        │                         │ select node
        ▼                         ▼
 resolveMetamodel(node) ── root spec chain + subtree override ──► effective concepts/markers
        │                                     │
        ▼                                     ▼
    NodeForm ── binds fields/markers ──► shared/ widgets ── commit ──► provenance stamp
        │                                                                    │
        ▼  save                                                              ▼
recursiveSerialize(node) ── by storageMode ──┬─ FILE  → serializeModel → writeFile
                                             └─ FOLDER→ per-dir _FORMAT.md write
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/format-editor/package.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/App.vue` | Create | Vue 3 + Pinia + vue-router SPA scaffold; `@cognnitive/format-core: workspace:*`. |
| `apps/format-editor/src/router/index.ts` | Create | Routes + `beforeEach` guard on `workspaceStore.hasHandle`. |
| `apps/format-editor/src/stores/workspaceStore.ts` | Create | FS handle, permissions, IndexedDB handle recovery, single `open()` parse pass. |
| `apps/format-editor/src/stores/modelStore.ts` | Create | Single normalized graph `{ nodes: Record<id,ModelNode>, rootIds }`; selectors, node CRUD, dirty tracking. Replaces the two planned document stores. |
| `apps/format-editor/src/model/types.ts` | Create | `ModelNode`, `Provenance`, `FieldValue` type defs. |
| `apps/format-editor/src/model/recursiveParser.ts` | Create | Walks workspace, dispatches FILE/FOLDER primitive per node, assigns qualified identity + `storageMode`, normalizes into `ModelNode`. |
| `apps/format-editor/src/model/recursiveSerializer.ts` | Create | Projects each node back via its `storageMode` primitive (`serializeModel` / folder writer); preserves `rawSections`. |
| `apps/format-editor/src/model/metamodel.ts` | Create | Wraps `resolveParentChain`/`getSpecForLevel`; resolves effective metamodel inherit-from-root + subtree override per node. |
| `apps/format-editor/src/model/identity.ts` | Create | Qualified-id builder + sibling-uniqueness enforcement + collision diagnostics. |
| `apps/format-editor/src/shared/widgets/` (dir) | Create | Vue port of fixture-exercised widgets + `FallbackWidget`; provenance-stamping commit hook. |
| `apps/format-editor/src/components/SidebarTree.vue`, `NodeForm.vue` | Create | One tree mixing file/folder nodes; metamodel-driven form. |
| `apps/format-editor/tests/roundtrip.spec.ts` | Create | Golden-file parse→serialize on `models/*`. |
| `packages/format-core/*` | Unchanged | Reused as-is; no public API change. |

## Interfaces / Contracts

```ts
type Author = { kind: 'user' | 'ai' | 'system'; id: string };
interface Provenance { author: Author; timestamp: string } // ISO-8601
interface FieldValue { value: unknown; provenance: Provenance }

interface ModelNode {
  id: string;              // qualifiedId, e.g. "Process/Phase/Task"
  name: string;            // unique among siblings
  parentId: string | null;
  childIds: string[];
  storageMode: 'FILE' | 'FOLDER';
  type: string;            // resolved concept type
  fields: Record<string, FieldValue>;
  markers: Record<string, number | string>;
  relationships: { targetId: string; label: string; value?: string | number }[];
  rawSections: Record<string, string>; // round-trip fidelity
  source: { path: string };            // FS location for write-back
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Qualified-id build + sibling collision; metamodel inherit+override matches spec-chain semantics | Vitest against known `models/*` frontmatter. |
| Unit | `storageMode` recorded correctly per node (FILE vs FOLDER vs fractal folder+file) | Vitest with mixed fixtures. |
| Golden | parse → serialize round-trip equal on every `models/*` fixture | Golden-file compare (structure + preserved raw sections) before any UI wiring. |
| Component | NodeForm renders resolved widgets; commit stamps provenance; unknown type → FallbackWidget | Vitest + `@vue/test-utils`, mocked handle. |
| Integration | SidebarTree mixes file+folder nodes from one graph; single parse pass | Mount with Pinia + Router, fake `FileSystemDirectoryHandle`. |
| Regression | `packages/format-core` suite passes unchanged | Run core vitest. |

## Migration / Rollout

No data migration. Work lands in `apps/format-editor/` only; core stays API-stable; sibling `folder-format` React repo is not migrated (widgets ported by hand). Commit per approach step (model types → recursive parser/serializer → metamodel → widget substrate → tree/forms) so each is independently revertible. On-hold `ecosystem-consolidation` artifacts stay as historical reference.

**Deferred seams (explicitly NOT built this slice, left clean):** conversion swaps only a node's `storageMode` + serializer (graph unchanged) — seam is the per-node mode field. Wikilinks resolve against the qualified-id index — seam is `identity.ts`. Relationship view editors are projections of the already-normalized `relationships` — seam is the stored shape. Rules/workflows and AI have no hooks this slice by design.

## Open Questions

- [ ] Folder write-back granularity: rewrite only dirty `_FORMAT.md` files vs all — flag for sdd-tasks (dirty-tracking already in `modelStore`).
- [ ] `serializeModel` reconstructs frontmatter/sections from structured data; confirm golden fixtures tolerate canonical reformatting, else lean harder on `rawSections`/`rawContent` passthrough.
- [ ] Vue Router history mode (hash vs HTML5) for `vite preview`.
