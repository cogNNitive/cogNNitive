# Delta for video-blueprint

Scope: the blueprint text and validation for the single square master, and the release obligations of this change on the unreleased `V_0-14-0` train. Design decision ids refer to `design.md` of change `2026-11-01-video-folder-contract`.

Composition with `2026-11-01-video-presets` (applied first): that change ADDS "Blueprint Version Bump And Catalog Parity" and MODIFIES "Native L2 Video-Script Blueprint". This delta modifies neither; the requirements below have distinct headings and extend the version obligations without restating them.

## ADDED Requirements

### Requirement: Blueprint Declares master_resolution With One Option

The `video-script` blueprint MUST define `master_resolution` as a `select` Field of the `Video Defaults` Concept with the single option `1920x1920`, and the package `defaults/video-defaults_NN.md` MUST declare `master_resolution:: 1920x1920`.

Source: D3, D4, settled default 4.

#### Scenario: Default validates

- GIVEN the package `defaults/video-defaults_NN.md`
- WHEN it is validated against the blueprint
- THEN it validates with no schema errors and `master_resolution` is `1920x1920`

#### Scenario: Other value fails validation

- GIVEN a domain `video-defaults_NN.md` declaring `master_resolution:: 1280x720`
- WHEN it is validated
- THEN validation fails because the value is not an option of the Field

#### Scenario: Not settable on a Video

- GIVEN a `Video` element declaring `master_resolution::`
- WHEN the script is validated
- THEN validation fails because the Field is not defined for `Video`

#### Scenario: Undeclared resolution fields stay undeclared

- GIVEN the blueprint
- WHEN its Field Definitions are listed
- THEN `resolution`, `format` and `fps` are not defined

### Requirement: Blueprint Text Describes A Single Square Master

The `video-script` blueprint `spec_NN.md` MUST describe the Video `master` field as the episode's square master `<slug>_1920x1920.mp4` and the Layer `position` field as an overlay anchor inside the central safe square, and MUST NOT contain the 16:9 `center 12%` wording, a native dual-master (16:9 and 9:16) description or 9:16 position behaviour.

Source: D4.

#### Scenario: Master text is rewritten

- GIVEN `spec_NN.md`
- WHEN the `master` Field Definition description is read
- THEN it names the square master and states that delivery formats are derived by `render-formats` and never modeled

#### Scenario: Position text is rewritten

- GIVEN `spec_NN.md`
- WHEN the `position` Field Definition description is read
- THEN it names the central safe square of 1080x1080 of the master

#### Scenario: Retired wording is gone

- GIVEN `spec_NN.md`
- WHEN it is searched for `center 12%` and `dual`
- THEN no match is found

### Requirement: Folder Contract Change Rides The Same Version Train

This change MUST NOT bump `blueprint_version` beyond the unreleased `V_0-14-0` of change `2026-11-01-video-presets`; if `origin/main` already carries `V_0-14-0` when this change's field edits land, the blueprint MUST instead be set to `V_0-14-1` in the same slice that edits `spec_NN.md`, the package defaults `parent_spec` and both `catalog.json` files, and the skill `version:` MUST be bumped once, coordinated with that change.

Source: D11 release checklist, settled default 11.

#### Scenario: Same train, no further bump

- GIVEN `origin/main` does not carry `V_0-14-0`
- WHEN this change edits `spec_NN.md` for `master_resolution`
- THEN `blueprint_version` stays `V_0-14-0`

#### Scenario: Main already carries the version

- GIVEN `origin/main` already carries `V_0-14-0`
- WHEN this change edits `spec_NN.md`
- THEN `blueprint_version` is `V_0-14-1`, the package defaults `parent_spec` names `video-script_V_0-14-1`, and both catalogs name `V_0-14-1`

#### Scenario: Catalogs and guards stay green

- GIVEN the regenerated catalogs and the shipped `procedures/` folder
- WHEN `node scripts/verify.js` runs
- THEN the field-catalogue, metaschema self-describe, template-immutability and blueprint inventory and catalog guards pass
