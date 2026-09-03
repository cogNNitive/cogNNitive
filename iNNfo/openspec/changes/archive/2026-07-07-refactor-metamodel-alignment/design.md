# Design: Refactor Metamodel Alignment

## Technical Approach

We will unify model parsing and normalization by extracting the single-model normalization logic from the recursive parser into a reusable function, `normalizeSingleModel`. We will expose it for both Node.js and browser environments. We will then update the URL document loader in the editor to use this function.
To align rendering of concept fields, we will merge the metamodel-defined fields with the node's actual fields dynamically in both `WorkspaceView.vue` and `TreeEditor.vue`, enabling the display of empty fields. Finally, we will remove redundant regex frontmatter parsing from the `Header.vue` layout component and read metadata directly from the Pinia-loaded root node fields.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| **Extract `normalizeSingleModel`** | Exposing internal normalization allows identical structure in URL loading, reducing code duplication. | Extract `normalizeSingleModel` from `parseAndRegisterModel` in `recursiveParser.ts` and export it publicly. |
| **Dynamic field merging in View components** | Merging in the UI components (`WorkspaceView.vue`, `TreeEditor.vue`) preserves the clean serialized representation in files while allowing empty fields to be rendered in forms/sheets. | Perform field merging dynamically via helper functions/computeds inside Vue components using `useMetamodelStore.getConceptFields`. |
| **Direct Pinia read for Header** | Reading directly from `rootNode.fields` avoids regex parser duplication and maintains one single source of truth. | Remove custom regex parser in `Header.vue` and read keys from `rootNode.fields`. |

## Data Flow

Data flow for URL-based loading:
```
  URL (fetch) ──→ Markdown String ──→ normalizeSingleModel() ──→ ModelNodes ──→ useModelStore.setGraph()
```

Data flow for Field Merging in BlockSheet:
```
  ModelNode ──→ getConceptFieldsForNode() ──→ Merged Fields + Metamodel Types ──→ BlockSheet / FieldViewer
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/innfo-core/src/recursiveParser.ts` | Modify | Extract `normalizeSingleModel` helper from `parseAndRegisterModel` and export it. |
| `packages/innfo-core/src/index.ts` | Modify | Re-export `normalizeSingleModel` from `recursiveParser`. |
| `packages/innfo-core/src/browser.ts` | Modify | Re-export `normalizeSingleModel` from `recursiveParser` for the browser bundle. |
| `apps/innfo-editor/src/composables/useUrlDocLoader.ts` | Modify | Replace manual element/node generation with calls to `normalizeSingleModel`. |
| `apps/innfo-editor/src/views/WorkspaceView.vue` | Modify | Merge `getConceptFields` from metamodel store with node's own fields for selected node in computeds. |
| `apps/innfo-editor/src/components/editor/TreeEditor.vue` | Modify | Define `getConceptFieldsForNode` and update `blockFromNode` to dynamically merge metamodel fields per node instance. |
| `apps/innfo-editor/src/components/layout/Header.vue` | Modify | Remove `parseFrontmatter` regex and read metadata directly from root node's fields. |

## Interfaces / Contracts

### `normalizeSingleModel` signature
```typescript
export function normalizeSingleModel(
  content: string,
  refPath: string,
  refName: string,
  identity?: IdentityRegistry,
): { nodes: Record<string, ModelNode>; issues: ParseIssue[] }
```

### Vue component field merge helper
```typescript
const getConceptFieldsForNode = (node: ModelNode) => {
  const metamodelFields = metamodelStore.getConceptFields(node.type)
  const fieldsMap = new Map<string, { name: string; type: string }>()
  
  for (const f of metamodelFields) {
    fieldsMap.set(f.name, { name: f.name, type: f.type })
  }
  if (node.fields) {
    for (const key of Object.keys(node.fields)) {
      if (!fieldsMap.has(key)) {
        fieldsMap.set(key, {
          name: key,
          type: typeof node.fields[key].value === 'boolean' ? 'boolean' : 'string',
        })
      }
    }
  }
  return Array.from(fieldsMap.values())
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `normalizeSingleModel` | Verify parsing matches recursive parser output for single files. |
| Integration | `useUrlDocLoader` | Verify URL loading correctly registers all nodes and fields into model store. |
| E2E / Component | UI field rendering | Verify empty concept fields render correctly in `BlockSheet` view. |

## Migration / Rollout

No migration required. This refactoring aligns rendering and parsing with existing formats.

## Open Questions

None.
