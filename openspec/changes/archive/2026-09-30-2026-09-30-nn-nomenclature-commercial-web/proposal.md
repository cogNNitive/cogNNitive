# Proposal: Commercial Web Nomenclature Alignment

## Why

The `2026-09-29-nn-level-nomenclature-rename` change migrated the ecosystem's
user-facing vocabulary — `template → bluepriNNt`, `model → kNNowledge`,
`workspace → domaiNN` — across code, specifications, skills and the Docsify
documentation suite. The **commercial site** (`cognnitive.com`) was deliberately
left for a follow-up (the rename's stated risk: "the commercial site uses the
old terms until `nn-nomenclature-commercial-web` ships"). Publishing that site
from the new public repo makes the divergence visible and cheap to fix.

The backlog carried a competing direction (`template → app`), but the shipped
canonical vocabulary is `bluepriNNt`/`kNNowledge`/`domaiNN`; this change
**aligns the public copy to the canonical terms** and retires the competing
item.

## What Changes

- The user-facing entity terms in the public web pages become the canonical
  ones: **bluepriNNt** (was template), **kNNowledge** (was model), **domaiNN**
  (was workspace) — applied only where the word names the *entity*.
- **Structural identifiers stay untouched**: CSS class names
  (`.workspace`, `grid-template-*`), DOM ids (`workspace-modal`,
  `model-tree-box`), JS function names (`openWorkspaceModal`), URL query
  parameters (`?workspace=`, `?model=`), and file/path names in code samples
  that are literally the on-disk paths (`models/*_NN.md` → the real directory is
  `kNNowledge/`). Renaming those would break behaviour, not copy.

## Capabilities

### New Capabilities
- `nomenclature-commercial-web`: the public web copy uses the canonical
  user-facing vocabulary for the three entity terms, while structural
  identifiers (CSS/DOM/JS/URL params) remain unchanged.

## Impact

### Affected areas
- `docs/index.html`, `docs/use-cases.html`, `docs/use-cases.md` — headline and
  body copy.
- `docs/llms.txt`, `docs/ai-index.yaml` — machine-readable summaries.
- Contact/legal/privacy pages — only if they carry an entity term.

### Verification
- A word-boundary scan finds no entity-term occurrence of the deprecated words
  in the copy regions, while CSS/DOM/JS/URL identifiers are unchanged.
- `cognnitive.com` still serves the pages; the editor deep links still resolve.

### Rollback
Revert the commits; copy-only, no format change.

### Out of scope
- Renaming structural identifiers (CSS/DOM/JS/URL params).
- The competing `template → app` direction (retired by decision).
