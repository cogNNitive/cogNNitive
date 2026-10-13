# Design: #1B — proposal immutability on apply and removal of the model snapshot

## Context (verified against code, 2026-10-13)

- Phase 2 (`apply-change.ts:1077-1104`) creates `kNNowledge/archive/` when a model is
  touched and calls `persistWithArchive(staging, live, archive)` (`:552-560`): copy the
  live file to the archive, then rename the staged file over the live one.
- The changeset is written back with `serializeChangeset(csDoc)` at `:880` (conflict path)
  and `:1142` (success path); the serializer re-renders the whole file.
- The `apply_change` tool description says "persist with snapshot archival" (`server.ts:327`).
- `field-citation-provenance` claims historical citations are read from the snapshot;
  nothing in the code does so.
- Per-change annotations are load-bearing: `history.ts:101` (applied history),
  `conflicts.ts:133,140` (earlier `resolved_slug`), `apply-change.ts:945,1026`.

## D1 — Immutability means the normative bytes never change

- The execution facts stay where they are: frontmatter `status` / `applied_at` / `models`
  and per-change `status::` / `resolution::` / `resolved_slug::` / `replaced_sources::`.
  There is no trailing outcome section (the parser would read it into the last change).
- At the end of Phase 1 apply computes the changeset write-back bytes with the #1A
  raw-text-preserving `serializeChangeset` and asserts, for every change block, that the
  sequence of normative lines (every line except the four annotation keys) is
  byte-identical to the input. A difference aborts with `PROPOSAL_IMMUTABILITY_VIOLATION`
  before Phase 2: no model, changeset or `.tmp` file is written and the lock is released.
  The same assertion guards the conflict write-back path (`:880`).
- `verifyProposalSha` still runs at intake; the assertion is the stronger byte-level
  guarantee for everything outside the seal's canonical projection (formatting, quoting,
  unknown lines).

## D2 — Copy-free atomic persist

- `persistWithArchive` becomes `persistAtomic(staging, live)`: write `<model_stem>.tmp`,
  then rename it over `kNNowledge/<model_stem>_NN.md`. The live file is never removed or
  moved first. A failed rename removes the `.tmp` and leaves the live file byte-identical.
- The archive directory, its naming contract and the `copyFile` import are deleted.
- The deep `archive` / `staging` exclusion of `isExcludedPath` stays (`sources/archive/`).

## D3 — `replaced_sources`: lineage without a snapshot

- D20 rewrites the citation of every touched field to the applying change. When the field
  already had a citation, the replaced value is lost once the snapshot is gone.
- Minimal mechanism: apply writes the exact replaced citation value into the change's
  `replaced_sources::` execution annotation. Every change op touches at most one field
  citation; `add_element` replaces none and writes none. It is an annotation, so it is
  outside the seal and allowed by the D1 assertion.
- The lineage walk becomes: field `sources` to `changes/<cs>@## NN Change: <id>`, then
  that change's `sources` (its evidence, #1A) and `replaced_sources` (the field's previous
  origin: a Source or an earlier change), and so on until a Source or a change with
  neither. Git keeps the full file history; no tool needs a model snapshot.
- `history.ts` exposes `replaced_sources` on history entries so lineage consumers
  (`resolve_sources`, the console history) can follow it.

## Cross-cutting

- `strict_tdd: true`: the snapshot assertions are rewritten first (red), then the code.
- Regenerate the innfo-mcp bundle; the innfo-mcp release for #1A to #1C is cut with the
  #1C releases.
- No file under `iNNfo/specs/` changes in this slice.
