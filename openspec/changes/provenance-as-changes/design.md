# Design: Provenance as Changes

## Technical Approach

The change is the single provenance record. The knowledge model sheds its companion
citations (D20) and `replaced_sources`; a field's origin and history are **derived** from
the change chain by `target`, ordered by `applied_at`. The physical write-once boundary
(one file per batch) is kept as sharding; the changeset stops being a semantic layer.

## Verified facts this design relies on

| Fact | Evidence |
|---|---|
| The apply engine rewrites the companion citation on `update_field`/`add_element` and records the previous value in `replaced_sources` (D20). | `openspec/specs/field-citation-provenance/spec.md` §D20 |
| A change `## NN Change:` block is resolvable as a citation target and returns `origin`/`author`/excerpt. | `field-citation-provenance` §Bidirectional Auditability |
| The changeset frontmatter carries `applied_at`, `status`, `author`, `models`; the filename carries a UTC stamp. | `iNNfo/specs/bluepriNNts/changes/spec_NN.md`; `test/fixtures/testlab/changes/*` |
| `PROPOSAL_KEYS` (the sealed fields) includes `sources`; `slug` is sealed. | `iNNfo/packages/nn-core/src/changeset/hasher.ts:9-26` |
| `loadChangesetRecords` already reduces each changeset to per-change `op/target/from/to/author/notes/status/sources`. | `iNNfo/packages/nn-core/src/console/element-history.ts:101-149` |
| Every mutation already enters via a changeset (`init_knowledge` is an `add_model` changeset). | `docs/innfo/documentation` ; `nn-mcp/README.md` |
| "Change via the agent/changeset, not by hand" is the documented stance; the drift fingerprint is an open backlog item. | `docs/.../usage.md:46`; `openspec/backlog.md` (`manual-editing-risks`) |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| D1 Evidence name | `evidence` replaces `sources` **on the change** | keep `sources` | The value is not always a *source*: doc, conversation, another change, a KU, `decision`, `unknown` |
| D2 Evidence mandatory | required on every change | optional | The whole point: traceability is guaranteed, not hoped |
| D3 KU provenance-free | remove the D20 companion citation and the element `sources::` that points at a change | keep the pointer | One mechanism; no per-mutation churn on the model |
| D4 Drop `replaced_sources` | remove | keep | Redundant with the ordered change chain for a `target` |
| D5 Per-change facts | `applied_at`, `status`, `author`, `batch` on each change | changeset frontmatter | The reader must open **only** changes to build history |
| D6 Physical boundary | keep one write-once file per batch | one flat growing doc | Preserves atomic apply, the seal, and concurrent-writer safety |
| D7 History | `changes.filter(target).sort(applied_at)` | back-pointer walk | Derived, not stored |
| D8 Drift fingerprint | diagnostic `EDITED_WITHOUT_RECORD` when value ≠ last `to` | guard only | Hand/git edits cannot be prevented, only detected |
| D9 Guard | MCP writes MUST route through a change | direct file writes | Enforcement on the agent path |

## Data Flow

```
proposer ──evidence (mandatory)──> change ──apply──> model field mutated
                                       │              (NO companion citation written)
                                       ├── per-change facts: applied_at, status, author, batch
                                       └── batch file (write-once, sealed) = shard

console / MCP read ──> load changes ──> filter(target) ──sort(applied_at)──> history + origin
                                          │
                                          └── compare current value vs last `to` ──> drift diagnostic
```

## `Change` concept shape (blueprint `changes`)

| Field | Type | Rule |
|---|---|---|
| `op` | select | required (existing) |
| `target` | `address` (typed in change D) | required |
| `from` / `to` | string | value change |
| `author` | string | required |
| `evidence` | citation | **required** (doc, conversation, change, KU, `decision`, `unknown`) |
| `status` | select | `applied` / `partially_applied` / `rejected` / `conflict` (per change) |
| `applied_at` | string | UTC `YYYY-MM-DDTHH:mm:ss.SSSZ`, per change |
| `batch` | string | the batch identity (= changeset stem) |

The batch frontmatter shrinks to `proposal_sha` (+ `status` as a batch summary). `models`
is dropped (derivable from the changes' `target`).

## Interfaces

```ts
// changeset/types.ts
interface ChangeItem { id; op; target; from?; to?; author; evidence; status?; applied_at?; batch?; /* replaced_sources removed */ }

// console/element-history.ts
export function deriveFieldOrigin(changes: ChangesetRecord[], modelId: string, element: string, field: string): Origin | null
export function deriveValueHistory(changes: ChangesetRecord[], target: string): HistoryHop[]   // sorted by applied_at

// validator
export function detectUnrecordedEdits(model, changes): Diagnostic[]   // EDITED_WITHOUT_RECORD
```

## File Changes

| File | Change |
|---|---|
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | `source(s)` → `evidence` (required); add `applied_at`, `batch`; `target` retyped in D |
| `iNNfo/packages/nn-core/src/changeset/types.ts` | add per-change facts; rename `sources` → `evidence`; drop `replaced_sources` |
| `iNNfo/packages/nn-core/src/changeset/{parser,serializer,hasher}.ts` | parse/serialize the rename + facts; `PROPOSAL_KEYS` follows |
| `iNNfo/packages/nn-mcp/src/tools/apply-change.ts` | stop the D20 rewrite + `replaced_sources`; require `evidence`; write per-change facts |
| `iNNfo/packages/nn-core/src/console/element-history.ts` | `deriveFieldOrigin` / `deriveValueHistory` |
| `iNNfo/packages/nn-core/src/console/payload-builder.ts` | per-field origin derived from changes, not `el.citations` |
| `iNNfo/packages/nn-core/src/validator/` | `EDITED_WITHOUT_RECORD` diagnostic |
| `iNNfo/packages/nn-mcp/src/tools/` | no tool writes a model file directly (guard test) |
| `openspec/specs/**` | delta specs |

## Testing Strategy

| Layer | What | Where |
|---|---|---|
| Unit | parser/serializer round-trip with `evidence` + per-change facts; no `replaced_sources` | nn-core vitest |
| Unit | `deriveFieldOrigin`/`deriveValueHistory` on a synthetic change list | nn-core vitest |
| Unit | `EDITED_WITHOUT_RECORD` fires when value ≠ last `to`; silent when equal | nn-core vitest |
| Integration | apply a changeset: model gets the value and **no** companion citation; per-change facts persisted | nn-mcp vitest |
| Integration | guard: an MCP write path that bypasses a change is rejected | nn-mcp vitest |
| Schema | the `changes` blueprint validates a changeset with the new fields | nn-mcp vitest |

## Migration / Rollout

Purely additive at the data level, but a contract inversion. Existing domains carry
out-of-band citations (hand-authored, pre-D20). Migration mints a `decision`/`unknown`
evidence change or preserves the citation as a `decision` evidence, so no origin is lost.
The change ships **with** the drift fingerprint so removing the D20 pointer does not leave
the audit unbacked.
