# Tasks: Address Prefix Unification & Query Exclusivity Lifting

## 1. Citation Parser Prefix Alignment (`sourceRef.ts`)
- [ ] 1.1 Add unit tests in `sourceRef.unit.spec.ts` for `parseKnowledgeUnitRef` testing unprefixed `risk-matrix` as element and `concept:x` / `matrix:x` as section/matrix.
- [ ] 1.2 Update `parseKnowledgeUnitRef` in `sourceRef.ts` to inspect `concept:` and `matrix:` prefixes and remove `^matrix-|-matrix$` regex.
- [ ] 1.3 Verify existing citation tests and workspace resolver tests pass.

## 2. Concept Scoping in Query Engine (`queryUnits.ts`)
- [ ] 2.1 Add unit tests in `queryUnits.test.ts` for parsing queries containing `@concept:<slug>?...` and rejecting `@<elementSlug>?...`.
- [ ] 2.2 Update `parseKnowledgeQuery` to support concept targets and extract `conceptSlug`.
- [ ] 2.3 Update `runMarkdownQuery` to filter elements matching the requested `conceptSlug`.
- [ ] 2.4 Verify all `queryUnits` tests pass.

## 3. Specification & Verification
- [ ] 3.1 Update `openspec/specs/knowledge-unit-address/spec.md` with prefix parity and query scoping requirements.
- [ ] 3.2 Run `npm run verify:fast` to confirm full integration integrity.
