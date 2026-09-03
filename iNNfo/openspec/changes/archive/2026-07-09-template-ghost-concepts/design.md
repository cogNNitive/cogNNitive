# Design: Template Ghost Concepts

## Technical Approach

Compute ghost concepts by diffing `metamodelStore.concepts` (all template concepts) against the set of concept types with live instances in `modelStore.nodes`, using type-specific presence detection. Render them as ghost-group `VirtualGroupNode` instances in `LeftSidebar.vue`, controlled by a 3-state filter toggle backed by `uiStore.ghostFilterMode`. Add action creates the first element node via `modelStore.createChild`.

References: R-TGC-01 through R-TGC-05, R-TN-04 (modified), R-TN-08.

## Architecture Decisions

| Option | Tradeoffs | Decision |
|--------|-----------|----------|
| Ghost data source: `metamodelStore` computed vs. standalone composable | Composable = cleaner separation; computed = follows existing pattern (metamodelStore already cross-refs modelStore) | **`metamodelStore` computed** — `ghostConcepts` |
| Presence detection: inline vs. pure utility function | Inline = less files; utility = testable without store instantiation | **Pure utility** in `apps/innfo-editor/src/utils/ghostDetection.ts` |
| Ghost group rendering: new component vs. prop on VirtualGroupNode | New component = DRY violation; prop = cleaner, reuses existing template | **Bool prop `ghost` on VirtualGroupNode** |
| Ghost visuals resolution: from children (existing) vs. from conceptName | Ghost has no children, so existing path (first child look-up) breaks | **Fallback path**: when `ghost` is true, resolve icon/color from `metamodelStore.getConceptByName()` |
| Add action: MCP call vs. local modelStore method | MCP goes through server process (fragile); `modelStore.createChild` works in-graph immediately | **modelStore.createChild** — add `addConceptElement` wrapper that picks the correct root parent |
| Filter state: local ref vs. uiStore property | Local ref = simpler but lost on remount; uiStore = persistent across view switches | **uiStore.ghostFilterMode** — following existing uiStore pattern |

## Data Flow

```
metamodelStore.concepts ──┐
                          ├── ghostDetection.presentConcepts() ──→ ghostConcepts[]
modelStore.nodes ─────────┘                                                │
                                                                           ▼
LeftSidebar.vue ─── filter(ghostConcepts, uiStore.ghostFilterMode)
    │
    ├── Model only:     present groups only (no change)
    ├── Template only:  VirtualGroupNode[ghost=true] for each ghost concept
    └── All:            present groups + ghost groups mixed
                            │
                            ▼
              VirtualGroupNode.vue (ghost=true)
                  ├── opacity: 0.55, dashed border, italic name
                  └── "Add first element" button
                          │
                          ▼
              modelStore.addConceptElement(conceptName, elementName)
                  → createChild(rootId, elementName, conceptName)
                  → tree re-renders → group is no longer ghost
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `apps/innfo-editor/src/stores/metamodelStore.ts` | Modify | Add `ghostConcepts` computed; export `PresentConceptSet` type |
| `apps/innfo-editor/src/utils/ghostDetection.ts` | Create | Pure `isConceptPresent(name, type, nodes, rootIds)` with type-specific rules |
| `apps/innfo-editor/src/stores/uiStore.ts` | Modify | Add `ghostFilterMode` ref (`'model' \| 'template' \| 'all'`), `setGhostFilterMode()` setter |
| `apps/innfo-editor/src/stores/modelStore.ts` | Modify | Add `addConceptElement(conceptName, elementName)` action wrapper |
| `apps/innfo-editor/src/components/layout/VirtualGroupNode.vue` | Modify | Add `ghost` prop; ghost-style header (opacity, dashed border, italic); empty-state indicator; "Add" button |
| `apps/innfo-editor/src/components/layout/LeftSidebar.vue` | Modify | Import ghostConcepts + ghostFilterMode; add filter toggle control; render ghost VirtualGroupNodes |

## Interfaces / Contracts

```typescript
// uiStore additions
ghostFilterMode: Ref<'model' | 'template' | 'all'>
setGhostFilterMode(mode: 'model' | 'template' | 'all'): void

// metamodelStore addition
ghostConcepts: ComputedRef<MetamodelConcept[]> // concepts with zero model instances

// ghostDetection.ts
function isConceptPresent(
  conceptName: string,
  conceptType: ConceptType,
  nodes: Record<string, ModelNode>,
  rootIds: string[],
): boolean

// VirtualGroupNode prop addition
ghost?: boolean  // default false

// modelStore addition
addConceptElement(conceptName: string, elementName: string): string
```

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | `isConceptPresent` — each type rule + edge cases | Vitest; mock nodes with known structure; test `text` (rawSections), `list` (graph nodes), `category` (child presence), empty model |
| Unit | `ghostConcepts` computed | Mount metamodelStore with mocked modelStore; assert correct diff |
| Unit | VirtualGroupNode ghost rendering | Mount component with `ghost=true`; assert computed style (opacity, dashed border) |
| Integration | Filter toggle cycling | Mount LeftSidebar; simulate toggle clicks; assert uiStore.ghostFilterMode transitions `model→template→all→model` |
| Integration | Add action on ghost group | Click "Add" → modelStore.addConceptElement called → group transitions from ghost to present |
| E2E | Full ghost group lifecycle | Playwright; open model with 4 present + 66 ghost concepts; verify "All" shows both, "Model only" hides ghosts, "Template only" shows only ghosts; add element → ghost disappears |

## Migration / Rollout

No migration required. `ghostFilterMode` defaults to `'model'` for backward-compatible behavior (no ghosts shown until user toggles). In-memory state only — no persisted config.

## Open Questions

- [ ] Ghost group "Add" — parent selection: should the element go under the first `sourceMode: 'parsed'` root or under a specific root identified by concept taxonomy position?
- [ ] Visual integration: confirm ghost group border color matches the concept's resolved color even with zero children (resolved via `metamodelStore.getConceptByName()`)
