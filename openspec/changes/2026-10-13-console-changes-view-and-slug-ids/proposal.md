# Proposal: #1C — console Changes view, slug element ids, Lineage vocabulary and draft store

## Intent

Third slice of the split consolidated change (see
`openspec/changes/2026-10-13-DEPENDENCIES.md`). It finishes the console side of the
changeset-first-class work and cuts the releases for #1A to #1C:

1. **Two id spaces.** `payload-builder.ts` derives `id = slugify(concept + ' ' + name)`
   with an occurrence suffix, while the element's frozen `slug` sits in a separate field;
   the domain console then re-qualifies ids as `<modelId>/<id>` with a path stem and `/`
   (`export-console.mjs:684`). Console keys do not match the D5 lineage addresses, and two
   same-named elements in an unfrozen model get suffix-dependent ids.
2. **No view of the changesets.** The console shows per-element history but has no place
   that lists the changesets of a domain (proposed and applied).
3. **A fake version.** `export-console.mjs:755-769` invents
   `domainVersion = V_1-0-<content-hash-int>`; `createDraftStore` (`review.js:90-146`)
   keeps it sticky while drafts exist and the runtime falls back across
   `meta.modelVersion` / `knowledge_version` (`innfo-runtime.js:893,905-908,5184`). The
   draft-store decision D7 (no store-level staleness; staleness is per draft via
   `base_hash`) contradicts that code.
4. **Vocabulary drift.** The element modal has a "History & Provenance" tab and a
   "Source Provenance & Citations" section (`ui-kit.js:1565,1672`; `review.js:361,718`).
   The canonical nouns are Source / Citation / Lineage.

## Scope

### In Scope
- Console element id = the frozen element slug; the domain console id is the D5 address
  `<model>@<element_slug>`. A model without frozen slugs is REJECTED by the console build
  with an actionable message (freeze its slugs), never given a derived id.
- A `changes` collection in the domain payload (proposed and applied changesets) and a
  read-only Changes view shipped by the `changes` bluepriNNt.
- Draft store: stable path-scoped key, per-draft `base_hash` staleness only, no
  `domainVersion`, no sticky store version; the store version is bumped so drafts keyed
  by the old ids are discarded, not migrated. `--view` keeps its isolated store.
- The modal tab is "Lineage"; per-field control labelled "Origin" (a Citation); English.
- Releases for #1A to #1C: `blueprints-v*`, `innfo-console-v*`, `innfo-mcp-v*`, `skills-v*`.

### Out of Scope
- The ledger-based review state (S2c). The per-model console stable filenames, the
  embedded freshness check and regeneration (S6). The editor parity audit (S3).

## Capabilities

### Modified Capabilities
- `console-payload-builder`: element id = frozen slug; unfrozen models are rejected.
- `console-export-cli`: domain ids are `<model>@<element_slug>`; no fake domain version;
  per-model `knowledge_version` and `sha256` in the domain meta; new `changes` collection.
- `console-view-registry`: the Changes view.
- `console-review-mode`: the draft store keying and staleness decisions.
- `provenance-vocabulary`: the three nouns in console UI copy; the documentation path is
  corrected to `docs/innfo/documentation/sources-citations-lineage.md`.

## Approach

Test-first on `test/console-export.test.mjs`, the payload-builder suites and
`console-golden-parity`: the golden fixtures and any saved-draft fixtures keyed by the old
ids are regenerated (they DO depend on the id scheme; the original #1 called the change
"internal", which was wrong). Then the runtime: Changes view, tab rename, store changes,
bundle rebuild. Last, the releases, following `.agents/skills/nn-dev-release/SKILL.md`.

## Dependencies

After #1A and #1B (L3 changesets, `replaced_sources`, history). Before S2c, which modifies
`console-payload-builder` `Payload Meta` and the review state on top of this slice, and
before S6, which adds stable per-model console files and the freshness status on top of
the domain meta defined here. #1A to #1C reach `main` in one `dev → main` batch.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-core/src/console/payload-builder.ts` | Modified | id = slug; reject unfrozen models |
| `scripts/export-console.mjs` | Modified | `<model>@<slug>` ids; drop `domainVersion`; per-model meta; `changes` collection |
| `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` | New | Changes view |
| `iNNfo/specs/bluepriNNts/console/{review.js,innfo-runtime.js,ui-kit.js}` | Modified | store keying/version; Lineage tab; English copy |
| `test/console-*.test.mjs`, `iNNfo/packages/innfo-core/tests/console-*.test.ts`, golden fixtures | Modified | new ids |
| `test/fixtures/**`, repo domains exported by `build-docs.mjs` | Modified | slugs frozen so the console builds |
| `docs/innfo/documentation/sources-citations-lineage.md` | Modified | three nouns, Lineage tab |
| release tags | New | `blueprints-v*`, `innfo-console-v*`, `innfo-mcp-v*`, `skills-v*` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| A repo domain or sample has unfrozen models and its console export now fails | High | Inventory task freezes every repo domain the build exports; write-once samples are an open question |
| Saved browser drafts keyed by old ids | Certain | Intended: the store version bump discards them (single maintainer) |
| A consumer keys on the old id format | Med | Golden parity, review-store and console-export suites updated first |
| A tag is cut on a red `main` | Low | nn-dev-release pre-release checklist |

## Rollback Plan

Revert the slice commit before the tags are cut. After a tag, roll forward only (tags are
irreversible).

## Success Criteria

- [ ] Every console element id equals its frozen slug (domain: `<model>@<slug>`); a model
      with unfrozen slugs fails the console build with a message naming the model.
- [ ] Two same-named elements in one model get distinct ids from their slugs (golden test).
- [ ] `domaiNN_console.html` has a Changes tab listing proposed and applied changesets.
- [ ] No `domainVersion`; staleness is per draft only.
- [ ] The modal tab reads "Lineage"; no console string uses "Provenance".
- [ ] The four release tags are published and `verify.js --release` is green on `main`.
