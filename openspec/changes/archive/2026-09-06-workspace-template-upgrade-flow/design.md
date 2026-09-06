# Design: Workspace Template Upgrade Flow (2026-09-06)

## Data structure — template catalog

`iNNfo/specs/templates/catalog.json`:

```json
{
  "generated_at": "2026-09-06T00:00:00.000Z",
  "generator": "scripts/template-catalog.mjs",
  "templates": {
    "business": {
      "name": "business",
      "adopted": "V_0-2-0",
      "versions": [
        { "template_version": "V_0-1-0", "url": "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-1-0_NN.md" },
        { "template_version": "V_0-2-0", "url": "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/business_V_0-2-0_NN.md" }
      ]
    }
  }
}
```

`adopted` = highest published `template_version` present in the specs tree for that name.
Composite templates that only `includes` others are catalogued by their own `name`; the
catalog is flat by canonical template name.

## Generator — `scripts/template-catalog.mjs`

- Walks `iNNfo/specs/templates/` recursively for `*_V_x-y-z_NN.md` and `*/V_x-y-z/spec_NN.md`.
- Parses the YAML frontmatter (minimal, no new deps — reuse the same
  `parseFrontmatter`/focused-YAML approach `preflight-check.js` uses via `yaml-lite.js`)
  for `template_version`, `title`, `spec_url`.
- Groups by canonical `name`; picks `adopted` by highest version.
- Without `--check`: writes `catalog.json` (stable, sorted, LF).
- With `--check`: compares the rendered JSON to disk and exits `1` with a drift report if
  they differ (feeds the `spec-integrity`-style CI guard; wired into `verify.js` inventory
  if present).

## Tier-3 scan — `actioNN/skills/nn-preflight/scripts/upgrade-check.js`

Exported `scanWorkspaceUpgrades(workspaceDir, catalog)`:

```
discover models (*_NN.md under models/ and root, skip node_modules/.git/…)
for each model:
  parent_spec.url (or spec_url) basename -> {name, version}
  find catalog.templates[name]
  if missing template -> classify 'unlisted'
  else compare version vs adopted -> 'current' | 'upgrade-available' (gap) | 'ahead'
emit { models[], upgradeable: n, summary }
```

- Wired into `runCheck` when `--workspace-dir` set: `scanWorkspaceUpgrades` +
  `summary.upgrades*`. **Never contributes to exit-code `1`** — it only adds informational
  `items` of type `workspace-upgrade`.
- Catalog resolution order: `workspaceDir/specs/templates/catalog.json` →
  `scripts/../iNNfo/specs/templates/catalog.json` (the bundled copy in the skill repo) →
  remote raw URL. If none resolve → `offline` notice.
- `preflight-check.js` imports `./upgrade-check` and passes the catalog through; pure
  addition, existing checks untouched.
- SemVer gap helper in the same module (`gapKind(a, b) -> 'major'|'minor'|'patch'`),
  reused by `nn-upgrade`.

## Skill — `actioNN/skills/nn-upgrade`

Frontmatter per ecosystem convention (`name`, `version`, `last_updated`, `metadata`,
`license`, `compatibility`). Delegates its activation gate to `nn-preflight` (Tier 1).

Flow (matches the spec):
1. Run the Tier-3 upgrade scan and print the per-model classification table.
2. Consent: `[a] (Recommended) Upgrade / [b] Continue`. Stop on `[b]`.
3. Backup: `scripts/backup-workspace.js --workspace-dir <dir>` → timestamped
   `<workspace>-backup-<ts>/` as a sibling of the workspace (outside it) copying
   `models/`, `specs/`, `sources/nn/`, `procedures/`, `index.md`. Print the manual
   fallback (`xcopy` / drag-copy the workspace folder) if backup creation fails.
4. Impact: for each `upgrade-available` model, resolve the pinned vs adopted template
   (via `innfo-mcp` where available, else the bundled copies), diff Concepts/Fields/
   Matrices/Markers, and ask mapping questions **only** for removed/renamed/re-typed
   definitions the model uses.
5. Migrate: hydrate the adopted template into `specs/`, rewrite `parent_spec` in each
   model, apply agreed mappings, run `innfo-mcp_validate_model` per migrated model.
6. Confirm: before/after report.

`backup-workspace.js` is a plain zero-dep Node script with `.test.js`.

## Architecture seams

- `preflight-check.js` → `upgrade-check.js`: new import, Tier-3 block, summary fields,
  informational items. No change to exit-code logic.
- `nn-preflight` SKILL.md: add a "Tier 3 — template upgrade detection" section.
- `nn-upgrade` is a **separate skill**; preflight reports, upgrade mutates — matching the
  `preflight`/`skills-lifecycle` split.

## Tests

- `scripts/template-catalog.test.mjs` — generator output for a fixture tree; `--check`
  drift exit.
- `actioNN/skills/nn-preflight/scripts/upgrade-check.test.js` — classification
  (current / upgrade-available / ahead / unlisted / offline), gap kind.
- `preflight-check.test.js` — extend with: workspace containing an upgrade-available
  model → exit stays `0`, item type `workspace-upgrade` present.
- `actioNN/skills/nn-upgrade/scripts/backup-workspace.test.js` — backup copies the
  declared dirs outside the workspace; missing source dirs skipped without failure.
