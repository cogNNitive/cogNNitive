# Proposal: S4 — retire the in-place legacy migration flows and the name-based reference read

## Intent

Slice S4 of `refactor/stable-identity-and-changesets` (rest of D16), re-scoped by the
maintainer decision of 2026-10-13: **there is no in-place migration of an old domain.**
Old domains are low value and the maintainer is the only user. An old domain is migrated
by creating a NEW domain (`init_domain`, S6) and importing the old one as a Source
(`migrate-domain.js --import-as-source`); the agent then derives `add_model` /
`add_element` changesets that cite it through `sources::`. No migration code rewrites a
user domain.

The previous S4 draft did the opposite: a reference/citation rewriter, a tolerant
name-based read kept behind a legacy marker, and a task that deleted Agent Modification
blocks and `feedback-ledger.jsonl` from user workspaces. That last task violated the
living requirement "Migration never deletes user data" (those files live in sha-checked
Sources under `sources/conversations/`). This change therefore SHRINKS to deletions:

1. **Retire Flow A** (domain layout migration: `migrate-domain.js` layout/apply/restore
   mode, the planner it loads from `lib/legacy-migrate.generated.cjs`, and the
   innfo-core migration half of the legacy quarantine) and **Flow C** (`batch-update.js`,
   batch Flow A).
2. **Delete the `--migrate-references` pass** (`migrate-domain.js:629-760`) and its test.
3. **Reclassify the reference read.** The brief asked to delete the name-based reference
   read (`validator/references.ts:89-120`, ledger entry `lineage-reference-name-fallback`)
   so that slugs are the only reference form. Verified against the specs and the content,
   that premise is wrong: `[[Display Name]]` wikilinks and name-based matrix row/column
   headers ARE the iNNfo grammar (`stable-element-identity` defines `AMBIGUOUS_ELEMENT_NAME`
   for them; `cross-model-reference-validation` uses `[[Model Title :: Element Name]]`), and
   ~2,500 lines in ~170 tracked `_NN.md` files (many write-once) use them. Deleting the read
   with no rewriter would invalidate them all. This change therefore deletes only the truly
   tolerant step (separator-normalized fuzzy matching) and removes the `legacy:` marker and
   ledger entry from exact display-name resolution, which is grammar, not legacy. A
   slug-only reference grammar is a separate, versioned iNNfo grammar change (dependency
   file, question 4).
4. **Keep Flow B** (bluepriNNt version upgrade — forward evolution of a current domain),
   `--freeze-slugs`, and `--import-as-source`, which S6c rebuilds on the `init_domain`
   scaffold (today's manifest is non-conformant: no `level`, wrong `parent_spec`, imports
   into `sources/legacy/`).

The directory is renamed from `2026-10-13-s4-domain-reference-migration` (removed with git)
because the change id would otherwise describe the opposite of what it does and would be
carried into the archive and the ledger owners.

## Scope

### In Scope
- Delete Flow A, Flow C, `--migrate-references`, the migration half of the quarantine
  (`planMigration` and its exclusive modules), the generated `legacy-migrate` bundle and
  its build step, their tests, and their `legacy-ledger.yaml` entries and markers.
- Reference resolution: exact slug, then exact display name (grammar); delete the
  separator-normalized fuzzy step; an ambiguous display name is an error; drop the
  `legacy:` markers and the `lineage-reference-name-fallback` ledger entry.
- Fix repo content that relied on the fuzzy step (non-write-once only).
- Rewrite `skills/nn-upgrade/SKILL.md` to Flow B plus the new-domain migration pointer.

### Out of Scope
- The detection half of the quarantine (legacy layout detector, MCP legacy hint, preflight
  detection, frozen legacy fixture): kept; the hint now points at the new-domain recipe.
- `init_domain` and the conformant import-as-source scaffold (S6c).
- Cross-model references `[[Model Title :: Element Name]]` (title and name grammar by
  design; dependency file, question 4).
- The editor's legacy-domain banner (`editor-legacy-domain`, deleted with the editor in S5).

## Capabilities

### Modified Capabilities
- `workspace-template-upgrade`: the skill has Flow B only plus the new-domain pointer;
  layout migration and its archive-citation report are REMOVED; the no-deletion rule is
  restated for what remains.
- `stable-element-identity`: references resolve by exact slug or exact display name only;
  ambiguity is an error.

## Approach

Deletion slice, test-first where behaviour changes (reference resolution, the hint text,
the skill's flow list). Each deleted ledger entry's removal condition is evaluated and
recorded in the commit (design).

## Dependencies

No dependency on #1A to #1C or S2c; parallel with S3. It MUST land before S6c, which
rewrites `runImportAsSource` in the same file (`migrate-domain.js`). It touches
`legacy-ledger.yaml`, which S5 also edits (the `editor-legacy-domain` entry); S5 lands
after S6, so after S4.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `skills/nn-upgrade/scripts/{migrate-domain.js,batch-update.js,*.test.js}` | Modified / Removed | Flow A, Flow C, `--migrate-references` |
| `skills/nn-upgrade/scripts/lib/legacy-migrate.generated.cjs`, `scripts/build-preflight-primitives.mjs(+test)` | Removed / Modified | generated planner bundle |
| `iNNfo/packages/innfo-core/src/legacy/**` (migration half) and tests | Removed | `planMigration`, reader, language map, schema maps, layout plan/mirrors/finalize |
| `iNNfo/packages/innfo-core/src/validator/references.ts` + tests | Modified | exact slug or name; no fuzzy step |
| `iNNfo/packages/innfo-mcp/src/tools/legacy-hint.ts` | Modified | hint text |
| `legacy-ledger.yaml`, `scripts/lib/legacy-write-guard.js` | Modified | entries deleted |
| `skills/nn-upgrade/SKILL.md`, `iNNfo/specs/bluepriNNts/workspace/procedures/upgrade_and_migrate_legacy_workspace_NN.md` | Modified | Flow B + new-domain pointer |
| repo domains, fixtures, samples (non-write-once) | Modified | references that relied on fuzzy matching |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Repo content relied on fuzzy matching | Med | Validation run over every tracked domain before and after |
| A shared helper of the migration half is used by detection | Med | `rg` import audit before each deletion; typecheck |
| A ledger entry removed while its marker remains | Low | `legacy-ledger-guard.js` runs in `verify.js` |

## Rollback Plan

Revert the slice commits; the flows and the fallback return. No user data is touched.

## Success Criteria

- [ ] `nn-upgrade` documents and ships Flow B, `--freeze-slugs` and `--import-as-source` only.
- [ ] No `planMigration`, `batch-update.js`, `--migrate-references` or `legacy-migrate.generated.cjs` remains.
- [ ] Fuzzy (separator-normalized) reference matching is gone; an ambiguous display name is an
      error; no `legacy:` marker or ledger entry remains for reference resolution.
- [ ] `legacy-ledger-guard.js`, `node scripts/verify.js` and the affected suites are green.
