# conntent-procedures Specification (new capability, Slice 5)

## Purpose

Defines the six coNNtent procedures that carry a person from an empty folder to a delivered episode, the per-step tool declaration, the conversational setup wizards that end in a proposed changeset, the state-aware entry point of the `nn-conntent` skill, and the guard that stops the legacy `nn-video-script` skill from operating on a coNNtent domaiNN. It supersedes `conntent-template` (see the delta of that capability) and the seven episode-only procedures of `usage_procedures_NN.md`.

Source: D20, C4, F11, F13, use cases U1 to U7.

## ADDED Requirements

### Requirement: Six procedures in one document

The coNNtent bluepriNNt MUST ship exactly one procedures document, `procedures/usage_procedures_NN.md`, defining exactly these six procedures, in this order and with these names:

| Procedure | Level | Ends in |
|---|---|---|
| Set up the Domain | domaiNN | defaults, catalog, voices, whisper check, library |
| Define a Frame | domaiNN or series | `library/frames/<name>/FRAME.md` (+ `caption-skin.html`) |
| Define a Character | domaiNN or series | `library/characters/<name>/` and a catalog Voice |
| Create a Series | series | the series document (Kinds, Chrome, Presets) and a dry-run test episode |
| Plan an Episode | episode | an idea, then a sealed scene draft |
| Produce an Episode | episode | gates, render, QA and automatic delivery |

There MUST be no Deliver procedure and no other procedure. Each procedure MUST state its level, its preconditions and the artifact it ends in. The document MUST NOT contain the earlier seven-step episode procedures (`Draft the Episode`, `Propose the Changeset`, `Review the Episode`, `Approve the Spend`, `Produce the Master`, `Finish the Publication`).

#### Scenario: Exactly six
- GIVEN the procedures document
- WHEN its procedures are listed
- THEN the six names above appear in that order and nothing else

#### Scenario: No Deliver procedure
- GIVEN the procedures document
- WHEN it is searched for a procedure named Deliver
- THEN none exists

#### Scenario: Old steps are gone
- GIVEN the procedures document
- WHEN searched for `Approve the Spend` and `Finish the Publication`
- THEN no match is found

### Requirement: Every step declares its tool

Each step of each procedure MUST declare exactly one tool from the closed set `agent`, `engine`, `console`, `human`. An `engine` step MUST name the engine command; a `console` step MUST name the console section (for example `Episode > Review`); a `human` step MUST state the decision or action required; an `agent` step MUST state the artifact it produces. A test MUST fail when a step has no tool, a tool outside the set, or more than one. The field carrying the tool is defined by the design.

#### Scenario: Missing tool
- GIVEN a step with no tool
- WHEN the procedures test runs
- THEN it fails naming the procedure and step

#### Scenario: Tool outside the set
- GIVEN a step declaring tool `robot`
- WHEN the test runs
- THEN it fails

#### Scenario: Console step names its section
- GIVEN a step with tool `console`
- WHEN the test runs
- THEN it fails if the step names no console section

### Requirement: Setup procedures are wizards that end in a proposed changeset

The procedures Set up the Domain, Define a Frame, Define a Character and Create a Series MUST run as conversational wizards: the agent MUST ask one decision at a time, MUST offer a default derived from the current state of the domaiNN, MUST summarise all decisions before proposing, and MUST end by delivering a sealed `proposed` changeset (written with `writeProposedChangeset`) that passes validation by a dry apply. The agent MUST NOT apply the changeset itself and MUST NOT edit any kNNowledge `_NN.md` file directly.

Library files that are not kNNowledge documents (`FRAME.md`, `caption-skin.html`, `CHARACTER.md`, `COMPONENT.md` and media) MAY be written directly by the wizard, because changesets cannot create them. Such a file has no effect until a human-approved applied changeset references it: the closing proposed changeset MUST hold the references (for example the `character::` or `frame::` field, a catalog Voice `add_element`) and one `produce_artifact` record per created file with its sha256, and the engine MUST NOT resolve a library item for rendering unless a referencing change was applied. The final step MUST be a `human` step in which the person approves (by the console or by replying OK to the agent as `console-regeneration` describes for proposals).

#### Scenario: Wizard ends in a proposal
- GIVEN a completed Set up the Domain wizard
- WHEN its output is inspected
- THEN a sealed proposed changeset exists and no `_NN.md` file was modified

#### Scenario: Agent does not apply
- GIVEN the wizard's final step
- WHEN the steps are read
- THEN the apply step has tool `human` or `engine`, never `agent`

#### Scenario: Default from state
- GIVEN a domaiNN whose `video-defaults_NN.md` already sets `language: es`
- WHEN the wizard asks for the language
- THEN the offered default is `es`

#### Scenario: Library files are inert until referenced
- GIVEN a wizard that wrote `library/characters/lucas/CHARACTER.md` and whose proposed changeset is not yet applied
- WHEN an episode that would use `character:: lucas` is validated
- THEN the character is not used and the output says it awaits an applied changeset

#### Scenario: Created files are recorded
- GIVEN a wizard that created a frame folder
- WHEN its proposed changeset is read
- THEN it holds a `produce_artifact` record with the sha256 of each created file and the reference to the frame

#### Scenario: Procedures never instruct hand edits
- GIVEN the procedures document
- WHEN every step is scanned for an instruction to edit a `_NN.md` file by hand
- THEN none exists

### Requirement: Set up the Domain

The procedure MUST cover, in order: confirming the domaiNN root and that no legacy layout is present; adopting the coNNtent bluepriNNt by copying the package `video-defaults_NN.md` to the root when absent; choosing domaiNN defaults (`language`, `budget`, `daily_budget`, `review_gates`, models and `output_formats`) from the merged catalog; checking provider credentials; reviewing the catalog and its prices; registering voices, at least one per language the domaiNN will produce in; checking whether whisper.cpp is available and, if not and `captions` is not `off`, offering installation through the consent-gated command of `conntent-skill-dependency-bundling` (nothing installs silently); creating the domaiNN `library/` skeleton; and adding the managed gitignore block. It MUST end in the proposed changeset and a regenerated console.

#### Scenario: Whisper missing
- GIVEN a machine without whisper.cpp and `captions: words` as default
- WHEN the whisper step runs
- THEN the agent offers installation with a notice and waits for consent
- AND declining leaves the setup valid with a warning that captions will stop a run

#### Scenario: Voice per language
- GIVEN the chosen language `es` and a catalog with only `en` voices
- WHEN the voices step runs
- THEN the wizard does not proceed to the proposal until an `es` voice is registered or the human records the choice to defer

#### Scenario: Existing defaults untouched
- GIVEN a domaiNN that already has `video-defaults_NN.md`
- WHEN the adoption step runs
- THEN the file is not overwritten

### Requirement: Define a Frame

The procedure MUST let the person start from one of the 13 HyperFrames frame presets, from `hyperframes capture <url>`, or from scratch, and MUST produce a FRAME.md (normative frontmatter `colors`, `typography`, `spacing`, `components`, plus intent prose) and its `caption-skin.html` inside the folder `library/frames/<name>/` at the chosen level (domaiNN or series), with a `fonts/` folder when the frame needs fonts. It MUST include a human step that previews the frame, and it MUST end in a proposed changeset naming the frame and, when the person wants it as the default, the `frame` field at the chosen level.

#### Scenario: From a preset
- GIVEN the person picks the `coral` preset
- WHEN the procedure completes
- THEN `library/frames/<name>/FRAME.md` exists at the chosen level with the preset's tokens and the frame is referenced by the approved changeset

#### Scenario: Level choice
- GIVEN the person chooses series level
- WHEN the procedure ends
- THEN the frame folder is placed in that series' `library/frames/`

#### Scenario: Caption skin travels with the frame
- GIVEN a preset that ships a `caption-skin.html`
- WHEN the procedure completes
- THEN the skin is inside the same frame folder

### Requirement: Define a Character

The procedure MUST collect, one decision at a time: name and level (domaiNN or series); voice per language (clone through `voice-clone.mjs`, which writes a catalog Voice carrying its `language`, or select an existing Voice whose language matches); `default_pose`; `avatar_model` and `avatar_resolution`; `default_background`; and the prose (speaking and narrative style, things never said, examples). It MUST create `library/characters/<name>/` with `CHARACTER.md`, `avatars/`, `backgrounds/` and `voice/`, and MUST end in a proposed changeset covering the catalog Voice entries. A voice for a language MUST NOT be accepted when the Voice's language differs from the language it is declared for.

#### Scenario: Cloned voice carries its language
- GIVEN a clone made for `es`
- WHEN the catalog Voice is proposed
- THEN it carries `language: es`

#### Scenario: Mismatched language refused
- GIVEN a Voice of language `en` offered for the `es` slot
- WHEN the wizard validates the choice
- THEN it refuses and asks for another Voice

#### Scenario: Folder layout
- GIVEN an approved character `lucas`
- WHEN the library is listed
- THEN `library/characters/lucas/` holds `CHARACTER.md`, `avatars/`, `backgrounds/` and `voice/`

### Requirement: Create a Series

The procedure MUST collect the series language, the host character (`character`), the frame, the Scene Kinds (role, maximum duration, narration, Chrome slots, presets and direct fields), the Chrome per language, the Presets, `review_gates` and the budgets. When a character is in use it MUST guide the person not to set `voice` or `avatar` in Presets (C9) and MUST surface the override warning if they do. It MUST end in the series document as a proposed changeset and a dry-run test episode.

The dry run MUST run validation and the persisted plan only. It MUST NOT synthesise, render or spend, and MUST report the resolved values with their source trace, the library names it resolved to files, the Chrome and voice found for the series language, and the plan estimate. A failure MUST be reported with the missing item, and the procedure MUST NOT end successfully while the dry run fails. At the last step the human decides whether to keep the test episode as the series' first episode or discard it (keep-or-discard is the recommended default of an open product question listed in the proposal).

#### Scenario: Dry run spends nothing
- GIVEN a series proposal approved and applied
- WHEN the dry run executes
- THEN the ledger has no new record and no media file is created

#### Scenario: Dry run catches a missing Chrome
- GIVEN a series with language `es` and no `es` Chrome
- WHEN the dry run executes
- THEN it fails naming the missing Chrome and the procedure does not complete

#### Scenario: Preset overriding the host
- GIVEN the series character `lucas` and a Preset the person wants to give a `voice`
- WHEN the wizard validates
- THEN the override warning is shown before the proposal

#### Scenario: Keep or discard
- GIVEN a passing dry run
- WHEN the last step runs
- THEN the human chooses to keep or discard the test episode and the choice is honoured

### Requirement: Plan an Episode

The procedure MUST produce an idea and then a sealed scene draft. It MUST read the active character's `CHARACTER.md` prose (the character set by the series, and any scene-level guest) before writing narration. For a translation it MUST create the episode with `translation_of` and `language`, and MUST verify before drafting that the Chrome and the character voice for that language exist, stopping with the missing item otherwise. The draft MUST be delivered as a sealed proposed changeset whose content and agent boundary (creative work only; no `status`, `master`, `review::` or verdict) are owned by `conntent-skill` "Draft Procedure Emits A Proposed Changeset"; this procedure adds only the character and translation steps above. Regeneration of a scene MUST address that scene only.

#### Scenario: Character prose is read
- GIVEN a series with host `lucas` whose prose forbids a phrase
- WHEN the draft is produced
- THEN the procedure's steps include reading that prose and the narration does not use the phrase

#### Scenario: Translation prerequisites
- GIVEN a translation with `language: en` and no `en` voice in the character
- WHEN the procedure starts drafting
- THEN it stops naming the missing voice before any narration is written

#### Scenario: Regeneration addresses one scene
- GIVEN scene 3 flagged needs-change with a reason
- WHEN the procedure runs for that scene
- THEN the new proposal addresses scene 3 only

### Requirement: Produce an Episode

The procedure MUST use `produce <episode>` as the only engine command the agent runs, and MUST describe the run as a sequence of `engine`, `console` and `human` steps: produce until the `script` gate; the human reviews the script in the console (Episode > Review); produce continues until the `preview` gate; the human reviews the animatic and approves the avatar spend; produce continues through avatar, compile, render, automatic QA, formats and thumbnails, description and delivery. It MUST state that delivery is automatic once QA passes and that the lifecycle ends at `delivered`. It MUST state that gates absent from `review_gates` are skipped, that a `budget` gate appears when the plan exceeds `budget`, and that approvals are given in the console and never by the agent. It MUST describe the `failed_qa` path (read the Status section, fix, re-run) and the `delivered` re-open path (a content change moves the episode to its first open gate for the affected scenes). It MUST NOT describe a separate delivery step.

#### Scenario: One engine command
- GIVEN the Produce an Episode steps
- WHEN every step with tool `engine` is read
- THEN the only command named is `produce`

#### Scenario: Approvals are human
- GIVEN the steps that approve a gate
- WHEN their tools are read
- THEN each is `console` or `human`, never `agent`

#### Scenario: Delivery is not a step
- GIVEN the procedure
- WHEN searched for a delivery step
- THEN it appears only as the automatic final outcome of the engine run

#### Scenario: Autopilot
- GIVEN a series with `review_gates: []` and a plan within budget
- WHEN the procedure is read for that case
- THEN it states the run reaches `delivered` without any human step

The rule that every tool command uses the installed skill path `~/.agents/skills/nn-conntent/scripts/...` is owned by `conntent-template` "Procedures Reference The Installed Skill Path" and applies to all six procedures; it is not restated here.

### Requirement: State-aware entry point

The `nn-conntent` skill entry point MUST detect the state of the domaiNN from its files (never from conversation memory) and MUST propose the right procedure, asking for confirmation before starting it. The detection MUST be read-only. Rules, evaluated in this order, the first match wins:

1. Legacy layout detected (the layout check of `conntent-folder-contract`: `series/<s>/assets/<slug>/`, root or series `sounds/`, `components/`, `frames/`, or `video-guard.json`): report the layout module's rejection message, one per legacy path, and propose recreating the domaiNN with Set up the Domain in a new folder.
2. No `domaiNN_NN.md`, or no `video-defaults_NN.md`: propose Set up the Domain.
3. No series: propose Define a Frame when the domaiNN `library/frames/` holds none, else Define a Character when `library/characters/` holds none, else Create a Series. The person MAY skip straight to Create a Series at any time; because detection is stateless, these two proposals stop once a series exists (recommended default of an open product question listed in the proposal).
4. A series exists but has no episodes: propose Plan an Episode for it.
5. An episode in `idea` or without a sealed draft: propose Plan an Episode for it.
6. An episode with a sealed draft, an open gate, `failed_qa`, or a re-opened delivered episode: propose Produce an Episode for it.
7. All episodes delivered: propose Plan an Episode for a new episode.

When several episodes or series match, the entry point MUST ask which one (one question). After a procedure completes, the entry point MUST propose the next procedure by the same rules. The entry point MUST NOT start a procedure without confirmation and MUST accept the person choosing a different procedure.

#### Scenario: Empty folder
- GIVEN an empty folder
- WHEN the entry point runs
- THEN it proposes Set up the Domain

#### Scenario: Set up done, no frame
- GIVEN a domaiNN with defaults, no series and no frame in its library
- WHEN the entry point runs
- THEN it proposes Define a Frame and accepts the person choosing Create a Series instead

#### Scenario: Frame and character exist, no series
- GIVEN a domaiNN with a frame, a character and no series
- WHEN the entry point runs
- THEN it proposes Create a Series

#### Scenario: Skipped frame is not nagged once a series exists
- GIVEN a domaiNN with a series and no frame of its own
- WHEN the entry point runs
- THEN it does not propose Define a Frame

#### Scenario: Open gate
- GIVEN an episode waiting on its `script` gate
- WHEN the entry point runs
- THEN it proposes Produce an Episode for it and points to the console for the review

#### Scenario: Failed QA
- GIVEN an episode in `failed_qa`
- WHEN the entry point runs
- THEN it proposes Produce an Episode for it

#### Scenario: Legacy layout
- GIVEN a folder with `series/botijos-today/assets/gas-pump/`
- WHEN the entry point runs
- THEN it reports the rejection message and proposes recreating the domaiNN, and proposes no other procedure

#### Scenario: Read-only detection
- GIVEN any folder state
- WHEN the entry point detects the state
- THEN no file is created or modified

#### Scenario: Idempotent
- GIVEN the same folder state
- WHEN the entry point runs twice
- THEN it proposes the same procedure both times

#### Scenario: Several candidates
- GIVEN two episodes at gates
- WHEN the entry point runs
- THEN it asks which episode, in one question, before proposing

#### Scenario: User overrides
- GIVEN a proposal of Create a Series
- WHEN the person asks for Define a Character instead
- THEN the entry point starts that procedure

### Requirement: Legacy nn-video-script refuses coNNtent domaiNNs

The legacy `nn-video-script` skill MUST refuse to operate on a coNNtent domaiNN: when the working domaiNN adopts the `coNNtent` bluepriNNt (detected by `domaiNN_NN.md` pinning coNNtent, or the presence of any `series/*/*_coNNtent_NN.md`), the skill MUST stop before any read-modify or write, state that the domaiNN belongs to coNNtent, and point to `nn-conntent` and its entry point. The refusal MUST be a hard stop with no alias, no redirect and no partial operation.

#### Scenario: Refusal with pointer
- GIVEN a coNNtent domaiNN
- WHEN `nn-video-script` is invoked on it
- THEN it stops, states the domaiNN belongs to coNNtent and names `nn-conntent`
- AND no file was modified

#### Scenario: Detection by layout
- GIVEN a domaiNN with `series/<s>/<s>_coNNtent_NN.md` and no readable bluepriNNt pin in `domaiNN_NN.md`
- WHEN `nn-video-script` is invoked
- THEN it refuses

#### Scenario: Not a coNNtent domaiNN
- GIVEN a domaiNN of the legacy `video-script` blueprint
- WHEN `nn-video-script` is invoked
- THEN its behaviour is unchanged
