# conntent-domain-console Specification (new capability, Slice 4)

## Purpose

Defines the single registered coNNtent console view: a Domain, Series, Episode tree with a Pending inbox as the home screen, the per-level sections, the effective-value-plus-source display, media playback by relative path, review verdict controls, the component picker, and the read-only per-episode `conntent-delivery` view. It replaces `conntent-console-views` (Episode review and Series views). Follows the agreed mockup `console-mockup/domaiNN_console_mockup.html`; where this spec and the mockup differ, this spec wins (see "Episode Deliveries section" for the one deliberate difference).

Source: D14, D16, D18 (picker), D4 (display), C6 (display), C7, C9 (display), C10.

## ADDED Requirements

### Requirement: One registered coNNtent view

The coNNtent bluepriNNt MUST ship one view module, `assets/console-view-conntent.js` with its data module `console-view-conntent.data.mjs`, which registers exactly two views through `registerView` (`console-view-registry`): the editable view `conntent`, and the read-only view `conntent-delivery` (see "Read-only delivery view"), which renders the same Episode panel code as `conntent` in read-only form. The views `Episode review` and `Series` MUST NOT be registered, and their assets (`console-view-episode-review.*`, `console-view-series.*`) MUST NOT exist. The `conntent` view MUST appear as a tab of the domaiNN console next to the core tabs and MUST remain exportable standalone with `export-console.mjs --view conntent`.

#### Scenario: One coNNtent tab
- GIVEN a domaiNN adopting `coNNtent`
- WHEN the domaiNN console opens
- THEN the registry lists the views `conntent` and `conntent-delivery` and no view titled `Episode review` or `Series`

#### Scenario: Old view assets are gone
- GIVEN the bluepriNNt `assets/` after this change
- WHEN it is listed
- THEN neither `console-view-episode-review.js` nor `console-view-series.js` nor `console-view-series.data.mjs` exists

#### Scenario: One module, two ids
- GIVEN the bluepriNNt `assets/`
- WHEN the files registering views for coNNtent are listed
- THEN exactly one view module exists and it registers `conntent` and `conntent-delivery`

#### Scenario: Standalone export
- GIVEN the id `conntent`
- WHEN `export-console.mjs --view conntent` runs
- THEN one HTML file is produced that mounts only the coNNtent view

### Requirement: Console opens on the Pending inbox

For a domaiNN adopting `coNNtent`, a console opened with no location hash MUST show the `conntent` view with the Pending inbox selected (see `console-view-registry`, "Default view of a blueprint"). A location hash naming a tree node MUST open that node instead. A hash naming an unknown node MUST fall back to the Pending inbox and MUST NOT throw.

#### Scenario: Cold open
- GIVEN a coNNtent domaiNN console opened with no hash
- WHEN it boots
- THEN the `conntent` tab is active and the Pending inbox is displayed

#### Scenario: Deep link to an episode section
- GIVEN the hash of episode `tortilla-tax`, section Review
- WHEN the console boots
- THEN that episode's Review section is displayed and the tree marks the episode as current

#### Scenario: Unknown node
- GIVEN a hash naming an episode that does not exist
- WHEN the console boots
- THEN the Pending inbox is displayed and no error is thrown

### Requirement: Domain, Series, Episode tree

The view MUST render a navigation rail with, in order: the Pending entry (with the count of pending items), then the tree domaiNN, its series, and under each series every episode found under `series/<s>/episodes/<slug>/`. Exactly one node MUST carry `aria-current="true"`. A series node MUST show the number of its pending items when greater than zero. An episode node MUST show a state mark: delivered, failed QA, and any other state by a neutral mark. The tree MUST be built from the payload; it MUST NOT contain a node for a folder the engine rejected as a legacy layout.

#### Scenario: Every episode is listed
- GIVEN a series with episodes `a`, `b` and `c` under `episodes/`
- WHEN the rail renders
- THEN three episode nodes appear under that series

#### Scenario: Counts match the inbox
- GIVEN two pending items in series S1 and none in series S2
- WHEN the rail renders
- THEN the Pending entry shows 2, S1 shows 2 and S2 shows no count

#### Scenario: One current node
- GIVEN the user selects an episode node
- WHEN the rail re-renders
- THEN only that node has `aria-current="true"`

### Requirement: Pending inbox lists everything that waits on a person

The Pending inbox MUST list, oldest first by the timestamp since which the item has been waiting (not by the text of the displayed age), every item that waits on a person:
1. an episode with a `script`, `preview` or `budget` gate that is `open`, `reopened` or `needs-change`;
2. an episode in `failed_qa`;
3. a proposed changeset (for example a setup-wizard proposal) that no one has applied yet, linking to the Changes tab.

Each row MUST show: a state pill, the episode title (or the changeset title), `series / slug`, one line stating the action required (for example "Review the script before any spend", "Review the animatic, approve $1.09 avatar spend", "Approve $0.41 spend: the plan exceeds the budget", "Fix and re-render: QA found missing overlays"), the waiting age, and an Open control. Activating a row MUST open the owning episode at the Review section for a gate, at the Status section for `failed_qa`. Delivered episodes MUST NOT appear. The inbox MUST also show one informational Budget row for the domaiNN (daily spend against `daily_budget`); that row MUST NOT be counted in any pending count. An inbox with no items MUST show a message that nothing is waiting.

#### Scenario: Oldest first
- GIVEN items waiting since 3 hours, 2 days and 1 day
- WHEN the inbox renders
- THEN the order is the 2-day item, the 1-day item, the 3-hour item

#### Scenario: Gate row opens Review
- GIVEN a row for an episode waiting on its `script` gate
- WHEN the row is activated
- THEN the episode's Review section is displayed

#### Scenario: QA failure row opens Status
- GIVEN a row for an episode in `failed_qa`
- WHEN the row is activated
- THEN the episode's Status section is displayed

#### Scenario: Delivered episodes are absent
- GIVEN a delivered episode with no open gate
- WHEN the inbox renders
- THEN no row names it

#### Scenario: Budget row is informational
- GIVEN two pending episodes and the domaiNN budget row
- WHEN the Pending count is read
- THEN it is 2

#### Scenario: Empty inbox
- GIVEN no item waits on a person
- WHEN the inbox renders
- THEN it shows that nothing is waiting and still shows the Budget row

### Requirement: Re-open cause is shown in the inbox

When a gate is in state `reopened`, its inbox row MUST show the recorded cause as `re-opened: <phrase>` and MUST name the affected scenes. The cause MUST be the structured cause the engine recorded and published (`conntent-review-gates`, "Re-open causes are recorded"); the console MUST NOT infer it. The console MUST render the phrase from the cause kind and detail with a fixed table: `narration-changed` as "narration changed", `layer-changed` as "layer <name> changed", `param-changed` as "<level> <field> changed" (for example "series voice changed"), `asset-changed` as "<kind> asset changed", `plan-changed` as "plan changed", and `unknown` as "content changed". A gate that opens for the first time MUST show no re-open line.

#### Scenario: Upstream change
- GIVEN an episode whose `script` gate re-opened for scenes 1 and 2 with recorded cause "series voice changed"
- WHEN the inbox renders
- THEN its row shows `re-opened: series voice changed` and names scenes 1 and 2

#### Scenario: Unrecorded cause
- GIVEN a re-opened gate whose cause kind is `unknown`
- WHEN the row renders
- THEN it shows `re-opened: content changed`

#### Scenario: Narration cause
- GIVEN a re-opened gate with cause kind `narration-changed`
- WHEN the row renders
- THEN it shows `re-opened: narration changed`

#### Scenario: First opening
- GIVEN a gate that opens for the first time
- WHEN the row renders
- THEN no re-open line is shown

### Requirement: Domain sections

Selecting the domaiNN node MUST show three sections: Config, Catalog & voices, Status.

Config MUST show the video-defaults fields of the domaiNN with effective value and source (see "Effective value and source trace"), and a Library card listing every library item of the domaiNN by logical name with its resolved file and the number of series or episodes that use it, covering the six library kinds of `conntent-library` (music, sounds, frames, components, characters and media).

Catalog & voices MUST show a Voices table (voice, language, model) and a Models table (model, capability, price, price source and age). A voice whose language differs from the language of a series or episode that uses it MUST be flagged with the using series and the mismatch. A price whose age exceeds the staleness threshold MUST be flagged as stale and still shown. The section MUST NOT offer a control that only an agent or the engine can fulfil; an action such as cloning a voice MUST be shown as the name of the procedure to ask the agent for ("Define a Character"), as copyable text.

Status MUST show spend over the last 24 hours against `daily_budget`, spend this month with its episode and delivery counts, and the cache size on disk. The Status section MUST NOT offer cache cleanup (orphan cleanup is out of scope).

#### Scenario: Library names resolve to files
- GIVEN a domaiNN `library/sounds/whoosh.mp3` used by two series
- WHEN the Config library card renders
- THEN it lists `sounds/whoosh`, the file `library/sounds/whoosh.mp3` and "2 series"

#### Scenario: Voice language mismatch
- GIVEN an `en` voice used by two `es` series
- WHEN Catalog & voices renders
- THEN the voice row is flagged and names the two series

#### Scenario: Stale price
- GIVEN a model priced from a source older than the threshold
- WHEN the Models table renders
- THEN the row is flagged stale and the price is still shown

#### Scenario: Agent-only action is not a dead button
- GIVEN the Catalog & voices section
- WHEN its controls are scanned
- THEN no button exists whose only effect would require the agent or engine
- AND the clone-a-voice action is rendered as the text of the procedure to request

#### Scenario: No cleanup control
- GIVEN the domaiNN Status section
- WHEN its controls are scanned
- THEN no cache cleanup control exists

### Requirement: Series Board section

The series Board MUST place every episode of the series in exactly one column, derived from the lifecycle `status` (`conntent-episode-lifecycle`) and the derived gate state (`conntent-review-gates`): `idea` in Idea; `draft` in Script review, Preview review or Budget review according to its first open, re-opened or needs-change gate, and in Draft when no gate is open; `approved` in Approved; `produced` in Produced; `failed_qa` in QA failed; `delivered` in Delivered; `archived` in Archived. The columns Script review, Preview review, QA failed and Delivered MUST always be shown, even when empty; every other column MUST be shown only when it holds an episode. Columns are ordered by lifecycle order. A chip MUST show the slug, the cost spent and the plan cost, and MUST open the episode. A delivered episode whose content later changed has status `draft` (`conntent-episode-lifecycle`, "delivered is not terminal") and therefore appears in the column of its first open gate.

#### Scenario: Every episode in exactly one column
- GIVEN a series with episodes in four different states
- WHEN the Board renders
- THEN each episode appears once and no episode is dropped

#### Scenario: Empty fixed columns
- GIVEN a series with no failed episodes
- WHEN the Board renders
- THEN the QA failed column is shown empty

#### Scenario: Draft is split by gate
- GIVEN a `draft` episode whose `script` gate is approved and whose `preview` gate is open
- WHEN the Board renders
- THEN the episode appears in Preview review

#### Scenario: Re-opened delivered episode
- GIVEN a delivered episode whose scene 2 was edited
- WHEN the Board renders
- THEN the episode appears in the Script review column

#### Scenario: Archived is not dropped
- GIVEN an `archived` episode
- WHEN the Board renders
- THEN it appears in an Archived column

### Requirement: Series Config section

The series Config MUST show the series fields with effective value and source. For each field that names a library item (for example `background_audio`), the section MUST show the file the logical name resolved to, using the resolution the plan reports (`conntent-library`), for example `music/ambient` resolves to `series/<s>/library/music/ambient.mp3`.

#### Scenario: Resolved library file shown
- GIVEN `background_audio:: music/ambient` and a series-level library file
- WHEN the Config renders
- THEN the field shows the series library file as the resolution

#### Scenario: Inherited fields
- GIVEN `language` set only at the domaiNN
- WHEN the Config renders
- THEN `language` shows its value with the source `domain`

### Requirement: Scene Kinds section

The Scene Kinds section MUST list every Scene Kind of the series with its role, maximum duration, whether narration is on, its Chrome slots and its presets and direct fields (Scene Kinds accept direct fields, `conntent-scene-kinds`). An Add kind control and per-kind edit controls MUST write changeset operations.

#### Scenario: Direct fields shown
- GIVEN a Kind `Cierre` with preset `Presenter` and direct field `captions: off`
- WHEN the section renders
- THEN the row shows `Presenter` and `captions: off`

### Requirement: Chrome and Presets section

The section MUST show, per language, the Chrome slots of the series (for example watermark, CTA, bumper), for the series language and for every language used by one of its episodes; a language used by an episode with no Chrome MUST be flagged as missing. It MUST list each Preset with its parameters. When a Preset sets a value that an active character supplies, the Preset row MUST carry the warning described in "Character override warnings are surfaced".

#### Scenario: Missing Chrome for a translation
- GIVEN an `en` translation episode in an `es` series that has no `en` Chrome
- WHEN the section renders
- THEN the `en` Chrome is shown as missing

#### Scenario: Presets listed
- GIVEN presets `Presenter` and `B-roll`
- WHEN the section renders
- THEN both appear with their parameters

### Requirement: Episode Review section and gate strip

The Review section MUST show a gate strip with one cell per gate in the episode's effective `review_gates`, in order, then a cell for any inserted `budget` gate, then a cell for Automatic QA. Each gate cell MUST show its state (approved, pending, not reached) and what it protects ("before any spend", "before avatar spend"). A gate absent from `review_gates` MUST be shown as not required. The Automatic QA cell MUST show no approve control (QA is automatic and always on).

#### Scenario: Default gates
- GIVEN `review_gates: [script, preview]`
- WHEN the strip renders
- THEN it shows script, preview and Automatic QA

#### Scenario: Autopilot with an inserted budget gate
- GIVEN `review_gates: []` and a plan above `budget`
- WHEN the strip renders
- THEN it shows a `budget` gate and Automatic QA and no script or preview gate

#### Scenario: QA has no approve control
- GIVEN any episode
- WHEN the Automatic QA cell is scanned for controls
- THEN it contains none

### Requirement: Scene rows and per-scene verdict controls

Each scene row MUST show: position and name, Kind, thumbnail still (when the file exists), narration, a pill per layer, a narration audio player (when the audio exists), and a source line naming where each non-scene-level value came from (for example `voice <- series:preset:Presenter`, `transition <- kind:Gancho`). Each scene row MUST show the derived state of the current gate for that scene (`open`, `approved`, `needs-change` or `reopened`, as published by the engine), with the `notes` for `needs-change`. While the gate is not `approved` for the scene, the row MUST offer Approve and Needs change. Needs change MUST require a non-empty reason, which is carried as the `notes` of the verdict. A scene whose gate is `approved` for its current hash MUST NOT offer Approve. Narration MUST be editable in place; saving an edit MUST produce a changeset operation (see "Console edits are changeset operations").

#### Scenario: Source line lists only inherited values
- GIVEN a scene whose voice comes from a series preset and whose transition comes from its Kind
- WHEN the row renders
- THEN the source line names both with their origin and omits scene-level values

#### Scenario: Needs change requires a reason
- GIVEN the Needs change control on a scene
- WHEN the reviewer submits an empty reason
- THEN nothing is written and the reason field is flagged

#### Scenario: Approved scene offers no approve
- GIVEN a scene approved for its current content hash
- WHEN the row renders
- THEN it shows approved and offers no Approve control

#### Scenario: Needs-change notes shown
- GIVEN a scene whose latest verdict is `needs-change` on current content with `notes`
- WHEN the row renders
- THEN the state `needs-change` and the notes are shown and Approve is offered

### Requirement: Gate-specific review content

At the `script` gate the section MUST show narration and layers without media and MUST state that approving freezes the content hash and that a later edit re-opens the gate for the edited scenes only.

At the `preview` gate the section MUST show the animatic (low-resolution video with real audio, overlays and captions) as a playable video, per-scene stills and audio, and the persisted plan: cost per stage, the avatar spend that approval authorises, and the total against `budget`. Approving MUST state that it also approves that scene's planned spend, and each written verdict MUST carry, as `plan_hash`, the scene's plan slice hash from the payload (`conntent-review-gates`, "The preview approval carries the scene's plan slice hash").

At an inserted `budget` gate the section MUST show the plan cost per stage against `budget`, and approving MUST carry the episode `plan_hash` as both `reviewed_hash` and `plan_hash`.

Approval controls for a later gate MUST NOT be offered while an earlier gate is open.

#### Scenario: Preview shows the plan
- GIVEN an episode at the `preview` gate with a plan of $1.09 avatar spend
- WHEN the Review section renders
- THEN the animatic player, the stage costs and the $1.09 are shown

#### Scenario: Preview approval carries the plan hash
- GIVEN the reviewer approves the preview gate for scenes 1 and 2
- WHEN the changeset is written
- THEN each verdict carries the plan slice hash of its own scene as displayed

#### Scenario: Later gate is locked
- GIVEN the `script` gate is open
- WHEN the section renders
- THEN no approval control for the `preview` gate is offered

#### Scenario: Budget gate without preview
- GIVEN `review_gates: []` and a plan above `budget`
- WHEN the section renders
- THEN a budget approval with the cost breakdown is offered and its changeset carries the episode `plan_hash`

### Requirement: Verdicts are written as review_gate changesets

Approve, Approve gate (all scenes) and Needs change MUST each be emitted as `review_gate` changes (schema and provenance owned by `changeset-review-gate`) in a changeset whose frontmatter carries `author_kind: human`, `origin: console` and the reviewer identifier as `reviewer`, with the scene as target (for example `botijos-today/gas-pump@scene-2`) or the episode model for `budget`, and, per scene, the `reviewed_hash` for that gate copied from the payload (the console never computes a hash). A `preview` verdict MUST also carry the scene's plan slice hash as `plan_hash`, and a `budget` verdict the episode `plan_hash`, both copied from the payload. The reason of Needs change is written as `notes`. An all-good review MUST be one verdict-only changeset. The view MUST NOT write the `review::` field and MUST NOT offer any other way to approve. Approving a gate for all scenes MUST cover only the scenes whose gate is not already `approved`. The controls MUST exist only for gates the payload declares (`innfo-console-feedback`).

#### Scenario: All-good review
- GIVEN a gate open for four scenes
- WHEN the reviewer chooses Approve gate (all scenes)
- THEN one changeset holding four `review_gate` approvals is produced, each with its scene's `reviewed_hash`

#### Scenario: Only open scenes are covered
- GIVEN scene 1 already approved and scenes 2 to 4 open
- WHEN the reviewer approves all
- THEN the changeset covers scenes 2 to 4 only

#### Scenario: No review field write
- GIVEN any verdict action
- WHEN the produced changeset is inspected
- THEN it contains no operation writing `review::`

### Requirement: Stale approval is refused

When the content a reviewer is approving no longer matches the embedded hash, the console MUST refuse the approval with exactly `content changed since you reviewed it; reopen the console`. The console MUST detect this before writing when it holds a directory grant (`console-changes-direct-write`, "Stale approval is refused at write time"). The engine remains authoritative: an approval applied with an outdated hash does not satisfy the gate and the engine reports the same message (`conntent-review-gates`, "The engine supplies the hash and a stale approval is refused"). A console-refused approval MUST write nothing and MUST leave the gate unchanged. In the Review history, an applied verdict whose `reviewed_hash` no longer equals the current hash MUST be marked `stale`.

#### Scenario: Message text
- GIVEN an approval whose hash no longer matches
- WHEN it is refused anywhere in the console
- THEN the message is `content changed since you reviewed it; reopen the console`

#### Scenario: Gate stays unchanged
- GIVEN a refused approval
- WHEN the Review section renders again
- THEN the gate state is unchanged and no changeset was written

#### Scenario: Stale applied verdict marked
- GIVEN an applied approval whose hash no longer equals the current hash
- WHEN the Review history renders
- THEN its row is marked `stale`

### Requirement: Review history is derived from applied changesets

Once a gate has been decided, the Review section MUST show a Review history table of gate, verdict, reviewer, short hash (first 8 hex characters) and time, built from applied `review_gate` changesets only. A `review::` value in a document with no backing applied changeset MUST be shown as `unbacked, ignored` and MUST NOT be shown as an approval.

#### Scenario: History row
- GIVEN an applied `review_gate` approval by reviewer `lucas`
- WHEN the history renders
- THEN a row shows gate, `approved`, `lucas`, the short hash and the time

#### Scenario: Agent-written approval
- GIVEN a scene whose document says `review:: approved` and no changeset backs it
- WHEN the Review section renders
- THEN the scene is shown as not approved with an `unbacked, ignored` note

### Requirement: Console edits are changeset operations

Every edit made in the `conntent` view (narration, field values, overrides, Kind edits, preset selection) MUST be emitted as a changeset operation (`update_field`, `add_element`, `comment`) through the console's single changeset; the view MUST hold no private copy of the edited value. The preset selector MUST list the Presets visible from the episode in cascade order. Picklists for models MUST be populated from the merged model catalog, and no tier label or ease name MAY be baked into the view.

#### Scenario: Edit is an operation
- GIVEN an edited narration
- WHEN the reviewer saves
- THEN a changeset operation carries the new text and the view holds no private copy

#### Scenario: Picklists come from the catalog
- GIVEN the merged model catalog
- WHEN an image model picklist renders
- THEN its options are the catalog models allowed for the capability and no tier label is baked into the view

#### Scenario: One preset selector
- GIVEN presets `Lucas` in the series and `Studio Warm` in the domaiNN
- WHEN the episode Config renders
- THEN one selector offers both

### Requirement: Episode Config section

The episode Config MUST show the episode's fields with effective value and source, and MUST offer Edit on a field set at the episode and Override here on an inherited field, both subject to "Override is offered only at allowed levels".

#### Scenario: Override an inherited field
- GIVEN `avatar_resolution` inherited from the series
- WHEN the reviewer uses Override here and enters a value
- THEN an `update_field` operation targeting the episode is produced

### Requirement: Episode Status section

The Status section MUST show: cost spent against the plan and `budget` (bar and figures), a stages table (stage, calls, cost, duration) read from the ledger and the timing log, and the Automatic QA results as a table of check, detail and ok, warn or fail. When several machine fingerprints produced runs of the same stage, the table MUST show their durations side by side with the fingerprints. A row whose price is stale MUST be flagged and still counted. An episode in `failed_qa` MUST display that nothing is delivered while QA fails. The section MUST list validation warnings, including those described in "Character override warnings are surfaced". With no facts yet, the section MUST show an empty state and no error.

#### Scenario: Real cost
- GIVEN ledger records for an episode
- WHEN Status renders
- THEN the cost equals the sum of its ledger records

#### Scenario: QA table
- GIVEN QA results with two failing checks
- WHEN Status renders
- THEN each check is listed with its detail and a fail or ok pill, and the failed-QA notice is shown

#### Scenario: Machine comparison
- GIVEN two runs of the same stage on different fingerprints
- WHEN Status renders
- THEN both durations are shown with their fingerprints

#### Scenario: No facts yet
- GIVEN an episode with no ledger or timing records
- WHEN Status renders
- THEN an empty state is shown and no error is thrown

### Requirement: Episode Deliveries section

The Deliveries section MUST list the episode's `deliveries/v<N>/` folders, newest first, each with: version, folder path as copyable text, contents (formats, thumbnails, description, delivery HTML) and a link to `<slug>_delivery.html` by relative path. The newest MUST carry a `latest` pill and every older version MUST carry a `superseded` pill; this is display only and deletion stays manual. For an episode with no delivery the section MUST state that delivery happens automatically once QA passes. The section MUST NOT contain a Deliver control, a Deliver v1 button, or any control that starts delivery (delivery is the automatic last step of Produce; there is no Deliver procedure).

#### Scenario: Superseded display
- GIVEN deliveries v1 and v2
- WHEN the section renders
- THEN v2 is `latest`, v1 is `superseded` and both link to their delivery HTML

#### Scenario: No delivery yet
- GIVEN an episode that has not passed QA
- WHEN the section renders
- THEN it states delivery is automatic after QA and contains no control starting delivery

#### Scenario: Folder is not a button
- GIVEN a delivery row
- WHEN its controls are scanned
- THEN the folder path is shown as copyable text and no control claims to open a folder

### Requirement: Effective value and source trace

Wherever the view shows a configuration field (domaiNN, series, Kind, Chrome, episode, scene), it MUST show the effective value and the level it comes from, taken from the engine's source trace (`conntent-field-registry`, source trace). The source label MUST be the trace `source` as the engine publishes it (`blueprint`, `domain`, `series`, `kind`, `video`, `scene`, `layer`, optionally suffixed `:preset:<Name>` or `:character:<name>`, for example `series:preset:Presenter`), and the detail of a row MUST show the supplying `document` and the `overridden` sources. A field whose supplying document is the one being shown MUST be marked `set here` and offer Edit; an inherited field MUST show its source and offer Override here. The view MUST NOT recompute the cascade; if the payload carries no trace for a field, the field MUST be shown with source `unknown` rather than a guess.

#### Scenario: Inherited value
- GIVEN `image_size` resolved from the blueprint default
- WHEN the series Config renders
- THEN the row shows the value, the source `blueprint` and Override here

#### Scenario: Set here
- GIVEN `transition` declared in the series document
- WHEN the series Config renders
- THEN the row shows `set here` and Edit

#### Scenario: Named preset source
- GIVEN `voice` supplied by preset `Presenter` of the series
- WHEN an episode Config renders
- THEN the source reads `series:preset:Presenter`

#### Scenario: No trace
- GIVEN a field with no trace entry in the payload
- WHEN it renders
- THEN its source is shown as `unknown`

### Requirement: Override is offered only at allowed levels

Override here and Edit MUST be offered only at levels the field's scope class allows (`render`: domaiNN, series, Kind, preset, video, scene, layer; `video`: domaiNN, series, video; `domain`: domaiNN only). The allowed levels MUST come from the field registry through the payload, not from a list kept in the view.

#### Scenario: Domain-only field in an episode
- GIVEN a field of scope class `domain`
- WHEN the episode Config renders
- THEN the field is shown read-only with its source and no Override here

#### Scenario: Video-class field on a Kind
- GIVEN a field of scope class `video`
- WHEN the Scene Kinds section offers direct fields
- THEN that field is not offered

### Requirement: Character override warnings are surfaced

The view MUST show the validation warning raised when a preset or an explicit field overrides a value that the active character supplies (`conntent-presets`, `conntent-character`). The warning MUST name the overriding source, the field and the character, and MUST appear on the overriding Preset row, on the overridden field row in Config, and in the episode Status warnings. Warnings are non-blocking and MUST NOT appear in the Pending inbox.

#### Scenario: Preset overrides the host voice
- GIVEN a Kind preset `Presenter` that sets `voice` while the series character is `lucas`
- WHEN the series Chrome & Presets and an episode Status render
- THEN each shows a warning naming `Presenter`, `voice` and `lucas`

#### Scenario: Warnings do not block
- GIVEN such a warning
- WHEN the Pending count is read
- THEN the warning is not counted

### Requirement: Stale translation is flagged

An episode with `translation_of` MUST be flagged `stale` in the tree, in its header and on each scene row whose original scene's content hash differs from the original hash the translation was last reviewed against. The flag MUST name the scenes. It is display only and MUST NOT open a gate by itself.

#### Scenario: Original edited
- GIVEN an English translation of a Spanish episode and an edit to original scene 2
- WHEN the translation's Review renders
- THEN scene 2 carries a `stale` flag and the tree node shows the stale mark

#### Scenario: Original unchanged
- GIVEN an unchanged original
- WHEN the translation renders
- THEN no stale flag is shown

### Requirement: Media is loaded by relative path

Images, audio and video shown by the view (scene stills, narration audio, animatic, delivered formats, thumbnails, component previews) MUST be referenced by path relative to the console file and MUST NOT be embedded as data in the console. Audio and video elements MUST use `preload="none"` so that a console with many episodes does not fetch media until played. A media element MUST be accompanied by an Open link to the same file. A path whose file is absent MUST render a placeholder that shows the path, not a broken element. A path carrying a scheme (`javascript:`, `data:`, `vbscript:`, `file:`, `http:`, `https:`) MUST be rendered as plain text and MUST NOT become an element source. Paths MUST be those the console export rebased for the console's output directory (`console-export-cli`, "Console Links Are Relative to the Console File").

#### Scenario: Audio plays from a relative path
- GIVEN a scene whose narration file is `series/s/episodes/e/media/scene-01.mp3`
- WHEN the scene row renders
- THEN an audio element with `preload="none"` points to that path relative to the console file
- AND an Open link to the same path exists

#### Scenario: Missing file
- GIVEN a scene whose still does not exist
- WHEN the row renders
- THEN a placeholder showing the path appears and no broken image element is created

#### Scenario: Hostile path
- GIVEN a media path `javascript:alert(1)`
- WHEN the row renders
- THEN the value is shown as text and no element gets it as a source

#### Scenario: No media inlined
- GIVEN an export of a domaiNN with 20 episodes
- WHEN the console HTML is scanned
- THEN it contains no embedded audio, video or episode image bytes

### Requirement: Console stays small regardless of episode count

The domaiNN console MUST live at the domaiNN root and its size MUST grow only with text data (no media bytes). It MUST stay under the 5 MB warning threshold of `console-view-registry` ("Size budget") for a domaiNN with 50 episodes of four scenes each; when it cannot, the view MUST be reduced in payload (for example by omitting delivered episodes' scene detail) before the failure threshold is reached.

#### Scenario: Large domaiNN
- GIVEN a fixture domaiNN with 50 episodes of four scenes
- WHEN the console is exported
- THEN the artifact is below 5 MB

### Requirement: Data reaches the view only through the data hook

All data shown by the `conntent` view MUST reach it through `ctx.viewData` collected by the view's data module at export time (`console-view-registry`, "View Data Collection Hook"). Cost and timing MUST be read from the engine's facts (one ledger path, the timing log) and not recomputed from estimates. Gate state, the current per-scene gate hashes, the per-scene plan slice hashes, the episode `plan_hash` and the re-open causes MUST be read from what the engine publishes in the console data (`conntent-review-gates`); the view and its data module MUST NOT compute a hash or a gate state, and MUST NOT read `review::` fields as approvals (an unbacked value is shown as flagged by the engine's `unbacked-review` finding). The data module MUST fail the export, naming the view, when the domaiNN contains a legacy layout the engine rejects.

#### Scenario: Cost from the ledger
- GIVEN ledger records and an estimate that differs from them
- WHEN the view shows the cost
- THEN it shows the ledger sum

#### Scenario: Hashes are copied, not computed
- GIVEN engine console data carrying a scene's `script` hash `h`
- WHEN the verdict draft for that scene is built
- THEN its `reviewed_hash` is `h`
- AND neither the data module nor the view contains a hash computation

#### Scenario: Unbacked review value is not an approval
- GIVEN a document with `review:: approved` and no applied verdict
- WHEN the Review section renders
- THEN the scene is shown with the engine's derived state and the `unbacked-review` finding

#### Scenario: Data module failure
- GIVEN a data module that throws
- WHEN the export runs
- THEN it exits non-zero naming `conntent` and writes no artifact

### Requirement: Console reports its own freshness

The console MUST display its generation time. When the console holds a directory grant (`console-changes-direct-write`), it MUST compare the embedded per-model `sha256` values of the models it shows with the live model files and, on any difference, MUST show a banner stating that the console is out of date and must be reopened after regeneration, and MUST disable verdict controls until reopened. Without a grant the console MUST show only the generation time.

#### Scenario: Out-of-date banner
- GIVEN a granted console whose episode document changed after export
- WHEN the console runs its freshness check
- THEN the out-of-date banner shows and verdict controls are disabled

#### Scenario: No grant
- GIVEN a console with no grant
- WHEN it renders
- THEN it shows the generation time and no freshness banner

### Requirement: Untrusted text is inert

Every string from the payload (titles, narration, comments, reviewer names, Chrome text, descriptions, error text) MUST be rendered as text. The view MUST NOT assign payload strings to `innerHTML`.

#### Scenario: Hostile narration
- GIVEN narration `<img src=x onerror=alert(1)>`
- WHEN the scene row renders
- THEN the string appears literally and no `img` element is created from it

### Requirement: Keyboard and accessibility

The rail MUST be a navigation landmark whose nodes are buttons reachable by keyboard. Sections MUST be exposed as a tab list with `role="tablist"`, `role="tab"` and `aria-selected`, navigable with arrow keys. Inbox rows MUST be keyboard-activatable. State MUST NOT be conveyed by colour alone (each pill carries text). The view MUST honour `prefers-color-scheme`.

#### Scenario: Keyboard path
- GIVEN focus on the Pending entry
- WHEN the user tabs to an inbox row and presses Enter
- THEN the row opens its episode section

#### Scenario: Tabs semantics
- GIVEN an episode with four sections
- WHEN the DOM is inspected
- THEN a `tablist` with four `tab` elements exists and exactly one has `aria-selected="true"`

### Requirement: No control without effect

No control in the `conntent` view MUST exist whose edit is not carried to the produced output. Every editable control MUST map to a field of the field registry valid at that level, or to a `review_gate` operation. A test MUST fail when a control's exported key is not a registered field.

#### Scenario: Control without a registered field
- GIVEN a control exporting a key that is not in the field registry
- WHEN the consumer test runs
- THEN it fails naming the control

### Requirement: Views stay within the registry budget

The exported console with the `conntent` and `conntent-delivery` views MUST stay under the 5 MB warning threshold of `console-view-registry`. Views MUST NOT be lazily split.

#### Scenario: Budget respected
- GIVEN the built views
- WHEN the size check runs
- THEN it passes

### Requirement: Component picker

Editing a `components` slot (`components:: <slot>=<name>`) at any level that allows it MUST open a picker dialog listing the library components visible from that level (`conntent-library`, upward lookup). Each entry MUST show the component name, its slot, its variables, its duration and aspect, its source (`registry:<item>@<ver>` or `local`), the frame tokens it uses, and a playable `preview.mp4` loaded by relative path with `preload="none"`. The picker MUST list only components whose `slot` equals the slot being edited, MUST mark an entry shadowed by a nearer item of the same name, and MUST show the level each entry comes from. An entry without `preview.mp4` MUST still be listed with a placeholder. Selecting an entry MUST produce an `update_field` operation setting only that slot's entry and preserving the other slots. The picker MUST be a keyboard-operable dialog closed by Escape, MUST make no network request, and MUST show an empty state when no component fits the slot.

#### Scenario: Slot filter
- GIVEN components for slots `title` and `quote`
- WHEN the picker opens for `title`
- THEN only title components are listed

#### Scenario: Shadowed entry
- GIVEN a `title/boxed` in the series library and another in the domaiNN library
- WHEN the picker opens
- THEN the series entry is selectable and the domaiNN entry is marked shadowed

#### Scenario: Selection preserves other slots
- GIVEN `components:: title=boxed, quote=plain`
- WHEN the reviewer picks `kinetic` for `title`
- THEN the operation yields `title=kinetic, quote=plain`

#### Scenario: Missing preview
- GIVEN an entry with no `preview.mp4`
- WHEN the picker renders
- THEN the entry is listed with a placeholder

#### Scenario: Offline
- GIVEN the picker opens
- WHEN network activity is observed
- THEN no request is made

### Requirement: Read-only delivery view

The `conntent-delivery` view (id `conntent-delivery`, `kind: readonly`) MUST present one delivered episode and nothing else. It MUST be exported only with `meta.consoleScope = { view: "conntent-delivery", readOnly: true, models: [<the episode model>], label }` (`console-scope`), so the explorer, rail, search and the `conntent` view are absent. It MUST render the Episode panel of the `conntent` view in read-only form (same renderer, no controls): episode title, version `v<N>`, language, delivery time, a player for each video format, each thumbnail, the description text, the script (narration and layers per scene, with stills and narration audio where present), the Automatic QA result, and the review history (gate, reviewer, time). The Config, Status stages and cost parts of the panel MUST be omitted. Every media file MUST be referenced by a path relative to the delivery HTML file, as a sibling in its own `deliveries/v<N>/` folder, so it works from an unzipped folder or a Drive-for-desktop sync. The view MUST NOT contain any control that creates a draft, a verdict or a changeset; its `needs[]` MUST NOT include changeset export or direct write; it MUST NOT request a directory grant. It MUST NOT show spend, budgets, ledger data, prompts or other internal operating data (recommended default of the proposal's open product question on the delivery view contents). It MUST NOT show a superseded mark (the file is immutable; supersession is shown only by the domaiNN console).

#### Scenario: Scoped to one episode
- GIVEN a domaiNN with three episodes
- WHEN the delivery HTML for one is opened
- THEN only that episode's data is in the payload and no explorer, rail or search exists

#### Scenario: Siblings by relative path
- GIVEN `deliveries/v2/` holding `ep_1080x1920.mp4` and `ep_delivery.html`
- WHEN the HTML is opened from the unzipped folder
- THEN the player's source is `./ep_1080x1920.mp4`

#### Scenario: Read-only
- GIVEN the delivery view
- WHEN the DOM is scanned for controls that create drafts, verdicts or a changeset
- THEN none exists and no changeset UI is injected

#### Scenario: No internal data
- GIVEN a delivered episode with ledger costs
- WHEN the payload of the delivery HTML is read
- THEN it contains no cost, budget or ledger entries and no image prompts

#### Scenario: No supersession mark
- GIVEN delivery v1 when v2 exists
- WHEN v1's HTML is opened
- THEN it shows no superseded mark
