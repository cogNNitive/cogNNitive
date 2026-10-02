# Design: `visual-catalog` Level-2 BluepriNNt

## Technical Approach

Ship a new, purely declarative L2 blueprint package plus one bundled SOP, then run the existing
generator pipeline. No runtime package changes. Two L3-facing behavioral deltas
(`typed-source-references`, `citation-source-resolution`) are **already implemented** in
`innfo-core` — verified at `iNNfo/packages/innfo-core/src/sourceRef.ts` / `validator/workspaceSources.ts`
(citation-typed fields wired onto the graph) and `citations.ts:197,244` (`sha256` surfaced by
`resolveCitation`, consumed by `resolve_sources.ts:78`). The only code seam this change touches is
one field addition in the citation payload (`media_sha256`).

## 1. Blueprint schema — `iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md`

Exact frontmatter:

```yaml
---
spec_version: "V_0-3-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-3-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-3-0_NN.md"
title: "Visual Catalog App"
blueprint_version: "V_0-1-0"
procedures:
  - id: "ingest-visual-catalog"
    name: "Ingest Visual Catalog"
    path: "procedures/ingest_visual_catalog_NN.md"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---
```

No `blueprint_name` (siblings omit it; `blueprint-catalog.mjs:86-93` derives the name from the directory).
`procedures:` matches the live pattern at `video/spec_NN.md:10-19`. `spec_url` targets `main`, never `dev`.

### Body (canonical level-2 order)

```markdown
> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/).

# NN index

* [[Entry]]
* [[Category]]
* [[Evidence]]

# NN Concept Definition

## NN Concept Definition: Entry
icon:: box
type:: list
color:: teal
weight:: 100

## NN Concept Definition: Category
icon:: folder-tree
type:: category
color:: blue
weight:: 90

## NN Concept Definition: Evidence
icon:: image
type:: list
color:: orange
weight:: 80

# NN Field Definition

## NN Field Definition: name
concept:: Entry
type:: string
description:: STABLE domain identity of the catalogued thing. MUST NOT be derived from an image filename or path.

## NN Field Definition: category
concept:: Entry
type:: reference
target_concepts:: [Category]
description:: The Category this Entry belongs to.

## NN Field Definition: description
concept:: Entry
type:: markdown_inline
description:: Free-text description of the Entry.

## NN Field Definition: attributes
concept:: Entry
type:: string
description:: Structured key/value attributes or inline Markdown notes for domain-specific facts.

## NN Field Definition: status
concept:: Entry
type:: select
options:: [candidate, confirmed, rejected]
description:: Review state of the Entry.

## NN Field Definition: tags
concept:: Entry
type:: string
description:: Categorization tags for grouping and discovery.

## NN Field Definition: source
concept:: Entry
type:: citation
description:: OPTIONAL citation to the normalized source (sources/nn/...) this Entry derives from.

## NN Field Definition: description
concept:: Category
type:: markdown_inline
description:: Human-readable explanation of the Category scope.

## NN Field Definition: parent
concept:: Category
type:: reference
target_concepts:: [Category]
description:: Parent Category for a hierarchical taxonomy.

## NN Field Definition: image
concept:: Evidence
type:: image
description:: The witness image. First declared `type:: image` field — resolves as the main image.

## NN Field Definition: captured_at
concept:: Evidence
type:: string
description:: Capture date or timestamp of the image.

## NN Field Definition: original_ref
concept:: Evidence
type:: string
description:: Workspace-relative path to the ORIGINAL binary asset in sources/import/ or sources/original/.

## NN Field Definition: source
concept:: Evidence
type:: citation
description:: Citation to the normalized source under sources/nn/ that carries sha256 (original) and media_sha256 (derivative).

## NN Field Definition: notes
concept:: Evidence
type:: markdown_inline
description:: Optional analyst notes about the image or attribution.

# NN Marker Definition

## NN Marker Definition: confidence
applies_to:: [Element]
widget:: scale
widget_config:: {"min": 0, "max": 10, "step": 1, "unit": "/10"}
icon:: gauge
color:: purple

## NN Marker Definition: review
applies_to:: [Element]
widget:: boolean
widget_config:: {"true_label": "Reviewed", "false_label": "Pending"}
icon:: check-circle
color:: green

# NN Matrix Definition

## NN Matrix Definition: Entry x Evidence matrix
source:: Entry
target:: Evidence
values:: [primary, visible, partial]
widget:: set
widget_config:: {"multi": true}
description:: Which Evidence witness(es) show each Entry, and how directly. N:M — many Entries may share one Evidence.

## NN Matrix Definition: item-markers matrix
source:: Entry
target:: Markers
```

`Category.name` and `Evidence.name` are intentionally **omitted**: `Category` inherits the element name
as its identity, and duplicate `## NN Field Definition: name` under two concepts is rejected by the
parser (repo precedent: `iNNfo/specs/bluepriNNts/documentation/spec_NN.md` deliberately avoids duplicate
`parent`/`order` across concepts). `Category.parent` and `Entry.category` are mutually referential — the
repo already ships mutual references (`documentation/spec_NN.md` `Page.parent ↔ Section`), so this is safe.

Close the body with `# Visual Catalog App` prose (`## Philosophy`, `## Objectives`, `## Specification`
tables for Concepts/Fields/Relationship Types) and `# Concept Guidance Documentation` with `## Entry`,
`## Category`, `## Evidence` sections (`### Summary / ### Description / ### Methodologies / ### Prompts`).
The full L3 authoring template inline at `# Visual Catalog App` uses:

```markdown
## NN Entry: <stable identity>
name:: <stable identity>
category:: [[<Category>]]
status:: candidate
tags:: [tag1, tag2]
source:: sources/nn/<file>.md#<slug>

## NN Evidence: <label>
image:: evidence/<file>.png
captured_at:: <iso-date>
original_ref:: sources/import/<file>.png
source:: sources/nn/<file>.md#<slug>
```

## 2. Bundled SOP — `procedures/ingest_visual_catalog_NN.md`

Frontmatter (copies `video/procedures/generate_video_script_NN.md:1-8` / `workspace/procedures/import_and_analyze_visual_source_NN.md:1-8`):

```yaml
---
level: 3
parent_spec:
  name: "procedures"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-3-0"
title: "Ingest Visual Catalog Procedure"
---
```

Body: `# NN index` (`[[Procedure]] [[Work]] [[Artifact]] [[Tools]] [[Roles]]`) → `# NN Procedure`
(catalog entry: `category:: ingestion`, `summary::`, `inputs_required::`, `outputs_expected::`,
`executed_by::`, `procedure_model:: procedures/ingest_visual_catalog_NN.md`) → `# NN Work` (9 steps) →
`# NN Tools` → `# NN Artifact` → `# NN Roles` → the 3 matrices
(`work-roles`, `work-tools`, `work-artifacts`).

Ordered `# NN Work` steps (root = `Ingest Visual Catalog`, `parent:: -`; children `parent:: [[Ingest Visual Catalog]]`, chained by `next::`):

1. **Normalize Source** — run `nn-trannsform` scanner; produce `sources/nn/<stem>.md` with mandatory
   frontmatter `source_file`, `sha256` (of the ORIGINAL), `size_bytes`, `normalized_at`, `normalized_by`.
   This is where the existing workspace SOP is invoked, not reimplemented.
2. **Derive and Optimize Derivative** — create the optimized/derived image; record `media_file`
   (companion path) and `media_sha256` (derivative hash) on the SAME normalized frontmatter.
3. **Extract Entities** — external Vision LLM / OCR: candidate Entries, Categories, and Evidence.
4. **Resolve and Deduplicate** — canonicalize `Entry.name`; merge synonyms into one Entry; collapse
   duplicate Evidence by image hash.
5. **Upsert Idempotently** — find-or-create by the deterministic keys below; never append blind.
6. **Wire Matrix Cells** — upsert N:M cells keyed by `(entry, evidence)`.
7. **Record Markers** — write `confidence` and `review` via `item-markers matrix`.
8. **Validate** — `innfo-mcp` `validate_knowledge` + `resolve_sources` on every Evidence.
9. **Report** — emit an ingestion report artifact.

**Idempotency keys (deterministic):**

| Record | Key |
|--------|-----|
| Entry | stable `Entry.name` (normalized case/whitespace; never a filename) |
| Evidence | `image` path if present, else normalized-source `sha256` |
| Matrix cell | `(entry.key, evidence.key)` tuple |
| Normalized source | `sources/nn/<stem>.md` (scanner is already hash-based) |

**Reference, do not duplicate.** The SOP MUST cite
`iNNfo/specs/bluepriNNts/workspace/procedures/import_and_analyze_visual_source_NN.md` for normalize /
hash / vision-extraction / companion-media mechanics, and add only what is catalog-specific (identity,
dedupe, upsert keys, double-hash verification gate).

## 3. Traceability data flow

```
Entry.name (stable identity)
   │
   ├─ Entry.source ───── citation ───────────────► sources/nn/<stem>.md#<slug>
   │                                                   │  frontmatter:
   └──── Entry × Evidence matrix ──► Evidence          │    source_file  (original path)
                                       │               │    sha256       (ORIGINAL hash)
                                       ├─ image        │    media_file   (derivative path)
                                       │  (main image) │    media_sha256 (DERIVATIVE hash)
                                       └─ source ──────┘
                                          citation
```

`resolve_sources` returns `sha256` today (`citations.ts:244`); `media_sha256` is omitted from
`ResolvedCitation` and MUST be added (see §6). **Where enforcement stops:** there is no L1 primitive that
asserts `sha256_original ↔ media_sha256_derivative` pairing. Verification is SOP-level and
maintainer-attested (step 2 writes the pair; step 8 compares the on-disk original against `sha256`).
A future validator would need: (a) `media_sha256` exposed on `ResolvedCitation`; (b) a rule that, when
both hash fields are present on a cited normalized source, re-hashes the referenced `source_file` /
`media_file` and fails on mismatch. That is a separate L1/E1 capability — explicitly out of scope.

## 4. Packaging / regeneration pipeline (ordered)

```bash
# 0. author sources
#    iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md
#    iNNfo/specs/bluepriNNts/visual-catalog/procedures/ingest_visual_catalog_NN.md

# 1. register distribution — add to blueprints: in manifest/source.yaml
#    - name: visual-catalog
#      repo: cogNNitive/cogNNitive-web
#      path: iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md
#      version: "V_0-1-0"
#      ref_key: blueprints

# 2. regenerate (order matters: catalog -> samples.ts + manifest -> body.md)
node scripts/blueprint-catalog.mjs        # iNNfo/specs/bluepriNNts/catalog.json
npm run sync:versions                     # samples.ts SHIPPED_BLUEPRINT_VERSIONS + source.yaml + manifest/body.md

# 3. hand-add the docs row
#    docs/innfo/documentation/templates.md  (+ row: Visual Catalog | V_0-1-0 | ... )

# 4. regenerate docs-derived artifacts
npm run build:docs                        # docs/innfo/blueprints/catalog.json, docs facts

# 5. gates
node scripts/verify.js
npm run check:versions
npm run check:integrity
npm run lint
npm run typecheck
npm run test
```

`manifest/body.md` is generated by `scripts/manifest/generate-manifest.js` (run inside `sync:versions`;
never hand-edit). The `blueprint_version` written by `blueprint-catalog.mjs` is normalized from the
frontmatter, so `V_0-1-0` renders as `V_0-1-0`.

## 5. Architecture decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| D1 Hash enforcement | SOP-level + `resolve_sources.media_sha256` passthrough | New L1/validator primitive | No L1 primitive pairs original↔derivative; a validator is a much larger, separate capability. |
| D2 Evidence modeling | Free Matrix `Entry x Evidence` | Evidence as a per-Entry field | Native `evaluable_matrix` primitive; expresses N:M and makes dedupe visible as separate cells. |
| D3 Catalog placement | Standalone L3 document linked by `type:: knowledge` + `target_blueprint: visual-catalog` | Sibling in the same domain file | Keeps the catalog domain-agnostic and independently validatable; `parent_spec` is enforced. |
| D4 Concept set | Exactly `Entry`, `Category`, `Evidence` | Adding `EvidenceSet`/`Batch`; renaming `Entry`→`Item` | Three concepts cover the motivating case; extra concepts are speculative (YAGNI). |
| D5 Markers | Keep `confidence` + `review` | Dropping markers in slice 1 | Both are cheap, and `confidence` carries the extraction-certainty signal the SOP already produces. |
| D6 Sample + skill | Defer both | Shipping a `samples/` doc and `nn-visual-catalog` skill | Review-budget discipline; a skill can later declare `blueprints: [visual-catalog]` with no schema change. |
| D7 `blueprint_name` | Omit | Adding `blueprint_name: "visual-catalog"` | All siblings omit it; `blueprint-catalog.mjs` derives the name from the directory. |

## 6. Seams / boundaries

- **No new skill** — the SOP is discovered via `list_blueprint_procedures` (frontmatter `procedures:`),
  consistent with `openspec/specs/template-dynamic-discovery`.
- **No L1 change** — `spec_version` stays `V_0-3-0`; no new root primitive.
- **No new runtime dependency** — purely data + docs + generated artifacts.
- **Single code seam (already-shipped deltas aside):** `ResolvedCitation` in
  `iNNfo/packages/innfo-core/src/console/citations.ts` (interface at `:39-52`, payload at `:244`) lacks
  `media_sha256`. Add it next to `sha256`, sourced from `fm?.media_sha256`. `resolve_sources`
  (`innfo-mcp/src/tools/resolve-sources.ts`) passes the array through unchanged, so no MCP change is
  needed. If the maintainer reclassifies this as spec-only, the change reduces to zero code and
  `citation-source-resolution` becomes a documentation-only delta.

## 7. Testing strategy (`strict_tdd: true`, `npm run test`)

| Layer | What to test | Approach |
|---|---|---|
| Unit | `ResolvedCitation.media_sha256` passthrough; absent field omitted (not defaulted) | `innfo-core` `console-citations` spec: `resolveCitation` over a fixture source whose frontmatter carries `sha256` + `media_sha256`, plus one with neither. RED first. |
| Integration | The blueprint parses and validates; SOP is discoverable | `innfo-mcp`/`innfo-core` fixture: a minimal L3 `visual-catalog` model + the blueprint; assert citation typing and `list_blueprint_procedures` yields `ingest-visual-catalog`. |
| Generator | Catalog picks up the new package | Existing `scripts/blueprint-catalog.test.mjs` is generator-level; add a fixture dir or rely on `--check` against the committed `catalog.json`. |
| Gates | Repo-wide drift | `node scripts/blueprint-catalog.mjs --check`, `node scripts/verify.js`, `npm run check:versions`, `npm run check:integrity`, `npm run lint`, `npm run typecheck`, `npm run test`. |

TDD order: write the `media_sha256` unit test RED (only if the code seam is kept), then implement; the
blueprint/SOP/docs tasks are validated by the gate commands plus the fixture integration test.

## 8. Migration / rollout

No data migration. New files are additive; only `manifest/source.yaml`, the regenerated artifacts
(`catalog.json`, `samples.ts`, `manifest/body.md`, `docs/innfo/blueprints/catalog.json`) and the
`templates.md` row change. Rollback: revert the PR and re-run `sync:versions` + `blueprint-catalog.mjs`.
No release pins and no tag fan-out in this change (`validate-manifest` is `--release` only).

## 9. Open questions

- [ ] `Entry.attributes` type: `string` (key/value or inline Markdown) vs a `markdown_inline` field — resolved as `string` here; confirm during apply.
- [ ] Does `widget_config` on a `boolean` marker accept both `true_label`/`false_label` in the editor's renderer? Verify against `introduction`'s marker rendering before shipping.
