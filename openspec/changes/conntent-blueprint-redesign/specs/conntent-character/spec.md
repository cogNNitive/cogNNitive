# conntent-character Delta Spec

Source decisions: D19, D4, C9, U7 (Slice 2: Cascade). A Character bundles a voice per language, avatar poses, backgrounds and a speaking style. It acts like a preset placed directly beneath the explicit fields of the level that sets it.

## ADDED Requirements

### Requirement: A Character Is A Folder With CHARACTER.md

A Character MUST be a folder `library/characters/<name>/` at the domaiNN or series level (or `media/characters/<name>/` in an episode) holding a required `CHARACTER.md` and the optional sub-folders `avatars/`, `backgrounds/` and `voice/`. The folder name MUST match the library name pattern and MUST equal the frontmatter `name`.

| Path | Holds |
|---|---|
| `CHARACTER.md` | frontmatter parameters and the prose of the character |
| `avatars/<pose>.<ext>` | one image per pose (`png`, `jpg`, `jpeg`, `webp`); the file name without extension is the pose name |
| `backgrounds/<background>.<ext>` | background images (same extensions) |
| `voice/` | voice-clone source audio and notes used by `voice-clone.mjs` (`mp3`, `wav`, `m4a`) |

Avatars MUST live inside their Character; no avatar image of a Character MAY live in `music/`, `sounds/` or `media/` of the library.

#### Scenario: Valid character
- GIVEN `library/characters/lucas/CHARACTER.md` with `name: lucas` and `library/characters/lucas/avatars/neutral.png`
- WHEN the character is loaded
- THEN it loads with no finding

#### Scenario: Name and folder disagree
- GIVEN `library/characters/lucas/CHARACTER.md` with `name: luis`
- WHEN the character is loaded
- THEN it fails with `character-invalid` naming the path, the key `name` and both values

#### Scenario: Character without CHARACTER.md
- GIVEN `library/characters/lucas/avatars/neutral.png` and no `CHARACTER.md`
- WHEN `character:: lucas` is resolved
- THEN it fails with `character-not-found` and states that `CHARACTER.md` is missing

### Requirement: CHARACTER.md Frontmatter Schema

`CHARACTER.md` MUST start with YAML frontmatter with these keys:

| Key | Required | Type | Rule |
|---|---|---|---|
| `name` | yes | string | equals the folder name |
| `voices` | yes | map of language code to catalog Voice slug | non-empty; each key is an ISO 639-1 lowercase two-letter code; each value names a `Voice` of the merged catalog whose `language` equals the key |
| `default_pose` | yes when `avatars/` holds at least one file | string | names a file in `avatars/` without extension |
| `avatar_model` | no | string | a catalog Model slug with `capability:: avatar` |
| `avatar_resolution` | no | select `480p`, `720p`, `768p` | one of the options of the `avatar_resolution` field |
| `default_background` | no | string | names a file in `backgrounds/` without extension |

Unknown top-level keys MUST fail with `character-invalid` (no silent ignore). Violations MUST fail with `character-invalid` naming the file, the key and the reason, before any spend. A `voices` entry whose Voice is absent from the catalog MUST fail with `unknown-voice`; a Voice whose `language` differs from the key MUST fail with `voice-language-mismatch`.

#### Scenario: Voices per language
- GIVEN `voices: { es: lucas-es, en: lucas-en }` and catalog Voices `lucas-es` (`language: es`) and `lucas-en` (`language: en`)
- WHEN the character is validated
- THEN it validates

#### Scenario: Voice language does not match its key
- GIVEN `voices: { en: lucas-es }` where `lucas-es` has `language: es`
- WHEN the character is validated
- THEN it fails with `voice-language-mismatch` naming `en`, `lucas-es` and `es`

#### Scenario: Voice missing from the catalog
- GIVEN `voices: { es: nobody }` and no such Voice
- WHEN the character is validated
- THEN it fails with `unknown-voice` naming `nobody`

#### Scenario: Language key is not a language code
- GIVEN `voices: { spanish: lucas-es }`
- WHEN the character is validated
- THEN it fails with `character-invalid` naming the key `voices.spanish`

#### Scenario: Default pose must exist
- GIVEN `default_pose: smiling` and no `avatars/smiling.*`
- WHEN the character is validated
- THEN it fails with `character-invalid` naming `default_pose` and listing the poses available

#### Scenario: Default pose required when avatars exist
- GIVEN `avatars/neutral.png` and no `default_pose`
- WHEN the character is validated
- THEN it fails with `character-invalid` naming `default_pose`

#### Scenario: Default background must exist
- GIVEN `default_background: studio` and no `backgrounds/studio.*`
- WHEN the character is validated
- THEN it fails with `character-invalid` naming `default_background`

#### Scenario: Avatar model must be an avatar model
- GIVEN `avatar_model: minimax/speech-2.8-hd`, a TTS model
- WHEN the character is validated
- THEN it fails with `character-invalid` naming `avatar_model` and the capability found

#### Scenario: Invalid resolution
- GIVEN `avatar_resolution: 1080p`
- WHEN the character is validated
- THEN it fails with `character-invalid` listing `480p`, `720p`, `768p`

#### Scenario: Unknown key
- GIVEN a frontmatter key `mood`
- WHEN the character is validated
- THEN it fails with `character-invalid` naming `mood`

### Requirement: CHARACTER.md Prose Describes How The Character Speaks

The body of `CHARACTER.md` MUST hold the character's prose under these headings: `## Speaking style`, `## Narrative style`, `## Never says` and `## Examples`. A missing or empty section MUST produce the warning `character-missing-prose` naming the section and MUST NOT fail validation. The prose MUST be exposed to the planning procedure, which reads it when writing narration (see capability `conntent-procedures`), and MUST NOT influence any resolved parameter.

#### Scenario: Complete prose
- GIVEN a body with the four headings, each non-empty
- WHEN the character is validated
- THEN no warning is reported

#### Scenario: Missing section warns
- GIVEN a body without `## Never says`
- WHEN the character is validated
- THEN the warning `character-missing-prose` names `Never says` and validation passes

#### Scenario: Prose does not change parameters
- GIVEN two characters identical in frontmatter and different in prose
- WHEN a scene resolves its parameters with each
- THEN the resolved values are equal

### Requirement: The `character`, `pose` And `background` Fields

The blueprint MUST define three `render` class fields (see `conntent-field-registry`), settable at `Video Defaults`, `Series`, `Scene Kind`, `Preset`, `Video` and `Scene` and not at `Layer`:

| Field | Type | Blueprint default | Meaning |
|---|---|---|---|
| `character` | string, a Character name | none | the active Character; a series sets its host, a scene can bring a guest |
| `pose` | string, a pose name | none (the Character's `default_pose`) | the avatar pose of the active Character |
| `background` | string, a background name | none (the Character's `default_background`) | the background image of the active Character |

`character:: <name>` MUST be resolved as `characters/<name>` through the library lookup of `conntent-library` (episode `media/`, series `library/`, domaiNN `library/`). An unresolved name MUST fail with `character-not-found` naming the name and the folders searched. A `pose` that is not a file of the active Character's `avatars/` MUST fail with `pose-not-found` listing the poses available; a `background` that is not a file of its `backgrounds/` MUST fail with `background-not-found` listing those available. `pose` or `background` with no active Character MUST fail with `character-required` naming the field.

#### Scenario: Series sets the host
- GIVEN the Series declaring `character:: lucas` and no scene setting `character`
- WHEN a scene resolves `character`
- THEN the value is `lucas` with source `series`

#### Scenario: Scene brings a guest
- GIVEN the Series declaring `character:: lucas` and a scene declaring `character:: maria`
- WHEN voice, avatar and pose are resolved for that scene and for another scene
- THEN the first scene uses Maria's voice, avatar and pose and the other uses Lucas's

#### Scenario: Character not found
- GIVEN `character:: ghost` and no such folder
- WHEN the pre-compile check runs
- THEN it fails with `character-not-found` and nothing is spent

#### Scenario: Pose not found
- GIVEN `character:: lucas` and `pose:: angry` with poses `neutral` and `smiling`
- WHEN the pre-compile check runs
- THEN it fails with `pose-not-found` listing `neutral` and `smiling`

#### Scenario: Pose without a character
- GIVEN `pose:: smiling` and no resolvable `character`
- WHEN the pre-compile check runs
- THEN it fails with `character-required` naming `pose`

#### Scenario: Character at layer is rejected
- GIVEN a Layer declaring `character:: lucas`
- WHEN the script is validated
- THEN it fails with `unknown-key` stating `character` is not defined for `Layer`

### Requirement: Character Parameters Act Like A Preset Beneath The Explicit Fields

The active Character MUST contribute one node to the cascade at the level where `character` is set, placed directly beneath that level's explicit fields and above that level's expanded `presets`, so the order at a level, most specific first, is: explicit fields, Character, `presets` (last first). Only the active (nearest) Character contributes; a Character set at an outer level and replaced by an inner one MUST contribute nothing. The Character supplies:

| Field | Value supplied |
|---|---|
| `voice` | the Voice `voices[<resolved language>]` |
| `avatar` | the file `avatars/<resolved pose>` |
| `pose` | `default_pose` |
| `background` | the file `backgrounds/<default_background>` when declared |
| `avatar_model` | the frontmatter value when declared |
| `avatar_resolution` | the frontmatter value when declared |

A `pose` or `background` value set at a level farther from the scene than the level that set the active Character MUST be ignored (it belongs to the replaced Character) and the trace MUST say so. The trace source of a Character value MUST be `<level>:character:<name>`.

#### Scenario: Explicit field beats the character
- GIVEN a Series with `character:: lucas` and `voice:: custom` at the same level
- WHEN a scene resolves `voice`
- THEN the value is `custom` with source `series`

#### Scenario: Character beats the same-level preset
- GIVEN a Series with `character:: lucas` and `presets:: [Studio]` where `Studio` sets `voice:: studio-voice`
- WHEN a scene resolves `voice`
- THEN the value is Lucas's voice with source `series:character:lucas`

#### Scenario: Nearer preset beats the outer character
- GIVEN a Series with `character:: lucas` and a Scene Kind `Presenter` with `presets:: [P]` where `P` sets `voice:: p-voice`
- WHEN a scene of that kind resolves `voice`
- THEN the value is `p-voice` with source `kind:preset:P`

#### Scenario: Guest replaces the host entirely
- GIVEN the Series `character:: lucas` (with `avatar_resolution: 720p`), a scene `character:: maria` where Maria declares no `avatar_resolution`
- WHEN the scene resolves `avatar_resolution`
- THEN no value comes from Lucas; the value comes from the next outer level or is unset

#### Scenario: Outer pose is not applied to the guest
- GIVEN the Series `character:: lucas` and `pose:: smiling`, and a scene `character:: maria` with `default_pose: neutral`
- WHEN the scene resolves `pose`
- THEN the value is `neutral` with source `scene:character:maria`

#### Scenario: Avatar follows the pose
- GIVEN `character:: lucas`, `pose:: smiling` at the Video and `avatars/smiling.png`
- WHEN a scene resolves `avatar`
- THEN the value is `library/characters/lucas/avatars/smiling.png`

### Requirement: Voice Follows The Episode Language

The Character voice supplied for a scene MUST be `voices[<resolved language>]`. When the resolved language has no entry in `voices`, validation MUST fail before any spend with `missing-character-voice` naming the Character and the language, and the engine MUST NOT fall back to another language's voice or to a domaiNN voice.

#### Scenario: Spanish episode uses the Spanish voice
- GIVEN `language:: es` and `voices: { es: lucas-es, en: lucas-en }`
- WHEN a scene resolves `voice`
- THEN the value is `lucas-es`

#### Scenario: Translation without a voice for its language
- GIVEN an episode with `translation_of` set, `language:: en` and a Character with only `voices.es`
- WHEN the pre-compile check runs
- THEN it fails with `missing-character-voice` naming the Character and `en`
- AND nothing is spent

### Requirement: Overriding A Character Value Warns

Validation MUST emit the warning `character-override` when the winning source of a field the active Character supplies (`voice`, `avatar`, `pose`, `background`, `avatar_model`, `avatar_resolution`) is a preset or an explicit field instead of the Character. The warning MUST name the scene, the field, the winning source and the Character, and MUST NOT stop a run. Warnings for the same field and source MUST be reported once per scope, not once per scene.

#### Scenario: Kind preset overrides the host voice
- GIVEN the Series `character:: lucas` and the Scene Kind preset `Presenter` setting `voice`
- WHEN the script is validated
- THEN one `character-override` warning names the kind, `voice`, `kind:preset:Presenter` and `lucas`

#### Scenario: Explicit field overrides the character
- GIVEN the Video `character:: lucas` and `avatar:: other.png` at the Video
- WHEN the script is validated
- THEN a `character-override` warning names `avatar` and `video`

#### Scenario: Guest scene does not warn
- GIVEN the Series `character:: lucas` and a scene `character:: maria` with no other overrides
- WHEN the script is validated
- THEN no `character-override` warning is reported

#### Scenario: Repeated warning is collapsed
- GIVEN a Scene Kind preset overriding `voice` for six scenes of that kind
- WHEN the script is validated
- THEN a single warning is reported for the kind

### Requirement: Voice Cloning Writes A Voice With Its Language

`voice-clone.mjs` MUST write the cloned voice as a catalog `Voice` element in `model-catalog_NN.md` carrying `model`, `voice_id` and a required `language` (ISO 639-1 lowercase), and MUST fail with `voice-language-required` when the language is not given. The command MUST NOT edit `CHARACTER.md`; the setup procedure proposes the `voices` entry as a changeset.

#### Scenario: Cloned voice carries the language
- GIVEN `voice-clone.mjs` run with the sample `library/characters/lucas/voice/sample.wav` and `--language es`
- WHEN it completes
- THEN the catalog holds a Voice with `language: es` and the new `voice_id`

#### Scenario: Language is required
- GIVEN `voice-clone.mjs` run without `--language`
- WHEN it starts
- THEN it fails with `voice-language-required` and creates no Voice

#### Scenario: Character file is untouched
- GIVEN a successful clone
- WHEN `CHARACTER.md` is compared before and after
- THEN it is unchanged
