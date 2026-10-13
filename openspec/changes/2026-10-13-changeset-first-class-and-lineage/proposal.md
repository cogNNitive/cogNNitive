# Proposal: changesets as first-class iNNfo documents and lineage nodes (+ console/provenance vocabulary alignment)

## Intent

The changeset pipeline proof of concept works (slices S1, S2a, S2b are archived and
their derived specs live in `openspec/specs/`), but a design audit of the domain
console surfaced three coherence gaps that make the mechanism hard to explain and
partly untrue in code:

1. **A changeset is not a valid iNNfo Level-3 document.** `validate_knowledge` on a
   real applied changeset returns `valid: false` — `Missing level field` and
   `Parent_spec missing name`. The `changes` blueprint's own template
   (`iNNfo/specs/bluepriNNts/changes/spec_NN.md`) is the source of the defect:
   `parent_spec` is a scalar string and `level`/`type` are absent.
2. **The provenance chain is broken at both ends.** D20 rewrites a touched field's
   `sources::` to point at the changeset that produced it, but (a) the changeset
   carries no citation to its evidence, and (b) the chain's pivot — the
   `kNNowledge/archive/` snapshot — is read by nothing in the codebase. So the
   design's claim that "earlier origins are not lost" holds for a human reading the
   snapshot file, never for the tooling.
3. **The canonical vocabulary drifted.** The normative vocabulary is exactly three
   nouns — **Source / Citation / Lineage** (`provenance-vocabulary`). The console
   nonetheless ships a "History & Provenance" tab, reintroducing the term the spec
   deliberately retired.

In addition, the console draft-store decisions taken during the same audit (how
drafts are keyed and how staleness is signalled) are currently undocumented and, in
one case, contradict the written decision D14.

This change consolidates all of it into one coherent unit: the changeset becomes a
first-class iNNfo document, a first-class lineage node role, and a renderable artifact;
the dead snapshot mechanism is deleted; and the vocabulary is made consistent across
code, UI and docs (English, three nouns).

## Scope

### In Scope
- **Changeset as a valid L3 document** of the `changes` blueprint: `level: 3`,
  `parent_spec` as `{ name, url }`, `type`, and an optional first-class `changeset_id`.
- **Change as a lineage node role**: the `Change` concept gains a `sources` citation
  field so a change can cite its evidence, closing `field → change → source`.
- **Remove** the dead `kNNowledge/archive/` snapshot archival mechanism.
- **Proposal immutability**: applying a changeset MUST NOT rewrite the proposed
  content; the outcome is recorded separately from the proposal.
- **A "Changes" console view**: the `changes` blueprint ships
  `assets/console-view-changes.js` and the domain payload carries a changes
  collection, so the domain console gains a Changes tab.
- **Console element identity** keyed on the frozen element slug (aligning console keys
  with the D5 lineage addresses), replacing the name-derived id.
- **Vocabulary alignment**: three nouns only, used consistently in code, UI and docs;
  English everywhere; the "History & Provenance" tab is renamed to **Lineage**.
- **Record the console draft-store decisions**: stable path-scoped key; per-draft
  `base_hash` staleness; real `knowledge_version` signal (drop the fake
  `domainVersion`); no rebase/refresh; isolated `--view` store.
- **Backlog sync**: mark S1/S2a/S2b archived and reduce the item to the remaining
  slices, per the agreed "state lives in `openspec/`" rule.

### Out of Scope
- The full console↔editor feature-parity audit and widget porting (slice S3 proper),
  beyond the payload/view wiring above.
- Reopening `provenance-vocabulary`'s decision to use exactly three nouns.
- Migrating existing test domains (they are throwaway; single maintainer, no legacy
  compatibility layer is required).

## Capabilities

### Modified Capabilities
- `changeset-document-model`: L3 conformance; `Change` `sources` citation field;
  optional `changeset_id`.
- `changeset-apply-engine`: the proposal is immutable; the outcome is recorded
  separately; D20 citation rewrite restated.
- `knowledge-version-and-snapshot`: the snapshot archival requirement is REMOVED.
- `lineage-single-edge`: `Change` is a first-class lineage node role.
- `console-view-registry`: the `changes` blueprint view and the Changes tab.
- `console-payload-builder`: element identity keyed on the frozen slug; a changes
  collection in the payload; the fake `domainVersion` is dropped.
- `provenance-vocabulary`: the three nouns are enforced in code, UI and docs (English).

## Approach

- **L3 formalization** is additive to the `changes` document model and its embedded
  canonical blueprint schema; existing parsed changesets keep parsing (the parser
  already tolerates the fields), and the validator stops failing them.
- **Lineage role**: the `Change` concept gains a `sources` field typed `citation`
  (the same field type used everywhere else). No new mechanism — `sources::` citing a
  `changes/` path already resolves via `createFsSourceResolver` (it resolves against
  `rootDir`, not only `sources/`). The role joins Source / kNNowledge / artifact as a
  folder-derived node role.
- **Chain closure**: after D20 rewrites `field → change`, a change that has an
  evidentiary origin cites it, so `field → change → source → sidecar` closes without
  the snapshot. A change with no evidence (a bare review comment) legitimately ends the
  chain at itself.
- **Snapshot removal**: delete the archival step in `apply-change.ts` and the
  `Snapshot Archival` requirement; keep the deep `archive` exclusion (still needed for
  `sources/archive/`).
- **Proposal immutability**: apply keeps writing `status`/`applied_at`/`models` as the
  outcome, but the proposed change blocks are never rewritten; the outcome lives in
  frontmatter + a dedicated section, so the sealed proposal bytes are preserved.
- **Console**: a `changes` blueprint view renders the payload's changes collection as
  a tab; the element-id change is internal to the payload builder and its consumers
  (both runtimes read `el.id` opaquely).
- **Vocabulary**: rename the tab; use Source/Citation/Lineage in UI copy; all strings
  English.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/bluepriNNts/changes/spec_NN.md` | Modified | L3 template fix; `Change` `sources` citation field; `changeset_id`; version bump |
| `iNNfo/packages/innfo-core/src/changeset/*` | Modified | frontmatter `changeset_id`; serializer keeps proposal bytes; parser tolerates L3 fields |
| `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts` | Modified | embedded `changes` blueprint content mirrors the spec |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | drop snapshot archival; separate outcome from proposal; change→source citation on evidence-bearing changes |
| `iNNfo/packages/innfo-core/src/console/payload-builder.ts` | Modified | element id = frozen slug; carry the changes collection |
| `scripts/export-console.mjs` | Modified | drop the fake `domainVersion`; surface `knowledge_version`; load changes into the domain payload |
| `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` | New | the Changes blueprint view |
| `iNNfo/specs/bluepriNNts/console/innfo-runtime.js` + `ui-kit.js` | Modified | Changes tab; rename "History & Provenance" → Lineage; English copy |
| `openspec/backlog.md` | Modified | sync the slice state; pointer rule |
| `docs/innfo/documentation/citations-provenance.md` | Modified | three nouns; no standalone "provenance" |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Element-id change breaks a consumer keyed on the old id | Med | Both runtimes read `el.id` opaquely; a golden test asserts relations/drafts key on the new id |
| Removing snapshots loses a recovery path someone relied on | Low | Verified: nothing reads `kNNowledge/archive/`; git + the changeset chain cover history |
| L3 formalization drifts the embedded canonical schema | Med | `canonical-registry.ts` mirrors the spec; `verify.js` drift check |
| Proposal-immutability changes the changeset parser round-trip | Med | `parser.test.ts` round-trip + `verifyProposalSha` unchanged |
| A "change→source" citation that does not resolve | Low | `fs-source-resolver` already resolves `changes/` paths; a test asserts resolution |

## Rollback Plan

Additive at the document-model and payload level, with one deletion (the snapshot
step). If the element-id change regresses a runtime, revert `payload-builder.ts` alone
and keep the rest. No persisted production data migrates: the only domains are
throwaway test fixtures, so a revert needs no data repair.

## Success Criteria

- [ ] `validate_knowledge` on an applied changeset returns `valid: true`.
- [ ] The `Change` concept accepts `sources::` and a change citing a source resolves
      in the lineage graph; `field → change → source` closes without any snapshot.
- [ ] No code writes or reads `kNNowledge/archive/` for the snapshot mechanism; the
      deep `archive` exclusion still holds for `sources/archive/`.
- [ ] Applying a changeset leaves the proposed change blocks byte-identical; the
      outcome is recorded separately.
- [ ] `domaiNN_console.html` shows a Changes tab rendering the payload's changes.
- [ ] Console element ids equal the frozen element slugs; relations and drafts key on
      them.
- [ ] The console UI and docs use only Source / Citation / Lineage, in English, with
      no standalone "provenance"; the tab reads "Lineage".
- [ ] `node scripts/verify.js` and the affected package tests are green.
