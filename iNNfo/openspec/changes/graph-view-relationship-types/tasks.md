# Tasks: Graph View with All Relationship Types

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600–650 (new tests dominate: ~300 core + ~150 editor) |
| 400-line budget risk | High (exceeds default 400 guard) |
| Chained PRs recommended | No (within project 800-line budget) |
| Suggested split | Single PR; optional PR 1 core → PR 2 editor |
| Delivery strategy | single-pr-default |
| Chain strategy | pending |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: High

Budget (AGENTS.md) = 800; estimate ≈75–80% → single PR, no `size:exception`. Optional sub-400 split.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| 1 | core types + pass + tests | PR 1 | `npm --prefix packages/innfo-core test` | N/A — pure helpers; unit tests are runtime | revert core files |
| 2 | editor styling + legend + severity + tests | PR 2 | `npm --prefix apps/innfo-editor test` | Vitest + @vue/test-utils mounts | revert editor files |

## Phase 1: innfo-core

- [ ] 1.1 RED — write `packages/innfo-core/tests/relationship-edges.test.ts` (R1–R9, R11): origins tagged; matrix/field/mention/graph_edge; case-insensitive; dangling + nested `${source}#${el}`; empty skipped; dedup + parallel; collision. Fails: origin missing.
- [ ] 1.2 GREEN — `packages/innfo-core/src/types.ts`: `RelationshipOrigin` + required `origin` on `ModelRelationship`.
- [ ] 1.3 GREEN — `packages/innfo-core/src/recursiveParser/types.ts`: optional `severity?: 'info'\|'warning'\|'error'` on `ParseIssue`.
- [ ] 1.4 GREEN — create `packages/innfo-core/src/recursiveParser/relationships.ts`: `WIKILINK_RE`, `extractWikilinkTargets`, `buildLowerNameIndex`, `addFieldAndMentionEdges` (ref + `[[..]]` fields → field; descriptions → mention; per-origin dedup; dangling warnings).
- [ ] 1.5 GREEN — `packages/innfo-core/src/recursiveParser/normalize.ts`: `origin: 'matrix'` (L149); call `addFieldAndMentionEdges` after matrix loop (L152).
- [ ] 1.6 GREEN — `packages/innfo-core/src/recursiveParser/model.ts`: `origin: 'graph_edge'` (L95).
- [ ] 1.7 VERIFY — `npm --prefix packages/innfo-core test`; root `npm run typecheck` + `npm run lint` + `npm run format:check`.

## Phase 2: innfo-editor

- [ ] 2.1 RED — write `apps/innfo-editor/tests/unit/useGraphData.test.ts` (R10): mock 4-origin nodes → distinct origin/color; GraphViewer legend lists four.
- [ ] 2.2 GREEN — `apps/innfo-editor/src/components/editor/composables/useGraphData.ts`: `GEdge.origin`, `ORIGIN_COLORS` (#3b82f6/#22c55e/#f59e0b/#a855f7), map `rel.origin`.
- [ ] 2.3 GREEN — `apps/innfo-editor/src/components/editor/composables/useGraphRenderer.ts`: dasharray per origin (sankey L271–284; force L419–426): solid/solid/dashed `6,4`/dotted `2,3`.
- [ ] 2.4 GREEN — `apps/innfo-editor/src/components/editor/GraphViewer.vue`: 4-entry legend (swatch + icon + label) in header row.
- [ ] 2.5 GREEN — add `origin` to non-empty literals: `apps/innfo-editor/tests/component/BlockRelationships.test.ts` (3 rels) + `apps/innfo-editor/tests/component/BlockSheet.test.ts` L65 (1 rel — missed by design; else typecheck breaks).
- [ ] 2.6 RED→GREEN — extend `apps/innfo-editor/tests/component/ValidationReport.test.ts` with severity-passthrough assertion; then `apps/innfo-editor/src/components/ValidationReport.vue` L109: `issue.severity ?? 'warning'`.
- [ ] 2.7 VERIFY — `npm --prefix apps/innfo-editor test`; root typecheck/lint/format.

## Phase 3: Full verification

- [ ] 3.1 `npm run test` — all workspaces green.
- [ ] 3.2 `npm run typecheck` green.
- [ ] 3.3 `npm run lint` + `npm run format:check` green.

## Dependency Notes

- Phase 1 before Phase 2 (editor consumes core `RelationshipOrigin`; typecheck builds core first).
- 1.1 stays RED until 1.4/1.5 land.
- 2.5 lands with 2.2 — required `origin` breaks editor typecheck otherwise.
- 2.6 parallel-safe; Phase 3 after Phases 1–2 green.
