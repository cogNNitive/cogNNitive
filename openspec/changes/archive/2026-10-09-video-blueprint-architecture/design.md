# Design: Video Blueprint Architecture & Ephemeral Overlays Migration

## Technical Approach

Two seams, matching the modified `cognnitive-video-engine` contract. **(1) Parser owns syntax**: a new PEG rule `BlockQuoteEvent` in `vus.peggy` turns `> kind: payload [opts]` lines into typed `OverlayEvent` AST nodes and stops the `Content` rule from swallowing them, so narration/TTS prose never contains directive tokens. The vendored mirror is rebuilt. **(2) Compiler owns semantics**: `remotion-scene-compiler.mjs` resolves `@template` / `@caption_template` / `@broll_template` from a referenced Level-2 blueprint and schedules every parsed `OverlayEvent` into a sequential, collision-free overlay track with computed enter/exit frames. The legacy `<!-- overlay: -->` path survives inside a single quarantined function under a `legacy:` marker. No JSON or CSS is authored in the Level-3 script.

## Architecture Decisions

| Decision | Option / tradeoff | Resolution |
|---|---|---|
| Where `>` is parsed | PEG grammar (rebuild mirror; single source of truth) vs. compiler regex (no rebuild; re-implements grammar, violates "MUST NOT scan script text with its own grammar subset") | **PEG grammar**; compiler consumes AST only |
| Blockquote shape | Free-form `>` vs. `kind: payload [opts]` | **`kind` ∈ {quote, lower-third, broll}`**, canonical `>` prefix, `[key=value]` options |
| Blueprint reference | Frontmatter (VUS has none) vs. global property | **`- video_blueprint: <relative path>`** property, resolved from `scriptSource` dir |
| Template inheritance | JSON blob in script vs. blueprint-declared VUS blocks | **VUS `@…_template` blocks in the blueprint body**; series file > domain `spec_NN.md` > system default |
| Legacy overlays | Delete vs. quarantine | **Keep, warn once, ledger** (compatibility window) |
| Overlay scheduling | Manual offsets vs. auto-sequential | **Auto-sequential** within scene; explicit offsets still honored |
| `> broll:` option schema | Rich free-form vs. minimal fixed set | **Minimal**: payload = media path; options `source` (credit), `duration` (int seconds or `Ns`; default from `@broll_template`), `fit` (`cover`\|`contain`; default `cover`), `position` (default `bottom`) — mirrors legacy `duration_seconds`/`position` naming |
| Series override location | Inline in `series_rules.md` (prose) vs. dedicated file | **Dedicated `series_blueprint.md`** sibling of `series_rules.md` — keeps VUS `@…_template` blocks out of editorial prose; `video_blueprint` resolution precedence: script-local → nearest series `series_blueprint.md` → domain `spec_NN.md` → system default |

## Data Flow

```
script.md ─┐                          ┌─ domain spec_NN.md (defaults)
           ├─→ PEG parse ─→ AST ─→ lowering ─→ Project.scenes[] ─┐
blueprint ─┘   OverlayEvent   overlay_events + clean scene_content │
                                                                   ▼
   Level-3 script ──→ RemotionSceneCompiler.compile()
                          │  resolve template per overlay kind
                          ▼
   manifest.tracks.overlays[] { fromFrame, durationInFrames,
                                enterAnimation, exitAnimation, config }
```

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/packages/innfo-video-parser/src/parser/vus.peggy` | Modify | Add `BlockQuoteEvent`; add `>` to `MarkerLine` |
| `iNNfo/packages/innfo-video-parser/src/parser/vus_parser.js` | Modify | Regenerate via `npm run build:grammar` |
| `iNNfo/packages/innfo-video-parser/src/parser/ast.ts` | Modify | Add `OverlayEventNode` |
| `iNNfo/packages/innfo-video-parser/src/parser/lowering.ts` | Modify | Push events to `scene.overlay_events`; exclude from `scene_content` |
| `iNNfo/packages/innfo-video-parser/src/domain/types.ts` | Modify | `overlay_events` optional on `SceneSchema` |
| `scripts/mirror/video-parser-entry.ts` | Modify | Re-export new types if needed |
| `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/scripts/lib/innfo-video-parser.generated.mjs` | Modify | Regenerate via `node scripts/build-video-parser-mirror.mjs` |
| `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/scripts/remotion-scene-compiler.mjs` | Modify | Blueprint loader/resolver, `>` event scheduling, deprecation warning, `legacy:` marker |
| `iNNfo/specs/bluepriNNts/video/skills/nn-video-script/scripts/scene/overlays/LowerThird.tsx` (and siblings) | Modify | Consume `enterAnimation`/`exitAnimation` |
| `iNNfo/specs/bluepriNNts/video/spec_NN.md` | Modify | Declare `@template`, `@caption_template`, `@broll_template` + resolution rules |
| `legacy-ledger.yaml` | Modify | Entry for the HTML-comment overlay path |
| `iNNfo/.../test/overlay-events.test.mjs`, `.../test/blueprint-resolution.test.mjs` | Create | New unit/integration tests |

## Interfaces / Contracts

```peggy
// vus.peggy — new rule, tried before Content; '>' added to MarkerLine
BlockQuoteEvent
  = _ ">" _ kind:("quote" / "lower-third" / "broll") _ ":" _ payload:SimpleValue opts:OptionList? EOL
  { return makeNode("OverlayEvent", { kind, payload: payload.trim(), options: opts || {}, loc: location() }); }
```

```ts
// ast.ts / lowered onto Scene
interface OverlayEventNode extends BaseNode { type:'OverlayEvent'; kind:'quote'|'lower-third'|'broll'; payload:string; options:Record<string,string> }
```

```js
// manifest.tracks.overlays[] entry
{ id, type, fromFrame, durationInFrames, enterAnimation, exitAnimation, config }
// template resolution precedence:
// script-local @…_template > series blueprint (video_blueprint) > domain spec_NN.md > system default
```

## Testing Strategy

Runner: `npm test` (Vitest in iNNfo workspaces); `node *.test.mjs` under skills, discovered by `node scripts/verify.js`. Strict TDD — write failing tests first.

| Layer | What to Test | Approach |
|---|---|---|
| Unit (Vitest) | PEG parses each `>` form; narration is token-free; legacy comment still recognized + warns | `innfo-video-parser` grammar/lowering tests |
| Unit (node:test) | `>` → one overlay track, sequential no overlap, enter/exit present; blueprint resolve + missing fallback warning | `skills/nn-video-script/test/*.test.mjs` |
| Integration | Mirror drift `--check`; `scripts/verify.js`; `legacy-ledger-guard.js` | Deterministic gates |

## Migration / Rollout

Legacy `<!-- overlay: -->` stays accepted through a compatibility window: `extractNarrationAndOverlays` is marked `// legacy:video-overlay/html-comment-overlays`, ledgered 1:1 (`id: html-comment-overlays`, path `remotion-scene-compiler.mjs`), and emits a one-time deprecation warning per compile. Remove only after all series scripts migrate and a maintainer signs off. Rollback: revert `vus.peggy` + `node scripts/build-video-parser-mirror.mjs`.

## Open Questions

- [x] Resolved: `> broll:` schema = payload media path + `source`/`duration`/`fit`/`position` (see Decision table).
- [x] Resolved: series overrides live in a dedicated `series_blueprint.md` (see Decision table).

## Delivery Strategy

Single change landed on `dev` via one session branch (this repo integrates through `dev`, not PR chains). The ~650–950-line estimate is accepted as one reviewable change; the deterministic gate (`node scripts/verify.js`) is the final barrier.
