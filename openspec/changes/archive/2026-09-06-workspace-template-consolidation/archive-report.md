# Archive Report: Workspace Template Consolidation

- **Change**: `workspace-template-consolidation`
- **Phase**: archive (final SDD phase)
- **Archived on**: 2026-09-06
- **Branch**: `refactor/workspace-template-consolidation` @ `f8ce5f2`
- **Archive path**: `openspec/changes/archive/2026-09-06-workspace-template-consolidation/`
- **Verdict source**: `verify-report.md` — **PASS WITH WARNINGS** (no CRITICAL issues; warnings are documented pre-ship manifest gates that resolve post-merge / post-tag, by design)
- **Archive status**: intentional-with-warnings — archived on a PASS WITH WARNINGS verdict; the two manifest-gate warnings are inherent pre-ship states, not implementation defects (see verify-report Deviations #1–#2 and tasks.md G6 note).

## Change Summary

Make `workspace_V_0-3-0_spec_NN.md` the single canonical distributed workspace-entry template by retiring three overlapping artifacts from ACTIVE distribution — `cogNNitive_V_0-2-0_NN.md` (lineage), composite `base_V_0-1-0_spec_NN.md`, unversioned root alias `workspace_spec_NN.md` — freezing their files byte-identical for legacy resolution.

## Spec Sync (completed during apply, G5 — confirmed at archive time)

The 5 delta specs were merged into the active specs during apply (task 5.2–5.6). Archive verified the active `openspec/specs/<cap>/spec.md` files contain every MODIFIED/ADDED block from the delta specs — no missing blocks:

| Domain | Delta blocks | Active spec status |
|---|---|---|
| base-composite-template | 3 MODIFIED + 1 ADDED | in sync (marker: `frozen_templates`) |
| workspace-entrypoint | 2 MODIFIED | in sync (marker: `workspace_V_0-3-0_spec_NN`) |
| workspace-entrypoint-resolution | 2 MODIFIED + 1 ADDED | in sync (marker: `workspace_V_0-3-0_spec_NN`) |
| workspace-directory-conventions | 1 MODIFIED | in sync (marker: `workspace_V_0-3-0_spec_NN`) |
| lineage-version-status | 1 MODIFIED + 1 ADDED | in sync (markers: `_workspace_NN.md`, `/^(cognnitive|workspace)(_|$)/i`) |

Requirements not mentioned in the deltas were preserved in all 5 active specs. No REMOVED/RENAMED requirements in this change.

## Key Decisions (design.md D1–D8)

- **D1 — Folder placement vs URL stability**: no physical move of published versioned files; URLs stay stable. Going-forward, new workspace versions (V_0-4-0+) live at `iNNfo/specs/templates/workspace/`. The root alias `workspace_spec_NN.md` is the only file physically removed from the root set.
- **D2 — `_spec_` filename suffix**: retained as legacy convention for the workspace+base family; tooling already normalizes it.
- **D3 — Wizard/manifest binding**: `model` workflow rebinds to `workspace_V_0-3-0_spec_NN`; nn-innfo bundle carries the canonical V_0-3-0 copy; alias removed from bundle.
- **D4 — Freeze mechanism**: `frozen_templates:` partition in `manifest/source.yaml` + `FROZEN_NAMES = ['cogNNitive','base']` in `template-catalog.mjs` + `verify.js` dual-block parse; frozen files stay byte-identical, get no upgrade notices.
- **D5 — Lineage rebind**: `provenance-model.js` points new records at `workspace_V_0-3-0_spec_NN` with `_workspace_NN.md` suffix; `discoverModels.ts` exclusion matcher `/^(cognnitive|workspace)(_|$)/i`.
- **D6 — Parser**: NO code change to `recursiveParser/workspace.ts`; overview-root precedence retained for legacy workspaces.
- **D7 — Editor**: NO functional change; no `workspace/` dir, `SHIPPED_TEMPLATE_VERSIONS` unchanged.
- **D8 — Manifest scripts**: NO code change to check-parity / generate-manifest / validate-manifest (docs regenerated only).

## Archive Contents

- `proposal.md` ✅
- `design.md` ✅
- `specs/base-composite-template/spec.md` ✅
- `specs/workspace-entrypoint/spec.md` ✅
- `specs/workspace-entrypoint-resolution/spec.md` ✅
- `specs/workspace-directory-conventions/spec.md` ✅
- `specs/lineage-version-status/spec.md` ✅
- `tasks.md` ✅ — all implementation tasks (G1–G6, 23/23) checked `[x]`; Task Completion Gate passed at archive time
- `verify-report.md` ✅ — PASS WITH WARNINGS

## Post-Merge / Post-Tag Follow-Ups (for next release)

These are the pre-ship manifest gates recorded in verify-report (Deviations #1–#2) and tasks.md G6 note. They resolve automatically after shipping; no code change is required:

1. **Post-merge (preview channel)**: re-run `node scripts/manifest/validate-manifest.js --channel preview` — the 2 closure violations (nn-innfo bundled template + `model` workflow reference undeclared) resolve once `actioNN/skills/nn-innfo/SKILL.md` and `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md` land on `main`.
2. **Post-tag (stable channel)**: bump the skills/templates tag from `templates-v0.2.1` to the next release tag — the 4 stable violations (workspace entry 404 at the frozen tag, V_0-3-0 not yet released there; closure rules requiring `workspace_V_0-3-0_spec_NN` in `templates[].name` or remote bundled templates) resolve once the new tag carries the updated SKILL.md + V_0-3-0.
3. **Re-verify end-to-end**: after the tag bump, re-run `node scripts/verify.js` (step 5 stable validate-manifest) + `generate-manifest.js --check` both channels to confirm zero violations.

## Backlog

`openspec/backlog.md` does not list this change → no backlog update required (no-op).

## Concurrent-Session Guard

- `openspec/changes/2026-09-06-hierarchical-submodel-paths/` — untouched, zero diff.
- `iNNfo/apps/innfo-editor/src/utils/submodelPath.ts` — untouched, zero diff.
- Neither path staged, modified, or moved by this archive.

## Source of Truth

The following active specs now reflect the new behavior (merged during apply, verified at archive):
- `openspec/specs/base-composite-template/spec.md`
- `openspec/specs/workspace-entrypoint/spec.md`
- `openspec/specs/workspace-entrypoint-resolution/spec.md`
- `openspec/specs/workspace-directory-conventions/spec.md`
- `openspec/specs/lineage-version-status/spec.md`

## SDD Cycle Complete

The change has been fully planned, implemented, verified (PASS WITH WARNINGS — no CRITICAL), and archived. Ready for the next change.