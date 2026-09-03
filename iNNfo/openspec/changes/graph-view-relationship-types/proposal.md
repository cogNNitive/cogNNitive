# Proposal: Graph View with All Relationship Types

## Intent

The graph view renders only **matrix** (structural) relationships. The docs taxonomy (`docs/documentation/relationships.md`) defines **3 levels**: Structural (matrix), Attribute (reference field), Contextual (mention/wikilink). The editor already detects levels 2–3 in `apps/innfo-editor/src/composables/useNodeConnections.ts` (`fieldConnections`, `mentionConnections`) for the BlockConnections panel, and core already models `reference` fields (`packages/innfo-core/src/validator/references.ts`), but the graph's single edge source (`useGraphData.ts` → `node.relationships[]`) is populated ONLY from matrices in `normalize.ts` (lines 144–152). The `ModelRelationship` type (`types.ts` L280–284: `{ targetId, label, value? }`) carries no origin/level, so the taxonomy is unreachable by any consumer. Fix at the core so all consumers (graph, BlockConnections, validators) share one source of truth. Bounded to the iNNfo model/template spec V_0-1-0.

## Scope

### In Scope
- Core: emit **field** and **mention** edges into `node.relationships[]` in `normalize.ts`, with an `origin` discriminator.
- Core: add `origin` to `ModelRelationship`; tag `graph_edges` edges too.
- Core: wikilink `[[...]]` resolution (element name → qualifiedId) model-wide + dangling-wikilink policy.
- Editor: graph renders all origins (visual distinction per level, e.g. `LayoutGrid`/`Tag`/`FileText`); `useGraphData.ts` stays the renderer.

### Out of Scope (non-goals)
- Do NOT change the docs taxonomy (3 levels, icons, directionality stay as documented).
- Do NOT change matrix behavior (matrix edges unchanged, still emitted, now `origin: 'matrix'`).
- No relationship editor UI, no cross-file/workspace link resolution.
- No removal/refactor of `useNodeConnections.ts`/BlockConnections (stays as-is this change; consolidation is follow-up).

## Capabilities

> Contract with sdd-spec. No existing spec covers relationships — new capability.

### New Capabilities
- `relationship-types`: model-wide relationship edges carrying an `origin` (`matrix` | `field` | `mention` | `graph_edge`), constructed in innfo-core, rendered by the editor graph with per-level distinction.

### Modified Capabilities
- None.

## Approach

Core-first: extend `normalizeElementsIntoGraph` post-matrix pass to also scan (a) template-declared `reference` fields and inline `[[...]]` in field values (matches docs: `campo:: [[target]]` or `reference`-typed), and (b) wikilinks in `rawSections.description`/`rawContent`, resolving via the existing `qualifiedIdByElementName` map. `origin` is a **required** field on `ModelRelationship` (3 construction sites: element init, matrix loop, `graph_edges` in `model.ts` — all updated in-repo; relationships are derived in-memory, not persisted, so no serialization break). `useGraphData.ts` keeps consuming `relationships` unchanged; only styling/legend gains origin awareness.

| Decision | Recommendation |
|---|---|
| Where edges built | Core (`normalize.ts`) — user-chosen; graph + BlockConnections + validators share one source |
| `ModelRelationship` shape | Add required `origin: 'matrix' \| 'field' \| 'mention' \| 'graph_edge'`; update all literals/fixtures in same change |
| Wikilink resolution | Element name → qualifiedId via existing map; dangling links skipped with parse issue (non-fatal) |
| Reference fields | Both `reference`-typed fields AND inline `[[...]]` in any string field value (matches editor regex today + docs) |
| Dedup | Keep parallel edges per distinct origin; dedupe exact duplicates (same targetId+label+origin+value) |
| BlockConnections | Stays as-is; follow-up: re-derive from `relationships` filtered by origin |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `packages/innfo-core/src/types.ts` | Modified | `ModelRelationship.origin` added (L280) |
| `packages/innfo-core/src/recursiveParser/normalize.ts` | Modified | Field + mention edge construction (L142–152) |
| `packages/innfo-core/src/recursiveParser/model.ts` | Modified | `graph_edges` tagged with origin (L87–101) |
| `apps/innfo-editor/src/components/editor/composables/useGraphData.ts` | Modified | Origin-aware styling/legend (L124–149) |
| Tests/fixtures (both packages) | Modified | New fixtures with all 3 levels; existing updated for `origin` |

## Open Questions / Assumptions

- **Reference typing**: assume both `reference`-typed fields and inline `[[...]]` in string values count as Attribute edges — confirm no false positives on prose-like field text.
- **Parallel edges**: assume per-origin parallel edges are wanted (semantic distinction), clutter handled by styling not dedup.
- **Dangling wikilinks**: assumed skipped + surfaced as parse issue, not hard error.
- **`graph_edge` origin**: assumed `graph_edges` maps to its own origin rather than `matrix` (explicit authoring). Confirm.
- **Element-name collisions**: resolution follows existing `qualifiedIdByElementName` last-wins behavior; document, don't fix, this change.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Required `origin` field breaks public core type consumers | Med | Update all construction sites + fixtures in same change; derived data, no persisted payload |
| Wikilink resolution noise (collisions, prose matches) | Med | Reuse existing resolution map; strict dedup; fixture-driven tests |
| Graph clutter from tripled edges | Med | Per-origin styling + legend; dedup exact duplicates |
| Regex-on-field false positives | Low | Field edges limited to `reference` fields + valid `[[name]]` resolved against element names |

## Rollback Plan

Revert the change PR/commit. `origin` and new edges are derived in-memory at parse time — no migration, no persisted state. Graph returns to matrix-only edges automatically. `useNodeConnections.ts` untouched, so BlockConnections panel unaffected either way.

## Dependencies

- Existing `qualifiedIdByElementName` map and template schema extraction in `normalize.ts` (no new deps).

## Success Criteria

- [ ] Fixture model with all 3 levels yields edges with correct `origin` on every relationship
- [ ] Matrix behavior unchanged (matrix edges still emitted, `origin: 'matrix'`)
- [ ] Dangling wikilink/`[[name]]` without match: skipped, no parser crash
- [ ] Graph view renders all 3 origin types with distinct visual treatment
- [ ] `npm run test`, `typecheck`, `lint`, `format` pass
