# Changelog

## Unreleased (2026-09-05)

### iNNfo L1 spec — `iNNfo_V_0-2-1` adopted
- **`iNNfo_V_0-2-1` is now the adopted L1** (`status: "Stable"`,
  `DEFAULT_INNFO_VERSION = 'V_0-2-1'`). `iNNfo_V_0-2-0_NN.md` stays frozen and
  immutable (write-once, R-SV-02). The patch closes the V_0-2-0 regression where
  `target_template` (documented in V_0-1-0) had been dropped from the Field
  Definition property table and the metaschema.
- **`target_template` documented for `type:: model` fields.** Field Definitions
  of type `model` may declare `target_template` naming the template the
  referenced submodel must conform to; validated by `innfo-core`
  (`references.ts`).
- **Model Fields (`type:: model`) normative paragraph.** Workspace-relative or
  `./`-relative paths, WikiLink wrapping, and the `target_template` conformance
  rule are now spelled out in the L1 spec.
- **Qualified Cross-Model References.** A `reference` or `model` field MAY target
  an element in another model via `[[Model Title :: Element Name]]`.

### Templates
- All `_V_0-2-0_` L2 templates migrated to `parent_spec: iNNfo_V_0-2-1` +
  `spec_version: V_0-2-1` (filenames and `template_version` unchanged).
- **`innovation`** gains `initiativeBusinessModel` — a `type:: model` field on
  `Initiative` with `target_template: business`, so each initiative can carry its
  own Business-template submodel.

### Editor & Core
- `DEFAULT_INNFO_VERSION` → `V_0-2-1`; serializer default `spec_version` → `V_0-2-1`;
  `init-model` scaffolding writes `spec_version: V_0-2-1` + `spec_url` → V_0-2-1.

## Unreleased (2026-09-01)

### iNNfo L1 spec — `iNNfo_V_0-2-0` adopted
- **`iNNfo_V_0-2-0` is now the adopted L1** (`status: "Stable"`,
  `DEFAULT_INNFO_VERSION = 'V_0-2-0'`). The adopted version is defined by that
  constant, not by editing older spec files: `iNNfo_V_0-1-0_NN.md` is immutable
  (`spec-versioning` R-SV-02), stays byte-unchanged, and remains resolvable forever
  for models authored against it. `status` uses the `defiNNe` vocabulary
  `Draft | Stable | Deprecated`; `iNNfo_V_0-2-0` moves from `Draft` to `Stable` as
  part of adoption.
- **`includes` duplicate-name rule.** When two composition sources declare a
  Definition of the same primitive with the same name, an **AST-identical** body
  is now silently merged into a single entry (previously any duplicate name was an
  ERROR). Bodies that differ are still an ERROR naming both sources. This lets two
  independent templates each carry a shared Definition (e.g. two slices of a
  former template both declaring the same `importance` Marker) and still compose.
- **`model` added to the type enums.** `Concept Definition` and `Field Definition`
  both accept `type:: model` (a field/concept whose value is a reference to another
  iNNfo model). Already present in `innfo-core` (`ConceptType`, `ConceptField.type`);
  now sanctioned by the L1 spec.

### Templates
- **`business` decomposed.** `business_V_0-2-0` is a pure composite that
  `includes` two new first-revision templates: `business-model` and `analysis`
  (each `spec_version: V_0-2-0`, `template_version: V_0-1-0`, carved out of the
  former monolithic `business_V_0-1-0`). `business_V_0-1-0_NN.md` stays frozen.
- **`blank`, `cogNNitive`, `innovation`, `procedures`** gain a `_V_0-2-0_NN.md`
  file (`parent_spec: iNNfo_V_0-2-0`, `template_version: V_0-2-0`, body copied
  verbatim). Their `_V_0-1-0_` files stay frozen.
- `organization` and `projects` already shipped `_V_0-2-0_` variants on this branch.
- Shipped samples are the `Ghostbusters_*` set, one per template.

### Core (`@cognnitive/innfo-core`)
- `resolveTemplateSchema` / `mergeSchemaInto`: same-named Definitions from
  different `includes` sources are compared by a new `canonicalizeDefinition`
  (exported) — property order, surrounding whitespace and the order of set-like
  arrays (`applies_to` / `options` / `target_concepts`) do not count. Identical →
  merged; different → collision ERROR (unchanged for the differing case).

### Editor (`@cognnitive/innfo-editor`)
- `DEFAULT_INNFO_VERSION` / `DEFAULT_TEMPLATE_VERSION` → `V_0-2-0`;
  `SHIPPED_TEMPLATE_VERSIONS` now maps all nine template slugs. Home/setup starter
  sample URLs re-pointed to the `_V_0-2-0_` samples.

### Tooling
- `npm run check:spec-version` / `check:spec-urls` / `check:specs` wired in
  `package.json`; CI job `spec-integrity` runs `check:spec-urls`.
  `scripts/check-spec-version.mjs` gains `--with-skills` to also scan
  `../actioNN/skills`.

## Unreleased (2026-08-19)

### Spec tree consolidation
- Collapsed `specs/latest/` + `specs/v0.2.0/` + `specs/v0.2.1/` + `models/specs/` into
  a single flat `specs/` tree: `specs/{defiNNe,iNNfo}_V_x-y-z_NN.md` at the top level,
  level-2 templates under `specs/templates/{name}/` with their own `samples/`.
- Level-2 templates gain their own `template_version` field, independent from
  `specification_version` (previously templates had no version identity of their own).
- Deleted 2 orphan template folders with zero code references (`businessV2`, `biz`).
  (An earlier draft of this entry also listed `cogNNitive`; that template was kept
  and later given a `_V_0-2-0_` file — see Unreleased 2026-09-01.)
- `parent_spec` stays `{name, url}` (not collapsed to a bare `parent:` string) to keep
  the resolver's write-once immutability guarantee and version-bump detection working.
- See `openspec/changes/spec-version-simplification/` for the full proposal/spec/design.

## v0.2.1 (2026-08-01)

### Business template patch — `business_V_0-2-1`
- Added per-matrix `description`, `widget` and per-matrix `values` to the business template
  matrix declarations (`specs/v0.2.1/level2/business/business_V_0-2-1_NN.md`). The
  Functions-Positions Matrix is now a boolean assignment matrix (`values: [Assumes]`);
  evaluative matrices keep the 9-point `set`.
- `specs/v0.2.0/**` stays frozen; `specs/latest/level2/business/business_NN.md` re-synced.
- New `specs/v0.2.1/INDEX.md` + Ghostbusters sample pinned to `business_V_0-2-1`.

### Core (`@cognnitive/innfo-core`)
- `MatrixDecl` gains `description`; YAML reader tolerates `widget` → `widgetType`
  (R-MM-08).
- `serializeModel` now round-trips matrix `values`, `widget`/`widgetType`,
  `description`, `label`, `min_color`, `max_color` (previously dropped).
- New `deriveMatrixWidgetType` / `normalizeMatrixDecl` helpers (widget inference from
  `values`: 1 value → `boolean`, numeric → `scale`, multi → `set`).
- `validateModel` validates matrix cell values against the declared `values` set
  (`-` and `X` always accepted; out-of-set values produce a warning).
- `recursiveParser` `__matrix_defs` propagation now carries `values`/`description`
  and the inferred widget.

### Editor (`@cognnitive/innfo-editor`)
- Fixed "Empty → Empty text" matrix header: concept pills now render source/target
  names (`hide-empty` support in `BlockPill`).
- Matrix cells use the declared `values` as the `set`/`scale` widget options; out-of-set
  values (e.g. legacy `X`) are still displayed.
- Matrix `description` rendered under the grid header and in the matrix pill tooltip.
- `MetamatrixConfig` edits `values` and `description`.
- `BlockMatrixSummary` / `BlockSheet` read matrix definitions from `__matrix_defs`
  (template source) instead of the model's own frontmatter.
- Spec resolver and matrix def propagation unified via `normalizeMatrixDecl`.

## v0.2.0 (2026-07-03)

### BREAKING: Renamed FORMAT → iNNfo
- **Structural marker**: `_F` → `_NN` across all source code, tests, and documentation
- **File suffix**: `_F.md` → `_NN.md` for all current-version files
- **Packages**: `@cognnitive/format-core` → `@cognnitive/innfo-core`, `@cognnitive/format-mcp` → `@cognnitive/innfo-mcp`, `@cognnitive/format-editor` → `@cognnitive/innfo-editor`
- **Version bump**: V_0-1-5 → V_0-2-0 (MAJOR, breaking)
- Legacy `_F.md` files are no longer parsed by the V_0-2-0 parser

## v0.1.0 (2026-07-01)

Initial release of the iNNv0 specification ecosystem.

### Specs
- defiNNe V_0-1-0 — Meta-specification (level 0)
- FORMAT V_0-1-0 — Format specification (level 1)
- business V_0-1-0 — Business template (level 2)
- procedures V_0-1-0 — Procedures template (level 2)
- kb V_0-1-0 — Knowledge base template (level 2)

### Models
- Ghostbusters V_0-1-0_business — Business model example
- TeamKB V_0-1-0_kb — Knowledge base model example

### Packages
- @cognnitive/format-core v0.1.0 — TypeScript parser, resolver, validator
