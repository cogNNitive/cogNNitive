# Design: Video Series Extension Points

## Technical Approach

Replace the hardcoded overlay painter with **mounted slot components** resolved by one nearest-folder
walker, feed sound events through the **existing root audio track path**, mount authored animations as
**root-level sub-compositions**, and route every project write through **one guarded writer**. All
paths are `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/` unless noted.

## Architecture Decisions

| # | Topic | Choice | Rejected | Why |
|---|---|---|---|---|
| D1 | Slot contract | The fallback `components/<slot>.html`'s own `data-composition-variables` IS the contract. A resolved component must declare a superset of the fallback's variable ids, or the run fails with `SlotContractError: slot "lower-third": <path> missing variables: accent, exit` | Separate `slots.json` schema | One source of truth; a schema file would drift from the fallbacks |
| D2 | Walker | New `scripts/lib/nearest.mjs` holds `walkUp(startDir, predicate, stopDir)` and `findNearest(startDir, rel, {stopDir, fallbackDir})`. `findSeriesRoot` (`video-engine-cli.mjs:63`) moves there and `loadFrameTokens` (`lib/frame-tokens.mjs:105`, prerequisite branch) uses it. Its `maxDepth: 4` changes to `stopDir` | A second walker per concern | 3 walkers exist today; this makes 1. `resolveWorkspace` (`lib/video-guard.mjs:98`) is untouched (out of scope) |
| D3 | Walk bounds | Start at the episode script dir and stop at `findSeriesRoot(scriptDir) ?? scriptDir` (inclusive). Components then fall back to the skill's `components/`; sounds fall back to silence | Walking to `.git`/domain root | Matches "episode > series > blueprint". Nothing above the series can leak in |
| D4 | Mount location | Overlay hosts and animation hosts go in the **root** `index.html` with global `data-start`, like audio (`scene-project.mjs:129-139`). Scene compositions keep only media layers and the transition | Mounting inside each scene's sub-composition | Keeps nesting at one level, which `timeline --json` reads fully. Global times avoid the nested-start ambiguity the module header already documents |
| D5 | Staging | Components are copied to `<project>/components/<slot>.html` and authored projects to `<project>/authored/<slug>/` (skipping `.hyperframes/`), both inside `buildHyperframesProject`. Sounds are staged like music via `stageAsset` and ride the existing `publicDir → assets/` copy. The triple copy (`video-engine-cli.mjs:432-443`, `hyperframes-render.mjs:30-35`) stays | Collapsing the copies | Collapsing them is a non-goal. Every new `src` stays project-relative and never contains `..` |
| D6 | Sound events | The CLI adds `kind: 'sfx'` entries to `manifest.tracks.audio`: `scene-boundary` at each `scene.fromFrame` for i>0, and `overlay-enter` at each `overlay.fromFrame` (resolved `overlay-enter.<slot>.*`, then `overlay-enter.*`). With no `durationInFrames`, the emitter leaves out `data-duration` and the sound plays its full length | A new emitter code path | Reuses `audioEls`. The only emitter change is a conditional `data-duration` |
| D7 | Animation | Lower `type:: animation` with `layer_type: 'animation'` and leave it out of `resolveMediaLayers` (it is a directory). A pre-compile pass reads `<asset>/index.html` and takes the root `data-composition-id` and `data-duration`. `compile()` gets `animationDurations[sceneId]` and sets the scene to `max(narration, animation)` (`remotion-scene-compiler.mjs:510-519`). The host's `data-duration` = scene duration, so a shorter timeline holds its last frame (HF format rule). No `muted`, no `data-playback-rate` | Rewriting the authored root id; retiming | Variables cannot retime. Rewriting user files is fragile |
| D8 | Id collisions | An authored root id equal to a scene slug, the root `compositionId`, a component id, or a different authored source's id is an error that names both. The same source mounted twice is allowed | Auto-prefixing | Loud and cheap. Prefixing would have to rewrite the authored timeline key |
| D9 | Regeneration guard | `scripts/lib/emit-guard.mjs` `writeGuarded(projectDir, files)` reads `<project>/.nn-emit.json` (`{"files":{"<posix rel>":"<sha256>"}}`, sorted keys, trailing newline). If any recorded file exists with a different hash, it throws `RegenerationRefusedError` listing every such file and writes nothing. Otherwise it writes everything and then the record. Unrecorded files and deleted files are written. No `--force` | `hyperframes history --who` | `history` is a **trial** command (`hyperframes-cli/SKILL.md:48`) needing begin/end turns and `npx`. It could not be checked at pin 0.8.192 here (no shell in this phase). The hash record is offline, deterministic and unit-testable |

## Data Flow

```
script dir ─walkUp→ components/<slot>.html | sounds/<event>[.<slot>].* | frame.md
     │                    │ contract check (D1)       │ stageAsset → publicDir
     ▼                    ▼                            ▼
compile(animationDurations) → manifest(+sfx audio) → buildProject → files map
                                                         │
                         writeGuarded(.nn-emit.json) ◄───┘ → hyperframes render
```

## File Changes

| File | Action | Description |
|---|---|---|
| `scripts/lib/nearest.mjs` | Create | `walkUp`, `findNearest`, `findNearestByStem` (any extension), `findSeriesRoot` |
| `scripts/lib/emit-guard.mjs` | Create | Hash record plus `RegenerationRefusedError` |
| `scripts/overlay-blocks.mjs` | Rewrite | `SLOT_OF` (manifest type→slot), `readVariableIds`, `assertSlotContract`, `overlayMount(overlay, slotFile, vars)`. Deletes `DEFAULT_OVERLAY_BLOCKS`, `resolveOverlayBlock`, `overlayHostMarkup`, `renderOverlay` with its inline CSS, and `data-block` |
| `scripts/scene-project.mjs` | Modify | Root-level overlay/animation hosts. `buildProject` returns a `files` map. Drops `OVERLAY_HOST_ANCHOR`, `seriesFrame`/`sceneBlock` and the hardcoded `#0b0b0f` (line 99) |
| `scripts/hyperframes-render.mjs` | Modify | Copies components and authored projects, then calls `writeGuarded` |
| `scripts/video-engine-cli.mjs` | Modify | Slot/sound resolution, sfx tracks, animation pre-pass. Imports `findSeriesRoot` |
| `scripts/remotion-scene-compiler.mjs` | Modify | `animation` type plus the `max()` duration |
| `scripts/lib/frame-tokens.mjs` | Modify | Walks through `nearest.mjs` |
| `components/{title,lower-third,caption,quote,watermark,b-roll}.html` | Create | Neutral fallbacks. The `b-roll` one does `fit` and the zoom-in |
| `references/overlay-slots.md` | Create | Slot→variables table and one registry hint per slot |
| `SKILL.md` | Modify | `V_0-5-0`→`V_0-6-0` |
| `../../spec_NN.md` | Modify | Layer `type` gains `animation`. `blueprint_version` `V_0-3-8`→`V_0-4-0` |
| `iNNfo/specs/bluepriNNts/catalog.json` | Regenerate | `node scripts/blueprint-catalog.mjs --release-tag <next>` |

Registries: `SHIPPED_TEMPLATE_VERSIONS` no longer exists in code, so it is not relevant. `scripts/guard-template-immutability.js` must pass with both bumps. The `verify.js:364` carve-out (`guard-hardening`) should be re-checked and removed if the bump fixes it.

## Interfaces / Contracts

Slot variables: `text`, `src`, `position`, `enter`, `exit`, `font`, `accent`, and for `b-roll` also `fit`, `zoomIn`. Values are taken from `overlay.config`, `enterAnimation`/`exitAnimation` (`remotion-scene-compiler.mjs:362-363`) and `frameCss()`. The host is emitted as `data-variable-values="<esc(JSON)>"`.

## Testing Strategy

Strict TDD. Use `node --test` under `test/`, with a RED commit before each GREEN.

| Layer | What | Approach |
|---|---|---|
| Unit | `nearest` precedence and stopDir; contract diff; emit-guard refuse/delete/untouched; sfx per-slot→generic→silent; `max()` duration; id collision | Temp-dir fixtures |
| Integration | Emitted tree is byte-identical across runs; no `..` in any `src`; no concrete sound name in `scripts/` (grep test) | Extend `scene-project.test.mjs` and `overlay-emission.test.mjs`. Delete `overlay-blocks.test.mjs` cases for removed APIs |
| Manual | `hyperframes check --json` = 0 errors on fallbacks plus one authored animation | Maintainer, pin 0.8.192 (needs `npx`) |

Estimate: about 1,000–1,150 changed lines (about 550 code+HTML, 450 tests, 100 docs/spec). Over 400 lines, so chained PRs are recommended. Suggested order: walker+guard → slots+deletions+bumps → sounds → animation.

## Migration / Rollout

There is no data migration. Series `components/` and `sounds/` folders are opt-in. The rollback is the proposal's.

## Open Questions

- [ ] **Spike first:** does HF 0.8.192 mount a standalone `index.html` (not `<template>`) through `data-composition-src`, and resolve its relative asset URLs from `authored/<slug>/`? If not, D7 copies the authored project's assets to the project root under a prefix.
- [ ] Does mounting the same component composition id several times (for example, two lower-thirds) render without the 45 s wait? A fallback test should cover this.
- [ ] Animation hosts at the root paint above all of the scene's media layers, so `layer_level` ordering against siblings is lost. Is that acceptable?
