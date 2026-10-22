# Design: Site domaiNN dogfooding

## Technical Approach

Approach A from the proposal. `site_NN/` is a self-contained domaiNN holding only data: kNNowledge, a
domaiNN-local `site` bluepriNNt (spec, procedures, assets) and write-once code-fact Sources. All
executable code lives in `scripts/site/`, so `verify.js` discovers its tests and eslint covers it.
Three small Node ESM scripts with no new dependencies: compile, import code facts, staleness check.
They reuse the `skills/nn-sources` nn-core mirror and impact checker unchanged.

## Verified facts this design relies on

| Fact | Evidence |
|---|---|
| nn-sources mirror exports `writeOnce`, `cognitivize`, `importRaw`, `validateCitations`, `createFsSourceResolver`, `extractHeadings`. It exports no model parser. | `skills/nn-sources/scripts/lib/nn-core.generated.cjs:7373-7438` |
| `importRaw` hard-codes `sources/import` and needs an external file. `writeOnce(root, {dir,key,ext}, bytes)` takes any dir and dedupes on sha256. | same file `:10342-10367`, `:10208-10243` |
| Member name is `<key>_<YYYYMMDDTHHMMSSZ>[-n].<ext>`, not `_V_n`. | `:7527-7530`, `:7600-7607` |
| `checkScanImpact(projectDir)` is pure and returns `superseded` / `unresolved_in_latest` per citing model. `auditModelCitations(projectDir)` returns `{errors, warnings}`. | `skills/nn-sources/scripts/lib/impact-checker.js:459-476, 101, 478-488` |
| The lineage walk skips `specs/` and reads only `.md/.csv/.json/.html`. | `nn-core.generated.cjs:7545, 9923-9956` |
| `parseKnowledge` is exported only by `skills/nn-upgrade/scripts/lib/nn-core.generated.cjs:7373`. It left-trims every prose line, which flattens code indentation (`nn-core/src/parser/sections.ts:264`). It also treats any `key:: v` line after a heading as a field, even mid-prose (`:213-227`). | as cited |
| `slug::` is a reserved element property, not a field, and must be unique per document. | `sections.ts:216-221`, `nn-core/src/mutate.ts:500` |
| A local `parent_spec.url` resolves relative to the workspace root and must stay inside it. A workspace `specs/bluepriNNts/<name>/spec_NN.md` is a tested tier. | `nn-mcp/src/tools/resolver-node.ts:93-123, 558-573`; `mutate.spec.ts:361` |
| The code-fact extractors are NOT in `scripts/lib/docs-facts.mjs` (that file holds only renderers). Tools come from `nn-mcp/dist/server.js` `toolDefinitions`. Skills come from `parseSourceYaml` in `scripts/manifest/generate-manifest.js`. | `scripts/generate-docs-facts.mjs:56, 96-99` |
| Test discovery covers `*.test.{js,mjs}` under `scripts/`, `skills/`, `test/`, `iNNfo/specs/bluepriNNts`. `verify.js` does not run vitest. | `scripts/verify.js:311-320, 464-471` |

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|---|---|---|---|
| D1 Code location | `scripts/site/*.mjs` and tests next to them. The procedure's `tool::` is repo-relative, like `generate-docsify-suite`. | Scripts in `site_NN/` (spec draft) | `site_NN/` sits outside verify discovery, eslint and the nn-name regex. Putting code there would need wiring edits to `verify.js`. The domaiNN stays pure data. |
| D2 Parser | Small hand parser in `scripts/site/lib/site-model.mjs` (~70 lines). Fields are the contiguous `key::` block right after `## NN <Concept>: <Name>`. The body is kept verbatim. Any later `^\s*[\w-]+::\s` line fails. | (a) nn-upgrade's `parseKnowledge`: cross-skill runtime coupling, and it destroys code indentation. (b) nn-core `dist`: needs a build and goes stale. (c) Extend `parseNNModel`: shared file, no body capture. | The fail-closed rule means the hand parser and nn-core agree on fields by construction. A test proves it against nn-upgrade's `parseKnowledge` (test-only coupling). |
| D3 URL slug | Element `slug::` (reserved iNNfo property, kebab-case). Not a bluepriNNt field. | A `slug` Field | nn-core already owns `slug`. Declaring it as a Field would collide. |
| D4 Page title | The element name (`## NN Page: <Title>`). | A `title` field | Avoids storing the same value twice. |
| D5 Documents | `kNNowledge/site_NN.md` holds the Site singleton. Pages go in one `kNNowledge/<kind>_site_NN.md` per kind. | One large document | Small diffs. Limits the damage from the duplicate-name drop. |
| D6 Snapshot write | `writeOnce(site_NN, {dir:'sources/import/code-facts', key, ext:'md'}, bytes)` then `cognitivize`. | `importRaw` (fixed dir, needs temp file); watch roots (absolute paths) | Direct, committed and deterministic. Identical bytes are deduplicated, so no new member is written. |
| D7 Staleness | Compile fails if `auditModelCitations().errors` is non-empty, if any `unresolved_in_latest` exists, or if a code-facts member's sidecar hash is stale (`findStaleSources`). `superseded` only warns. The standalone check exits 1 only on `unresolved_in_latest`. | Blocking on `superseded` | Matches the orchestrator answer. A hash mismatch means the write-once rule was broken in place. |
| D8 Freshness guard | `compile-site.test.mjs` compiles into a temp dir and byte-compares the result with the committed `docs/next/`. | A new `--check` step in `verify.js` | Auto-discovered, so `verify.js` needs no change. |
| D9 Output | Flat files `docs/next/<slug>.html`. `index` is the required home Page. | `<slug>/index.html` | Relative links work everywhere, including `file://`. |

## Data Flow

```
nn-mcp dist toolDefinitions ─┐
manifest/source.yaml skills ─┴─> import-code-facts.mjs ──writeOnce+cognitivize──>
      site_NN/sources/import/code-facts/<key>_<stamp>.md (+ _sidecar_NN.md)
                                              ^ cited as  @## <name>
site_NN/kNNowledge/*_site_NN.md (Pages, sources:: [...]) ──┐
site_NN/specs/bluepriNNts/site/assets/{shell.html,site.css}┤
                                                           v
 compile-site.mjs: parse -> validate model -> auditModelCitations + checkScanImpact
   -> render markdown subset -> fill shell -> docs/next/{*.html, site.css, sitemap.xml, llms.txt}
```

## File Changes (all Create; no existing file modified)

| File | Purpose |
|---|---|
| `site_NN/domaiNN_NN.md` | domaiNN root: `knowledge_dir:: kNNowledge/`, `blueprints_dir:: specs/bluepriNNts/`, kNNowledge registry |
| `site_NN/specs/bluepriNNts/site/spec_NN.md` | Level 2 `site` bluepriNNt, `blueprint_version: "V_0-1-0"`, declares procedure `compile-site` |
| `site_NN/specs/bluepriNNts/site/procedures/{compile_site,usage}_procedures_NN.md` | `Work` steps. `tool:: scripts/site/compile-site.mjs` |
| `site_NN/specs/bluepriNNts/site/assets/shell.html`, `site.css` | Template with `{{title}} {{nav}} {{content}} {{sources}}` slots, plus one stylesheet |
| `site_NN/kNNowledge/site_NN.md`, `<kind>_site_NN.md` x6 | Seed content |
| `site_NN/sources/import/code-facts/*` | Snapshots and sidecars (generated by the import script, committed) |
| `scripts/site/lib/site-model.mjs`, `lib/markdown-subset.mjs` | Parser, model checks, renderer |
| `scripts/site/compile-site.mjs`, `import-code-facts.mjs`, `site-staleness.mjs` | CLIs. Each exports a pure `run(opts)` |
| `scripts/site/*.test.mjs` | Node `node:test` suites |
| `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts` | Slice 1 proof: `validateKnowledge(site_NN, …)` passes against the local bluepriNNt |
| `docs/next/**` | Generated and committed |

## `site` bluepriNNt shape

| Concept | Field | Type | Rule |
|---|---|---|---|
| Site (singleton; name = site title) | `tagline` | string | required |
| | `base_url` | string | required. Absolute and ends with `/` (e.g. `https://cognnitive.com/next/`) |
| | `repository_url` | string | optional |
| Page (name = title) | `kind` | select | `tutorial\|guide\|concept\|reference\|pitch\|legal` |
| | `order` | number | integer. Sort key within a kind |
| | `summary` | string | required. Used in the nav, `<meta description>` and `llms.txt` |
| | `sources` | reserved citation list | optional. Bracketed `path@unit` |
| | `slug::` | reserved element slug | required. `^[a-z0-9]+(-[a-z0-9]+)*$`, unique site-wide. Exactly one `index` |
| | body | prose | the markdown subset below |

The navigation order is `pitch, tutorial, guide, concept, reference, legal`, then `order`, then `slug`.

## Markdown subset (fail-closed, error reports `file:line`)

The renderer supports:
- Headings `###` and `####`.
- Paragraphs, joined over consecutive lines.
- Flat `1. ` ordered lists only (see the note below).
- Fenced ``` code blocks with an optional language. The content is HTML-escaped and indentation is kept.
- Inline `` `code` ``, `**bold**`, `*em*`, `[text](https://… | relative)`.
- `[[Page Name]]`, which becomes a link to that Page's `<slug>.html` and fails if the Page is unknown.

All text is HTML-escaped. Any other construct is rejected:
- `#`/`##` headings
- tables (`|`), blockquotes (`>`), raw HTML (`<`)
- images (`![`), indented or nested list items, `javascript:` URLs
- `key::` lines, inside fences too, because nn-core would read them as fields
- `- ` and `* ` lines, inside fences too: nn-core rejects them in concept bodies (`format.body-element-markers`, `nn-core/src/validator/content.ts:397-415`), so the renderer rejects them first with its own `file:line` error. Lists are `1. ` only.

## Interfaces

```js
// scripts/site/lib/site-model.mjs
export function loadSite(domainDir) // -> { site, pages: [{ name, slug, kind, order, summary, sources, body, file, line }] } | throws SiteError
// scripts/site/lib/markdown-subset.mjs
export function renderBody(body, { file, line, pagesByName }) // -> html string | throws SiteError
// scripts/site/compile-site.mjs
export async function run({ domainDir, outDir, log }) // -> exit code 0|1
// scripts/site/site-staleness.mjs
export function checkStaleness(domainDir) // -> { superseded: [...], unresolved: [...], staleHashes: [...] }
// scripts/site/import-code-facts.mjs
export function renderSnapshot(group, entries) // -> deterministic markdown, one "## <name>" per entry, sorted
export async function run({ domainDir, facts, now }) // facts injected in tests; CLI loads dist + source.yaml
```

## Determinism and UTF-8

- Inputs: strip the BOM, normalize CRLF to LF, fail on U+FFFD.
- Outputs: written with `writeFileSync(p, s, 'utf8')`, LF only, a single trailing newline.
- No timestamps anywhere in `docs/next/`: no `lastmod` in the sitemap and no build date.
- All collections are sorted by explicit keys.
- `outDir` is removed and rewritten on every run. Only `docs/next/` is ever removed.
- Snapshots are sorted by name, so an unchanged fact set deduplicates. Sidecar `normalized_at` is the only timestamp, written once per new member.

## Testing Strategy

| Layer | What | Where |
|---|---|---|
| Unit | Parser: fields block, mid-prose `::` rejection, duplicate names and slugs, kind enum. Renderer: each construct plus each rejection. `renderSnapshot` sort order and stable bytes. | `scripts/site/*.test.mjs` |
| Agreement | Hand parser vs nn-upgrade `parseKnowledge` on every seed document. Field maps and element names must be equal. | `scripts/site/site-model.test.mjs` |
| Integration | Temp domaiNN: import facts, cite them, re-import changed facts with an injected `now`, then expect `superseded`/`unresolved_in_latest` and the matching exit codes. Compile twice and get byte-identical output. Compiling matches the committed `docs/next/`. | `scripts/site/*.test.mjs` |
| Schema | The local bluepriNNt resolves and the seed kNNowledge validates. | `nn-mcp/src/tools/site-domain.spec.ts` (vitest, CI test job) |

## Slices and changed-lines budget (generated output counted separately)

| Slice | Content | Est. hand-written lines |
|---|---|---|
| S1 | domaiNN root, `site` spec, usage procedure, `site_NN.md`, one Page, vitest proof. Stop and switch to fallback B if it fails. | ~250 |
| S2 | Seed Pages, one per kind (mostly prose) | ~250 |
| S3a | `site-model.mjs`, `markdown-subset.mjs` and their tests | ~350 |
| S3b | `compile-site.mjs`, shell, CSS, compile procedure, freshness test, plus generated `docs/next/` | ~330 (+ ~400 generated) |
| S4 | `import-code-facts.mjs`, `site-staleness.mjs`, tests, citing reference Page, plus generated snapshots | ~280 (+ ~120 generated) |

Every slice fits within the 400-line review budget if generated files are labelled as such in the PR.

## Migration / Rollout

No migration is required. The change is purely additive. Rollback means deleting `site_NN/`, `scripts/site/`, `docs/next/` and the vitest spec.

## Open Questions (non-blocking; decided here, spec must reconcile)

- [ ] The spec draft says scripts live in `site_NN/`. D1 puts them in `scripts/site/`.
- [ ] The spec draft says snapshots are named `mcp-tools_V_<n>.md`. The real naming is `mcp-tools_<stamp>.md`.
- [ ] The spec draft says the extractors are reused from `scripts/lib/docs-facts.mjs`. The real sources are the nn-mcp dist `toolDefinitions` and `parseSourceYaml`. Both are reused and neither file is modified.
- [ ] The spec draft has a `slug` field. D3 uses the reserved `slug::` element property instead.
