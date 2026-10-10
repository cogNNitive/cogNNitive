# Proposal: Canonicalize the dogfooding domaiNN root (drop the frozen `workspace` schema)

## Intent

The monorepo's self-hosted dogfooding domaiNN (`workspace_NN/`) is the flagship
proof that iNNfo can describe the ecosystem that builds it. Today it is not valid
against the blueprint it declares: `workspace_NN/domaiNN_NN.md` says
`parent_spec: domaiNN` but its body is authored in the **frozen** `workspace`
schema, producing 9 `CONCEPT_DRIFT_WARNING`s. The same defect affects **every**
domaiNN in the repo, including the published documentation use-cases — so the
canonical blueprint is currently unsatisfied by all of its own instances.

This change migrates the dogfooding root onto the canonical `domaiNN` concepts
and renames the folder off the retired "Workspace" term. It does **not** adopt any
frozen blueprint.

Correction to the originating premise: `cogNNitive` is a **frozen, retired**
provenance blueprint (`manifest/source.yaml` `frozen_blueprints:`), not the
container schema. The root's schema is `domaiNN`; coherence with `cogNNitive` is
forbidden by policy, not achieved by the rename. See `exploration.md` F1.

## Current-state gap

- `workspace_NN/domaiNN_NN.md` emits 9 `CONCEPT_DRIFT_WARNING`s: `Workspace`,
  `Specs`, `Templates`, `Models`, `Sources`, `Procedures`, `Artifacts`, `Skills`,
  `Tools` all belong to other (mostly frozen) blueprints. See F3.
- The `domaiNN` blueprint declares only `domaiNN`, `kNNowledge`, `Tags` — it has
  no home for the `sources`/`procedures`/`artifacts` catalog pointers every root
  carries. See F4.
- The folder keeps the retired term "Workspace"; a deterministic migrator exists
  (`language-map.ts`) but was only applied to filenames, not heading concepts. See
  F2, F5.

## Scope (chained slices)

| Slice | Deliverable |
|---|---|
| S1 Rename | `git mv workspace_NN/ cogNNitive_NN/`; update `eslint.config.mjs:29` and every documentary reference. Zero behavioural change. |
| S2 Rename-safe | (no content change beyond S1) — keeps the diff reviewable. |
| S3 Root canonicalization | Re-author `cogNNitive_NN/domaiNN_NN.md` onto the `domaiNN` concepts. Apply the migrator mapping (`Workspace→domaiNN`, `Models→kNNowledge`, `Templates→bluepriNNts`) and re-home the `sources`/`procedures`/`artifacts` catalogs as `kNNowledge` entries. Drive the 9 drift warnings to zero. |

### Explicitly out of scope

- **No `includes` composition.** `workspace`, `cogNNitive`, and `base` are all
  frozen; the composite spec forbids composing the canonical entry template.
  See exploration options A/B1/B2.
- **No `cogNNitive` provenance model.** The blueprint is retired.
- **No root `_NN/` folder.** `openspec/config.yaml` reserves `_NN` for another
  module.
- **No legacy blueprint retirement** (`workspace_spec_NN.md`, `bluepriNNts/workspace/`,
  `bluepriNNts/base/`) — separate change. Any temporary leftover keeps a
  `legacy:<ns>/<id>` marker + `legacy-ledger.yaml` entry.

## Capabilities

### Modified Capabilities
- `dogfooding-workspace`: the repo's own domaiNN is valid against the canonical
  `domaiNN` blueprint (zero `CONCEPT_DRIFT_WARNING`).
- `nn-naming-contract`: the retired term "Workspace" no longer names the
  dogfooding domaiNN folder.

## Approach

S1 is mechanical (one code hit + prose). S3 changes authored content only — no
blueprint is edited. The re-homing of catalogs as `kNNowledge` entries follows the
`domaiNN` blueprint's own template (`# NN kNNowledge` listing `path::` + `blueprint::`).
Decisions that change the target shape (whether to keep `Skills`/`Tools`; whether
to reconcile the published use-cases in the same change) go to design.

## Affected Areas

| Area | Impact |
|---|---|
| `workspace_NN/` → `cogNNitive_NN/` | Renamed |
| `cogNNitive_NN/domaiNN_NN.md` | Re-authored to canonical concepts |
| `eslint.config.mjs`, docs prose, `manifest/` | Path references updated |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A path reference to `workspace_NN/` is missed | Med | Grep the literal across code/config; `check-integrity` + `verify` after S1. |
| Canonicalizing the root against a blueprint that rejects the published samples over-fits a local fix | High | Resolve exploration open question 1 first: reconcile the blueprint + all roots in one migration, or scope this to the dogfooding root and file the systemic fix separately. |
| Content loss when re-homing concepts | Med | Preserve every element; change section concepts only; diff-reviewed. |
| `Skills`/`Tools` have no canonical home | Med | Design decision (exploration open question 2): drop from the root, or extend the blueprint (B2). |

## Rollback

S1 is a single `git mv` plus reference edits — revertible in one commit. S3 is a
content re-authoring; revert to the previous `domaiNN_NN.md`. No runtime behaviour
changes, so each slice reverts independently.

## Success Criteria

- [ ] `cogNNitive_NN/domaiNN_NN.md` validates with **zero** `CONCEPT_DRIFT_WARNING`.
- [ ] Zero references to the `workspace_NN/` folder path remain in code/config; `check-integrity` and `verify` are green.

## Open questions (for design)

1. Scope: dogfooding root only, or reconcile the `domaiNN` blueprint + all five repo roots (incl. published use-cases) in one change?
2. `Skills`/`Tools`: drop, or keep a modeled root view (forces extending the blueprint — option B2)?
3. Folder name: `cogNNitive_NN/` (maintainer) vs `ecosystem_NN/` vs keep `workspace_NN/`.
