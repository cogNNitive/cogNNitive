# Exploration: changeset-conflicts-and-deletes (S2b — D10/D11/D12)

## Current State

S2a (`2026-10-07-changeset-apply-and-versioning`) is implemented and verified on this branch:
- Changeset document model (`innfo-core/src/changeset/`: `types.ts`, `parser.ts`, `serializer.ts`,
  `hasher.ts`, `lock.ts`): `ChangeItem` already carries `status`, `resolution`, `resolved_slug`;
  `proposal_sha` covers only proposal keys (execution annotations excluded). Parser/serializer
  round-trip all three annotations. Blueprint `iNNfo/specs/bluepriNNts/changes/spec_NN.md`
  (V_0-4-0 / 0.1.0) declares all 7 ops including `remove_element`, plus `status`/`resolution`/`resolved_slug`.
- Apply engine (`innfo-mcp/src/tools/apply-change.ts`, `executeChangesetApply`): single-writer
  `changes/.lock`, `proposal_sha` tamper check, idempotent replay on `status: applied` +
  `result_version` match, in-memory compute → schema validate → `.tmp` stage → archive previous
  to `kNNowledge/archive/` → rename, per-model patch bump, D20 citation rewrite of touched fields,
  changeset file annotated `applied` at the end.
- Conflict handling today is **whole-changeset abort**: any `from` mismatch (`update_field`,
  `update_matrix_cell`) or missing element returns `status: conflict` (or `rejected` for schema/
  missing-model errors) with **zero disk writes**. No per-change skip, no partial apply, no
  per-change `conflict` annotation, no "new changeset citing the original" flow.
- Slug assignment today is **server-side silent suffix**: `mutate.ts addElement` rejects a
  colliding requested `slug::` outright (`Slug ... already exists`), otherwise derives
  `slugifyHeading(name)` + `-N` suffix against live-model slugs and sets `slugExplicit: true`.
  `apply-change.ts` copies the assigned slug into `change.resolved_slug` after the fact.
  There is no batch-internal collision check (two adds in one changeset proposing the same slug),
  no intra-batch reference rewrite, no empty-slug (non-Latin name) path, no writer-confirm step
  (console work is S3, out of scope here — S2b is the engine contract the console will call).
- Delete today is **bare removal**: `mutate.ts removeElement` filters the element out of its
  concept list and returns success. No impact computation, no matrix-cell cascade, no
  reference/cross-model conflict surfacing, no slug-reuse rule. Cross-model filename renames
  (`cascadeModelReferences` in `apply-change.ts`) only handle file-rename cascades from
  `bump_version`, not element deletes. Element `reference`-field / wikilink / cross-model
  scanning for impact does not exist in the changeset path (`referenceFieldsByConcept` is only
  used by `renameElement`).

### Affected Areas
- `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` — precondition loop, in-memory apply loop,
  changeset annotation epilogue (needs per-change status model: apply-clean-skip-conflicted).
- `iNNfo/packages/innfo-core/src/mutate.ts` — `addElement` (batch-aware slug proposal vs silent
  suffix), `removeElement` (cascade + incoming-reference scan helpers), possibly new pure helpers
  for impact/cascade so the MCP layer stays thin and testable.
- `iNNfo/packages/innfo-core/src/changeset/` — `types.ts` (conflict result shape), maybe a new
  `conflicts.ts`/`impact.ts` module; `parser/serializer/hasher` need no change (annotations
  already round-trip and are hash-excluded) unless new annotation fields are added.
- `iNNfo/specs/bluepriNNts/changes/spec_NN.md` — only if S2b adds annotation fields or new
  semantics the blueprint must document (prefer no blueprint bump; confirm during propose).
- `iNNfo/packages/innfo-mcp/src/tools/*.spec.ts`, `innfo-core/src/mutate.spec.ts` — per-change
  conflict, slug-suffix, and delete-cascade tests.

## Approaches

1. **Per-change skip-and-continue in the existing two-phase engine (D10)** — keep Phase 1
   (compute+validate in memory) and Phase 2 (stage/archive/rename) as-is, but partition changes
   into clean vs conflicted: precondition failures (`from` mismatch, slug deleted after
   `base_version`) mark that change `status:: conflict` + `resolution::` and are excluded from
   the in-memory mutation set; clean changes still apply atomically in one transaction.
   - Pros: smallest delta to verified S2a code; preserves atomicity for the clean subset;
     maps 1:1 onto D10 ("one conflict must not block the clean changes").
   - Cons: must define changeset-level `status` when partially applied (new state? current enum
     is `proposed|applied|rejected|conflict`); idempotent-replay logic must handle mixed status.
   - Effort: Medium.

2. **Batch-aware slug proposal protocol (D11)** — formalize: console proposes `slug::`;
   engine checks against (a) live snapshot slugs, (b) earlier `add_element` slugs in the same
   batch; on collision the engine suffixes (`-1`, `-2`, same rule as `addElement` today),
   rewrites `target::` references to the proposed slug inside the same batch, and records
   `resolved_slug::`. Empty-slug names (non-Latin) require explicit `slug::`, else the change
   conflicts with a clear diagnostic.
   - Pros: makes today's silent suffix truthful and deterministic; no temp ids; reuses the
     existing `slugifyHeading` + suffix rule (single rule, console bundle already embeds it).
   - Cons: needs an authoritative ordering rule (document order) and a decision on whether
     suffixing is automatic (agent) vs writer-confirmed (console/S3) — engine must at least
     support the automatic path and record it.
   - Effort: Medium.

3. **Delete impact as pre-computed conflicts + in-batch cascade (D12)** — before mutating, compute
   for each `remove_element`: (a) matrix cells keyed by the element (cascade-delete within the
   batch, recorded in `resolution::`), (b) `reference`-type fields / wikilinks / cross-model
   `m@slug` targets pointing at the slug (these become `conflict` entries decided in the batch,
   not silent dangling links). Slug reuse allowed: history restarts at last `add_element`; a
   pending batch whose `base_version` predates a delete of that slug conflicts.
   - Pros: everything needed is in changesets + live models (per D12); prevents dangling
     references, the most dangerous silent failure.
   - Cons: requires a reference-scan helper that understands D5 addresses, `reference` field
     declarations, wikilinks, and cross-model targets — the largest new code in S2b; cross-model
     scan cost on large domains needs a bound.
   - Effort: High (scan helper) + Low (reuse rule, mostly a `base_version`-vs-delete check
     against the changeset chain).

## Recommendation

Slice S2b as engine-only work in this order: **D10 first** (per-change conflict partition +
mixed-status semantics + replay), **then D11** (batch slug check/rewrite/`resolved_slug`
contract + empty-slug diagnostic), **then D12** (impact scan, matrix cascade, reference
conflicts, slug-reuse rule). D10 is the foundation the other two report through (both D11
suffixing and D12 reference hits resolve to per-change statuses). Keep the console/modal UI
in S3; S2b delivers the engine contract plus machine-readable per-change results the console
will render. No blueprint version bump unless a new annotation field proves necessary.

## Risks
- **Mixed-status changeset state**: current `ChangeStatus` enum and replay logic assume a single
  outcome; partial apply needs a defined changeset-level status and replay rule — biggest design
  decision in S2b.
- **Reference-scan completeness**: `reference` fields, prose wikilinks (slug-first, ambiguous-name
  reporting per D6), matrix cells, and cross-model `m@slug` links each need distinct matching;
  tolerant name-based reads (D16 legacy) complicate matching until S4.
- **Slug-reuse vs `base_version` staleness**: needs agreement on where delete history is read from
  (changeset chain scan per apply could be O(n); may need an index or bound).
- **Cross-cutting constraints still apply**: single-writer lock + two-phase discipline must hold
  for the clean subset; generated mirrors (core mirror, console slug bundle, MCP bundle) must be
  regenerated if slug rules change.
- **Scope creep into S3**: writer-confirm UX, modal, and "delete impact preview" UI belong to S3 —
  S2b should expose impact/conflict data, not render it.

### Open questions
1. What is the changeset-level `status` after a partial apply, and what does replay do then?
2. Is slug suffixing automatic by the agent, writer-confirmed in the console, or both (engine
   supports auto, console may pre-confirm)?
3. Does a conflicted change block the model version bump for its model, or do clean changes to
   the same model still bump once?
4. Where is delete history read from for the slug-reuse staleness check (full chain scan vs index)?

## Ready for Proposal
Yes — S2b scope is crisp (D10/D11/D12 engine semantics on top of the verified S2a engine).
Propose should settle the four open questions above and confirm no blueprint bump is needed.

---

**Status**: success
**Summary**: Explored S2b (D10/D11/D12) against the S2a implementation; whole-changeset abort, silent slug suffix, and bare delete identified as the three gaps; recommended D10→D11→D12 engine-only order.
**Artifacts**: `openspec/changes/2026-10-07-changeset-conflicts-and-deletes/exploration.md`
**Next**: sdd-propose
**Risks**: Mixed-status changeset semantics; reference-scan completeness; slug-reuse history source; S3 scope creep
**Skill Resolution**: none — phase skill only (plus repo AGENTS.md session-start convention, not loaded as a skill tool)
