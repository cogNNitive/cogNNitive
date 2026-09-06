# Tasks: Integrity Audit Fixes (2026-09-06)

Source: `nn-dev-check-integrity` full-battery run, 2026-09-06.
Branch: `fix/integrity-audit-blockers`.

## Implemented in this change

### B1 — Single-file MCP bundle
- [ ] `iNNfo/packages/innfo-mcp/tsup.config.ts` — add `splitting: false` to the `bin` config
- [ ] Rebuild `innfo-mcp`; `git rm` `bin/chunk-*.js` + `bin/spec-*.js`; commit the single `bin/innfo-mcp.bundle.js`
- [ ] `scripts/build-docs.mjs` — after the CDN copy, fail the build if the bundle has a `./chunk-*` / `./spec-*` relative import
- [ ] Verify: `npm --prefix iNNfo/packages/innfo-mcp run build` then `grep -c 'from"./chunk' bin/innfo-mcp.bundle.js` == 0
- [ ] Verify: `npm run build:docs` still passes

### B2 — Regenerate distribution manifests
- [ ] `node scripts/manifest/generate-manifest.js --channel stable`
- [ ] `node scripts/manifest/generate-manifest.js --channel preview`
- [ ] Commit `docs/use/manifest.md` + `docs/use/manifest-next.md`
- [ ] `scripts/verify.js` — add `generate-manifest.js --channel stable --check` step
- [ ] Verify: `node scripts/verify.js` passes

### C2 — Taxonomy cycle guard (TDD)
- [ ] Write `tests/taxonomy-serialize-guards.test.ts` cases 1–3 (fail first)
- [ ] `src/parser/taxonomy.ts` — add per-branch `ancestors` guard to `printTaxonomyNode`
- [ ] Verify: new tests green, no diamond-behaviour regression

### C5 — Duplicate `parent:` key (TDD)
- [ ] Add `tests/taxonomy-serialize-guards.test.ts` case 4 (fail first)
- [ ] `src/parser/serializer.ts` — delete the unconditional second `parent:` emit
- [ ] Verify: new test green

### M12 — Signal exit code
- [ ] `scripts/generate-docsify-sidebar.mjs:19` — `result.status !== null ? result.status : 1`

### Change-wide verification
- [ ] `npm --prefix iNNfo/packages/innfo-core test`
- [ ] `npm --prefix iNNfo/packages/innfo-mcp test`
- [ ] `npm --prefix iNNfo/apps/innfo-editor test`
- [ ] `node scripts/verify.js`
- [ ] `npm run build:docs`
- [ ] `npm --prefix iNNfo run lint` (0 errors)
- [ ] Working tree carries only intended changes (no `.atl/skill-registry.md`, no `conversations/`)

## Deferred — separate changes / issues (NOT in this PR)

| Ref | Where | Why deferred |
| :--- | :--- | :--- |
| C1 | `innfo-core/src/parser/markdown.ts` — BOM strips frontmatter | Needs one canonical strip point + broad regression tests across parser/validator/recursiveParser |
| C3 | `innfo-core/src/mutate.ts` — `rename_element` clobbers slug-matching string fields | Needs schema-awareness (which fields are references) before it is safe to change |
| C4 | `innfo-core/src/parser/sections.ts` — `-`/`*` lines dropped from element prose | Parser semantics change; affects round-trip fidelity contract |
| C6 | `innfo-core/src/parser/markdown.ts` — GFM tables need leading+trailing pipes | Table parser rework + fixtures |
| E1 | `innfo-editor` MatricesGrid — cells keyed by name only | Needs node-identity design shared with core diamond/duplicate-name handling |
| E2 | `innfo-editor` useMatrixCells — distribution key not normalized | Rides with E1 |
| E3 | `innfo-editor` GraphViewer — re-renders only on node-count change | Reactivity redesign of the render trigger |
| E4 | `innfo-editor` useGraphRenderer — `Pill` instances never unmounted | Lifecycle redesign; memory-leak fix needs a teardown path |
| E5 | `innfo-editor` Pill — `createObjectURL` never revoked | Rides with E4 / blob-lifecycle change |
| E6 | `innfo-editor` useBlockAssets — module-level blob cache never invalidated | Same blob-lifecycle change |
| E7 | `innfo-editor` useHashSync — `updating` flag cleared before watcher runs | Router-sync state-machine fix, needs its own test harness |
| M1 | `innfo-mcp/src/tools/init-model.ts` — raw interpolation into YAML frontmatter | Needs a YAML-safe emitter; also `init` writes before validate |
| M3 | `innfo-mcp/src/tools/spec-backup.ts` — `zlib.crc32` needs Node ≥ 20.15 | Decide: raise `engines.node` or vendor a crc32 |
| M4 | `innfo-mcp/src/tools/validate.ts` — workspace-scope recursion has no ignore list | Add the shared ignore list used elsewhere in the package |
| **M5** | `innfo-mcp/src/tools/validate.ts` — `sources::` citation can read arbitrary files | **Security.** Clamp the resolved path to the workspace root without breaking legit cross-model `models/…#slug` citations; own review |
| M7 | `scripts/manifest/check-parity.js` — body-scan version fallback matches unrelated `V_x-y-z` | Tighten to frontmatter/filename only |
| M8 | `scripts/verify.js` — Template Inventory Guard also accepts skill/mcp/workflow `name:` values | Scope the regex to the `templates:` block |

## Notes

- The `nn-dev-check-integrity` skill itself (`.agents/skills/nn-dev-check-integrity/`)
  is a separate untracked deliverable from the same session — not part of this change.
- `.atl/skill-registry.md` was already modified in the working tree before this
  session and belongs to another context — do not stage it.
