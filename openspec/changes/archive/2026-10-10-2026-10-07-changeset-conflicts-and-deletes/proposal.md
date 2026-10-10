# Proposal: Changeset Conflicts and Deletes (Slice S2b)

## Intent

Engine-only follow-up to S2a: one conflict must not abort the clean subset (D10), batch slug collisions resolve via `resolved_slug::` (D11), deletes surface impact (D12).

## Scope

### In Scope
- Per-change partition (skip-and-continue; clean subset atomic)
- `partially_applied` header + replay rule
- Batch slugs: document-order check, auto-suffix, intra-batch rewrite, empty-slug diagnostic
- Delete impact: matrix cascade, reference hits as conflicts, reuse check

### Out of Scope
- Console/modal UI and writer-confirm flow (S3)
- BluepriNNt bump (not needed); tolerant-read removal and migration (S4)

## Capabilities

### New Capabilities
- None (engine semantics only)

### Modified Capabilities
- None (no `openspec/specs/` change)

## Approach

Order D10 → D11 → D12; all report through existing per-change annotations (hash-excluded — no blueprint bump).

- **Q1 partial status:** `partially_applied` when ≥1 applied + ≥1 conflicted. Clean subset keeps S2a atomicity. Replay = no-op (keyed on `result_version`); conflicts resolve only via NEW changeset (D10).
- **Q2 slug suffix:** engine auto-suffixes (`slugifyHeading` + `-N`, document order vs snapshot + batch adds), rewrites same-batch `target::`, records `resolved_slug::`. Console MAY pre-confirm in S3; engine never blocks. Empty slug → `conflict` + diagnostic.
- **Q3 version bump:** models with ≥1 clean change bump once (patch) + one snapshot; conflicted changes add no bump, no D20 rewrite. Zero-clean models untouched.
- **Q4 reuse history:** reverse scan `changes/` filenames (cap 50, add/remove targets), stop at last `add_element`. A `remove_element` after the batch's `base_version` → conflict. No index.
- Deletes: matrix cells cascade in-batch (`resolution::` note); `reference`/wikilink/cross-model hits become `conflict`, never silent.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `innfo-mcp/src/tools/apply-change.ts` | Modified | Partition, clean-subset transaction, `partially_applied` + replay |
| `innfo-core/src/mutate.ts` | Modified | Batch slug check/rewrite, delete + cascade |
| `innfo-core/src/changeset/` | Modified | Status enums + `conflicts.ts`/`impact.ts` helpers |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scan misses a link shape | Med | One matcher per shape (reference, wikilink, matrix, cross-model) + tests |
| `changes/` scan cost | Low | Header-only parse, cap 50, stop-at-last-add |
| S3 scope creep | Low | Auto-path normative; confirm is S3 overlay only |

## Rollback Plan

Revert S2b commits; S2a abort semantics intact (annotations additive, hash-excluded).

## Dependencies

- S2a verified on this branch (two-phase engine, lock, `proposal_sha`, D20)

## Success Criteria

- [ ] Mixed batch commits clean subset as `partially_applied`; replay no-op; conflicts need a new changeset
- [ ] Slug collision auto-suffixes in document order with `resolved_slug::`; empty slug conflicts
- [ ] Delete cascades matrix cells, surfaces reference hits, enforces last-`add_element` rule
- [ ] No bluepriNNt bump; tests and integrity checks green
