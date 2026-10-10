# Exploration: Dogfood the cogNNitive provenance blueprint in the repo's own domaiNN

## Trigger

The maintainer observed that `workspace_NN/` — the monorepo's self-hosted
dogfooding workspace — still carries the retired term "Workspace" in its folder
name, and asked whether renaming it (e.g. to `cogNNitive_NN/`) would make it
"coherent with the `cogNNitive` blueprint" and amount to eating our own dog food.

This exploration checks that premise against the code and finds it rests on a
conflation. The real dogfooding gap is larger than the folder name.

## Findings

### F1 — `cogNNitive` and `domaiNN` are different kinds of blueprint

- `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` (V_0-3-0) is the **container**
  blueprint. Concepts: `domaiNN`, `kNNowledge`, `Tags`. A domaiNN root declares
  `parent_spec: domaiNN` and an entry point named exactly `domaiNN_NN.md`.
- `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` (V_0-2-1) is a **provenance /
  lineage (W3C PROV)** blueprint. Concepts: `Sources`, `ModelRecords`,
  `Artifacts`, `Procedures`; edges are `derived_from` citations. Its own template
  section (`spec_NN.md:240`) specifies it is instantiated as a **separate Level-3
  model** named `<Workspace>_V_x-y-z_cogNNitive_NN.md`, listed in the domaiNN
  index — it is not the container root.

**Consequence:** renaming the container folder to `cogNNitive_NN/` does not make
the domaiNN "coherent with the cogNNitive blueprint". Coherence with that
blueprint comes from *instantiating a provenance model inside the domaiNN*, not
from the container's name. The root must keep `parent_spec: domaiNN`.

### F2 — The dogfooding root is a legacy `workspace` document wearing a `domaiNN` filename

`workspace_NN/domaiNN_NN.md` declares `parent_spec: domaiNN` but its body uses
the legacy `workspace` concepts. `validate_knowledge` (run against
`workspace_NN/`) reports **9 `CONCEPT_DRIFT_WARNING`**s — `Workspace`, `Specs`,
`Templates`, `Models`, `Sources`, `Procedures`, `Artifacts`, `Skills`, `Tools`
each "belongs to the workspace template" / "the business template" / "the
procedures template". The domaiNN blueprint's own concepts (`domaiNN`,
`kNNowledge`, `Tags`) are absent.

So the `2026-09-29-nn-level-nomenclature-rename` change renamed the *filename*
(`workspace_NN.md` → `domaiNN_NN.md`) but not the *schema*. The dogfooding root
is not valid against the blueprint it points at.

### F3 — No `cogNNitive` provenance model exists anywhere in the repo's domaiNN

`workspace_NN/kNNowledge/` holds `cogNNitive_repository_NN.md` (a `repository`
model), `Capabilities_Catalog_capabilities_NN.md`, and
`UseCases_Catalog_use-cases_NN.md`. There is **no `<name>_cogNNitive_NN.md`**
provenance model. The provenance blueprint is shipped but never dogfooded.

### F4 — The `cogNNitive` blueprint is silently skipped by the catalog generator

`iNNfo/specs/bluepriNNts/catalog.json` `warnings`:

```
"skipped (no parseable blueprint_version): cogNNitive/spec_NN.md",
"skipped (no parseable blueprint_version): workspace_spec_NN.md"
```

`cogNNitive/spec_NN.md` carries `template_version: "V_0-4-0"` but no
`blueprint_version`, unlike `domaiNN/spec_NN.md` (`blueprint_version:
"V_0-2-0"`). The provenance blueprint therefore does not appear in the generated
catalog even though `manifest/source.yaml:137` registers it for distribution.

### F5 — Legacy "Workspace" naming survives in five places, none tracked as debt

1. Folder `workspace_NN/` (no rename item in `openspec/backlog.md`).
2. Blueprint package dir `iNNfo/specs/bluepriNNts/workspace/` (holds
   procedures + assets; its `spec_NN.md` is gone, moved to `domaiNN/`).
3. Standalone `iNNfo/specs/bluepriNNts/workspace_spec_NN.md` (V_0-2-2).
4. Top-level `iNNfo/specs/workspace_V_0-2-2_NN.md` + `docs/workspace_NN.md`.
5. The composite `bluepriNNts/base/spec_NN.md` `includes`
   `workspace_V_0-2-0` + `cogNNitive_V_0-2-0` (both names version-drifted
   against the actual dirs).

Only one code reference to the folder path literal exists:
`eslint.config.mjs:29` (`'workspace_NN/**'`). Renaming the folder is cheap.

### F6 — `_NN` is already a reserved module name

`openspec/config.yaml` already declares `_NN: Artifacts and commercial web
content store.` — a different concern from domaiNNs. A root `_NN/` for domaiNNs
would collide with that declared module.

## Options considered

- **A. Rename folder only.** Cosmetic. Leaves F2/F3/F4 broken. Rejected as the
  whole answer; keep as one slice.
- **B. Rename + renormalize the root against the `domaiNN` blueprint.** Fixes the
  9 concept-drift warnings; makes the dogfooding model actually valid.
- **C. B + add a `cogNNitive` provenance model inside the domaiNN.** The genuine
  dogfooding of the provenance blueprint; also surfaces F4.
- **D. Also retire the legacy `workspace` blueprint and `workspace_spec_NN.md`.**
  Larger blast radius (blueprint catalog, `base` includes, docs, validation
  baseline). Candidate follow-up rather than first slice.

## Open questions

1. **Folder name.** `cogNNitive_NN/` (maintainer preference) reads coherently but
   collides cognitively with the blueprint name `cogNNitive` and yields verbose
   model paths (`cogNNitive_V_0-1-0_cogNNitive_NN.md`). Alternatives: keep
   `workspace_NN`, or `ecosystem_NN`. No technical collision (domaiNNs resolve by
   the `domaiNN_NN.md` root, not the folder name) — the tradeoff is naming
   clarity only.
2. **Root schema.** Should the root adopt the bare `domaiNN` concepts, or a
   composition (`includes`) that carries the repo-specific `Specs` / `Templates`
   / `Skills` / `Tools` concepts? The validator already suggests "compose via
   `includes`".
3. **Provenance scope.** What is the dogfooding domaiNN's real provenance? The
   repo consumes its own skill/spec sources and produces bundles, docs, and CDN
   distributions — the `cogNNitive` model would make that lineage explicit, but
   the source/artifact set must be chosen.
