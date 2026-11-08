# conntent-delivery Delta Spec

Slice 3 (the delivery folder), with the delivery HTML view owned by Slice 4. Delivery is the last automatic step of `produce`; there is no Deliver procedure and no gate after QA.

## ADDED Requirements

### Requirement: Delivery runs automatically after QA passes

After the QA of the output set passes (the second QA checkpoint of `conntent-qa`), `produce` MUST run the delivery step without any further instruction or gate. A run under `review_gates: []` within budget MUST therefore end at `delivered`. A run whose QA fails MUST NOT run the delivery step.

#### Scenario: Autopilot ends delivered

- GIVEN `review_gates: []`, a plan within budget and a passing render
- WHEN `produce` runs
- THEN it exits 0 and the status is `delivered`

#### Scenario: QA failure skips delivery

- GIVEN QA failure
- WHEN `produce` ends
- THEN the delivery step did not run

#### Scenario: No Deliver command

- GIVEN the engine CLI
- WHEN its commands are listed
- THEN no `deliver` command exists

### Requirement: Deliveries are immutable `deliveries/v<N>/` folders

The delivery of an episode MUST be written to `deliveries/v<N>/` inside the episode folder, where `N` is a positive integer without padding (not a semantic version). A delivery folder MUST contain: every file of the declared video formats (`output_formats`, master included), every declared thumbnail, the description file, `<slug>_delivery.html` and `delivery.json`. It MUST NOT contain the animatic, the plan or the QA report. It MUST be assembled in a temporary sibling folder and moved into place by a single rename so that a `v<N>/` folder either does not exist or is complete. After creation the engine MUST NOT write, replace or delete anything inside a `v<N>/` folder, and MUST NOT delete a `v<N>/` folder; removing old versions is a human act.

#### Scenario: First delivery

- GIVEN a passing run and no `deliveries/` folder
- WHEN delivery runs
- THEN `deliveries/v1/` exists with the formats, thumbnails, description and `<slug>_delivery.html`

#### Scenario: Atomic creation

- GIVEN a delivery interrupted while assembling
- WHEN the episode folder is listed
- THEN no incomplete `v<N>/` exists

#### Scenario: Never edited afterwards

- GIVEN `deliveries/v1/` and a later run that creates `v2/`
- WHEN `v1/` is compared with its earlier state
- THEN every file in it is byte-identical

#### Scenario: Never deleted by the engine

- GIVEN three delivery versions
- WHEN `produce` runs again
- THEN all three folders still exist

### Requirement: Delivery files are hardlinks with a copy fallback

Files placed in a delivery folder MUST be hardlinks to the files in the episode folder. When the link fails with `EXDEV`, `EPERM` or `ENOTSUP` the engine MUST copy the file, MUST warn once, and MUST record the `link_mode` of the stage (`link` or `copy`) in its timing row. Earlier delivery links keep their original bytes because every output is replaced by rename, never written in place (`cognnitive-conntent-engine`, "Output files are never written in place", the single owner of that rule).

#### Scenario: Linked files

- GIVEN a delivery on one volume
- WHEN a delivered video and its source in the episode folder are compared
- THEN they are the same file on disk

#### Scenario: Copy fallback

- GIVEN a link function that fails with `EXDEV`
- WHEN delivery runs
- THEN files are copied, one warning is printed, `link_mode` is `copy` and the contents are identical to link mode

#### Scenario: Earlier version survives a re-render

- GIVEN `deliveries/v1/` hardlinked to the episode's formats and a changed re-run that replaces those formats
- WHEN `v1/` is read after the run
- THEN its files still hold the bytes they had at delivery

### Requirement: The version number increases only when the outputs change

The engine MUST compute an output hash as the sha256 of the canonical JSON list of `[file name, sha256 of bytes]` pairs, sorted by name, over the video formats, thumbnails and description file of the candidate delivery, excluding `<slug>_delivery.html` and `delivery.json`. It MUST also record, with each delivery, an input fingerprint (the sha256 of the compiled manifest content, the identities of all linked assets, and the resolved frame). Both values MUST be stored in `deliveries/v<N>/delivery.json` together with the version, the file list with each sha256, the episode `plan_hash` and the creation time. A new `v<N+1>/` MUST be created only when both the input fingerprint and the output hash differ from those of the latest existing version. When either is equal, no folder MUST be created, and the run MUST report the existing version. The output hash MUST be recomputable from a delivery folder's contents.

#### Scenario: Identical re-run creates nothing

- GIVEN `deliveries/v1/` and a re-run with no content change
- WHEN `produce` ends
- THEN no `v2/` exists and the run reports `v1` as current

#### Scenario: Changed output creates the next version

- GIVEN `deliveries/v1/` and an edited scene that changes the video
- WHEN `produce` ends
- THEN `deliveries/v2/` exists and `v1/` is unchanged

#### Scenario: Changed inputs, identical bytes

- GIVEN a change that alters the input fingerprint but yields identical output bytes
- WHEN delivery runs
- THEN no new version is created

#### Scenario: Same inputs, non-reproducible bytes

- GIVEN an unchanged input fingerprint and re-encoded outputs with different bytes
- WHEN delivery runs
- THEN no new version is created

#### Scenario: HTML excluded from the hash

- GIVEN two deliveries identical except for the HTML
- WHEN their output hashes are compared
- THEN they are equal

#### Scenario: Hash recomputable

- GIVEN a delivery folder
- WHEN its output hash is recomputed from its files
- THEN it equals the hash recorded for it

#### Scenario: Gaps are not reused

- GIVEN `v1/` and `v3/` only (a human deleted `v2/`)
- WHEN a new delivery is due
- THEN it is `v4/`

### Requirement: The delivery contains the description and the thumbnails of the same run

The description file and the thumbnails in a delivery MUST be those produced by the same run as the videos. The description MUST be generated after QA of the master passes (see `conntent-publication-description`).

#### Scenario: Same run

- GIVEN a delivery created by run `r`
- WHEN the ledger and timing rows are read
- THEN the delivered description and thumbnails were produced by `r`

### Requirement: The delivery HTML is a read-only scoped view
<!-- shared with slice 4: view and runtime in conntent-domain-console and console-scope -->

Each `deliveries/v<N>/` MUST contain `<slug>_delivery.html`, produced by the same console writer and runtime as the domaiNN console through a read-only `delivery` view scoped to the one episode, referencing its sibling files by relative path. The HTML MUST carry no edit control and MUST NOT be part of the output hash. If the delivery view cannot be produced, delivery MUST fail with a named error (exit 1) and create no folder; it MUST NOT create a folder without the HTML.

#### Scenario: HTML present and relative

- GIVEN a created delivery
- WHEN `<slug>_delivery.html` is read
- THEN it references the videos and thumbnails by relative paths that exist in the same folder

#### Scenario: Read only

- GIVEN the delivery HTML
- WHEN it is scanned for edit and verdict controls
- THEN none exists

#### Scenario: Writer failure

- GIVEN a failing delivery view export
- WHEN delivery runs
- THEN no `v<N>/` folder is created and the run reports the error

### Requirement: Publishing is out of the engine

The engine MUST NOT upload, publish or record a published URL. The set of deliverables MUST end at the delivery folder.

#### Scenario: No publish command

- GIVEN the engine CLI and the lifecycle states
- WHEN they are listed
- THEN no `publish` command and no `published` state exists
