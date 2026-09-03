# Proposal: defiNNe-v0-1-1-patch

## Intent

Rename `parent` → `parent_spec` in frontmatter across specs + code, bump defiNNe to V_0-1-1, and add missing sections (Migration, Superseded Specs, compliance README). Eliminates ambiguity between generic parent refs and the spec parent chain.

## Scope

### In Scope
1. New `specs/defiNNe_V_0-1-1_F.md` — PATCH bump, `_F.md` suffix, `parent_spec`, Migration + Superseded sections
2. `specs/FORMAT_V_0-1-5_F.md` — all `parent:` → `parent_spec:` in templates + examples
3. Deprecation notices on `FORMAT_V_0-1-4_FORMAT.md` and `FORMAT_V_0-1-2_FORMAT.md`
4. `business_V_0-1-1_FORMAT.md`, `procedures_V_0-1-1_FORMAT.md`, `catalog_V_0-1-2_FORMAT.md` — frontmatter + examples
5. `packages/format-core/src/resolver.ts` — `fm.parent` → `fm.parent_spec`
6. `packages/format-core/src/types.ts` — `SpecFrontmatter.parent` → `parent_spec`
7. New `apps/format-editor/docs/compliance/README.md`

### Out of Scope
- `ParentRef` interface name (semantically correct)
- `parentOf`, `parentId`, `TaxonomyEdge.parent` (structural tree refs, not spec chain)
- Sample models (`Ghostbusters`, `CodeReviewProcess`, `Music_History`) — updated when templates bump
- `_F.md` suffix for any file except defiNNe V_0-1-1

## Capabilities

None — notation rename, no spec-level behavior change. `parent_spec` keeps `{name, url}` semantics identical to `parent`.

## Approach

Dependency order: types → resolver → defiNNe → FORMAT → templates → deprecation notices → compliance. Code first so it compiles, then docs.

## Affected Areas

| File | Change |
|------|--------|
| `specs/defiNNe_V_0-1-0_FORMAT.md` | Copied as source for V_0-1-1 |
| `specs/FORMAT_V_0-1-5_F.md` | All `parent` → `parent_spec` |
| `specs/FORMAT_V_0-1-4_FORMAT.md` | Deprecation notice |
| `specs/FORMAT_V_0-1-2_FORMAT.md` | Deprecation notice |
| `specs/business_V_0-1-1_FORMAT.md` | Frontmatter + examples |
| `specs/procedures_V_0-1-1_FORMAT.md` | Frontmatter + examples |
| `specs/catalog_V_0-1-2_FORMAT.md` | Frontmatter + examples |
| `packages/format-core/src/types.ts` | Field rename |
| `packages/format-core/src/resolver.ts` | Accessor update |
| `apps/format-editor/docs/compliance/README.md` | New file |

**~11 files** (1 new, 10 modified)

## Risks

- **Missed refs in parser.ts/validator.ts** (Med) — grep `fm.parent` across all `packages/format-core/` post-change; also check `serializeModel` in parser.ts which writes `parent:`
- **Template urls reference old FORMAT** (Low) — preserved as-is, parent_spec.url doesn't change
- **Samples out of sync** (Low) — deferred to template bump

## Rollback

`git checkout` on 10 modified files; delete new files. Source-level rename — no runtime migration.

## Success Criteria

- [ ] `specs/defiNNe_V_0-1-1_F.md` exists with V_0-1-1, `_F.md` suffix, `parent_spec`, Migration + Superseded sections
- [ ] No spec/template file contains `parent:` as a frontmatter field name
- [ ] `fm.parent` references in resolver.ts and types.ts fully replaced
- [ ] `tsc` passes in `packages/format-core/`
- [ ] Old FORMAT specs show `> [!NOTE]` deprecations to V_0-1-5
