# Delta for remotion-video-scenes

Scope: every requirement is removed. The capability describes TSX components (`ChapterTitle`,
`ParallaxPanScene`, `VideoSequence`) and a `scene_type::` syntax that no code implements. On
archive, delete `openspec/specs/remotion-video-scenes/` (the Non-Functional Requirements section
goes with it).

## REMOVED Requirements

### Requirement: FR-001: Chapter Title Card Component (`ChapterTitle.tsx`)

(Reason: no `ChapterTitle` component exists; HyperFrames is the only renderer and titles are the `title` overlay slot.)
(Migration: None. Title rendering is owned by `ephemeral-overlays` and `cognnitive-video-engine`.)

### Requirement: FR-002: Parallax Pan & Image Motion Component (`ParallaxPanScene.tsx`)

(Reason: no `ParallaxPanScene` component exists; no code reads a pan direction.)
(Migration: None.)

### Requirement: FR-003: Video Sequence Root Composition (`VideoSequence.tsx`)

(Reason: Remotion `<Sequence>` composition was replaced by the emitted HyperFrames project.)
(Migration: `cognnitive-video-engine` "Manifest to HyperFrames Project Emission" owns scene hosts, timing and root audio.)

### Requirement: FR-004: Script Syntax & Metamodel Extension in cogNNitive

(Reason: `scene_type::`, `motion_direction::`, `chapter_number::` and `chapter_title::` are not Fields of the `video-script` bluepriNNt and no reader exists.)
(Migration: None. Script Fields are defined by the `video-script` bluepriNNt only.)

### Requirement: Scene Pipeline Renders Through HyperFrames

(Reason: duplicates the engine capability; kept only as a transition note after the Remotion removal.)
(Migration: `cognnitive-video-engine` "Programmatic HyperFrames Scene Compilation" (measured duration) and "Manifest to HyperFrames Project Emission" (root audio, deterministic emission). The no-Remotion guard moves to `video-script-skill` "No Legacy Renderer Residue".)
