# conntent-review-gates Delta Spec

Slice 3, PR 3b. Replaces `conntent-review` (removed). Uses the generic operation of `changeset-review-gate` (owner of the `review_gate` schema, the frontmatter provenance markers and the error codes). No backwards compatibility: `script_review` and `review::`-based approval do not exist after this change.

Exit codes used here are the ones of `conntent-produce-command` ("Produce Stops At Gates And Spend Stops"): 10 for any open gate (`script`, `preview` or `budget`), 11 for a spend stop that no verdict can satisfy (unset `budget`, daily cap).

## ADDED Requirements

### Requirement: `review_gates` is a video-scope cascade field

`review_gates` MUST be a cascade field of scope class `video` (domaiNN, series, video), holding a list whose allowed members are `script` and `preview`. The blueprint default MUST be `[script, preview]`. A series MAY set `[]` (autopilot). The nearest level that sets the field wins, and an empty list at a nearer level MUST override a non-empty list at a farther one. The member `budget` MUST be rejected as engine-managed, an unknown member and a duplicate member MUST fail validation, all before any spend. The order of the list MUST NOT change the order in which gates apply. The field `script_review` MUST NOT exist: a document declaring it MUST fail validation with a message naming `review_gates`.
<!-- shared with slice 2: registration of the field and its scope class in conntent-field-registry and conntent-model "Shared Field Definitions"; behaviour here -->

#### Scenario: Blueprint default

- GIVEN no level sets `review_gates`
- WHEN the field is resolved for an episode
- THEN the value is `[script, preview]` with source `blueprint`

#### Scenario: Series autopilot

- GIVEN a series with `review_gates: []` and an episode that sets none
- WHEN the field is resolved
- THEN the value is `[]` with source `series`

#### Scenario: Video overrides series

- GIVEN a series with `[]` and an episode with `[script]`
- WHEN the field is resolved
- THEN the value is `[script]` with source `video`

#### Scenario: Budget is not configurable

- GIVEN `review_gates: [script, budget]`
- WHEN the episode is validated
- THEN validation fails naming `budget` as engine-managed

#### Scenario: Unknown and duplicate members

- GIVEN `review_gates: [script, publish]` and separately `[script, script]`
- WHEN each is validated
- THEN each fails naming the offending member

#### Scenario: Retired field

- GIVEN a series declaring `script_review:: skip`
- WHEN it is validated
- THEN validation fails naming `script_review` and pointing to `review_gates`

### Requirement: The bluepriNNt declares three gates

The coNNtent bluepriNNt MUST declare, in its frontmatter `gates` (`changeset-review-gate`, "Gates are declared by the bluepriNNt"), exactly the gates `script`, `preview` and `budget`. `script` and `preview` MUST target a Scene element. `budget` MUST target the episode model itself (a bare model id).

#### Scenario: Gate targets

- GIVEN the bluepriNNt gate declaration
- WHEN a verdict for `preview` targets the episode model id
- THEN it is rejected with `GATE_TARGET_INVALID`

### Requirement: Gate state is derived, never stored in a field

The state of each `(target, gate)` MUST be computed by the engine from (a) the latest applied `review_gate` change for it that counts (see "Only a named human on an applied console changeset approves") and (b) the current hash for that gate computed from the applied model. States:

| State | Condition |
|---|---|
| `open` | no counting verdict exists |
| `approved` | the latest verdict is `approved` and its `reviewed_hash` equals the current hash |
| `needs-change` | the latest verdict is `needs-change` and its `reviewed_hash` equals the current hash |
| `reopened` | a verdict exists and its `reviewed_hash` differs from the current hash |

A gate is satisfied only in state `approved`. `reopened` MUST behave as `open` for stopping purposes and MUST carry a cause (see "Re-open causes are recorded"). The value of a `review::` field, any `status` field, and the existence of other files MUST NOT influence the state.

#### Scenario: Matching hash approves

- GIVEN an applied human approval for scene 1, gate `script`, whose `reviewed_hash` equals the current hash
- WHEN the gate state is computed
- THEN it is `approved`

#### Scenario: Agent-written review field approves nothing

- GIVEN an episode whose four scenes all carry `review:: approved` written by an agent and no applied verdict
- WHEN the gate states are computed
- THEN all four are `open`

#### Scenario: Hash drift re-opens

- GIVEN an approved scene whose narration is then edited
- WHEN the gate state is computed
- THEN it is `reopened`

#### Scenario: Needs-change on current content

- GIVEN a latest verdict `needs-change` with a matching hash and `notes`
- WHEN the gate state is computed
- THEN it is `needs-change` and the notes are available for display

#### Scenario: Later verdict supersedes

- GIVEN `needs-change` then, after an edit, `approved` with the new hash
- WHEN the gate state is computed
- THEN it is `approved`

#### Scenario: Unapplied changeset has no effect

- GIVEN a proposed human changeset with an `approved` verdict that has not been applied
- WHEN the gate state is computed
- THEN the gate is `open`

### Requirement: Only a named human on an applied console changeset approves

For a verdict to count, its changeset MUST be applied and its frontmatter MUST carry `author_kind: human`, `origin: console` and a `reviewer` that is a non-empty name other than the console's default pseudonym `reviewer`. No reviewer roster per domaiNN exists: any human who enters a name qualifies (see the open product question in the proposal). A verdict failing any of these MUST be ignored for state and MUST be reported by name.

#### Scenario: Default pseudonym ignored

- GIVEN an applied human console approval with `reviewer: reviewer`
- WHEN the gate state is computed
- THEN the gate stays `open` and the report names the unnamed reviewer

#### Scenario: Named human counts

- GIVEN an applied human console approval with `reviewer: Ana` and a matching hash
- WHEN the gate state is computed
- THEN the gate is `approved` and the reviewer is shown as `Ana`

### Requirement: Script gate hash covers narration, layers and resolved parameters of one scene

The current hash of the `script` gate for a scene MUST be the lowercase hex sha256 of the canonical JSON (keys sorted, UTF-8, no insignificant whitespace) of the object `{scene, language, narration, layers, params}` where:

- `scene` is the scene's element slug;
- `language` is the resolved episode language;
- `narration` is the narration text exactly as stored;
- `layers` is the ordered list of the scene's layers, each with every authored field and each library reference replaced by its resolved logical name and the sha256 of the resolved file bytes;
- `params` is the map of every render-class and video-class field resolved for that scene through the cascade (values only, with presets, character and frame expanded), including the voice, the avatar, the pose and the captions mode.

The hash MUST exclude the `review::` mirror, comments, titles of the scene, the source trace, and any `status`. A value that moves to another level without changing its resolved value MUST NOT change the hash.

#### Scenario: Narration edit changes the hash

- GIVEN a scene and the same scene with one word of narration changed
- WHEN the script hashes are computed
- THEN they differ

#### Scenario: Layer edit changes the hash

- GIVEN a scene and the same scene with a layer prompt changed
- WHEN the script hashes are computed
- THEN they differ

#### Scenario: Resolved parameter changes the hash

- GIVEN a scene that inherits `voice` from the series and the series voice then changes
- WHEN the script hash of the scene is computed
- THEN it differs from before

#### Scenario: Same value from another level

- GIVEN a scene that resolves `voice: v1` from the series and the same value moved to the scene's own field
- WHEN the script hash is computed
- THEN it is unchanged

#### Scenario: Mirror and comments excluded

- GIVEN a scene where only `review::` and a comment change
- WHEN the script hash is computed
- THEN it is unchanged

#### Scenario: Library file bytes included

- GIVEN a layer referencing `media/hero` and the resolved file replaced by different bytes
- WHEN the script hash is computed
- THEN it differs

#### Scenario: Language included

- GIVEN a scene whose episode language changes from `es` to `en` with the same text
- WHEN the script hash is computed
- THEN it differs

#### Scenario: Scenes hash independently

- GIVEN scenes 1 and 2 and an edit to scene 2 only
- WHEN both hashes are computed
- THEN the hash of scene 1 is unchanged

### Requirement: Preview gate hash covers what the reviewer heard and saw

The current hash of the `preview` gate for a scene MUST be the sha256 of the canonical JSON of `{script_hash, tts_key, image_keys, alignment_key, still}` where `script_hash` is the scene's current script-gate hash, `tts_key` is the TTS cache key of the scene's narration, `image_keys` is the ordered list of image cache keys of its layers, `alignment_key` is the caption alignment cache key (null when captions are `off`), and `still` is the sha256 of the character pose still or of the generated avatar image shown in the animatic (null when the scene has no avatar). It MUST NOT include avatar clip keys, because avatars are the spend the gate authorizes. The preview gate for a scene MUST NOT be `approved` while its script gate is not satisfied when `script` is in `review_gates`, because `script_hash` is part of its hash.

#### Scenario: Regenerated image re-opens preview

- GIVEN an approved preview and a scene whose generated image changes (new image cache key)
- WHEN the preview hash is computed
- THEN it differs

#### Scenario: Avatar clip does not matter

- GIVEN an approved preview and the avatar clip of the scene then generated
- WHEN the preview hash is computed
- THEN it is unchanged

#### Scenario: Script edit re-opens preview of that scene only

- GIVEN approved previews for scenes 1 and 2 and an edit to scene 2's narration
- WHEN the preview hashes are computed
- THEN scene 1's hash is unchanged and scene 2's differs

#### Scenario: Captions off

- GIVEN a scene with `captions: off`
- WHEN the preview hash is computed
- THEN `alignment_key` is null and the hash is stable across alignment-cache changes

### Requirement: The preview approval carries the scene's plan slice hash

Every `review_gate` change for the gate `preview` MUST carry `plan_hash`, equal to the plan slice hash of that scene (`conntent-run-facts`, "Prices Are Part Of The Plan Hash") in the persisted plan the console showed. A `preview` verdict without `plan_hash` MUST be ignored for state and reported. The plan slice hash is not part of the per-scene `reviewed_hash`, so that a plan change alone does not re-open content approvals; it only decides spend authorization. Carrying the scene slice hash, and not the episode `plan_hash`, keeps a one-scene edit from invalidating the spend approval of the other scenes (design X3).

#### Scenario: Preview approval carries the slice hash

- GIVEN a console payload in which scene 2 has plan slice hash `s2`
- WHEN the reviewer approves scene 2's preview
- THEN the change carries `plan_hash:: s2`

#### Scenario: Missing plan hash ignored

- GIVEN a human `preview` approval without `plan_hash`
- WHEN the gate state is computed
- THEN the gate is `open` and the report names the missing `plan_hash`

#### Scenario: Other scenes keep their spend approval

- GIVEN approved previews for scenes 1 to 3 and an edit to scene 2 that changes only its slice
- WHEN spend authorization is evaluated after scene 2 is approved again
- THEN scenes 1 and 3 need no new approval

### Requirement: Spend authorization is one mechanism

When the plan total exceeds the resolved `budget`, the engine MUST treat avatar spend as authorized only when either (a) every scene with an avatar item has a counting `approved` `preview` verdict whose `plan_hash` equals the scene's current plan slice hash, or (b) the latest counting `approved` `budget` verdict carries a `plan_hash` equal to the current episode `plan_hash`. A plan within `budget` needs no authorization. When no level sets `budget` and the plan total is above zero, the engine MUST stop with exit 11 naming `budget` as unset, before any spend; no verdict can satisfy that stop. The `--approve <plan_hash>` command-line flag MUST NOT exist, because an agent could supply it: an authorization is data in an applied human changeset or it does not exist. When authorization is needed and absent, the engine MUST stop at the corresponding gate with exit 10, naming the estimate, the budget and the hash to approve, and spend nothing beyond what the pipeline order allows before that gate.

#### Scenario: Preview approvals authorize the whole plan

- GIVEN `review_gates: [script, preview]`, a plan above budget and preview approvals carrying each scene's current slice hash
- WHEN `produce` reaches the avatar stage
- THEN no second approval is requested and avatar spend proceeds

#### Scenario: Stale slice hash

- GIVEN preview approvals carrying slice hash `s1` for scene 1 and a price change that makes its current slice hash `s1'`, with the plan over budget
- WHEN `produce` runs
- THEN it exits 10 at the `preview` gate naming scene 1 and `s1'`

#### Scenario: Within budget needs nothing

- GIVEN a plan of 1.20 and `budget:: 2.00`
- WHEN `produce` runs with approved gates
- THEN no spend authorization is requested

#### Scenario: Unset budget is a spend stop

- GIVEN no level declares `budget` and a plan whose total is above zero
- WHEN `produce` reaches the plan
- THEN it exits 11 naming `budget` as unset and spends nothing

#### Scenario: Unset budget with a fully cached plan

- GIVEN no level declares `budget` and a plan whose total is 0
- WHEN `produce` runs
- THEN no spend stop occurs

#### Scenario: No approve flag

- GIVEN the engine CLI
- WHEN `produce` is run with `--approve <hash>`
- THEN it exits non-zero with a usage that does not list the flag

### Requirement: A budget gate is inserted when preview is absent and the plan is over budget

When `preview` is not in the resolved `review_gates` and the plan exceeds `budget`, the engine MUST add a `budget` gate, targeting the episode model, of the same `review_gate` kind, positioned immediately after the persisted plan and before any provider spend. Its current hash MUST be the episode `plan_hash`, and its verdict MUST carry that value as both `reviewed_hash` and `plan_hash`. When `preview` is in `review_gates`, the engine MUST NOT insert a `budget` gate for the avatar spend. The `budget` gate is satisfied only in state `approved` per "Gate state is derived". Daily budget limits remain a spend stop (exit 11) and are not a gate.

#### Scenario: Autopilot over budget

- GIVEN `review_gates: []` and a plan above `budget`
- WHEN `produce` runs
- THEN exactly one gate is open: `budget`, and `produce` exits 10 with no provider spend

#### Scenario: Autopilot within budget

- GIVEN `review_gates: []` and a plan within `budget`
- WHEN `produce` runs
- THEN no gate stops the run

#### Scenario: Preview on, no second gate

- GIVEN `review_gates: [script, preview]`, a plan above `budget`, and a pre-preview subtotal (TTS and images) within `budget`
- WHEN the gates are listed
- THEN no `budget` gate is listed

#### Scenario: Budget approval carries the hash

- GIVEN an open `budget` gate with episode plan hash `p1`
- WHEN the human approves it in the console
- THEN the change is `gate:: budget`, targets the episode model, and carries `reviewed_hash:: p1` and `plan_hash:: p1`

#### Scenario: Plan change re-opens the budget gate

- GIVEN an approved `budget` gate and a narration edit that changes the plan hash
- WHEN the gate state is computed
- THEN it is `reopened`

#### Scenario: Pre-spend subtotal over budget with preview on

- GIVEN `review_gates: [script, preview]` and a pre-preview subtotal (TTS and images) that alone exceeds `budget`
- WHEN `produce` runs
- THEN a `budget` gate is inserted before TTS and images, because their spend precedes the preview approval
- AND once it is approved with the episode `plan_hash`, the preview gate still asks for its content review but not for spend
- AND this case is pending the proposal's open product question on double approval; the behaviour above is the recommended default

### Requirement: Gate order and stopping rule

Gates MUST be evaluated in this order: `script` (all scenes), then `budget` when inserted, then `preview` (all scenes), regardless of the order of `review_gates`. `produce` MUST stop at the first stage that has an unsatisfied gate, listing every open, `reopened` or `needs-change` item of that gate with its notes or re-open cause, and MUST exit with status 10. A stop MUST leave no spend beyond what the order of the pipeline allows before that gate (nothing before `script` and `budget`; TTS, images, captions and animatic before `preview`).

#### Scenario: Script gate stops first

- GIVEN open `script` and `preview` gates
- WHEN `produce` runs
- THEN it exits 10 naming the `script` gate and spends nothing

#### Scenario: Needs-change lists scene and notes

- GIVEN scene 3 with a `needs-change` verdict on the current content and the notes "too long"
- WHEN `produce` runs
- THEN it exits 10 listing scene 3 and "too long"

#### Scenario: Preview stop after cheap spend

- GIVEN approved `script` gates and open `preview` gates, within budget
- WHEN `produce` runs
- THEN TTS, images, caption alignment and the animatic are produced, no avatar is requested, and it exits 10 naming the `preview` gate

#### Scenario: Gate order ignores list order

- GIVEN `review_gates: [preview, script]`
- WHEN `produce` runs on a fresh draft
- THEN the first stop is the `script` gate

### Requirement: Re-open is scoped to the affected scenes

When content changes, only the scenes whose gate hash changed MUST re-open; every other scene's approval MUST remain valid. An upstream change that changes the resolved parameters of several scenes (for example a series voice) re-opens exactly those scenes. A regenerated scene MUST return to the gate as pending while the unchanged scenes keep their approvals, and their cached TTS, image and avatar entries MUST remain cache hits.

#### Scenario: Edit scene 2 only

- GIVEN five approved scenes and an edit to scene 2's narration
- WHEN the gate states are computed
- THEN scene 2 is `reopened` and scenes 1, 3, 4 and 5 are `approved`

#### Scenario: Avatar regenerates for scene 2 only

- GIVEN approved gates, produced avatars for all five scenes, and then a scene 2 edit approved again
- WHEN `produce` runs
- THEN exactly one avatar provider request is made, for scene 2, and the other four are cache hits

#### Scenario: Needs-change scene regenerated alone

- GIVEN scene 3 marked `needs-change` with notes
- WHEN the agent writes a new proposal scoped to scene 3's addresses
- THEN scenes 1, 2, 4 and 5 are unchanged, keep their approvals and have cache-hit TTS entries

### Requirement: Re-open causes are recorded

When a gate that had a verdict becomes `reopened`, the engine MUST record the cause in the gate-state record (`conntent-run-facts`, "Gate-state records live with the facts") and MUST make it available to consoles. A cause MUST have a kind and detail: `narration-changed`, `layer-changed` (layer name), `param-changed` (field, the level that now supplies the value, old and new value), `asset-changed` (kind of cache key), `plan-changed`, or `unknown` when the record lacks the previous components. The engine MUST store the components of each gate hash at the moment a verdict is first seen as current, so it can name the changed component. A cause caused by a parameter whose source level changed MUST name that level (for example "series voice changed"). The cause MUST be cleared when the gate is `approved` again.

#### Scenario: Series voice change

- GIVEN three approved episodes and the series `voice` is changed
- WHEN the gate states are computed
- THEN each episode's affected scenes are `reopened` with a `param-changed` cause naming `voice` and level `series`

#### Scenario: Narration edit

- GIVEN an approved scene whose narration is edited
- WHEN the cause is read
- THEN it is `narration-changed`

#### Scenario: Plan price change

- GIVEN an approved `budget` gate and a price change in the catalog
- WHEN the cause is read
- THEN it is `plan-changed`

#### Scenario: Record missing on another machine

- GIVEN a `reopened` gate and no gate-state record
- WHEN the cause is read
- THEN it is `unknown` and the gate is still scoped to the scenes whose hash changed

#### Scenario: Cause cleared on re-approval

- GIVEN a `reopened` gate with a cause
- WHEN a new approval with the current hash is applied
- THEN the gate is `approved` and has no cause

### Requirement: `review::` is a display mirror, and an unbacked value is flagged

The Scene field `review::` MUST be written only by the engine, as a mirror of the derived state: `approved` when every gate configured for the scene is `approved`, `needs-change` when any latest verdict is `needs-change` on current content, otherwise empty. The mirror write MUST be an engine changeset that is excluded from every gate hash, and MUST be written only when the value changes. When the engine finds a `review::` value that differs from the derived state and is `approved` with no backing verdict, it MUST report the finding `unbacked-review` naming the scene, MUST NOT treat the value as an approval, and MUST then correct the mirror. Validation MUST surface `unbacked-review` as a warning that is visible in the run output and the console data.

#### Scenario: Mirror follows state

- GIVEN a scene whose gates are all approved by applied verdicts
- WHEN the engine syncs the mirror
- THEN `review:: approved` is written by an engine changeset

#### Scenario: Unbacked approval flagged and ignored

- GIVEN an agent-written `review:: approved` on a scene with no applied verdict
- WHEN the episode is validated
- THEN `unbacked-review` names the scene
- AND the scene's gates stay `open`

#### Scenario: Mirror write does not alter hashes

- GIVEN an engine mirror update
- WHEN the script hash of the scene is computed before and after
- THEN it is equal

#### Scenario: Hand-edited document cannot approve

- GIVEN a hand edit to the episode `_NN.md` setting `review:: approved` and bypassing changesets
- WHEN `produce` runs
- THEN the script gate stops the run as before

### Requirement: The engine supplies the hash and a stale approval is refused

The engine MUST compute every current gate hash, every plan slice hash and the episode `plan_hash`, and MUST publish them, per scene and gate, in the console data it exports, so that consoles copy them and never compute them. A `review_gate` change whose `reviewed_hash` (or, for `preview` and `budget`, whose `plan_hash`) no longer equals the current value when `produce` applies it MUST NOT approve the gate; the engine MUST report "content changed since you reviewed it; reopen the console" naming the scene and gate. The changeset itself remains applied as a record.
<!-- shared with slice 4: the console-side refusal before writing (C7) lives in console-changes-direct-write "Stale approval is refused at write time" and its display in conntent-domain-console "Stale approval is refused"; regeneration after apply lives in console-regeneration -->

#### Scenario: Stale approval reported

- GIVEN a human approval exported when scene 2 had hash `h1`, and scene 2 edited afterwards to `h2`
- WHEN `produce` starts and applies the changeset
- THEN the gate is not approved and the output contains "content changed since you reviewed it; reopen the console" naming scene 2

#### Scenario: Hashes are in the payload

- GIVEN an episode with two scenes
- WHEN the console data is exported
- THEN each scene carries its current `script` hash, `preview` hash and plan slice hash, and the episode carries the `plan_hash`

### Requirement: A delivered episode re-opens by content change

Any change that makes a gate hash differ after the episode reached `produced` or `delivered` MUST re-open the affected scenes' gates under the same rules, MUST move the episode status per `conntent-episode-lifecycle`, and MUST NOT modify or remove any existing `deliveries/v<N>/` folder.

#### Scenario: Edit after delivery

- GIVEN a delivered episode with `deliveries/v1/` and an edit to scene 2's narration
- WHEN the gate states are computed
- THEN scene 2 is `reopened`, the other scenes keep their approvals, and `deliveries/v1/` is unchanged
