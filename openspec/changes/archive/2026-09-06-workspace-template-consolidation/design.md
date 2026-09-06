# Design: Workspace Template Consolidation

## Context

Make `workspace_V_0-3-0_spec_NN.md` the single canonical distributed workspace-entry template. Retire three overlapping artifacts from **ACTIVE distribution** — `cogNNitive_V_0-2-0_NN.md` (lineage), composite `base_V_0-1-0_spec_NN.md`, unversioned root alias `workspace_spec_NN.md` — freezing their files byte-identical for legacy resolution. Reference docs (`docs/workspace_NN.md`, `temp/workspace_NN.md`, base samples) already pin `workspace_V_0-3-0_spec_NN.md`; nothing else re-pins.

Constraints discovered from code (verified on this branch):
- `scripts/verify.js` Template Inventory Guard requires **every disk folder** under `iNNfo/specs/templates/` to be declared in `manifest/source.yaml` — a frozen partition is required or the guard fails.
- `scripts/template-catalog.mjs` auto-discovers all `level: 2` files with versioned filenames — `cogNNitive`/`base` stay in the catalog unless the generator gets a frozen set.
- `scripts/manifest/check-parity.js` validates each manifest template entry version against the file's frontmatter (`version` → `spec_version`) — new entries must use `spec_version`.
- `hydrateTemplate` resolves by **name** through `resolveTemplatePackage`/`parseSpecName` (no manifest lookup, no hardcoded map) — the versioned name `workspace_V_0-3-0_spec_NN` resolves consistently (base `workspace`, version `0.3.0.spec` on both request and file sides); bare `workspace_V_0-3-0` does NOT (version mismatch `0.3.0` vs `0.3.0.spec`).
- Editor `parseVersionedFilename` regex `^(.+)_V_(\d+)-(\d+)-(\d+)_NN\.md$` never matches `_spec_` names; no `workspace/` dir exists on disk → no editor functional change.
- The alias is referenced only by distribution surfaces (manifest, nn-innfo bundle, scripts tests) — physical deletion is safe; git history preserves it byte-identical.

## Decisions

### D1 — Folder placement vs URL stability

| Option | Tradeoff |
|---|---|
| A. Move versioned files into `templates/workspace/` + coordinated repoint | Uniform layout, but breaks every raw URL pinned in `parent_spec.url`/`spec_url` of docs, temp, tests, and deployed workspaces pinned to `main` — violates write-once |
| **B. Keep published URLs; subfolder convention going-forward** (CHOSEN) | Zero breakage for published versions; new versions get new (never-pinned) URLs — safe by definition |

**Choice**: B — no physical move of `workspace_V_0-1-0/0-2-0/0-3-0_spec_NN.md` (they stay at the templates root, byte-identical, URLs stable). The root alias `workspace_spec_NN.md` is the **only** file physically removed from the root set. Going-forward: any NEW workspace version (V_0-4-0+) lives at `iNNfo/specs/templates/workspace/workspace_V_x-y-z_spec_NN.md`, mirroring `documentation/V_0-1-0/spec_NN.md`. Verified compatible: catalog `versionFromFilename` handles both flat and nested paths; immutability guard matches any `*_V_x-y-z*` basename; when the `workspace/` dir exists, verify.js inventory requires (and gets) a `workspace` declaration.

### D2 — `_spec_` filename suffix

| Option | Tradeoff |
|---|---|
| A. Rename published files to drop `_spec_` | Breaks raw URLs + `spec_url` frontmatter of write-once files |
| **B. Keep `_spec_` in the workspace family** (CHOSEN) | Family-internal consistency; all tooling already normalizes it (catalog regex `(?:_spec)?`, resolver `parseSpecName` symmetric, immutability guard version regex) |
| C. Drop `_spec_` going-forward only | Two conventions inside one family; parseSpecName version tokens diverge (`0.3.0.spec` vs `0.3.0`) across generations |

**Choice**: B — `_spec_` is a retained legacy convention for the workspace+base family. Published V_0-1-0/0-2-0/0-3-0 filenames unchanged; future versions under `templates/workspace/` use the same `<name>_V_x-y-z_spec_NN.md` pattern. Documented consequence (unchanged behavior): the editor version-notice never fires for workspace templates because `parseVersionedFilename` can't parse `_spec_` names.

### D3 — wizard/manifest binding after alias retirement

| Option | Tradeoff |
|---|---|
| A. Rebind `model` workflow to versioned template name | Exact, version-pinned hydration; the alias disappears from all distribution |
| B. Drop the `model` workflow | Loses the wizard entry point — regression |
| **C. Rebind + remove alias from bundle** (CHOSEN) | A, plus nn-innfo bundle carries the canonical V_0-3-0 copy |

**Choice**: C. `hydrateTemplate('workspace_V_0-3-0_spec_NN')` resolves via the existing 4-tier resolver (flat/global/skill tiers match by `parseSpecName`) — **no innfo-mcp code change required**; the `spec.spec.ts` hydrate fixture updates to the versioned name as the regression guard. Exact bindings:

- `manifest/source.yaml` `workflows[model].template` → `workspace_V_0-3-0_spec_NN`; `nn-innfo` skill `templates: [workspace_spec_NN]` → `templates: [workspace_V_0-3-0_spec_NN]`; templates list entry `workspace_spec_NN` → `- name: workspace, path: iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md, version: "V_0-2-1"` (version = file `spec_version` so check-parity passes; matches existing convention, e.g. projects V_0-2-1).
- `actioNN/skills/nn-innfo/SKILL.md` `bundled_templates` → `workspace_V_0-3-0_spec_NN` at `templates/workspace_V_0-3-0_spec_NN.md`; delete `templates/workspace_spec_NN.md`.
- `scripts/manifest/check-parity.js` and `generate-manifest.js` need **no code change** (they iterate `source.templates` only; `frozen_templates` is machine-only, not rendered).

### Additional decisions (discovered during design)

- **D4 — Freeze mechanism**: add a `frozen_templates:` partition. `template-catalog.mjs` gains `FROZEN_NAMES = ['cogNNitive','base']`, emitting them under a top-level `frozen` object and dropping them from `templates` (upgrade-check reads only `catalog.templates` → frozen templates get no upgrade notices, status `unlisted` for legacy pins — desired). `verify.js` `extractDeclaredTemplates` parses both `templates:` and `frozen_templates:` blocks so the inventory guard passes with the folders still on disk. Physical files stay byte-identical (immutability guard enforces).
- **D5 — Lineage records stop binding cogNNitive**: `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` rebinds new-record emission to the fused successor: `TEMPLATE_URL` → `.../workspace_V_0-3-0_spec_NN.md`, `TEMPLATE_NAME` → `workspace_V_0-3-0_spec_NN`, filename suffix `_cogNNitive_NN.md` → `_workspace_NN.md`. Companion: `iNNfo/packages/innfo-core/src/workspace/discoverModels.ts` `isCogNNitiveTemplate` → non-navigation matcher `/^(cognnitive|workspace)(_|$)/i` so workspace-conforming lineage records stay out of manifest reconciliation (the manifest itself is already excluded by path equality; no other model conforms to the workspace template). `nn-innfo` SKILL §14 prose updated to match.
- **D6 — innfo-core parser: NO code change.** `recursiveParser/workspace.ts` `OVERVIEW_ROOT_RE`/`isOverviewRoot`/`pickEntrypointName` stay for backward compatibility (existing overview-root workspaces keep parsing; `recursive-parser.test.ts` overview-root suite keeps passing). Base is reframed as legacy **in specs only**.
- **D7 — Editor: NO functional change.** No `workspace/` dir on disk; `SHIPPED_TEMPLATE_VERSIONS` keeps no `workspace` key; `shipped-template-versions.test.ts` passes unchanged. Comment-only refresh in `samples.ts` + test header (the alias-deletion rationale).

## Architecture

Seams and contracts:

- **Distribution seam (catalog)**: `catalog.json` = machine-readable ACTIVE template index consumed by `nn-preflight/scripts/upgrade-check.js`. Freeze = removal from `templates` + record under `frozen`. Contract: `{ generator, templates, frozen, warnings }`.
- **Distribution seam (manifest)**: `manifest/source.yaml` = hand-authored source of truth; `generate-manifest.js` renders `docs/use/manifest.md` + `manifest-next.md` (byte-deterministic, `--check` gated); `check-parity.js` validates every entry against disk; `verify.js` inventory guard validates the reverse (folders ⊆ declared). `frozen_templates:` satisfies the guard without active distribution.
- **Resolution seam (innfo-mcp/core)**: `resolveTemplatePackage`/`parseSpecName` — name-based, store-ordered (workspace package → flat → global → skill). Versioned-name hydration requires the full stem `workspace_V_0-3-0_spec_NN` (NOT `workspace_V_0-3-0`).
- **Package boundaries**: innfo-core owns parsing + discovery predicates (`discoverModels.ts`, `recursiveParser/workspace.ts`) — unchanged except the exclusion matcher; innfo-mcp owns tools + resolver — unchanged; innfo-editor owns version-notice — unchanged; `actioNN` owns distribution (nn-innfo bundle, nn-trannsform lineage emitter).

Data flow (wizard bootstrap after change):

    manifest/source.yaml ──generate──▶ docs/use/manifest.md (+manifest-next.md)
         │ templates[workspace] + frozen_templates[cogNNitive, base]
         ▼
    skills-manager install → ~/.agents/templates/workspace_V_0-3-0_spec_NN.md
         │  (nn-innfo bundle carries the same file at ~/.agents/skills/.../templates/)
         ▼
    hydrateTemplate('workspace_V_0-3-0_spec_NN') → workspace specs/templates/workspace/V_0-2-1/
         ▼
    model workflow → wizard scaffolds workspace_NN.md parent_spec → V_0-3-0 URL

## File Change Map

**Add**
| File | Description |
|---|---|
| `openspec/changes/2026-09-06-workspace-template-consolidation/design.md` | This document |
| `iNNfo/specs/templates/workspace/` (empty, documented convention) | Going-forward home for V_0-4-0+; not created now unless needed for a test fixture |
| `actioNN/skills/nn-innfo/templates/workspace_V_0-3-0_spec_NN.md` | Byte-identical copy of the canonical V_0-3-0 (replaces alias bundle) |

**Modify**
| File | Change |
|---|---|
| `manifest/source.yaml` | `templates:` drop `workspace_spec_NN`, `cogNNitive`, `base`; add `workspace` entry (path `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md`, version `V_0-2-1`); add `frozen_templates:` (cogNNitive → `cogNNitive/cogNNitive_V_0-2-0_NN.md` `V_0-2-1`; base → `base/base_V_0-1-0_spec_NN.md` `V_0-1-0`); `nn-innfo` skill `templates: [workspace_V_0-3-0_spec_NN]`; `workflows[model].template: workspace_V_0-3-0_spec_NN` |
| `docs/use/manifest.md`, `docs/use/manifest-next.md` | Regenerate via `generate-manifest.js` (cogNNitive/base/alias entries vanish; workflow rebinds) |
| `scripts/template-catalog.mjs` | Add `FROZEN_NAMES`; partition `templates`/`frozen` in output |
| `iNNfo/specs/templates/catalog.json` | Regenerate (`--check` must pass) |
| `scripts/verify.js` | `extractDeclaredTemplates` parses `templates:` + `frozen_templates:` |
| `actioNN/skills/nn-innfo/SKILL.md` | `bundled_templates` → versioned name/path; §14 exclusion prose |
| `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` | Line 5/8 template consts → workspace V_0-3-0; line 704 suffix → `_workspace_NN.md` |
| `iNNfo/packages/innfo-core/src/workspace/discoverModels.ts` | `isCogNNitiveTemplate` → `/^(cognnitive|workspace)(_|$)/i` non-navigation matcher |
| `.agents/skills/nn-template-audit/AUDIT_LOG.md` | cogNNitive + base rows → status `FROZEN`; add V_0-3-0 row |
| `actioNN/scripts/skills-manager.test.js` | Fixtures: alias → versioned name/path; bundled-copy assertion |
| `scripts/template-catalog.test.mjs` | Add frozen-partition assertions |
| `scripts/verify-inventory.test.js` | Add `frozen_templates:` parsing case |
| `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts` | Hydrate fixture: `workspace_spec_NN` → `workspace_V_0-3-0_spec_NN` (regression guard for D3) |
| `iNNfo/packages/innfo-mcp/src/tools/workspace-sync.spec.ts` | Extend exclusion test with a workspace-conforming lineage record |
| `actioNN/skills/nn-trannsform/test/unit/test-provenance.js` | Lines 83/86: filename + parent_spec assertions → workspace |
| `actioNN/skills/nn-trannsform/scripts/lib/bootstrap.js` | Line 27 doc: `<Project>_V_0-2-0_workspace_NN.md` |
| `iNNfo/CONTRIBUTING.md` | Bundled-copy sync example → versioned name |
| Delta specs (5, in `openspec/changes/.../specs/` — sdd-spec formalizes) | `base-composite-template` (base legacy/frozen), `workspace-entrypoint` (base precedence legacy; template def → versioned canonical), `workspace-entrypoint-resolution` (versioned refs), `workspace-directory-conventions` (Artifacts ref → V_0-3-0), `lineage-version-status` (new records → workspace_V_0-3-0; cogNNitive byte-identity assertion retained) |

**Remove**
| File | Reason |
|---|---|
| `iNNfo/specs/templates/workspace_spec_NN.md` | Root alias; distribution-only; git history preserves byte-identical artifact |
| `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` | Bundled alias copy |

**Unchanged (explicitly)**: all versioned template files (`workspace_V_0-1-0/0-2-0/0-3-0_spec_NN.md`, `cogNNitive_V_0-1-0/0-2-0_NN.md`, `base_V_0-1-0_spec_NN.md`), `innfo-core/src/recursiveParser/workspace.ts`, `innfo-mcp/src/tools/spec.ts` + `resolver-node.ts`, `innfo-editor/src/config/samples.ts`, `scripts/manifest/{check-parity,generate-manifest,validate-manifest}.js`.

## Risks

| Risk | L | Mitigation |
|---|---|---|
| verify.js inventory guard fails after removing cogNNitive/base | Med | `frozen_templates:` partition + guard parser update (verify gate) |
| Lineage records now classified `upgrade-available` by upgrade-check | Low | Correct semantics (workspace family); note in AUDIT_LOG |
| `hydrateTemplate('workspace_V_0-3-0_spec_NN')` resolution regression | Low | spec.spec.ts fixture guard updated |
| Concurrent-tree collision | Med | Design phase completed after branch restored; apply re-verifies before writes |
| Frozen byte-identity broken | Med | `guard-template-immutability.js` gate + git-diff assertion for the 3 frozen files |

## Verify Plan

```bash
git status -sb                                  # branch refactor/workspace-template-consolidation, only intended files
npm --prefix iNNfo test                         # core + mcp + editor suites (incl. shipped-template-versions, workspace-sync, spec)
npm --prefix iNNfo run typecheck
node scripts/template-catalog.mjs --check       # catalog regenerated, frozen partition deterministic
node scripts/verify.js                          # inventory guard (frozen-aware), parity, tsc scripts, manifest validate + generate --check, guard tests
node scripts/manifest/validate-manifest.js --channel preview
node scripts/manifest/generate-manifest.js --channel stable --check
node scripts/manifest/generate-manifest.js --channel preview --check
node scripts/guard-template-immutability.js     # no versioned template mutated (alias delete = D, allowed)
git diff --exit-code -- iNNfo/specs/templates/cogNNitive iNNfo/specs/templates/base \
  iNNfo/specs/templates/workspace_V_0-1-0_spec_NN.md iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md \
  iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md   # frozen files byte-identical
```

## Open Questions

None blocking. D5's exact `model_version` for new lineage records (V_0-2-0 retained) is confirmed in this design; scenario wording belongs to sdd-spec.