# Design: S4 — retire the in-place legacy migration flows and the name-based reference read

## Context (verified against code, 2026-10-13)

- `migrate-domain.js` modes: layout dry-run/apply with plan-hash consent, backup and
  `--restore` (Flow A, `planMigration` from `lib/legacy-migrate.generated.cjs`, lines
  9-27, 157-552, 886-919); `--freeze-slugs` (`:553`, `:805`); `--migrate-references`
  (`migrateDomainReferences`, `:636-776`, dispatched at `:825`); `--import-as-source`
  (`runImportAsSource`, `:269-331`, dispatched at `:851`).
- `batch-update.js` (Flow C) runs `planMigration` over sibling domains.
- `legacy-migrate.generated.cjs` is built from `innfo-core/src/legacy/index.ts` by
  `scripts/build-preflight-primitives.mjs` (`:12`, `:109-114`, test `:26`, `:51-53`).
- `innfo-core/src/legacy/index.ts` exports both detection and `planMigration`; the MCP
  imports `@cognnitive/innfo-core/legacy` for the legacy hint (`innfo-mcp/vitest.config.ts:28`).
- `validator/references.ts:77-120`: slug match, then exact display name, then
  separator-normalized name (markers at `:90-91`; ledger entry
  `lineage-reference-name-fallback`, test `phase5-references-ledger.test.ts:242-247`).

## D1 — What stays and what goes in `nn-upgrade`

| Piece | Decision |
|-------|----------|
| Flow A (layout migration, backup, restore, plan hash) | Deleted |
| Flow C (`batch-update.js`) | Deleted |
| `--migrate-references` | Deleted |
| Flow B (bluepriNNt version upgrade) | Kept — forward evolution of a current domain |
| `--freeze-slugs` | Kept — remedy named by the console's `UNFROZEN_MODEL` error (#1C) |
| `--import-as-source` | Kept; S6c rebuilds it on the `init_domain` scaffold |
| `backup-workspace.js` | Kept only if Flow B uses it (Flow B "Backup" phase); otherwise deleted |

`SKILL.md` lists two things: Flow B, and "an old or broken domain is not migrated in
place: create a new domain and import the old one as a Source", with the recipe owned
by S6 (`init_domain` → `--import-as-source` → agent changesets citing the import →
`propose_changeset` → `apply_change`). Until S6c lands the pointer names
`--import-as-source` only.

## D2 — The quarantine split

- Deleted (migration half): `planMigration` and the modules only it uses —
  `legacy/reader.ts`, `legacy/language-map.ts`, `legacy/schema-maps/**`,
  `legacy/layout/{plan,mirrors,finalize}.ts` — with their tests
  (`tests/legacy/plan-migration.test.ts`, `tests/legacy/layout/plan.test.ts`, ...), the
  generated bundle and its build step. Before deleting each module, `rg` proves its only
  importers are in the deleted set.
- Kept (detection half): `legacy/detect.ts`, `legacy/layout/detect.ts`, the frozen legacy
  fixture, `legacy-hint.ts`, the preflight detector bundle. A legacy domain is still
  recognised so tools can say what to do.
- The MCP legacy hint and the preflight message point at the new-domain recipe instead of
  `nn-upgrade` Flow A.

## D3 — Ledger entries deleted, with their removal conditions

| Entry | Recorded condition | Why it is met or overridden |
|-------|--------------------|-----------------------------|
| `upgrade-flow` | every non-frozen repo domain reports current + skills release + maintainer sign-off | Overridden by the maintainer decision of 2026-10-13 (no in-place migration); sign-off recorded in this change |
| `layout-migrate` | same | same |
| `language-map`, `schema-maps` | all known domains migrated + sign-off | same: the migration path they serve is deleted |
| `quarantine` | all known domains migrated + sign-off | Narrowed, not deleted: the entry keeps `legacy/index.ts` (detection exports) and drops the generated bundle path |
| `lineage-reference-name-fallback` | all models slug-frozen + sign-off | Reclassified, not met: exact display-name resolution is iNNfo grammar, not legacy (D4); the entry and its markers are deleted, the fuzzy step is deleted; sign-off recorded |

The `legacy:` markers of the deleted code go with it; `legacy-ledger-guard.js` proves the
1:1 mapping. The commit message of each deletion states the condition evaluation.

## D4 — Reference resolution: grammar, not fallback

- `[[Display Name]]` wikilinks and name-based matrix row/column headers are the iNNfo
  grammar (`stable-element-identity` `AMBIGUOUS_ELEMENT_NAME`; `cross-model-reference-validation`).
  About 2,500 lines in about 170 tracked `_NN.md` files use them, many write-once. Making
  slugs the only reference form would need a versioned grammar change and a rewrite of
  that content; it is not done here (dependency file, question 4).
- `resolveReferenceTarget` keeps: (1) exact slug, (2) exact display name. It loses (3),
  the separator-normalized match, which is a tolerant read. An ambiguous display name is
  an `error` (`AMBIGUOUS_ELEMENT_NAME`), never an arbitrary pick.
- The `legacy:` markers at `references.ts:90-91` and the ledger entry are deleted: what
  remains is not legacy.
- Repo content: every tracked domain, fixture and sample that is not write-once is
  validated; a reference that only resolved through the fuzzy step is corrected by hand
  or with an agent changeset. No conversion script is committed.
- A write-once `_V_x-y-z_` sample that only resolved through the fuzzy step is NOT edited
  and NOT excluded: it is recorded in `iNNfo/validation-baseline.json` (question 3,
  resolved), so the differential validator stays green without touching permanent history.

## D5 — Write-once and reports

No report artifact remains: Flow A's detector and rewriter reports are deleted with it,
and Flow B prints its before/after report to stdout. `--import-as-source` writes only the
new domain. Nothing writes a new file on each dry run.

## D6 — Absorbed: the `nn-upgrade` contract split and glossary (`2026-10-07-nn-upgrade-contract-docs`)

This change absorbs the still-relevant intent of the retired proposal
`2026-10-07-nn-upgrade-contract-docs` (proposal-only, never applied). What survives:

- **The skill owns the final-state contract.** `skills/nn-upgrade/SKILL.md` MUST contain no
  retired-path literal (`models/`, `specs/templates/`, `sources/nn/`, `sources/original/`,
  `workspace_NN.md`); the versioned legacy detail lives in
  `workspace/procedures/upgrade_and_migrate_legacy_workspace_NN.md`. With Flow A/C retired,
  that procedure carries only the Flow B step tables plus the legacy detector and the
  `--import-as-source` recipe (S6c).
- **Glossary (skill docs):** define each term in one line —
  - **dry run:** read-only plan report + deterministic `planHash`, zero writes (Flow B scan);
  - **planHash:** SHA over the normalized plan; the apply phase revalidates it and aborts
    that domain on mismatch (no partial writes);
  - **rehydration (Flow B):** materialize the adopted bluepriNNt locally, repoint
    `parent_spec`, bump version, re-validate; restore on failure;
  - **backup:** timestamped full-tree copy outside the workspace + SHA-256 manifest, before
    the first write.

The Flow A/C portions of that proposal (per-layout detect/plan tables, the `import-as-source`
exit inside Flow A, "Flow C unchanged") are dropped with the flows themselves.

## Cross-cutting

`strict_tdd: true` where behaviour changes. `verify.js` (ledger guard, suite discovery)
gates. Release: `skills-v*` (nn-upgrade, nn-preflight messaging), `innfo-mcp-v*` (hint
text), `blueprints-v*` if the workspace procedure `upgrade_and_migrate_legacy_workspace`
changes (unversioned file + `template_version` bump).
