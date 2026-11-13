# cogNNitive improvement analysis: evidence

Date: 2026-11-12. Analysed commit: `9c6bef60` on `main`. This file holds the
findings behind [the analysis](2026-11-12-improvement-analysis.md), by area.

How to read the labels: **V** means verified at the cited line, **M** measured with
a script, **I** inferred from the code and not reproduced. Line numbers refer to
`9c6bef60`; pull requests #619 to #625 merged afterwards, so re-locate a line
before acting on it.

## Spec levels and blueprints

The four levels are clean on paper; the files under `iNNfo/specs/` no longer follow
the rules Level 0 sets for them.

| Level | Files | State |
| --- | --- | --- |
| 0 `defiNNition` | `defiNNition_V_0-1-0_NN.md` (375 lines) and `defiNNe_V_0-1-0_NN.md`, which differs only in the name | Draft (V) |
| 1 `iNNfo` | Nine versions, 0.1.0 to 0.7.0 | 0.2.0 to 0.3.0 Stable; 0.1.0 and 0.4.0 to 0.7.0 Draft (V) |
| 2 `bluepriNNt` | 22 folders under `bluepriNNts/`, plus 4 legacy files `*_V_0-3-0_NN.md` and `workspace_V_0-2-2_NN.md` at the root | In use; root files unreferenced except the workspace one (V) |
| 3 `kNNowledge` | 29 shipped samples | 11 are version-checked (V) |

### What Level 0 says and what the repository does

| Level 0 rule | Reality |
| --- | --- |
| A blueprint lives at `specs/templates/<bp>/<bp>_V_x-y-z_NN.md` | It lives at `bluepriNNts/<name>/spec_NN.md` |
| A version bump creates a new file; the old one is never edited | The file is edited in place and `blueprint_version` is raised |
| `spec_url` must point to an immutable version | Every `spec_url` points at `main` |
| Levels 0 to 2 carry Philosophy, Objectives, Specification, Template and Examples | 12 of 22 blueprints lack at least one |
| A specification includes a glossary | iNNfo 0.7.0 has none |

### Version fields

- 20 of 22 blueprints declare `spec_version: V_0-5-0` and
  `parent_spec.name: iNNfo_V_0-6-0` (M).
- `coNNtent` declares 0-5-0 with a 0-7-0 parent. Only `source-package` agrees with
  itself, at 0-7-0 (M).
- `workspace` uses `template_version` where the others use `blueprint_version` (V).
- Only 3 of 22 declare `blueprint_name`; none declares `assets` or `when_to_use`
  (M).
- The manifest carries a `version:` literal for two blueprints only, both stale
  (V).

### Where spec history lives today

The repository keeps history only for Levels 0 and 1; a domain already holds a copy
of what it uses. This is the evidence behind R1.

| Level | In the repository | In a domain |
| --- | --- | --- |
| Blueprints | One `spec_NN.md` each. The catalog lists one version for 21 of them, and history is git plus the `blueprints-v*` tags. | A copy per pinned version under `specs/bluepriNNts/<name>/<version>/`, written by hydration (`nn-mcp/src/tools/spec.ts:701`) |
| Level 1 | Nine versioned files, 0.1.0 to 0.7.0 | The parent chain is cached: 7 versions in one real domain, 1 in another, 6 in the third |
| Level 0 | Two files, one a renamed duplicate | Cached in all three |
| Legacy | Four `*_V_0-3-0` files and three copies of the `workspace` blueprint | `workspace_V_0-5-0` cached in two domains |

- Nothing at run time branches on the Level 1 version. `l1AtLeast` is defined at
  `nn-core/src/validator/knowledge-checks.ts:345`, and the ban that used it now
  runs for every Level 3 document (V).
- The Level 1 text reaches agents through the `get_spec` tool
  (`nn-mcp/src/tools/spec.ts:272`). It is documentation, not configuration (V).
- `nn-update` takes a timestamped backup outside the domain before any write and
  restores it on failure (`skills/nn-update/scripts/apply-update-plan.js:136`) (V).
- Every `parent_spec.url` and every catalog `url` points at `main`. Once the local
  copy is gone, the pinned version of a blueprint cannot be fetched again by its
  URL (V).
- Domain caches hold duplicates: the same blueprint as `spec_NN.md` and as
  `<name>_V_x-y-z_NN.md` in one folder (V).
- The guard compares whole content, not schema: a typo needs a version bump
  (`scripts/guard-template-immutability.js:321`) (V).

### Conformance by blueprint

Counts are Concept, Field and Matrix Definitions. "Missing" lists the Level 0
sections that are absent.

| Blueprint | Version | Title says | C / F / M | Fields without description | Missing sections | Sample at current version |
| --- | --- | --- | --- | --- | --- | --- |
| analysis | 0-4-2 | App | 8 / 1 / 2 | 0 | none | yes |
| artifacts (core) | 0-5-2 | App | 1 / 6 / 0 | 0 | Objectives, Specification, Examples | none |
| blank (core) | 0-4-1 | App | 1 / 2 / 0 | 0 | none | none |
| business | 0-5-2 | App | 0 / 0 / 1 | 0 | none | yes, plus 3 historical |
| business-model | 0-4-3 | App | 62 / 18 / 8 | 0 | none | yes |
| changes (core) | 0-9-0 | Blueprint | 1 / 23 / 0 | 0 | none | none |
| coNNtent | 0-19-0 | App | 11 / 79 / 0 | 0 | Specification, Template, Examples | none |
| design-presets | 0-4-1 | App | 1 / 11 / 0 | 0 | Template, Examples | yes |
| documentation | 0-4-1 | Specification App | 5 / 21 / 0 | 0 | Specification, Template, Examples | yes |
| domaiNN (core) | 0-4-1 | Blueprint | 3 / 10 / 0 | 0 | none | none |
| innovation | 0-4-1 | App | 4 / 56 / 4 | 53 | none | yes |
| metrics | 0-5-2 | App | 4 / 15 / 3 | 0 | none | yes |
| organization | 0-4-1 | App | 6 / 7 / 3 | 1 | none | yes |
| procedures (core) | 0-5-1 | App | 5 / 17 / 3 | 9 | Objectives, Examples | yes |
| projects | 0-4-3 | App | 7 / 20 / 3 | 17 | none | yes |
| repository | 0-3-1 | App | 4 / 13 / 2 | 0 | Template, Examples | yes |
| sidecar (core) | 0-2-0 | App | 1 / 10 / 0 | 0 | Objectives, Specification, Examples | none |
| source-package | 0-4-1 | App | 3 / 31 / 0 | 0 | Examples | none |
| sources (core) | 0-4-0 | App | 2 / 11 / 0 | 0 | Objectives, Specification, Examples | none |
| stakeholders | 0-1-0 | Blueprint | 4 / 13 / 1 | 0 | all but Philosophy | none |
| visual-catalog | 0-3-4 | App | 3 / 15 / 1 | 0 | Template, Examples | none |
| workspace (frozen) | 0-11-0 | Specification App | 9 / 24 / 0 | 0 | Objectives, Examples | none |

### Shared and conflicting definitions

- `tags` is defined in 19 blueprints; 15 copies are byte-identical (M).
- `status` is defined in 11 blueprints and all 11 differ, each bound to its own
  concept (M). It is not a candidate for sharing.
- `path` is defined 10 times, with types `model`, `knowledge` and `file` (M).
- `includes` is used by one blueprint, `business`, which composes five others (V).
- 25 Field Definitions in `coNNtent` carry an indented `scope::` property that
  neither the Level 1 tables nor the metaschema define (V).

### Contradictions inside iNNfo 0.7.0

- Line 221 says reference values "MUST be" a wikilink; lines 122 and 123 say typed
  fields hold addresses only and list title-qualified wikilinks as removed (V).
- The address unit list at line 229 includes `## Heading`, which the grammar block
  at lines 97 to 107 does not have (V).
- The Level 2 template at line 360 pairs the name `iNNfo_V_0-5-0` with a 0-7-0 URL
  (V).
- The Level 3 template at lines 436 to 448 stores `model_slug` and `workspace_id`,
  while line 120 says a model id is derived and never stored (V).
- The metaschema types `weight` as string at line 531; the table at line 148 says
  number (V).
- Leftover wording: "Metaplantilla Nivel 1" at line 128,
  `proyectos/{slug}/models/` at line 171 (V).

### What one blueprint edit costs

1. A higher `blueprint_version`, even for a typo
   (`scripts/guard-template-immutability.js:321`).
2. A regenerated `catalog.json`.
3. For the seven core blueprints, a regenerated `canonical-registry.ts`, which
   embeds their text.
4. For the 11 blueprints with a checked sample: rename the sample, edit
   `SAMPLE_MAPPINGS` in `scripts/sync-samples.mjs:24`, and update the fixture under
   `test/_samples_nn/`.
5. For `procedures`: repin the 30 procedure files that name `procedures_V_0-5-1`.

Files under `procedures/`, `samples/` and `assets/` need no bump. Several blueprint
fixes can share one `blueprints` release.

## Lineage, change history and source traceability

The three mechanisms share one idea, that the applied change is the record, and
each still has a second or third implementation beside it. Paths are relative to
`iNNfo/packages/` unless they start with another folder.

### Lineage

"Lineage" names two unrelated things in the code.

| Meaning | Where it lives | Written by | Read by |
| --- | --- | --- | --- |
| Blueprint lineage: which blueprint version a document follows | Level 3 frontmatter: `parent_spec`, `blueprint_version`, `knowledge_version` | `repin_blueprint` in `nn-core/src/mutate.ts:285`; in practice `nn-update` writes the file directly | `changeset/lineage/plan.ts:41` and, separately, `domain/skew.ts:54` |
| Provenance lineage: what was derived from what | Nowhere. It is computed on each call | Nothing | `projectLineage` in `nn-core/src/lineage/project.ts:255`, wrapped by the `read_lineage` tool |

- `projectLineage` builds the inventory from the file system and the edges from the
  change log (`project.ts:436`). It walks the whole domain on every call
  (`lineage/fs-snapshot.ts:33`) (V).
- The version is stored twice on a document: as a token inside `parent_spec.name`
  and as `blueprint_version` (`mutate.ts:285`) (V).
- Identity has three names: `model_slug` in the Level 1 template, `knowledge_slug`
  in code (`changeset/conflicts.ts:107`), and a derived id (V).
- iNNfo 0.7.0 line 476 says migrating means creating a new copy; the code repins in
  place (V).
- The docs glossary still defines lineage as a deleted record file (V).

### Change history

| Aspect | How it works | Evidence |
| --- | --- | --- |
| File | `changes/<domain or model>_<author>_<stamp>_changes_NN.md`; one file is one batch | `nn-mcp/src/tools/propose-changeset.ts:133` |
| Batch facts | `applied_at`, `batch`, `status` and the evidence hashes sit in frontmatter; a change repeats them only where it differs | `nn-mcp/src/tools/apply-change.ts:2350`, `nn-core/src/changelog/load.ts:128` |
| Order | Sorted by applied time, stamp, file name and index | `nn-core/src/changelog/order.ts:42` |
| Write path | Propose validates; apply takes the `changes/.lock` lock, checks tampering and `base_hash`, bumps `knowledge_version`, stamps the facts and writes atomically | `apply-change.ts:520`, `:715`, `:2076`, `:2387` |
| Read path | `buildChangeLog`, then the drift check, which raises `EDITED_WITHOUT_RECORD`, `UNIT_WITHOUT_RECORD`, `EVIDENCE_UNKNOWN` and `EVIDENCE_SOURCE_CHANGED` | `nn-core/src/changelog/load.ts:219`, `drift.ts:190` |
| Volume control | Compact facts plus `set_fields`, which took one measured domain from 6.7 MB to about 1 MB. Nothing is ever archived | archived change `2026-11-10-changes-compact-format` |

Where the `changes` blueprint and the code disagree:

- The operation `review_gate` exists in `CHANGE_OPS` with four keys of its own
  (`changeset/types.ts:30`, `:92`) and not in the blueprint. The coNNtent blueprint
  depends on it (V).
- `review_gate` must not carry evidence (`types.ts:546`), while the blueprint says
  evidence is mandatory on every change (V).
- Seven frontmatter keys and two change keys are read or written by code and
  declared nowhere (V).
- The key `fields` is half-removed: an archived spec says it does not exist, and it
  is still typed, serialized and read (`types.ts:69`, `serializer.ts:94`,
  `conflicts.ts:241`) (V).
- `base_hash` has a second, undocumented job: it tells apart elements with the same
  name (`conflicts.ts:206`) (V).
- "Evidence is mandatory" is prose. The proposer fills `unknown`
  (`propose-changeset.ts:98`) and the drift check only warns (V).

### Source traceability

| Piece | On disk | Fields | Writer |
| --- | --- | --- | --- |
| Raw source | `sources/import/<file>`, `sources/sync/<alias>/`, `sources/conversations/` | none | the user or a sync |
| Sidecar | `<file>.<ext>_sidecar_NN.md` beside the raw file | `source_file`, `sha256`, `size_bytes`, `source_format`, `normalized_at`, `normalized_by`, four origin keys | only `cognitivize` (`nn-core/src/cognitivize/cognitivize.ts:57`) |
| Sources catalog | `sources/sources_NN.md` | concepts `Source` and `Synchronization` | nothing writes `Source`; only `Synchronization` is read |
| Artifact | any file under `artifacts/` | none; no registry | `produce_artifact` takes the path as its target (`nn-mcp/src/tools/produce-artifact.ts:80`) |

- The citation grammar is `<path>@## Heading` for a section, `<csv>@<row-key>` for a
  row, `<json>@/<pointer>`, a bare path, or a model address
  (`nn-core/src/sourceRef.ts:20`) (V).
- Two different hash checks exist. The sidecar `sha256` covers the raw bytes
  (`skills/nn-sources/scripts/lib/impact-checker.js:61`). The `evidence_sha256` of a
  change covers the cited file, which is the sidecar text when the citation points
  at a sidecar heading (`apply-change.ts:466`) (V).
- The same hash can be stored four times: sidecar `sha256`, `evidence_sha256`, and
  the `content_hash` and `output_hash` of `source-package` (V).
- `origin_uri` is defined on `Source`, `Synchronization` and `Sidecar`; `raw_path`
  repeats `source_file`; `format` repeats `source_format` (V).
- `resolve_sources` has a path that reads citation-typed element fields
  (`nn-mcp/src/tools/resolve-sources.ts:94`). Those fields are banned on Level 3, so
  the path is dead for valid documents (V).
- An artifact is linked back to its sources in three ways that do not agree: the
  evidence of `produce_artifact`, declared `sources` in frontmatter, and a regex
  scan of the artifact content in the console
  (`nn-core/src/console/files-inventory.ts:270`) (V).

## Domain console

The console is one self-contained HTML file: a shell, four JSON slots, and an
inlined bundle. It is built in two stages, and it can write back to the domain.

### Build time, in this repository

1. `nn-console.bundle.js` (854 KB) is not compiled. `scripts/lib/console-bundle.js:13`
   concatenates 14 hand-written UMD files from `iNNfo/specs/bluepriNNts/console/` in
   a fixed order under a version banner (V).
2. `scripts/build-console-payload.mjs:56` bundles `nn-core/src/console/index.ts` with
   esbuild into `console-payload.generated.cjs` (501 KB) and the slug module into
   `nn-slug.generated.js` (V).
3. `scripts/export-address-module.mjs` produces `nn-address.generated.js` (V).
4. `scripts/build-console-shells.mjs:31` rewrites the version pin inside
   `artifact_shell.html` (V).
5. All of these are committed and released under the `nn-console` key, which the
   skills manager installs flat into `~/.agents/console` (V).

### Export time, against a domain

Everything goes through `writeConsole` in `scripts/export-console.mjs:1227`. The CLI
and the MCP tool `regenerate_console` both call it.

1. Find the assets: `$INNFO_CONSOLE_DIR`, then the repository, then the script's
   folder, then `~/.agents/console` (`export-console.mjs:91`).
2. Read every `*_NN.md` of the domain, skipping `node_modules`, `.git`, `artifacts`,
   `dist` and `docs` (`:242`).
3. Keep the console models plus a hardcoded allowlist of catalogs: `sources`,
   `artifacts`, `procedures` (`:324`).
4. Load the changesets, unless they exceed 20 MB or 5,000 changes (`:863`).
5. Inventory every file of the domain with hashes and sidecars, with up to 2 MB of
   text snippets (`:921`).
6. Resolve each blueprint: local URL, package tiers, canonical registry, then a retry
   by family name; walk its `includes`
   (`nn-core/src/console/schema-resolution.ts:253`).
7. Build the payload. Only elements with a frozen slug are accepted; any other
   throws `UNFROZEN_MODEL` (`nn-core/src/console/payload-builder.ts:269`).
8. Merge all models: ids become `modelId@slug`; concepts, fields and matrices are
   deduplicated first-wins (`export-console.mjs:1481`).
9. Turn the changesets into a pseudo-model called `changes` (`:1665`).
10. Run each view's `.data.mjs` in Node to collect its data
    (`scripts/console-views.mjs:397`).
11. Fill four slots: `nn-config`, `nn-schema`, `nn-model`, `nn-view-data`
    (`export-console.mjs:555`).
12. Inline the CSS, the bundle and each view, then hash every inline script into the
    content security policy (`console-views.mjs:508`, `:533`).
13. Warn above 30 MB, fail above 100 MB after one retry without citations, and write
    atomically (`console-views.mjs:545`, `export-console.mjs:2027`).

Regeneration runs after `propose_changeset`, `apply_change` and `init_knowledge`. A
failure is returned as data and never undoes an apply
(`nn-core/src/console/console-regeneration.ts:114`). No git hook regenerates a
console (V).

### In the browser

The built-in tabs are Domain, Knowledge, Files and Matrices. The `procedure` view of
the procedures blueprint is promoted beside them. Blueprint views and then domain
views follow (`nn-runtime.js:3668`, `:3790`, `:3802`). Review is a panel, not a tab.

The console has four write paths:

| Write path | What it writes | Where |
| --- | --- | --- |
| Drafts | `localStorage`, key prefix `nn-console:v4:` | `review.js:14` |
| Export | A changeset file to download, or an agent prompt to the clipboard | `nn-runtime.js:6748`, `:6272` |
| Connect folder | A new file in `changes/` through the File System Access API; it checks the domain id and never overwrites | `nn-fsa.js:62` |
| Save snapshot | The whole page, with edits, to an HTML file | `nn-runtime.js:7000` |

The page has no channel to the MCP server: the policy is `connect-src 'self'` and
the bundle is forbidden to call `fetch`. Approval always returns through the agent,
which calls `apply_change` (V).

### What is generic and what is hardcoded

Generic: the concept rail, element cards, fields, markers and matrices all come from
the schema slot, derived from the Concept, Field and Matrix Definitions (V).

| Hardcoded for | Where | What |
| --- | --- | --- |
| coNNtent | `scripts/export-console.mjs:54` | Layout checker loaded from the blueprint folder by relative path |
| coNNtent | `export-console.mjs:1752` to `:1822` | Model and Voice picklists with version heuristics |
| coNNtent | `export-console.mjs:1893` to `:1933` | Delivery sanitizer that strips cost, budget and prompt fields |
| coNNtent | `nn-core/src/console/schema-resolution.ts:237`, `nn-runtime.js:3775` | Catalog limited to Model and Voice; the view id `conntent-delivery` |
| metrics | `studio.js` (42 KB in the core bundle) | A profit-and-loss grid with one caller, the metrics timeline view |
| procedures | `nn-runtime.js:819`, `:3790`, `:8049` | Checks for the concept name `Work`; promotion of the `procedure` view |
| core catalogs | `export-console.mjs:324` | The set `sources`, `artifacts`, `procedures` |

Views reach the console by naming convention, with no manifest:
`<blueprint>/assets/console-view-<slug>.js`, an optional `.data.mjs` beside it, and
`consoles/views/*.js` in the domain. Every view is trusted code with full access to
the page (`console-views.mjs:14`) (V).

### Versioning and staleness

- Nothing loads from a CDN. The testlab console has no `<script src>` (M).
- The export still writes a `runtime` object with two CDN URLs that the runtime
  never uses. One names `cogNNitive/cogNNitive`, the other
  `cogNNitive/cogNNitive-web` (V).
- `CONSOLE_VERSION` in `nn-runtime.js:17` is `0.1.0`; the package is 0.36.1. The
  three real consoles all report `0.1.0` (V).
- Freshness compares each model's hash and version, and for the bundle and shell
  only their file times (`export-console.mjs:464`) (V).
- A domain with changesets always reports `stale`: the embedded list gains a
  synthetic `changes` entry, and the check requires equal lengths (`:482`, `:1733`).
  Reproduced on the testlab fixture (V).
- `needs-registry.json` is read only by the shell guard. The export writes the same
  seven needs every time (`export-console.mjs:1403`) (V).
- The shell carries four static policy hashes that match no script in an exported
  console (M).
- Real sizes: 2.0 MB, 3.0 MB and 7.0 MB for the three real domains, of which the
  model slot is 5.5 MB in the largest (M).

## The three real domains

All three show the same picture: a few kNNowledge documents surrounded by machinery,
with no reliable record of which blueprint version each document follows. They were
read and not touched. Only aggregate figures are given here.

| | Domain A | Domain B | Domain C |
| --- | --- | --- | --- |
| Files and size | 877 files, 637 MB | 919 files, about 1.3 GB on disk | 707 files, 4.7 GB |
| What fills it | Derived `.wav` files, 94.5% | Media, 98% | Raw audio, 99% |
| kNNowledge documents | 3 | 7 | About 40 |
| Layout | Current, with legacy leftovers | Current in name; the knowledge lives under `series/` and `kNNowledge/` is empty | Mixed: legacy sections, `template::` beside `blueprint::` |
| Blueprints | 3 local, user-authored | One shipped blueprint, cached one version behind the newest | 1 user-authored; one shipped blueprint used by 8 documents is not cached |
| Documents with `blueprint_version` | 0 of 3 | 1, one version behind its cache | 3 of about 60 across the three domains |
| Changesets | 54 files, 11,260 records, 6.6 MB | 37 files, 333 records, 182 KB | 58 files, 1,406 records, 860 KB |
| Unresolved changesets | 7 | 11 | 4 |
| Evidence values | 257 file paths, 253 `unknown` | 258 `decision`, 55 `unknown`, no file path | 96 citations of a sidecar heading |
| Sidecars | 91, none orphaned; 10 sources have none | 16, from one imported bundle | 174; the catalog lists 94 |
| Console size | 3.0 MB | 2.0 MB | 7.0 MB |

### Version identity in practice

- `spec_version` carries three meanings in these files: the Level 1 grammar, a
  blueprint version (one domain uses V_0-4-7 for its own blueprint), and the version
  of the changes schema (V).
- The `changes` blueprint is referenced at three to five different versions inside
  each domain and is never cached locally (V).
- In one domain the `metrics` document says spec V_0-4-0 while the cached blueprint
  says spec V_0-5-0 and blueprint V_0-5-2 (V).
- The spec cache holds the same file two to five times; `defiNNition_V_0-1-0` exists
  five times across the three domains. Old Level 1 versions are never pruned: one
  domain caches seven (V).

### Provenance in practice

- In Domain A the change log is about 12.8 times the size of the kNNowledge it
  describes; 10,329 of its records are `update_field` (M).
- Domain A has two sidecar shapes: 76 written by the transform tool with
  `source_file`, and 15 written by a transcription worker with `sources:` holding
  absolute Windows paths (V).
- Domain C registers each source three times: 174 sidecars, a legacy provenance
  document with the same five fields for 165 items, and a catalog of 94 entries (V).
- Its artifact catalog lists 47 artifacts; 10 files are missing and 38 of 76
  artifact files are not listed. The catalog has no field for the source or the
  procedure (V).
- Domain B keeps a second ledger outside the change log,
  `.cognnitive/video/ledger.jsonl`, with 307 lines including cost (V).
- No kNNowledge document in Domain B cites a source structurally; one states the
  rule in prose (V).

### Drift nothing reports

- Entry documents point to missing files: 14 rows in Domain C, 1 in Domain B, which
  also has one document that is not listed (V).
- A blueprint in Domain A names a procedure file that does not exist
  (`source-package/spec_NN.md:387` in the local copy) (V).
- One Domain B document has mojibake on 11 lines, and an exported bundle README has
  it sealed into its manifest hash (V).

### What users built around the structure

| Workaround | Domain | What it says about the design |
| --- | --- | --- |
| Fields such as `<field>_source::` beside each value | C | There is no citation at field level in the document |
| One-element documents, one per project folder | C | Distributed storage arrived after the need |
| Console views with a hard-coded data snapshot (358 KB) | A | A view cannot yet declare its data cleanly |
| A hand-written console compiler | C | The console could not be customised at the time |
| Characters kept in `library/characters/` with a procedure that has no frontmatter | B | The blueprint has no concept for them |
| Handoff files, `odd/tasks` and staging reports inside the domain | all three | Intent between sessions has no home |

Inferred, by rough byte count: user kNNowledge is about 3% of the text in Domains A
and C and about 1% in Domain B. The rest is change log, console, sidecars and cached
specs.

## Issue record and backlog

Issues close fast and come back: the median time to close is 31 hours, and five
themes were filed again after being fixed.

The tracker holds 121 issues in cogNNitive/cogNNitive, all filed by the maintainer
between 2026-09-27 and 2026-11-12. 107 were closed at the time of the count and
three more on the day of writing. Half closed within 24 hours; the slowest tenth
took more than 17.8 days. There are 497 pull requests against those 121 issues, so
most work runs through the backlog and OpenSpec changes, not issues.

### Themes

| Theme | Issues (open) | Examples |
| --- | --- | --- |
| coNNtent video pipeline | 24 (2) | #107, #357, #607, #616 |
| Domain console | 23 (3) | #91, #231, #488, #569 |
| Domain layout, legacy files, migration | 14 (0) | #103, #109, #234, #561 |
| CI, release, generated-file freshness | 14 (1) | #139, #285, #321, #596 |
| Version identity, pinning, distribution | 12 (0) | #95, #209, #564, #611 |
| Change log and MCP contract | 10 (3) | #188, #491, #558, #560 |
| Lineage, provenance, sources | 9 (2) | #225, #528, #587, #614 |
| Blueprint authoring and procedures | 8 (1) | #116, #229, #360, #617 |
| Docs and site | 4 (3) | #279, #355, #430 |
| Dev process and worktrees | 3 (0) | #120, #191 |

### Problems that came back

| Chain | Issues, in order | Root cause |
| --- | --- | --- |
| Release pin and version skew | #95, #285, #564, #611 | RC2 |
| Provenance moved into changes with no removal path | #491, #560, #614, #587 | RC3, RC4 |
| Generated files going stale | #123, #231, #321, #611 | RC5 |
| The `[[Name]]` reference form | #116, #590, #596, #617 | RC3 |
| Legacy blueprint copies and layout detection | #105, #109, #234, #180 | RC3 |
| Distributed storage and its consumers | #561, #563, #564, #606, #611 | RC4 |
| A red integration branch | #122, #139, #140, #170, #569, #590, #596 | RC5 |
| Video fixes that regressed | #370 then #616; #396 then #609 | RC6: untested on Windows |

### Eight issues that explain the most

| Issue | What happened | State |
| --- | --- | --- |
| #560 | One banned `sources::` blocks every changeset on a model, and no operation removes a field. A real domain cannot be repaired. | Open |
| #611 | Preflight answered OK on a broken domain: it scanned only `kNNowledge/` and missed an engine at V_0-15-1 against documents at V_0-18-0. | Fixed in #618; the nn-mcp part is unreleased |
| #606 | The changeset exported by the console was rejected by `produce`, and the intake hid the reason: about six blind retries. | Fixed in #618 |
| #607 | Captions were aligned against the wrong audio. An empty `catch {}` swallowed the cache mismatch. | Fixed in #618 |
| #616 | The coNNtent pipeline failed on Windows in four ways. The fix itself says no end-to-end render was verified. | Fixed in #618 |
| #617 | Shipped procedures use `[[Name]]`; the validator reports 96 errors; the stepper requires the form. | Open, no backlog item |
| #488 | A real console was 12.8 MB, close to the abort limit; 97% was one JSON array. | Degrades now; compaction pending |
| #109 | The self-heal of `check_domain` wrote the legacy parent chain back into a migrated domain. | Fixed |

The eleven issues #606 to #616 come from one real production run. Every workaround
in that session was a patch to the installed copy under
`~/.agents/bluepriNNts/coNNtent/`, which the next install overwrites.

### What the backlog covers

`openspec/backlog_NN.md` held 8 ideas, 20 items and 11 planned batches at the
analysed commit. Read against the 17 problems of this analysis:

| Problem | Backlog item or issue | Coverage |
| --- | --- | --- |
| Version identity | none; #564 fixed one piece | Not covered |
| Level 0 and Level 1 drift | none | Not covered |
| `changes` blueprint against code | none | Not covered |
| `nn-update` writes without a change | none; #587 is adjacent | Not covered |
| Three provenance channels | `remove-banned-l3-field`, #560, #614 | Partial |
| A banned field blocks every changeset | `remove-banned-l3-field`, #560 | Full, but in no batch |
| Dead `artifacts` and `Source` schema | none | Not covered |
| Change-log growth, `unknown`, stale proposals | archived compact format only | Partial |
| Console placement, coupling, versioning | `console-payload-size`, `console-shell-actions`, `markers-review` | Partial: size and header only |
| Committed generated files | `derived-artifacts-consolidation` (b4a) | Partial: no registry, no catalogs |
| Release gaps and Windows | none | Not covered |
| Reference syntax | #617 | Full, no backlog item |
| Legacy leftovers | `docs-skills-retirement`, #430 | Partial |
| Entry-document and catalog drift | `workspace-manifest-section-ownership`, #587 | Partial |
| Core blueprint uniformity | none | Not covered |
| Contracts shipped before consumers | none | Not covered |
| Procedure text, hazards, slugs | `coNNtent-procedures`, #617 | Partial |

### Registers that disagree

- `console-catalog-picklist` is the only active change and its code merged on
  2026-11-10.
- `number-field-changeset` is marked shipped and still listed; its issue #558 is
  closed.
- `console-payload-size` still cites #488, which is closed.
- `coNNtent-procedures` cites evidence from 2026-11-04; the folder now ships three
  more procedures.
- #565 and `episode-layout-drift` describe the same thing and both look fixed (I).
- Eight items have no batch, including the only one that unblocks a real domain.

## Build, CI and release

CI is fast and advisory: a pull request takes two to three minutes, nothing is
required before a merge, and three areas are never exercised against current code.

### What CI does and does not run

- All eight jobs in `ci.yml` and the release job run on `ubuntu-latest` (V).
- `main` has no branch protection and no rulesets; the API answers 404 and an empty
  list (V).
- `test/apply-change.test.ts` and `test/concept-drift-and-gate.test.ts` run only on
  Windows (`iNNfo/packages/nn-mcp/vitest.config.ts:15`), so they run in no CI job.
  The coverage thresholds were lowered four times, to 77 / 63 / 73 / 77 (V).
- The UI smoke test opens a console exported on 2026-10-13 and never loads the
  current bundle (`test/ui/testlab_smoke.py:34`) (V).
- Never run in CI: the nn-sources integration tests, a real coNNtent render, and an
  end-to-end console export (V).

### Failure rate since 2026-10-15

| Branch | Succeeded | Failed | Cancelled | Failure rate |
| --- | --- | --- | --- | --- |
| `main` | 61 | 3 | 0 | 4.7% |
| `dev` | 296 | 56 | 20 | 15% |
| Session and feature branches | 612 | 237 | 22 | 27% |

In the last week counted, `dev` failed 16 of 51 runs (31%). The tag-driven release
succeeded 79 times and failed twice, both during hand-cut releases.

### Committed derived files

Commits are counted over 30 days. "Build" means the file could be produced by the
release or the test run and leave the tree.

| File | Size | Generator | Guard | Commits | Verdict |
| --- | --- | --- | --- | --- | --- |
| `test/fixtures/testlab/domaiNN_console.html` | 1.3 MB | `regen.js:83` (a no-op) | none | 138 | Build or delete |
| `bluepriNNts/catalog.json` | 12 KB | `blueprint-catalog.mjs` | yes | 105 | Keep; commit `release_tag` as a placeholder |
| `console/console-payload.generated.cjs` | 501 KB | `build-console-payload.mjs` | yes | 98 | Build |
| `console/nn-console.bundle.js` | 854 KB | `build-console-bundle.mjs` | yes | 95 | Fetched at the tag; build in release |
| `skills/nn-sources/.../nn-core.generated.cjs` | 429 KB | `build-core-mirrors.mjs` | yes | 43 | Ships in the tag; build in release |
| `coNNtent/.../nn-core.generated.cjs` | 1.02 MB | `build-core-mirrors.mjs` | yes | 33 | Ships in the tag; build in release |
| `docs/innfo/blueprints/catalog.json` | 12 KB | copied by `regen.js:67` | none | 26 | Delete: byte-identical copy |
| `skills/nn-skills-lifecycle/scripts/skills-manager.js` | 124 KB | `build-skills-manager-bundle.mjs` | yes | 21 | Ships in the tag |
| `nn-core/src/schema/canonical-registry.ts` | 166 KB | `generate-canonical-registry.mjs` | yes | 20 | Load at build time |
| `nn-mcp/bin/nn-mcp.bundle.js` | 926 KB | `tsup` | none | 18 | Build in release |
| `console/nn-address.generated.js` | 29 KB | `export-address-module.mjs` | none; a `--check` exists and is not wired | 8 | Build |
| `skills/nn-update/.../nn-core.generated.cjs` | 364 KB | `build-preflight-primitives.mjs` | yes | 7 | Ships in the tag |
| `testlab/artifacts/*_20261013T045336Z.*` | about 2 MB | an old export | none | 1 | Delete after QW-A6 |

nn-core therefore exists in the repository in five built forms: the console payload,
three skill mirrors and the nn-mcp bundle.

### The gate

| Group in `verify.js` | Count | Note |
| --- | --- | --- |
| Test suites, discovered by shape | about 110 | `--fast` skips 25 slow ones |
| Freshness guards from the shared list | 11 | Also run by pre-push and regenerated by pre-commit |
| Other freshness checks | 4 | Outside the shared list, so pre-commit never regenerates them |
| Retired-vocabulary guards | 6 | Overlapping, about 1,100 lines |
| Structure and inventory guards | 13 | Includes the line-count guard with a missing target |

The same gate is defined in four places: `verify.js`, `ci.yml`, `pre-push-check.js`
and `check-integrity.js` (V).

### Release keys

| Key | Covers | Version comes from | Tags since 2026-10-15 |
| --- | --- | --- | --- |
| `blueprints` | `iNNfo/specs`, console included | commits | 27 |
| `skills` | `skills/` | commits | 22 |
| `nn-console` | the console folder and two scripts | `package.json`, by hand | 26, counting the old name |
| `nn-mcp` | the nn-mcp package | `package.json`, by hand | 17, counting the old name |

- `bumpFor` in `scripts/release/plan-auto-tags.js:35` makes any `type!:` commit a
  major, `docs` included. That produced `skills-v3.0.0` (V).
- Nine commits under `nn-mcp/src` since `nn-mcp-v0.36.0` are unreleased because the
  version was not bumped (M).
- The release copies the committed nn-mcp bundle as it is (`run-release.js:94`). A
  bump without a rebuild would ship old code under a new version (V).
- The audit of 2026-11-10 counted two weeks on `dev`: 662 commits, of which 22% were
  OpenSpec documents, 157 merge commits and about 76 regeneration commits.

## Code architecture

The package boundary is clean, since nn-mcp imports nn-core only through its public
entry. The problems are inside: one very large function, layers that point both
ways, and logic copied instead of shared.

### Module map

| Directory | Files / lines | Responsibility | Layering note |
| --- | --- | --- | --- |
| nn-core root | 22 / 5,379 | entry barrel, resolver, mutate, source references | re-exports about 20 modules with `export *` |
| `parser` | 8 / 1,530 | frontmatter, sections, serializer, slug | depends on `sourceRef.ts` |
| `schema` | 9 / 2,046 | blueprint schema, composition, canonical registry | imports from `validator` |
| `validator` | 16 / 3,324 | single-file and domain validation, citations | imports lineage, sync, domain |
| `recursiveParser` | 10 / 1,892 | domain tree parse and index | imports `changelog` and `changeset` |
| `changeset` | 19 / 3,433 | types, parser, hasher, conflicts, lock | imports `console` and `changelog` |
| `changelog` | 7 / 1,369 | fold, drift and load of the log | imports `changeset`: a two-way edge |
| `console` | 12 / 2,808 | payload builder, citations, file inventory | imports the entry barrel: the one runtime cycle |
| `lineage`, `domain`, `scope`, `workspace` | 25 / 4,159 | projected lineage, skew, scope chain, manifest reconcile | |
| nn-mcp `server.ts` | 1 / 1,266 | tool registry and handlers | |
| nn-mcp `tools/` | 34 / 10,861 | tool implementations | public nn-core entry only |

### Largest units

| File | Lines | What is mixed in it |
| --- | --- | --- |
| `nn-mcp/src/tools/apply-change.ts` | 2,733 | One function of about 1,890 lines: lock, planning, gates, persistence with rollback, annotation |
| `scripts/export-console.mjs` | 2,515 | Discovery, payload merge, changes pseudo-model, coNNtent logic, HTML assembly, CLI |
| `nn-mcp/src/server.ts` | 1,266 | 24 tool definitions and their handlers |
| `nn-mcp/src/tools/validate.ts` | 1,244 | Three tools plus the evidence and drift collectors that `check_domain` also uses |
| `nn-mcp/src/tools/spec.ts` | 1,189 | Model lookup, blueprint resolution, listing and hydration, asset discovery |
| `skills/nn-innfo/SKILL.md` | 1,045 | Wizard, tool table, relationship rules, execution protocol |

### Logic that exists more than once

| Logic | Copies | Where |
| --- | --- | --- |
| Frontmatter parsing | 7 outside nn-core | `skills/nn-preflight/scripts/lib/yaml-lite.js`, `scripts/lib/yaml-parser.js`, `scripts/blueprint-catalog.mjs:166`, `scripts/lib/blueprint-version.mjs:11`, `scripts/check-usage-procedure.mjs:39`, `skills/nn-sources/scripts/lib/scanner-core.js:144`, the coNNtent `series-doc.mjs:22` |
| SHA-256 wrapper | 6 | see QW-C7 |
| File walker with its own ignore list | 5 | see QW-C11 |
| Version skew | 2 in nn-core, 5 counting installer, preflight and the coNNtent engine | see R1 |
| Domain scaffold | 2 | `nn-core/src/scaffold/domain.ts`, `skills/nn-sources/scripts/lib/bootstrap.js:115` |
| Version parser | 2 | `versionStatus.ts:80`, `apply-change.ts:106` |
| Core blueprint list | 2 | `scripts/blueprint-catalog.mjs:61`, `scripts/export-console.mjs:324` |

The two frontmatter parsers that matter most disagree on types: `level` is a number
through the nn-core parser and a string through `yaml-lite`.

### The MCP surface

- 24 tools, all registered in one table that drives listing and dispatch (V).
- Failure is reported three ways, and the success flag has three names (see R7) (V).
- Parameter names alternate: `domain` and `root`; `id`, `model` and `knowledge_id`;
  camelCase only in `resolve_sources` (V).
- Five undeclared aliases are accepted and one declared parameter, `intent`, is never
  read (V).
- `check_domain` is annotated read-only and writes (V).

### Failure handling

| Pattern in non-test source | nn-core | nn-mcp |
| --- | --- | --- |
| `catch` sites | 97 | 150 |
| Empty `catch` bodies | 14 | 13 |
| `catch`, then `continue` | 5 | 6 |
| `catch`, then return a default | 13 | 10 |
| `.catch(() => default)` | 16 | 38 |
| `as any` | 14 | 2 |
| `as unknown as` | 8 | 7 |

Most empty catches are documented and harmless: lock races, probing the next
resolution tier. These are not:

- `nn-mcp/src/tools/apply-change.ts:1695` skips unparseable models while checking
  what a delete would break.
- `nn-core/src/changelog/load.ts:87` and `changeset/history.ts:61` skip unparseable
  changesets, so history can vanish from reports.
- `nn-core/src/resolver.ts:371` returns the first match in directory order.
- `nn-core/src/workspace/integrity/versionStatus.ts:102` reports unparseable
  versions as equal.
- `nn-core/src/changeset/parser.ts:103` and `nn-mcp/src/tools/propose-changeset.ts:628`
  cast unchecked input to a typed shape.
- `nn-mcp/src/tools/apply-change.ts:477` drops all evidence hashes when one file
  cannot be read.

### Tests and vocabulary

- nn-core: 201 test files with about 1,825 cases, plus 33 colocated spec files with
  about 484. nn-mcp: 38 with about 235, plus 32 with about 496 (M).
- No skip lists were found beyond the two Windows-only suites (V).
- Deprecated words in non-test source: "workspace" 288 times in nn-core and 188 in
  nn-mcp; "template" 467 and 233 (M).
- Exports with no production caller: `getDefiNNe`, `mergeKnowledge` (a 184-line
  file), `listMutationOperations`, `unitLabel`, and the spec-pruning chain in nn-mcp
  (496 lines) (M, counted by occurrence).

## Skills and distribution

What a user runs is the installed copy, and the installer neither removes retired
skills nor protects local changes to blueprints.

### Skill inventory

Script lines exclude generated mirrors, which are counted on their own.

| Skill | `SKILL.md` lines | Scripts (files / lines) | Generated lines | Test files | Note |
| --- | --- | --- | --- | --- | --- |
| `skills/nn` | 160 | 1 / 69 | 0 | yes | Menu says `[m] Model`; the manifest says `[k] kNNowledge` |
| `skills/nn-innfo` | 1,045 | 2 / 91 | 0 | yes | Over any reasonable context budget |
| `skills/nn-sources` | 643 | 55 / 11,136 | 11,900 | 41 | |
| `skills/nn-preflight` | 135 | 13 / 6,506 | 493 | 5 | Describes checks the script does not run |
| `skills/nn-update` | 127 | 7 / 1,312 | 10,106 | 4 | Repins without a changeset |
| `skills/nn-upgrade` | 29 | 0 | 0 | none | Deprecated alias, still in the manifest |
| `skills/nn-skills-lifecycle` | 165 | 1 / 3,038 (a bundle) | | none | |
| `skills/nn-console` | 152 | 0 | 0 | none | Not in the manifest, so not distributed |
| `skills/nn-design-presets`, `nn-site-generator` | 61, 67 | 0 | 0 | none | |
| `coNNtent/skills/nn-conntent` | 216 | 197 / 34,198 | 25,639 | 126 | Lives inside the blueprint folder |

### Instructions that contradict the code

- `skills/nn-innfo/SKILL.md:200` and `:408` name `INNFO_MODELS_DIR`; nn-mcp reads
  `INNFO_DOMAIN_DIR` (V).
- `skills/nn-innfo/SKILL.md:1042` teaches `[[Element Name]]`, which lines 636 and 966
  of the same file call malformed (V).
- The execution protocol at `:875` does not say whether a step's body or its fields
  are the instruction (V).
- `skills/nn-preflight/SKILL.md:79` to `:92` describe a layout check, a `sources::`
  check and an upgrade scan that `preflight-check.js` does not contain (V).
- `sources::` is still taught in nn-preflight, in `skills/nn-sources/citations.md`,
  in the nn-sources CLI output and in five workspace procedures (V).
- The activation gate is restated in nine skill files, and two skills each claim to
  own it (V).

### The installer

- It installs skills, blueprints, console assets and the nn-mcp bundle under
  `~/.agents`, pinned through `manifest/source.yaml` (V).
- It reads the catalog from the repository file when one exists, then from
  `cognnitive.com`, then from GitHub (`scripts/lib/skills-commands.js:1227`). The
  committed catalog has no `release_tag` for `coNNtent` and `changes`; the published
  one names `blueprints-v0.60.1` for both. So only an install run from a checkout
  refuses those two (V).
- Manifest skills get a modified-locally hash and a consent prompt. Blueprints and
  embedded skills are replaced without a diff (`:575`, `:1566`) (V).
- Nothing is ever pruned. A retired skill that is absent from the repository was
  still installed on the maintainer's machine with the description and triggers of
  `nn-conntent` (V, observed during the analysis).
- An embedded skill exists twice on disk, inside the blueprint package and under
  `~/.agents/skills` (V).
- Writes are atomic, the state file is migrated, and a failed blueprint install
  never records success (V).

### Preflight and the coNNtent engine

- `skills/nn-preflight/scripts/domain-probe.js:29` counts only `kNNowledge/*.md`, so
  the `nn` menu sees an empty coNNtent domain (V).
- `domain-audit.js` does follow placement rules and reports an engine that is behind
  the documents, with the exact install command (V).
- The coNNtent engine checks scene kind and language only when `blueprint_version`
  equals `V_0-15-0` (`kinds.mjs:108`, `:133`). The adopted version is `V_0-19-0`, so
  current documents skip both checks (V).
- The coNNtent spec still says documents pin `V_0-15-0`
  (`coNNtent/spec_NN.md:768`); the engine compares against the installed version
  (V).

### Docs and vocabulary

- Stale pages: the glossary, `mental-model.md`, `knowledge-lifecycle.md` and the docs
  index still describe a deleted lineage record; `docs/update/README.md:18` teaches
  `/nn-upgrade`; `docs/skills/templates/workflow/V_0-1-0/` teaches `models/` (V).
- `vocabulary.json` has 45 retired identifiers. Only the docs generator reads that
  list (V).
- It has no entry for source, citation, evidence, change, changeset or provenance
  (V).

| Retired identifier | In `skills/` | In `iNNfo/specs/` | In `docs/` | In packages |
| --- | --- | --- | --- | --- |
| `models/` | 23 | 30 | 7 | 84 |
| `workspace_NN.md` | 11 | 14 | 0 | 10 |
| `innfo-mcp` | 10 | 36 | 0 | 0 |
| `sources/nn/` | 1 | 41 | 13 | 0 |
| `model_version` | 3 | 16 | 6 | 21 |
| `target_template` | 0 | 16 | 0 | 0 |
| `INNFO_MODELS_DIR` | 3 | 7 | 0 | 0 |

Inferred: many of the hits in packages are intentional migration and guard code.
