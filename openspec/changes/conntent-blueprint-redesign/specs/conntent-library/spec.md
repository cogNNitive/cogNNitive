# conntent-library Delta Spec

Source decisions: D1, D2, C1 (Slice 1: Structure). Governing premise: no backwards compatibility. Legacy layouts are rejected with one actionable message per detected path; no alias, reader or migration script exists.

## ADDED Requirements

### Requirement: Library Folders Hold Everything Reusable

A domaiNN and each series MUST be able to hold one `library/` folder directly at its root (`library/` at the domaiNN root, `series/<s>/library/` at the series root). Everything reusable MUST live under it, in exactly these kind folders:

| Kind folder | Holds |
|---|---|
| `music/` | background music tracks (`mp3`, `wav`, `m4a`, `ogg`, `flac`) |
| `sounds/` | sound-event files (same extensions as `music/`) |
| `frames/` | one folder per frame, `frames/<name>/FRAME.md` (see capability `conntent-frame`) |
| `components/` | one folder per component, `components/<name>/COMPONENT.md` (see capability `conntent-component-portfolio`) |
| `characters/` | one folder per character, `characters/<name>/CHARACTER.md` (see capability `conntent-character`) |
| `media/` | other reusable media: bumpers, intros, logos and images (`mp4`, `mov`, `webm`, `png`, `jpg`, `jpeg`, `webp`, `svg`) |

A `library/` MUST NOT contain a kind folder outside this table. Avatars MUST live inside their character (`characters/<name>/avatars/`) and MUST NOT appear in `music/`, `sounds/` or `media/` as the home of a character. Item and file names inside `library/` MUST be lowercase, each path segment matching `^[a-z0-9]+([-_][a-z0-9]+)*$` before the extension. `library/` is authored, tracked content and MUST NOT be gitignored.

<!-- Assumption: `media/` is a sixth kind, added because C1 lists five kinds but Chrome bumpers, intros and logos need a reusable home. -->

#### Scenario: Valid library at both levels
- GIVEN `library/music/ambient.mp3` and `series/news/library/frames/night/FRAME.md`
- WHEN the layout check runs
- THEN both folders are accepted

#### Scenario: Unknown kind folder is rejected
- GIVEN `library/fonts/` at the domaiNN root
- WHEN the layout check runs
- THEN it fails with `unknown-library-kind` naming `library/fonts/` and listing the six allowed kinds

#### Scenario: Invalid item name is rejected
- GIVEN `library/music/Ambient Loop.mp3`
- WHEN the layout check runs
- THEN it fails with `invalid-library-name` naming the path and the allowed pattern

#### Scenario: Library is not ignored
- GIVEN the managed `.gitignore` block
- WHEN `git check-ignore library/music/ambient.mp3` and `git check-ignore series/news/library/frames/night/FRAME.md` are run
- THEN neither path is ignored

### Requirement: References Are Logical Names Resolved By Upward Lookup

A file-typed field (`background_audio`, `avatar`, `intro`, `asset`, `thumbnail_base`, a Scene Kind `asset`, a `Chrome` media item) and a name-typed field (`frame`, `character`, the values of `components` and `sounds`) MUST be written as a **logical name** and not as a path. A logical name has the form `<kind>/<path>` where `<kind>` is one of the library kind folders and `<path>` is zero or more folder segments and a file or item name, with or without extension (for example `music/ambient`, `music/ambient.mp3`, `media/bumpers/intro`). Name-typed fields name a single kind implicitly: `frame:: night` means `frames/night`, `character:: lucas` means `characters/lucas`, `components:: title=hero-title` means `components/hero-title`, and `sounds:: scene-boundary=whoosh` means `sounds/whoosh`.

Resolution MUST look the name up in this order, starting at the consuming episode and going outwards, and the first match MUST win:

1. the episode `media/` folder (`series/<s>/episodes/<slug>/media/<kind>/<path>`);
2. the series `library/` (`series/<s>/library/<kind>/<path>`);
3. the domaiNN `library/` (`library/<kind>/<path>`);
4. for the kinds `frames` and `components` only, the blueprint package `library/` (the shipped neutral frame and the vendored component base set).

The consuming episode, not the document that declares the name, MUST be the starting point, so a series or domaiNN document that declares `background_audio:: music/ambient` is overridden by an episode `media/music/ambient.mp3`. When there is no consuming episode (validating a series or domaiNN document on its own), the lookup MUST start at the series, or at the domaiNN when there is no series.

A bare file name with no `/` in a file-typed field (for example `shot1.png`) MUST resolve only inside the episode `media/` folder. A relative path with folder segments whose first segment is not a library kind MUST be rejected with `invalid-reference` naming the field, the value and the expected form.

When the lookup crosses an `isolate` series scope, it MUST NOT continue to the domaiNN `library/`.

#### Scenario: Nearest level wins
- GIVEN `music/ambient.mp3` in the episode `media/`, in the series `library/` and in the domaiNN `library/`
- WHEN `background_audio:: music/ambient` is resolved for a scene of that episode
- THEN the file is the one in the episode `media/`

#### Scenario: Falls through to the series, then to the domaiNN
- GIVEN `music/ambient.mp3` only in the series `library/`, and `sounds/whoosh.mp3` only in the domaiNN `library/`
- WHEN `background_audio:: music/ambient` and `sounds:: scene-boundary=whoosh` are resolved
- THEN the first resolves to the series file and the second to the domaiNN file

#### Scenario: Declared at the series, resolved from the episode
- GIVEN the series document declaring `background_audio:: music/ambient`, `series/s/library/music/ambient.mp3` and an episode `media/music/ambient.mp3`
- WHEN a scene of the episode resolves `background_audio`
- THEN the file is the episode file, and the trace names the series as the level that supplied the name

#### Scenario: Package fallback only for frames and components
- GIVEN no `neutral` frame in any `library/` and the package shipping `frames/neutral`
- WHEN `frame:: neutral` is resolved
- THEN it resolves to the package frame
- AND `background_audio:: music/ambient` with no file at any level fails with `library-not-found`, never a package fallback

#### Scenario: Not found lists what was searched
- GIVEN `background_audio:: music/missing` and no such file
- WHEN the pre-compile check runs
- THEN it fails with `library-not-found` naming the field, the name and every folder searched, in order
- AND nothing is spent

#### Scenario: Bare file name resolves in the episode media only
- GIVEN `shot1.png` in the series `library/media/` and not in the episode `media/`
- WHEN a Layer declares `asset:: shot1.png`
- THEN it fails with `library-not-found` naming the episode `media/` folder as the only folder searched

#### Scenario: Relative path with a foreign first segment
- GIVEN a Layer declaring `asset:: images/shot1.png`
- WHEN the pre-compile check runs
- THEN it fails with `invalid-reference` naming `images/shot1.png`

#### Scenario: Isolate stops the lookup
- GIVEN a series with `isolate: true` and `music/ambient.mp3` only in the domaiNN `library/`
- WHEN a scene of that series resolves `background_audio:: music/ambient`
- THEN it fails with `library-not-found` and the searched folders do not include the domaiNN `library/`

### Requirement: Extension Resolution And Ambiguity

When a logical name carries no extension, the lookup MUST match files in the folder of the first matching level whose base name equals the name and whose extension belongs to the kind. When more than one file in the same folder matches (for example `ambient.mp3` and `ambient.wav`), resolution MUST fail with `library-ambiguous` listing the candidates and MUST NOT pick one. A name with an explicit extension MUST match that file only. An extension outside the kind's allowed list MUST fail with `library-extension-not-allowed`.

#### Scenario: Extension is inferred
- GIVEN `library/music/ambient.mp3` only
- WHEN `music/ambient` is resolved
- THEN the file is `library/music/ambient.mp3`

#### Scenario: Two candidates are ambiguous
- GIVEN `library/music/ambient.mp3` and `library/music/ambient.wav`
- WHEN `music/ambient` is resolved
- THEN it fails with `library-ambiguous` listing both files
- AND `music/ambient.wav` resolves to the wav file

#### Scenario: Extension not allowed for the kind
- GIVEN `background_audio:: music/ambient.png`
- WHEN the pre-compile check runs
- THEN it fails with `library-extension-not-allowed` naming `png` and the kind `music`

### Requirement: Level Prefixes Force A Level

A logical name MAY start with `domain:` or `series:` (for example `domain:music/ambient`, `series:frames/night`). The prefix MUST restrict the lookup to that single level's `library/`: `series:` skips the episode `media/` and the domaiNN, `domain:` skips the episode and the series. A prefix with no match at its level MUST fail with `library-not-found` naming that level only; there is no fall-through. Any other prefix (`episode:`, `package:`, a URL scheme, a drive letter) MUST fail with `invalid-reference`. `series:` used where no series exists MUST fail with `library-no-series`.

#### Scenario: Domain prefix skips nearer copies
- GIVEN `music/ambient.mp3` in the series `library/` and in the domaiNN `library/`
- WHEN `domain:music/ambient` is resolved
- THEN the file is the domaiNN one

#### Scenario: Series prefix skips the episode copy
- GIVEN `music/ambient.mp3` in the episode `media/` and in the series `library/`
- WHEN `series:music/ambient` is resolved
- THEN the file is the series one

#### Scenario: Forced level has no file
- GIVEN `music/ambient.mp3` only in the series `library/`
- WHEN `domain:music/ambient` is resolved
- THEN it fails with `library-not-found` naming only the domaiNN `library/music/` folder

#### Scenario: Unknown prefix
- GIVEN `background_audio:: episode:music/ambient`
- WHEN the pre-compile check runs
- THEN it fails with `invalid-reference` naming the prefix `episode:`

#### Scenario: Series prefix without a series
- GIVEN an episode outside any series and `series:music/ambient`
- WHEN the name is resolved
- THEN it fails with `library-no-series`

### Requirement: Paths That Climb Or Point Outside Are Rejected

A reference MUST be rejected with `reference-escape` when it contains a `..` segment, is an absolute path (leading `/`, leading `\`, a drive letter such as `C:`, or a UNC prefix `\\`), contains a backslash, or when the real path of the resolved file (after following symbolic links and junctions) lies outside the `library/` or `media/` root of the level that matched. A URL (`http:`, `https:`, `file:`) in a file-typed field MUST be rejected with `invalid-reference`. The error MUST name the field, the value and the document, and MUST be raised before any spend.

#### Scenario: Parent segment
- GIVEN `background_audio:: ../../assets/music/ambient.mp3`
- WHEN the pre-compile check runs
- THEN it fails with `reference-escape` naming the field and the value

#### Scenario: Absolute paths
- GIVEN the values `/tmp/a.mp3`, `C:\media\a.mp3` and `\\server\share\a.mp3`
- WHEN each is checked
- THEN each fails with `reference-escape`

#### Scenario: Backslash separator
- GIVEN `music\ambient`
- WHEN the name is checked
- THEN it fails with `reference-escape`

#### Scenario: Symbolic link leaving the library
- GIVEN `library/music/ambient.mp3` is a symbolic link or junction to a file outside the domaiNN
- WHEN `music/ambient` is resolved
- THEN it fails with `reference-escape` naming the real path

#### Scenario: URL in a file field
- GIVEN `intro:: https://example.com/intro.mp4`
- WHEN the pre-compile check runs
- THEN it fails with `invalid-reference`

### Requirement: The Plan And The Console Report The Resolved File

Every resolved logical name MUST produce a resolution record `{ field, name, level, path }` where `level` is `episode`, `series`, `domain` or `package` and `path` is the file or item folder relative to the domaiNN root. The persisted plan (see `conntent-folder-contract` "One Plan And One Ledger Location") MUST list one record per name, and the console payload MUST expose the same records so the console can show which file each name resolved to. A name that resolves to different files for different scenes MUST produce one record per scene.

#### Scenario: Plan lists the resolution
- GIVEN `background_audio:: music/ambient` resolved to `series/s/library/music/ambient.mp3`
- WHEN the plan is written
- THEN it contains `{ field: "background_audio", name: "music/ambient", level: "series", path: "series/s/library/music/ambient.mp3" }`

#### Scenario: Prefixed name is recorded as written
- GIVEN `domain:music/ambient`
- WHEN the plan is written
- THEN the record keeps `name: "domain:music/ambient"` and `level: "domain"`

#### Scenario: Per-scene difference
- GIVEN scene 1 inheriting `music/ambient` from the series and scene 2 with an episode `media/music/ambient.mp3`
- WHEN the plan is written
- THEN there are two records with levels `series` and `episode`

### Requirement: Legacy Root Folders Are Rejected

The layout check MUST reject, with the code `legacy-layout`, each of these folders when it exists, with exactly one message per detected path, naming the path found and the new location, and MUST fail `produce`, `compile` and `check_domain` before any spend:

| Detected path | Message |
|---|---|
| `sounds/`, `components/` or `frames/` at the domaiNN root, at a series root, or inside an episode folder | "`<path>` is no longer supported; reusable files now live in `library/<name>/` (episode-only files in `media/<name>/`); recreate this domaiNN" |
| `series/<s>/shared/` | "`series/<s>/shared/` is no longer supported; series media now lives in `series/<s>/library/<kind>/`; recreate this domaiNN" |
| `series/<s>/assets/` | see `conntent-folder-contract` "Legacy Layouts Are Rejected, Not Adapted" |

No tool MUST read, move, copy or search the rejected folders, and no alias or fallback lookup into them MUST exist.

#### Scenario: Root sounds folder
- GIVEN `sounds/whoosh.mp3` at the domaiNN root
- WHEN `check_domain` runs
- THEN exactly one `legacy-layout` finding names `sounds/` and the location `library/sounds/`

#### Scenario: Several legacy folders
- GIVEN `sounds/`, `frames/` at the domaiNN root and `series/s/components/`
- WHEN the layout check runs
- THEN three `legacy-layout` findings are reported in one failure, one per path

#### Scenario: Legacy folder is never a lookup source
- GIVEN `sounds/whoosh.mp3` only at the legacy root path
- WHEN `sounds:: scene-boundary=whoosh` is resolved
- THEN the run fails with `legacy-layout` and the file is not used

#### Scenario: Shared folder
- GIVEN `series/s/shared/audio/intro.mp3`
- WHEN the layout check runs
- THEN a `legacy-layout` finding names `series/s/shared/` and `series/s/library/`
