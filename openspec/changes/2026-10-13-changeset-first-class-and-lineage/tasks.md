# Tasks: changeset first-class + lineage closure + vocabulary alignment

`openspec/config.yaml` is `strict_tdd: true`: each group leads with its test, then the
implementation, then the verification (lint/typecheck/test) for that group.

## 1. Changeset as a valid L3 document

- [ ] 1.1 TEST: `validate_knowledge` on a fixture applied changeset MUST return
      `valid: true` (asserts `level`, `parent_spec.name`).
- [ ] 1.2 Add `level: 3`, `type: changeset`, `parent_spec: { name, url }`, optional
      `changeset_id` to the `changes` blueprint template
      (`iNNfo/specs/bluepriNNts/changes/spec_NN.md`) and bump `blueprint_version`.
- [ ] 1.3 Mirror the spec into `innfo-core/src/schema/canonical-registry.ts` (embedded
      `CHANGES_SPEC_CONTENT`).
- [ ] 1.4 `ChangesetFrontmatter` gains `changeset_id?: string`; `serializeChangeset`
      emits the L3 frontmatter. Update `changes/parser.ts` and `changes/serializer.ts`.
- [ ] 1.5 Update the console `serializeChangesetMarkdown` frontmatter to match.
- [ ] 1.6 Rebuild `console-payload.generated.cjs`; run `verify.js` drift check.

## 2. `Change` as a lineage node role (chain closure)

- [ ] 2.1 TEST: a change with `sources:: changes/<x>.md@## NN Change: <id>` resolves via
      `createFsSourceResolver` and appears as a citation.
- [ ] 2.2 Add a `sources` field (type `citation`) to the `Change` concept in the
      `changes` blueprint + `canonical-registry.ts`.
- [ ] 2.3 Emit `sources::` on evidence-bearing changes in `apply-change.ts`; a bare
      comment change carries none.
- [ ] 2.4 TEST: `field → change → source` closes end-to-end on a fixture; no snapshot
      read is involved.

## 3. Remove the dead snapshot mechanism

- [ ] 3.1 TEST: applying a changeset writes no file under `kNNowledge/archive/`.
- [ ] 3.2 Remove the Phase-2 archival block (`apply-change.ts` ~`1077-1104`).
- [ ] 3.3 REMOVE the `Snapshot Archival to kNNowledge/archive/` requirement from
      `knowledge-version-and-snapshot`; keep the deep `archive` exclusion.
- [ ] 3.4 Delete/adjust snapshot tests; assert the deep `archive` exclusion still holds
      for `sources/archive/`.

## 4. Proposal immutability; outcome recorded separately

- [ ] 4.1 TEST: after apply, the proposed change blocks are byte-identical to the input;
      `verifyProposalSha` still returns `true`.
- [ ] 4.2 `serializeChangeset` keeps the proposed blocks untouched and writes the outcome
      into frontmatter + a trailing `## NN Changeset Outcome` section.
- [ ] 4.3 Confirm no JSON ledger is introduced (D865).

## 5. Changes as a renderable artifact

- [ ] 5.1 TEST: the payload carries a `changes` collection derived from `changes/*.md`.
- [ ] 5.2 `buildConsolePayload` (and the domain aggregation in `export-console.mjs`)
      attach `changes`.
- [ ] 5.3 New `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js`
      (`registerView`, `kind: readonly`) rendering the collection.
- [ ] 5.4 TEST: `export-console.mjs --domain` includes the view and the Changes tab
      renders; header lists the view.

## 6. Console element identity keyed on the frozen slug

- [ ] 6.1 TEST: `element.id === element.slug`; relations and drafts key on it.
- [ ] 6.2 `payload-builder.ts`: `id = node.slug` (fallback to the derived slug when
      absent); remove the occurrence-suffix scheme.
- [ ] 6.3 `export-console.mjs` domain qualification follows `el.slug`.
- [ ] 6.4 MODIFY the `console-payload-builder` "Element Ids" requirement; update the
      golden test.

## 7. Console draft-store decisions + vocabulary

- [ ] 7.1 Drop the fake `domainVersion` in `export-console.mjs`; surface real
      `knowledge_version` per model + build stamp.
- [ ] 7.2 Rename the console "History & Provenance" tab to **Lineage**; label the
      per-field control **Origin** (English).
- [ ] 7.3 Audit console strings/docs for the three nouns; remove standalone
      "provenance"/"traceability"; update `docs/innfo/documentation/citations-provenance.md`.
- [ ] 7.4 TEST: no console string uses a fourth noun; all strings English.
- [ ] 7.5 Add spec prose recording the draft-store decisions (stable key, per-draft
      `base_hash`, no rebase, isolated `--view`).

## 8. Backlog sync

- [ ] 8.1 Mark S1/S2a/S2b archived in `openspec/backlog.md`; reduce the item to
      S2c/S3/S4/S5 with a pointer to this change.

## 9. Verification

- [ ] 9.1 `npm run typecheck` + `npm run typecheck:scripts`.
- [ ] 9.2 `node scripts/verify.js` (mirrors, drift, catalog).
- [ ] 9.3 `npm test` for `innfo-core` and `innfo-mcp`; regenerate the console bundle.
- [ ] 9.4 Re-export the TestLab domain console and eyeball the Changes tab + Lineage
      tab.
- [ ] 9.5 Bump the `changes` blueprint; prepare the `blueprints-v*` release note.
