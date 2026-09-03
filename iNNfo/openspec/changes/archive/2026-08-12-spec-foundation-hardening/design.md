# Design: Spec Foundation Hardening

## Technical Approach

Two coordinated tracks. **Track A (documents):** rewrite the reference specifications
(defiNNe L0, iNNfo L1, business/procedures L2) to a single canonical glossary and the
agreed format conventions, publish them as **V_0-2-0**, and relocate superseded
versions to `archived/`. **Track B (enforcement):** move identity/uniqueness/rename
invariants into `@cognnitive/innfo-core` as the single engine, add a reference-integrity
validator and a transactional rename operation, and make the editor UI and the MCP thin
clients of that engine. The name is the single source of truth; slugs are derived and
never persisted; there is no content hash.

## Architecture Decisions

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Identity source | Persisted opaque id (robust, Notion-like) vs derived slug vs name-only | **Name-only.** A persisted id fights Git-diffable/human-readable/self-describing values; a derived slug gives no rename safety. Robustness lives in the app. |
| Enforcement location | Duplicate logic in UI + MCP vs single engine in core | **Single engine in `innfo-core`.** UI and MCP call it; guarantees identical rules for humans and agents. |
| Rename safety | Content hash / manual reconciliation vs transactional rewrite + validator | **Transactional rename + reference-integrity validator.** Git already tracks changes; the validator answers "is it valid?" not "was it touched?". |
| Uniqueness scope | Per-concept vs whole-model vs workspace | **Element unique per whole Model; Concept per Model; Model per Workspace.** Bare names always resolve; qualified path is a runtime construct. |
| Hierarchy mechanism | Index + hierarchy matrix (overlap) vs index only | **Index only.** Hierarchy Matrix removed; single, unambiguous taxonomy. |
| Matrix values | `;`-string DSL vs YAML array vs full widget taxonomy | **YAML `values: [...]` + optional `widget`.** Native, validatable, no custom parsing, not over-engineered. |
| Model name | Filename-derived vs frontmatter `title` | **`title` is the logical name;** filename stays physical (version + template for the resolver). |
| Slug Unicode | Keep Unicode vs transliterate | **Transliterate (NFKD, `ñ`→`n`).** ASCII-safe, Spanish-friendly; derived only. |
| Versioning | V_0-1-3 (as core FR-007 hints) vs V_0-2-0 | **V_0-2-0** — structural/semantic scope. |

## Data Flow

Mutation (add / rename), identical for UI and MCP:
```
  UI action / MCP tool ──→ innfo-core enforcement engine
                             ├─ check uniqueness (Model/Workspace scope) → error on collision
                             ├─ apply mutation
                             ├─ transactional reference rewrite (rename)
                             └─ validate (reference integrity, diagnostics)
                           ──→ serializeModel ──→ write-back
```

Load-time validation:
```
  parseModel ──→ reference-integrity validator ──→ diagnostics (ERROR structural / WARNING recoverable)
```

## File Changes (implementation phase — not done in this change)

| File / Area | Action | Description |
|------|--------|-------------|
| `specs/v0.2.0/level0/defiNNe_V_0-2-0_NN.md` | Add | Rewritten L0: glossary anchor, `_NN`-only naming, heading-name refs |
| `specs/v0.2.0/level1/iNNfo_V_0-2-0_NN.md` | Add | Glossary, reserved pseudo-concepts, identity rules, Relationship Types, index wikilink, FOLDER removal, frontmatter fix, section ordering |
| `specs/v0.2.0/level2/{business,procedures}/*_V_0-2-0_NN.md` | Add | Terminology, `values` matrices, Summary≠Description, Work-field scoping |
| `specs/latest/**` | Modify | Re-sync stable aliases to V_0-2-0 |
| `specs/archived/**` | Add | Relocate superseded v0.1.x |
| `packages/innfo-core/src/identity.ts` | Modify | Model-wide uniqueness; remove silent `#2`; collision = error |
| `packages/innfo-core/src/` (new) `mutate.ts` / rename | Add | Single enforcement + transactional rename engine |
| `packages/innfo-core/src/validator/*` | Modify | Reference-integrity checks; unified diagnostic policy; reserved-name check |
| `packages/innfo-core/src/parser/graph.ts` | Modify | Retire hierarchy-matrix handling |
| `packages/innfo-mcp/src/tools/mutate.ts` | Modify | Delegate to core engine; drop `_F.md` probing |
| `apps/innfo-editor/src/**` | Modify | Editing calls core engine; remove FOLDER KB starter |
| `packages/innfo-core/src/helpers.ts` | Modify | Remove vestigial `mode: 'FOLDER'` |

## Interfaces / Contracts (indicative)

```typescript
// Single enforcement engine — the only mutation entry point.
export function applyMutation(
  graph: ModelGraph,
  op: MutationOp,            // add/remove/rename element|concept|marker, edit fields...
): { graph: ModelGraph; diagnostics: Diagnostic[] } // throws on structural violation

// Transactional rename resolves every reference kind before committing.
export function renameEntity(
  graph: ModelGraph,
  target: { kind: 'element' | 'concept' | 'model'; name: string; concept?: string },
  newName: string,
): { graph: ModelGraph; rewritten: ReferenceRewrite[]; diagnostics: Diagnostic[] }

// Load-time reference integrity.
export function validateReferences(graph: ModelGraph): Diagnostic[]
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Uniqueness = error; no `#2`; slug transliteration | core tests |
| Unit | Transactional rename rewrites matrices/index/fields/edges | core tests with fixtures |
| Unit | Reference-integrity validator flags dangling refs | core tests |
| Contract | UI and MCP reject the same duplicate identically | shared-engine test |
| Spec | Each R-MM requirement satisfied by the rewritten docs | doc checks (linter deferred) |
| Regression | Parser/validator suite across monorepo | existing tests |

## Migration / Rollout

- Publish V_0-2-0 as a new immutable version; freeze/relocate v0.1.x to `archived/`.
- Existing v0.1.x models keep resolving their pinned parent chain; migrating a model to
  V_0-2-0 is a new copy (per iNNfo immutable-versioning policy).
- Matrices `params` → `values`: migration is a doc/template edit; consider a temporary
  reader tolerance if any live models use `params`.
- FOLDER/`_F` cleanup is safe — the core already rejects FOLDER mode.

## Open Questions

- Whether the core mutation refactor lands in the same PR as the spec rewrite or as a
  chained follow-up (see tasks Review Workload Forecast — chained PRs recommended).
