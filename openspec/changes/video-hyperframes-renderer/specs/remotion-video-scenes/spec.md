# Delta for remotion-video-scenes

Scope: the Remotion component pipeline is retired. The capability id stays `remotion-video-scenes`
for lineage, but no Remotion component renders video any more; the scene pipeline is the
HyperFrames project defined in `cognnitive-video-engine`.

## REMOVED Requirements

### FR-001: Chapter Title Card Component (`ChapterTitle.tsx`)

**Reason**: A React/Remotion component. The scene pipeline is now HyperFrames; chapter/kinetic titles render from HyperFrames blocks (see change `video-overlays-as-intent`). No `ChapterTitle.tsx` exists in the skill.
**Migration**: Author the equivalent motion as a HyperFrames registry block; declared via the `title` Layer as today.

### FR-002: Parallax Pan & Image Motion Component (`ParallaxPanScene.tsx`)

**Reason**: A React/Remotion component. Image motion is now a HyperFrames clip (or a series `media/` clip), not a Remotion primitive. No `ParallaxPanScene.tsx` exists in the skill.
**Migration**: Express pan/zoom/parallax with GSAP inside a HyperFrames composition.

### FR-003: Video Sequence Root Composition (`VideoSequence.tsx`)

**Reason**: The Remotion `<Sequence>` root is replaced by the emitted HyperFrames root composition (one scene host per Scene, audio at the root).
**Migration**: See the ADDED requirement "Scene Pipeline Renders Through HyperFrames".

### FR-004: Script Syntax & Metamodel Extension in cogNNitive

**Reason**: Pinned a bespoke `scene_type::`/`motion_direction::`/`chapter_number::` script grammar. The native video-script model (capability `video-script-model`) forbids declared timing and bespoke scene-syntax fields; `TIMING_FIELD_NAMES` rejects them.
**Migration**: None needed; those fields were never part of the native L3 model.

## ADDED Requirements

### Requirement: Scene Pipeline Renders Through HyperFrames

The scene pipeline MUST render through the emitted HyperFrames project, not Remotion. Scene
durations MUST equal `Math.ceil(audioSeconds * fps)`, all audio MUST be a root-level HyperFrames
element, and no React component runtime MUST be required. Motion MUST remain deterministic:
every frame renders identically in the HyperFrames preview and headless render.

#### Scenario: Deterministic preview and headless parity

- GIVEN a scene pipeline with per-scene audio durations
- WHEN the same project is inspected in the HyperFrames preview and rendered headless
- THEN each scene's duration equals `Math.ceil(audioSeconds * fps)`
- AND frame `n` renders identically in both

#### Scenario: No Remotion artefact remains

- GIVEN the skill directory
- WHEN it is inspected
- THEN no `remotion-*.tsx`/`.mjs`, no `ChapterTitle`/`ParallaxPanScene`/`VideoSequence` and no `@remotion/*` import is present
