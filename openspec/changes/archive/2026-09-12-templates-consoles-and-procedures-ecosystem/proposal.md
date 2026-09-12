# Proposal: Templates, Consoles, and Procedures Ecosystem

## Intent

Standardize and align all iNNfo Level 2 specification templates and Level 3 canonical samples under `iNNfo/specs/templates/`. Decouple `business-model` into a standalone core domain specification (removing `includes` so they remain exclusively on the composite `business` umbrella template), sanitize `analysis` (purging SWOT and removing `# NN index` from the Level 3 snippet), complete `### Summary` and `### Description` documentation on every Concept Definition for the Modeler UI sidebar, align specification versions across `catalog.json`, build domain-specific execution procedures and interactive blueprint consoles for each template, and guarantee 100% complete Ghostbusters Inc. canonical samples.

## Scope

### In Scope

1. **Template Decoupling & Hygiene**:
   - Remove `includes` (`organization`, `projects`) from `iNNfo/specs/templates/business-model/spec_NN.md`; ensure `business/spec_NN.md` is the sole composite template managing multi-domain inclusion.
   - Purge `SWOT` from `iNNfo/specs/templates/analysis/spec_NN.md` (tables, prose, matrices) and remove `# NN index` from its Level 3 example block.
2. **Modeler Sidebar Documentation Completeness**:
   - Ensure 100% of `# NN Concept Definition` entries across all active templates (`analysis`, `business-model`, `organization`, `projects`, `innovation`, `documentation`, `metrics`, `repository`, `video-generator`, `workspace`) contain mandatory `### Summary` and `### Description` sections.
3. **Spec Version & Catalog Alignment**:
   - Align `spec_version`, `parent_spec`, and `template_version` consistently across all templates and `iNNfo/specs/templates/catalog.json`.
4. **Domain Consoles & Procedures Ecosystem**:
   - Define domain-relevant execution procedures (`procedures/*.md`) and register them under `procedures:` in template frontmatter.
   - Provide interactive HTML blueprint consoles under `assets/` powered by `console/innfo-console.bundle.js` and declarative `needs[]`.
5. **Ghostbusters Canonical Samples (Level 3)**:
   - Provide complete, valid Ghostbusters Inc. samples for every active template (authoring missing samples for `business-model`, `repository`, `video-generator`, and refreshing `metrics`).

### Out of Scope

- Modifying the core parser or validation engine in `@cognnitive/innfo-core` (changes remain purely schema-, template-, asset-, and sample-level).
- Modifying frozen legacy templates (`base`, `cogNNitive`).
- Changing backend MCP protocol semantics.

## Capabilities

### New Capabilities

- `domain-consoles-and-procedures`: Domain-specific procedures and interactive blueprint console layouts across Organization, Projects, Analysis, Innovation, Documentation, and Repository.
- `ghostbusters-samples-suite`: Complete, fully-populated Level 3 Ghostbusters Inc. test suite for all active templates.

### Modified Capabilities

- `template-architecture-decoupling`: Strict boundary where `business-model` is pure standalone and `business` is the sole composite aggregator.
- `modeler-sidebar-rich-docs`: 100% concept documentation coverage for the right-hand sidebar in iNNfo Modeler.

## Approach

- **Standalone vs Composite**: `business-model` defines core business domain primitives without importing peer templates. The composite `business` template includes `business-model`, `analysis`, `organization`, `projects`, and `metrics`.
- **Blueprint-First Consoles**: All new HTML consoles follow the `artifact_blueprint.html` pattern, loading the shared bundle (`innfo-console.bundle.js` / `visuals.js`) and declaring modular dependencies via `needs[]` (e.g. `["concept-rail", "matrix-grids", "fulltext-search"]`).
- **Strict Grammar Compliance**: All Level 3 samples instantiate concepts directly under `# NN <Concept>` and omit `# NN index`. All reference fields use WikiLink syntax `[[...]]`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/business-model/spec_NN.md` | Modified | Remove `includes`, complete concept sidebar docs |
| `iNNfo/specs/templates/analysis/spec_NN.md` | Modified | Purge SWOT, fix L3 index snippet, complete sidebar docs |
| `iNNfo/specs/templates/*/spec_NN.md` | Modified | Complete `### Summary` & `### Description`, align spec versions |
| `iNNfo/specs/templates/catalog.json` | Modified | Update template catalog versions and paths |
| `iNNfo/specs/templates/*/procedures/` | Added/Modified | Domain execution procedures |
| `iNNfo/specs/templates/*/assets/` | Added/Modified | Domain interactive blueprint console layouts |
| `iNNfo/specs/templates/*/samples/` | Added/Modified | Canonical Ghostbusters Level 3 samples |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Spec version mismatch breaks resolver | Low | Run `verify.js` and validate parent spec chains with MCP |
| Duplicate concept names in composite `business` | Low | Verify additive composition rules and ensure distinct concept names across included templates |
| Console HTML breaks in `file://` mode | Low | Use blueprint slots and shared bundle without external runtime fetch requirements |

## Rollback Plan

Revert modified spec files, procedures, assets, and samples using git branch history. Model files in user workspaces are unaffected until they opt-in to new template versions.

## Success Criteria

- [ ] `business-model/spec_NN.md` has no `includes` and validates cleanly as standalone.
- [ ] `analysis/spec_NN.md` has no SWOT references and no `# NN index` in its L3 sample snippet.
- [ ] 100% of concept definitions across all active templates have `### Summary` and `### Description`.
- [ ] Every active template has at least one declared procedure and associated blueprint console or view asset.
- [ ] Every active template has a fully populated, passing Ghostbusters Inc. Level 3 sample.
- [ ] `node scripts/verify.js` and all monorepo integrity checks pass cleanly.
