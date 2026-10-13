# Proposal: #1B — proposal immutability on apply and removal of the model snapshot

## Intent

Second slice of the split consolidated change (see
`openspec/changes/2026-10-13-DEPENDENCIES.md`). Two coupled defects in the apply engine:

1. **The proposal is rewritten on apply.** `apply_change` re-renders the whole changeset
   file (`serializeChangeset`, `apply-change.ts:880,1142`). The seal still verifies
   because `computeProposalSha` ignores execution annotations, but nothing guarantees the
   normative bytes the user reviewed are the bytes on disk afterwards.
2. **The `kNNowledge/archive/` snapshot is dead weight.** Phase 2 copies every touched
   model to `kNNowledge/archive/` (`apply-change.ts:1077-1104`, `persistWithArchive`
   `:552`), and nothing reads it (it appears only in exclusion lists). The living specs
   still claim historical citations are recovered from it
   (`field-citation-provenance`), so the lineage claim is false for tooling.

The original #1 proposed a trailing `## NN Changeset Outcome` section. That idea is
dropped: `parseChangeset` (`parser.ts:83-166`) would absorb its `status::` /
`resolution::` lines into the last change, and `history.ts:101`, `conflicts.ts:133,140`
and `apply-change.ts:945,1026` read per-change `status` / `resolved_slug`. Execution facts
stay where the living spec puts them (per-change annotations and frontmatter); what
becomes enforceable is that the sealed, normative bytes never change.

## Scope

### In Scope
- Apply asserts, before Phase 2 writes anything, that the changeset bytes it will write
  keep every normative line of every change block byte-identical to the input; it writes
  back through #1A's raw-text-preserving serializer.
- Delete the snapshot: Phase 2 writes `<model>.tmp` and renames it over the live file;
  `persistWithArchive` becomes a copy-free atomic persist.
- Keep lineage after the snapshot is gone: when the D20 rewrite replaces a field's
  existing citation, apply records the replaced value in the change's
  `replaced_sources::` execution annotation (defined by #1A, unsealed).
- MODIFY the living requirements that still describe the snapshot.
- The `apply_change` tool description stops mentioning snapshot archival.

### Out of Scope
- The document model, `Change.sources`, the serializer itself (#1A).
- Console work (#1C). Migration of existing `kNNowledge/archive/` folders: none. The deep
  `archive` exclusion stays because `sources/archive/` still exists.

## Capabilities

### Modified Capabilities
- `changeset-apply-engine`: Two-Phase Apply Transaction, Crash-safe persist and Idempotent
  Replay lose the snapshot; new requirement for proposal immutability on apply.
- `knowledge-version-and-snapshot`: snapshot archival REMOVED; the deep exclusion is
  restated without the snapshot.
- `field-citation-provenance`: history walks `replaced_sources` through the changeset
  chain instead of an archived snapshot.

## Approach

Test-first on the existing apply suites: rewrite the snapshot assertions
(`test/apply-change.test.ts:406,479,653`, `test/apply-change-persist.test.ts:121-137`) as
"no `kNNowledge/archive/` exists" + "a failed rename leaves the live file intact and no
`.tmp`", then delete the archive block and rename `persistWithArchive` to an atomic
persist. Immutability: build the write-back bytes at the end of Phase 1, compare the
normative lines of every change block with the input, abort with
`PROPOSAL_IMMUTABILITY_VIOLATION` (nothing written) on any difference.

## Dependencies

After #1A (raw-text-preserving serializer, `replaced_sources` key). Before #1C. S6 relies on
the copy-free persist (its `add_model` creation writes tmp + rename with no archive).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | no archive; atomic persist; immutability assertion; `replaced_sources` annotation |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modified | `apply_change` description drops snapshot archival |
| `iNNfo/packages/innfo-mcp/test/apply-change*.test.ts` | Modified | snapshot assertions replaced |
| `iNNfo/packages/innfo-core/src/changeset/history.ts` (read side) | Modified | history entries expose `replaced_sources` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A crash between model renames leaves models partially updated | Med | Unchanged from today (persist is per model); the idempotent replay keyed on `result_version` resumes |
| The assertion fires on a legitimate write-back | Low | It compares normative lines only; the serializer touches annotation lines only (#1A tests) |
| Lineage loses the pre-change origin | Low | `replaced_sources` keeps it in the changeset chain |

## Rollback Plan

Revert the slice commit; the snapshot code and tests return. No user data migrates.

## Success Criteria

- [ ] Applying a changeset never creates `kNNowledge/archive/`.
- [ ] A failed rename leaves the live model byte-identical and no `.tmp` behind.
- [ ] After apply, every normative line of the changeset is byte-identical to the input.
- [ ] A D20 rewrite that replaced a citation leaves `replaced_sources::` on that change, and the lineage walk reaches the earlier origin through it.
- [ ] `node scripts/verify.js` and the innfo-mcp / innfo-core tests are green.
