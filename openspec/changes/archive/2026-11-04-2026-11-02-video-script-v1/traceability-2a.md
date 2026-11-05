# Traceability: delta requirements → V_0-15-0 artifacts (Slice 2a)

Generated from the 138 requirements of the 20 delta specs in this change folder.
`2a` = the requirement lands in `iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md` (or its package defaults);
`partial` = the requirement needs a spec surface (a Field, Concept or description) **and** code in a later slice;
`no` = the requirement is satisfied by code, console or docs and must not add spec surface.

| Ownership | Requirements |
|---|---|
| `2a` (spec text) | 22 |
| `partial` (spec surface + code) | 19 |
| `no` (code / console / docs) | 97 |
| **Total** | **138** |

## Review procedure

1. Read only the `2a` and `partial` rows below: they are what the spec PR must satisfy.
2. For each, open the named spec section and check the Field/Concept exists with the stated options.
3. Rows marked `no` are out of scope for 2a; if the spec grows surface for one, that is a defect.
4. Run `node scripts/verify.js` and `node scripts/check-openspec-deltas.mjs`.

## video-blueprint (9)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Blueprint Is V_0-15-0 And Episodes Pin It | ADDED | yes | spec: frontmatter `blueprint_version` + both catalogs | verify.js: immutability, catalog parity |
| Blueprint Text Describes The Declared Master | ADDED | yes | spec: Field Definition `master` and `position` descriptions | verify.js: field catalogue |
| Blueprint Ships The Catalog, Scene Kind, Chrome And Variant Concepts | ADDED | yes | spec: six Concept Definitions + `## NN index` | verify.js: metaschema self-describe |
| Native L2 Video-Script Blueprint | MODIFIED | yes | spec: Concept list and `## NN index` | verify.js: field catalogue |
| Conditional Fields Are Keyed By Layer Type | MODIFIED | yes | spec: frontmatter `validation.conditional_fields` | verify.js: field catalogue |
| Blueprint Declares master_resolution With One Option | REMOVED | no | — retired (see Field catalogue) | test: guard-hardening |
| Blueprint Text Describes A Single Square Master | REMOVED | no | — retired (master text) | verify.js: field catalogue |
| Blueprint Version Bump And Catalog Parity | REMOVED | no | — superseded by the V_0-15-0 bump | verify.js: catalog parity |
| This Change Bumps The Blueprint To Its Own Version | REMOVED | no | — superseded | verify.js: immutability |

## video-script-model (12)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Layer Types Are Four Behaviours | ADDED | yes | spec: Field Definition `type` (+ `placement`, `timing`, `style`, `source`) | verify.js: field catalogue |
| Scene Owns Variants And A Review Verdict | ADDED | yes | spec: Concept Definition `Variant`; Fields `for`, `review` | verify.js: metaschema |
| Universal Parameter Cascade | MODIFIED | partial | spec: Concept Guidance (cascade); defaults doc. Code: lib/cascade (4) | test: cascade (4) |
| Video Defaults Concept | MODIFIED | yes | spec: Concept Definition `Video Defaults`; defaults/video-defaults_NN.md | verify.js: field catalogue |
| Series Concept | MODIFIED | yes | spec: Concept Definition `Series` | verify.js: metaschema |
| Shared Field Definitions | MODIFIED | yes | spec: the ~20 modified + 13 added Field Definitions | verify.js: field catalogue |
| Field Naming Convention | MODIFIED | yes | spec: every Field Definition name | verify.js: field catalogue |
| Cascade Parameters Are Settable Where Meaningful | MODIFIED | yes | spec: `concept::` lists on each Field Definition | verify.js: field catalogue |
| The Video Concept Carries The Episode Record | MODIFIED | yes | spec: Fields `status`, `published_url`, `script`, `master`, `thumbnail`, `description` | verify.js: field catalogue |
| Retired Field Names Are Rejected | MODIFIED | yes | spec: Field catalogue carries none of the retired names | test: guard-hardening |
| Master And Position Descriptions Describe The Declared Master | MODIFIED | yes | spec: `master` and `position` descriptions | verify.js: field catalogue |
| Master Resolution Is A Declared Video Default | REMOVED | no | — retired (output_formats replaces it) | test: guard-hardening |

## video-scene-kinds (8)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Series Declares Scene Kinds | SPEC | yes | spec: Concept Definition `Scene Kind` | verify.js: metaschema |
| Every Scene States Its Kind | SPEC | yes | spec: Field Definition `kind` (Scene) | verify.js: field catalogue |
| Kind Rules Are Enforced | SPEC | no | code: lib/kinds (4) | test: kinds (4) |
| Fixed Scenes Are Inserted By The Engine | SPEC | no | code: lib/kinds (4) | test: kinds (4) |
| Series Structure Is Orientative | SPEC | partial | spec: Concept Guidance `Scene Kind`. Code: lib/kinds (4) | test: kinds (4) |
| Libre Inherits No Kind Rules | SPEC | partial | spec: Field `kind` options + Scene Kind guidance. Code: lib/cascade (4) | test: cascade (4) |
| Series Chrome Is Declared Once And Applied Per Kind | SPEC | yes | spec: Concept Definition `Chrome` + Scene Kind `chrome` | verify.js: metaschema |
| Language Is A Cascade Field | SPEC | partial | spec: Field Definition `language` (no default). Code: lib/cascade (4) | test: cascade (4) |

## video-presets (4)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Preset Is A Parameters-Only Concept | MODIFIED | yes | spec: Concept Guidance `Preset` + `concept::` lists | verify.js: field catalogue |
| The `presets` Field And Its Syntax | MODIFIED | yes | spec: Field Definition `presets` (Scene Kind added) | verify.js: field catalogue |
| Per-Level Additive Expansion Order | MODIFIED | no | code: lib/cascade (4) | test: cascade (4) |
| Console Draft Tool Offers One Preset Selector | REMOVED | no | — retired (Episode review view, 8) | test: view (8) |

## video-model-catalog (7)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Blueprint Ships A Dated Reference Catalog | SPEC | yes | spec: Concepts `Provider`, `Model`, `Voice`; catalog/model-catalog_NN.md | verify.js: metaschema, catalog sample |
| The DomaiNN Overlay Allowlists Models And Overrides Prices | SPEC | partial | spec: Model `allowed`, `price_source`. Code: lib/catalog (3a) | test: catalog (3a) |
| One Merged Catalog Feeds Every Consumer | SPEC | no | code: lib/catalog (3a) | test: catalog (3a) |
| Unpriced Allowed Models Block, Unknown Models Fail | SPEC | no | code: lib/catalog, plan (3b) | test: catalog (3b) |
| Stale Prices Warn And Never Block | SPEC | partial | spec: Model `price_date`, `stale_after_days`. Code: lib/catalog (3b) | test: catalog (3b) |
| Intent Adapters Translate Intent Fields | SPEC | no | code: scripts/adapters (3a) | test: adapters (3a) |
| infinitetalk Is An Active Allowed Avatar Model | SPEC | no | catalog/model-catalog_NN.md (3a) | test: catalog (3a) |

## video-script-review (7)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Variants Are Model Elements | SPEC | partial | spec: Concept `Variant`, Field `for`. Code: lib/episode (7a) | test: produce (7a) |
| Review Decisions Are Per Scene | SPEC | partial | spec: Field `review`. Code: lib/episode (7a); view (8) | test: produce (7a) |
| Decisions Are Persisted As Changesets, Never View-Only | SPEC | no | code: lib/changes (7a); view (8) | test: produce (7a) |
| Approval Requires Every Scene Approved | SPEC | no | code: lib/episode (7a) | test: produce (7a) |
| Review Gate Is A Cascade Field | SPEC | partial | spec: Field `script_review`. Code: lib/episode (7a) | test: produce (7a) |
| Budget Gate Is Independent Of The Review Gate | SPEC | partial | spec: Field `budget` (no default). Code: lib/plan (7a) | test: produce (7a) |
| A Needs-Change Scene Is Regenerated Alone | SPEC | no | code: lib/episode (7a) | test: produce (7a) |

## video-episode-lifecycle (6)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Episode States And Setters | SPEC | yes | spec: Field Definition `status` options | verify.js: field catalogue |
| An Idea Holds Only Its Seed | SPEC | no | code: lib/episode (7b) | test: lifecycle (7b) |
| Transitions Are Checked | SPEC | no | code: lib/episode (7b) | test: lifecycle (7b) |
| Episodes Pin The Blueprint Version | SPEC | partial | spec: Concept Guidance `Video`. Code: produce refusal (7a) | test: produce (7a) |
| The Series Index Is Computed | SPEC | no | code: console-view-series.data.mjs (9) | test: view (9) |
| Old Episodes Stay An Archive | SPEC | no | docs: SKILL.md (10) | test: skill docs (10) |

## video-series-folders (2)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Series Scope Document Declares Kinds And Chrome | ADDED | partial | spec: Concept Guidance `Series` (kinds + chrome). Code: lib/cascade (4) | test: cascade (4) |
| Series, Domain And Episode Extension Folders | MODIFIED | no | code: lib/cascade lookup (4); docs (10) | test: cascade (4) |

## video-production-hierarchy (2)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Four-Level Hierarchy | MODIFIED | partial | spec: Concept Guidance `Series`/`Video`. Code: lib/cascade (4) | test: cascade (4) |
| Series Is A Folder Anchored By Its Scope Document | MODIFIED | no | code: lib/cascade (4) | test: cascade (4) |

## video-publication-description (3)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Produce Writes The Chapter Block | ADDED | no | code: lib/description (10) | test: description (10) |
| description.md Is A Platform-Neutral Episode File | MODIFIED | partial | spec: Field Definition `description`. Code: lib/description (10) | test: description (10) |
| Finalize Prints The Chapter Block | REMOVED | no | — retired (produce, 10) | test: description (10) |

## video-folder-contract (11)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| One Master Per Episode | ADDED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Duplicate Cleanup Deletes Only Cached Bytes | ADDED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Three-Level Asset Scoping | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Ephemeral Engine Directories Are Not Artifacts | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Canonical Domain, Series And Episode Layout | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Naming Scheme By File Class | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Deliverables Are Written In Place | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Managed Gitignore Block | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Authored And Engine-Generated Files Are Distinct | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Series Root Is Anchored On Scope Documents | MODIFIED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |
| Engine Output Lives Only Under build/ | REMOVED | no | contract: code + references (5/7a/10) | test: folder contract (5/7a) |

## cognnitive-video-engine (24)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Allowed Models Must Be Priced | ADDED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Image Cache Key Follows The Cascaded Model | ADDED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Image Size Is A Cascade Field And Cache Input | ADDED | partial | spec: Field `image_size`; Model `sizes`. Code: 5 | test: stage (5) |
| Master Size Comes From output_formats | ADDED | partial | spec: Field `output_formats`. Code: compile (5) | test: stage (5) |
| Delivery Formats Come From output_formats | ADDED | partial | spec: Field `output_formats`. Code: render-formats (5) | test: stage (5) |
| Assets Are Linked, Not Copied | ADDED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Engine Project Lives In The Episode Folder | ADDED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Render Is Hermetic | ADDED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Headless Video Rendering CLI | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Interactive Provider Consultation and Cost Estimation | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| In-Dir and Out-of-Dir Asset Resolution | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Spend Guard Is Gate-Only | MODIFIED | partial | spec: Fields `budget`, `daily_budget`. Code: lib/plan (3b) | test: catalog (3b) |
| Voice Parameters Resolve Through The Cascade | MODIFIED | partial | spec: Fields `voice*`. Code: lib/cascade (4) | test: cascade (4) |
| Derivation Guards Its Input And Its Outputs | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Blur Fill Is Opt-In And Suffixed | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Render Compiles Every Time And Writes The Master In Place | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Render Refuses Missing Avatar Clips | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Cache Identity Is Layout-Independent | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Cache Identity Location And Domain Root Are Unchanged | MODIFIED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Plan Boilerplate Is Truthful | REMOVED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Cache Identity Image Options Never Gain Size | REMOVED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Engine Output Is Written Only Under build/ | REMOVED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Voice Tone Is Authoring Guidance Only | REMOVED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |
| Single Square Master Declared By master_resolution | REMOVED | no | code: skill scripts | slice tests (0a/3b/4/5/6/7a) |

## video-field-registry (5)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| The Registry Is Generated From Field Definitions | SPEC | no | code: build-field-registry + consumers (2b) | registry --check (2b) |
| Registry Freshness Is A Gate | SPEC | no | code: build-field-registry + consumers (2b) | registry --check (2b) |
| No Hand-Copied Parameter Lists | SPEC | no | code: build-field-registry + consumers (2b) | registry --check (2b) |
| Unknown And Retired Keys Are Rejected | SPEC | no | code: build-field-registry + consumers (2b) | registry --check (2b) |
| Every Field Is Read And Every Read Is Defined | SPEC | no | code: build-field-registry + consumers (2b) | registry --check (2b) |

## video-produce-command (8)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| One Command Sequences The Whole Pipeline | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| Intake Applies The Proposed Changeset | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| Produce Stops Only At Two Points | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| Fail Before Spend | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| Produce Is Resumable And Cache-Aware | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| The Engine Owns Lifecycle Writes | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| Produce Refuses Episodes It Cannot Produce | SPEC | no | code: produce state machine (7a) | test: produce (7a) |
| Produce Reports Real Cost And Timings | SPEC | no | code: produce state machine (7a) | test: produce (7a) |

## video-run-facts (6)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Facts Are Machine-Local Files Under .cognnitive/video | SPEC | no | code: lib/facts (3b/6) | test: facts (3b/6) |
| Spend Ledger Row Schema | SPEC | no | code: lib/facts (3b/6) | test: facts (3b/6) |
| Real Cost Per Episode Is Derivable | SPEC | no | code: lib/facts (3b/6) | test: facts (3b/6) |
| Prices Are Part Of The Plan Hash | SPEC | no | code: lib/facts (3b/6) | test: facts (3b/6) |
| Stage Timing Row Schema | SPEC | no | code: lib/facts (3b/6) | test: facts (3b/6) |
| A Timing Write Failure Does Not Stop A Run | SPEC | no | code: lib/facts (3b/6) | test: facts (3b/6) |

## video-console-views (5)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Views Are Registered, Not Standalone | SPEC | no | code: blueprint assets views (8/9) | test: view (8/9) |
| Episode Review View | SPEC | no | code: blueprint assets views (8/9) | test: view (8/9) |
| Series View | SPEC | no | code: blueprint assets views (8/9) | test: view (8/9) |
| No Control Without Effect | SPEC | no | code: blueprint assets views (8/9) | test: view (8/9) |
| Views Stay Within The Registry Budget | SPEC | no | code: blueprint assets views (8/9) | test: view (8/9) |

## console-view-registry (3)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| View Data Collection Hook | ADDED | no | code: console seam (8) | test: console (8) |
| View Data Is Read-Only Input | ADDED | no | code: console seam (8) | test: console (8) |
| Shared mount context | MODIFIED | no | code: console seam (8) | test: console (8) |

## console-export-cli (1)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| CLI Delegates to the Shared Builder and Fails Loudly | MODIFIED | no | code: scripts/export-console.mjs (8) | test: exporter (8) |

## video-script-skill (13)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Draft Procedure Emits A Proposed Changeset | ADDED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Produce Is The Single Entry Command | ADDED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Retired V_0 Tooling Is Absent | ADDED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Skill Reaches nn-core And The Apply Engine Through A Mirror | ADDED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Render Step Uses The HyperFrames Pipeline | MODIFIED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Domain Setup Documents The Gitignore Block | MODIFIED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Skill Scripts Use The Scope-Anchored Series Root | MODIFIED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Blueprint-Ships Draft Authoring Tools | REMOVED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Legacy Keys In Persisted State Are Rejected | REMOVED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Workflow Is Estimate, Approve, Compile, Avatar, Render, Thumbnails, Finalize | REMOVED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Approval Uses One In-Chat Phrase | REMOVED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Finalize Derives Formats In Place | REMOVED | no | docs: SKILL.md + procedures (10) | test: skill docs (10) |
| Finalize Prints The Chapter Block | REMOVED | no | — retired (produce, 10) | test: description (10) |

## video-template (2)

| Requirement | Type | 2a | Target artifact | Verified by |
|---|---|---|---|---|
| Video Generation Procedure Migration | MODIFIED | no | docs: generate_video_script_NN.md (10) | test: procedure (10) |
| Interactive Provider Consultation and Cost Gate | MODIFIED | no | docs: generate_video_script_NN.md (10) | test: procedure (10) |

