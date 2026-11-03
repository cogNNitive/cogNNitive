# video-console-views Specification

## Purpose

Defines the two domaiNN console views of the video workflow (Episode review and Series) registered through the view registry, the removal of the standalone console, and the rule that no control may exist without effect. Decision D10 of change `2026-11-02-video-script-v1`. The registry gains a generic data hook (design.md A12), specified in the delta for `console-view-registry`.

## Requirements

### Requirement: Views Are Registered, Not Standalone

The Episode review and Series views MUST be registered through `registerView` as blueprint views of `coNNtent`, MUST appear as tabs in the domaiNN console and MUST be exportable with `scripts/export-console.mjs --view <id>`. The standalone console template `draft-template.html`, its builder and the generated `review_console.html` MUST NOT exist.

#### Scenario: Views appear as tabs

- GIVEN a domaiNN adopting `coNNtent`
- WHEN the console opens
- THEN tabs for Episode review and Series are listed

#### Scenario: Single-view export

- GIVEN the Episode review view id
- WHEN `export-console.mjs --view` runs with it
- THEN one HTML file is produced that contains only that view

#### Scenario: Quine is gone

- GIVEN the skill's `scripts/`
- WHEN it is listed
- THEN `draft-template.html` and `build-draft-html.mjs` do not exist

### Requirement: Episode Review View

The view MUST present the proposed changeset of one episode: scenes in order with kind, variants, narration editing, verdict and comment per scene, one ordered preset selector listing the Presets visible from the episode (reusing the selector behaviour of the former console), and the estimated cost against the budget. Its edits MUST be written as changeset operations (`update_field` for chosen variants, edited narration and verdicts; `comment` for reasons), as specified by capability `video-script-review`. The view MUST ship as `console-view-episode-review.js` in the bluepriNNt `assets/`.

#### Scenario: Scenes and verdicts shown

- GIVEN a proposed script with 4 scenes
- WHEN the view opens
- THEN 4 scenes are listed with their kind, narration and verdict controls

#### Scenario: One preset selector

- GIVEN a chain defining `Lucas` in the Series and `Studio Warm` in the domaiNN
- WHEN the view opens
- THEN one selector offers both and no per-kind selector exists

#### Scenario: Edit is a changeset operation

- GIVEN an edited narration
- WHEN the reviewer saves
- THEN a changeset operation carries the new text and the view holds no private copy

#### Scenario: Picklists come from the catalog

- GIVEN the merged model catalog
- WHEN a model picklist is rendered
- THEN its options are the allowed models and no tier label (ALTA, MEDIA, RAPIDA) or ease name is baked into the view

### Requirement: Series View

The view MUST list the Series' episodes by state, and for each episode and for the Series the real cost from the ledger, the stage timings from the timing log, and a comparison of runs across machine fingerprints. Data MUST be read from the JSONL facts, not recomputed from estimates, and MUST reach the view only through `ctx.viewData` collected by the view's data hook (capability `console-view-registry` "View Data Collection Hook"). The view MUST ship as `console-view-series.js` with `console-view-series.data.mjs` in the bluepriNNt `assets/`. Stale prices MUST be flagged in the view.

#### Scenario: Episodes by state

- GIVEN a Series with episodes in three states
- WHEN the view opens
- THEN episodes are grouped by state with counts

#### Scenario: Real cost shown

- GIVEN ledger records for an episode
- WHEN the view opens
- THEN the episode's cost equals the sum of its ledger records

#### Scenario: Machine comparison

- GIVEN two runs of the same stage on different fingerprints
- WHEN the view opens
- THEN both durations are shown side by side with their fingerprints

#### Scenario: Several machines

- GIVEN ledger and timing files from two machines collected at export time
- WHEN the view opens
- THEN both machines' runs appear, distinguished by fingerprint

#### Scenario: Stale price flagged

- GIVEN a ledger row whose `price_date` exceeds the staleness threshold
- WHEN the view opens
- THEN the row is flagged as stale and still counted

#### Scenario: No facts yet

- GIVEN a Series with no ledger or timing records
- WHEN the view opens
- THEN it shows an empty state and no error

### Requirement: No Control Without Effect

No console control MUST exist whose edit is not carried to the produced output. Before the views exist (Slice 0, `draft-template.html` on V_0-14-x), the non-preset controls (`voice_speed`, `background_audio_volume`, `transition`, `fps` and any control whose override the script build discards) MUST be removed. A test MUST fail when a control's exported key is not consumed by the script build.

Slice: 0 (V_0-14-x), then carried by the registered views.

#### Scenario: Dropped controls are removed

- GIVEN `draft-template.html` on the Slice 0 line
- WHEN its controls are listed
- THEN only the preset selector and fields that `build-script-from-draft.mjs` writes remain

#### Scenario: Control without a consumer fails the test

- GIVEN a console control exporting a key that the build ignores
- WHEN the consumer test runs
- THEN it fails naming the control

### Requirement: Views Stay Within The Registry Budget

The exported console with the views MUST stay under the 5 MB warning threshold of `console-view-registry`. When it cannot, the views MUST be split into smaller views rather than exceed the failure threshold.

#### Scenario: Budget respected

- GIVEN the built views
- WHEN the size check of the registry runs
- THEN it passes for each view
