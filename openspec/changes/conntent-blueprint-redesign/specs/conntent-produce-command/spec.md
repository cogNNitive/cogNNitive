# conntent-produce-command Delta Spec

Slice 3, PR 3b. The generation order of D8, gates instead of the two fixed stops, parallel TTS and images, animatic, and automatic delivery.

## MODIFIED Requirements

### Requirement: One Command Sequences The Whole Pipeline

The engine CLI MUST provide `produce <episode>` that performs, in this order and without further instruction: application of pending human changesets, intake of the proposed changeset, validation (registry keys, kinds, catalog, chrome, languages, whisper availability when captions are on, legacy layouts), the `script` gate, kind and chrome expansion, cascade resolution, plan (estimated and persisted with its `plan_hash`), the inserted `budget` gate when it applies, TTS and image synthesis in parallel, caption alignment, the low-resolution animatic, the `preview` gate, avatar synthesis, compile, asset linking, render, QA of the master, formats and thumbnails, description, QA of the output set, delivery, and lifecycle writes. QA runs at exactly these two checkpoints (`conntent-qa`). The agent MUST NOT need to invoke any of these steps individually. The CLI MUST NOT accept model-id or output-size flags, because the cascade has no `cli` level, and MUST NOT accept `--approve`, `--skip-qa` or any flag that approves a gate. Gates that are not in the resolved `review_gates` are skipped; the stages around them still run in this order.
(Previously: review or skip, estimate, budget gate, then TTS, image and avatar in sequence before the review of previews; format derivation without QA; no animatic, captions, thumbnails stage or delivery.)

#### Scenario: Autopilot episode goes to delivered in one run

- GIVEN an episode with an applied proposal, `review_gates: []` and a plan within budget
- WHEN `produce <episode>` runs
- THEN it ends with exit 0, the master and every declared format and thumbnail written, `deliveries/v1/` created, the state `delivered`, and a summary of real cost and stage timings

#### Scenario: Order is fixed

- GIVEN a successful run with `review_gates: [script, preview]` and both gates already approved
- WHEN the timing log of that run is read
- THEN the stages appear in the order `plan`, then `tts` and `image` (overlapping in time), then `captions` (only when captions are on), `animatic`, `avatar`, `compile`, `render`, `qa` (master), `formats`, `description`, `qa` (output set), `delivery`, `apply`
- AND no provider spend precedes the plan

#### Scenario: Model flag refused

- GIVEN the engine CLI
- WHEN `produce` is run with `--avatar-model X`
- THEN it exits non-zero with a usage that does not list the flag

#### Scenario: Approval flags refused

- GIVEN the engine CLI
- WHEN `produce` is run with `--approve h` or with `--skip-qa`
- THEN it exits non-zero with a usage that lists neither

#### Scenario: Avatar spend only after preview

- GIVEN `review_gates` containing `preview` and an open `preview` gate
- WHEN `produce` runs
- THEN no avatar provider request is made and the run exits 10

### Requirement: The Engine Owns Lifecycle Writes

`produce` MUST write each lifecycle state only through an engine changeset written with `writeProposedChangeset` and applied with `executeChangesetApply`, as specified by `conntent-episode-lifecycle`: `approved` when every configured gate is satisfied; `produced` only after the master, every declared format and every declared thumbnail exist and QA passed; `failed_qa` when QA fails; `delivered` after the delivery step. A failed run MUST NOT set `produced` or `delivered`. The engine MUST NOT write a status changeset when the status would not change. The engine MUST NOT write `review_gate` changes.
(Previously: `approved`, `produced` only, with the master.)

#### Scenario: Produced is set last before delivery

- GIVEN a run that fails during rendering
- WHEN the episode record is read
- THEN the state is `approved` and `master` is unchanged

#### Scenario: Status written through the apply engine

- GIVEN a successful run
- WHEN the change history of the episode is read
- THEN the `approved`, `produced` and `delivered` writes are changesets applied by the engine and valid under the changeset parser

#### Scenario: No churn on an unchanged re-run

- GIVEN a `delivered` episode whose gates and inputs are unchanged
- WHEN `produce` runs again
- THEN no status changeset is written

### Requirement: Produce Refuses Episodes It Cannot Produce

`produce` MUST fail with a named error for an episode in state `archived`, for an episode whose frontmatter `blueprint_version` is not the installed one, and for an episode in a legacy layout. An episode in `delivered`, `produced` or `failed_qa` MUST be producible.
(Previously: `published` and `archived` were refused; `published` no longer exists.)

#### Scenario: Archived cannot be produced

- GIVEN an episode in state `archived`
- WHEN `produce` runs
- THEN it fails naming the state

#### Scenario: Delivered can be re-produced

- GIVEN a `delivered` episode with an edited scene
- WHEN `produce` runs
- THEN the run starts and stops at the first open gate

#### Scenario: Old pinned version

- GIVEN an episode with `blueprint_version: V_0-14-1`
- WHEN `produce` runs
- THEN it fails naming the pin and the installed version, and converts nothing

## ADDED Requirements

### Requirement: Produce Stops At Gates And Spend Stops

`produce` MUST use exactly these exit statuses: 0 done (delivered, or a no-op re-run); 10 an unsatisfied gate (`script`, `preview` or an inserted `budget` gate), listing every open, re-opened or `needs-change` item with its notes or re-open cause and, for `budget`, the estimate, the budget and the episode `plan_hash` (see `conntent-review-gates`); 11 a spend stop that no verdict can satisfy (`budget` unset with a plan total above zero, or the `daily_budget` cap reached); 12 `failed_qa` (`conntent-qa`); 1 any other named error, including `legacy-layout`, `caption-alignment-failed` and `whisper-missing`. A stop MUST leave no spend beyond that allowed before it by the order of the pipeline. At every exit the engine MUST regenerate the console data as specified by `console-regeneration`.

#### Scenario: Script stop

- GIVEN `review_gates` containing `script` and a draft with no applied verdict
- WHEN `produce` runs
- THEN it exits 10, spends nothing, lists the scenes and states how to continue

#### Scenario: Preview stop after cheap stages

- GIVEN approved `script` gates, an open `preview` gate and a plan within budget
- WHEN `produce` runs
- THEN TTS, images, captions and the animatic exist, no avatar was requested, and it exits 10 naming `preview`

#### Scenario: Needs-change stop lists scenes

- GIVEN a scene whose latest verdict is `needs-change` on current content with notes
- WHEN `produce` runs
- THEN it exits 10 listing the scene and the notes

#### Scenario: Budget gate under autopilot

- GIVEN `review_gates: []` and a plan above `budget`
- WHEN `produce` runs
- THEN it exits 10 at the `budget` gate naming the estimate, the budget and the `plan_hash`, and spends nothing

#### Scenario: Unset budget is a spend stop

- GIVEN no level sets `budget` and a plan total above zero
- WHEN `produce` runs
- THEN it exits 11 naming `budget` and spends nothing

#### Scenario: Daily cap is a spend stop

- GIVEN `daily_budget` already reached today
- WHEN `produce` reaches the first provider call
- THEN it exits 11 naming `daily_budget` and spends nothing

#### Scenario: Authorized plan proceeds

- GIVEN an over-budget plan and an applied human `budget` approval carrying the current `plan_hash`
- WHEN `produce` runs
- THEN no stop occurs at the budget and the run proceeds

#### Scenario: Stale authorization stops again

- GIVEN an applied human `budget` approval carrying a `plan_hash` that no longer equals the current one and an over-budget plan
- WHEN `produce` runs
- THEN it exits 10 at the `budget` gate

#### Scenario: A caption failure is not a gate

- GIVEN a failed alignment
- WHEN `produce` runs
- THEN it exits 1 with `caption-alignment-failed`

### Requirement: Produce applies pending human changesets on start

Before validation, `produce` MUST apply every changeset in the domaiNN's `changes/` that is `proposed`, sealed (valid `proposal_sha`), targets the episode (or its series or domaiNN), and whose frontmatter carries `author_kind: human`, `origin: console` and a `reviewer` (`changeset-review-gate`), in file order. Changesets without those markers (for example agent proposals awaiting the human's OK) MUST be left `proposed`; the agent's own script proposal is applied by the separate intake step. The engine MUST report what it applied and what it left. A refused or conflicting changeset MUST be reported by name and MUST NOT stop the run by itself.

#### Scenario: Console approvals applied on start

- GIVEN a proposed human changeset with `review_gate` approvals written by a console
- WHEN `produce` starts
- THEN the changeset is applied before the gate evaluation and the gates reflect it

#### Scenario: Agent proposal left alone

- GIVEN a proposed changeset authored by an agent
- WHEN `produce` starts
- THEN it remains `proposed` and the output says so

#### Scenario: Tampered human changeset

- GIVEN a proposed changeset whose seal does not verify
- WHEN `produce` starts
- THEN it is reported as `PROPOSAL_TAMPERED` and not applied

#### Scenario: Stale approval reported but applied as record

- GIVEN a human approval with an outdated `reviewed_hash`
- WHEN `produce` starts
- THEN the changeset is applied, the gate stays unsatisfied, and the output contains "content changed since you reviewed it; reopen the console"

### Requirement: The plan is persisted before any spend

After validation and the `script` gate, `produce` MUST write the plan to the single plan location defined by `conntent-folder-contract`, containing the items (kind, model, cache key, units, unit price, price date, scene), the estimate total, the effective `budget`, the plan slice hash of each scene and the episode `plan_hash` (`conntent-run-facts`), the library resolution records (`conntent-library`), and for each item the source trace of its model. The plan MUST be complete and written before the first provider call. A re-run MUST rewrite it from the current inputs.

#### Scenario: Plan before spend

- GIVEN a run
- WHEN the file times of the plan and the first ledger spend row are compared
- THEN the plan was written first

#### Scenario: Plan lists scene items

- GIVEN a two-scene episode
- WHEN the plan is read
- THEN each item names its scene and its `cache_key`

#### Scenario: Cached items cost nothing in the plan

- GIVEN a fully cached episode
- WHEN the plan is read
- THEN every item is priced at 0 and the total is 0

### Requirement: TTS and images run in parallel

The `tts` and `image` stages MUST run concurrently, each stage's items within a per-provider concurrency limit, and the alignment of a scene MUST start as soon as that scene's audio exists. Neither stage MUST depend on the other's output. A failure in either MUST stop the run before the animatic, with the failed stage named, and the other stage's completed items MUST remain cached.

#### Scenario: Overlap

- GIVEN uncached TTS and image items
- WHEN the timing rows are read
- THEN the `image` stage starts before the `tts` stage ends

#### Scenario: One stage fails

- GIVEN a failing image provider
- WHEN `produce` runs
- THEN it exits 1 naming `image`, the TTS entries stay cached, and no animatic is produced

### Requirement: The animatic is a free, low-resolution preview with real audio

After TTS, images and alignment, `produce` MUST produce a low-resolution animatic, the single regenerable video file `<slug>_animatic_<W>x<H>.mp4` in the episode folder (`conntent-folder-contract`), which is not part of any delivery, showing for each scene in order: the generated or authored stills of its image layers; for an avatar scene, the character's pose still (a real file) or the avatar image generated by the image stage from the prompt, held for the scene; and the scene's real narration audio at its measured duration, with captions when captions are on. The animatic MUST make no provider call and MUST cost 0. Its resolution MUST be lower than the master's by a named constant. It MUST NOT contain an avatar clip.

#### Scenario: Animatic has real audio and pose still

- GIVEN an avatar scene with a character pose image and cached narration
- WHEN the animatic is produced
- THEN the scene shows the pose still for the length of the narration with that audio

#### Scenario: Prompt-generated avatar image

- GIVEN an avatar scene with no pose file but an image prompt
- WHEN the animatic is produced
- THEN the scene shows the image generated by the image stage

#### Scenario: No spend

- GIVEN an animatic stage
- WHEN its ledger and provider calls are read
- THEN there are none

#### Scenario: Smaller than the master

- GIVEN an animatic and the declared master size
- WHEN their dimensions are compared
- THEN the animatic is smaller

#### Scenario: Not delivered

- GIVEN a created delivery
- WHEN the delivery folder is listed
- THEN no animatic is in it

### Requirement: Avatar synthesis runs only for scenes with a satisfied preview

The `avatar` stage MUST run only after every `preview` gate configured for the episode is satisfied (or `preview` is not configured), and, when the plan is over budget, after spend authorization (see `conntent-review-gates`). It MUST request a provider clip only for avatar items whose cache key misses, so a scene whose inputs did not change stays a cache hit.

#### Scenario: Only changed scene regenerates

- GIVEN avatars cached for five scenes and an edit to scene 2 approved again
- WHEN `produce` runs
- THEN one avatar request is made

#### Scenario: Preview not configured

- GIVEN `review_gates: [script]`
- WHEN `produce` runs within budget
- THEN the avatar stage runs without a preview stop

### Requirement: Formats and thumbnails run after QA of the master

The `formats` stage MUST derive the declared video formats and render the declared thumbnails only after QA of the master passed, and the description stage MUST follow it; QA of the output set then checks all of them before delivery. A master QA failure MUST stop the run before this stage with exit 12.

#### Scenario: Failure skips formats

- GIVEN a QA failure on the master
- WHEN `produce` ends
- THEN it exits 12 and no format, thumbnail or description was written in that run

#### Scenario: Thumbnails produced inside produce

- GIVEN a passing master
- WHEN `produce` completes
- THEN every thumbnail of `thumbnail_formats` exists in the episode folder

## REMOVED Requirements

### Requirement: Produce Stops Only At Two Points

**Reason**: Replaced by "Produce Stops At Gates And Spend Stops". The script review is now a derived gate, the budget gate no longer accepts a command-line approval and exits 10 like every gate, exit 11 is reserved for spend stops no verdict can satisfy, and a preview gate exists.

**Migration**: None. `--approve <plan_hash>` is removed; authorization is an applied human `review_gate` change carrying the `plan_hash`.
