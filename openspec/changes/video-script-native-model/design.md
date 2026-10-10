# Design: Model video scripts natively as iNNfo (replace the VUS artifact)

## Technical Approach

The video script stops being a bespoke VUS file and becomes an iNNfo **Level-3
kNNowledge document** governed by a new **Level-2 `video-script` blueprint**. A
Series ships a thin L2 blueprint that `includes:` `video-script` plus an L3
**Template-data** document; scripts reference a `Template` instance through
`template::`. The engine's scene compiler is re-pointed to consume the structured
model returned by innfo-core `read_knowledge` (per `cognnitive-video-engine` spec)
instead of lowering a VUS parser AST. Grammar authority is the L1 meta-bluepriNNt
`iNNfo/specs/iNNfo_V_0-4-0_NN.md` (root primitives, `# NN` / `## NN Concept: Element`,
`key:: value` fields, index-block hierarchy). Remotion/TTS/avatar/cost/cache/
thumbnail/finalize are untouched; only their **input shape** changes.

## Architecture Decisions

| # | Decision | Options | Choice | Rationale |
|---|----------|---------|--------|-----------|
| D1 | Scene model source | keep VUS AST vs innfo-core `read_knowledge` | `read_knowledge` (canonical) + drift-guarded structural adapter fallback | Spec requires the engine "MUST NOT re-parse markdown"; the compiler consumes one structured contract. The zero-dependency installed skill cannot reach innfo-core, so `lib/knowledge-model.mjs` emits the same `read_knowledge` shape and is drift-guarded (DEV-5 reconciled). |
| D2 | Series specialization | fork blueprint vs `includes:` | `includes: [video-script]` | L1 `includes` is additive composition; one canonical base schema |
| D3 | Narration | `narration::` field vs Scene body prose | Scene **body prose** | Spec: "Narration MUST be the free-form prose BODY"; no field, no Concept |
| D4 | Ordering | `order::`/`index::` fields vs index block | `# NN index` list order | Spec: order equals list order, no declared ordering fields |
| D5 | Overlays | `>` blockquotes vs Layer kinds | Layer `type::` kinds | `ephemeral-overlays` delta retires blockquote syntax |
| D6 | Template link | inherited inline blob vs reference | `template::` reference field | `series-script-templates` delta; tool-agnostic script |
| D7 | Timing | declared duration vs derived | Derived from TTS/media | Spec: "MUST NOT declare duration or timing" |
| D8 | Teardown | incremental vs big-bang | Big-bang **after** compile proof | Proposal: "teardown only after the new pipeline compiles" |

### D9: Conditional validation per `Layer.type::`

iNNfo L1 has no native conditional-required primitive. Rejection of an unknown
`type::` is native (Field `type:: select` + `options::`). Per-type required fields
are enforced by a **blueprint-declared conditional contract**: the `video-script`
blueprint carries a `validation.conditional_fields` map (`type::` value → required
Field list), consumed by an engine pre-compile guard (`checkScript`) and by the
validator adapter. This keeps schema facts in the blueprint (no-prose-copy) and is
the one place the L1 spec is extended by convention.

## L2 Blueprint Shape — `video-script`

Frontmatter: `level: 2`, `parent_spec: iNNfo_V_0-4-0`, `blueprint_name: video-script`,
`blueprint_version`, `relationship_types.hierarchy.via: index block`.

`# NN index` nesting (Concept containment): `Video` → `Scene` → `Layer`; `Template`
as a top-level sibling.

| Concept | `type::` | Role |
|---------|----------|------|
| `Video` | `list` | Root; exactly one per document; no versioning |
| `Scene` | `list` | Child of `Video`; owns `Layer`s; body prose = narration |
| `Layer` | `list` | Child of `Scene`; discriminated by `type::` |
| `Template` | `list` | Top-level; instances live in the Series' L3 Template doc |

Every element carries the reserved immutable `slug::` (L1 §2.5); the engine derives
stable IDs (`scene_<slug>`, `layer_<slug>`) from it, never from display names.

### Field Definitions

| Field | Concept | `type::` | Notes |
|-------|---------|----------|-------|
| `slug` | Video/Scene/Layer/Template | `string` | Reserved identity; kebab-case |
| `title` | Video | `string` | Human title; manifest `compositionId` source |
| `template` | Scene | `reference` (`target_concepts: [Template]`) | `[[Series :: tmpl]]`; may be omitted |
| `music` | Scene | `file` / `audio` | Scene-level music; never a Layer |
| `transition` | Scene | `select` (`options:: [fade, slide-left, slide-right, wipe, none]`) | Optional |
| `type` | Layer | `select` (`options:: [presenter, background, b-roll, title, lower-third, caption, brand, quote]`) | Required discriminator |
| `asset` | Layer | `file` (`image`/`video`) | Required for `background`, `brand`, `b-roll` |
| `prompt` | Layer | `string` | Media synthesis prompt for `background`, `b-roll` |
| `text` | Layer | `markdown_inline` / `string` | Required for `title`, `lower-third`, `quote`, `caption` |
| `position` | Layer | `select` (`options:: [top, center, bottom, bottom-left, bottom-right]`) | Optional |
| `enter_animation` / `exit_animation` | Layer | `string` | Optional overlay motion |
| `level` | Layer | `string` (numeric) | Paint order; optional |
| `tool` | Template | `select` (`options:: [wavespeed, replicate, elevenlabs, edge-tts]`) | |
| `voice` | Template | `string` | Registered voice name / system voice |
| `model` | Template | `string` | Provider model id |

Conditional contract: `presenter`→`asset`|`prompt`; `background`→`asset`|`prompt`;
`b-roll`→`asset`|`prompt`; `title`→`text`; `lower-third`→`text`; `quote`→`text`;
`caption`→`text` (defaults to Scene body); `brand`→`asset`.

## L3 Document Shapes

**(a) Cocodrilo guion** (`el-cocodrilo-de-singapur_V_..._video-script_NN.md`),
`parent_spec` → `video-script`:

```markdown
# NN index
* [[El cocodrilo de Singapur]]
  * [[Hook]]
    * [[Narrator]]
  * [[Twist]]
    * [[Lower third]]

# NN Video
## NN Video: El cocodrilo de Singapur
slug:: el-cocodrilo-de-singapur
title:: El cocodrilo de Singapur

# NN Scene
## NN Scene: Hook
slug:: hook
template:: [[Series :: narrator-en]]
music:: assets/theme.mp3

(the free-form prose body is the narration; it is TTS-synthesized and timed)

# NN Layer
## NN Layer: Narrator
slug:: narrator
type:: presenter
prompt:: talking avatar, medium shot
```

**(b) Series blueprint + L3 Template-data doc**: the Series blueprint
`includes: [video-script]` (adds series tone fields only). Its L3 Template doc
adopts that blueprint and declares `Template` instances:

```markdown
## NN Template: narrator-en
slug:: narrator-en
tool:: wavespeed
voice:: narrator-latam
model:: minimax-tts/...
```

A guion may qualify cross-document refs: `[[Series :: narrator-en]]`.

## Engine Re-point

`compileVideo` (`video-engine-cli.mjs`) today does
`fs.readFileSync(script)` → `compiler.parseScript()` → `synthesizeScriptAssets` →
`compiler.compile()`. New flow:

    L3 doc ──read_knowledge──▶ structured model ──▶ resolve Templates ──▶
    per-Scene TTS (body prose) ──▶ measure duration ──▶ sequence Layers by
    list order ──▶ Remotion manifest ──▶ staging ──▶ render

- `remotion-scene-compiler.mjs`: delete `parseVus` import, `parseScript`,
  `parseBlueprintTemplates`, `OVERLAY_EVENT_SPECS`, `extractNarrationAndOverlays`,
  `BLUEPRINT_TEMPLATE_RE`, `DOMAIN_BLUEPRINT_SPEC`. Add an adapter that lowers the
  `read_knowledge` model into the existing `{ title, fps, width, height, scenes[] }`
  internal shape. `compile()` frame-timing/overlay code is retained; duration still
  comes from `audioDurations`/`audioAssets`, never from declarations.
- `asset-synthesizer.mjs` / `tts-generator.mjs`: narration text ← Scene body;
  voice/model ← resolved `template::` instance (never `scene_tts_model`). SHA-256
  cache key unchanged.
- Overlay scheduling: `quote`/`lower-third`/`b-roll` Layers sequenced by list order
  (existing sequential no-collision logic), enter/exit from Layer fields.

`type::` → renderer mapping (template doc 92 / layer primitive / `overlays/*.tsx`):

| `type::` | Remotion component | Manifest kind |
|----------|--------------------|---------------|
| `presenter` | `scene/AvatarFrame.tsx` | layer `talking_avatar` |
| `background` | layer primitive (image/video) | scene background |
| `b-roll` | `overlays/Broll.tsx` | overlay `broll` |
| `title` | `overlays/KineticTitle.tsx` | overlay `kineticTitle` |
| `lower-third` | `overlays/LowerThird.tsx` | overlay `lowerThird` |
| `caption` | `overlays/Captions.tsx` | overlay `captions` |
| `brand` | layer primitive (image) | layer `image` (high level) |
| `quote` | `overlays/Quote.tsx` | overlay `quote` |

## Sequencing / Rollout

1. Author the L2 `video-script` blueprint.
2. Author the Series blueprint + L3 Template doc; author the cocodrilo L3 guion.
3. Re-point the engine; validate the guion as L3; compile + render from iNNfo only.
4. **Then** big-bang VUS teardown. Rollback = revert session branch (worktree-isolated).

## Teardown Inventory

| Path | Action |
|------|--------|
| `iNNfo/packages/innfo-video-parser/` (`src/parser/vus.peggy`, `specs/V_0-3-3.json`, parser) | Delete package |
| `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs` | Delete mirror |
| skill `scripts/vus-parse.mjs`, `scripts/vus-spec.mjs`, `scripts/vus-parse-runner.mjs`, `scripts/check-script.mjs` | Delete |
| `scripts/build-video-parser-mirror.mjs` | Delete |
| `scripts/verify.js` §7b-ter `video-parser-mirror` drift-guard step | Remove registration |
| `iNNfo/specs/bluepriNNts/video/spec_NN.md` (old `video` blueprint `V_0-9-0`) | Replace with `video-script` blueprint |
| `legacy-ledger.yaml` → `html-comment-overlays` entry (`remotion-scene-compiler.mjs`) | Remove entry + marker |
| skill frontmatter `vus_spec:` block (SKILL.md) | Remove pin |
| `manifest/source.yaml` vendored-parser pin / registration | Remove |

## Affected Files

| File | Action |
|------|--------|
| `iNNfo/specs/bluepriNNts/video/spec_NN.md` | Modify → native `video-script` blueprint |
| `iNNfo/specs/bluepriNNts/<series>/` blueprint + L3 Template doc | Create |
| cocodrilo L3 guion (`..._video-script_NN.md`) | Create |
| `.../nn-video-script/scripts/remotion-scene-compiler.mjs` | Modify (read_knowledge adapter) |
| `.../scripts/video-engine-cli.mjs`, `asset-synthesizer.mjs`, `tts-generator.mjs` | Modify (template-resolved TTS) |
| `.../nn-video-script/SKILL.md` | Modify (drop `vus_spec`, VUS prose) |
| `scripts/verify.js`, `manifest/source.yaml`, `legacy-ledger.yaml` | Modify (deregister) |
| `docs/innfo/.../template-video.md`, `templates.md` | Modify (docs) |

## Testing Strategy

| Layer | What | How |
|-------|------|-----|
| Unit | Blueprint↔guion conformance; `type::` conditional rules; unknown `type::` rejected | `validate_knowledge` on cocodrilo; focused asserts on the conditional contract |
| Integration | Engine compiles manifest from iNNfo only; one TTS per narrated Scene; template voice/model honored | `RemotionSceneCompiler.compile()` on `read_knowledge` output; assert no `parseVus` symbol |
| E2E | Cocodrilo validates → compiles → renders; manifest has one track per Scene in list order | `node scripts/verify.js` + `node scripts/check-integrity.js`; grep asserts VUS symbols gone |

Deterministic proofs: cocodrilo validates as L3; engine compiles/renders from iNNfo
only; VUS package, scripts, and mirror removed and no longer referenced.

## Open Questions

- [ ] Where does the `validation.conditional_fields` contract get consumed — innfo-core validator extension vs engine pre-compile guard? (D9)
- [ ] Exact Series blueprint name/versioning convention to register in the catalog.
