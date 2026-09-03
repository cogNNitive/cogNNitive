# Proposal: Codebase Quality Remediation

## Intent

Fix 29 issues found in a comprehensive code analysis: FORMAT spec violations (critical), architecture bugs blocking browser builds (high), missing tests (high), and type safety / pattern issues (medium/low). This is pure remediation — no new features, no architectural rewrites.

## Scope

### In Scope (29 issues, grouped)

| Priority | Issues | Count |
|----------|--------|-------|
| **Critical** | FORMAT spec violations (#1–5) | 5 |
| **High (Architecture)** | Vite browser export crash, Node-only resolver, fake UX in RecentFolders/SampleFolders (#6–8) | 3 |
| **Medium (Architecture)** | Duplicate external URLs (#9) | 1 |
| **High (Quality)** | Sync API over async, missing tests for validator, detector, parser (#10–13) | 4 |
| **Medium (Quality)** | `any` types, broken serializeModel round-trip, Vue anti-patterns, dead code (#14–21) | 8 |
| **Low (Quality)** | Uncancelled setTimeout, history dedup bug, dynamic import, Windows Vite alias, useless assertion, locale inconsistency, unused type, dead markers check (#22–29) | 8 |

### Out of Scope

- File System Access API migration (deferred to future change)
- Architectural rewrites of resolver, validator, or parser
- New features or capabilities
- CI/CD or workflow configuration

## Capabilities

### New Capabilities

None — pure remediation with no new spec-level behavior.

### Modified Capabilities

None — no existing capability requirements change at the spec level.

## Approach

**Short-term (all critical + high):** Fix format model frontmatter/syntax drift, add Vite `resolve.conditions: ['browser']`, fix RecentFolders/SampleFolders to pass arguments, fix `collectDirectoryEntries` to await subdirectory scans.

**Medium-term (quality + medium/low):** Add unit tests for `validateFormatContent`, `scanFolderContents`, `parseYaml`. Replace `any` casts with proper types. Fix `serializeModel` matrix round-trip. Address remaining medium/low items (cancel timeout, history dedup by path, dynamic import hoisting, Vite alias to `path.resolve`, fix locale string, remove dead code).

## Affected Areas

| Area | Impact | Changes |
|------|--------|---------|
| `models/FORMAT_V_0-1-1_business_FORMAT.md` | **Fixed** | Remove inline template block, fix frontmatter close, upgrade syntax to V_0-1-1 |
| `apps/launcher/vite.config.ts` | **Fixed** | Add `resolve.conditions: ['browser']` |
| `apps/launcher/src/utils/detector.ts` | **Fixed** | Await subdirectories in `collectDirectoryEntries` |
| `apps/launcher/src/utils/validator.ts` | **Modified** | Add unit tests |
| `packages/format-core/src/parser.ts` | **Modified** | Add unit tests, replace `any` types |
| `packages/format-core/src/serializer.ts` | **Fixed** | Write matrices in frontmatter |
| `packages/format-core/src/validator.ts` | **Fixed** | Remove dead markers check |
| `apps/launcher/src/components/` | **Fixed** | RecentFolders pass args, deduplicate URLs, remove `defineExpose`, fix `v-for filter` |
| `packages/format-core/src/resolver.ts` | **Noted** | Deferred — no alt browser path added |
| Multiple test files | **New** | Add unit tests for validator, detector, parser, round-trip |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Scope exceeds 800-line budget | High | Prioritize critical/high; defer low if needed; discuss chained PR |
| FORMAT spec changes mis-validate | Medium | Run existing format-core tests after each model change |
| Vite browser condition breaks Node build | Low | Test both `vite build` and `vite build --mode=browser` |

## Rollback Plan

Single PR — revert the entire PR to restore previous state. Each fix is independent, so partial reverts are safe. FORMAT model changes are the riskiest — validate with `format-core` tests before merge.

## Dependencies

- None. All fixes are self-contained within the monorepo.

## Success Criteria

- [ ] `vite build` succeeds in browser mode without `node:fs/promises` crash
- [ ] RecentFolders/SampleFolders pass actual paths to picker
- [ ] `collectDirectoryEntries` returns full depth (subdirectories included)
- [ ] `validateFormatContent` has ≥1 unit test covering valid + invalid input
- [ ] `scanFolderContents` / `collectFiles` have ≥1 unit test each
- [ ] `parseYaml` has ≥1 unit test for valid + malformed YAML
- [ ] `serializeModel` round-trip re-parses successfully (test catches serialization bugs)
- [ ] No `any` type assertions remain in parser.ts or serializer.ts
- [ ] FORMAT model passes spec validation — no `<!-- block: -->` syntax, correct frontmatter close
- [ ] All tests pass (`vitest run`)
