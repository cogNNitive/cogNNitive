# conntent-publication-description Delta Spec

Slice 3, PR 3b. The description is generated after QA of the master and checked by QA of the output set, and is part of the delivery. The file name (`<slug>_description.md`) is the one fixed by `conntent-folder-contract` (Slice 1); this delta refers to it as "the description file". Atomic replacement is owned by `cognnitive-conntent-engine` "Output files are never written in place".

## MODIFIED Requirements

### Requirement: Produce Writes The Chapter Block

`produce`, through `lib/description.mjs`, MUST compute one chapter line per scene as `floor(fromFrame / fps)` from the manifest of the run (the scene title from `props.title`), including engine-inserted fixed scenes in their placed order, MUST run after QA of the master passes and after the formats and thumbnails stage, before QA of the output set (`conntent-qa`), and MUST write the lines inside the chapter block delimited by `<!-- chapters:start -->` and `<!-- chapters:end -->` in the description file. It MUST create that block when absent, MUST replace only the bytes between the two markers, and MUST NOT alter any text outside them. The file MUST be replaced by rename, never written in place (`cognnitive-conntent-engine`, "Output files are never written in place"). It MUST also print the block in the run summary. The resulting description file MUST be one of the files of the delivery of the same run (see `conntent-delivery`). When QA of the master fails, the description file MUST NOT be modified.
(Previously: ran after render, before QA existed, and was not part of a delivery.)

#### Scenario: Chapters written after the prose

- GIVEN a description file with agent-authored title, summary and sources, and a rendered manifest whose QA passed
- WHEN `produce` completes
- THEN the file holds the unchanged prose plus a `<!-- chapters:start -->` … `<!-- chapters:end -->` block with one `MM:SS Title` line per scene, the first being `00:00`

#### Scenario: Re-produce replaces only the chapters

- GIVEN a description file that already has a chapter block
- WHEN `produce` runs again after a narration edit
- THEN only the bytes between the two markers change

#### Scenario: Text outside the markers is untouched

- GIVEN a chapter block followed by further agent-authored prose
- WHEN `produce` rewrites the chapters
- THEN every byte outside the two markers is identical

#### Scenario: Fixed scenes are chaptered

- GIVEN a fixed bumper scene inserted by the engine
- WHEN the chapters are written
- THEN the bumper has its own line in placed order

#### Scenario: No description file yet

- GIVEN an episode whose proposal carried no description prose
- WHEN `produce` completes
- THEN the description file is created containing only the two markers and the chapter lines

#### Scenario: Master QA failure leaves it alone

- GIVEN a run that ends in `failed_qa` at the master checkpoint
- WHEN the description file is compared with its state before the run
- THEN it is byte-identical

#### Scenario: Described in the delivery

- GIVEN a passing run
- WHEN the new `deliveries/v<N>/` is listed
- THEN it contains the description file written by that run
