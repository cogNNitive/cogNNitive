# Proposal: `visual-catalog` Level-2 BluepriNNt

## Intent

cogNNitive lacks a domain-agnostic way to catalog image-derived things with traceability from an Entry to its witness image and normalized source. Ad-hoc schemas recur; filename-as-identity reintroduces that conflation bug. This change ships a reusable L2 bluepriNNt.

## Scope

### In Scope
- New L2 bluepriNNt `visual-catalog`: concepts `Entry`, `Category`, `Evidence`; Free Matrix `Entry x Evidence`; markers `confidence`, `review`.
- Bundled SOP `procedures/ingest_visual_catalog_NN.md` (normalize → double-hash derive → extraction → dedupe → idempotent upsert → validate).
- Packaging registration + regenerated artifacts + delta specs (see Affected Areas).

### Out of Scope
- No L1/validator primitive for original↔derivative hashes (SOP-only).
- No sample doc, no new skill, no release pinning.

## Capabilities

### New Capabilities
- `visual-catalog-blueprint`: L2 schema + bundled SOP.

### Modified Capabilities
- `template-package-structure`: new package dir.
- `template-dynamic-discovery`: blueprint `procedures:` array.
- `template-procedures-manifest-and-discovery`: new `procedures/` file.
- `manifest-governance`: new `blueprints:` entry in `source.yaml`.
- `typed-source-references`: `Evidence.source` / `Entry.source` use `type:: citation`.
- `citation-source-resolution`: SOP resolves evidence citations.
- `template-ecosystem-documentation`: `templates.md` row.

## Approach

Author `iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md` (frontmatter: `spec_version V_0-3-0`, `level 2`, `parent_spec iNNfo_V_0-3-0`, `title "Visual Catalog App"`, `blueprint_version V_0-1-0`, `spec_url` on `cogNNitive-web@main`, `relationship_types.evaluable_matrix: true`, `procedures:` array). `Entry.name` is a STABLE identity, never a filename. `Evidence.image` is `type:: image`; `Evidence.source` is `type:: citation` into `sources/nn/`. The catalog is a standalone L3 document linked via `type:: knowledge` + `target_blueprint: visual-catalog`. The SOP references — never duplicates — `workspace/procedures/import_and_analyze_visual_source_NN.md` and defines the upsert key and hash discipline.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md` | New | Blueprint schema |
| `iNNfo/specs/bluepriNNts/visual-catalog/procedures/ingest_visual_catalog_NN.md` | New | Ingestion SOP |
| `manifest/source.yaml` | Modified | `blueprints:` entry |
| `catalog.json`, `samples.ts`, `manifest/body.md`, `docs/.../catalog.json` | Modified | Regenerated |
| `docs/innfo/documentation/templates.md` | Modified | Hand-added row |
| `openspec/specs/*` | Modified | Delta specs for 7 capabilities |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hash traceability convention-only | High | SOP carries double-hash steps + gate |
| Duplication with workspace visual SOP | Med | SOP links workspace procedure |
| Filename-as-identity regression | Med | Spec pins `Entry.name` identity |
| Idempotency key undefined | Med | SOP defines upsert key |
| Single PR exceeds ~400-line budget | Med | Minimal slice; chain if high |

## Rollback Plan

Revert the PR. New files are additive; only `source.yaml` and generated artifacts change. Re-run `sync:versions` and `blueprint-catalog.mjs`. No migration or release pins.

## Dependencies

- Normalization pipeline (`sha256`/`media_sha256`) and `blueprint-catalog.mjs`, `sync-versions.mjs`, `build-docs.mjs`.

## Success Criteria

- [ ] Blueprint validates; appears in `catalog.json` and `templates.md`.
- [ ] SOP discoverable via `list_blueprint_procedures`.
- [ ] Gates pass (`verify.js`, `check:versions`, `check:integrity`, `lint`, `typecheck`, `test`).
