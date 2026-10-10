# Proposal: Canonicalize `domaiNN` roots (direction B — simplify, add `bluepriNNts`)

## Intent

The `domaiNN` blueprint is a deliberate 10→3 simplification of the frozen
`workspace` blueprint, introduced by the migrate-first `2026-09-29` rename. That
migration was never completed: the dogfooding domaiNN — and the four published
documentation use-cases — still author the legacy `workspace` concepts, so **every
root in the repo drifts against the blueprint it declares** (9 and 5
`CONCEPT_DRIFT_WARNING`s respectively). The ecosystem does not eat its own dog
food.

This change finishes the migration the rename intended, in direction **B**:
migrate roots onto the three canonical `domaiNN` concepts and re-home the rest,
rather than re-expanding the blueprint. It folds in the one real blueprint gap —
`bluepriNNts` — and renames the dogfooding folder off the retired "Workspace" term.

Correction to the originating premise: `cogNNitive` is a **frozen, retired**
provenance blueprint (`manifest/source.yaml` `frozen_blueprints:`), not the
container schema. No `cogNNitive` model is added. See `exploration.md` F1.

## Current-state gap

- `workspace_NN/domaiNN_NN.md` emits 9 `CONCEPT_DRIFT_WARNING`s; the four
  `docs/cognitive_nn/use-cases/*` roots emit 5 each. See exploration F3.
- The `domaiNN` blueprint emits no `bluepriNNts` concept, yet the migrator
  (`language-map.ts:81`) and the rename intent table both target `# NN bluepriNNts`.
  No spec defines it. See F4.
- The dogfooding folder keeps the retired term "Workspace". See F5.

## Scope (chained slices)

| Slice | Deliverable |
|---|---|
| S1 Rename | `git mv workspace_NN/ ecosystem_NN/`; update `eslint.config.mjs:29` and documentary references. Zero behavioural change. |
| S2 Blueprint | Add the `bluepriNNts` concept to `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md`; bump its version; regenerate `catalog.json`; update affected tests. |
| S3 Root canonicalization | Migrate the roots that declare `domaiNN` (the dogfooding root + the four docs use-cases) onto the canonical concepts: apply the `language-map` mapping (`Workspace→domaiNN`, `Models→kNNowledge`, `Templates→bluepriNNts`), re-home the `sources`/`procedures`/`artifacts` catalog pointers as `# NN kNNowledge` entries, and drop `Specs`/`Skills`/`Tools` (their content lives in `Capabilities_Catalog`, `UseCases_Catalog`, and the repository model). Drive every `CONCEPT_DRIFT_WARNING` to zero. |

### Non-goals

- **No `includes` composition** and **no `cogNNitive` model** (`workspace`,
  `cogNNitive`, `base` are all frozen).
- **No root `_NN/` folder** (`openspec/config.yaml` reserves `_NN`).
- **No migration of the frozen-`workspace` roots** (`_samples_nn/`,
  `simulation/fixtures/acme/`, `test/fixtures/testlab/`). They pin a frozen
  blueprint by design/fixture; moving them to `domaiNN` is a separate change.
- **No retirement of the legacy blueprint files** (`workspace_spec_NN.md`,
  `bluepriNNts/workspace/`, `bluepriNNts/base/`) — separate change with its own
  blast-radius review. Any temporary leftover keeps a `legacy:<ns>/<id>` marker +
  `legacy-ledger.yaml` entry.

## Capabilities

### New Capabilities
- `domain-blueprint-completeness`: the `domaiNN` blueprint declares every concept
  its migration and instances rely on, including `bluepriNNts`.

### Modified Capabilities
- `dogfooding-workspace`: the repo's own domaiNN — and the published use-cases —
  validate against the canonical `domaiNN` blueprint with zero drift.
- `nn-naming-contract`: the retired term "Workspace" no longer names the
  dogfooding domaiNN folder.

## Approach

S1 is mechanical (one code hit + prose). S2 lands before S3 so the roots validate
against a complete blueprint. S3 changes authored content only and follows the
`domaiNN` blueprint's own template (`# NN kNNowledge` listing `path::` +
`blueprint::`). The `language-map` migrator covers three headings mechanically;
the catalog re-homing and the `Specs`/`Skills`/`Tools` removal are authorial and go
through design. The four use-cases are logically identical to the dogfooding root
(same drift set minus the repo-specific concepts), so S3 is one patterned edit.

## Affected Areas

| Area | Impact |
|---|---|
| `workspace_NN/` → `ecosystem_NN/` | Renamed |
| `ecosystem_NN/domaiNN_NN.md` | Re-authored to canonical concepts |
| `docs/cognitive_nn/use-cases/{consulting-sales,freelance-designer,startup-founder,youtube-creator}/domaiNN_NN.md` | Re-authored to canonical concepts |
| `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` | New `bluepriNNts` concept + version bump |
| `iNNfo/specs/bluepriNNts/catalog.json` | Regenerated |
| `eslint.config.mjs`, docs prose, `manifest/` | Path references updated |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| A path reference to `workspace_NN/` is missed | Med | Grep the literal across code/config; `check-integrity` + `verify` after S1. |
| Bumping the `domaiNN` blueprint breaks the five pinned roots or the docs | Med | S2 version bump is MINOR; update pins in S3; run `validate_knowledge` on all five roots; watch `spec-integrity` CI. |
| Removing `Skills`/`Tools` loses ecosystem visibility | Med | Confirm the inventory is covered by `Capabilities_Catalog`/`UseCases_Catalog`/repository model before deleting; move anything unique into them. |
| `bluepriNNts` concept change trips the immutability guard | Low | `domaiNN` is active (not frozen); confirm no write-once pin blocks the edit. |

## Rollback

S1 is a single `git mv` plus reference edits. S2 is a blueprint edit plus a
catalog regeneration. S3 is content re-authoring across five roots; revert to the
previous `domaiNN_NN.md` files. No runtime behaviour changes.

## Success Criteria

- [ ] All five `domaiNN`-declaring roots validate with **zero** `CONCEPT_DRIFT_WARNING`.
- [ ] `domaiNN/spec_NN.md` declares `bluepriNNts`; `catalog.json` reflects the bumped version.
- [ ] Zero references to the `workspace_NN/` folder path remain in code/config; `check-integrity` and `verify` are green.

## Resolved questions (maintainer, 2026-10-10)

1. **Direction.** B — simplify roots; do not extend the blueprint.
2. **`Skills`/`Tools`.** Dropped from the root; inventory lives in the ecosystem's kNNowledge models.
3. **`bluepriNNts`.** Added as a `domaiNN` concept (the migrator already emits it).
4. **Scope.** The change spans the blueprint + all five `domaiNN`-declaring roots; frozen-`workspace` roots are a follow-up.
5. **Folder name.** `ecosystem_NN/` — matches the domaiNN's declared identity (`name:: cogNNitive Ecosystem`), follows the `<noun>_NN` convention, and avoids the cognitive collision with the frozen `cogNNitive` blueprint and the redundant `cogNNitive/cogNNitive_NN/` path.
