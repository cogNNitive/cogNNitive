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

## NN Idea: Surface EDITED_WITHOUT_RECORD in validate_knowledge, not only in the console export
captured:: 2026-10-31

## NN Idea: Fix the canonical-vocabulary spec scenario that still points at the retired backlog identifier-migration item
captured:: 2026-10-31

## NN Idea: Regenerate testlab console fixtures that still ship innfo-ui.css
captured:: 2026-10-31

## NN Idea: Fix the documentation-template living spec line that references the missing ecosystem.md OKF anchor (via a change)
captured:: 2026-10-31

# NN Item

## NN Item: sample-media-fields
value:: L
effort:: S
risk:: L
status:: retired
lane:: heavy
verdict:: obsolete
evidence:: Retired 2026-11-05 after checking the blueprint instead of the title. coNNtent already models audio where it matters: `background_audio::` and `background_audio_volume::` on Scene and Preset with the parameter cascade (spec_NN.md:231,239-247), the per-series music bed, and the TTS fields (`voice`, `voice_model`, `rate`, `delivery`) that the blueprint documents as the synthesized-audio cache identity. The episode audio itself is muxed into `master::`. An `audio::` field on Video would be a second source of truth for data already carried by master and the TTS cache, and would invite drift. The item was really about console coverage of `type:: audio`, which is a test, not a schema change.
done_when:: A sample under test/_samples_nn declares type:: audio, type:: video and type:: file fields, and test/console-s3b-parity.test.mjs asserts the exported console renders audio and video from that sample instead of an inline fixture. If console sources change, rebuild the bundle and regenerate the testlab fixture as nn-dev-development 2d requires.
batch:: b2-published-blueprints

## NN Item: console-audio-render-coverage
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped 2026-11-05. test/console-s3b-parity.test.mjs now declares a `type:: audio` field in its fixture blueprint and asserts the exported console renders it as `audio.nn-field-media` with a rebased relative src, and never as a video element. Before this the console's audio branch (ui-kit.js renderFieldMedia) had no end-to-end coverage; a schema change was never needed.
done_when:: The console parity fixture declares a `type:: audio` field and asserts the exported console renders an audio element for it.
batch:: b2-published-blueprints


## NN Item: sources-blueprint-drift
value:: M
effort:: S
risk:: M
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in the bp-batch-1 session (2026-11-05). sources, visual-catalog and its procedure no longer name sources/original/ or sources/nn/: raw assets live in sources/import/ and the normalized text lives in the co-located sidecar. sources went V_0-3-2 -> V_0-3-3, visual-catalog V_0-3-3 -> V_0-3-4, and regen.js refreshed canonical-registry.ts and catalog.json.
merged_from:: skills-blueprints-hygiene-sources-drift, cognitivize-in-place-spec-rename
done_when:: sources, visual-catalog and its procedure no longer name retired folders, with blueprint_version bumped and canonical-registry.ts and catalog.json regenerated.
batch:: b2-published-blueprints

## NN Item: blueprint-guidance-gaps
value:: L
effort:: M
risk:: M
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in the bp-batch-1 session (2026-11-05). analysis, business-model and projects now carry Summary, Description, Methodologies and Prompts for every concept (Validation, Contributions, Compensations and Procedure had no section at all). A local audit over all blueprints reports them complete; the remaining gaps (artifacts, blank, changes, documentation, domaiNN, sidecar, sources) are outside this item.
done_when:: business-model, analysis and projects carry the missing Summary, Description, Methodologies and Prompts sections and the validator reports no PARENT_CONCEPT_GUIDANCE_INCOMPLETE for them.
ref:: issue-228
batch:: b2-published-blueprints

## NN Item: changes-rename-cascade-docs
value:: L
effort:: S
risk:: M
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in the bp-batch-1 session (2026-11-05). The changes blueprint documents the cascade in one place: the display name changes, the slug is immutable, and taxonomy labels, matrix row/column labels, wikilinks, declared reference/knowledge fields and relationships[].target are rewritten in the same atomic apply. changes went V_0-8-0 -> V_0-8-1.
done_when:: The rename_element cascade and slug freeze are documented in one place.
ref:: issue-244
batch:: b2-published-blueprints

## NN Item: element-order-field
value:: L
effort:: S
risk:: L
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in the bp-batch-1 session (2026-11-05). Only projects declares a sequence concept (Phases), so it gained an order number field and the reorder recipe (one update_field per changed phase in the same changeset) in its Phases guidance. coNNtent stays excluded. projects went V_0-4-2 -> V_0-4-3.
merged_from:: issue-222, console-element-reorder
done_when:: The blueprints where ordering matters declare order as a number field and the recipe for reordering by update_field is documented. The coNNtent blueprint is excluded: its spec_NN.md:293,399 forbid an order:: field and order Scenes by the # NN index list. The issue text names docs/innfo/documentation/manual-editing-risks.md, which no longer exists (the docs/innfo tree was dropped), so the recipe needs a new home.
ref:: issue-222
batch:: b2-published-blueprints

## NN Item: business-guided-completion
value:: M
effort:: M
risk:: M
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in the b2-finish session (2026-11-05). business/procedures/model_a_business_procedures_NN.md walks the model from segments to numbers with four hard gates (exchange closed, analysis validated, phases ordered, domain validation clean) and links each step to the guidance that explains it. The usage procedure stays the entry point.
done_when:: business/procedures/ ships at least one procedure with explicit gates that link to the guidance of the concepts it walks, alongside usage_procedures_NN.md.
batch:: b2-published-blueprints

## NN Item: source-import-guards
value:: M
effort:: M
risk:: L
status:: partial
lane:: light
verdict:: current
evidence:: skills/nn-sources/scripts/lib/duplicate-guards.js:87,122 provide detectDuplicates and searchConversationHistory but only tests call them (skills/nn-sources/test/unit/test-duplicate-guards.js); no scanner or procedure wires them and no reuse, adjust or scratch prompt exists. The editor half of the original item is dead.
done_when:: The scanner runs the history and duplicate guards before normalising an incoming source and asks reuse, adjust or from scratch.
batch:: b3a-source-import-guards

## NN Item: metrics-scenario-compare
value:: M
effort:: M
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/metrics/assets/console-view-timeline.js:43,77-91 uses Scenario only for the horizon; there is no variant series, comparison cards or all-variant CSV.
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
evidence:: scripts/regen.js and scripts/lib/freshness-guards.js already give one regen entry, but committed derived files remain (console/nn-console.bundle.js, console-payload.generated.cjs, nn-address.generated.js, nn-slug.generated.js, iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js, five skills/*/scripts/lib/*.generated.cjs) with eleven roFresh steps at scripts/verify.js:577-632; a fifth generated skill file now lives inside the blueprint skill (iNNfo/specs/bluepriNNts/coNNtent/skills/nn-conntent/scripts/lib/nn-core.generated.cjs). Re-check the pays-a-ripple premise before starting.
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

## NN Item: changeset-per-change-skip
value:: M
effort:: M
risk:: H
status:: retired
lane:: heavy
verdict:: obsolete
evidence:: Retired 2026-11-05 by openspec/decisions/changeset-all-or-none.md: the all-or-none rejection is the contract every consumer relies on (the proposal_sha seal, the group unit in nn-update, retryability). Precondition conflicts already take the partial path (apply-change.ts:2150). A future need would be an explicit allow_partial opt-in, never a silent default. The original symptom (a 613-operation backfill blocked by six unaddressable elements) was fixed at its root by issue 491.
batch:: b4c-changeset-contract

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
evidence:: No RACI scope exists in iNNfo/packages/nn-core/src outside canonical-registry.ts; changesets carry author (changeset/hasher.ts:19) and only applied, partially_applied and conflict statuses, with no approve or request-changes artifact. The editor-on-save option is dead.

## NN Item: contextual-docs-links
value:: L
effort:: M
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: No docs:: or canonical-doc field appears in skills/*/SKILL.md or manifest; the open decision between a public site link and a bundled page is unresolved.
ref:: issue-355

## NN Item: video-vector-actor-catalog
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: The coNNtent blueprint has no actor layer type, defaults/video-defaults_NN.md:22-23 still points at WaveSpeed (wavespeed-ai/z-image/turbo, wavespeed-ai/infinitetalk-fast), the Layer types at coNNtent/spec_NN.md:182 are presenter, background, b-roll, title, lower-third, caption, brand, quote, watermark and animation (a HyperFrames project directory, the likely carrier for an actor), and the assets/characters rig does not exist in the tree. Re-checked 2026-11-01 after the presets and folder-contract releases: unchanged.

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

## NN Item: coNNtent-procedures
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: The coNNtent blueprint ships a procedures/ folder containing only usage_procedures_NN.md (checked 2026-11-04): neither draft-scene-visuals nor produce-video exists, and openspec/specs/video-template/spec.md:75 requires generate_video_script_procedures_NN.md to reference the skill tools. The real draft-scene-visuals procedure lives only in the external workspace video_NN and as a test fixture under iNNfo/packages/nn-core/tests/fixtures/video-golden/procedures/, which has no media-collection gate.
done_when:: The coNNtent blueprint declares and ships a procedures/ folder with two generic procedures promoted from video_NN: draft-scene-visuals (cleaned of series, language, vendor and machine specifics, and carrying the pre-draft gate that clean screenshots and rendered HyperFrames clips must exist under assets/<slug>/media/ before the draft JSON or build-draft-html.mjs) and produce-video (a router that lists series through their scope documents and hands off to the procedure each series declares). select-news is not shipped here: it moves to the iNNbox_NN domain, which specializes in acquiring sources. A test asserts the folder is declared and every shipped procedure resolves, and the blueprint version is bumped and repinned. Open decisions before the change: procedure language, file naming against the video-template requirement, and whether the gate also becomes a hard check in build-draft-html.mjs.
ref:: issue-429

## NN Item: cognitivize-archive-and-gc-decisions
value:: L
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: planGc at iNNfo/packages/nn-core/src/writeOnce/plan.ts:27 has no archive rule; scripts/export-console.mjs:216 findModelFiles and skills/nn-sources/SKILL.md:43 conversations naming remain from the cognitivize-in-place follow-ups. Some smaller bullets were not individually verified.

## NN Item: provenance-ban-l1-wide-repin
value:: M
effort:: L
risk:: M
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in the l1-repin session (2026-11-05). Every canonical blueprint now pins iNNfo V_0-6-0 or later (16 repinned from V_0-5-0 and version-bumped; workspace's legacy template_version went V_0-10-0 -> V_0-11-0). The sample and procedure pins followed at both sites, and checkProvenanceBan no longer returns early on the L1 floor: the ban is version-independent as A14 specifies. Raised a spike first: all 19 blueprints validated identically after the repin, so no schema migrated. The remaining `sources::` occurrences are frozen published L1 specs (iNNfo_V_0-1-0..V_0-2-2) and test fixtures that no gate validates; the live corpus is green.
done_when:: Every published blueprint pins a V_0-6-0-or-later L1, the V_0-6-0 gate in checkProvenanceBan is removed so the ban is version-independent as A14 specifies, and node scripts/verify.js is green.
ref:: lineage-as-changes
batch:: b2b-l1-wide-repin

## NN Item: extract-container-less
value:: H
effort:: S
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in the changeset-contract session. extractInstanceProblems no longer demands a `/` in `to`; it accepts `<slug>` and `<container>/<slug>` and rejects only a malformed id. Covered by iNNfo/packages/nn-core/tests/changeset-address.test.ts.
done_when:: extract_instance accepts a one-segment instance id when the target concept declares no container, with a test covering the container-less path.
ref:: issue-542
batch:: b4c-changeset-contract

## NN Item: changeset-address-ampersand
value:: M
effort:: S
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in the changeset-contract session. The field is now the LAST `&` segment in conflicts.ts, impact.ts (update_field and update_concept_field), change-args.ts and mutate.ts, so an element name containing `&` resolves; the update_field shape error names the expected keys and the add_element alternative. Covered by iNNfo/packages/nn-core/tests/changeset-address.test.ts.
done_when:: An element title containing `&` or `@` can be targeted by update_field through both apply_change and propose_changeset, and the update_field shape error names the expected keys.
ref:: issue-491
batch:: b4c-changeset-contract

## NN Item: console-local-parent-spec
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/packages/nn-core/src/console/schema-resolution.ts:80,88 uses parent_spec.url only for a canonical lookup (findCanonicalBlueprint); no branch resolves it as a workspace-relative path, so a Level-3 model pointing at `specs/<name>_NN.md` exports with a derived schema. Verified 2026-11-04.
done_when:: A model whose parent_spec.url is a workspace-relative path exports the console with that blueprint's schema and views, covered by a test under test/.
ref:: issue-487
batch:: b3d-console-shell-and-resolver

## NN Item: console-shell-actions
value:: M
effort:: M
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/console/ui-kit.js:3417-3469 renders "Save Snapshot" and "Copy AI Prompt" as always-visible inline buttons in the navbar group; there is no collapse menu, and views still have no generic chip/field editor component. Verified 2026-11-04.
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
evidence:: scripts/console-views.mjs:525 fixes warnBytes 5_000_000 and failBytes 15_000_000, and scripts/export-console.mjs:1302 throws CONSOLE_TOO_LARGE before the first write; the payload is one pretty-printed JSON array, so a valid domain above 15 MB exports nothing at all. Verified 2026-11-04.
done_when:: The export degrades instead of aborting (compact payload or lazily loaded chunks), a domain above the current fail threshold still exports, and the size gate reports the chosen strategy.
ref:: issue-488
batch:: b3e-console-payload-size

# NN Batch

## NN Batch: b2-published-blueprints
order:: 1
lane:: heavy
items:: sample-media-fields, console-audio-render-coverage
risk:: M
state:: done

## NN Batch: b3a-source-import-guards
order:: 2
lane:: light
items:: source-import-guards
risk:: L
state:: planned

## NN Batch: b3b-metrics-scenario-compare
order:: 3
lane:: light
items:: metrics-scenario-compare
risk:: L
state:: planned

## NN Batch: b3c-markers-review
order:: 4
lane:: light
items:: markers-review
risk:: M
state:: planned

## NN Batch: b3d-console-shell-and-resolver
order:: 5
lane:: light
items:: console-local-parent-spec, console-shell-actions
risk:: M
state:: planned

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

## NN Batch: b4c-changeset-contract
order:: 9
lane:: heavy
items:: changeset-per-change-skip
risk:: H
state:: done

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

## NN Batch: b9-packages-to-root
order:: 13
lane:: heavy
items:: packages-to-root
risk:: H
state:: planned

## NN Batch: b2b-l1-wide-repin
order:: 14
lane:: heavy
items:: provenance-ban-l1-wide-repin
risk:: M
state:: done
