# Design: VideoScript minimal template + procedure + artifact

## Technical Approach

Ship standalone L2 `videoscript` V_0-1-0 per the `blank` precedent: one `spec_NN.md` (VideoScript + release info), one Ghostbusters L3 sample, one `generate-VUS` procedure-as-model (Work/Artifact/Tools steps, per `metrics/procedures/create_projections_NN.md`). The emitted `.md` is the sole VidGeNN interface. Oracle pin gates any prop beyond the confirmed 9.

## Architecture Decisions

### Decision: Standalone template vs specialization vs #11 fold-in

| Option | Tradeoff | Verdict |
|---|---|---|
| Standalone `videoscript/` dir | New name to govern; smallest audit surface, discovery works as-is | **Chosen** |
| Specialize `blank`/`procedures` | No specialization mechanism exists (only `derived_from`); still needs a directory | Rejected |
| Fold into backlog #11 pipeline | Forces sources/storyboards/assets into a minimal export slice | Rejected (parallel link only) |

### Decision: VidGeNN grammar as oracle, not a JSON copy

| Option | Tradeoff | Verdict |
|---|---|---|
| Pin live `ScriptParser.parse()` grammar/file | Byte-compatibility proven, not assumed | **Chosen** |
| Vendor `V_0-3-3.json` copy | Copy drifts; file absent from this checkout | Rejected as oracle |
| Skill summary alone | Risks invented props / parse failures | Floor only, gated to confirmed 9 |

### Decision: Explicit `order` field for sequencing

| Option | Tradeoff | Verdict |
|---|---|---|
| Explicit numeric order field on Section/Scene/Layer | Deterministic output independent of authoring order | **Chosen** |
| Document order = output order | Fragile under edits; untestable | Rejected |

### Decision: Script-only catalog registration, sequenced after dirty tree lands

| Option | Tradeoff | Verdict |
|---|---|---|
| `node scripts/template-catalog.mjs` + mirror to `docs/innfo/templates/` | Zero drift; dir name = catalog name, `template_version` authoritative | **Chosen** |
| Hand-edit `catalog.json` | Drift vs `--check`; breaks regen contract | Rejected |

## Data Flow

```
L3 videoscript model ──→ generate-VUS (procedure steps) ──→ VUS .md ──→ ScriptParser.parse()
   (Elements + order)       (map → emit → verify)              (only interface)
```

Serializer algorithm (per Element, sorted by `order` ascending):
1. VideoScript element → `# Video` (`- video_anydeo_specification: V_0-3-3`, `- video_title:`) + `# Templates` (`@template base` + `- scene_voice:`).
2. Section element → grouping comment only (no VUS syntax); its child Scenes emit under `# Scenes` in order.
3. Scene element → `@base <Title>`, then `- scene_voice:` (inherited unless overridden), then narration as bare plain-text line (never `- ` prefixed, never quoted).
4. Layer element → `@@ <Name>` + confirmed props only; `![...](...)` refs resolve to `layer_asset_source`; bands 0–10 bg / 20–40 primary / 50+ overlay; unconfirmed props dropped pre-oracle.
5. Emit `//ANYDEO_SPEC: V_0-3-3` first line; LF endings.

## Anti-Goals

- No parser/validator/renderer code in `innfo-core` or `innfo-mcp` — `.md` is the only interface.
- No pipeline scope (#11 sources, storyboards, asset pipeline) in template or procedure.
- No rock-bands model shipped as canonical (quarantined fixture at most).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `iNNfo/specs/templates/videoscript/spec_NN.md` | Create | L2 frontmatter (`level: 2`, `parent_spec: iNNfo_V_0-2-1`, `template_version: V_0-1-0`); Concepts-only `# NN index` (`[[VideoScript]]`, `[[ReleaseInfo]]`); Concept/Field/Marker blocks for confirmed 9 + `order`; `type:: reference` links; `### Summary` + `### Description` per Concept |
| `iNNfo/specs/templates/videoscript/procedures/generate_VUS_NN.md` | Create | L3 procedure (`# NN Work` map/emit/verify + `# NN Artifact` VUS `.md` + `# NN Tools` oracle) |
| `iNNfo/specs/templates/videoscript/samples/Ghostbusters_V_0-1-0_videoscript_NN.md` | Create | Canonical L3: Ghostbusters-Inc., English-only, exhausts every field (1 Section, 2 Scenes, 2 Layers each) |
| `iNNfo/specs/templates/catalog.json` + `docs/innfo/templates/catalog.json` | Generate | Regen via script + mirror only, after concurrent dirty files land |
| `iNNfo/packages/innfo-core/**`, `innfo-mcp/**` | Untouched | Zero video logic (anti-goal, verified by diff check) |

## Interfaces / Contracts

L2 frontmatter contract (cf. `blank/spec_NN.md`): no `concepts:`/`fields:` keys; schema lives in body blocks. L3 sample: `level: 3`, `parent_spec: videoscript_V_0-1-0` + URL, `model_version: V_0-1-0`. VUS emit order: `//ANYDEO_SPEC` + `# Video` / `# Templates` / `# Scenes`; `[[X]]` refs resolve in-model only, never emitted raw.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Template audit | Frontmatter, Concepts-only index, Ghostbusters universe, English-only, exhaustiveness | `nn-template-audit` 7-criteria checklist |
| Unit | `validate_model` on L2 + canonical L3 | `innfo-mcp validate` via existing Vitest harness (`npm --prefix iNNfo run test`) |
| Integration | Round-trip: output → pinned oracle file | Serialize sample, parse, assert zero errors + scene/layer counts survive; unconfirmed-prop drop case |
| Guard | Zero core/MCP diff; catalog `--check` clean | `git diff --stat iNNfo/packages/` empty; `node scripts/template-catalog.mjs --check` |

## Migration / Rollout

No migration. Rollback: delete `videoscript/`, re-run catalog regen + mirror. Regen only after in-flight dirty `catalog.json`/`manifest.json` work lands; never hand-edit.

## Open Questions

- [x] Oracle pin (recorded 2026-09-09, task 1.1): VidGeNN @ `036f5667d99fa76c6d6ce8f2e016675b3c85266a` — oracle files `packages/core/src/parser/Parser.ts` (`ScriptParser.parse()`, peggy grammar + lowering), `packages/core/src/parser/ast.ts`; secondary ref `packages/core/specs/V_0-3-3.json`; demos under `public/demos/`. Grammar governs over JSON on conflict.
- [x] Rock-bands quarantine path: `iNNfo/specs/templates/videoscript/exploration/rock-bands-fixture_NN.md` (outside `samples/`, anglicised, marked non-canonical).
- [ ] Backlog #11 cross-link wording (parallel-run note placement).
