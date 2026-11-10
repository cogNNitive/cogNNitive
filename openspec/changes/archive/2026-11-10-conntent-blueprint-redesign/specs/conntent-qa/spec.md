# conntent-qa Delta Spec

Slice 3, PR 3b. Replaces the minimal overlay check of `conntent-render-hotfix` with the full QA. With no master gate, QA is the only automatic guard between a broken video and the recipient.

## ADDED Requirements

### Requirement: QA always runs and cannot be skipped

`produce` MUST run QA at exactly two checkpoints of every run (D9): the master checkpoint, right after render (overlays, durations and master properties), and the output-set checkpoint, after the formats, thumbnails and description stages and before delivery (every declared output exists with its dimensions). There MUST be no flag, field or environment variable that skips either. A QA run that cannot execute (a missing probe tool, an unreadable master) MUST be reported with the check id `qa-unavailable` and MUST be treated as a QA failure (see "A failure sets `failed_qa` and delivers nothing"), never as a pass. The hotfix minimal overlay check MUST be one check of this QA, not a second mechanism.

#### Scenario: No skip option

- GIVEN the engine CLI
- WHEN `produce` is run with `--skip-qa`
- THEN it exits non-zero with a usage that does not list the flag

#### Scenario: Tool missing fails

- GIVEN `ffprobe` and `ffmpeg` unavailable
- WHEN QA starts
- THEN the run exits 12 with `qa-unavailable` in the QA report and the episode becomes `failed_qa`, not `produced`

#### Scenario: Two checkpoints

- GIVEN a passing run
- WHEN its timing log is read
- THEN there is one `qa` row after `render` and one after `description`, before `delivery`

#### Scenario: One mechanism

- GIVEN the engine scripts
- WHEN they are searched for the manifest-versus-`index.html` overlay comparison
- THEN it exists once, inside the QA module

### Requirement: Every manifest overlay is present in the render

For each overlay and caption item in the compiled manifest (titles, lower thirds, quotes, watermarks, Chrome overlays including the CTA, `caption` overlays, and caption words when captions are on), QA MUST verify two things. First, structurally, that the item exists as a host in the emitted `index.html` with start and duration equal to the manifest's. Second, visibly, that frames sampled inside the item's interval, within its text region, differ from the same region sampled in a reference frame outside the interval by more than a named threshold constant. A missing item MUST be reported with the check id `overlay-missing`, the overlay kind, its text, its scene and its interval.

#### Scenario: All overlays present

- GIVEN a master rendered from a manifest with a title, a lower third and a watermark
- WHEN QA runs
- THEN the `overlay` checks all pass

#### Scenario: Overlay in manifest but not in HTML

- GIVEN a manifest title that never reached `index.html`
- WHEN QA runs
- THEN `overlay-missing` names the title, its scene and interval, and the structural half fails

#### Scenario: Overlay emitted but invisible

- GIVEN a watermark host in `index.html` whose pixels do not appear in the frames sampled in its interval
- WHEN QA runs
- THEN `overlay-missing` is reported for the watermark with the sampled times

#### Scenario: Captions words sampled

- GIVEN `captions: words` and an aligned word with interval `[t0, t1]`
- WHEN QA runs
- THEN a frame inside `[t0, t1]` is sampled in the captions region and compared

#### Scenario: Example episode regression

- GIVEN a render whose scene text layers never reached the HTML (the finding F1 of the review)
- WHEN QA runs
- THEN QA fails and the episode becomes `failed_qa`

### Requirement: Scene durations and master properties match the manifest

QA MUST verify, from the master file, that the total duration equals the manifest's `totalDurationInSeconds` within one frame, that each scene's start and duration (from the manifest) fall inside the master's duration, that the width and height equal the declared master size, and that the master has an audio stream when any scene has narration. Violations MUST be reported with the check ids `duration-mismatch`, `size-mismatch` and `audio-missing`.

#### Scenario: Duration within a frame

- GIVEN a master 1 frame longer than the manifest total
- WHEN QA runs
- THEN the duration check passes

#### Scenario: Duration off by a second

- GIVEN a master one second shorter than the manifest total
- WHEN QA runs
- THEN `duration-mismatch` is reported with both values

#### Scenario: Wrong size

- GIVEN a master reported by ffprobe as 1920x1080 while the declared master is 1920x1920
- WHEN QA runs
- THEN `size-mismatch` is reported

#### Scenario: Silent master

- GIVEN narrated scenes and a master without an audio stream
- WHEN QA runs
- THEN `audio-missing` is reported

### Requirement: Every format and thumbnail exists

At the output-set checkpoint, QA MUST verify that each declared video format (`output_formats`) and each declared thumbnail (`thumbnail_formats`) exists, is non-empty, and has dimensions equal to those in its file name, and that the description file exists. Violations MUST be reported with `output-missing`, `output-empty` or `output-size-mismatch`.

#### Scenario: All present

- GIVEN every declared output on disk with matching dimensions
- WHEN the output check runs
- THEN it passes

#### Scenario: Missing thumbnail

- GIVEN `thumbnail_formats: [2560x1440, 1080x1920]` and only the first file present
- WHEN the output check runs
- THEN `output-missing` names `<slug>_thumbnail_1080x1920.png`

#### Scenario: Wrong dimensions

- GIVEN `<slug>_1080x1920.mp4` that ffprobe reports as 1080x1080
- WHEN the output check runs
- THEN `output-size-mismatch` is reported

#### Scenario: Zero-byte file

- GIVEN a zero-byte thumbnail
- WHEN the output check runs
- THEN `output-empty` is reported

### Requirement: A failure sets `failed_qa` and delivers nothing

When any QA check fails at either checkpoint, `produce` MUST set `status:: failed_qa` through an engine changeset, MUST write the QA report `qa.json` in the episode folder (`conntent-folder-contract`; check id, checkpoint, scene, expected, found, sampled time or file) and print it, MUST exit with status 12 and the named error `qa-failed`, MUST NOT set `produced` or `delivered`, and MUST NOT create or alter any `deliveries/v<N>/` folder. A master-checkpoint failure MUST stop the run before formats, thumbnails and description, so the description file is not modified. The master and any derived files MUST be kept for inspection. The next `produce` MUST be allowed to run from `failed_qa`.

#### Scenario: Failure blocks delivery

- GIVEN a master with a missing overlay
- WHEN `produce` completes
- THEN it exits 12, the status is `failed_qa` and no new `deliveries/v<N>/` exists

#### Scenario: Previous delivery untouched

- GIVEN an episode with `deliveries/v1/` and a later run that fails QA
- WHEN the folder is listed
- THEN `deliveries/v1/` is byte-identical and no `v2/` exists

#### Scenario: Report written

- GIVEN a QA failure
- WHEN the episode folder is listed
- THEN a QA report exists naming every failed check

#### Scenario: Recovery

- GIVEN an episode in `failed_qa` whose cause was fixed
- WHEN `produce` runs again
- THEN QA passes and the run continues to delivery

#### Scenario: Master kept

- GIVEN a QA failure
- WHEN the episode folder is listed
- THEN the rendered master is still present

### Requirement: QA is deterministic about its sampling

QA MUST sample at fixed positions (the midpoint of each overlay interval, and the first and last frame of each scene) so that the same inputs yield the same report. The sampled times MUST appear in the report.

#### Scenario: Repeatable

- GIVEN the same master and manifest checked twice
- WHEN the reports are compared
- THEN they are identical
