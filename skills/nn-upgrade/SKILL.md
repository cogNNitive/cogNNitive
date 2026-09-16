---
name: nn-upgrade
description: Guided, consent-gated migration of a user workspace to the latest adopted iNNfo Level-2 templates and the specs they carry. Detects template upgrades via the nn-preflight Tier-3 scan, backs up the workspace out-of-tree, analyzes per-model schema impact, repoints parent_spec and re-validates through innfo-mcp. Triggers: template upgrade, upgrade templates, workspace upgrade, actualizar plantillas, migrar modelo a plantilla nueva.
version: "V_0-1-0"
last_updated: 2026-09-06
metadata:
  source_type: original
license: MIT
compatibility: opencode, claude-code, cursor, any agent supporting skills
bundled_templates: []
---

# nn-upgrade

## Canonical Activation Gate Protocol (MANDATORY)

Every cogNNitive skill MUST execute the canonical activation gate defined in `nn-preflight`
(session greeting banner + deterministic preflight integrity check). Do NOT duplicate the
script execution commands or the exit-code conditional branching here — delegate:

```markdown
## 0. Activation Gate
Execute the canonical activation gate defined in `nn-preflight` (session greeting + deterministic preflight integrity check).
```

## Role

Guided workspace template upgrade. Owns the **consent-gated migration** that `nn-preflight`
Tier 3 only *detects*: preflight reports `upgrade-available` models; this skill migrates
them with a backup, a schema-impact analysis, and a re-validation gate.

Never migrates silently. Every mutation requires explicit user consent. Detection is
read-only and lives in `nn-preflight`; this skill only mutates after a choice is made.

## Workflow

### Phase 0 — Detect

Run the Tier-3 upgrade scan (via `nn-preflight` `--workspace-dir`) and present the
per-model classification:

```markdown
🆙 Workspace template upgrade check:
- models/Foo_V_0-1-0_business_NN.md → business V_0-1-0 → V_0-2-0 (minor)
- models/Bar_V_0-2-0_business_NN.md → current
- models/Custom_V_0-1-0_my_spec_NN.md → unlisted (local specialization)
```

### Phase 1 — Inform & consent

Present exactly:

```markdown
⚠️ Updated templates are available for this workspace.
[a] (Recommended) Upgrade the workspace templates now
[b] Continue with the current versions
```

Consent is mandatory. Do NOT write, move, or delete any workspace file on `[b]` — stop.

### Phase 2 — Backup

Before any mutation, create a timestamped backup **outside** the workspace:

```bash
node skills/nn-upgrade/scripts/backup-workspace.js --workspace-dir <dir>
```

Covered: `models/`, `specs/`, `sources/nn/`, `procedures/`, `index.md`. If the automated
backup fails, show the manual fallback: copy the whole workspace folder to a backups
directory on disk (e.g. `xcopy /E /I <dir> <dir>-backup-<timestamp>` on Windows), and
confirm it exists before continuing.

### Phase 3 — Impact analysis

For every `upgrade-available` model:

1. Resolve the pinned template and the adopted template (via `innfo-mcp_get_template`
   for each URL, or the local `specs/` copies).
2. Diff the two schemas: Concepts, Fields (name + type), Matrices, Markers.
3. Ask mapping questions **only** when the diff removes, renames, or re-types a
   definition the model actually uses. For additive or unchanged definitions, do NOT ask —
   repoint and re-validate.
4. Present the impact per model before migrating:

```markdown
📋 Migration impact: models/Foo_V_0-1-0_business_NN.md
- business V_0-1-0 → V_0-2-0 (minor)
- Field `revenue` re-typed: string → number — the model has 3 values to review
```

### Phase 4 — Migrate

Per model, with the mappings agreed in Phase 3:

1. Hydrate the adopted template package into the workspace (write-once; the pinned frozen
   template stays intact and resolvable).
2. Update the model frontmatter: `parent_spec.name` and `parent_spec.url` point to the
   adopted template version; bump `model_version`.
3. Apply the agreed value mappings.
4. Re-validate with `innfo-mcp_validate_model`. A migrated model that fails validation is
   restored from the backup — never left half-migrated.

### Phase 5 — Confirm

Print the before/after report: template versions, gap kind, mapping decisions, per-model
validation outcome, and the backup path. Close the flow.

## Unlisted models

Models pinned to a template that is not in the catalog (local specializations,
`*_spec_NN.md`) are reported `unlisted`. This skill does NOT migrate them — they need a
semantic rebase onto the new canonical template. Report them and direct them to the
documented backlog guidance (`openspec/backlog.md`) rather than guessing.

## Core Rules

1. **Consent first**: no mutation before the user picks `[a] Upgrade`.
2. **Backup before migrate**: the out-of-workspace backup must exist before the first
   write; verify it, then proceed.
3. **Ask only on real impact**: mapping questions are limited to removed / renamed /
   re-typed definitions the model uses.
4. **Never half-migrate**: a failed validation restores from the backup.
5. **Unlisted = not migrated**: local specializations are reported, never auto-rebased.
6. **Delegate to preflight**: activation gate and detection live in `nn-preflight`; this
   skill does not re-implement them.
7. **Zero workspace pollution**: temporary checkouts go to system temp; never clone into
   the workspace.

## Quick Actions

- `nn-preflight` — run the read-only environment + workspace integrity gate
- `nn-innfo` — author/validate iNNfo models after a migration
- `nn-trannsform` — re-run source normalization if `sources/nn/` content changed