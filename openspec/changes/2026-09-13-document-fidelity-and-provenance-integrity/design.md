# Design: Document Fidelity & Provenance Integrity

## AD-1 — Canonical form is what the Level-1 spec documents, not what the serializer emits

**Context.** The serializer and every shipped document disagree on three points:
property indentation (2 spaces vs column 0), list values (`a, b` vs `[a, b]`),
and blank-line separation between elements. Something has to move.

**Decision.** The serializer moves. `iNNfo/specs/iNNfo_V_0-2-1_NN.md` §"Unified
Syntax" shows properties at column 0 in bracket form with a blank line between
elements, and all 11 shipped samples plus every template sample already match
it. Rewriting ~40 documents to match the serializer would fight the spec's own
normative example.

**Consequence.** Byte-identity round-trip (Requirement 1) becomes achievable
without touching a single sample document, and the diff of this change stays
inside `parser/serializer.ts` rather than spreading across the corpus.

## AD-2 — Section order lives on `ParsedModel`, not in the serializer's emit order

**Context.** `serializeModel` emits element sections (from `model.elements`
insertion order), then `rawSections`, then `matrices`. The original document
interleaves all three, so a `# NN Analysis` text section authored at the top
reappears below the element sections.

**Decision.** Add `sectionOrder?: string[]` to `ParsedModel`, populated by
`parseModel` with each `# NN <name>` heading in document order (matrix sections
recorded as `matrices: <name>`). `serializeModel` walks `sectionOrder` first,
dispatching each entry to the right emitter, then appends anything not in the
list (sections created by a mutation) in its current order.

**Alternatives rejected.**
- *Sort deterministically* — stable, but still reorders the author's document.
- *Keep `rawContent` and splice* — this is what `reconcileManifest` does and it
  works there, but the mutation pipeline genuinely rebuilds the element graph;
  splicing would mean maintaining a second write path.

**Consequence.** `sectionOrder` is optional, so a programmatically constructed
`ParsedModel` (tests, `init_model` scaffolding) keeps working unchanged.

## AD-3 — Indentation is stripped on read, not merely avoided on write

**Context.** `Ghostbusters_video-generator_NN.md` gains two spaces of
indentation on every save, without bound. The cause is asymmetric: the
serializer prefixes description lines with two spaces, and the parser does not
strip them, so each cycle compounds.

**Decision.** `parseModel` MUST left-trim the canonical property/description
indentation when reading an element body. Writing at column 0 (AD-1) alone would
fix new documents; stripping on read is what makes Requirement 2 (idempotency)
hold for the documents already damaged in the wild.

## AD-4 — Matrix axis labels are parsed from the header, with the placeholder kept as a genuine fallback

**Context.** `parseMarkdownTable` discards the header's first cell.
`serializeModel` then emits `matrix.source || 'Row'`, so `Metrics \ Variables`
becomes `Row \ Col`.

**Decision.** Parse the first header cell, split on the first `\`, trim both
sides into `MatrixData.source` / `.target`.

**Amended during implementation: the `Row` / `Col` fallback is removed, not
kept.** The original decision was to keep it for a matrix built with no labels
(`init_model`). In practice the placeholder is substituted at WRITE time, so a
document whose matrix genuinely had empty axis labels was written back as
`| Row \ Col |` and re-parsed as the literal strings `Row` and `Col` — the
serializer inventing data that the document never contained. That breaks
Requirement 1 (round-trip identity) and Requirement 2 (idempotency), which are
the point of this work unit; avoiding a visually empty axis header is
cosmetic. Cosmetics do not outrank fidelity, so axis labels are now emitted
exactly as held. This was caught by
`roundtrip.models.golden.test.ts`, whose only two failures were these four
lines.

**Note.** The `| Item \ Marker |` matrices survive today only because
`Item`/`Marker` happen to be special-cased upstream. After this change they are
handled by the same general path; the special case can be removed once the
round-trip test covers them.

## AD-5 — Provenance is a declared type, with name matching demoted to a documented fallback

**Context.** `SOURCE_FIELD_NAMES` decides provenance by name, so
`documentation`'s `source:: markdown_file` field is misdiagnosed as a broken
citation.

**Decision.** Introduce `type:: citation` in the L1 metaschema.
`validateWorkspaceSources` takes an optional schema resolver and asks it whether
a field is a citation field. When no schema resolves, it falls back to
`SOURCE_FIELD_NAMES` — which is what makes this change safe to land without
simultaneously migrating every template.

**Migration.** Shipped templates that mean provenance declare `type:: citation`
and bump `template_version`. `documentation`'s `source` stays
`markdown_file`, which is what fixes the 7 dangling errors.

**Why a new type rather than reusing `file`.** `file` says "a path"; `citation`
says "a path plus an addressable unit, subject to `KU_*` integrity checks". The
validator needs to distinguish them, and so does the editor's lineage view.

## AD-6 — `add_element` consults the schema it is already given

**Context.** `addElement` ignores its `schema` parameter, so an unknown
`conceptName` creates a concept inside a level-3 model.

**Decision.** When `schema` is supplied, look the concept up
case-insensitively; on miss, return a `MutationResult` error naming the concept,
suggesting the nearest declared concept within Levenshtein distance ≤ 2, and
listing the declared concepts otherwise. When `schema` is absent, behaviour is
unchanged — offline scaffolding and existing tests depend on it.

**Placement.** In `addElement`, not in `runMutation`'s gate. The level gate is
about *document level*; this is about *schema conformance*. Conflating them
would block legitimate schemaless use.

## AD-7 — Cross-model element identity is legal; the parser stops advising renames

**Context.** Opening `_samples_nn` emits 24 issues telling the user to rename a
person once per model they appear in. The format already ships
`[[Model Title :: Element Name]]` for exactly this.

**Decision.** The multi-model case is legal. `IdentityRegistry` stops emitting a
rename-advice issue for a name shared **across** models; it MAY record an
`info`-level note naming the qualified form. Collisions **within** one document
keep their current severity.

**This is a product decision, recorded here deliberately.** The alternative —
declaring shared identity illegal and renaming the sample corpus — would make
the qualified-reference syntax pointless.

## AD-8 — Generated version maps, checked in

**Context.** `SHIPPED_TEMPLATE_VERSIONS` and `manifest/source.yaml` versions are
hand-copied from the template specs and have drifted six times.

**Decision.** One generator, `scripts/sync-template-versions.mjs`, reads
`iNNfo/specs/templates/*/spec_NN.md` and writes both copies, following the
`scripts/sync-samples.mjs` precedent exactly: a `--check` mode that exits
non-zero on drift, wired into `check:integrity`.

The generated output is **committed**, not produced at build time, so the editor
bundle has no new build step and the values stay reviewable in a diff.

**Why not delete `SHIPPED_TEMPLATE_VERSIONS` and read from disk at runtime.**
The editor ships to a browser and the specs are not bundled with it; the map
exists precisely so a freshness badge works before any workspace is connected.
Generation keeps that property and removes the drift.

## AD-9 — `moduleResolution: NodeNext` over bundling innfo-core

**Context.** `"bundler"` resolution emits specifiers Node rejects.

**Decision.** Move `innfo-core` to `moduleResolution: "NodeNext"` with explicit
`.js` extensions on relative imports. This keeps `dist/` as readable,
debuggable, tree-shakeable per-module output that Vite and tsup both handle,
rather than introducing a fourth build tool.

**The ambiguity must be resolved too.** `dist/types.js` and `dist/types/` both
exist. `src/types.ts` re-exports the `types/` barrel; the source file is
renamed so the emitted specifier is unambiguous.

**Verification.** A Node-process smoke test importing the built `dist/`. It must
not run under Vitest's resolver, because Vitest is one of the bundlers that
hides the defect.

## AD-10 — Concurrency boundary

A second session is editing this working tree under
`2026-09-13-silent-fallbacks-sweep` (catch-site classification across
`innfo-core` and `innfo-mcp`) and `2026-09-13-mcp-coverage-debt`. Files touched
by both are `sourceRef.ts`, `parser/sections.ts`, `queryUnits.ts`, `helpers.ts`,
`recursiveParser/workspace.ts` and `validator/baseline.ts`.

**Rule for this change:** edit only the functions this change owns, never revert
an unrelated `catch (err)` rewrite, and re-read any shared file immediately
before editing it.

## Risk Register

| Risk | Mitigation |
| --- | --- |
| Round-trip change breaks the golden snapshots | `recursiveParser.models.golden.test.ts` snapshots are regenerated and reviewed as part of the same work unit, not silently accepted |
| `NodeNext` breaks the editor's Vite build | Editor typecheck + build run in the same work unit; `exports.browser` is covered by Requirement 3 |
| `type:: citation` bumps many `template_version`s at once | Generator (AD-8) lands **before** the template edits, so the version copies stay consistent automatically |
| Concurrent session conflict | AD-10; work units are committed small and often |
