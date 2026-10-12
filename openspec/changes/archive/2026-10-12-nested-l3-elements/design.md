# Design: Nested Level-3 Elements via Heading Hierarchy

## Technical Approach

Level-3 iNNfo documents disallow `# NN index`, previously requiring flat `# NN <Concept>` sections with H2 headings (`## NN`) and fragile slug prefixes to infer parentage. We introduce Markdown heading nesting (`#{2,6} NN <Concept>: <Name>`), maintaining full backward compatibility.

- **Hierarchical Headings**: Match `UNIFIED_ELEMENT_RE = /^\s*(#{2,6})\s+NN\s+([^:\n]+?):\s+(.*)$/`. Depth 2 (`## NN`) defines top-level elements under `# NN <Concept>`, while depths 3–6 declare nested children.
- **Depth Stack**: In `parseConceptSection`, maintain `headingStack: Array<{ depth: number; concept: string; name: string; slug?: string }>`. When a child heading arrives at depth `d`, pop entries with `depth >= d`. Top of stack becomes `parentElement: { concept, name, slug }`. Record `headingDepth` and `parentElement` on the new `ElementNode`.
- **Concept Compatibility**: Child nodes are partitioned into `elements.get(childConcept)` (e.g. `elements['Layer']` retains all layers), preserving 100% compatibility with all existing consumers.
- **Slug Resolution**: In `deriveElementSlugs`, populate `el.parentSlug` from `el.parentElement.slug` once parent slugs are resolved.
- **Taxonomy Validation**: Validate nesting against the blueprint `# NN index` (`schema.taxonomy`). Disallowed nesting emits `INVALID_NESTED_CONCEPT`.
- **Hierarchical Serialization**: In `serializer.ts`, emit nested elements inline (`### NN <Child>: <Name>`) after their parent's body in `# NN <ParentConcept>`. Skip separate `# NN <ChildConcept>` sections when all instances are nested inline.
- **Explicit Graph & Compiler Binding**: In `normalize.ts` and `remotion-scene-compiler.mjs`, resolve parentage by `parentSlug`/`parentElement` before falling back to slug-prefix heuristics.

## Architecture Decisions

- **AD-1: Flat Concept Buckets with Explicit Parent Metadata**: Keep `ParsedKnowledge.elements` keyed by concept. Represent hierarchy via `parentElement` and `parentSlug` on `ElementNode`, avoiding breaking changes across query APIs, diagnostics, or UI layers.
- **AD-2: Blueprint Taxonomy as Nesting Gatekeeper**: Inline nesting `### NN <Child>` under `## NN <Parent>` must match a direct parent-child edge in `schema.taxonomy`. Non-compliant nesting is rejected (`INVALID_NESTED_CONCEPT`).
- **AD-3: Section Scope Conformance**: In `# NN <SectionConcept>`, depth-2 headings must match `<SectionConcept>`. Headings with depth > 2 may declare any child concept valid per taxonomy.
- **AD-4: Inline Child Serialization**: Serializer emits nested elements under their parent element. Separate `# NN <ChildConcept>` sections are skipped if all elements are inline.

## Data Flow

```mermaid
flowchart TD
    MD[L3 Markdown Source] -->|Unified Regex #{2,6}| PS[parseConceptSection]
    PS -->|Heading Stack| Nodes[ElementNode: parentElement & depth]
    Nodes -->|deriveElementSlugs| Slugs[Resolved parentSlug & slug]
    Slugs --> Val{Validator: hierarchy.ts}
    Val -->|taxonomy match| Valid[Valid Model]
    Val -->|taxonomy mismatch| Err[INVALID_NESTED_CONCEPT]
    Valid --> Norm[normalizeElementsIntoGraph: parentId]
    Valid --> Comp[remotion-scene-compiler: assignLayersToScenes]
    Valid --> Ser[serializeKnowledge: Inline Child Headings]
```

## File Changes

- `innfo-core/src/types/parser.ts`: Add `headingDepth?: number`, `parentElement?: { concept: string; name: string; slug?: string }`, and `parentSlug?: string` to `ElementNode`.
- `innfo-core/src/parser/sections.ts`: Update `UNIFIED_ELEMENT_RE`. Maintain heading stack in `parseConceptSection`, populating `headingDepth`, `parentElement`, and node `type`.
- `innfo-core/src/parser/core.ts`: Route parsed nodes into `elements.get(el.type)`. In `deriveElementSlugs`, assign `el.parentSlug` from `el.parentElement`.
- `innfo-core/src/parser/serializer.ts`: In `emitConceptSection`, emit child elements inline under their parent; omit `# NN <ChildConcept>` when all instances are nested.
- `innfo-core/src/validator/hierarchy.ts` & `knowledge-checks.ts`: Verify `el.parentElement.concept` -> `el.concept` is a direct edge in `schema.taxonomy`; emit `INVALID_NESTED_CONCEPT` if violated. Enforce depth-2 matches section concept.
- `innfo-core/src/recursiveParser/normalize.ts`: Prioritize `el.parentSlug` and `el.parentElement` in `resolveParentQualifiedId` and `resolveActualParentId`.
- `innfo-core/src/merge.ts`: Preserve `parentElement`, `parentSlug`, and `headingDepth` across AST merges.
- `video-script/skills/nn-video-script/scripts/remotion-scene-compiler.mjs`: In `assignLayersToScenes`, bind layers by `layer.parentSlug`/`layer.parentElement` before slug-prefix fallback.
- `video-script/skills/nn-video-script/scripts/lib/knowledge-model.mjs`: Update fallback reader regex and hierarchy stack.

## Interfaces / Contracts

```typescript
export interface ElementNode {
  // Existing fields preserved...
  headingDepth?: number
  parentElement?: { concept: string; name: string; slug?: string }
  parentSlug?: string
}
```

- **Validation Diagnostic**:
  - `code`: `INVALID_NESTED_CONCEPT`
  - `severity`: `error`
  - `path`: `elements.<concept>.<name>`
  - `message`: `Element "<name>" of concept "<child>" cannot be nested under "<parentName>" of concept "<parent>" per blueprint taxonomy.`

## Testing Strategy

- **Parser Unit Tests**: Test multi-depth headings (`### NN`, `#### NN`), verifying `parentElement`, `headingDepth`, and `elements.get(concept)` partitioning.
- **Round-Trip Serialization**: Assert nested documents round-trip byte-identically without emitting redundant `# NN <Child>` sections. Ensure legacy flat documents serialize unchanged.
- **Validator Tests**: Verify `INVALID_NESTED_CONCEPT` on invalid hierarchies (e.g. Scene under Layer) and errors on depth-2 section mismatches.
- **Graph Normalization Tests**: Verify `normalizeElementsIntoGraph` attaches child nodes to parent scene nodes via `parentSlug`.
- **Compiler Tests**: Verify `assignLayersToScenes` binds layers via `parentSlug` even without matching slug prefixes.
- **Merge Tests**: Verify `mergeKnowledge` retains `parentElement` and `parentSlug`.

## Migration / Rollout

1. **Phase 1: Core Engine**: Deploy `innfo-core` updates; 100% backward-compatible with flat syntax.
2. **Phase 2: Compiler & Tooling**: Update `video-script` blueprint and `remotion-scene-compiler.mjs`.
3. **Phase 3: Series Migration**: Migrate `villabotijos-today` templates and scripts to nested syntax.
4. **Phase 4: Verification**: Confirm identical Remotion renders between legacy and nested scripts.

## Open Questions

- None. Grammar, taxonomy validation, AST mapping, serialization, and compiler precedence are strictly specified.
