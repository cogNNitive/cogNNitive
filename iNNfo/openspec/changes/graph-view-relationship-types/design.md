# Design: Graph View with All Relationship Types

## Technical Approach

Extend `normalizeElementsIntoGraph` (innfo-core) with a post-matrix pass in a new `recursiveParser/relationships.ts`: scan template `reference` fields and inline `[[...]]` wikilinks in field values (→ `origin: 'field'`) and in element/root descriptions (→ `origin: 'mention'`), resolving targets case-insensitively against a model-wide lowercase element-name index. `ModelRelationship` gains required `origin`; all in-repo construction sites updated. Editor keeps consuming `relationships`; `useGraphData` maps origin → color/line style; GraphViewer adds a legend. No persisted data → no migration.

## Architecture Decisions

| # | Decision | Choice | Alternatives | Rationale |
|---|----------|--------|--------------|-----------|
| D1 | `origin` shape | Required `origin: RelationshipOrigin` on `ModelRelationship`; `type RelationshipOrigin = 'matrix'\|'field'\|'mention'\|'graph_edge'` in `types.ts` | Optional w/ default | R1: none without one. Only 2 non-empty construction sites (normalize.ts L149, model.ts L95) + 1 test file (BlockRelationships.test.ts L7); all `relationships: []` literals are empty arrays → unaffected. Derived in-memory, never serialized |
| D2 | Edge construction | New `recursiveParser/relationships.ts`, called from `normalize.ts` after matrix loop (L152) | Inline in normalize.ts | Keeps normalize.ts readable; helpers unit-testable standalone |
| D3 | Resolution (R5) | Lowercase index `Map<lower, qualifiedId>` built once from `qualifiedIdByElementName` after the element loop; O(1) lookup | Per-target linear scan | First-registered-wins (R11) preserved: duplicate elements throw before index insert |
| D4 | Field edges (R3) | For each element: (a) fields whose template def (via `extractTemplateSchema(parsed).concepts`) is `reference`-typed → wikilink extraction, else bare trimmed value as candidate target; (b) `[[...]]` in ANY string field value → wikilink extraction. Label = field name, no `value` | Reference-typed only | Matches docs `campo:: [[target]]` + current editor regex (useNodeConnections L153-167) |
| D5 | Mention sources (R4) | Elements: `el.description`. Root: `parsed.rawSections?.['description']` ONLY — never `rawContent` (whole file → spurious edges from matrices/index) | Spec-text "rawContent" | Deliberate refinement of spec wording; root description section convention is rare — safe default |
| D6 | Regex (R6/R7) | Shared `WIKILINK_RE = /\[\[(.*?)\]\]/g`; `extractWikilinkTargets` trims, drops empty | New regex per site | Non-greedy: `[[see [[Alpha]] here]]` → target `see [[Alpha` unmatched → warning, no crash; `[[]]`/`[[  ]]` skipped silently, no issue |
| D7 | Dangling (R6) | Skip edge + push `{ path: \`${sourcePath}#${el.name}\`, message, severity: 'warning' }` | Hard error | Non-fatal per spec |
| D8 | ParseIssue severity | Optional `severity?: 'info'\|'warning'\|'error'`; absent = today's behavior | Required field | Additive-safe: ValidationReport.vue hard-codes 'warning' per issue (L109); Header counts length; workspaceStore uses issues only in empty-folder path. Optionally respect it: `severity: issue.severity ?? 'warning'` (behavior-preserving) |
| D9 | Dedup (R8) | Per-node, per-origin `Set` at construction, key `targetId\|label\|origin\|String(value ?? '')`; only new field/mention edges deduped | Whole-array post-pass | Matrix edges never touched (N2); parallel origins kept (origin in key); `tags:: [[X]] and [[X]]` → 1 edge |
| D10 | graph_edges (R9) | `origin: 'graph_edge'` on model.ts L95 push; label/value unchanged | — | One-line tag |
| D11 | Editor (R10) | `GEdge.origin`; `ORIGIN_COLORS` map; renderer dasharray per origin; legend in GraphViewer header | Filter per origin | useGraphData stays sole renderer (N4); colors: matrix `#3b82f6` solid, field `#22c55e` solid, mention `#f59e0b` dashed `6,4`, graph_edge `#a855f7` dotted `2,3` |
| D12 | Root field pass | Root excluded from field pass (root.fields = frontmatter metadata) | Include root | Avoids speculative edges from frontmatter strings |

## Data Flow

    parseModel → normalizeSingleModel (model.ts)
      ├─ rootNode.relationships ← graph_edges (origin 'graph_edge')
      └─ normalizeElementsIntoGraph (normalize.ts)
           ├─ element nodes (relationships: [])
           ├─ matrix loop → origin 'matrix'  (set unchanged)
           ├─ addFieldAndMentionEdges (relationships.ts, NEW)
           │    ├─ lowerNameIndex = buildLowerNameIndex(qualifiedIdByElementName)
           │    ├─ reference/[[..]] field values → origin 'field'
           │    ├─ el.description / root rawSections.description → origin 'mention'
           │    └─ per-origin dedup sets; unmatched → warning issue
           └─ ctx.nodes → modelStore → useGraphData (origin→color) → GraphViewer (+legend)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `packages/innfo-core/src/types.ts` | Modify | Add `RelationshipOrigin`; required `origin` on `ModelRelationship` (auto-exported via `export * from './types'`) |
| `packages/innfo-core/src/recursiveParser/types.ts` | Modify | Optional `severity` on `ParseIssue` |
| `packages/innfo-core/src/recursiveParser/relationships.ts` | Create | Regex, extractWikilinkTargets, buildLowerNameIndex, addFieldAndMentionEdges, dedup |
| `packages/innfo-core/src/recursiveParser/normalize.ts` | Modify | `origin: 'matrix'` (L149); call new pass after matrix loop |
| `packages/innfo-core/src/recursiveParser/model.ts` | Modify | `origin: 'graph_edge'` (L95) |
| `packages/innfo-core/tests/relationship-edges.test.ts` | Create | R1–R11 unit scenarios (inline models — existing core test style) |
| `apps/innfo-editor/src/components/editor/composables/useGraphData.ts` | Modify | `GEdge.origin`; `ORIGIN_COLORS` |
| `apps/innfo-editor/src/components/editor/composables/useGraphRenderer.ts` | Modify | Dasharray per origin (sankey path L262-284 + force line L419-426) |
| `apps/innfo-editor/src/components/editor/GraphViewer.vue` | Modify | Legend: 4 entries (color swatch + icon + label), header row |
| `apps/innfo-editor/src/components/ValidationReport.vue` | Modify | `severity: issue.severity ?? 'warning'` (preserving) |
| `apps/innfo-editor/tests/unit/useGraphData.test.ts` | Create | Origin → GEdge color assertions |
| `apps/innfo-editor/tests/component/BlockRelationships.test.ts` | Modify | Add `origin` to 3 rel literals |

## Interfaces / Contracts

```ts
// types.ts
export type RelationshipOrigin = 'matrix' | 'field' | 'mention' | 'graph_edge'
export interface ModelRelationship { targetId: string; label: string; value?: string | number; origin: RelationshipOrigin }

// recursiveParser/types.ts
export interface ParseIssue { path: string; message: string; severity?: 'info' | 'warning' | 'error' }

// recursiveParser/relationships.ts (new)
export const WIKILINK_RE: RegExp                                    // /\[\[(.*?)\]\]/g
export function extractWikilinkTargets(text: string): string[]      // trim + drop empty (R7)
export function buildLowerNameIndex(ids: Map<string, string>): Map<string, string>
export function addFieldAndMentionEdges(parsed: ParsedModel, rootId: string, sourcePath: string, ctx: ParseContext): void

// useGraphData.ts
export interface GEdge { source: string; target: string; label: string; type: string; color: string; origin: RelationshipOrigin }
export const ORIGIN_COLORS: Record<RelationshipOrigin, string>
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit (core) | R1 all origins tagged; R2 matrix set unchanged + origin; R3 ref-typed + inline field edges; R4 mention from el.description + root rawSections.description (not rawContent); R5 case-insensitive + prose false positive; R6 dangling + nested-bracket warning with path `${source}#${el}`; R7 empty skipped silently; R8 dedup + parallel origins; R9 graph_edge; R11 collision first-wins | `normalizeSingleModel`/`recursiveParse` inline models in `relationship-edges.test.ts`; assert `relationships[]` contents + `issues` severity/path |
| Unit (editor) | R10 each origin → distinct GEdge color; legend lists four | Mock modelStore nodes w/ 4-origin relationships; assert `allEdges` origin/color; GraphViewer legend entry assertions |
| Regression | Existing suites stay green; BlockConnections/BlockSheet unaffected structurally (N3) | Updated BlockRelationships literals; full `npm run test` + typecheck + lint + format |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration — `origin` and new edges are derived at parse time, in-memory only. Rollback = revert PR (graph returns to matrix-only; `useNodeConnections.ts` untouched).

## Risks

| Risk | Mitigation |
|------|-----------|
| Required `origin` breaks external consumers of `ModelRelationship` | All in-repo non-empty literals updated in same change; additive type for `severity`; derived data, no persisted payload |
| BlockConnections `directRelationships` (L396-409) grows with new field/mention edges (they match no matrix) | Acceptable additive UI change; verify no test asserts exact counts; origin-filtering is follow-up (N3 keeps composable untouched) |
| Existing parsed fixtures (Ghostbusters etc.) contain `[[...]]` → new mention/field edges | Verify no editor test asserts exact `relationships` lengths (grep: none found); graph renders more edges by design |
| Root mention source may never trigger (no `description` rawSection convention) | Safe default; documented in Open Questions |

## Open Questions

- [ ] Confirm no model defines a body section whose `rawSections` key is `description` (root mention edges may be rare).
- [ ] Verify at apply-time that fixture-driven editor tests unaffected by new edges (graph count, ValidationReport virtual checks).
