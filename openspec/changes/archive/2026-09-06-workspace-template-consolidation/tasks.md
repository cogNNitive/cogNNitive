# Tasks: Workspace Template Consolidation

## Review Workload Forecast

~450–650 lines. Split: PR1=G1 → PR2=G2+G3 → PR3=G4 → PR4=G5+G6. Delivery: ask-on-risk.

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

**Order**: G1 → G2 → G3 → G4 → G5 → G6. G2/G3/G4 need G1; G5 needs G2+G3; G6 last.

## G1 — Catalog + Manifest Frozen Partition (precedes all)

Objective: freeze `cogNNitive`+`base` via `FROZEN_NAMES` + `frozen_templates:`.

- [x] 1.1 RED `scripts/template-catalog.test.mjs`: assert `catalog.frozen` holds cogNNitive+base, absent from `templates`
- [x] 1.2 GREEN `scripts/template-catalog.mjs`: add `FROZEN_NAMES = ['cogNNitive','base']`; emit top-level `frozen`, drop from `templates` (141)
- [x] 1.3 RED `scripts/verify-inventory.test.js`: folder declared only under `frozen_templates:` passes `checkTemplateInventory`
- [x] 1.4 GREEN `scripts/verify.js`: `extractDeclaredTemplates` (regex 33) parses `templates:` + `frozen_templates:`
- [x] 1.5 config-only → verify: `manifest/source.yaml` — add `frozen_templates:` (cogNNitive→`iNNfo/specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` `V_0-2-1`; base→`iNNfo/specs/templates/base/base_V_0-1-0_spec_NN.md` `V_0-1-0`); drop both from `templates:`
- [x] 1.6 config-only → verify: regen `iNNfo/specs/templates/catalog.json`; `template-catalog.mjs --check` + `verify.js` pass

## G2 — Root Alias Removal (precedes G4, G5)

Objective: retire `workspace_spec_NN.md`; rebind manifest + hydration.

- [x] 2.1 test-guard `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts` (212–228): hydrate fixture → `workspace_V_0-3-0_spec_NN` (resolver unchanged)
- [x] 2.2 config-only → verify: `manifest/source.yaml` — drop alias entry; add `workspace` (path `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md`, version `V_0-2-1`); `workflows[model].template` → `workspace_V_0-3-0_spec_NN`; nn-innfo skill `templates:` → `[workspace_V_0-3-0_spec_NN]`
- [x] 2.3 delete `iNNfo/specs/templates/workspace_spec_NN.md`
- [x] 2.4 verify: `npm --prefix iNNfo test` + `node scripts/verify.js`

## G3 — Lineage Rebind (precedes G5)

Objective: lineage → fused workspace refs; discovery excludes workspace records.

- [x] 3.1 RED `actioNN/skills/nn-trannsform/test/unit/test-provenance.js` (83/86): expect `_workspace_NN.md` suffix + `parent_spec.name: "workspace_V_0-3-0_spec_NN"`
- [x] 3.2 GREEN `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js`: TEMPLATE_URL (5)/TEMPLATE_NAME (8) → workspace V_0-3-0; suffix (704) → `_workspace_NN.md`; keep `model_version V_0-2-0`
- [x] 3.3 RED `iNNfo/packages/innfo-mcp/src/tools/workspace-sync.spec.ts` (110): add `<proj>_V_0-2-0_workspace_NN.md` exclusion case
- [x] 3.4 GREEN `iNNfo/packages/innfo-core/src/workspace/discoverModels.ts` (30): matcher → `/^(cognnitive|workspace)(_|$)/i`
- [x] 3.5 config-only → verify: `actioNN/skills/nn-trannsform/scripts/lib/bootstrap.js` (27) doc → `<Project>_V_0-2-0_workspace_NN.md`; run test-provenance.js + `npm --prefix iNNfo test`

## G4 — Skill Bundle Swap (precedes G6)

Objective: bundle carries canonical V_0-3-0; bundled alias removed.

- [x] 4.1 RED `actioNN/scripts/skills-manager.test.js`: fixtures + bundled-copy assertion (149) → versioned name/path
- [x] 4.2 GREEN `actioNN/skills/nn-innfo/SKILL.md`: `bundled_templates` (9–11) → `workspace_V_0-3-0_spec_NN` @ `templates/workspace_V_0-3-0_spec_NN.md`; §14 prose
- [x] 4.3 add `actioNN/skills/nn-innfo/templates/workspace_V_0-3-0_spec_NN.md` — byte-identical copy of `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md`
- [x] 4.4 delete `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md`
- [x] 4.5 config-only → verify: `iNNfo/CONTRIBUTING.md` (171) example → versioned name; run skills-manager.test.js

## G5 — Docs + Active Specs Reframe (precedes G6)

Objective: regen docs; apply 5 deltas into active specs.

- [x] 5.1 config-only → verify: regen `docs/use/manifest.md` + `docs/use/manifest-next.md`; `generate-manifest.js --check` both channels
- [x] 5.2–5.6 apply deltas → `openspec/specs/{base-composite-template,workspace-entrypoint,workspace-entrypoint-resolution,workspace-directory-conventions,lineage-version-status}/spec.md`
- [x] 5.7 config-only → verify: `.agents/skills/nn-template-audit/AUDIT_LOG.md` — cogNNitive+base rows → `FROZEN`; add V_0-3-0 row

## G6 — Final Verification Sweep

- [x] 6.1 `git status -sb` on `refactor/workspace-template-consolidation`, only intended files
- [x] 6.2 `npm --prefix iNNfo test` + `npm --prefix iNNfo run typecheck`
- [x] 6.3 `node scripts/template-catalog.mjs --check`; `node scripts/verify.js`
- [x] 6.4 `validate-manifest.js --channel preview`; `generate-manifest.js --check` both channels
- [x] 6.5 `node scripts/guard-template-immutability.js`
- [x] 6.6 `git diff --exit-code -- iNNfo/specs/templates/cogNNitive iNNfo/specs/templates/base iNNfo/specs/templates/workspace_V_0-1-0_spec_NN.md iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md`

> **G6 note (pre-ship manifest gates)**: `generate-manifest.js --check` passes for both channels and
> `validate-manifest.js` runs clean of rate-limit/network errors, but `validate-manifest` reports
> 2 (preview) / 4 (stable) violations that are **inherent pre-ship states**, not defects:
> (a) the `workspace` entry 404s at the frozen `templates-v0.2.1` tag (V_0-3-0 not yet released there);
> (b) closure rules (`checkClosureViolations`) require `workspace_V_0-3-0_spec_NN` in
> `templates[].name` or in the REMOTE bundled templates of the pinned SKILL.md — both only hold
> after the SKILL.md + V_0-3-0 land on `main` (preview) and a new skills/templates tag is cut
> (stable). This is the design's D3 binding (spec-mandated versioned stem) combined with the
> design's "no manifest-script changes" constraint — no local change can make these pass pre-ship.
> They resolve automatically after merge (preview) and after the next release tags (stable).