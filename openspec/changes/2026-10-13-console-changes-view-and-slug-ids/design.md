# Design: #1C — console Changes view, slug element ids, Lineage vocabulary and draft store

## Context (verified against code, 2026-10-13)

- `payload-builder.ts`: `id = slugify(concept + ' ' + name)`, made unique with `-1`, `-2`;
  the frozen slug is a separate `slug` field.
- `export-console.mjs:675-700` qualifies ids as `${mId}/${el.id}` where `mId` is
  `meta.modelId` (a path stem), and rewrites `relations[].target` accordingly.
- `export-console.mjs:755-769`: `domainVersion = V_1-0-<int>` from a content hash and
  `domainId = <folder>-<hash(abs path)>`.
- Slugs are explicit only after `freeze_slugs` (`sections.ts:217-219`); any mutation
  freezes first (`stable-element-identity`), so models touched by a changeset are frozen,
  hand-written or sample models may not be.
- `review.js:90-146` `createDraftStore(storage, modelId, modelVersion)` keeps the recorded
  version sticky while drafts exist; `innfo-runtime.js:893,905-908,4598,4781,4815,5044,5184`
  fall back across `meta.modelVersion` / `meta.knowledge_version`.
- Tab strings: `ui-kit.js:1561,1565,1648,1670,1672`; `review.js:361,718`.
- Changesets are already loaded at export time (`loadChangesetRecords`) for
  `element.history`, which lists applied changesets only.

## D1 — Slug ids, no fallback (was D6)

- `buildConsolePayload`: `element.id = element.slug`. If any element of the model lacks an
  explicit (frozen) slug, the builder throws `UNFROZEN_MODEL` naming the model and the
  count of unfrozen elements, with the remedy: freeze the model's slugs (the `freeze_slugs`
  operation, or `node skills/nn-upgrade/scripts/migrate-domain.js --domain-dir <dir>
  --freeze-slugs`). No derived id is ever produced.
- Domain console: `el.id = <model>@<element_slug>` where `<model>` is the model id used as
  the model part of changeset targets (the file stem), so a console id IS the D5 element
  address. `relations[].target`, drafts, reviewed marks and `elementsById` key on it.
- Duplicate display names are unambiguous because slugs are unique per model; a golden test
  covers two same-named elements.
- Consumers that DO depend on the id format: `console-golden-parity` fixtures, saved
  browser drafts and reviewed marks. Goldens are regenerated; browser state is discarded
  (D3). The original #1 called this change internal; it is not.

## D2 — The `changes` collection and the Changes view (was D5)

- The domain payload carries `changes: [{ path, title, author, status, appliedAt,
  changes: [{ id, op, target, author, notes, status, sources, replaced_sources }] }]` for
  every `changes/*_changes_NN.md` (proposed, applied, partially applied, rejected,
  conflict), newest first by file stamp. Empty array when the domain has none. Never
  written into a model.
- `iNNfo/specs/bluepriNNts/changes/assets/console-view-changes.js` registers a `readonly`
  view (`registerView`, `console-view-` prefix, flat under `assets/`) rendering the
  collection as the "Changes" tab after the built-in tabs. Proposed changesets are listed
  first so the S6 review flow can point the user at them.

## D3 — Draft store (was D7)

- Key: stable and path-scoped (`domainId = <folder>-<hash(abs path)>`); `workspace_id` is
  not used. Drafts survive regeneration.
- Staleness: per draft only (`base_hash`, `isTargetChanged`). `createDraftStore` loses its
  `modelVersion` parameter and the sticky recorded version; the runtime reads the version
  it displays from the domain meta `models[]` (D4), with no fallback chain.
- `STORE_VERSION` is bumped: a store written with the old id scheme fails the existing
  version check and reads as empty. That is not a migration; old drafts are dropped.
- No rebase or refresh: an outdated console is harmless, apply detects staleness
  (`partitionChangeset`) and the agent resolves conflicts in chat (D10).
- `--view` keeps its isolated store (`::view:<id>`).

## D4 — Domain meta

- `domainVersion` is deleted. The domain meta carries `generated` (the build stamp) and
  `models: [{ id, title, knowledge_version, sha256 }]` (the real per-model versions and
  content hashes it was built from). S6 reads these for `--status` freshness and for the
  regeneration result; S6 adds no second embedding.

## D5 — Vocabulary (was D8)

- Canonical nouns: Source / Citation / Lineage. The modal tab is "Lineage"; its sections
  are "History" and "Citations"; the per-field control is labelled "Origin" and maps 1:1 to
  a Citation. "reference" stays reserved for `type:: reference` fields.
- `provenance-vocabulary` named `docs/innfo/documentation/citations-provenance.md`, which
  does not exist; the file is `sources-citations-lineage.md`. The requirement is corrected.

## D6 — Releases

The `changes` template package (#1A template, #1C view asset), the console runtime, the MCP
(#1A, #1B apply changes) and `skills/nn-innfo/SKILL.md` (#1A) changed. After the
`dev → main` batch that carries #1A to #1C, tag in this order, following the pre-release
checklist of `.agents/skills/nn-dev-release/SKILL.md`: `blueprints-v<next>` (with the
catalog repin and stable-ref bump the release procedure requires), `innfo-console-v<next>`
(bundle banner + `build-console-shells.mjs`), `innfo-mcp-v<next>` (`sync:versions`, build,
`build:bundle`), `skills-v<next>`.
