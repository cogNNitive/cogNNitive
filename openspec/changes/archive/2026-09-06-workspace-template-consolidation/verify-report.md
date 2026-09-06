# Verify Report: Workspace Template Consolidation

- **Change**: `workspace-template-consolidation`
- **Branch**: `refactor/workspace-template-consolidation` @ `f8ce5f2`
- **Mode**: Full (proposal + 5 delta specs + design + tasks)
- **Date**: 2026-09-06
- **Verdict**: **PASS WITH WARNINGS**

## Summary

All implementation tasks (G1–G6) are checked complete and every MODIFIED/ADDED
requirement across the 5 delta specs maps to implemented files with passing
runtime evidence. Frozen/versioned template files are byte-identical (empty git
diff). The only failing gates are the two **documented pre-ship manifest gates**
(`validate-manifest.js` stable/preview closure + 404-at-tag), which fail exactly as
the tasks.md G6 note and design predict and resolve automatically post-merge / post-tag.
They are NOT regressions. One additional environment-only failure (GitHub API rate
limit) cleared once `GITHUB_TOKEN` was supplied.

## Per-Spec Requirement Trace

| Spec | Requirement | File(s) | Evidence |
|---|---|---|---|
| base-composite-template | cogNNitive + base in `frozen` object of catalog.json | `iNNfo/specs/templates/catalog.json` (191–222) | `frozen.base`, `frozen.cogNNitive` present; absent from `templates` (166–189 only `workspace`); `template-catalog.mjs` FROZEN_NAMES (43) routes them to `frozen` (146–150) |
| base-composite-template | frozen templates in `frozen_templates:` of manifest/source.yaml | `manifest/source.yaml` (120–130) | `frozen_templates:` declares cogNNitive (V_0-2-1) + base (V_0-1-0); both dropped from `templates:` (64–114) |
| base-composite-template | verify.js parses both `templates:` and `frozen_templates:` | `scripts/verify.js` (30–43) | `extractDeclaredTemplates` iterates `['templates:','frozen_templates:']`; guard passed (all 11 folders registered) |
| base-composite-template | template-catalog.mjs has FROZEN_NAMES | `scripts/template-catalog.mjs` (43) | `FROZEN_NAMES = ['cogNNitive','base']` |
| base-composite-template | frozen folders accepted by inventory guard | `scripts/verify.js` + `scripts/verify-inventory.test.js` | verify.js guard passed; unit test "Frozen-only folder passed via frozen_templates:" (test run green) |
| base-composite-template | frozen templates get `unlisted` / no upgrade notice | `actioNN/skills/nn-preflight/scripts/upgrade-check.js` (160) | reads only `catalog.templates`; frozen omitted → no upgrade notice; `catalog.json` carries no `unlisted` for them (status comes from absence) |
| workspace-entrypoint | `iNNfo/specs/templates/workspace_spec_NN.md` DELETED | `git status` | ` D iNNfo/specs/templates/workspace_spec_NN.md` |
| workspace-entrypoint | `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` DELETED | `git status` | ` D actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` |
| workspace-entrypoint | workspace_NN.md conformance target = versioned template | `docs/workspace_NN.md` (3–5) | `parent_spec.url` → `.../workspace_V_0-3-0_spec_NN.md` |
| workspace-entrypoint | legacy overview-root precedence untouched | `iNNfo/packages/innfo-core/src/recursiveParser/workspace.ts` | `git diff --stat` empty (no change); overview-root suite passes (iNNfo test suite) |
| workspace-entrypoint | versioned template defines Workspace/Models/Artifacts/Tag concepts | `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md` (36–70) | Workspace (text), Models (model), Artifacts (list), Tag (category) |
| workspace-entrypoint-resolution | manifest `model` workflow binds workspace_V_0-3-0_spec_NN | `manifest/source.yaml` (137) | `template: workspace_V_0-3-0_spec_NN` |
| workspace-entrypoint-resolution | nn-innfo SKILL.md bundled_templates updated | `actioNN/skills/nn-innfo/SKILL.md` (9–11) | `bundled_templates: name workspace_V_0-3-0_spec_NN, path templates/workspace_V_0-3-0_spec_NN.md`; bundled copy present (untracked add) |
| workspace-entrypoint-resolution | hydrate regression pin in spec.spec.ts | `iNNfo/packages/innfo-mcp/src/tools/spec.spec.ts` (212–231) | fixture hydrates `workspace_V_0-3-0_spec_NN`, asserts templateName + target file (passed) |
| workspace-entrypoint-resolution | bare stem `workspace_V_0-3-0` MUST NOT resolve | `resolver-node.ts` (62–70, 165–181) + `spec.spec.ts` | `parseSpecName('workspace_V_0-3-0_spec_NN').version` = `0.3.0.spec`; `matchSpecPath` requires strict equality → bare `0.3.0` never matches `0.3.0.spec`; fixture asserts full stem only |
| workspace-directory-conventions | Artifacts concept canonicalization → workspace_V_0-3-0_spec_NN | `iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md` (31, 60–64) | `Artifacts` concept; spec docs updated (`openspec/specs/workspace-directory-conventions/spec.md`) |
| workspace-directory-conventions | export/ artifacts alias unchanged | `actioNN/skills/nn-trannsform/scripts/lib/provenance-model.js` (404–419) | `exportDir` primary, `legacyArtDir` (`artifacts/`) fallback preserved |
| lineage-version-status | provenance-model.js consts → V_0-3-0 + `_workspace_NN.md` | `provenance-model.js` (4–8, 704) | `TEMPLATE_URL` → workspace_V_0-3-0_spec_NN.md; `TEMPLATE_NAME` = workspace_V_0-3-0_spec_NN; suffix = `_workspace_NN.md`; `INNFO_URL` → iNNfo_V_0-2-1_NN.md; `model_version: "V_0-2-0"` (589) |
| lineage-version-status | discoverModels.ts exclusion matcher | `iNNfo/packages/innfo-core/src/workspace/discoverModels.ts` (34–35, 55) | `/^(cognnitive|workspace)(_|$)/i` non-navigation matcher; returns false in discovery |
| lineage-version-status | workspace-conforming record excluded from reconciliation | `iNNfo/packages/innfo-mcp/src/tools/workspace-sync.spec.ts` (122–126) | test `excludes workspace-conforming lineage records` with `acme_V_0-2-0_workspace_NN.md` (passed) |
| lineage-version-status | cogNNitive + all versioned workspace templates byte-identical | git diff | `git diff --exit-code` on cogNNitive/, base/, and 3 workspace V files = empty (see below) |

## Design Coherence

- **D1** (no folder move; stable URLs; `_spec_` retained going-forward): catalog
  `versionFromFilename` handles flat + package paths; no URL breakage. Conforms.
- **D2** (`_spec_` retained): filenames unchanged; `parseSpecName`/catalog regex
  normalize `_spec_`. Conforms.
- **D3** (wizard + bundle rebind to versioned name): `manifest/source.yaml` workflow
  + skill templates + `SKILL.md` bundled_templates all versioned; spec.spec.ts
  regression guard. Conforms.
- **D4** (frozen partition): `frozen_templates:` + FROZEN_NAMES + verify.js dual
  parse. Conforms.
- **D5** (lineage rebind + discovery exclusion): provenance consts + matcher. Conforms.
- **D6** (parser no change): `recursiveParser/workspace.ts` untouched. Conforms.
- **D7** (editor no functional change): no `workspace/` dir; shipped-template-versions
  passes. Conforms.
- **D8** (no manifest-script code change): check-parity / generate-manifest /
  validate-manifest unchanged (only docs regenerated). Conforms.

## Test Results

| Gate | Result | Notes |
|---|---|---|
| `npm --prefix iNNfo test` | **PASS** | 611 passed, 2 skipped (core→mcp→editor all green) |
| `npm --prefix iNNfo run typecheck` | **PASS** | core build + editor vue-tsc clean |
| `node scripts/template-catalog.mjs --check` | **PASS** | catalog.json up to date (exit 0) |
| `node scripts/verify.js` | **PASS WITH WARNINGS** | All pre-ship gates green (inventory 11 folders, parity 8/10/1, tsc scripts, guard tests); fails ONLY at step 5 stable validate-manifest pre-ship gate (4 violations, see below) |
| `node scripts/guard-template-immutability.js` | **PASS** | no versioned template violations |
| `node scripts/manifest/validate-manifest.js --channel preview` | **PASS WITH WARNINGS** | with GITHUB_TOKEN: exactly 2 documented pre-ship violations (nn-innfo + workflow reference undeclared template) — resolves post-merge; without token: rate-limit noise only |
| `node scripts/manifest/generate-manifest.js --channel stable --check` | **PASS** | docs/use/manifest.md up to date |
| `node scripts/manifest/generate-manifest.js --channel preview --check` | **PASS** | docs/use/manifest-next.md up to date (with token) |
| `node --test actioNN/scripts/skills-manager.test.js` | **PASS** | 1 test file, pass (bundled template sync + bootstrap) |
| `node actioNN/skills/nn-trannsform/test/unit/test-provenance.js` | **PASS** | 38 passed, 0 failed (incl. `_workspace_NN.md` suffix + parent_spec assertions) |
| `git diff --exit-code` on frozen/versioned files | **PASS** | EMPTY (exit 0) |
| Concurrent-session paths zero diff | **PASS** | `hierarchical-submodel-paths/` + `submodelPath.ts` show nothing |

## Frozen-File Byte-Identity Confirmation

```
git diff --exit-code HEAD -- \
  iNNfo/specs/templates/cogNNitive \
  iNNfo/specs/templates/base \
  iNNfo/specs/templates/workspace_V_0-1-0_spec_NN.md \
  iNNfo/specs/templates/workspace_V_0-2-0_spec_NN.md \
  iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md
```
→ **EMPTY** (exit 0). All frozen/versioned template files are byte-identical.
The bundled `actioNN/skills/nn-innfo/templates/workspace_V_0-3-0_spec_NN.md` is the
new canonical copy (untracked add), not a mutation of the canonical file.

## Concurrent-Session Guard

- `openspec/changes/2026-09-06-hierarchical-submodel-paths/` — **zero diff** (untouched).
- `iNNfo/apps/innfo-editor/src/utils/submodelPath.ts` — **zero diff** (untouched).
- Neither staged nor modified by this change.

## Deviations

| # | Severity | Description |
|---|---|---|
| 1 | WARNING (pre-ship, by design) | `validate-manifest.js --channel stable` (via verify.js step 5) reports 4 violations: workspace entry 404s at frozen `templates-v0.2.1` tag (V_0-3-0 not yet released there) + closure rules require `workspace_V_0-3-0_spec_NN` in `templates[].name` or remote bundled templates of pinned SKILL.md — both hold only post-merge (preview) / post-tag (stable). Matches tasks.md G6 note + design D3/D8. Resolves automatically; not a regression. |
| 2 | WARNING (pre-ship, by design) | `validate-manifest.js --channel preview` reports 2 violations (nn-innfo + workflow reference undeclared template) — the design-mandated versioned stem binding vs. "no manifest-script changes" constraint; resolves post-merge when SKILL.md + V_0-3-0 land on main. |
| 3 | INFO (environment) | First preview run hit GitHub API rate limit (HTTP 403/429); cleared with `GITHUB_TOKEN` supplied. No code defect. |

## Correctness Table

| Check | Result |
|---|---|
| Tasks complete (G1–G6) | PASS — all `[x]` |
| All spec requirements map to files + passing tests | PASS |
| Design decisions honored | PASS |
| Frozen byte-identity | PASS |
| No unintended edits to out-of-scope files | PASS |
| Concurrent-path isolation | PASS |

## Issues

- **CRITICAL**: none.
- **WARNING**: the 2 pre-ship manifest gate failures (documented, resolve post-merge/post-tag).
- **SUGGESTION**: none.

## Final Verdict

**PASS WITH WARNINGS** — implementation matches all 5 delta specs, design, and tasks;
all functional/behavioral test suites pass; frozen/versioned templates byte-identical.
The two manifest-gate warnings are inherent pre-ship states explicitly documented in
tasks.md G6 and the design, not implementation defects.
