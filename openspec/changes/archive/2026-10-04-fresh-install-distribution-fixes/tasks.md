# Tasks: Fresh-Install Distribution Fixes

> Scope rule (maintainer): fresh install of the latest version only. No legacy,
> migration, or compat branches. All four findings (F1-F4) landed before this
> tasks file was written (the change was proposed without one); this file records
> the completed work for archival.

## 1. F1 — Bundle the skills-manager engine into the skill

- [x] 1.1 Add `scripts/build-skills-manager-bundle.mjs` (esbuild, committed artifact) producing `skills/nn-skills-lifecycle/scripts/skills-manager.js`.
- [x] 1.2 Wire the drift/self-containment gate into `scripts/verify.js` (steps `skills-manager-bundle` + the distributed-skill `node scripts/<file>` guard).
- [x] 1.3 Fix `nn-skills-lifecycle/SKILL.md` paths; mark `sync`/Maintenance as maintainer-only.

## 2. F2 — Remove hardcoded versioned spec URLs from `nn-innfo`

- [x] 2.1 Delete the URL list and `(V_0-2-0)` labels; delegate to MCP `get_spec` / `get_blueprint` and `parent_spec.url`.
- [x] 2.2 Confirm `nn-innfo/SKILL.md` contains no `_V_x-y-z_NN.md` spec URL (0 hits).

## 3. F3 — Make the guidance-section warning actionable

- [x] 3.1 Emit the warning with `code: 'PARENT_CONCEPT_GUIDANCE_INCOMPLETE'` + `promptHint` naming the 4 required H3s.
- [x] 3.2 Add/update the regression test (`knowledge-checks.spec.ts`).
- [x] 3.3 Rebuild the committed `innfo-mcp.bundle.js`; run `sync-versions`.

## 4. F4 — Report the manifest source in preflight

- [x] 4.1 Add `results.manifest.source` (primary / fallback / override) to JSON and one text line; keep the primary error when fallback is used. Exit code unchanged.

## 5. Validation

- [x] 5.1 `node scripts/skills-manager.js status` runs from an installed `nn-skills-lifecycle` folder with no repo checkout.
- [x] 5.2 `verify.js` fails on a stale skills-manager bundle and on a missing `scripts/` file referenced by a distributed `SKILL.md`; main CI green.
