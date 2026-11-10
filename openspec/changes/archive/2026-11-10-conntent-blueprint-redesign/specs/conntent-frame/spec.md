# conntent-frame Delta Spec

Source decisions: D17, D3 (Slice 2: Cascade). A frame is a HyperFrames-compatible `FRAME.md`: normative frontmatter tokens plus intent prose, a superset of DESIGN.md.

## ADDED Requirements

### Requirement: A Frame Is A Folder With FRAME.md

A frame MUST be a folder `library/frames/<name>/` (at the domaiNN or series level, or `media/frames/<name>/` in an episode) containing a required `FRAME.md` and an optional `caption-skin.html`. The folder name `<name>` MUST match the lowercase pattern of `conntent-library` and MUST equal the frontmatter `name`. A frame MUST NOT be a single file `frames/<name>.md`. The blueprint package MUST ship a frame named `neutral`, the blueprint default of the `frame` field.

#### Scenario: Valid frame folder
- GIVEN `library/frames/night/FRAME.md` with `name: night`
- WHEN the frame is loaded
- THEN it loads with no finding

#### Scenario: Name and folder disagree
- GIVEN `library/frames/night/FRAME.md` with `name: dusk`
- WHEN the frame is loaded
- THEN it fails with `frame-invalid` naming the path, the key `name` and both values

#### Scenario: Single-file frame is not a frame
- GIVEN `library/frames/night.md`
- WHEN `frame:: night` is resolved
- THEN it fails with `frame-not-found` and the file is not used

#### Scenario: Package ships the neutral frame
- GIVEN the installed blueprint package
- WHEN `frames/neutral/FRAME.md` is loaded
- THEN it validates against this specification

### Requirement: FRAME.md Frontmatter Schema

`FRAME.md` MUST start with YAML frontmatter with these keys:

| Key | Required | Type | Rule |
|---|---|---|---|
| `name` | yes | string | equals the folder name |
| `description` | no | string | one line |
| `colors` | yes | map of token name to colour | non-empty; each value is `#RRGGBB`, `#RRGGBBAA` or a reference `{colors.<token>}` |
| `typography` | yes | map of token name to object | non-empty; each object has `fontFamily` (string, required) and optionally `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` |
| `spacing` | no | map of token name to dimension | each value a number or a string ending in `px`, `rem` or `em` |
| `components` | no | map of component token name to object | each property value is a literal or a reference `{<group>.<token>}` to an existing token |

`colors` MUST define at least `primary`, `background` and `foreground`. `typography` MUST define at least `heading` and `body`. These are the tokens the thumbnail renderer and the caption skin read. A reference to a token that does not exist MUST fail. Unknown top-level keys MUST be preserved and ignored (DESIGN.md compatibility) and MUST NOT fail validation. Violations MUST fail with `frame-invalid` naming the file, the key and the reason, before any spend.

#### Scenario: Minimal valid frame
- GIVEN frontmatter with `name`, `colors` (`primary`, `background`, `foreground`) and `typography` (`heading`, `body`, each with `fontFamily`)
- WHEN the frame is validated
- THEN it validates

#### Scenario: Missing required token
- GIVEN a frame whose `colors` has no `foreground`
- WHEN the frame is validated
- THEN it fails with `frame-invalid` naming `colors.foreground`

#### Scenario: Invalid colour value
- GIVEN `colors.primary: red`
- WHEN the frame is validated
- THEN it fails with `frame-invalid` naming `colors.primary` and the allowed forms

#### Scenario: Dangling reference
- GIVEN `components.button.backgroundColor: "{colors.accent}"` and no `colors.accent`
- WHEN the frame is validated
- THEN it fails with `frame-invalid` naming `components.button.backgroundColor` and `colors.accent`

#### Scenario: Typography without a family
- GIVEN `typography.heading` without `fontFamily`
- WHEN the frame is validated
- THEN it fails with `frame-invalid` naming `typography.heading.fontFamily`

#### Scenario: Extra DESIGN.md keys are tolerated
- GIVEN a frame with an extra top-level key `rounded`
- WHEN the frame is validated
- THEN it validates and the key is preserved in the emitted `frame.md`

### Requirement: FRAME.md Carries Intent Prose

The body of `FRAME.md` after the frontmatter MUST hold the design intent in prose (the look and feel, when to use the frame, what to avoid). An empty body MUST produce the warning `frame-missing-intent` and MUST NOT fail validation. The prose MUST be copied verbatim with the frontmatter.

#### Scenario: Empty body warns
- GIVEN a valid frame with no prose
- WHEN the frame is validated
- THEN it validates with the warning `frame-missing-intent`

#### Scenario: Prose is preserved
- GIVEN a frame with a body of three paragraphs
- WHEN it is emitted
- THEN the emitted `frame.md` body equals the source body byte for byte

### Requirement: Frame Resolution Through The Cascade And The Library

`frame` MUST be a `render` class field (see `conntent-field-registry`) with the blueprint default `neutral`, resolved through the cascade to a name, and then the name MUST be resolved as `frames/<name>` through the library lookup of `conntent-library` (episode `media/`, series `library/`, domaiNN `library/`, package). The bare form `frame:: night` and the level-prefixed form `frame:: series:frames/night` MUST both be accepted. An unresolved frame MUST fail with `frame-not-found` naming the name and every folder searched, before any spend. A value resolved at a Scene Kind, Preset, Video or Scene level MUST apply only to the scenes in scope.

#### Scenario: Series frame resolved from the library
- GIVEN the Series declaring `frame:: brand` and `series/s/library/frames/brand/FRAME.md`
- WHEN a scene resolves its frame
- THEN the frame is the series one, with source `series`

#### Scenario: Scene overrides the series frame
- GIVEN the Series sets `frame:: brand` and one Scene sets `frame:: night`
- WHEN that Scene's frame is resolved
- THEN the name is `night` with source `scene`, and the file is looked up as `frames/night`

#### Scenario: Kind sets a frame directly
- GIVEN a Scene Kind `Quote` declaring `frame:: night` and a scene of that kind that sets none
- WHEN the frame is resolved
- THEN the name is `night` with source `kind`

#### Scenario: Preset supplies the frame
- GIVEN a Video with `presets:: [Night]` where `Night` sets `frame:: night`
- WHEN a Scene's frame is resolved
- THEN the name is `night` with source `video:preset:Night`

#### Scenario: Level prefix
- GIVEN `frame:: domain:frames/brand` with `brand` in the series and the domaiNN libraries
- WHEN the frame is resolved
- THEN the domaiNN frame is used

#### Scenario: Frame not found
- GIVEN `frame:: ghost` and no such frame at any level
- WHEN the pre-compile check runs
- THEN it fails with `frame-not-found` listing the folders searched, and nothing is spent

### Requirement: Frame Is Emitted As frame.md In The HyperFrames Project

When an episode is compiled, the engine MUST copy the video-level resolved `FRAME.md` unchanged to `hyperframes/frame.md`, so engine components, authored animations and registry blocks read the same tokens. When a scene resolves a frame different from the video-level frame, the engine MUST copy that frame to `hyperframes/frames/<name>.md` and the manifest entry of the scene MUST reference it. The emitted files MUST be byte-identical to the source and regenerated on every compile. The thumbnail renderer MUST read its font and accent from the resolved `typography.heading` and `colors.primary` of the thumbnail's frame.

#### Scenario: frame.md carries the resolved tokens
- GIVEN an episode whose video-level frame is `brand`
- WHEN the project is emitted
- THEN `hyperframes/frame.md` equals `brand/FRAME.md` byte for byte

#### Scenario: Per-scene frame is emitted separately
- GIVEN one scene resolving `night` while the video-level frame is `brand`
- WHEN the project is emitted
- THEN `hyperframes/frame.md` is `brand`, `hyperframes/frames/night.md` is `night`, and the manifest of that scene references `frames/night.md`

#### Scenario: Editing the frame changes the next compile
- GIVEN a compiled episode and an edited `FRAME.md`
- WHEN the episode is compiled again
- THEN `hyperframes/frame.md` reflects the edit

#### Scenario: Thumbnail uses frame tokens
- GIVEN a frame with `colors.primary: "#FF5A36"`
- WHEN a thumbnail is rendered for an episode using it
- THEN the badge and accent use `#FF5A36`

### Requirement: Caption Skin Styles Captions

A frame MAY contain `caption-skin.html`, a fragment that styles burned-in captions and reads the frame tokens as CSS variables. When present, the engine MUST copy it to `hyperframes/caption-skin.html`; when absent, the engine MUST use the package default skin, which MUST read the same tokens. A skin that references a network URL MUST fail with `frame-invalid` naming the file and the URL.

<!-- shared with slice 3: caption generation, alignment and the `captions` behaviour are specified by conntent-captions; this requirement defines only the skin file. -->

#### Scenario: Frame skin is used
- GIVEN a frame with `caption-skin.html`
- WHEN the project is emitted
- THEN `hyperframes/caption-skin.html` equals that file

#### Scenario: Default skin
- GIVEN a frame without a skin
- WHEN the project is emitted
- THEN `hyperframes/caption-skin.html` is the package default skin

#### Scenario: Skin with a network reference
- GIVEN a skin containing `https://fonts.googleapis.com/...`
- WHEN the frame is validated
- THEN it fails with `frame-invalid` because rendering must not need the network

### Requirement: Starting Points Do Not Create A Dependency

The 13 HyperFrames frame presets and the output of `hyperframes capture <url>` MUST be usable as starting points copied into `library/frames/<name>/FRAME.md`. The engine MUST NOT read a preset or a captured design at render time: a frame is always resolved from the library and the package.

#### Scenario: Captured design is copied, not referenced
- GIVEN a design captured with `hyperframes capture <url>` and saved as `library/frames/site/FRAME.md`
- WHEN an episode uses `frame:: site`
- THEN the frame is read from the library file and the URL is never contacted

#### Scenario: Preset name is not a frame
- GIVEN `frame:: coral` with no `library/frames/coral/` at any level
- WHEN the frame is resolved
- THEN it fails with `frame-not-found`
