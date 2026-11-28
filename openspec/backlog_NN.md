---
level: 3
parent_spec:
  name: "backlog"
  url: ".agents/skills/nn-dev-backlog/blueprint/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Backlog"
---

# NN Idea

## NN Idea: coNNtent animation unification, T3 - move animation template code out of every episode into the domain library, so an episode holds data only (`asset:: component:<name>` plus `inputs::`) and ships no per-episode `kit.js`, `harness.js`, `gsap.min.js` or `score.wav`; templates are promotable to the blueprint later by an explicit act. Waits for a real episode to justify it. The engine side (validated `inputs::`, library components, input-driven review staleness) shipped with #612; tracker `odd/tasks/conntent-animation-unify.md` is closed, specs S4 and S5
captured:: 2026-11-19

## NN Idea: Product site generated from an iNNfo blueprint (deferred until the first real external user exists; building a marketing site for zero readers is maintenance without payoff)
captured:: 2026-11-16

## NN Idea: Changeset approval (approved_by, approve and request-changes artifacts) (deferred until a second person writes changesets; today the approver and the author are the same person, and an unread field would be a dead map)
captured:: 2026-11-16

## NN Idea: Archive and GC rules for writeOnce (only planGc has no archive rule at nn-core/src/writeOnce/plan.ts:27; the rest of the old item was never verified, so it was demoted rather than briefed)
captured:: 2026-11-16

## NN Idea: Merkle style incremental invalidation when a source sha256 changes
captured:: 2026-10-31

## NN Idea: Distributed or remote submodels with URL origins
captured:: 2026-10-31

## NN Idea: Workspace maturity lifecycle beyond draft active archived
captured:: 2026-10-31

## NN Idea: External discovery channels - OpenCode ecosystem listing, Docs7 mirror, OpenCode web onboarding hint
captured:: 2026-10-31

## NN Idea: innfo URI scheme and deep links (overlaps knowledge-unit-address, confirm the need first)
captured:: 2026-10-31

## NN Idea: Migrate local specializations onto canonical templates (deferred, conflicts with no-backwards-compat)
captured:: 2026-10-31

## NN Idea: OKF trustFor and stale_after fields (deferred, no consumer yet)
captured:: 2026-10-31

## NN Idea: Remember a reuse import-guard decision so a later --scan stops re-flagging the same duplicate
captured:: 2026-11-12

## NN Idea: Near-duplicate guard for an incoming binary (needs a converted body before the guard runs; today only exact raw bytes match)
captured:: 2026-11-12

## NN Idea: Procedures bluepriNNt guidance - tell the authoring agent not to set output_status a priori (the field is a free string and a shipped model had every step at verificado before any run)
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d22): avoid repeated full HTML renders in the export size degradation, but only after measuring heap and time on a near-100 MB domain; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D22
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d23): add a bounded retry on EPERM, EBUSY and EACCES to the atomic rename in writeConsole, modeled on persistAtomic in iNNfo/packages/nn-mcp/src/apply-change.ts (issue 188), and refuse the copy fallback; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D23
captured:: 2026-11-14

## NN Idea: Per-delegate token and cost metering for every phase that launches subagents (general mechanism, not a review feature) - each delegate reports its own input, output and cached tokens on completion, and the orchestrator aggregates them against a dated rate table so an estimate can be replaced by a measured figure. Wanted first by nn-dev-multimodel-review, whose preflight can only estimate, but the same gap exists in every SDD apply, backlog audit and analysis phase that fans out. Needs a decision on how a runtime that does not report usage is represented, and on where the ledger lives (per run, per session or per repo).
captured:: 2026-11-15

## NN Idea: Conditional field transitions (`requires`) - the deferred half of declared transitions (design §2.5). A Field Definition would declare `requires:: {"approved": "gate:script"}`, a condition an edge must satisfy. Deferred because, as specified in the 2026-11-21 review, it was unsatisfiable or wrong: the coNNtent script gate is per Scene element, not on the Video; the condition ignored the verdict (`approved | needs-change`), so a rejection satisfied it; the element hash covers every field including `status`, so a gated move rewrites the hash it was gated on; and the engine writes `approved` itself, so an autopilot domain with no gates would be blocked. Reopens only with a written subject rule (which elements, how they aggregate), the current affirmative verdict with supersession, a hash that excludes the gated field, and applicability bound to the gates configured for the model rather than merely declared by the bluepriNNt. Human-only approval stays where it is enforced today: `changeset/gates.ts` and the coNNtent gate resolver.
captured:: 2026-11-21

## NN Idea: A2UI (agent-to-UI) as host-side rendering of an edit descriptor - deferred by the 2026-11-27 four-provider review. It gets no role as a knowledge-unit definition format (the boundary is authority, not authorship), no renderer or live loop inside `nn-console.bundle.js` (offline, `file://`, zero network), and no catalog generated from `ui-kit.js` (the export block mixes constants, helpers and imperative DOM factories that take a `doc` and callbacks, `ui-kit.js:5276-5344`). It survives only as a rendering comparison over a plain JSON edit descriptor, in a named host that renders A2UI natively. This idea carries D4 step 2, D8, D10, D11 and D12 of that review. Reopens when a host exists, the descriptor round-trip has passed, and that host's own UI is demonstrably insufficient.
captured:: 2026-11-27

## NN Idea: Wrap the console's single-view export as an MCP App - `export-console.mjs --view <id>` already produces a self-contained HTML of one custom view, which is close to what MCP Apps wants (`ui://` resource, sandboxed iframe, JSON-RPC over `postMessage`). It would put a view like the coNNtent Pipeline inside Claude, ChatGPT or VS Code and remove the copy-paste of drafts to the agent. Deferred behind `openspec/changes/console-save-in-place` and the `import_console` requirement in `procedure-runner-ux`, which close the same loop with a file and no iframe. Also blocked by host support (Claude Code, Codex CLI and Gemini CLI do not render MCP Apps) and by reconciling the console's embedded CSP hashes with `_meta.ui.csp`. Reopens when those two changes have landed and the round trip still costs the person work.
captured:: 2026-11-27

## NN Idea: Draft intake validation and an actor stamp - `normalizeDraft` coerces an unknown `kind` to `comment` (`review.js:109`) and `initialDrafts` skips `addDraft` entirely (`review.js:244`); drafts carry no actor field, yet the same channel carries human-only kinds (`verdict`, `run_start`, `run_handoff`, `review.js:22`). Today the only producer is the console itself, so the exposure is theoretical. Deferred as high risk for the value it returns now: it becomes worth doing when a second producer exists (an agent-facing edit surface, or a second person writing changesets), and it must then answer whether a person may record a verdict through an agent channel and what user-activation evidence the server verifies.
captured:: 2026-11-27

## NN Idea: Version the draft record per kind and make draft ids collision-safe - the draft record already crosses a process boundary (the `_changes_NN.md` artifact, `import_console`, `initialDrafts`), but its tag and relation encodings are ad hoc and `nextDraftId` derives ids from the existing list. Deferred: with one producer and one writer there is nothing to collide with, and versioning a contract nobody else consumes is a dead map. Reopens with the first second producer, or with the first observed encoding collision.
captured:: 2026-11-27

# NN Item
## NN Item: okf-export-projector
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: No export-okf script, procedure or skill exists; iNNfo/packages/nn-core/src/parser/yaml.ts:193-202 has no type normalizer and validator/content.ts:443-457 only warns. Spec and code disagree on a root index.md (iNNfo_V_0-2-2_NN.md:690-711 against workspace.ts:331).
merged_from:: okf-type-frontmatter, okf-index-md, okf-version
batch:: b4e-okf-export

## NN Item: coNNtent-procedures
value:: M
effort:: M
risk:: M
status:: shipped
lane:: heavy
verdict:: obsolete
ref:: #807
evidence:: Shipped and archived 2026-11-28: the blueprint declares both ids (iNNfo/specs/bluepriNNts/coNNtent/spec_NN.md:22-25) and ships procedures/draft_scene_visuals_procedures_NN.md and procedures/produce_video_procedures_NN.md, and test/blueprint-procedures.test.mjs resolves the folder. PR #807 (merge f431b8a70) shipped both on V_0-31-0; the blueprint is now V_0-32-7. The residual smoke run stays unverified: nothing recorded here proves a real series ran end to end.
done_when:: The coNNtent blueprint declares and ships a procedures/ folder with two generic procedures promoted from video_NN: draft-scene-visuals (cleaned of series, language, vendor and machine specifics, and carrying the pre-draft gate that clean screenshots and rendered HyperFrames clips must exist under assets/<slug>/media/ before the draft JSON or build-draft-html.mjs) and produce-video (a router that lists series through their scope documents and hands off to the procedure each series declares). select-news is not shipped here: it moves to the iNNbox_NN domain, which specializes in acquiring sources. A test asserts the folder is declared and every shipped procedure resolves, and the blueprint version is bumped and repinned. Open decisions before the change: procedure language, file naming against the video-template requirement, and whether the gate also becomes a hard check in build-draft-html.mjs.
batch:: b5d-conntent-procedures

## NN Item: conntent-manifest-membership
value:: H
effort:: S
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD — waits for the blueprints-distribution decision. `coNNtent` is the only shipped blueprint absent from `manifest/source.yaml` (which lists domaiNN, changes, sidecar, sources, artifacts, procedures, executions and blank), while `catalog.json` already declares `embedded_skills: ["nn-conntent"]` and `skills-manager.js:1640` already infers the package. So the installer half exists and only the declaration is missing; today `update` and `status` never see coNNtent, which is how the 2026-11-25 episode ran against a stale embedded skill.
done_when:: coNNtent is declared with an explicit package marker, `status` reports it, and a test asserts the declaration matches `catalog.json`'s `embedded_skills`.
batch:: b6-on-hold-blueprints

## NN Item: blueprints-release-granularity
value:: H
effort:: M
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD — this is the decision the Grill session owns. One `blueprints-v*` tag ships 22 directories, so a coNNtent typo cuts a release that names the other 21. A per-blueprint key with content-sha pins was analysed as the alternative (openspec/analysis/2026-11-25-conntent-boundaries.md, P4) and carries a real cost: it fragments the one-number version story.
done_when:: the session records which shape wins, and the release table, the manifest renderer and `scripts/release/release-keys.js` agree with it.
batch:: b6-on-hold-blueprints

## NN Item: blueprint-mirror-freshness
value:: M
effort:: S
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD. `run-release.js` copies the release paths into a fresh clone of cogNNitive-web and `scripts/lib/publish-web-tree.js` `copyDistributionPath` removes the destination first, so the second tree is a mirror and not an edit surface. Nothing compares the two after a release; a post-release diff of `cogNNitive@tag` against `cogNNitive-web@tag` costs about 30 lines and catches a mirror that silently stopped updating.
done_when:: a post-release check diffs the mirrored paths and fails naming the first divergent file.
batch:: b6-on-hold-blueprints

## NN Item: blueprint-status-repair
value:: M
effort:: S
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD. `skills-manager.js:1875-1889` prints `outdated` for a blueprint in `state.blueprints` and no command to fix it, while the skills loop prints one. The line is easy; which command is correct depends on how a blueprint becomes a distributable unit.
done_when:: every `outdated` line in `status` is followed by the exact command that repairs it, and a test pins that pairing.
batch:: b6-on-hold-blueprints

## NN Item: workspace-frozen-blueprints-render
value:: M
effort:: S
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD. `manifest/source.yaml:86-90` declares `workspace` under `frozen_blueprints` and it is never rendered into the manifest: `assemble-manifest.js:323` iterates only `blueprints`. Whether a frozen entry belongs in the manifest at all is part of the same packaging decision.
done_when:: the manifest either carries every frozen blueprint or the concept is removed from `source.yaml` and from the assembler.
batch:: b6-on-hold-blueprints

## NN Item: blueprint-package-resolver
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD. Two orphan path constants: `catalog.mjs:20-28` points at `~/.agents/catalog/` and `compile.mjs:48-52` at `~/.agents/library/`, and no installer code creates either. The analysed fix is one resolver that fails loudly with both candidate paths, which depends on where a unit is installed.
done_when:: one function answers "the blueprint package directory", both call sites use it, and no `~/.agents/{catalog,library}` path remains outside the installer.
batch:: b6-on-hold-blueprints

## NN Item: component-html-single-source
value:: M
effort:: S
risk:: L
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD. Six component HTML files under `library/components/` are byte-identical to `slots/*.html` with no equality test, so one edit to either copy forks them silently. The fix (generate one from the other plus a byte-equality test) is mechanical; which side is the source belongs to the packaging decision.
done_when:: a test asserts byte equality for every component/slot pair, and one side is generated rather than edited.
batch:: b6-on-hold-blueprints

## NN Item: channel-drift-gate-shape
value:: M
effort:: S
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: ON HOLD. `scripts/release/channel-drift.js`, shipped blocking in #884, asserts that every released manifest entry still resolves to the commit it records. It passes vacuously today because the committed snapshot carries no released pin; if pins become per-unit content shas the gate has to be rewritten, so relaxing it to advisory now would be undone.
done_when:: the gate fails on a deliberately moved pin in a fixture, or the pin shape it reads is retired together with it.
batch:: b6-on-hold-blueprints

## NN Item: a2ui-d2-edit-projection
value:: H
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: `kuModalTarget` computes the whole edit projection (field definition, widget, options, precondition) but is trapped inside the console controller and guarded on `UI.EditModal` (`review.js:832-961`, guard at `review.js:835`). Every external edit option - the descriptor round-trip, an MCP App, A2UI - needs that projection as data, so it is the shared prerequisite. `connectionsFor` (`review.js:966-985`) is already a pure reduction a producer can precompute.
done_when:: one exported pure function turns `(schema, model, anchor)` into an edit descriptor for every target variant (field, matrix cell, relation retarget, `__name`, `__description`), the console modal consumes it instead of recomputing it, and a test pins one case per variant.

## NN Item: a2ui-d7-authority-boundary
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: The 2026-11-27 review restated the boundary: a knowledge unit's shape is owned by the bluepriNNt and validated through the schema (`fieldDefOf`, `review.js:56-71`), so the rule is authority, not authorship - a non-authoritative presentation of an edit form is allowed, an input to the model or its validator is not. Today that rule lives only in the review, where the next agent will not read it.
done_when:: the rule appears where an agent reads before proposing a change (the console/MCP contract or the `apply_change` documentation) and names the boundary in one sentence.

## NN Item: a2ui-d9-no-renderer-in-bundle
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: Static A2UI JSON can ride a payload slot: the exporter already embeds export-time view data (`collectViewData`, `console-views.mjs:539`) and JSON data islands sit outside the executable-script set the CSP hashes (`console-views.mjs:688`). What the bundle cannot take is a renderer and a live loop: no official renderer is a classic-script Preact+htm UMD, view scripts must compile as classic scripts (`console-views.mjs:486-497`), and a `file://` page has no agent for the return channel. The size argument against it is stale - the budget is 30 MB warn / 100 MB fail (`console-views.mjs:819`), not 5/15.
done_when:: the console invariants state that A2UI may arrive as inert JSON but never as a renderer or a live loop, and `npm run check:console-bundle` still passes.

## NN Item: step-request-interactive-input
value:: H
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: `openspec/changes/step-request/specs/executions/spec.md` already defines a Step Request as a record the runner consumes, with a declared lifecycle, a `seq` precondition and a queue (`procedure_pending`) that an agent drains. What it does not have is a request kind the runner presents as an interactive control, so a procedure that offers choices still asks the person to type a letter. The console already renders `select` and `multiselect` in `render-procedure-stepper.js:64-65` with real buttons (`:375`), so the capability exists and only the contract is missing. This entry extends the open `step-request` change; it must not become a parallel spec.
done_when:: `step-request` gains one request kind whose payload declares flat options, the console stepper renders it as a control instead of text, an agent can answer it over MCP, and the choice is recorded as that run's request outcome.
ref:: openspec/changes/step-request

# NN Batch
## NN Batch: b4e-okf-export
order:: 55
lane:: heavy
items:: okf-export-projector
risk:: M
state:: planned

## NN Batch: b5d-conntent-procedures
order:: 54
lane:: heavy
items:: coNNtent-procedures
risk:: M
state:: done


## NN Batch: b6-on-hold-blueprints
order:: 53
lane:: heavy
items:: conntent-manifest-membership, blueprints-release-granularity, blueprint-mirror-freshness, blueprint-status-repair, workspace-frozen-blueprints-render, blueprint-package-resolver, component-html-single-source, channel-drift-gate-shape
risk:: H
state:: planned
