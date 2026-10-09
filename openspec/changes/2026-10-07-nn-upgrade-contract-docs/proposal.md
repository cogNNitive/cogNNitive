# Proposal: nn-upgrade Contract Split (skill = final state, procedure = legacy maps) + Glossary

## Why

`nn-upgrade` today is UX + engine + museum in one place: `SKILL.md` (156 lines
of Flow A/B/C), `migrate-domain.js` plus `lib/legacy-migrate.generated.cjs`
(~8000 lines) embedding every retired layout (`models/`, `specs/templates/`,
`workspace_NN.md`, `sources/nn|original|export|archive`, `_V_` names, legacy
keys). Every new legacy layout ages the skill itself. Verified 2026-10-07.

Maintainer decision: the skill owns the **final-state contract**; versioned
legacy detail lives in a **procedure + data maps**.

## What Changes

1. **Split.**
   - **Skill (`nn-upgrade/SKILL.md`):** consent gate, verified full-tree
     out-of-tree backup (`manifest.sha256`), `planHash` revalidation,
     migrate-or-restore, validation via MCP. Zero mentions of `models/` or any
     concrete retired path.
   - **Procedure (`upgrade_and_migrate_legacy_workspace_NN.md` + versioned maps):**
     per-layout detekt/plan tables, schema maps, `import-as-source` exit.
     The skill delegates; the procedure versions.
2. **Glossary (skill docs):** define once, with one line each —
   - **dry run:** read-only plan report + deterministic `planHash`, zero writes.
   - **planHash:** SHA over the normalized plan; `--apply` revalidates it and
     aborts that domain on mismatch (no partial writes).
   - **rehydration (Flow B):** materialize the adopted bluepriNNt locally,
     repoint `parent_spec`, bump version, re-validate; restore on failure.
   - **backup:** timestamped full-tree copy **outside** the workspace +
     SHA-256 manifest, before the first write.
3. **Flow C unchanged** (batch aggregator over the migration unit).

### Out of scope

- New migration semantics (no new layouts, no Flow B batching).
- `local-specialization-migration` (backlog item 13 stays deferred).

## Impact

- `skills/nn-upgrade/SKILL.md`, `docs/skills/documentation/skills/nn-upgrade.md`
- `iNNfo/specs/bluepriNNts/workspace/procedures/upgrade_and_migrate_legacy_workspace_NN.md`
- `openspec/specs/workspace-template-upgrade/spec.md` (pointer updates only)

## Success Criteria

- [ ] Skill file contains no retired-path literals (`models/`, `specs/templates/`,
      `sources/nn/`, `sources/original/`, `workspace_NN.md`).
- [ ] Procedure carries the per-layout maps with version stamps.
- [ ] Glossary defines dry run / planHash / rehydration / backup; docs mirror it.
