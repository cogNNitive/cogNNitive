# Proposal: Video Blueprint Architecture & Ephemeral Overlays Migration

## Intent

Migrate video production scripts from monolithic VUS file headers to cogNNitive's canonical Level 2 (`bluepriNNt`) and Level 3 (`kNNowledge`) architecture, while introducing Markdown-native blockquote (`>`) syntax for ephemeral play-by-play overlays (captions, quotes, B-Roll).

## Scope

### In Scope
- **Level 2 Video Blueprints (`specs/bluepriNNts/video/`)**:
  - Reusable definitions for Scene Templates (`@template`), Caption Templates (`@caption_template`), and B-Roll Templates (`@broll_template`).
  - Domain-level shared blueprints and inheritance across video series.
- **Markdown-Native Ephemeral Overlays (`>`)**:
  - Support for `> quote: "..."`, `> lower-third: "..."`, `> broll: path/to/asset.png [opts]`.
  - Sequential, collision-free scheduling with configurable enter/exit animations.
- **Parser & AST Integration (`innfo-video-parser` & `nn-video-script`)**:
  - PEG grammar extension in `vus.peggy` to recognize blockquote event callouts without polluting narration prose.
  - Scene compiler support for external blueprint resolution and template composition.
- **Deprecation & Quarantine Governance**:
  - Entry in `legacy-ledger.yaml` for legacy inline HTML comment directives (`<!-- overlay: ... -->`).
  - Graceful backward compatibility warnings during the transition period.

### Out of Scope
- Interactive browser video editor GUI.
- Live streaming or non-Remotion rendering engines.

## Capabilities

### New Capabilities
- `video-blueprint`: Formal schema and loader for Level 2 video blueprints (scene, caption, and B-Roll templates with style, animation, and positioning contracts).
- `ephemeral-overlays`: Play-by-play markdown blockquote (`>`) syntax parser and compiler for timeline event injection.

### Modified Capabilities
- None (existing non-video capabilities remain untouched).

## Approach

1. **Blueprint Schema & Inheritance**: Define `video_V_0-1-0_NN.md` (or canonical blueprint specification) allowing domain-wide common templates (`shared/bluepriNNts/common.md`) and series-level overrides.
2. **PEG Grammar Update**: Add `BlockQuoteEvent` rule to `vus.peggy` so `> type: payload` lines generate structured AST nodes instead of raw narration.
3. **Remotion Compiler Update**: `remotion-scene-compiler.mjs` resolves templates from referenced blueprints, calculates automatic enter/exit frames, and injects overlay tracks with zero manual JSON required in the script.
4. **Legacy Quarantine**: Register inline HTML overlays in `legacy-ledger.yaml` to ensure clean technical debt tracking.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `iNNfo/packages/innfo-video-parser/src/parser/vus.peggy` | Modified | Add blockquote event grammar rule |
| `iNNfo/specs/bluepriNNts/video/` | New | Canonical video blueprint definitions |
| `skills/nn-video-script/scripts/remotion-scene-compiler.mjs` | Modified | Blueprint loader, template resolver, and `>` parser |
| `skills/nn-video-script/scripts/scene/overlays/` | Modified | Generalized animations (`enter_animation`, `exit_animation`) |
| `legacy-ledger.yaml` | Modified | Ledger entry for legacy inline comment overlays |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Narration prose mistakenly capturing `>` quotes | Low | Strict regex and PEG delimiter matching; automated regression tests |
| Missing blueprint reference breaking rendering | Med | Sensible system defaults and fallback styling if a template is missing |
| Regressions in existing video scripts | Low | Existing scripts continue parsing under backward-compatibility mode |

## Rollback Plan

Revert changes to `vus.peggy` and rebuild mirror via `node scripts/build-video-parser-mirror.mjs`. Scripts will continue using inline overlays and monolithic headers.

## Dependencies

- `@remotion/bundler` and `@remotion/renderer` (already integrated in `nn-video-script`).

## Success Criteria

- [ ] New video script using only `>` syntax and an external blueprint compiles and renders identical or superior video output.
- [ ] Narration TTS prose is 100% clean of overlay directive tokens.
- [ ] Existing scripts render with zero regressions under compatibility mode.
- [ ] Monorepo integrity passes cleanly (`scripts/verify.js` and `legacy-ledger-guard.js`).
