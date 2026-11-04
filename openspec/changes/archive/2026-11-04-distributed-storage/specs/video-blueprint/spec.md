# Delta for video-blueprint

Living spec read: `openspec/specs/video-blueprint/spec.md`. All existing requirements about concepts, fields, defaults, resolution and the V_0-14-1 release remain valid for the content they cover. Added: the storage declaration of the `video-script` bluepriNNt and its new version.

Verified against the repository: the only video bluepriNNt under `iNNfo/specs/bluepriNNts/` is `video-script` (current `blueprint_version` `V_0-14-1`); there is no `video` directory, and this living spec states that the `video` bluepriNNt is retired. The proposal and exploration name `video` and `video-script` bluepriNNts; the `video` references are read as the local specs of `video_NN` (for example `villabotijos-today_V_0-1-0`, `innteresante_V_0-1-0`) that pin episodes today. Those local specs are out of scope of this delta; the migration change decides their fate.

## ADDED Requirements

### Requirement: The video-script bluepriNNt declares its storage

The `video-script` bluepriNNt MUST declare `Video` as a distributed concept whose instances are episode models, with a placement rule equal to the episode folder of `video-folder-contract` (`series/<series>/assets/<video>/`) and `Series` as its container. `Scene` and `Layer` MUST be elements of the Video instance model (unchanged heading nesting). `Series` MUST be declared distributed, with the domaiNN root as its container, when design confirms that a Series scope document is its instance model (assumption: see risks). The storage of `Preset` and `Video Defaults` is a design decision.

#### Scenario: Declared concepts
- GIVEN the new `video-script` version
- WHEN its storage declarations are read
- THEN `Video` is distributed with container `Series`
- AND `Scene` and `Layer` are elements of the Video instance model

#### Scenario: An episode validates at its placement
- GIVEN `series/villabotijos-today/assets/pepper-mapache/` holding the episode model
- WHEN `validate_knowledge` runs on it
- THEN it validates with no placement finding

#### Scenario: Scene and Layer are not models
- GIVEN a Scene `00-gancho` and a Layer `00-gancho-presenter`
- WHEN the domaiNN is discovered
- THEN neither is a model; each is addressed as `villabotijos-today/pepper-mapache@00-gancho` and `villabotijos-today/pepper-mapache@00-gancho-presenter`

### Requirement: The storage declaration ships as a new blueprint version

The change that adds the storage declaration MUST set `blueprint_version` above `V_0-14-1` in `spec_NN.md`, set the package defaults `parent_spec` to the same version, regenerate both `catalog.json` files, bump the skill `version:` once, and be released with a `templates-v*` tag and re-pin. Published versions MUST NOT be edited.

#### Scenario: Immutability guard accepts the bump
- GIVEN changes to `spec_NN.md`, `defaults/**` and `skills/**` with `blueprint_version` strictly greater than the merge-base value
- WHEN `guard-template-immutability` runs
- THEN it passes

#### Scenario: Catalog and parity
- GIVEN the regenerated catalogs
- WHEN `node scripts/verify.js` runs
- THEN both catalogs name `video-script` at the new version and the freshness and parity checks pass

#### Scenario: Release rehearsal
- GIVEN the templates re-pin
- WHEN `node scripts/verify.js --release` runs in a rehearsal worktree
- THEN it is green

### Requirement: Existing episodes pinning older versions are reported

Episodes pinning an older `video-script` version, a bare `video-script` name or a local url are not upgraded by this change. They MUST be reported as version skew or incomparable pins (`version-uniformity-check`) until the migration change upgrades them. Episodes pinning a different bluepriNNt (a per-series local spec) are outside this declaration: the rules of this change apply to a model only through the storage declaration of the bluepriNNt it pins, so such episodes are treated as compact models until they are migrated to `video-script`. Whether a diagnostic should flag them is a design decision (see risks).

#### Scenario: Old video-script pin reported
- GIVEN an episode pinning `video-script_V_0-14-1` while others pin the new version
- WHEN `check_domain` runs with the new release
- THEN the skew is reported, and the file is not modified

#### Scenario: Per-series local spec is outside the declaration
- GIVEN an episode pinning `villabotijos-today_V_0-1-0`
- WHEN `check_domain` runs with the new release
- THEN no placement finding is reported for it
- AND the file is not modified
