---
level: 3
parent_spec:
  name: "backlog"
  url: ".agents/skills/nn-dev-backlog/blueprint/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Backlog"
---

# NN Idea

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

## NN Idea: Regenerate testlab console fixtures that still ship innfo-ui.css
captured:: 2026-10-31

## NN Idea: Remember a reuse import-guard decision so a later --scan stops re-flagging the same duplicate
captured:: 2026-11-12

## NN Idea: Near-duplicate guard for an incoming binary (needs a converted body before the guard runs; today only exact raw bytes match)
captured:: 2026-11-12

# NN Item

## NN Item: source-import-guards
value:: M
effort:: M
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in the source-import-guards PR: `guardIncomingSource` composes the duplicate and history guards and `scanner.js` runs it before any normalisation, asking reuse / adjust / from scratch; `--scan` reports the decision per flagged file and the interactive menu asks it. Covered by `skills/nn-sources/test/unit/test-import-guards.js`. The editor half of the original item is dead.
done_when:: The scanner runs the history and duplicate guards before normalising an incoming source and asks reuse, adjust or from scratch.
batch:: b3a-source-import-guards

## NN Item: metrics-scenario-compare
value:: M
effort:: M
risk:: L
status:: partial
lane:: light
verdict:: current
evidence:: Light slice shipped in PR #621: iNNfo/specs/bluepriNNts/metrics/assets/console-view-timeline.js derives one series per Scenario (its own horizon plus the rows its scenario-metrics Includes cells name, every row when the matrix does not cover the scenario), covered by test/console-timeline-view.test.mjs. Still open: side-by-side comparison cards, the all-variant CSV export, and the blueprint NOTE at iNNfo/specs/bluepriNNts/metrics/spec_NN.md:335 that still says "the artifact renders one neutral flow"; that wording needs a blueprint_version bump, which the Template Immutability Guard pairs with a canonical-sample rename and the hardcoded scripts/sync-samples.mjs mapping.
done_when:: Every Scenario of a metrics model renders as its own timeline series with that scenario's horizon and the rows its `scenario-metrics` cells include.
batch:: b3b-metrics-scenario-compare

## NN Item: markers-review
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: resolveKnowledgeModel picks the first match at iNNfo/specs/bluepriNNts/console/nn-runtime.js:2414-2422 and matrixCellDef matches by matrix name only at console/review.js:24-31; no apply-time value check at apply-change.ts:1085-1097.
batch:: b3c-markers-review

## NN Item: derived-artifacts-consolidation
value:: H
effort:: L
risk:: H
status:: partial
lane:: heavy
verdict:: current
evidence:: scripts/regen.js and scripts/lib/freshness-guards.js already give one regen entry, but committed derived files remain (console/nn-console.bundle.js, console-payload.generated.cjs, nn-address.generated.js, nn-slug.generated.js, iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js, five skills/*/scripts/lib/*.generated.cjs) with twelve roFresh steps at scripts/verify.js; a fifth generated skill file now lives inside the blueprint skill (iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/nn-core.generated.cjs). Re-check the pays-a-ripple premise before starting.
merged_from:: derived-artifact-consolidation, console-bundle-derived-on-release
batch:: b4a-derived-artifacts

## NN Item: query-language-unification
value:: M
effort:: L
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/packages/nn-core/src/queryUnits.ts:49 still says @ and ? are mutually exclusive; the console substring match at nn-runtime.js:504 and local parseFilterQuery diverge from the nn-core address query; the 2026-10-26 prefix-dialect design on the issue has not shipped.
ref:: issue-329
batch:: b4b-query-unification

## NN Item: workspace-manifest-section-ownership
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/packages/nn-core/src/workspace/reconcileManifest.ts:23-27,70-83 only locates the NN kNNowledge section; no code handles NN Sources, NN Procedures or NN Artifacts although iNNfo/specs/bluepriNNts/workspace/spec_NN.md:446-458 defines them. The tool is now sync_domain_manifest.
batch:: b4d-manifest-section-ownership

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

## NN Item: product-site-projection
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: No product-site blueprint exists under iNNfo/specs/bluepriNNts/ and no scripts/build-commercial-web.mjs; docs/index.html and docs/use-cases.html are hand written, docs/use-cases.html:1004-1058 still lists sources/nn paths.
ref:: issue-279
batch:: b4g-product-site

## NN Item: packages-to-root
value:: L
effort:: M
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/packages/nn-core and nn-mcp are still nested under iNNfo/ and no top-level packages/ exists; git grep -lF iNNfo/packages returned 116 files across code, docs and openspec on 2026-10-31 and 118 on 2026-11-01.
done_when:: Packages live at packages/, workspaces and every path reference are updated, and CI is green after a clean npm ci. Preconditions - no open session worktrees and re-measure git grep -lF iNNfo/packages first. Scope is bounded by openspec/decisions/keep-published-paths-frozen.md (iNNfo/specs, skills, manifest and docs do not move).
batch:: b9-packages-to-root

## NN Item: kb-change-governance
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: No RACI scope exists in iNNfo/packages/nn-core/src outside canonical-registry.ts; changesets carry author (changeset/hasher.ts:19) and only applied, partially_applied and conflict statuses, with no approve or request-changes artifact. The editor-on-save option is dead. Verified 2026-11-12.
done_when:: A changeset records who approved it or who requested changes, an approve and a request-changes artifact exist with their author, and a test covers both paths. Provisional criteria, confirm before briefing.
batch:: b5-kb-change-governance

## NN Item: contextual-docs-links
value:: L
effort:: M
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: No docs:: or canonical-doc field appears in skills/*/SKILL.md or manifest; the open decision between a public site link and a bundled page is unresolved, so the item cannot be briefed until it is decided. Verified 2026-11-12.
ref:: issue-355

## NN Item: video-vector-actor-catalog
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: The coNNtent blueprint's Layer type options are avatar, media, text and animation (coNNtent/spec_NN.md:282-285), so an actor layer type exists; what is missing is the actor catalog and rig (no assets/characters in the tree), and defaults/video-defaults_NN.md:21-23 still points at WaveSpeed (wavespeed-ai/z-image/turbo, wavespeed-ai/infinitetalk-fast). Re-checked 2026-11-07.
done_when:: The blueprint ships an actor catalog and rig under assets/characters, and defaults/video-defaults_NN.md stops pinning a vendor model id for the actor layer. Provisional criteria, confirm before briefing.
batch:: b5b-video-vector-actor-catalog

## NN Item: docs-skills-retirement
value:: L
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: docs/skills/ still tracks 17 files (templates/workflow, samples, js, setup) and iNNfo/validation-baseline.json:11 and scripts/verify.js:138,182 still reference it; no open Item covers the audit. Confirmed 2026-11-01.
done_when:: Every file under docs/skills/ is either migrated to its living home or retired with a recorded reason, the references in iNNfo/validation-baseline.json and scripts/verify.js are updated, and verify.js is green.
ref:: issue-430
batch:: b5c-docs-skills-retirement

## NN Item: coNNtent-procedures
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: The coNNtent blueprint ships a procedures/ folder containing only usage_procedures_NN.md (checked 2026-11-04): neither draft-scene-visuals nor produce-video exists, and openspec/specs/video-template/spec.md:75 requires generate_video_script_procedures_NN.md to reference the skill tools. The real draft-scene-visuals procedure lives only in the external workspace video_NN and as a test fixture under iNNfo/packages/nn-core/tests/fixtures/video-golden/procedures/, which has no media-collection gate.
done_when:: The coNNtent blueprint declares and ships a procedures/ folder with two generic procedures promoted from video_NN: draft-scene-visuals (cleaned of series, language, vendor and machine specifics, and carrying the pre-draft gate that clean screenshots and rendered HyperFrames clips must exist under assets/<slug>/media/ before the draft JSON or build-draft-html.mjs) and produce-video (a router that lists series through their scope documents and hands off to the procedure each series declares). select-news is not shipped here: it moves to the iNNbox_NN domain, which specializes in acquiring sources. A test asserts the folder is declared and every shipped procedure resolves, and the blueprint version is bumped and repinned. Open decisions before the change: procedure language, file naming against the video-template requirement, and whether the gate also becomes a hard check in build-draft-html.mjs.
batch:: b5d-conntent-procedures

## NN Item: cognitivize-archive-and-gc-decisions
value:: L
effort:: M
risk:: M
status:: open
lane:: light
verdict:: unverifiable
evidence:: planGc at iNNfo/packages/nn-core/src/writeOnce/plan.ts:27 has no archive rule; scripts/export-console.mjs:216 findModelFiles and skills/nn-sources/SKILL.md:43 conversations naming remain from the cognitivize-in-place follow-ups. Some smaller bullets were not individually verified, so the item is unverifiable as a whole and needs refinement before it can be briefed. Verified 2026-11-12.

## NN Item: console-shell-actions
value:: M
effort:: M
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in PR #624: TopBarActions keeps Save Snapshot and Copy AI Prompt inline and adds a narrow-width trigger plus a role=menu list that runs the same handlers (iNNfo/specs/bluepriNNts/console/ui-kit.js, CSS in the kit's own table), and nnUI.ChipEditor gives views a generic multi-value field (removable chips, datalist of declared options, onChange with the whole list). Covered by test/console-shell-actions.test.mjs.
done_when:: The header actions collapse behind one menu at narrow widths, and a generic chip/field editor component is available to views.
ref:: issue-490
batch:: b3d-console-shell-and-resolver

## NN Item: console-payload-size
value:: H
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: scripts/console-views.mjs:525 fixes warnBytes 5_000_000 and failBytes 15_000_000, and scripts/export-console.mjs:1672 throws CONSOLE_TOO_LARGE; the export now degrades first (scripts/export-console.mjs:1656) instead of aborting, so a domain above the threshold still writes. The payload is compacted but citation objects are still repeated per element. Verified 2026-11-04. Partly addressed by PR #567: compact serialization plus a degrade path that drops resolved citations and reports the strategy; the citation-table compaction (~21% on the reported domain) and a per-domain console.sizeBudget remain.
done_when:: The export degrades instead of aborting (compact payload or lazily loaded chunks), a domain above the current fail threshold still exports, and the size gate reports the chosen strategy.
ref:: issue-488
batch:: b3e-console-payload-size

## NN Item: remove-banned-l3-field
value:: H
effort:: M
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: The changes blueprint op list declares update_field, remove_element, rename_field and set_field_default but no remove_field (iNNfo/packages/nn-core/src/schema/canonical-registry.ts:30 lists the full op set), and update_field requires a non-null `to`, so a legacy L3 `sources::` can never be cleared. apply_change validates the whole model, so one banned field blocks every changeset touching that model. Issue 614 reports the same root from a production domain; the rest of that report is the cross-domain-export item. Verified 2026-11-12.
done_when:: A changeset can drop a field key from an element (a remove_field op, or an explicit removal value on update_field), the serializer then omits the key rather than emitting an empty line, and a model carrying a banned `sources::` can be repaired through the sanctioned changeset path alone.
ref:: issue-560
batch:: b6-remove-banned-l3-field

## NN Item: number-field-changeset
value:: M
effort:: M
risk:: M
status:: shipped
lane:: light
verdict:: obsolete
evidence:: Shipped in the number-field-changeset PR: `updateField` now coerces the incoming changeset string by the declared field type before validating it (iNNfo/packages/nn-core/src/mutate.ts), covered by mutate.spec.ts "update_field coerces by the declared field type (#558)".
done_when:: add_element plus update_field can create and set a `type:: number` field through propose_changeset and apply_change, with a test covering both a bare number and a quoted one, and no MUTATION_FAILED.
ref:: issue-558

## NN Item: episode-layout-drift
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: The coNNtent engine writes series/<s>/assets/<slug>/ while references/folder-contract.md declares series/<s>/episodes/<slug>/, and produce.modelIdOf only recognizes the assets/ parent (produce.mjs:101-107), so an episode outside assets/ yields a bare slug. Verified 2026-11-07.
done_when:: The blueprint's declared folder contract and the engine agree on one layout, the id derivation follows the contract wherever an episode lives, and a test covers an episode outside assets/.
ref:: issue-565
batch:: b4j-episode-layout-drift

## NN Item: procedure-reference-form
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: The shipped coNNtent procedures use wikilinks in reference fields (iNNfo/specs/bluepriNNts/coNNtent/procedures/usage_procedures_NN.md:29,35-36 in output::, parent:: and next::), validate_knowledge reports ADDRESS_MALFORMED for each, and the console stepper and iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/test/procedures.test.mjs parse [[...]], so moving the documents alone breaks them. Verified 2026-11-12.
done_when:: One accepted reference form exists for procedure documents: validate_knowledge accepts it, the console stepper, the procedure tests and the shipped coNNtent procedures all agree on it, and the usage document validates with zero errors.
ref:: issue-617
batch:: b3f-procedure-references

## NN Item: orphan-model-lineage-guard
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: lineageAudit is defined at iNNfo/packages/nn-core/src/changeset/lineage/plan.ts:41 and called nowhere in the tree, so a model or element written as a raw file and registered through sync_domain_manifest keeps element.history and provenance undefined and the console Changes tab renders "No recorded changes targeting this unit". Nothing on the write path rejects it. Verified 2026-11-12.
done_when:: Creating a model or element outside a changeset either fails the write or records an explicit audit entry, and a test covers the raw-file plus sync_domain_manifest path.
ref:: issue-587
batch:: b3g-orphan-model-guard

## NN Item: cross-domain-export
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/packages/nn-mcp/src/tools/propose-changeset.ts:467 still returns ARTIFACT_NOT_FOUND when a domain has no artifact registry, so an export cannot be recorded in lineage; iNNfo/packages/nn-core/src/parser/slug.ts rejects no dot, so a slug like pipelinepartners.co applies and then fails console regeneration and stays unaddressable; no export contract and no export-okf script exist. The sources:: half of the same report belongs to remove-banned-l3-field. Verified 2026-11-12.
done_when:: A dotted slug is rejected before apply, produce_artifact works in a domain without an artifact registry or fails with an actionable error naming the fix, an export can be recorded in lineage, and one documented export contract covers the cross-domain path.
ref:: issue-614
batch:: b4h-cross-domain-export

## NN Item: conntent-blueprint-gaps
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: The five production gaps in issue 612 are still open: no narration whitespace normalization before synthesis in iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent (only slug helpers normalize), a Preset does not satisfy the conditional field it declares, no Scene Kind or Preset contributes layers, animation inputs are unspecified, and review iteration has no path. Verified 2026-11-12.
done_when:: Narration whitespace is normalized before synthesis or flagged by the validator, a Preset value satisfies the conditional field it declares, a Scene Kind or Preset contributes layers, animation inputs are documented and validated, and a review iteration step exists; one test per fixed gap.
ref:: issue-612
batch:: b4i-conntent-blueprint-gaps

# NN Batch

## NN Batch: b3a-source-import-guards
order:: 2
lane:: light
items:: source-import-guards
risk:: L
state:: done

## NN Batch: b3b-metrics-scenario-compare
order:: 3
lane:: light
items:: metrics-scenario-compare
risk:: L
state:: in-progress

## NN Batch: b3c-markers-review
order:: 4
lane:: light
items:: markers-review
risk:: M
state:: planned

## NN Batch: b3d-console-shell-and-resolver
order:: 5
lane:: light
items:: console-shell-actions
risk:: M
state:: done

## NN Batch: b3e-console-payload-size
order:: 6
lane:: heavy
items:: console-payload-size
risk:: M
state:: planned

## NN Batch: b4a-derived-artifacts
order:: 7
lane:: heavy
items:: derived-artifacts-consolidation
risk:: H
state:: planned

## NN Batch: b4b-query-unification
order:: 8
lane:: heavy
items:: query-language-unification
risk:: H
state:: planned

## NN Batch: b4d-manifest-section-ownership
order:: 10
lane:: heavy
items:: workspace-manifest-section-ownership
risk:: M
state:: planned

## NN Batch: b4e-okf-export
order:: 11
lane:: heavy
items:: okf-export-projector
risk:: M
state:: planned

## NN Batch: b4g-product-site
order:: 12
lane:: heavy
items:: product-site-projection
risk:: M
state:: planned

## NN Batch: b4h-cross-domain-export
order:: 13
lane:: heavy
items:: cross-domain-export
risk:: M
state:: planned

## NN Batch: b4i-conntent-blueprint-gaps
order:: 14
lane:: heavy
items:: conntent-blueprint-gaps
risk:: M
state:: planned

## NN Batch: b4j-episode-layout-drift
order:: 15
lane:: heavy
items:: episode-layout-drift
risk:: M
state:: planned

## NN Batch: b3f-procedure-references
order:: 16
lane:: light
items:: procedure-reference-form
risk:: M
state:: planned

## NN Batch: b3g-orphan-model-guard
order:: 17
lane:: light
items:: orphan-model-lineage-guard
risk:: M
state:: planned

## NN Batch: b5-kb-change-governance
order:: 18
lane:: heavy
items:: kb-change-governance
risk:: M
state:: planned

## NN Batch: b5b-video-vector-actor-catalog
order:: 19
lane:: heavy
items:: video-vector-actor-catalog
risk:: M
state:: planned

## NN Batch: b5c-docs-skills-retirement
order:: 20
lane:: heavy
items:: docs-skills-retirement
risk:: M
state:: planned

## NN Batch: b5d-conntent-procedures
order:: 21
lane:: heavy
items:: coNNtent-procedures
risk:: M
state:: planned

## NN Batch: b6-remove-banned-l3-field
order:: 22
lane:: heavy
items:: remove-banned-l3-field
risk:: H
state:: planned

## NN Batch: b9-packages-to-root
order:: 23
lane:: heavy
items:: packages-to-root
risk:: H
state:: planned
