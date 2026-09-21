# Specification: Semantic AST Merge

## Requirements

### R1: Element-Level Union
- `mergeModels(disk, memory)` MUST preserve all elements present on disk in their disk sequence.
- `mergeModels(disk, memory)` MUST append all elements present in memory but not on disk to their respective concept sections.

### R2: Field-Level Merge
- When an element exists in both disk and memory, `mergeModels` MUST merge its `fields` dictionary.
- Fields defined in memory take precedence over fields on disk for the same key.

### R3: Marker & Matrix Cells Union
- `mergeModels` MUST unify `nodeMarkers` and matrix tables.
- Non-empty memory cell values (`!= '-'`) take precedence over disk cells.

### R4: Level-3 Index Suppression
- Level 3 models MUST NOT emit a `# NN index` section during serialization.
