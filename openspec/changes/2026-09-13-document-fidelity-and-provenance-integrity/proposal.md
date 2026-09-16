# Proposal: Document Fidelity & Provenance Integrity

## Context

A user-flow analysis of `dev` @ `6e7481f`, backed by an executable simulation of
real user journeys (`simulacro/`, 8 scenarios, `simulacro/FINDINGS.md`), found
that the architecture is sound but the **edges** are not: what the product
writes back to disk, what it ships to a new user, and how it is packaged.

Three defects undermine the product's core premise directly.

1. **Saving a model destroys user data.** `parseModel → serializeModel` is not
   the identity on any shipped sample. Matrix axis labels (`Metrics \ Variables`)
   are replaced with a placeholder (`Row \ Col`) in 31 matrices across 9 of 11
   samples, because `parseModel` never captures the axis labels from the table
   header. Section order is reshuffled in 5 of 11 samples, bracketed list values
   are unwrapped (133 occurrences), blank-line structure is stripped and
   properties gain two spaces of indentation. One sample
   (`Ghostbusters_video-generator_NN.md`) is not even a fixed point — it gains
   two more spaces of indentation on every save, without bound.

   This is the path `innfo-mcp`'s `apply_change` takes on **every** agent write
   (`model-io.ts:37`) and the path the editor takes for every file the user has
   edited (its own serializer labels it the "canonical (lossy path)",
   `recursiveSerializer.ts:163`). The entire premise of iNNfo is that a model is
   a plain-text file a human can read, diff and hand-edit; a one-field edit that
   reorders the document and replaces the axis labels of 13 matrices produces a
   diff nobody can review, and the axis labels are information the user typed
   that is now gone.

2. **The shipped sample workspace is broken.** `_samples_nn/sources/nn/` and
   `_samples_nn/artifacts/` are empty, while `workspace_NN.md` registers an
   artifact that does not exist and `Ghostbusters_documentation_NN.md` cites 7
   source files that do not exist — 7 `KU_DANGLING_FILE` errors on first open.
   Of 11 sample models exactly one carries a `source::` field, although 11
   templates declare one. Source traceability is the headline capability and the
   flagship demo neither demonstrates it nor validates clean.

3. **`innfo-core` cannot be consumed from Node.** `moduleResolution: "bundler"`
   emits extensionless directory imports that Node ESM rejects with
   `ERR_UNSUPPORTED_DIR_IMPORT`, while `package.json` advertises the package as
   `"type": "module"` with `"main": "./dist/index.js"`. Every current consumer
   hides this behind a bundler (Vite, Vitest, tsup).

Four further defects compound them:

4. **Template version registration drift, sixth recurrence.** `6e7481f` bumped
   `business` to `V_0-2-5` and left `SHIPPED_TEMPLATE_VERSIONS` at `V_0-2-4`,
   leaving `dev` red at HEAD. `manifest/source.yaml` — the CDN manifest users
   install from — is separately stale for `workspace` (`V_0-2-1` recorded vs
   `V_0-4-0` shipped) and `business-model` (`V_0-2-1` vs `V_0-2-2`). Both are
   hand-maintained duplicates of a fact that already lives in
   `specs/templates/*/spec_NN.md`.

5. **Citation vocabulary keys on field NAME, not declared TYPE.**
   `SOURCE_FIELD_NAMES = {'sources','source'}` decides what is provenance by
   name alone. The `documentation` template declares `source` as
   `type:: markdown_file` — a content path, not provenance — and the validator
   reports it as a broken citation anyway. This is the mechanism behind the 7
   dangling citations in defect 2, and it means no template can name a field
   `source` for any other purpose.

6. **`add_element` bypasses the template-authoring gate.** `addElement` never
   consults the `schema` argument it is handed, so an unknown `conceptName`
   silently creates a new concept inside a level-3 model — exactly what the
   level-2 gate exists to prevent. `add_concept` is blocked; `add_element` with
   an unknown concept achieves the same result by the back door.

7. **Cross-model element identity fights the multi-model design.** Opening
   `_samples_nn` emits 40 parse issues, 24 of the form *"Element `Dr. Peter
   Venkman` appears in both `Ghostbusters_business` and
   `Ghostbusters_organization` — consider renaming to `Dr. Peter Venkman
   (Ghostbusters_organization)`"*. The same entity appearing in several models
   is the point of a multi-model workspace, and `[[Model :: Element]]` exists
   precisely to disambiguate it.

## Proposed Changes

1. **Round-trip fidelity as an enforced invariant.** Capture matrix axis labels
   in the parser; preserve section order, bracketed list values, blank-line
   structure and property indentation through serialization; make
   `serializeModel(parseModel(x)) === x` a test over every file in
   `_samples_nn` and over the editor fixtures.
2. **Citation text fidelity.** `serializeKnowledgeUnitRef` MUST emit the
   human-readable heading text, not the derived slug.
3. **Provenance by declared type.** Introduce `type:: citation` in the L1
   metaschema; resolve citation fields from the schema, keeping name matching
   only as the fallback for schemaless documents.
4. **Close the `add_element` gate hole.** Reject unknown concepts when a schema
   is supplied, with a did-you-mean hint.
5. **Repair the shipped sample workspace.** Add the normalized sources the
   documentation model cites, add `source::`/`sources::` citations to the
   models that should demonstrate traceability, and either produce the declared
   artifact or stop declaring it. Resolve the intra-model slug collisions in
   `Ghostbusters_business_NN.md`.
6. **Decide cross-model identity.** Shared element identity across models is
   **legal** — the qualified-reference syntax is the disambiguation mechanism.
   Downgrade the cross-model case to an informational note and drop the rename
   advice; keep intra-model slug collisions as issues.
7. **Single source of truth for template versions.** Generate
   `SHIPPED_TEMPLATE_VERSIONS` and the `manifest/source.yaml` version fields
   from `specs/templates/*/spec_NN.md`, and add a `check:integrity` gate so the
   drift is caught at commit time rather than by a unit test.
8. **Fix the package format.** Emit Node-resolvable ESM and add a smoke test
   that imports the built package in a plain Node process. Extend
   `npm run typecheck` to cover `innfo-mcp`.
9. **Repair the editor flows named in FINDINGS F-12..F-16** and remove the dead
   code in F-17 and the Low section.

## Non-Goals

- **An in-app source import affordance** (FINDINGS F-18). Ingestion lives in the
  agent/CLI procedures by design; adding a drag-and-drop ingest flow to the
  editor is a feature, not a repair, and belongs in its own change. Recorded in
  `openspec/backlog.md`.
- **Replacing `canonical-registry.ts` with a generated file.** Its 2116 lines of
  vendored template content are a real duplication risk, but regenerating it
  touches the offline-resilience contract and deserves its own change.
- **Any change to the `catch`-site classification currently in flight** under
  `2026-09-13-silent-fallbacks-sweep`, or to the coverage ratchet under
  `2026-09-13-mcp-coverage-debt`. Both are owned by a concurrent session sharing
  this working tree.

## Affected Modules

| Module | Surface |
| --- | --- |
| `iNNfo/packages/innfo-core` | `parser/`, `sourceRef.ts`, `mutate.ts`, `validator/workspaceSources.ts`, `recursiveParser/`, `tsconfig.json` |
| `iNNfo/packages/innfo-mcp` | typecheck wiring only (no behavioural change) |
| `iNNfo/apps/innfo-editor` | `config/samples.ts` (generated), `LeftSidebar.vue`, `HomeView.vue`, `ConsoleHubView.vue`, `ModelInfoPanel.vue`, persistence repositories |
| `iNNfo/specs` | L1 metaschema (`citation` field type), template `template_version` bumps |
| `_samples_nn` | sources, citations, artifact, slug collisions |
| `manifest/`, `scripts/` | generated version fields, new integrity gate |
| `openspec/specs` | stale `master.html` requirement |
| `simulacro/` | scenarios become the acceptance evidence for this change |
