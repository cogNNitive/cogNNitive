## Exploration: VideoScript minimal template + procedure + artifact (VUS export for VidGeNN)

### Current State

- iNNfo Level-2 templates live versioned-unversioned as `iNNfo/specs/templates/<name>/spec_NN.md` (frontmatter `level: 2`, `parent_spec: iNNfo_V_0-2-1`, `template_version`), discovered by `scripts/template-catalog.mjs` into `iNNfo/specs/templates/catalog.json`. `docs/innfo/templates/catalog.json` is a committed mirror copy. `docs/innfo/cdn/manifest.json` only tracks MCP bundle releases (`latest: v0.5.0`) — NOT templates.
- No VideoScript/VUS template, model, or procedure exists today. `grep` for `video_anydeo_specification|layer_level|scene_voice|VideoScript|VUS|VidGeNN` across the repo returns zero source hits; the only backlog entry is `openspec/backlog.md` #11 `feat/video-generator-template` (pipeline-oriented: source → narrative → AnyDeo script → asset, standalone-vs-workflow-specialization still open).
- VUS V_0-3-3 conformance source claimed in the request (`packages/core/specs/V_0-3-3.json`, 84 props across video/scene/layer/section scopes) was NOT found in this checkout (`glob **/specs/*.json` and `**/V_0-3-3*` return nothing; no `packages/core/` tree exists — code lives under `iNNfo/packages/innfo-core/` and `innfo-mcp/`). Effective conformance sources available in-repo are: (a) `anydeo-script-builder` skill knowledge — canonical VUS shape is `//ANYDEO_SPEC: V_0-3-3` + `# Video` (`video_anydeo_specification`, `video_title`) + `# Templates` (`@template base` + `scene_voice`) + `# Scenes` (`@base Title`, narration line, `@@ Layer` + `layer_type`/`layer_level`/`layer_asset_source`/`layer_generation_subject`/`layer_effects`/`layer_effect_speed`; levels 0–10 background / 20–40 primary / 50+ overlay; never `layer_z_index`), and (b) the external independent VidGeNN repo `ScriptParser.parse()` as byte-compatibility oracle. The 84-prop JSON must be treated as an external/unverified input until produced.
- innfo-core/innfo-mcp contain zero video logic (parser, validator, resolver, mutate, queryUnits, workspace integrity only) — the requested boundary (no video parsing/validation/render in core/MCP; only a generated `.md` file as interface) matches current architecture and requires no refactoring, only discipline.
- Template authoring precedent: minimal `blank` template (single `Content` concept, `summary` field, `importance` marker) shows the smallest valid Level-2 shape; `documentation/procedures/generate_docsify_suite_NN.md` and `metrics/procedures/create_projections_NN.md` show the procedure-as-Level-3-model pattern (`Work` steps with `input`/`output`/`tool` references + `Artifact`/`Tools` declarations) that `generate-VUS` should follow. Canonical samples (e.g. `Ghostbusters_V_0-2-0_procedures_NN.md`, `Ghostbusters_V_0-2-0_business_NN.md`) demonstrate the Ghostbusters-Inc. universe + 100% English + free-prose-descriptions rules.
- nn-template-audit compliance bar (from skill file): 7–8 criteria — strict frontmatter (no `concepts:`/`fields:` keys), `# NN index` with Concepts-only WikiLinks on L2 / NO index on L3, `type:: reference` for all entity links, Ghostbusters-Inc. sample universe, prose-vs-property scoping (`description::` on L2 fields, free prose on L3 elements), `### Summary` + `### Description` per Concept, 100% English, 100% field exhaustiveness in canonical samples. Note tension: the requested rock-bands L3 example (Queen / Led Zeppelin / AC/DC) VIOLATES criterion 4 if shipped as the canonical sample — it can only be an exploratory/throwaway fixture, while the committed canonical sample MUST be Ghostbusters-Inc.

### Affected Areas

- `iNNfo/specs/templates/videoscript/spec_NN.md` — NEW standalone Level-2 template (proposed): `VideoScript` concept (+ minimal release-info concept/fields), `# NN index`, field/marker/matrix definitions.
- `iNNfo/specs/templates/videoscript/samples/Ghostbusters_V_0-1-0_videoscript_NN.md` — NEW canonical L3 sample (Ghostbusters-Inc. universe, 100% English) for audit compliance.
- `iNNfo/specs/templates/videoscript/procedures/generate_VUS_NN.md` — NEW procedure model serializing Elements → VUS text (Work/Artifact/Tools pattern).
- `iNNfo/specs/templates/videoscript/samples/rock-bands-*.md` (exploratory fixture only, NOT canonical) — throwaway grounding for Queen / Led Zeppelin / AC/DC (estilo/epoca/tema_emblematico/descripcion → one Section, one Scene per band, two Layers per scene); must NOT ship if audit criterion 4 is enforced strictly.
- `iNNfo/specs/templates/catalog.json` — REGENERATED via `scripts/template-catalog.mjs` (do NOT hand-edit); `docs/innfo/templates/catalog.json` — mirrored copy (currently dirty in working tree — coordinate, do not clobber).
- `docs/innfo/cdn/manifest.json` — NOT affected (MCP bundle manifest only; currently dirty — leave alone).
- `iNNfo/packages/innfo-core/src/**`, `iNNfo/packages/innfo-mcp/src/**` — explicitly NOT touched (boundary: no video code).
- `openspec/backlog.md` #11 — referenced for merge/split decision (read-only during explore).

### Approaches

1. **Standalone minimal Level-2 template (`videoscript`) + Ghostbusters canonical sample + `generate-VUS` procedure**
    - Pros: matches `blank`/`procedures` precedent; auto-discovered by catalog script; independently versionable (`V_0-1-0`); keeps VUS export decoupled from workflow pipeline; smallest audit surface.
    - Cons: adds a new top-level template name to govern; needs explicit backlog #11 resolution note.
    - Effort: Medium

2. **Specialization of `blank` (or `procedures`) reusing existing Concepts**
    - Pros: no new catalog entry; fastest to prototype.
    - Cons: no specialization mechanism exists in-repo (only `derived_from` lineage refs and composite `includes:` on `business`); catalog discovery is directory-based so a specialization still needs a directory anyway; inherits unrelated semantics; audit criteria assume standalone templates — higher friction, no precedent.
    - Effort: Medium (plus inventing a specialization convention)

3. **Fold into backlog #11 `feat/video-generator-template` as one full-pipeline template (source → narrative → script → asset)**
    - Pros: single video story; avoids two video-adjacent templates.
    - Cons: #11 is pipeline-scoped and undecided (standalone vs workflow variant); merging forces the minimal VUS-export slice to carry pipeline concepts (inputs, transcripts, storyboards, assets) — violates the "minimal (VideoScript concept + release info)" constraint and the .md-only boundary; larger review, slower to value.
    - Effort: High

### Recommendation

Standalone minimal `videoscript` Level-2 template (Approach 1), run **in parallel** with backlog #11 — NOT merged, NOT split out of it:
- `videoscript` = minimal artifact-export concern (VideoScript concept + release info; L3 rock-bands fixture as throwaway grounding; `generate-VUS` serializer procedure; Ghostbusters-Inc. canonical sample for audit). Pure VUS `.md` output, byte-compatible with `ScriptParser.parse()`, no core/MCP code.
- Backlog #11 `feat/video-generator-template` stays as the pipeline-orchestration concern (sources → narrative → script → asset) and MAY later reference `videoscript` as its output stage or `include:` it — decision deferred to propose phase with a cross-link note.
- VUS conformance: treat `anydeo-script-builder` skill shape as normative floor; the 84-prop `V_0-3-3.json` MUST be located (VidGeNN repo or attached to propose) and pinned as the validation oracle before spec — propose phase MUST NOT invent property names beyond the skill's confirmed set (`video_anydeo_specification`, `video_title`, `scene_voice`, `layer_type`, `layer_level`, `layer_asset_source`, `layer_generation_subject`, `layer_effects`, `layer_effect_speed` — corrected 2026-09-09 after oracle round-trip: `layer_generation_text` does not exist in V_0-3-3; canonical key is `layer_generation_subject`).
- Registration: regenerate `catalog.json` via script + mirror to `docs/innfo/templates/`; no `cdn/manifest.json` change; no `business` composite `includes:` change (keep minimal; revisit in design if cross-reference wanted).
- Audit: ship Ghostbusters-Inc. canonical sample; keep rock-bands model as non-shipped exploration fixture (or quarantine under a clearly non-canonical path) to satisfy criterion 4 + 100% English (rock-band fields like `tema_emblematico` must be anglicised in committed artifacts).

### Risks

- `packages/core/specs/V_0-3-3.json` (84 props) not present in this checkout — VUS property inventory is unverified; generating against the skill summary alone risks `ScriptParser.parse()` byte-incompatibilities.
- Rock-bands canonical-vs-fixture tension: shipping Queen/Led Zeppelin/AC/DC as the sample breaks nn-template-audit criterion 4 (Ghostbusters-Inc. universe) and Spanish field names break criterion 7 (100% English).
- Dirty-tree collision: `docs/innfo/templates/catalog.json`, `docs/innfo/cdn/manifest.json`, `iNNfo/packages/innfo-mcp/**`, `openspec/changes/validator-robustness/tasks.md`, `temp/*` are modified/deleted by concurrent work — propose/spec phases must not touch or rebase over them silently; catalog regeneration must be sequenced after those land.
- Scope creep toward pipeline (#11) or toward render/parse code in core/MCP — both explicitly out of bounds; needs a one-line boundary restated in proposal.
- Template naming: `videoscript` vs `video-script` vs `video-generator` — decide once in propose; catalog name derives from directory.

### Ready for Proposal

Yes — propose phase can proceed with: standalone `videoscript` V_0-1-0 template scope (VideoScript + release info), `generate-VUS` procedure, Ghostbusters canonical sample + quarantined rock-bands fixture, .md-only VidGeNN interface, catalog-script registration, explicit backlog-#11-parallel note, and a mandatory VUS-oracle deliverable (locate/pin `V_0-3-3.json` or VidGeNN `ScriptParser` grammar before spec writing).
