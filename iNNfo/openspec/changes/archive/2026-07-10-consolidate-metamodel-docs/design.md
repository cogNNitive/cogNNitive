# Design: Consolidate Metamodel Documentation

## Technical Approach

Consolidate legacy template documentation files into Level-2 template specification files. The editor guidance system will dynamically parse concept details (summaries, methodologies, prompts) from the Level-2 spec's `rawContent`. The validator will enforce documentation completeness. Spec resolution will prioritize local workspace files before network requests.

```
+--------------------------------------------------------------+
|                        Workspace Open                        |
+------------------------------+-------------------------------+
                               |
                               v
               [modelStore.parseFromHandle(handle)]
                               |
                               v
                     [recursiveParse(handle)]
                               |
                               v
             [_resolveParentSpecs(nodes, rootIds)]
                               |
            +------------------+------------------+
            |                                     |
   (If workspace handle)                (If no handle or fallback)
            |                                     |
            v                                     v
[Search local handle specs/]               [HTTP fetch(parentUrl)]
            |                                     |
            v                                     v
    [Read spec file]                      [Download spec file]
            |                                     |
            +------------------+------------------+
                               |
                               v
         [Inject spec as synthetic node spec:parentName]
          - Stored rawContent on synthetic spec node
                               |
                               v
                 [metamodelStore.getConceptGuidance]
                               |
                               v
     [Parse spec rawContent using parseMetamodelDocumentation]
                               |
                               v
              [Render Help/Prompts in Editor]
```

---

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
| :--- | :--- | :--- | :--- |
| **Spec Resolution** | Check active workspace handle `specs/` directory before HTTP fetching. | LocalStorage caching. | Keeps spec versions synchronized with code and works offline. |
| **Guidance Parsing** | Parse directly from the spec's `rawContent` using `parseMetamodelDocumentation`. | Separate documentation markdown files. | Eliminates data drift between schemas and guidance content. |
| **Documentation Validation** | Scan parent spec raw content in core `validateModel` to emit warnings. | CLI-only script or separate UI validator. | Enforces documentation rules across all editor clients, tests, and CLI tools. |

---

## Interfaces & Contracts

### 1. Spec Resolution Local Helper
```typescript
/** Helper to recursively search a directory handle for a spec file matching parentName. */
async function findLocalSpecInHandle(
  dirHandle: DirectoryHandleLike,
  reqName: string
): Promise<string | null>;
```

### 2. Validator Warning Rules
```typescript
interface ValidationError {
  path: string;
  message: string; // e.g. "Concept 'Market' is undocumented in parent template"
  severity: 'warning';
}
```

---

## File Changes

| File Path | Action | Description |
| :--- | :--- | :--- |
| `packages/innfo-core/src/validator/model.ts` | **Modify** | Implement concept H2 and H3 documentation warnings in `validateModel()`. |
| `apps/innfo-editor/src/stores/modelStore.ts` | **Modify** | Update `_resolveParentSpecs` to search local `specs/` first and store raw spec markdown on the synthetic root node. |
| `apps/innfo-editor/src/stores/metamodelStore.ts` | **Modify** | Read guidance from the synthetic spec node `rawContent` in `getConceptGuidance()`. |
| `apps/innfo-editor/src/utils/version.ts` | **Modify** | Update `buildFormatFilename()` to sanitize spaces in baseName into hyphens. |
| `apps/innfo-editor/src/components/editor/ModelInfoPanel.vue` | **Modify** | Add filename previews next to the bump levels in the Version Management panel. |
| `FORMAT/docs/documentation/templates/{business,procedures}/V_0-1-0/documentation.md` | **Delete** | Remove obsolete documentation files. |

---

## Testing Strategy

### Unit & Integration Tests
*   **Validator**: Test `validateModel()` with template specs lacking concept headings or required H3 sections to verify warning emissions.
*   **Version Utils**: Verify `buildFormatFilename()` converts `"My Model"` to `My-Model_V_2-0-0_business_NN.md`.
*   **Store Resolution**: Mock workspace folder handles with `specs/` directory to assert that `_resolveParentSpecs` loads specs locally instead of triggering `fetch()`.

---

## Open Questions

None. The scope, interfaces, and migration path are fully aligned with the requirements.
