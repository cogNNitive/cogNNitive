# Design: Remove Template Extensions and Custom Viewers

## Technical Approach

We will completely remove the custom viewers/extensions subsystem across all monorepo tiers. Since standalone console HTML deliverables (`ConsoleHubView.vue`) replace in-editor custom extension views, no fallback layer or deprecation shim is needed.

## Architecture Decisions

### Decision: Direct removal with zero backwards compatibility
- **Choice**: Drop `viewers:` parsing and `TemplateViewer` types completely from `@cognnitive/innfo-core` and `@cognnitive/innfo-editor`.
- **Alternatives considered**: Deprecation warnings or passthrough tolerance.
- **Rationale**: Maintain strict single-way architecture without dead compatibility debt.

### Decision: Removal of `gantt-chart` view route
- **Choice**: Remove `'gantt-chart'` from `ActiveView` in `uiStore.ts` and `VALID_VIEWS` in `useViewSync.ts`.
- **Alternatives considered**: Keeping a placeholder view.
- **Rationale**: Projects and Gantt views are generated as interactive console artifacts (`assets/roadmap_console.html`).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/apps/innfo-editor/src/extensions/registry.ts` | Delete | Obsolete registry |
| `iNNfo/apps/innfo-editor/src/extensions/types.ts` | Delete | Obsolete extension types |
| `iNNfo/apps/innfo-editor/src/extensions/adapters/workspaceAdapter.ts` | Delete | Obsolete adapter |
| `iNNfo/apps/innfo-editor/src/extensions/projects/manifest.json` | Delete | Obsolete extension manifest |
| `iNNfo/apps/innfo-editor/src/extensions/projects/useProjectGantt.ts` | Delete | Obsolete Gantt calculations |
| `iNNfo/apps/innfo-editor/src/components/editor/ProjectGanttView.vue` | Delete | Obsolete Gantt view component |
| `iNNfo/apps/innfo-editor/tests/unit/extensions-registry.test.ts` | Delete | Obsolete unit test |
| `iNNfo/apps/innfo-editor/src/components/editor/ModelInfoPanel.vue` | Modify | Remove extension cards and imports |
| `iNNfo/apps/innfo-editor/src/views/WorkspaceView.vue` | Modify | Remove `gantt-chart` view template |
| `iNNfo/apps/innfo-editor/src/stores/uiStore.ts` | Modify | Remove `gantt-chart` from `ActiveView` |
| `iNNfo/apps/innfo-editor/src/composables/useViewSync.ts` | Modify | Remove `gantt-chart` from `VALID_VIEWS` |
| `iNNfo/packages/innfo-core/src/types/parser.ts` | Modify | Remove `TemplateViewer` interface and `viewers` property |
| `iNNfo/packages/innfo-core/src/parser/yaml.ts` | Modify | Remove `normalizeViewers` function |
| `iNNfo/packages/innfo-core/src/types/index.spec.ts` | Modify | Remove `viewers` test |
| `iNNfo/specs/templates/projects/spec_NN.md` | Modify | Remove `viewers:` frontmatter block |
| `iNNfo/packages/innfo-core/tests/fixtures/simulacro-refactorizacion/templates/projects/spec_NN.md` | Modify | Remove `viewers:` frontmatter block |
| `docs/innfo/template-package-spec.md` | Modify | Remove Semantic View Intent section |
| `docs/innfo/documentation/innfo-editor.md` | Modify | Remove extension registry references |

## Interfaces / Contracts

`SpecFrontmatter` in `@cognnitive/innfo-core`:
```ts
export interface SpecFrontmatter {
  spec_version: string
  spec_url: string
  level: SpecLevel
  parent?: string | ParentRef
  parent_spec?: ParentRef
  includes?: IncludedTemplateRef[]
  procedures?: TemplateProcedure[]
  skills?: TemplateSkill[]
  alias?: AliasMap
  specializes?: string
  title?: string
  description?: string
  author?: string
  status?: string
  concepts?: Concept[]
  markers?: Marker[]
  matrices?: MatrixDecl[]
  relationship_types?: RelationshipTypeDef[]
  relationship_declarations?: Partial<Record<RelationshipType, RelationshipDecl>>
  model_version?: string
  last_updated?: string
  [key: string]: unknown
}
```

`ActiveView` in `@cognnitive/innfo-editor`:
```ts
export type ActiveView =
  | 'editor'
  | 'explorer'
  | 'graph'
  | 'matrices'
  | 'info'
  | 'consoles'
  | 'ai-guide'
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `innfo-core` type tests & parser | `npm run test` in `iNNfo/packages/innfo-core` |
| Unit / Component | `innfo-editor` navigation & stores | `npm run test` in `iNNfo/apps/innfo-editor` |
| Integrity | Monorepo catalogs, specs, and distributions | `node scripts/check-integrity.js` |

## Migration / Rollout

No migration required. Existing models operate with standard consoles.
