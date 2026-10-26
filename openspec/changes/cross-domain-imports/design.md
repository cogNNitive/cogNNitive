# Design: Cross-DomaiNN Imports

## Overview & Architecture

```
 Origin Domain (e.g. "inbox")               Importer Domain (e.g. "dominio-a")
 ┌─────────────────────────┐                ┌───────────────────────────────────┐
 │ domaiNN_NN.md           │                │ domaiNN_NN.md                     │
 │                         │                │   ## NN Imported Domain: inbox    │
 │ kNNowledge/             │                │     path:: ../inbox               │
 │   noticias_NN.md        │                │   ## NN Import: noticias-a        │
 │     categoria: A, B, C  │                │     from:: inbox>noticias@...     │
 └───────────┬─────────────┘                └─────────────────┬─────────────────┘
             │                                                │
             │ Explicit Scan Trigger ("nn-scan-imports")      │
             └───────────────────────┬────────────────────────┘
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │ 1. Resolve origin path & query  │
                    │ 2. Run queryUnits determinism   │
                    │ 3. Compute projection diff      │
                    └────────────────┬────────────────┘
                                     │
                           Diff not empty?
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │ Propose Refresh Changeset       │
                    │   evidence: origin address      │
                    │   target: snapshot file         │
                    └────────────────┬────────────────┘
                                     │
                             User approves
                                     │
                                     ▼
                    ┌─────────────────────────────────┐
                    │ Writes snapshot projection to:  │
                    │ kNNowledge/imports/inbox/       │
                    │   noticias_NN.md                │
                    └─────────────────────────────────┘
```

## Detailed Specifications

### 1. Domain Declaration Syntax (`domaiNN_NN.md`)

```markdown
## NN Imported Domain: inbox
path:: ../inbox

## NN Import: noticias-a
from:: inbox>noticias@concept:noticias?categoria=A
```

- Grammar:
  - Heading `## NN Imported Domain: <alias>` defines origin alias.
  - Property `path:: <relative-path>` resolves relative to importer's root directory.
  - Heading `## NN Import: <import-name>` defines the local import projection.
  - Property `from:: <alias>><model>@concept:<slug>?<filter>` specifies the source query.

### 2. Snapshot Projection Storage
- File path: `kNNowledge/imports/<alias>/<import-name>_NN.md`.
- Frontmatter:
  ```yaml
  ---
  imported_from: "inbox>noticias@concept:noticias?categoria=A"
  origin_path: "../inbox"
  origin_hash: "<sha256-of-origin-query-result>"
  read_only: true
  ---
  ```
- Content: Contains verbatim Level-3 markdown representing the filtered elements under their concept heading.

### 3. Diffing & Refresh Changeset Generation
- An explicit scan executes `queryUnits(from_address)` on the origin files.
- Generates canonical content for the projection and compares SHA-256 against `origin_hash`.
- If identical: exits cleanly with no changes.
- If diff exists:
  - Generates a standard changeset under `changes/proposed/`.
  - Changeset contains `target:: kNNowledge/imports/<alias>/<import-name>_NN.md`.
  - Sets `evidence:: <origin-address>`.
  - Identifies references in local models pointing to units that left scope and flags them as broken references in the proposed changeset.

### 4. Cross-Domain Citation Resolution & Validation
- Reference format: `<alias>><model>@<slug>` (and `<alias>><model>@<slug>&<field>`).
- Validation:
  - Looks up `<alias>` in `domaiNN_NN.md`.
  - Checks whether the unit exists in `kNNowledge/imports/<alias>/<import-name>_NN.md`.
  - If the unit exists in the origin but NOT in the snapshot, fails validation: `"Unit exists in origin domain but is excluded by import filter"`.
  - Disallows citing snapshots as origins (`isSnapshot(target)` -> validation error `TRANSITIVE_IMPORT_FORBIDDEN`).

### 5. Console Experience
- Console loads `kNNowledge/imports/**` as models with frontmatter attribute `read_only: true`.
- Renders badge `"Imported from <alias>"` on model header and elements.
- Edit actions (modal/form) are disabled, displaying: `"This unit is managed by domain '<alias>'. Edit at origin."` with a link to origin if accessible.
