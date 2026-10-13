# Tasks: S4 — retire the in-place legacy migration flows and the name-based reference read

`openspec/config.yaml` is `strict_tdd: true`: behaviour changes lead with their test;
pure deletions lead with the guard that must stay green. Every task names the requirement
it serves as `[capability: Requirement]`. Pre-condition: none; lands before S6c.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~150 added / ~4,500 deleted (scripts, quarantine modules, tests, docs) |
| 400-line budget risk | Low for review (deletions), High by raw count |
| Chained PRs recommended | Yes — S4-1 = groups 1–3 (nn-upgrade flows, quarantine split, ledger); S4-2 = groups 4–5 (reference resolution, repo content) |
| Decision needed before apply | Yes — dependency file questions 3 and 4 |

## 1. Retire Flow A, Flow C and `--migrate-references` (S4-1)

- [ ] 1.1 TEST (`skills/nn-upgrade/scripts/migrate-domain.test.js`): `--layout-only`,
      `--apply`, `--restore`, `--migrate-references` exit non-zero with "unknown option";
      `--freeze-slugs` and `--import-as-source` keep working.
      [workspace-template-upgrade: Layout and naming migration (REMOVED)]
- [ ] 1.2 `migrate-domain.js`: delete the layout/apply/restore paths (`:9-27`, `:157-552`,
      `:886-919`), `migrateDomainReferences` (`:636-776`) and its dispatch (`:825`);
      delete `migrate-layout.test.js` and the reference-pass cases of
      `migrate-domain.test.js`. Do not touch `runImportAsSource` (S6c).
      [workspace-template-upgrade: Layout and naming migration (REMOVED)]
      [workspace-template-upgrade: Citations into `sources/archive/` are reported as warnings (REMOVED)]
- [ ] 1.3 Delete `batch-update.js` and `batch-update.test.js`; delete
      `backup-workspace.js(+test)` unless Flow B calls it (`rg`).
      [workspace-template-upgrade: nn-upgrade Guided Migration Skill]

## 2. Split the quarantine (S4-1)

- [ ] 2.1 Import audit with `rg`: list the importers of `planMigration`, `legacy/reader.ts`,
      `legacy/language-map.ts`, `legacy/schema-maps/**`, `legacy/layout/{plan,mirrors,finalize}.ts`;
      record it in the PR. [workspace-template-upgrade: Layout and naming migration (REMOVED)]
- [ ] 2.2 Delete those modules and their tests; keep `legacy/index.ts` exporting detection
      only; delete `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs` and its build
      step and assertions in `scripts/build-preflight-primitives.mjs(+test)`.
      [workspace-template-upgrade: Layout and naming migration (REMOVED)]
- [ ] 2.3 TEST (`iNNfo/packages/innfo-mcp/test/legacy-hint.test.ts`, preflight suite): the
      legacy hint and the preflight message name the new-domain recipe
      (`--import-as-source` into a new domain), never an in-place migration.
      [workspace-template-upgrade: nn-upgrade Guided Migration Skill]
- [ ] 2.4 `innfo-mcp/src/tools/legacy-hint.ts` and the `nn-preflight` message: new text.
      [workspace-template-upgrade: nn-upgrade Guided Migration Skill]

## 3. Ledger and skill (S4-1)

- [ ] 3.1 `legacy-ledger.yaml`: delete `upgrade-flow`, `layout-migrate`, `language-map`,
      `schema-maps`; narrow `quarantine` to `legacy/index.ts`; `scripts/lib/legacy-write-guard.js`
      drops the generated-bundle entry; `node scripts/lib/legacy-ledger-guard.js` green.
      Each removal condition evaluation (design D3) is stated in the commit message.
      [workspace-template-upgrade: Layout and naming migration (REMOVED)]
- [ ] 3.2 TEST (`skills/nn-upgrade` doc test or `test/skills-*.test.mjs`): `SKILL.md`
      describes Flow B, `--freeze-slugs` and the new-domain pointer, and no Flow A or C.
      [workspace-template-upgrade: nn-upgrade Guided Migration Skill]
- [ ] 3.3 Rewrite `skills/nn-upgrade/SKILL.md` (role, flows, phases, core rules) and the
      workspace procedure `upgrade_and_migrate_legacy_workspace_NN.md` (unversioned; bump
      the owning template's `template_version`). [workspace-template-upgrade: nn-upgrade
      Guided Migration Skill] [workspace-template-upgrade: Migration never deletes user data]

## 4. Reference resolution (S4-2)

- [ ] 4.1 TEST (`iNNfo/packages/innfo-core/tests/phase5-references*.test.ts`): `[[element-2a]]`
      and `[[Element 2A]]` resolve; `[[Element_2A]]` (separator variant) is unresolved; two
      elements named `Total Revenue` make `[[Total Revenue]]` an `AMBIGUOUS_ELEMENT_NAME`
      error; the ledger-marker test at `phase5-references-ledger.test.ts:242-247` is deleted.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]
- [ ] 4.2 `validator/references.ts`: delete the separator-normalized step (`:113-120` and
      the `byNormName` index if unused elsewhere) and both `legacy:` markers (`:90-91`);
      delete the `lineage-reference-name-fallback` ledger entry.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]

## 5. Repo content (S4-2)

- [ ] 5.1 Validate every tracked domain, fixture and sample with the new resolver; fix
      non-write-once references that only resolved through the fuzzy step (no committed
      conversion script); list any write-once file that fails for question 3.
      [stable-element-identity: Diagnostics for Unfrozen Models and Ambiguous Names]

## 6. Verification and release

- [ ] 6.1 `npm run typecheck`; `npm test` for `innfo-core` and `innfo-mcp`;
      `node scripts/verify.js`. [all requirements]
- [ ] 6.2 After the `dev → main` batch: `skills-v<next>` (nn-upgrade, nn-preflight),
      `innfo-mcp-v<next>` (hint), `blueprints-v<next>` if the workspace procedure changed,
      per `.agents/skills/nn-dev-release/SKILL.md`. [all requirements]
