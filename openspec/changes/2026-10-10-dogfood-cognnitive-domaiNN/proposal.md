# Proposal: Dogfood the cogNNitive provenance blueprint in the repo's own domaiNN

## Intent

The monorepo's self-hosted dogfooding domaiNN (`workspace_NN/`) is the proof that
the iNNfo model can describe the ecosystem that builds it. Today that proof is
broken in three ways the maintainer's "rename the folder" request only partly
touches:

1. the folder still carries the retired term **Workspace**;
2. its root declares the **`domaiNN`** blueprint but is authored in the legacy
   **`workspace`** schema (9 `CONCEPT_DRIFT_WARNING`s);
3. it is the only domaiNN in the repo that does **not** instantiate the repo's own
   **`cogNNitive`** provenance blueprint — so the flagship provenance feature is
   never dogfooded anywhere.

This change renames the folder, renormalizes the root to the blueprint it
declares, and adds the missing `cogNNitive` provenance model, so the ecosystem
actually eats its own dog food. It also fixes the `cogNNitive` blueprint
frontmatter so the feature it dogfoods is catalogued and distributable.

Correction to the originating premise: `cogNNitive` is a **provenance** blueprint,
not the container schema. Coherence with it comes from *containing a provenance
model*, not from the container's name. The root keeps `parent_spec: domaiNN`.

## Current-state gap

- `workspace_NN/domaiNN_NN.md` is valid but emits 9 `CONCEPT_DRIFT_WARNING`s
  (`Workspace`, `Specs`, `Templates`, `Models`, `Sources`, `Procedures`,
  `Artifacts`, `Skills`, `Tools` all belong to other blueprints). See
  `exploration.md` F2.
- No `<name>_cogNNitive_NN.md` model exists in the domaiNN. See F3.
- `iNNfo/specs/bluepriNNts/catalog.json` `warnings` skips
  `cogNNitive/spec_NN.md` and `workspace_spec_NN.md` for lack of a parseable
  `blueprint_version`. See F4.
- Legacy "Workspace" naming remains in five locations, untracked as debt. See F5.

## Scope (chained slices)

| Slice | Deliverable |
|---|---|
| S1 Rename | `git mv workspace_NN/ cogNNitive_NN/`; update `eslint.config.mjs:29` and every documentary reference (docs prose, `manifest`, specs). Zero behavioural change. |
| S2 Root renormalization | Re-author `cogNNitive_NN/domaiNN_NN.md` so it is valid against the `domaiNN` blueprint — either the bare `domaiNN`/`kNNowledge`/`Tags` concepts, or a Level-2 composition via `includes` that adds the repo-specific `Specs`/`Templates`/`Skills`/`Tools`. Drive the 9 `CONCEPT_DRIFT_WARNING`s to zero. |
| S3 Provenance model | Add `cogNNitive_NN/kNNowledge/<name>_V_<v>_cogNNitive_NN.md` (Sources / ModelRecords / Artifacts / Procedures with `derived_from`), list it in the root index, and register it in the domaiNN manifest. |
| S4 Catalog fix | Add `blueprint_version` to `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` so the catalog generator stops skipping it; re-run `blueprint-catalog` and confirm `cogNNitive` appears. |

### Non-goals

- No retirement of the legacy `workspace` blueprint package dir or
  `workspace_spec_NN.md` in this change (exploration F5 items 2–5). Candidate
  follow-up with its own blast-radius review; any temporary leftover keeps a
  `legacy:<ns>/<id>` marker and a `legacy-ledger.yaml` entry.
- No change to the `domaiNN` or `cogNNitive` blueprint schemas beyond the S4
  frontmatter fix.
- No blanket `_NN/` root folder — `openspec/config.yaml` already reserves `_NN`
  for a different module (exploration F6).

## Capabilities

### Modified Capabilities
- `dogfooding-workspace`: the repo's own domaiNN is valid against its declared
  blueprint and instantiates the `cogNNitive` provenance model.
- `bluepriNNt-catalog`: `cogNNitive` is catalogued and distributable.
- `nn-naming-contract`: the retired term "Workspace" no longer names the
  dogfooding domaiNN folder.

## Approach

S1 is a mechanical rename (one code hit + prose). S2 changes authored content,
not schema; the target shape depends on open question 2 and goes through design
before implementation. S3 is additive: a new L3 model plus its two index
pointers. S4 is a one-line frontmatter fix plus a catalog regeneration. S1–S2
must land together (`check-integrity` and the samples/parity guards read the
folder path); S3/S4 are independent and can follow.

## Affected Areas

| Area | Impact |
|---|---|
| `workspace_NN/` → `cogNNitive_NN/` (folder) | Renamed |
| `cogNNitive_NN/domaiNN_NN.md` | Re-authored (schema) |
| `cogNNitive_NN/kNNowledge/*_cogNNitive_NN.md` | New |
| `iNNfo/specs/bluepriNNts/cogNNitive/spec_NN.md` | Frontmatter fix |
| `iNNfo/specs/bluepriNNts/catalog.json` | Regenerated |
| `eslint.config.mjs`, docs prose, `manifest/` | Path references updated |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Renaming the folder breaks a path reference not found by grep | Med | Grep for the literal `workspace_NN/` and `workspace_NN` across code/config; run `check-integrity` + `verify` after S1. |
| Re-authoring the root loses content (the root is hand-authored prose about the repo) | Med | Preserve every element; change only the concept sections/schema, diff-reviewed. |
| `cogNNitive_NN/` name read as the blueprint, not the container | Low | Cognitive only; documented in the root's `name::`/title. Maintainer may veto in favour of `ecosystem_NN`. |
| S4 changes a distributed blueprint's version identity | Low | Additive `blueprint_version` matching the existing `template_version` line; confirm no immutability guard trips. |

## Rollback

S1 is a single `git mv` plus reference edits — revertible in one commit. S2 is a
content re-authoring; revert to the previous `domaiNN_NN.md`. S3 is additive
(delete the file + two pointers). S4 is a one-line frontmatter change. No slice
touches runtime behaviour, so each reverts independently.

## Success Criteria

- [ ] `cogNNitive_NN/domaiNN_NN.md` validates with **zero** `CONCEPT_DRIFT_WARNING`s.
- [ ] `cogNNitive_NN/kNNowledge/<name>_cogNNitive_NN.md` resolves, is listed in the root index and the manifest, and validates against the `cogNNitive` blueprint.
- [ ] `catalog.json` lists `cogNNitive` and no longer warns "skipped … cogNNitive/spec_NN.md".
- [ ] Zero references to the `workspace_NN/` folder path remain in code/config; `check-integrity` and `verify` are green.

## Open questions (for design)

1. Folder name: `cogNNitive_NN/` (maintainer) vs `ecosystem_NN/` vs keep `workspace_NN/`.
2. Root shape: bare `domaiNN` concepts vs a composition `includes` carrying the repo-specific concepts.
3. Provenance scope: which repo sources/artifacts the dogfooding `cogNNitive` model records.
