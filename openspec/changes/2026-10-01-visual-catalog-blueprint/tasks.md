# Tasks: `visual-catalog` Level-2 BluepriNNt

## Review Workload Forecast

Estimated changed lines: ~360–440. Single PR per maintainer decision.

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High
```

**FLAG**: authored diff approaches 400 lines; with generated artifacts it likely exceeds. Maintainer pre-accepted size-exception.

## Phase 1: Test-first scaffolding (RED)

- [ ] 1.1 Add `innfo-core` fixture: minimal L3 `visual-catalog` doc; assert `Evidence.source`/`Entry.source` typed onto graph (`attachSchemaTypedCitations`).
- [ ] 1.2 Assert `list_blueprint_procedures('visual-catalog')` yields `ingest-visual-catalog` + source blueprint.
- [ ] 1.3 Run `npm run test`; confirm RED (assertion failures, not import errors).

## Phase 2: Blueprint schema (Group 1)

- [ ] 2.1 Create `iNNfo/specs/bluepriNNts/visual-catalog/spec_NN.md` with design frontmatter (`spec_version V_0-3-0`, `level 2`, `parent_spec` on `iNNfo_V_0-3-0`, `title "Visual Catalog App"`, `blueprint_version V_0-1-0`, `spec_url` on `main`, `evaluable_matrix: true`, `procedures:` array).
- [ ] 2.2 Add `# NN index` + concepts `Entry`/`Category`/`Evidence`; omit duplicate `name` field defs.
- [ ] 2.3 Add fields. Entry: `name` (stable identity, MUST NOT derive from filename), `category` ref→Category, `description`, `attributes`, `status` select, `tags`, optional `source` citation. Category: `parent` ref→Category, `description`. Evidence: `image` (`type:: image`), `captured_at`, `original_ref`, `source` citation→`sources/nn/`, `notes`.
- [ ] 2.4 Add markers `confidence`(scale)/`review`(boolean), Free Matrix `Entry x Evidence` (values `[primary, visible, partial]`, `widget:: set`) + `item-markers matrix`.
- [ ] 2.5 Close body with `# Visual Catalog App` prose + `# Concept Guidance Documentation` + L3 authoring template.
- [ ] 2.6 Run `node scripts/blueprint-catalog.mjs`; validate via innfo-mcp `validate_blueprint`.

## Phase 3: Bundled SOP (Group 2)

- [ ] 3.1 Create `procedures/ingest_visual_catalog_NN.md` frontmatter (`level 3`, `parent_spec` procedures, `knowledge_version V_0-3-0`).
- [ ] 3.2 Add index, Procedure entry, 9 Work steps (Normalize → Derive double hash → Extract → Dedupe → Idempotent upsert → Wire cells → Markers → Validate → Report), Tools/Artifact/Roles + matrices.
- [ ] 3.3 State idempotency keys (Entry.name; Evidence image path/hash; cell tuple) + double-hash discipline; reference—not duplicate—`workspace/procedures/import_and_analyze_visual_source_NN.md`.
- [ ] 3.4 Run `npm run test` (Phase 1 GREEN); `node scripts/blueprint-catalog.mjs --check`.

## Phase 4: Packaging / registration (Group 3)

- [ ] 4.1 Add `blueprints:` entry to `manifest/source.yaml` (`name: visual-catalog`, `repo`, `path`, `version: "V_0-1-0"`, `ref_key: blueprints`).
- [ ] 4.2 Regenerate `iNNfo/specs/bluepriNNts/catalog.json` via `node scripts/blueprint-catalog.mjs`.
- [ ] 4.3 Run `npm run sync:versions` (regenerates `samples.ts` + `manifest/body.md`).
- [ ] 4.4 Add `visual-catalog` row to `docs/innfo/documentation/templates.md`.
- [ ] 4.5 Run `npm run build:docs` (regenerates `docs/innfo/blueprints/catalog.json`).

## Phase 5: Code seam — conditional (Group 4)

- [ ] 5.1 RED: extend `innfo-core/tests/console-citations-payload.test.ts` — `media_sha256` passthrough and omission when absent; confirm RED.
- [ ] 5.2 GREEN: add `media_sha256?: string` to `ResolvedCitation` (`citations.ts:33-45`); surface `fm?.media_sha256` in `resolveCitation` (`:194-246`).
- [ ] 5.3 Confirm `resolve_sources.ts` unchanged; run `npm --workspace=@cognnitive/innfo-core test`.
- [ ] DROP Phase 5 (zero-code) if reclassified spec-only; `citation-source-resolution` becomes docs-only.

## Phase 6: Verification gates (Group 5)

- [ ] 6.1 `node scripts/blueprint-catalog.mjs --check`
- [ ] 6.2 `node scripts/verify.js`
- [ ] 6.3 `npm run check:versions`
- [ ] 6.4 `npm run check:integrity`
- [ ] 6.5 `npm run lint`
- [ ] 6.6 `npm run typecheck`
- [ ] 6.7 `npm run test`
- [ ] 6.8 `npm run format:check` (informational; no NEW drift)
