# Design: Greenfield Domain Setup, Tooling Ergonomics & Agent UX Polish

## Context & Architecture Decisions

This design addresses the findings from the real-world greenfield session log (`VIR-3_Mercedes_NN`). The changes span three architectural components:

```
┌────────────────────────────────────────────────────────┐
│                   Agent Skills & UX                    │
│  - nn-innfo: 2-hop traceability protocol               │
│  - nn-start / nn: Language alignment & abstraction     │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
┌───────────────▼──────────────┐ ┌───────▼───────────────┐
│       Tooling / CLI          │ │      innfo-mcp        │
│  - nn-sources: --in-place    │ │  - update_concept_text│
│  - bootstrapProject()        │ │  - matrix row cascade │
│                              │ │  - accent-folding     │
│                              │ │  - prune_changesets   │
└──────────────────────────────┘ └───────────────────────┘
```

---

## 1. Tooling & CLI: Native In-Place Bootstrap

### Problem
`bootstrapProject` in `skills/nn-sources/scripts/lib/bootstrap.js` calculates:
```javascript
const projectDir = path.join(destParentDir, projectName);
```
When already located inside the target folder, calling this requires setting `destParentDir = '..'` and `projectName = path.basename(process.cwd())`.

### Decision & Contract
Add `options.inPlace` support to `bootstrapProject`:
```javascript
function bootstrapProject(srcDir, destParentDir, projectName, options = {}) {
  const inPlace = Boolean(options.inPlace);
  const projectDir = inPlace 
    ? path.resolve(destParentDir || process.cwd()) 
    : path.join(destParentDir, projectName);
  const effectiveProjectName = inPlace 
    ? path.basename(projectDir) 
    : projectName;
  ...
}
```

CLI flag in `skills/nn-sources/scripts/index.js`:
```bash
node skills/nn-sources/scripts/index.js --bootstrap --in-place [--src <path>]
```
If `--in-place` is passed without `--name` or `--dest`, it initializes the current working directory (`process.cwd()`).

---

## 2. `innfo-mcp`: Narrative Concepts, Matrix Integrity & Lifecycle

### Decision 2.1: Narrative (`text`) Concept Operation
Add operation `update_concept_text` to `propose_changeset`:
```typescript
interface UpdateConceptTextOp {
  op: 'update_concept_text';
  concept: string; // concept name or slug
  text: string;    // narrative markdown content
  sources?: string[]; // optional citations for the change
}
```
**Execution semantics:**
1. Locate `## NN <ConceptName>` section in the Level-3 markdown model.
2. Replace or initialize the prose body directly under the heading (preserving any subheadings declared in the blueprint).
3. Record the operation in the changeset with citation tracking.

### Decision 2.2: Matrix Row Cascade on `remove_element`
When `remove_element` is executed:
1. Remove the element declaration block from `## NN <Concept>`.
2. Inspect all matrix tables in the model (e.g. `## NN Item Markers`, `## NN Matrix: <Name>`).
3. For each table, remove rows whose first cell matches `| [[<ElementName>]]` or `| <ElementName>` or the element's slug.
4. If a matrix header lists the element in columns, remove the column and adjust row cells accordingly.

### Decision 2.3: Accent-Folding & Flexible Matrix Matching
Matrix cell updates (`update_matrix_cell`) currently require strict ASCII slugs.
Implement slug normalization in matrix lookup:
```javascript
function normalizeMatrixKey(key) {
  return String(key)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```
Matches against matrix titles like `Mensajes × Públicos` and `mensajes-x-publicos` will resolve to the same underlying table.

### Decision 2.4: Changeset Pruning Tool (`prune_changesets`)
Expose an MCP tool to clean dangling exploratory changesets:
```typescript
{
  name: "prune_changesets",
  description: "Remove unreferenced changesets from changes/ and rebuild index.md",
  parameters: {
    dryRun?: boolean
  }
}
```
**Algorithm:**
1. Scan all `.md` files in `kNNowledge/` and extract all referenced changeset identifiers (`changes/<file>.md`).
2. Identify all unreferenced `.md` files in `changes/`.
3. If `dryRun` is false, delete unreferenced files and re-run `sync_domain_manifest` / `regenerate_console`.

---

## 3. Skills & Agent UX Guidelines

### Decision 3.1: Canonical 2-Hop Traceability Contract
Document clearly in `skills/nn-innfo/SKILL.md`:
```markdown
### Canonical Traceability Contract (2-Hop Citation Model)
In cogNNitive, Level-3 model elements do NOT cite raw sources directly.
Every mutation generates an immutable audit changeset:
  [Element] ───sources::───► [Changeset] ───sources::───► [Primary Source]
- Elements automatically cite the changeset that mutated them.
- To link an element to a primary source, pass `sources: ["sources/import/doc.md@#anchor"]` 
  inside the changeset operation itself (`add_element`, `update_field`, `update_concept_text`).
- Never attempt to manually override an element's `sources::` field with a raw source path.
```

### Decision 3.2: Domain Language Auto-Alignment
Add rule in `skills/nn-innfo/SKILL.md` (Phase A):
- If the user's conversational prompt is in language $L$, or the primary source document is written in language $L$, the agent MUST generate blueprint concepts, field names, and matrix headers in language $L$ by default.
- Never force an English schema onto a Spanish-language domain without explicit user confirmation.

### Decision 3.3: Business User Abstraction Guard
Add rule in `skills/nn/SKILL.md`:
- Do not expose internal AST roles (`catalog` vs `knowledge`), SHA-256 sidecar hashes, or non-blocking linage warnings (`l3-index-ignored`) to business end users unless troubleshooting is explicitly requested.
- Present summaries in terms of domain value: number of concepts modeled, key elements extracted, matrices crossed, and links to the rendered console.
- Favor **Optimistic Execution** for standard setup pipelines (ingest -> model -> validate -> render) instead of blocking the user with single-letter menus at every sub-step.
