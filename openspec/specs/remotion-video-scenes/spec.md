# SDD Specification: Remotion Video Scenes & Parallax Motion Pipeline

## Purpose

Define the Remotion component pipeline that renders video scenes (chapter title cards, parallax image motion, and sequence composition) plus the cogNNitive video-script metamodel extension that feeds it. Motion MUST be subpixel and deterministic across preview and headless renders.
## Requirements

### FR-001: Chapter Title Card Component (`ChapterTitle.tsx`)
The chapter title card component MUST satisfy the following:
- **REQ-1.1:** Must render an uppercase section label (e.g. `CAPÍTULO` or `SECCIÓN`) with fade-in and subtle slide.
- **REQ-1.2:** Must render a large chapter numeral (e.g. `01`, `02`) animated via spring physics (`spring({ frame, fps, config: { damping: 12, stiffness: 120 } })`).
- **REQ-1.3:** Must render symmetric horizontal dividing lines expanding from a glowing center accent dot using `interpolate()` on line width.
- **REQ-1.4:** Must render a chapter title/subtitle rising smoothly (`translateY(20px -> 0px)`) and fading in.
- **REQ-1.5:** Must support dark (`#090d16`) and light (`#ffffff`) theme variants with custom `accentColor`.

#### Scenario: Chapter title card renders its parts
- GIVEN the `ChapterTitle` component with a chapter number and title
- WHEN it renders
- THEN it shows an uppercase section label, an animated numeral, dividing lines, and the title/subtitle in the requested theme

### FR-002: Parallax Pan & Image Motion Component (`ParallaxPanScene.tsx`)
The parallax pan component MUST satisfy the following:
- **REQ-2.1:** Must support continuous subpixel image motion via `translate3d(x, y, 0)` and `scale(s)` using floating-point coordinates.
- **REQ-2.2:** Must support pan directions: `left-to-right`, `right-to-left`, `zoom-in`, `zoom-out`, `diagonal-up`, `diagonal-down`.
- **REQ-2.3:** Must support optional multi-layer parallax (foreground cutout element translating faster than background layer).
- **REQ-2.4:** Must support ambient background blur layer (`blur(40px)`, scale 1.2, opacity 0.35) for aspect-ratio filling.
- **REQ-2.5:** Must render clean typographic overlays: speaker badge, scene title, and voiceover description with spring entrance.

#### Scenario: Parallax scene animates subpixel motion
- GIVEN an image-motion scene with a pan direction
- WHEN `ParallaxPanScene` renders
- THEN the image translates subpixel with the requested direction and optional parallax and blur layers

### FR-003: Video Sequence Root Composition (`VideoSequence.tsx`)
The video sequence root composition MUST satisfy the following:
- **REQ-3.1:** Must dynamically assemble scenes from structured JSON or script descriptors using Remotion `<Sequence>` blocks.
- **REQ-3.2:** Scene duration must match the exact audio duration in frames (`durationInFrames = Math.ceil(audioSeconds * fps)`).
- **REQ-3.3:** Outro transitions between adjacent sequences must perform a 15-frame cross-fade or clean cut.

#### Scenario: Sequence duration matches audio
- GIVEN a script descriptor with per-scene audio durations
- WHEN `VideoSequence` composes the scenes
- THEN each `<Sequence>` duration equals `Math.ceil(audioSeconds * fps)`
- AND adjacent scenes cross-fade or cut

### FR-004: Script Syntax & Metamodel Extension in cogNNitive
The video-script metamodel extension MUST satisfy the following:
- **REQ-4.1:** Video script markdown files (`.md`) must support scene block attributes:
  - `scene_type:: chapter_title | image_motion | element_animation`
  - `motion_direction:: left-to-right | right-to-left | diagonal-up | zoom-in`
  - `chapter_number:: 01`
  - `chapter_title:: <Title>`
  - `image:: <path>`
  - `audio:: <path>`
- **REQ-4.2:** Video production procedures must document standard scene structuring guidelines.

#### Scenario: Script scene blocks parse the attributes
- GIVEN a video-script markdown file with a scene block
- WHEN it is parsed
- THEN `scene_type`, `motion_direction`, `chapter_number`, `chapter_title`, `image` and `audio` attributes are honored

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

## Non-Functional Requirements

- **NFR-001 (Zero Temporal Jitter):** Motion rendering must maintain subpixel accuracy to eliminate FFmpeg's `zoompan` pixel-snapping artifacts.
- **NFR-002 (Performance & Scalability):** Scene rendering must support Remotion multi-threaded CLI (`--concurrency=4` or higher) with hardware acceleration.
- **NFR-003 (Determinism):** Every frame `n` must render identically in preview mode (browser player) and headless CLI production output.
