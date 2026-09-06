# Proposal: Workspace Template Consolidation

## Intent

Make `workspace_V_0-3-0_spec_NN.md` the single canonical distributed workspace-entry template by retiring three overlapping artifacts from ACTIVE distribution — `cogNNitive_V_0-2-0_NN.md`, composite `base_V_0-1-0_spec_NN.md`, unversioned root alias `workspace_spec_NN.md` — freezing their files byte-identical for legacy resolution.

## Context / Problem

- **cogNNitive V_0-2-0**: standalone lineage template, ~70% duplicated by fused workspace V_0-3-0; still active (catalog + manifest), parent_spec of `base` + `<ws>_cogNNitive_NN.md`.
- **base V_0-1-0**: two-file overview-root composer, superseded by V_0-3-0 fusion; parser precedence in innfo-core + 2 specs.
- **root `workspace_spec_NN.md`**: unversioned alias, stale frontmatter, catalog-skipped, distribution-only (manifest `model` workflow, wizard, bundle, mcp/core tests).

Reference is already V_0-3-0 (`docs/workspace_NN.md`); `lineage-version-status` mandates cogNNitive V_0-2-0 byte-identical.

## Scope

### In Scope
- Freeze cogNNitive + base: strip from catalog + manifest ACTIVE lists; files untouched, still resolvable; docs mark frozen.
- Retire `workspace_spec_NN` alias: unbind manifest `model`/wizard, nn-innfo bundle + copy, hydrate/fixtures; keep file as frozen historical artifact (D2).
- Repoint consumers: `template-catalog.mjs`, innfo-core, innfo-mcp, innfo-editor `SHIPPED_TEMPLATE_VERSIONS`, `docs/use/manifest*.md`, `nn-template-audit/AUDIT_LOG.md`.
- Delta-spec 5 capabilities; TDD-first; resolve D1–D3 in design.

### Out of Scope
- Editing frozen/versioned templates (write-once).
- `cocNNitive_V_0-1-0`; migrating existing workspaces.
- Concurrent change `2026-09-06-hierarchical-submodel-paths` + `submodelPath.ts`.

## Capabilities

- **New**: None.
- **Modified**: `base-composite-template` (base retired) · `workspace-entrypoint` (`*_base_NN.md` precedence superseded) · `workspace-entrypoint-resolution` (hydration repoints) · `workspace-directory-conventions` (Artifacts ref → V_0-3-0) · `lineage-version-status` (new records stop pointing at cogNNitive).

## Approach

Design resolves D1–D3 → strip cogNNitive/base from catalog+manifest, mark frozen → unbind alias (manifest/wizard, skill bundle, hydrate/fixtures) → repoint parser/editor/catalog → delta specs; tests green (`npm --prefix iNNfo run test`).

## Open Questions

- **D1 — folder move vs URL stability**: move versioned files into `templates/workspace/` with coordinated raw.githubusercontent repoint, vs keep V_0-3-0 URL and apply subfolder convention going-forward (breakage vs consistency).
- **D2 — filename**: normalize `_spec_` suffix vs keep `workspace_V_0-3-0_spec_NN.md`.
- **D3 — wizard binding**: rebind `model` workflow to versioned template vs drop.

## Affected Areas

iNNfo templates (catalog, cogNNitive/, base/, alias) · manifest/source.yaml + docs/use/manifest*.md · innfo-core · innfo-mcp · innfo-editor · template-catalog.mjs · actioNN nn-innfo · 5 openspec specs · AUDIT_LOG.md

## Risks

| Risk | L | Mitigation |
|---|---|---|
| URL breakage on move (D1) | Med | Keep URL or repoint pre-release |
| Frozen byte-identity broken | Med | git-diff assertions; never edit |
| Legacy workspaces stop resolving | Med | Files kept resolvable; parser compat |
| Concurrent-tree collision | Med | Unique change dir; no foreign staging |
| Docs/manifest drift | Low | Same-change updates + integrity audit |

## Rollback Plan

Files never deleted → `git revert` + re-add distribution entries; frozen content untouched.

## Dependencies

D1–D3 design resolution (none external).

## Success Criteria

- [ ] catalog/manifest drop the 3 from ACTIVE lists; frozen-file diffs empty
- [ ] hydrate/wizard/manifest bound to versioned template; mcp/core/editor tests green
- [ ] nn-innfo unbundled; manifest docs + AUDIT_LOG consistent; integrity audit passes
