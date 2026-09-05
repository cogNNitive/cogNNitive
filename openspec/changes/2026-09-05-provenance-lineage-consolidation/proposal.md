# Proposal: Provenance & Lineage Consolidation for the iNNfo Pipeline

## Intent

Close the gaps found in the source→model→artifact pipeline audit (2026-09-05) and
collapse its overloaded traceability vocabulary into a single, intuitive model.
The pipeline's first leg (raw ingestion → `sources/nn/`) is solid and automated;
everything downstream (model grounding, artifact synthesis, lineage recording) is
manual, unvalidated outside the Vue editor, and described by three competing
conventions and four different words for the same idea.

This change makes source references a first-class, validated primitive in
`@cognnitive/innfo-core` (and therefore in `innfo-mcp`), makes the lineage record
auto-synchronise from the filesystem for **all** of its sections (not just
`Sources`), flattens the artifact output convention to one directory, deletes a
dead spec, and rewrites the vocabulary around three terms: **Source**,
**Citation**, **Lineage**.

Delivered as a chain of stacked PRs to `main` (safest → most breaking), each PR
green on `npm run verify` before merge.

## Affected modules

| Module | What changes |
| :--- | :--- |
| `iNNfo/packages/innfo-core` | New typed `SourceRef` primitive, shared slug algorithm, `sources::` validation in `validator/`, `provenance` → `editAttribution` field-value rename |
| `iNNfo/packages/innfo-mcp` | `validate` tool surfaces `sources::` diagnostics |
| `iNNfo/apps/innfo-editor` | `utils/sourceRef.ts` becomes a thin re-export of core; `shared/provenance.ts` follows the `editAttribution` rename |
| `actioNN/skills/nn-trannsform` | Recursive bootstrap copy; lineage record full filesystem sync + `--check`; stop copying `.md` into `assets/`; delete Beatles fixtures + gut the heuristic transformer; `artifacts/` flattening; English-only strings |
| `actioNN/skills/nn-innfo` | `SKILL.md` §4 and other Spanish blocks translated to English; vocabulary aligned |
| `docs/innfo/documentation` | `citations-provenance.md` rewritten around Source / Citation / Lineage; OKF / PROV-O / RO-Crate claims dropped or marked planned |
| `iNNfo/openspec/specs` | `export-navigator/spec.md` and its archived change deleted |

## Scope

### In scope

**P0 — contained correctness**

1. **Typed source references in core (PR 1).**
   - Move the source-reference parser and the GitHub heading-slug algorithm from
     `innfo-editor/src/utils/sourceRef.ts` into `@cognnitive/innfo-core`
     (`src/sourceRef.ts`), single implementation shared by editor, core, and MCP.
   - In `recursiveParser/normalize.ts`, recognise a field literally named
     `sources` (list or scalar) as a `SourceRef[]`, attach it structurally to the
     `ModelNode` (`node.sources`), and emit a `source`-kind relationship edge.
   - Add `validator` checks (workspace scope, using the existing host
     resolver callback pattern): referenced file exists → `error` if not;
     heading slug exists in that file → `warning` if not; `#L<n>` / `#L<a>-L<b>`
     line-range anchors → `error`; `src-NNN` wrapper → `error`.
   - `innfo-mcp` `validate` returns these diagnostics.
   - `innfo-editor/src/utils/sourceRef.ts` re-exports from core; no behaviour
     change in the editor.

2. **Recursive bootstrap copy (PR 2).**
   - `nn-trannsform` `bootstrapProject` copies `--src` into `sources/original/`
     **recursively, preserving subfolder structure**, and reports the file count.
     Today it does a flat `readdirSync` + `isFile()` and silently drops every
     file below the top level.

3. **English-only strings (PR 3).**
   - Translate every Spanish user-facing string in code, skills, and specs:
     the `.doc` skip message in `scanner-core.js`, `nn-innfo/SKILL.md` §4
     "Protocolo de Proveniencia" and the other Spanish blocks, the "Sencillo"
     format in `nn-trannsform/citations.md`, and a sweep of `openspec/specs`.

**P1 — make the lineage real**

4. **Lineage record full filesystem sync (PR 4).**
   - `buildProvenanceModel` populates **all four** sections from the workspace,
     not only `# NN Sources`:
     - `# NN Models` — one entry per `models/*_NN.md`, `derived_from::` taken
       from that model's parsed `sources` (uses PR 1).
     - `# NN Artifacts` — one entry per file under `artifacts/`, `derived_from::`
       taken from the artifact's frontmatter / embedded model reference.
     - `# NN Procedures` — **append** one entry per CLI run (`--scan`,
       `--import-url`, `--apply`, `--lineage`): command, flags, timestamp,
       discovered inputs/outputs. (Append-log semantics, unlike the idempotent
       replace used for the other three.)
   - New `--check` mode: report drift — a model with no lineage entry, an
     artifact citing a model version absent from the workspace, a `sources::`
     pointer that resolves nowhere. This is the salvageable half of the dead
     Export Navigator spec, done against the real conventions.

**P2 — conventions & vocabulary**

5. **Flatten `artifacts/` (PR 5).**
   - Drop the `artifacts/exports/` + `artifacts/reports/` split; everything
     generated goes to `artifacts/`. Reports are distinguished by a `type:`
     frontmatter key (and/or a `*_report.*` filename suffix), not a folder.
   - Update `nn-trannsform/SKILL.md` §5, the workspace layout diagram, and the
     directory list created by `scripts/index.js`.

6. **Delete the Export Navigator spec (PR 6).**
   - Remove `iNNfo/openspec/specs/export-navigator/spec.md` and
     `iNNfo/openspec/changes/archive/2026-07-11-export-navigator/`.
   - Its only live requirement (remove "Copy Table MD" from `MatricesGrid.vue`)
     is already implemented; its stale-artifact-detection idea is absorbed by
     the `--check` mode in PR 4.

7. **Consolidate vocabulary to Source / Citation / Lineage (PR 7).**
   - **Source** — a normalised file in `sources/nn/`, with its *origin metadata*
     (`sha256`, `source_file`, `source_url`).
   - **Citation** — a pointer from an element (model, `sources::`) or a claim
     (artifact, `[^1]` / APA / …) to a Source section. Same concept at two
     altitudes.
   - **Lineage** — the single generated record (`<Project>_…_cogNNitive_NN.md`)
     stating, for every Source / Model / Artifact / run, what it derives from.
   - Rewrite `docs/innfo/documentation/citations-provenance.md` around these
     three; drop OKF v0.1 / W3C PROV-O / RO-Crate references or mark them
     explicitly "planned, not implemented"; remove the `artifacts/canonical/`
     view that never shipped.
   - Rename the frontmatter key `references:` (external works cited) to
     `cited_works:` to end its collision with the iNNfo `reference`-typed field.
   - Rename the per-`FieldValue` `provenance: { author, timestamp }` envelope in
     `innfo-core` and `innfo-editor/src/shared/provenance.ts` to
     `editAttribution` — it records who last edited a field in the GUI, an
     editor-session concern distinct from Lineage.
   - Align the wording of `nn-trannsform/SKILL.md` and `nn-innfo/SKILL.md`.

**P3 — cleanup**

8. **Remove Beatles fixtures + gut the heuristic transformer (PR 8).**
   - Delete `actioNN/skills/nn-trannsform/examples/raw/{Beatles,BeachBoys,RollingStones}.txt`.
   - `runHeuristicTransformation` currently emits a hardcoded
     "Member / Instrument" table lifted from the Beatles example — useless for
     any other domain. Replace it with a genuine passthrough (concatenate the
     normalised sources under the template's headings) **or** remove the fallback
     path entirely and require the agent to perform the transform.
   - Update `test.ps1`, `TESTING.md`, and `README.md`.

9. **Stop copying normalised `.md` into `assets/` (PR 9).**
   - `materializeAssets` copies every normalised `.md` into `assets/<slug>/`, a
     full duplicate of the corpus that can drift. Restrict `assets/` to real
     binary / media attachments.

10. **Unify the slug algorithm (PR 10).**
    - Two `slugify` variants exist: the filename one (`provenance-model.js`,
      `webImport.js`) NFD-normalises accents, the heading one
      (`markdown-utils.js`, `sourceRef.ts`) drops them entirely ("Visión" →
      `visin`). Adopt one shared implementation that transliterates accents
      ("Visión" → `vision`) and use it everywhere.

### Out of scope

- Hardening `webImport` against oversized / hostile downloads (timeouts,
  size caps, host allow-lists). Explicitly deferred: a 4 GB URL is an extreme
  case; "if it fails, let it fail".
- Preserving hand-edited frontmatter in `sources/nn/` across a re-scan. Files
  under `sources/nn/` are not hand-edited in practice.
- Replacing the agent-driven model-authoring wizard with deterministic
  extraction. Model grounding stays a human/AI-led step; this change only adds
  validation, not automation, to it.
- Any change to GitHub Pages hosting, the CNAME, or the deploy mechanism.

## Risks & Mitigations

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| `cited_works:` rename breaks a frontmatter reader somewhere | High | PR 7 greps every reader (`scanner-core.js`, `provenance-model.js`, `citations.md` logic, editor frontmatter parse) and updates them in the same PR; keep `references:` accepted as a deprecated alias for one release. |
| `provenance` → `editAttribution` type rename ripples across the editor | High | Confined to PR 7; TypeScript compiler enumerates every call site; `npm run typecheck` gates the PR. |
| Slug unification changes existing anchors in committed models/samples | Medium | PR 10 ships a one-shot re-slug pass over `iNNfo/specs/**` samples and documents that workspaces must re-run `--scan`; land it last, alone. |
| Conflict with in-flight change `2026-09-05-documentation-v2-and-docsify-suite` (also edits `docs/`) | Medium | PR 7 rebases on whatever that change merges; if it is still open, coordinate the `citations-provenance.md` edit or sequence PR 7 after it. |
| Each stacked PR deploys to `cognnitive.com` on merge | Medium | `npm run verify` + `npm run build:docs` locally before every merge; stop the chain on a red CI run. |
| Lineage `# NN Procedures` append-log grows unbounded | Low | Entry per run is small; document that `git` history is the real audit trail and the section can be truncated. |

## Rollout

Stacked PRs to `main`, in order 1 → 10. PRs 1–4, 6, 8, 9 are additive or
bugfix-only. PRs 5, 7, 10 are convention/breaking changes — each is landed alone
with its own verification pass, and this proposal is the checkpoint for them.
