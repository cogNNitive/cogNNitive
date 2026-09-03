# Design: Refactor Editor God Components

## Technical Approach

Pure structural extraction into the two conventions this repo already uses: **concern-based
folder splits** in `packages/innfo-core` (precedent: `src/parser/` imported as `from './parser'`)
and **composables** in `apps/innfo-editor` (precedent: `src/composables/useFileSystem.ts`,
`src/components/editor/composables/useGraphData.ts`). Nothing new is invented.

Two invariants govern every unit:

1. **Barrel transparency** — `packages/innfo-core/src/index.ts:43` (`export * from './recursiveParser'`)
   and `src/browser.ts:31-38` (named re-exports) stay byte-identical.
2. **Tests pass unmodified** — extraction is a move, not a rewrite. Deviations are listed
   explicitly below and pinned with *new* tests.

## Architecture Decisions

### Decision: ModelInfoPanel frontmatter — adopt `innfo-core`'s `parseFrontmatter`

**Choice**: Replace `extractFrontmatterField` / `extractNestedFieldValue` / `parseVersionString`
with `parseFrontmatter` inside `useModelFrontmatter.ts`, behind a local `readString()` coercion
adapter. `parseVersionString` is kept (it parses `V_M-m-p`, which is not frontmatter parsing).

**Verified signature** (`packages/innfo-core/src/parser/yaml.ts:96`):

```ts
export function parseFrontmatter(content: string): SpecFrontmatter | null
// SpecFrontmatter (types.ts:65) has `[key: string]: unknown` → template/version/last_saved reachable
```

Not a literal drop-in. Verified deltas vs. today's regex:

| Aspect | Regex today | `parseFrontmatter` | Handling |
|---|---|---|---|
| Value type | always `string` | YAML-typed (`number`/`boolean` for unquoted scalars) | `readString(v)` adapter coerces |
| CRLF | tolerated only via `.trim()` | `normalizeSource()` normalizes first | strict improvement |
| Nested `template.version` | `extractNestedFieldValue` regex `^block:\s*\n\s+field:` only matches the **first** key of the block | reads any key | strictly widening; pinned by new test |
| `parent:` → `parent_spec:` | read as separate fallbacks | folded by `parseFrontmatter` | same result; fallback chain collapses |
| `matrices params/widget` | untouched | normalized on the returned object | unread by this panel |

**Alternatives considered**: (a) relocate the regex verbatim into the composable — zero risk but
keeps the layer violation that `docs/code-quality-review-guide.md` §3.1 flags; (b) fix the regex
in place — keeps two parsers.

**Rationale**: The app **already** imports `parseFrontmatter` from `@cognnitive/innfo-core` in
`SetupWizard.vue:9` and `composables/useConceptVisuals.ts:20` — this is the established layering,
not a new dependency. All three fixtures in `tests/component/ModelInfoPanel-version.test.ts`
(`spec_version`, `model_version`, `parent_spec.name` as first block key) are quoted strings and
produce identical output, so that suite passes unmodified. The two deltas are strictly *widening*
(more valid YAML accepted, never less), so they cannot regress a currently-working model.

### Decision: `__matrix_defs` helper is parameterized, not unified into one algorithm

The 7 call sites are **not** equivalent. `LeftSidebar.vue:657` uses a *fallback* strategy
(`__matrix_defs`, else normalized `matrices`); `MatricesGrid.vue:425` uses a *merge* strategy
(both sources, deduped by name, always normalized). Collapsing them into one function would be a
behavior change. The shared module therefore exports both strategies over shared primitives.

**Alternative rejected**: single `getMatrixDefs()` — silently changes LeftSidebar's Relations list.

### Decision: `getConceptMeta` lands in the existing `useConceptVisuals.ts`, not a new file

`getConceptMeta(name)` resolves only `root.localMetamodel.concepts`; `useConceptVisuals`'
`getConceptForNode(node)` walks the effective-metamodel ancestor chain. Different resolution, same
concern. Adding a named export keeps one home for concept visuals without changing either
algorithm. (`MatrixPill.vue:154` holds a **third** near-copy with a `string | undefined` parameter —
it is a follow-up, not in this change's scope.)

### Decision: folder-barrel resolution needs no build change

`packages/innfo-core` builds with plain `tsc` (`module: ESNext`, `moduleResolution: bundler`) and
already imports `./parser` — a directory barrel — from `index.ts:17`, `browser.ts:13`,
`schema.ts:2`, `driver-unified.ts:3`. `recursiveParser/` resolves identically. No `package.json`,
`tsconfig`, or Vite config edit is required.

## Component Map

### 1. `packages/innfo-core/src/recursiveParser/`

Public surface that MUST survive unchanged (consumed by `index.ts`, `browser.ts`,
`tests/recursive-parser.test.ts:3`, and `tests/index.test.ts` dynamic `import('../src/recursiveParser')`):

| Symbol | Current line | New home |
|---|---|---|
| `resolveGraphEdgeTarget(target, sourcePath): string` | `:27` | `paths.ts` |
| `resolveQualifiedIdToPath(qualifiedId, sourcePath): string` | `:48` | `paths.ts` |
| `interface ParseIssue` | `:69` | `types.ts` (internal) → re-exported |
| `interface RecursiveParseResult` | `:74` | `types.ts` (internal) → re-exported |
| `normalizeSingleModel(content, refPath, refName, identity?)` | `:313` | `model.ts` |
| `recursiveParse(root, driver?)` | `:522` | `workspace.ts` |

```
recursiveParser/
  types.ts      ParseIssue, RecursiveParseResult, ParseContext (internal)
  paths.ts      stripMdSuffix, resolveGraphEdgeTarget, resolveQualifiedIdToPath   (pure)
  normalize.ts  nowIso, toLocalMetamodel, toFieldValues, buildTaxonomyParentMap,
                normalizeElementsIntoGraph, resolveElementAssets                  (ParsedModel → graph)
  model.ts      normalizeSingleModel, parseAndRegisterModel                       (single model)
  workspace.ts  isNotFound, isIgnoredPath, recursiveParse, IGNORED_DIRECTORIES    (FS traversal)
  index.ts      barrel — re-exports exactly the 6 symbols above, nothing more
```

`index.ts` MUST NOT widen the surface (no `export *` of internals): `browser.ts` enumerates the six
symbols explicitly, and widening would silently diverge the node/browser entry points.

### 2. `apps/innfo-editor/src/composables/useMatrixDefinitions.ts` (new, shared)

```ts
export const MATRIX_DEFS_KEY = '__matrix_defs'
export interface MatrixDef { name: string; source: string; target: string
  widgetType: MatrixWidgetType; params: string; values?: string[]; description?: string
  min_color?: string; max_color?: string; label?: string }

/** Raw `__matrix_defs` field value; [] when absent. */
export function readMatrixDefsField(root: ModelNode | null | undefined): any[]
/** Raw `matrices` frontmatter field value; [] when absent. */
export function readRawMatricesField(root: ModelNode | null | undefined): any[]
/** LeftSidebar/BlockSheet/WorkspaceView/BlockMatrixSummary strategy: defs, else normalized matrices. */
export function extractMatrixDefs(root: ModelNode | null | undefined): any[]
/** MatricesGrid strategy: both sources normalized, deduped by name, defs first. */
export function mergeMatrixDefs(root: ModelNode | null | undefined): MatrixDef[]

export function useMatrixDefinitions(
  rootIds: Ref<string[]>,
  opts?: { strategy?: 'fallback' | 'merge' },   // default 'fallback'
): { matrixDefs: ComputedRef<MatrixDef[]>; getMatrixValueCount: (matrixName: string) => number }
```

Consumers: `LeftSidebar.vue` (`strategy:'fallback'`, `rootIds = visibleRootIds`),
`MatricesGrid.vue` (`strategy:'merge'`, `rootIds = modelStore.rootIds`), `BlockSheet.vue:716`,
`MetamatrixConfig.vue:174+` (constant + primitives only — it *writes* the field via
`commitFieldValue`, so it adopts `MATRIX_DEFS_KEY` and `readMatrixDefsField` only),
`BlockMatrixSummary.vue:57,151`, `WorkspaceView.vue:382`, `services/SpecResolverService.ts:167`
(constant only — service layer, no Vue reactivity).

Added to the existing `apps/innfo-editor/src/composables/useConceptVisuals.ts`:

```ts
/** Name-based icon/color lookup over root localMetamodel.concepts (moved verbatim). */
export function getConceptMeta(conceptType: string): { icon?: string; color?: string }
```

### 3. Per-component composables

| Target file | Signature | Consumer(s) |
|---|---|---|
| `src/composables/useTreeExpansion.ts` | `useTreeExpansion(): { expandedGeneration: Ref<number>; expandedModels: Ref<Record<string,boolean>>; expandAll(): void; collapseAll(): void; toggleModel(id: string): void }` | `LeftSidebar.vue` |
| `src/utils/version.ts` (existing) | `export function compareSemVer(a: string, b: string): number` | `LeftSidebar.vue` |
| `src/components/editor/composables/useMatrixCells.ts` | `useMatrixCells(activeMatrix: Ref<MatrixDef\|null>, rootNode: Ref<ModelNode\|null>, onChange: (key: string, v: unknown) => void): { matrixCellKey(row,col): string; getVal(row,col): string\|number\|boolean; setVal(row,col,value): void; valueDistribution(rows: string[], cols: string[]): Record<string,number>; getSetOptionsList(): string[]; isOutOfSetValue(v): boolean; rotateCycle(row,col): void }` | `MatricesGrid.vue` |
| `src/components/editor/composables/useMatrixColors.ts` | `getCycleBgColor(val: string\|number\|boolean): string`, `getDistClasses(value: string): string`, `getHeatmapClasses(val: string\|number\|boolean): string` — pure functions, no composable wrapper (no reactive state) | `MatricesGrid.vue` |
| `src/components/editor/composables/useModelFrontmatter.ts` | `useModelFrontmatter(rawContent: Ref<string>): { frontmatter: ComputedRef<SpecFrontmatter\|null>; formatVersion; templateName; templateVersion; modelVersion; rawModelVersion; lastSaved: ComputedRef<string> }` | `ModelInfoPanel.vue` |
| `src/components/editor/composables/useVersionBump.ts` | `useVersionBump(ctx: { rawModelVersion: Ref<string>; templateName: Ref<string>; sourcePath: Ref<string> }): { currentModelSemVer: ComputedRef<SemVer\|null>; currentVersionStr; versionPreview(level: BumpLevel): string; filenamePreview(level: BumpLevel): string; currentFilename(): string }` — `saveVersion` stays in the component (store + UI state) | `ModelInfoPanel.vue` |
| `src/composables/useWorkspaceScaffolding.ts` | `export type TemplateChoice = 'blank'\|'business'\|'procedures'\|'organization'\|'sandbox'`; `initWorkspaceStructure(handle: DirectoryHandleLike, modelName: string, chosenTemplate: TemplateChoice): Promise<void>`; `createIndexMd(handle, modelName, templateName): Promise<void>`; `prepopulateSpecs(handle, starterUrl): Promise<void>`; `getStarterByTemplate(tpl: TemplateChoice): { id; templateName; url } \| undefined` — plain exported async functions (no Vue reactivity), directly importable by `tests/…/setupWizard-workflows.integration.test.ts` | `SetupWizard.vue` |
| `src/components/editor/composables/useBlockRawMarkdown.ts` | `useBlockRawMarkdown(ctx: { blockId: Ref<string>; kind: Ref<string>; conceptName: Ref<string\|undefined>; block: Ref<Block> }): { rawMarkdown: ComputedRef<string> }` | `BlockSheet.vue` |
| `src/components/editor/composables/useBlockAssets.ts` | `useBlockAssets(node: Ref<ModelNode\|null>, scannedAssets: Ref<ScannedAsset[]>): { resolveAssetUrl(relativePath: string): Promise<string>; assetItems: ComputedRef<Array<{filename: string; url: string}>> }` — owns the module-local `blobUrlCache` | `BlockSheet.vue` |

`stripBlockDefinitions` / `cleanConceptName` / `renderedDescription` stay in `BlockSheet.vue`
(display formatting bound to props). The `@tanstack/virtual` setup stays in `MatricesGrid.vue`.

### 4. `DirectoryPickerModal.vue` deletion

| Path | Action |
|---|---|
| `apps/innfo-editor/src/components/layout/DirectoryPickerModal.vue` | Delete (842 lines, no importer) |
| `apps/innfo-editor/tests/unit/file-system-ops.test.ts` | Modify — remove the `// ── DirectoryPickerModal guard ──` block at `:338` and the header comment at `:6`. The assertions there exercise `isFileSystemAccessSupported()` from `useFileSystem.ts`; any assertion that survives that guard's removal must be preserved under a `useFileSystem` describe, not deleted |
| `docs/code-quality-review-guide.md` | Modify — drop the `:81` size entry and the `:168` row-6 mention |
| `openspec/specs/file-system-ops/spec.md` | **Not edited here.** `openspec/changes/refactor-editor-god-components/specs/file-system-ops/spec.md` (written by sdd-spec) is the authoritative source for the R-FS-01 rewording; this design intentionally does not restate requirement text |

Gate: re-run `rg "DirectoryPickerModal"` immediately before deleting; abort if any `src/` or `e2e/`
match appears.

## Data Flow

```
  ModelNode.rawContent ──→ parseFrontmatter (innfo-core) ──→ readString() ──→ ModelInfoPanel display
                                                          └─→ useVersionBump ──→ filename preview

  modelStore.nodes ──→ useMatrixDefinitions ──┬─ 'fallback' ──→ LeftSidebar Relations
                                              └─ 'merge'    ──→ MatricesGrid ──→ useMatrixCells
                                                                              └─→ useMatrixColors
```

## Sequencing (input to sdd-tasks)

```
WU1 recursiveParser/ split ────────────────── independent (core only)
WU2 shared dedup ──┬──→ WU3 LeftSidebar
                   ├──→ WU4 MatricesGrid          (WU3/WU4/WU7 parallel after WU2)
                   └──→ WU7b BlockSheet extraction
WU7a BlockSheet component test ─────────────→ WU7b   (hard gate: must be green first)
WU5 ModelInfoPanel ────────────────────────── independent
WU6 SetupWizard ───────────────────────────── independent
WU8 DirectoryPickerModal deletion ─────────── independent (touches spec + docs + one test)
```

- **Hard**: WU2 → {WU3, WU4, WU7b}; WU7a → WU7b.
- **Parallelizable**: {WU1, WU2, WU5, WU6, WU7a, WU8} have no mutual dependency.
- **Slicing constraint**: WU1 is a ~1400-changed-line pure move and WU6 touches a 1295-line file;
  either alone approaches the 1500-line budget, so `single-pr` is not viable. Recommended slices:
  **S1** WU1 · **S2** WU2+WU3+WU4 · **S3** WU5+WU7a+WU7b+WU8 · **S4** WU6.
  The binding forecast (`400-line budget risk`, `Chained PRs recommended`) is sdd-tasks' output,
  not this document's.

## Testing Strategy

| Layer | What to Test | Approach |
|---|---|---|
| Unit (core) | 22 existing `recursive-parser.test.ts` + `index.test.ts` dynamic imports resolve through the new barrel | run unmodified |
| Unit (core) | `paths.ts` pure functions | existing coverage; no new test needed |
| Golden | `recursiveParser.models.golden`, `roundtrip.*`, `crlf-fidelity` snapshots unchanged | run unmodified — any snapshot diff = drift, stop |
| Unit (app) | `useMatrixDefinitions` both strategies return what `LeftSidebar`/`MatricesGrid` returned | new test, direct import |
| Component | `LeftSidebar-{ghost,matrix-details,ordering}`, `MatricesGrid`, `ModelInfoPanel-version` | run unmodified |
| Component | **New** `ModelInfoPanel` frontmatter cases pinning the two `parseFrontmatter` deltas (non-first-key `template.version`; unquoted scalar coerced to string) | new test |
| Component | **New** `BlockSheet` mount test covering `rawMarkdown` + `assetItems` — **must be green before WU7b** | new test |
| Integration | `setupWizard-workflows.integration.test.ts` against the fake FS tree | run unmodified |
| E2E | `e2e/03-block-sheet.spec.ts` and full Playwright suite | run unmodified |
| Quality | `npm run lint`, `npm run typecheck`, `npm run format` (CI `.github/workflows/ci.yml` gates all) | per slice |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or
process-integration boundary. All units are in-repo module moves plus one file deletion.

## Migration / Rollout

No data migration, no feature flag. Each work unit is one commit with a green suite; rollback is
`git revert` of that commit. `recursiveParser/` reverts to the single file behind an unchanged
barrel export; the `DirectoryPickerModal` deletion reverts together with its spec delta.

## Open Questions

- None blocking. Deferred follow-up (out of scope): `MatrixPill.vue:154` holds a third
  `getConceptMeta` variant with a widened `string | undefined` parameter.
</content>
</invoke>
