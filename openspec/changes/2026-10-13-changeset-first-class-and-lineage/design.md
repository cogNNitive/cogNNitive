# Design: changeset first-class + lineage closure + vocabulary alignment

## Context

This change touches four subsystems that currently disagree: the `changes` document
model + validator, the apply engine's provenance chain, the console payload/UI, and
the canonical vocabulary. The unifying idea is the one the codebase already states but
does not fully honour: **lineage is ONE edge primitive — a `sources` citation — and node
roles are derived from folder + contract** (`openspec/specs/lineage-single-edge/spec.md`).

## D1 — Changeset is a valid iNNfo Level-3 document

**Today**: a changeset's frontmatter is
`{ spec_version, parent_spec: "changes", blueprint_version, status, proposal_sha, title, author }`.
The L3 validator rejects it (`Missing level field`, `Parent_spec missing name`).

**Target** frontmatter:
```yaml
---
spec_version: "V_0-4-0"
level: 3
type: changeset
parent_spec:
  name: changes
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/bluepriNNts/changes/spec_NN.md"
blueprint_version: "V_0-2-0"      # bumped from V_0-1-0
changeset_id: "<workspace_id>_<author>_<stamp>"   # optional, defaults to the file stem
status: proposed
proposal_sha: "<64 hex>"
title: "..."
author: "..."
---
```

- `changeset_id` is **optional**: the filename stem remains the de facto identity (it is
  unique via the UTC stamp). It exists so a citation can reference a changeset without
  depending on the file path, which is brittle if the file moves.
- The `changes` blueprint template (`### Level 3 Changeset Template`) is fixed in the same
  commit; `canonical-registry.ts` embeds the same content and is regenerated.
- The changeset parser tolerates unknown frontmatter keys already; no break for files on
  disk. `ChangesetFrontmatter` gains `changeset_id?: string` and keeps the index signature.

## D2 — `Change` is a lineage node role, with a `sources` citation field

- Add to the `Change` concept a `sources` field typed `citation` (the single citation
  field type). A change MAY cite the evidence it derives from.
- No resolver work is required: `createFsSourceResolver` resolves a `changes/<file>@## NN Change: <id>`
  reference against `rootDir` (it is not restricted to `sources/`), so a changeset is
  already a valid citation target. This change only **declares** the role and writes the
  edge.
- **Chain closure rule**:
  - A change backed by evidence (source import, cognitivize, an agent change derived from
    a document) MUST carry `sources::` pointing at that evidence.
  - A change with no evidence (a bare review comment) intentionally ends the chain at
    itself; this is not an error, it is "manually authored".
- Node roles become: **Source** (`sources/`), **kNNowledge** (`kNNowledge/`), **artifact**
  (`artifacts/`), **change** (`changes/`). All folder-derived; no stored type field.

## D3 — Remove the dead snapshot mechanism

- Delete the Phase-2 archival block in `apply-change.ts` (`kNNowledge/archive/` copy +
  rename into it, ~`:1077-1104`). The model is still written atomically; only the
  snapshot side-effect goes.
- Keep `isExcludedPath`'s deep `archive`/`staging` exclusion: `sources/archive/` still
  exists and must stay invisible.
- Rationale: verified that **nothing reads `kNNowledge/archive/`** (it appears only in
  exclusion lists). History is covered by the changeset chain (each change records
  `from`→`to`) and by git.

## D4 — Proposal immutability; outcome recorded separately

- The sealed proposal is the user's input and must not change. Today `apply_change`
  rewrites the whole changeset file with annotations (`status::`, `applied_at`, `models`).
- Target: keep the proposed change blocks byte-identical. The outcome lives in
  frontmatter (`status`, `applied_at`, `models`, `changeset_id`) and a dedicated
  trailing `## NN Changeset Outcome` section. `computeProposalSha` already excludes
  execution fields, so the seal is unaffected; the guarantee is now that the **proposal
  bytes never change**, not merely that the seal still matches.
- No `change-log.jsonl`: a JSON ledger is an explicit non-goal (D865). The outcome stays
  markdown.

## D5 — Changes as a renderable artifact (dog-fooding)

- The `changes` blueprint ships `assets/console-view-changes.js` (blueprint-view
  convention: flat under `assets/`, `console-view-` prefix), registered via
  `registerView` with `kind: readonly` unless editing changes is intended (default
  `readonly`).
- The domain payload (`buildConsolePayload` for a domain, or the domain aggregation in
  `export-console.mjs`) gains a `changes` collection: `{ changesetId, path, author,
  status, appliedAt, changes: [...] }`, derived at export time from `changes/*.md`
  (already loaded by `loadChangesetRecords`).
- The view renders the collection as a tab in `domaiNN_console.html`. This reuses the
  existing view registry + tab shell; no new console infrastructure.

## D6 — Console element identity keyed on the frozen slug

- `payload-builder.ts` currently derives `id = slugify(concept + ' ' + name)` with an
  occurrence suffix. Since S1, elements carry an immutable `slug`; the payload keeps it
  in a separate `slug` field. This split is the root of the two-id-space friction.
- Target: `element.id = element.slug` (the frozen slug). `relations[].target` and the
  domain qualification in `export-console.mjs` follow. Both runtimes read `el.id`
  opaquely, so the blast radius is the payload builder + the domain aggregation pass.
- The `console-payload-builder` "Element Ids MUST NOT change" requirement is MODIFIED to
  key on the slug.

## D7 — Console draft-store decisions (documented, one code change)

- **Key**: stable and path-scoped (`domainId = <folder>-<hash(abs path)>`). `workspace_id`
  is NOT used. Drafts survive regeneration; they are browser-local by nature.
- **Staleness**: per draft, via `base_hash` (`isTargetChanged`). No store-level staleness.
- **Signal**: the fake `domainVersion = V_1-0-<content-hash-int>` is dropped; the console
  carries each model's real `knowledge_version` + a build stamp.
- **No rebase/refresh**: an outdated console is harmless — apply detects staleness
  (`partitionChangeset`) and the agent resolves conflicts in chat (D10).
- **`--view`**: keeps an isolated store (`::view:<id>`); unifying to shared is a future
  option only if usage demands.

## D8 — Vocabulary alignment

- Canonical nouns stay exactly **Source / Citation / Lineage**; "provenance" is not a
  standalone concept, "referencia/reference" is reserved for structural cross-model
  fields (`type:: reference`).
- Console UI: rename the "History & Provenance" tab to **Lineage**; the per-field control
  is labelled **Origin** for users but maps 1:1 to *Citation* internally.
- All console strings, docs and specs are English.

## Cross-cutting constraints

- **Generated mirrors**: bumping the `changes` blueprint regenerates
  `canonical-registry.ts`, `blueprints` catalog and the console bundle/payload mirrors.
  `verify.js` drift checks gate the run.
- **Write-once specs**: the `changes` blueprint is a bluepriNNt → new `blueprint_version`,
  catalog entry, and a `blueprints-v*` release inside the slice.
- **Single writer**: unchanged; the lock + two-phase apply stay.
- **TDD**: `openspec/config.yaml` is `strict_tdd: true`; test-first steps lead `tasks.md`.

## Migration

- Test domains are throwaway (single maintainer). No migration script: re-export the
  console and re-seal changesets to pick up the L3 frontmatter.
- `nn-upgrade` (slice S4) is out of scope here.
