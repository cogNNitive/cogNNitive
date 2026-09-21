# Design: Semantic AST Merge & Modeler Save Hygiene

## Architecture & Data Flow

```
[ Disk Model (File) ]                    [ Memory Model (UI) ]
         │                                         │
         ▼                                         ▼
   parseModel()                              parseModel()
         │                                         │
         └─────────────► mergeModels() ◄───────────┘
                               │
                               ▼
                       [ Merged AST ]
                               │
                               ▼
                        serializeModel()
                               │
                               ▼
                   [ Write to Disk / Store ]
```

### 1. `mergeModels` Algorithm in `@cognnitive/innfo-core`

Given `disk: ParsedModel` and `memory: ParsedModel`:

#### Frontmatter
- Base frontmatter comes from `disk`.
- If `memory` has a bumped version or updated title, memory takes precedence.

#### Concepts & Elements
- Iterate through all concepts from both models:
  - If a concept only exists in one model, copy its elements as-is.
  - If a concept exists in both models:
    - Index disk elements by name (`diskByName`).
    - Index memory elements by name (`memoryByName`).
    - Start with disk elements in their authored order.
    - For each disk element:
      - If it also exists in memory, merge:
        - `fields`: `{ ...diskEl.fields, ...memoryEl.fields }` (memory overrides disk for overlapping fields).
        - `description`: `memoryEl.description || diskEl.description`.
        - `markers`: `{ ...diskEl.markers, ...memoryEl.markers }`.
        - `tags`: Array deduplication `[...new Set([...(diskEl.tags || []), ...(memoryEl.tags || [])])]`.
        - `rawFields`: merged similarly.
    - Append any elements that exist in `memory` but not in `disk` (new elements created in UI).

#### Matrices & Marker Tables
- For relational matrices:
  - Merge cells map: `Map<string, string>` keyed by `${row}||${col}`.
  - If memory cell is not `'-'`, memory cell wins; else disk cell.
- For `nodeMarkers` (`item-markers matrix`):
  - Merge item markers map per item: `{ ...(diskMarkers[item] || {}), ...(memoryMarkers[item] || {}) }`.
  - Merge `nodeMarkerColumns`: union of columns from both models.

### 2. Level 3 Index Serialization Guard
- In `recursiveSerializer.ts`:
  - When `parsed.frontmatter.level === 3`, `parsed.taxonomy = []`.
- In `serializeModel`:
  - In `emitIndex()`: if `model.frontmatter?.level === 3`, skip index block completely.

### 3. `add_element` Mutation Improvements
- In `addElement`:
  - If `args.fields` is missing, collect all non-reserved keys on `args` into `fields`.
  - Set `previousElement.trailingBlankLine = true` when pushing a new element into `existingElements`.
