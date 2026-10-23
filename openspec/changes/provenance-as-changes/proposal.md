# Proposal: Provenance as Changes — the change is the only provenance

## Why

Today a value's provenance is **split across three places** and the reader has to join them:

1. The **change**: its `sources` line (evidence) and the changeset **frontmatter** (`applied_at`, `status`, `author`, `models`).
2. The **kNNowledge companion citation**, which the apply engine **rewrites on every `update_field` / `add_element`** to point at the applied change (D20, `field-citation-provenance`) — churn on the model on every mutation, and a second provenance mechanism the reader must know about.
3. **`replaced_sources`** on each change, chaining the field's previous origin so history can be walked backwards.

The maintainer's model is simpler, and the code already half-implements it: **the change is the only provenance.** A knowledge unit carries **no** provenance; its history is *the set of changes whose `target` points at it, ordered by application date*; each change carries its **evidence** (a document, a conversation, another change, a kNNowledge element, or an explicit `decision`/`unknown`) and its **author**. Nothing else is required to answer "where did this value come from, and through which states".

## What Changes

- **`evidence` replaces `source(s)` on the change.** The name is broader because the value is not always a *source*: it may be a document, a conversation, **another change**, a kNNowledge element, `decision` (a human decision with no external artifact) or `unknown` (bad practice made explicit). **Evidence is mandatory on every change.**
- **The knowledge unit becomes provenance-free.** Drop the D20 companion citation (`<field>_source` / the element `sources::` that pointed at the change) and `lineage-single-edge` on the kNNowledge document. Per-field origin is **derived from the changes** by `target`.
- **`replaced_sources` is removed.** The backward walk is the ordered change list, not a back-pointer.
- **Facts are denormalized onto each change**: `applied_at`, `status`, `author`, `batch`. The changeset **frontmatter shrinks** to the seal (`proposal_sha`) and minimal metadata. The physical write-once **boundary is kept** (one file per batch = sharding) but is no longer a semantic layer the reader must open — the reader sees one flat list of `Change` elements.
- **History & navigation**: `elemento → change → evidence`, derived by `target` + `applied_at`. The console renders it as a timeline (author, date, `from → to`, evidence, status), and the origin hop (e.g. the PDF) is reached from the change's evidence.
- **Drift fingerprint.** A diagnostic flags **"edited without record"** when a field's current value does not equal the `to` of the last change for its `target`. This is the missing enforcement of the already-documented "change via the agent/changeset, not by hand" stance (`manual-editing-risks`).
- **Guard.** Agent/MCP writes MUST go through a change; no MCP tool writes a model file directly.
- **Retrocompatibility is a migration concern only.** A new domain built entirely through changes needs none of the removed machinery. Migration reconciles existing models whose provenance lives outside the change log (hand-authored citations, pre-D20 direct citations).
- **Out of scope**: the `type:: address` field type (its own change D); surfacing changes as a console collection (change B).

## Capabilities

### New Capabilities

- `change-provenance`: the change as the single provenance medium — mandatory `evidence`, per-change denormalized facts, derived history/navigation, and the drift fingerprint.

### Modified Capabilities

- `field-citation-provenance`: the D20 field-citation rewrite and `replaced_sources` are removed; history is the change chain ordered by `applied_at`.
- `document-citations`: the kNNowledge element no longer carries the companion provenance citation; the element-to-change edge is dropped.
- `changeset-document-model`: `source(s)` → `evidence`; per-change `applied_at`/`status`/`author`/`batch`; the frontmatter shrinks to the seal.
- `changeset-apply-engine`: stop rewriting the companion citation and `replaced_sources`; require `evidence`; record per-change application facts.
- `console-field-citations`: per-field origin is derived from the changes by `target`, not read from `el.citations`.
- `provenance-vocabulary`: `evidence` is the canonical name of a change's justification; `replaced_sources` is retired.
- `typed-source-references`: a change `target` and a change `evidence` share the address grammar; both validate against the workspace resolver.

## Impact

| Area | Impact | Description |
|---|---|---|
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | Modified | `source(s)` → `evidence` (mandatory); add `applied_at`, `batch`; `target` retyped later (D) |
| `iNNfo/packages/nn-core/src/changeset/types.ts` | Modified | `ChangeItem`: add `applied_at`, `batch`; rename `sources` → `evidence`; drop `replaced_sources` |
| `iNNfo/packages/nn-core/src/changeset/{parser,serializer,hasher}.ts` | Modified | `PROPOSAL_KEYS` follows the rename; annotations shrink |
| `iNNfo/packages/nn-mcp/src/tools/apply-change.ts` | Modified | Stop the D20 citation rewrite and `replaced_sources`; require `evidence`; record per-change facts |
| `iNNfo/packages/nn-core/src/console/element-history.ts` | Modified | History derives from the change chain (by `target`, ordered by `applied_at`) |
| `iNNfo/packages/nn-core/src/console/payload-builder.ts` | Modified | Per-field origin derived from changes, not from the removed KU citation |
| `iNNfo/packages/nn-core/src/validator/` | New | Drift fingerprint diagnostic "edited without record" |
| `openspec/specs/**` | Modified | Delta specs for the capabilities above |

## Approach

Ordered work units, TDD-first, landing together on `dev`.

| Unit | Content | Why this position |
|---|---|---|
| A. Change model | `evidence` + per-change `applied_at`/`status`/`author`/`batch`; frontmatter to seal-only; parser/serializer/hasher | The contract everything derives from |
| B. Apply engine | Require `evidence`; stop the citation rewrite and `replaced_sources`; record per-change facts | Needs A's model |
| C. Derived provenance | History/navigation derived from the chain; console origin from changes | Needs A+B |
| D. Drift fingerprint + guard | The "edited without record" diagnostic; the no-direct-write guard | Needs A (derived values) |
| E. Migration | Reconcile existing out-of-band citations into the chain | Trails the frozen model |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Removing the D20 citation without the fingerprint weakens the audit | High | Ship the fingerprint **in this change** — one replaces the other's safety role |
| Existing models carry out-of-band citations (hand-authored / pre-D20) | High | Migration unit reconciles them (mint a change or preserve); document hand-edit as read-only |
| Mandatory `evidence` rejects existing changes that have none | Med | Migration backfills `unknown`/`decision`; the apply engine names the offending change |
| Drift false positives from preconditions (`from` mismatch) | Med | The fingerprint compares to the **last applied** change's `to`; `base_hash` already guards preconditions |
| Console citation icons break when the KU citation is dropped | Med | Per-field origin is derived from the chain in the same unit |
| Agents bypass changes via direct file writes | Low | The guard + the fingerprint make bypass visible; the only paths through MCP already go via `apply_change` |

## Rollback Plan

- Revert the merge commit. The change model reverts to `source(s)` + D20 + `replaced_sources`; no data is migrated by the rollback itself.
- Nothing is published by this change: no tag is cut and no `nn-upgrade` migration runs.

## Dependencies

- Change A (`declarative-blueprint-nature`) for the collection surfacing that change B builds on.
- None beyond the repository gates (`node scripts/verify.js`).

## Success Criteria

- [ ] Every change carries a mandatory `evidence`; `rg "replaced_sources"` returns 0 in live code and specs.
- [ ] A field's origin is derivable from the change chain alone: `changes.filter(target == KU@field).sort(applied_at)`.
- [ ] A hand-edit that diverges from the last change's `to` produces the "edited without record" diagnostic.
- [ ] No MCP tool writes a model file outside a change (guard test).
- [ ] A new domain built entirely through changes has no companion citations on its kNNowledge documents.
- [ ] `node scripts/verify.js` and CI are green on `dev`.

## Assumptions

1. Every mutation already enters through a changeset (`init_knowledge` is an `add_model` changeset), so the change log is already the de-facto record.
2. The physical write-once boundary (one file per batch) is kept as sharding; the changeset stops being a semantic layer.
3. `evidence` may be `decision` (unwritten human decision) or `unknown`; neither is a real Source but both keep traceability honest.
4. A `type:: address` field type (change D) and the console collection (change B) are separate changes.

## Review Workload Forecast

| Work unit | Est. changed lines (excluding generated) |
|---|---|
| A. Change model | ~250 |
| B. Apply engine | ~250 |
| C. Derived provenance | ~300 |
| D. Drift fingerprint + guard | ~200 |
| E. Migration | ~200 |

- Chained PRs recommended: Yes (A+B, then C+D+E).
- 400-line budget risk: Medium. Bind generated artifacts to sources.
- Decision needed before apply: No.
