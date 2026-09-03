# innfo-editor Compliance

## Purpose

This document describes how the `innfo-editor` application implements the defiNNe / iNNfo
specification requirements (`specs/**`), and how it validates that models meet those
requirements.

## defiNNe / iNNfo Compliance

| # | Requirement | Implementation |
|---|---|---|
| 1 | Filename follows level convention (`_NN.md`) | `validateFormatContent` — `conv-file-naming` check |
| 2 | `spec_version` in `V_MAJOR-MINOR-PATCH` form | `validateFormatContent` — `fm-version-format` check (`VERSION_RE`) |
| 3 | `spec_url` present | Frontmatter validation |
| 4 | `level` present | `validateFormatContent` — `fm-level` |
| 5 | If level > 0: `parent_spec` object with `name` and `url` | `validateFormatContent` — `fm-parent`; `validateModel` |
| 6 | If level = 3: model is lightweight (no `concepts`/`markers`/`matrices` in frontmatter) | Parser — level-3 models reference their template via `parent_spec` |
| 7 | Body begins with `> [!NOTE]` | `validateFormatContent` — `body-note` |
| 8 | Normative language uses RFC 2119 | Advisory (not programmatic) |

## Validators (`packages/innfo-core/src/validator`)

### `validateFormatContent` (raw content)

- **fm-level**: model must declare `level: 3`
- **fm-parent**: model must declare `parent_spec` with `name` and `url`
- **fm-version / fm-version-format**: `model_version` present and in `V_x-y-z` form
- **fm-title / fm-spec-version**: `title` and `spec_version` present
- **body-note**: body starts with `> [!NOTE]`
- **body-index**: taxonomy index block present (`# _NN index` with `[[wikilinks]]`)
- **body-concept-sections**: valid `_NN` section markers
- **body-element-markers**: elements use `* _NN Concept: Name` syntax
- **body-numbered-list-markers**: warns on numbered `_NN` markers (silently ignored)
- **body-invalid-bullet-chars**: only `*` and `-` are valid bullets
- **conv-file-naming / conv-type-field / conv-wikilinks**: naming, OKF `type`, and reference checks

### `validateModel` (template-aware)

- Concept sections must correspond to template concepts (error if unknown)
- Field values validated against template field schemas (`select` options, etc.)
- Matrix names must be declared in the template (warning if not)
- **Matrix cell values must belong to the matrix's declared `values` set** (R-MM-08) —
  the empty cell `-` and the boolean marker `X` are always accepted (warning otherwise)
- Marker usage validated against template markers

## Matrix Declarations (R-MM-08)

A matrix declaration lives in the template frontmatter and may carry:

```yaml
matrices:
  - name: "Journey map"
    source: "Journey"
    target: "Emotions"
    widget: "set"                      # optional; inferred from `values` when absent
    values: [Max, Very High, High]     # allowed cell values
    description: "Brief explanation."  # rendered in the matrices view
```

The editor resolves the widget from an explicit `widget`/`widgetType`, else infers it from
`values` (`1` value → `boolean`, numeric set → `scale`, multi-value set → `set`, none → `text`).
Cell values are rendered with the matching interactive widget in `MatricesGrid.vue`.

## Spec Resolution & Caching

The parent chain resolver (`src/services/SpecResolverService.ts`) implements the resolver
protocol from defiNNe:

1. **Local-first**: looks for the template in the workspace `specs/` directory
2. **Download-on-miss**: fetches `parent_spec.url` and persists to `specs/`, write-once
   (an existing file is never overwritten — `specs/` content is immutable by convention,
   so there is no separate cache directory or staleness to track)
3. **Recursive**: follows `parent_spec` until level 0
4. Template matrix declarations are propagated to the model root node as `__matrix_defs`
   (via `normalizeMatrixDecl`), so the matrices view, matrix summaries and the
   metamatrix config share one source of truth.

## Serialization

`serializeModel` (in `packages/innfo-core`) preserves matrix declarations including
`values`, `widget`/`widgetType`, `description`, `label`, `min_color`, `max_color`, and
`params` (legacy). Round-trips through parse → serialize → parse are lossless for these fields.

## Versioning

Specs are immutable once published (`specs/**`) — every spec artifact is addressable only
by its own versioned filename, so a bump always creates a new file rather than mutating or
re-syncing an alias (see `spec-versioning`, R-SV-01/R-SV-02).

