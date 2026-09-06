# Tasks: Integrity Audit Fixes (2026-09-06)

Source: `nn-dev-check-integrity` full-battery run, 2026-09-06.
Branch: `fix/integrity-audit-blockers`.

## Implemented in this change

Branch `fix/integrity-audit-blockers`, pushed. Commits: `9640c53` (SDD),
`d7f33b8` (C2/C5), `b510e6c` (B1 tsup), `a083258` (B1 guard + B2 verify + M12),
`647628a` (B2 manifest docs), `b16c976` (nn-dev-check-integrity skill).

### B1 — Single-file MCP bundle
- [x] `iNNfo/packages/innfo-mcp/tsup.config.ts` — `splitting: false` on the `bin` config
- [x] Rebuilt; removed `bin/chunk-TUGFFZUN.js` + `bin/spec-6OLHQBHO.js`; committed the single 500 KB `bin/innfo-mcp.bundle.js`
- [x] `scripts/build-docs.mjs` — guard: fails the build on a `./chunk-*` / `./spec-*` import in the staged bundle
- [x] Verified: rebuilt bundle has 0 chunk imports
- [x] Verified: `npm run build:docs` passes (guard green)

### B2 — Regenerate distribution manifests
- [x] `generate-manifest.js --channel stable` + `--channel preview`
- [x] Committed `docs/use/manifest.md` + `docs/use/manifest-next.md` (nn-innfo V_0-1-2 → V_0-1-3)
- [x] `scripts/verify.js` — added `generate-manifest.js --channel stable --check` (step 6); fixed the duplicate `// 4.` numbering
- [~] `node scripts/verify.js` — **still red at the pre-existing step 5** (`validate-manifest.js`), see below. Step 6 (my addition) passes.

### C2 — Taxonomy cycle guard (TDD)
- [x] `tests/taxonomy-serialize-guards.test.ts` cases 1–3 written (red first)
- [x] `src/parser/taxonomy.ts` — per-branch `ancestors` guard in `printTaxonomyNode`
- [x] Green; diamond case (2) confirms shared-child rendering unchanged

### C5 — Duplicate `parent:` key (TDD)
- [x] `tests/taxonomy-serialize-guards.test.ts` case 4 (red first)
- [x] `src/parser/serializer.ts` — removed the unconditional second `parent:` emit
- [x] Green

### M12 — Signal exit code
- [x] `scripts/generate-docsify-sidebar.mjs` — `result.status !== null ? result.status : 1`

### Change-wide verification
- [x] `innfo-core` tests — 398 pass (+4 new)
- [x] `innfo-mcp` tests — 168 pass
- [x] `innfo-editor` tests — 595 pass (2 pre-existing skips)
- [~] `node scripts/verify.js` — red at pre-existing step 5 only (see Blocker below)
- [x] `npm run build:docs` — passes
- [x] `npm --prefix iNNfo run lint` — 0 errors (477 → 475 warnings)
- [x] Prettier (CI mirror, changed `iNNfo/` files) — clean
- [x] Working tree carries only intended changes; `.atl/skill-registry.md` + `conversations/` left untouched

## Blocker — needs a release action (not in this change's authority)

`scripts/verify.js` step 5 (`validate-manifest.js --channel stable`, pre-existing)
fails: `manifest/source.yaml` declares `nn-innfo` `V_0-1-3` but
`channels.stable.refs` pins tag `skills-v1.1.3` (`b9c58f9`) whose tree has the
skill at `V_0-1-2`. Latent on `main` since `e7cbe6e`; CI green there was GitHub
raw caching (the check is non-deterministic).

To clear (all 7 skill versions at `deefc86` already match `source.yaml`):
```
git tag skills-v1.1.4 deefc86
git push origin skills-v1.1.4          # <- tag push blocked for the agent
# then, on this branch:
#   manifest/source.yaml channels.stable.refs: skills-v1.1.3 -> skills-v1.1.4
#   node scripts/manifest/generate-manifest.js --channel stable
#   node scripts/manifest/generate-manifest.js --channel preview
#   node scripts/verify.js   # -> green
```

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
