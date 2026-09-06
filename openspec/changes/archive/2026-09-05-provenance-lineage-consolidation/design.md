# Design: Provenance & Lineage Consolidation

## 1. Terminology (the target state)

Three terms, one meaning each:

- **Source** — a normalised Markdown file under `sources/nn/`. Carries *origin
  metadata* in its frontmatter: `source_file`, `sha256`, `size_bytes`,
  `normalized_at`, `normalized_by`, and optionally `source_url` / `downloaded_at`
  / `cited_works`.
- **Citation** — a typed pointer from a node to a Source section. Two altitudes:
  - *model citation*: `sources:: <path>.md#<slug>` on a Level 3 element.
  - *artifact citation*: `[^1]` / APA / IEEE / … inside a generated deliverable.
- **Lineage** — the generated record `<Project>_V_x-y-z_cogNNitive_NN.md`. One
  section per artifact class (`Sources`, `Models`, `Artifacts`, `Procedures`),
  each kept in sync with the filesystem.

Retired words: "provenance" (as a standalone noun), "traceability",
"3-tier lineage", "grounding", "canonical view". The per-field editor envelope
keeps a name of its own — **edit attribution** — and is never called lineage.

## 2. `SourceRef` primitive (`innfo-core`)

New module `iNNfo/packages/innfo-core/src/sourceRef.ts`. Public surface:

```ts
export interface SourceRef {
  /** Workspace-relative path, always normalised to start with `sources/nn/`. */
  filePath: string
  /** Last path segment. */
  fileName: string
  /** Heading slug after `#`, if present. */
  slug?: string
  /** Cross-domain `models/…` reference rather than a `sources/nn/` one. */
  kind: 'source' | 'model'
  /** Original string as authored. */
  raw: string
}

/** Parse one field value. Returns null for non-references (plain strings). */
export function parseSourceRef(value: string): SourceRef | null

/** GitHub-compatible heading slug. THE single implementation. */
export function slugifyHeading(text: string): string

/** All headings of a Markdown doc with disambiguated slugs. */
export function extractHeadings(markdown: string): HeadingInfo[]
```

Rules enforced by `parseSourceRef` (returning `null` ⇒ "not a source ref", which
the validator treats as a hard error only when the field is *declared* a source
field):

- Reject `#L\d+(-L\d+)?$` line-range anchors.
- Reject a leading `src-\d+` wrapper.
- Reject `sources/original/...` (only `sources/nn/` is citable).
- Accept `sources/nn/<path>.md[#slug]`, `models/<path>.md[#slug]`, and bare
  `<path>.md[#slug]` (resolved under `sources/nn/`).

`slugifyHeading` — decision: **transliterate** accents via
`String.prototype.normalize('NFD')` + combining-mark strip, then lowercase,
spaces→`-`, drop non `[a-z0-9-]`, collapse `-`. This is a deliberate change from
the current heading-slug behaviour (which dropped accented characters). It aligns
the heading slug with the filename slug and is the reason PR 10 is landed last
and alone.

`innfo-editor/src/utils/sourceRef.ts` after PR 1:

```ts
export * from '@cognnitive/innfo-core/sourceRef'
```

(plus a deprecation `@deprecated import from '@cognnitive/innfo-core'` JSDoc).

## 3. Graph attachment (`recursiveParser/normalize.ts`)

In `normalizeElementsIntoGraph`, after `toFieldValues`:

```ts
const SOURCE_FIELD_NAMES = new Set(['sources', 'source'])

for (const [fieldName, fv] of Object.entries(node.fields)) {
  if (!SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())) continue
  const raw = fv.value
  const values = Array.isArray(raw) ? raw : [raw]
  const refs = values
    .map((v) => parseSourceRef(String(v)))
    .filter((r): r is SourceRef => r !== null)
  if (refs.length > 0) {
    node.sources = refs
    for (const ref of refs) {
      node.relationships.push({
        targetId: ref.filePath, // path, not a node id — sources are not nodes
        label: 'sources',
        origin: 'source',
      })
    }
  }
}
```

`ModelNode` gains an optional `sources?: SourceRef[]`. `Relationship.origin`
gains `'source'`. Edge `targetId` holds the workspace-relative path (Sources are
not graph nodes); consumers that walk edges by node id must skip
`origin === 'source'` edges — audited in PR 1.

## 4. Validation seam

`sources::` validation is **workspace-scoped** (needs to open other files), so it
lives beside the existing qualified-cross-model check, not in per-file
`validateModel`. Reuse the host resolver pattern already used for submodels:

```ts
export type SourceResolver = (
  refPath: string,       // e.g. "sources/nn/clientA/report.md"
  referringPath?: string,
) => { exists: boolean; headings?: string[] } | null
```

- Node host (`innfo-mcp/src/tools/*`): resolver reads the file from disk, returns
  `exists` + `extractHeadings(content).map(h => h.slug)`.
- Browser host (`innfo-editor`): resolver hits the in-memory workspace store.

New `validateWorkspaceSources(result, resolver): ReferenceDiagnostic[]`:

| Condition | Severity | Message shape |
| :--- | :--- | :--- |
| `parseSourceRef` returns `null` on a declared source field | `error` | `Malformed source reference "<raw>" (line ranges and src-NNN ids are not allowed; use <path>.md#<heading-slug>)` |
| file does not resolve | `error` | `Dangling source reference: "<filePath>" is not present in this workspace` |
| slug given, file resolves, slug absent | `warning` | `Source reference "<raw>" points at heading "#<slug>" which does not exist in "<fileName>"` |

`innfo-mcp` `validate` tool: call `validateWorkspaceSources` with the Node
resolver and merge its diagnostics into the existing response envelope.

## 5. Lineage record sync (`nn-trannsform/scripts/lib/provenance-model.js`)

`buildProvenanceModel(projectDir)` today: `collectSources` → render `# NN Sources`
→ `refreshExistingModel` replaces only that section. Extend:

```
collectSources(sources/nn/)        -> # NN Sources   (idempotent replace, unchanged)
collectModels(models/)             -> # NN Models     (idempotent replace)  [NEW]
collectArtifacts(artifacts/)       -> # NN Artifacts  (idempotent replace)  [NEW]
appendProcedureRun(run)            -> # NN Procedures  (append one entry)    [NEW]
```

- `collectModels`: for each `models/*_NN.md`, read frontmatter (`title`,
  `model_version`, `parent_spec.name`) and scrape `sources::` values (regex is
  acceptable here — the script has no parser; the *editor/MCP* path uses PR 1's
  typed refs). Emit:
  ```
  ## NN Models: <title>
  model_ref:: models/<file>
  model_version:: <version>
  model_template:: <parent_spec.name>
  derived_from:: [<source refs, deduped>]
  ```
- `collectArtifacts`: for each file under `artifacts/` (recursive), read
  frontmatter or an `export-meta`-style block for `model` + `model_version`;
  fall back to `derived_from:: []` with a `note::` when none is found. Emit:
  ```
  ## NN Artifacts: <name>
  artifact_ref:: artifacts/<file>
  artifact_format:: <document|report|dataset|board>
  derived_from:: [<model refs>]
  ```
- `appendProcedureRun`: called by `scripts/index.js` after each operation with
  `{ command, flags, runAt, inputs, outputs }`. Appends:
  ```
  ## NN Procedures: <command> @ <runAt>
  command:: <command>
  flags:: <flags>
  run_at:: <ISO8601>
  inputs:: [<paths>]
  outputs:: [<paths>]
  ```
  `refreshExistingModel` must **not** wipe `# NN Procedures` — change its
  section handling from "replace all managed sections" to "replace
  Sources/Models/Artifacts, preserve Procedures".

- `--check` mode (`scripts/index.js` + new `lib/lineage-check.js`): parse the
  lineage record + walk the filesystem, print a report:
  - model file with no `## NN Models:` entry (sync bug or stale record),
  - `## NN Artifacts:` entry whose `derived_from` model/version is absent,
  - `sources::` value in any model that does not resolve under `sources/nn/`.
  Exit non-zero when any `error`-level drift is found (CI-usable).

## 6. `artifacts/` flattening

- `scripts/index.js` `bootstrapProject` `dirs` list: replace
  `['artifacts', path.join('artifacts','reports')]` with `['artifacts']`.
- `nn-trannsform/SKILL.md` §1 layout diagram, §5 table: one row, `artifacts/`,
  with "reports carry `type: report` in frontmatter".
- `transformer.js` `applyTransformation`: `outputDir` already `artifacts/`
  (`artifacts/reports` was never written by code — only documented) — verify and
  drop the doc reference.
- `provenance.js` `buildProvenanceModel` writes validation output: point any
  `artifacts/reports/` path at `artifacts/`.

## 7. `references:` → `cited_works:`

Readers to update in the same PR:
- `scanner-core.js` `generateSourceFrontmatter` — emits `references:` block →
  `cited_works:`.
- `scanner-core.js` `parseFrontmatterFields` / `getExistingFrontmatterFields` —
  no nested read today, so nothing breaks, but add `cited_works` passthrough.
- `provenance-model.js` `parseSourceFrontmatter` — add `cited_works`.
- `nn-trannsform/citations.md` "Primary vs. Secondary Citation Resolution" — text
  references `references:` block → `cited_works:`.
- `docs/innfo/documentation/citations-provenance.md` §4 frontmatter example.
- Editor frontmatter parsing (`innfo-core` `parser/yaml.ts` consumers) — grep
  `references` in `innfo-core` + editor; keep `references` as a **deprecated
  alias** (read both, write `cited_works`) for one release.

## 8. `provenance` → `editAttribution` (field-value envelope)

- `innfo-core/src/types.ts`: `FieldValue.provenance: Provenance` →
  `FieldValue.editAttribution: EditAttribution`; rename `interface Provenance`
  → `EditAttribution` (keep shape `{ author: Author; timestamp: string }`).
- `recursiveParser/normalize.ts` + `recursiveParser/model.ts`: the four
  `provenance: { author: { kind: 'system', id: 'parser' }, timestamp }` literals.
- `innfo-editor/src/shared/provenance.ts` → `shared/editAttribution.ts`;
  `commitFieldValue` / `commitMarkerValue` keep their names, stamp
  `editAttribution`.
- `schema.ts` `Provenance` (the merge-provenance for template composition) is a
  **different** type with the same name — leave it, or rename to
  `MergeOrigin` for clarity (decide in PR 7; low risk, internal).
- `mcp` `SpecResolverService.ts` provenance literal → `editAttribution`.
- TypeScript compiler is the checklist; `npm run typecheck` gates.

## 9. Test strategy (strict TDD — `config.yaml` `strict_tdd: true`)

Every PR writes tests first. Runner: `npm --prefix iNNfo run test` for
`innfo-core` / `innfo-mcp` / `innfo-editor`; `node --test` under
`actioNN/skills/nn-trannsform/test/` for the scripts.

| PR | New test files (first) |
| :--- | :--- |
| 1 | `innfo-core/src/sourceRef.spec.ts`, `innfo-core/src/validator/workspaceSources.spec.ts`, `innfo-mcp/src/tools/validate.spec.ts` cases |
| 2 | `nn-trannsform/test/unit/test-bootstrap-recursive.js` |
| 3 | none (string/doc sweep) — add a `test/unit/test-no-spanish.js` guard grep |
| 4 | `nn-trannsform/test/unit/test-lineage-sync.js`, `test-lineage-check.js` |
| 5 | update `test-*` fixtures asserting `artifacts/` layout |
| 7 | `test-cited-works-alias.js`; `innfo-core` typecheck is the net |
| 8 | trim `test.ps1` band-transform assertions |
| 9 | `test-provenance.js` — assert `assets/<slug>/` gets media only |
| 10 | `innfo-core/src/sourceRef.spec.ts` accent cases; re-slug fixture snapshot |

## 10. PR chain (stacked to `main`)

| PR | Title | Breaking? |
| :-- | :-- | :-- |
| 1 | `feat(innfo-core,innfo-mcp): typed & validated source references` | no (additive) |
| 2 | `fix(nn-trannsform): recursive bootstrap copy preserves subfolders` | no |
| 3 | `chore(actioNN,openspec): translate remaining Spanish strings to English` | no |
| 4 | `feat(nn-trannsform): lineage record full filesystem sync + --check` | no |
| 5 | `refactor(nn-trannsform): flatten artifacts/ to a single directory` | convention |
| 6 | `chore(openspec): delete dead export-navigator spec` | no |
| 7 | `refactor: consolidate provenance vocabulary to Source/Citation/Lineage` | **yes** |
| 8 | `chore(nn-trannsform): remove Beatles fixtures, gut heuristic transformer` | no |
| 9 | `chore(nn-trannsform): stop copying normalized .md into assets/` | no |
| 10 | `refactor: unify slug algorithm with accent transliteration` | **yes** |

The plan (this change folder) ships inside PR 1.
