# Design: Address Prefix Unification & Query Exclusivity Lifting

## Architecture & Data Flow

```
                      Query / Address String
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
   Bare Ref or Address              Scoped Query with ?
   (sourceRef / unitAddress)        (queryUnits.ts)
            │                                     │
   Split at @ / &                   Split at ? first:
   ┌────────┴────────┐              Target = left of ?
   │ Prefix Check:   │              Query  = right of ?
   │ concept:<slug>  │                            │
   │ matrix:<slug>   │              Target has @concept:<slug>?
   │ bare <slug>     │              ┌─────────────┴─────────────┐
   └────────┬────────┘              ▼                           ▼
            │               Whole Model Query           Concept-Scoped Query
            ▼               (filters all elements)      (filters elements of concept)
    Resolved Unit Ref
```

## Detailed Technical Changes

### 1. `sourceRef.ts` (`parseKnowledgeUnitRef`)
- Replace heuristic:
  ```ts
  // DELETE:
  const isMatrix = /^matrix-|-matrix$/.test(unitSlug)
  ```
- Implement prefix parsing matching `unit-address.ts`:
  - Check if `unitPart` starts with `concept:` -> kind `section` / `concept`.
  - Check if `unitPart` starts with `matrix:` -> kind `matrix`.
  - Default (no prefix) -> kind `element`.
- Support subunits (`&row&col` for matrix cells, `&field` for element fields).

### 2. `queryUnits.ts` (`parseKnowledgeQuery` & `runQuery`)
- Remove check at line 53: `if (clean.includes('@')) return null`.
- Parsing sequence:
  1. Find first `?`. Left side is `target`, right side is `filterQuery`.
  2. If `target` contains `@`:
     - Validate that it points to a model + concept (`<modelId>@concept:<slug>`).
     - Record `conceptSlug` in `KnowledgeQuery`.
     - Reject bare element targets with `?` (querying fields inside a single element is redundant; addresses use `&field`).
  3. Right side parses filter segments as before.
- Query execution:
  - When `conceptSlug` is present, `runMarkdownQuery` skips elements that do not belong to heading `# NN Concept: <name>` matching `conceptSlug`.

### 3. OpenSpec Living Specification Delta
- Update `openspec/specs/knowledge-unit-address/spec.md`:
  - Requirement: Citation parser in `sourceRef.ts` accepts explicit prefixes `concept:<slug>` and `matrix:<slug>`.
  - Requirement: Address query syntax allows combining model concept address with query parameters: `<model>@concept:<slug>?<filters>`.
