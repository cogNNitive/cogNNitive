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

## NN Idea: Console review view for video scripts (premise stale after the HyperFrames move)
captured:: 2026-10-31

## NN Idea: OKF trustFor and stale_after fields (deferred, no consumer yet)
captured:: 2026-10-31

## NN Idea: Surface EDITED_WITHOUT_RECORD in validate_knowledge, not only in the console export
captured:: 2026-10-31

## NN Idea: Fix the canonical-vocabulary spec scenario that still points at the retired backlog identifier-migration item
captured:: 2026-10-31

## NN Idea: Regenerate testlab console fixtures that still ship innfo-ui.css
captured:: 2026-10-31

# NN Item

## NN Item: close-issue-278
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: Issue 278 target trees (docs/innfo, docs/skills, docs/use/reviewer-guide.md) were cleaned or deleted in e4d66781; remaining innfo- hits are legitimate (docs/documentation/content/vocabulary.md:155-164 table, skills/nn-skills-lifecycle/scripts/skills-manager.js:857 cleanup shim).
done_when:: Issue 278 is closed through nn-dev-issue-tracking with a comment citing this evidence.
ref:: issue-278
batch:: b0-bookkeeping

## NN Item: adr-keep-published-paths-frozen
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/specs, skills, manifest and docs are all still in place and addressed by path from outside the tree (manifest/source.yaml, docs/CNAME).
done_when:: The decision to keep iNNfo/specs, skills, manifest and docs paths frozen is recorded as a decision note linked from packages-to-root.
batch:: b0-bookkeeping

## NN Item: okf-docs-claim-cleanup
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: docs/index.html:1771 claims OKF compatibility; openspec/specs/documentation-template/spec.md:61 points at an ecosystem.md anchor that no longer exists. The published iNNfo_V_0-2-2_NN.md:699-711 claim is write-once and must not be edited.
done_when:: docs/index.html no longer states OKF compatibility unqualified and the documentation-template spec no longer references the missing anchor.
batch:: b1-light-cleanup

## NN Item: retired-terms-inventory
value:: M
effort:: M
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: test/no-retired-references.test.mjs:119-131 DISTRIBUTION_ALLOWLIST exempts docs/, .agents/, README.md and THIRD_PARTY.md wholesale; migration shims remain at scripts/lib/mcp-config-adapter.js:80,142 and skills-commands.js:116-130. The innfo- prefix rename itself already shipped (archived 2026-10-21 and 2026-10-25 changes).
merged_from:: legacy-terminology-sweep, issue-278-allowlist
done_when:: A written inventory of non-runtime surfaces naming retired vocabulary exists and the allowlist is narrowed to the entries that are intentionally exempt.
batch:: b1-light-cleanup

## NN Item: repair-perf-workspace-kb
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/perf-workspace-kb.mjs:190,194 call the retired MCP tools check_workspace and validate_model, which iNNfo/packages/nn-mcp/src/server.spec.ts:171-190 asserts are absent; the script is not wired into package.json.
done_when:: The harness runs against check_domain and validate_knowledge, prints timings, and the measured limits are recorded.
batch:: b1-light-cleanup

## NN Item: repair-or-retire-simulation
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: test/simulation/lib/core.mjs:27 loads iNNfo/packages/innfo-core/dist/index.js but only nn-core and nn-mcp exist; the header still describes the old moduleResolution failure.
done_when:: Either the simulation runs against nn-core or it is deleted together with its FINDINGS references.
batch:: b1-light-cleanup

## NN Item: sample-media-fields
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: No type:: audio or video field exists under test/_samples_nn; only the video-script blueprint declares one, and test/console-s3b-parity.test.mjs:52-58,230-235 covers video with an inline fixture.
done_when:: The console sample declares an audio, a video and a file field and the exported console renders them.
batch:: b1-light-cleanup

## NN Item: sources-blueprint-drift
value:: M
effort:: S
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/sources/spec_NN.md:65,81,89,113-114,119 and visual-catalog/spec_NN.md:123,292 plus visual-catalog/procedures/ingest_visual_catalog_procedures_NN.md:174 name sources/original/ and sources/nn/, retired per openspec/specs/workspace-directory-conventions/spec.md:5 and docs/documentation/content/vocabulary.md:133.
merged_from:: skills-blueprints-hygiene-sources-drift, cognitivize-in-place-spec-rename
done_when:: sources, visual-catalog and its procedure no longer name retired folders, with blueprint_version bumped and canonical-registry.ts and catalog.json regenerated.
batch:: b2-published-blueprints

## NN Item: blueprint-guidance-gaps
value:: L
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/business-model/spec_NN.md:294,300 define Contributions and Compensations only as Concept Definitions with no guidance sections; analysis has no Validation section; validator rule at iNNfo/packages/nn-core/src/validator/knowledge-checks.ts:260.
done_when:: business-model, analysis and projects carry the missing Summary, Description, Methodologies and Prompts sections and the validator reports no PARENT_CONCEPT_GUIDANCE_INCOMPLETE for them.
ref:: issue-228
batch:: b2-published-blueprints

## NN Item: changes-rename-cascade-docs
value:: L
effort:: S
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/changes/spec_NN.md:40,150 list rename_element but never explain the cascade or the slug freeze; a cheaper home exists at docs/documentation/content/reference/mcp-tools.md:24.
done_when:: The rename_element cascade and slug freeze are documented in one place.
ref:: issue-244
batch:: b2-published-blueprints

## NN Item: element-order-field
value:: L
effort:: S
risk:: L
status:: open
lane:: heavy
verdict:: current
evidence:: No order field exists outside iNNfo/specs/bluepriNNts/documentation/spec_NN.md:89,126, and CHANGE_OPS in iNNfo/packages/nn-core/src/changeset/types.ts:7-20 has no reorder op. Decision 2026-10-31: model order as a number field named order moved with update_field; the reorder changeset op is the rejected alternative and a console drag and drop writes order through update_field.
merged_from:: issue-222, console-element-reorder
done_when:: The blueprints where ordering matters declare order as a number field and the recipe for reordering by update_field is documented.
ref:: issue-222
batch:: b2-published-blueprints

## NN Item: business-guided-completion
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/business/procedures/ contains only usage_procedures_NN.md with no gates or methodology links; the blueprint is at V_0-5-1.
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
evidence:: scripts/regen.js and scripts/lib/freshness-guards.js already give one regen entry, but committed derived files remain (console/nn-console.bundle.js, console-payload.generated.cjs, nn-address.generated.js, nn-slug.generated.js, iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js, five skills/*/scripts/lib/*.generated.cjs) with about ten roFresh steps at scripts/verify.js:577-632. Re-check the pays-a-ripple premise before starting.
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
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/packages/nn-mcp/src/tools/apply-change.ts:1229-1246 returns rejected for the whole file when schema validation fails on any touched model, and parse or blueprint-resolution failures reject the whole file too (:405-423).
batch:: b4c-changeset-skip

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

## NN Item: attested-computation
value:: M
effort:: L
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: NN Executions is defined (openspec/specs/workspace-executions-provenance/spec.md:5-20) but no executor, attester or Attested field exists anywhere under iNNfo/.
batch:: b4f-attested-computation

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
evidence:: iNNfo/packages/nn-core and nn-mcp are still nested under iNNfo/ and no top-level packages/ exists; git grep -lF iNNfo/packages returned 116 files across code, docs and openspec on 2026-10-31.
done_when:: Packages live at packages/, workspaces and every path reference are updated, and CI is green after a clean npm ci. Preconditions - no open session worktrees and re-measure git grep -lF iNNfo/packages first.
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
evidence:: The video-script blueprint has no actor layer type, video-defaults_NN.md:21-22 still points at WaveSpeed, and the assets/characters rig does not exist in the tree.

## NN Item: cognitivize-archive-and-gc-decisions
value:: L
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: planGc at iNNfo/packages/nn-core/src/writeOnce/plan.ts:27 has no archive rule; scripts/export-console.mjs:216 findModelFiles and skills/nn-sources/SKILL.md:43 conversations naming remain from the cognitivize-in-place follow-ups. Some smaller bullets were not individually verified.

# NN Batch

## NN Batch: b0-bookkeeping
order:: 1
lane:: light
items:: close-issue-278, adr-keep-published-paths-frozen
risk:: L
state:: planned

## NN Batch: b1-light-cleanup
order:: 2
lane:: light
items:: okf-docs-claim-cleanup, retired-terms-inventory, repair-perf-workspace-kb, repair-or-retire-simulation, sample-media-fields
risk:: L
state:: planned

## NN Batch: b2-published-blueprints
order:: 3
lane:: heavy
items:: sources-blueprint-drift, blueprint-guidance-gaps, changes-rename-cascade-docs, element-order-field, business-guided-completion
risk:: M
state:: planned

## NN Batch: b3a-source-import-guards
order:: 4
lane:: light
items:: source-import-guards
risk:: L
state:: planned

## NN Batch: b3b-metrics-scenario-compare
order:: 5
lane:: light
items:: metrics-scenario-compare
risk:: L
state:: planned

## NN Batch: b3c-markers-review
order:: 6
lane:: light
items:: markers-review
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

## NN Batch: b4c-changeset-skip
order:: 9
lane:: heavy
items:: changeset-per-change-skip
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

## NN Batch: b4f-attested-computation
order:: 12
lane:: heavy
items:: attested-computation
risk:: M
state:: planned

## NN Batch: b4g-product-site
order:: 13
lane:: heavy
items:: product-site-projection
risk:: M
state:: planned

## NN Batch: b9-packages-to-root
order:: 14
lane:: heavy
items:: packages-to-root
risk:: H
state:: planned
