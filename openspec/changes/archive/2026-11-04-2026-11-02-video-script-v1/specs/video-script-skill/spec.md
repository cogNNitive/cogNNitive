# Delta for video-script-skill

Change `2026-11-02-video-script-v1`. Decisions D6, D10, D13. The agent does creative work only and delivers a proposed changeset; the engine command `produce` does everything deterministic. The skill is renamed `nn-conntent` (formerly `nn-conntent`), under the bluepriNNt folder `iNNfo/specs/bluepriNNts/coNNtent/`, with no alias or redirect.

## ADDED Requirements

### Requirement: Draft Procedure Emits A Proposed Changeset

The skill MUST provide a draft procedure that an agent follows to produce, for one episode, a proposed changeset containing only creative work: narration, the scene kind of every scene, visual asset selection, image prompts, and the publication description prose. The agent MUST deliver it as a sealed proposed changeset (written with `writeProposedChangeset`), which MUST pass validation against the field registry, the Series kinds and the merged catalog by a dry apply before it is applied. `produce` applies it and sets the episode to `draft` (capability `video-produce-command` "Intake Applies The Proposed Changeset"); the agent MUST NOT apply it itself. The agent MUST NOT write `status` or `master`, select models outside the cascade, apply chrome, or sequence engine steps.

Source: D6, D13.

#### Scenario: Procedure delivers a valid changeset

- GIVEN an `idea` episode with linked Sources in a Series with kinds
- WHEN the agent completes the draft procedure
- THEN a sealed proposed changeset exists whose scenes each state a known `kind::`
- AND it passes the registry and catalog checks and is not yet applied

#### Scenario: Invalid proposal is not delivered

- GIVEN a proposal containing an unknown key or an unknown kind
- WHEN the procedure validates it
- THEN it fails with the named error and no changeset is delivered

#### Scenario: Agent does not touch engine-owned fields

- GIVEN a proposed changeset that sets `status:: produced` or `master`
- WHEN it is validated
- THEN it is rejected naming the engine-owned field

#### Scenario: Regeneration touches one scene

- GIVEN a scene marked `needs-change` with a comment
- WHEN the agent runs the procedure for that scene
- THEN the new proposed changeset addresses only that scene (see video-script-review)

### Requirement: Produce Is The Single Entry Command

SKILL.md MUST document `produce <episode>` as the only command an agent runs after a script is proposed, and MUST document the two stops (exit 10 review gate, exit 11 budget gate with `--approve <plan_hash>`) and how to continue from each. It MUST NOT document a sequence of `compile`, `synthesize-avatar`, `render` or finalize steps for the agent to run.

Source: D6.

#### Scenario: Workflow names one command

- GIVEN SKILL.md
- WHEN its workflow section is read
- THEN it names the draft procedure, the review, and `produce`, and no other engine step

#### Scenario: Stops are documented

- GIVEN SKILL.md
- WHEN the section on `produce` is read
- THEN it names the review-gate (10) and budget-gate (11) stops and what resumes each

### Requirement: Retired V_0 Tooling Is Absent

The skill and `scripts/dev` MUST NOT contain `draft-template.html`, `build-draft-html.mjs`, `build-script-from-draft.mjs`, `finalize-video.mjs`, `approve-plan.mjs`, `video-guard.json`, `lib/knowledge-model.mjs`, `lib/video-scope.mjs`, `lib/legacy-draft-keys.mjs`, `reviewed.json`, `draft.json`, `review_console.html`, `stageAsset` or the in-chat approval phrase `approve the plan` outside `openspec/changes/archive/`.

#### Scenario: Scan is clean

- GIVEN the repository after the last slice
- WHEN the retired-tooling scan runs
- THEN it reports no match outside `archive/`

### Requirement: Skill Reaches nn-core And The Apply Engine Through A Mirror

The skill MUST obtain the scope fold, `parseKnowledge`, `parseChangeset`, `serializeChangeset`, `computeProposalSha`, `executeChangesetApply` and `writeProposedChangeset` from one generated, drift-guarded mirror (`lib/nn-core.generated.cjs`, built by the `coNNtent` target of `build-core-mirrors.mjs`), and MUST NOT keep a parser or writer of its own. `verify.js` MUST run the mirror `--check`.

Source: design A10 (bundle size to be measured in the first slice).

#### Scenario: Stale mirror fails

- GIVEN a change to a mirrored nn-core source without regenerating the mirror
- WHEN the mirror `--check` runs
- THEN it exits non-zero naming the mirror

#### Scenario: No private parser

- GIVEN the skill's `scripts/`
- WHEN it is searched for a private frontmatter or knowledge parser
- THEN none is found

## MODIFIED Requirements

### Requirement: Render Step Uses The HyperFrames Pipeline

The skill's render step MUST emit the HyperFrames project from the manifest and invoke the HyperFrames renderer. It MUST NOT bundle or install a React/Remotion runtime. The engine-provisioning step MUST ensure the pinned HyperFrames CLI rather than a Remotion engine. The engine CLI MUST expose `produce` as the single pipeline command and the primitives `compile`, `render` and `synthesize-avatar`; preview is `hyperframes preview`, and there is no native 9:16 render because every other format is derived from the master. The skill MUST NOT ship `render-vertical.mjs`, `assemble-video.mjs` or `finalize-video.mjs`.
(Previously: the CLI exposed only `compile`, `render` and `synthesize-avatar`, and a combined `produce` command was forbidden.)

Source: D3, D8, D6.

#### Scenario: Render uses HyperFrames

- GIVEN an approved script
- WHEN the skill's render step runs
- THEN it emits a HyperFrames project and renders it via the pinned HyperFrames CLI
- AND no Remotion bundle step runs

#### Scenario: Removed command is refused

- GIVEN the engine CLI
- WHEN it is run with `preview`
- THEN it exits non-zero printing a usage that lists `produce`, `compile`, `render` and `synthesize-avatar` and no `preview`

#### Scenario: Removed tools are gone

- GIVEN the skill's `scripts/` and SKILL.md
- WHEN they are inspected
- THEN none of `render-vertical.mjs`, `assemble-video.mjs` or `finalize-video.mjs` exists or is referenced

### Requirement: Domain Setup Documents The Gitignore Block

SKILL.md MUST instruct the agent, at domain setup, to add the managed gitignore block of capability `video-folder-contract` to the domain `.gitignore`.
(Previously: the section had to name `**/build/`, `**/draft_thumbs/` and `.cognnitive/cache/`.)

Source: D2.

#### Scenario: Setup step names the block

- GIVEN SKILL.md
- WHEN its domain setup section is read
- THEN it names every entry of the managed block of `video-folder-contract`, including `.cognnitive/cache/`

### Requirement: Skill Scripts Use The Scope-Anchored Series Root

The skill scripts `produce.mjs` and `render-thumbnail.mjs` MUST locate the series through `findSeriesRoot` of capability `video-folder-contract`, and the thumbnail tool MUST read the series title from the scope document.
(Previously: `build-script-from-draft.mjs` and `build-draft-html.mjs` were also listed and the script builder read the series title.)

Source: D9.

#### Scenario: Thumbnail reads the scope title

- GIVEN a series whose scope document declares `title:: Other Series` and no `series_NN.md`
- WHEN `render-thumbnail.mjs` runs without `--subtitle`
- THEN the subtitle is `Other Series`

#### Scenario: Engine surfaces a scope error

- GIVEN a series with a duplicate scope marker
- WHEN `produce` runs on an episode of that series
- THEN it fails naming `DUPLICATE_SCOPE_MARKER`

## REMOVED Requirements

### Requirement: Blueprint-Ships Draft Authoring Tools

(Reason: the `draft.json`/`reviewed.json` pipeline and the standalone console are replaced by the agent draft procedure delivering a proposed changeset and the registered Episode review view.)
(Migration: see "Draft Procedure Emits A Proposed Changeset" and video-console-views.)

### Requirement: Legacy Keys In Persisted State Are Rejected

(Reason: draft and reviewed JSON no longer exist; unknown and retired keys in any document are rejected by video-field-registry "Unknown And Retired Keys Are Rejected".)
(Migration: None.)

### Requirement: Workflow Is Estimate, Approve, Compile, Avatar, Render, Thumbnails, Finalize

(Reason: the manual sequence is replaced by `produce`.)
(Migration: see "Produce Is The Single Entry Command" and video-produce-command.)

### Requirement: Approval Uses One In-Chat Phrase

(Reason: cost is auto-approved under the cascaded `budget`; above it the budget gate asks for approval of the `plan_hash` (video-script-review "Budget Gate Is Independent Of The Review Gate").)
(Migration: None.)

### Requirement: Finalize Derives Formats In Place

(Reason: `produce` derives formats from `output_formats` and writes lifecycle fields through apply_change.)
(Migration: see cognnitive-video-engine "Delivery Formats Come From output_formats" and video-produce-command.)

### Requirement: Finalize Prints The Chapter Block

(Reason: `produce` computes the chapter block.)
(Migration: see video-publication-description "Produce Writes The Chapter Block".)
