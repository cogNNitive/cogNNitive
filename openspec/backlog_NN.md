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

## NN Idea: Citation table in the console payload (share one resolved citation per source instead of repeating it per element; ~21% on the reported domain, but 30/100 MB thresholds make the payload-format change a poor trade today)
captured:: 2026-11-12

## NN Idea: Procedures bluepriNNt guidance - tell the authoring agent not to set output_status a priori (the field is a free string and a shipped model had every step at verificado before any run)
captured:: 2026-11-14

## NN Idea: Port a domain-local console renderer test into the repo as a fixture-based test of iNNfo/specs/bluepriNNts/console/nn-console.bundle.js (markdown, code, unsafe HTML, clickable references); the local copy depends on the installed bundle under the user home
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d22): avoid repeated full HTML renders in the export size degradation, but only after measuring heap and time on a near-100 MB domain; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D22
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d23): add a bounded retry on EPERM, EBUSY and EACCES to the atomic rename in writeConsole, modeled on persistAtomic in iNNfo/packages/nn-mcp/src/apply-change.ts (issue 188), and refuse the copy fallback; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D23
captured:: 2026-11-14

## NN Idea: Console builder (console-builder-d24): add a closing-brace-then-slash division row to the findModuleSyntax scanner test table in test/console-views-lib.test.mjs; the scanner itself stays; see openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md decision D24
captured:: 2026-11-14

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
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in PR #621 (per-scenario series) and PR #622 (comparison cards, all-variant CSV, blueprint V_0-5-3): iNNfo/specs/bluepriNNts/metrics/assets/console-view-timeline.js derives one series per Scenario with its own horizon and the rows its scenario-metrics Includes cells name, cards compare variants, and one button exports every variant to a single CSV. Covered by test/console-timeline-view.test.mjs; the V_0-1-0 scope note now describes what ships.
done_when:: Every Scenario of a metrics model renders as its own timeline series with that scenario's horizon and the rows its `scenario-metrics` cells include, and the variants can be compared and exported together.
batch:: b3b-metrics-scenario-compare

## NN Item: markers-review
value:: M
effort:: M
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in PR #623: resolveKnowledgeModel refuses a name two models answer to instead of returning the first match (iNNfo/specs/bluepriNNts/console/nn-runtime.js), matrixCellDef breaks a same-named matrix tie by the cell target concept (console/review.js), and updateMatrixCell rejects a value the blueprint does not declare (iNNfo/packages/nn-core/src/mutate.ts). Covered by test/console-marker-resolution.test.mjs and the 4.2 block of nn-core tests/mutate.test.ts.
done_when:: A review marker resolves to the model and matrix the author named (an ambiguous name resolves to nothing), and apply_change refuses a matrix cell value the blueprint does not declare.
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
status:: shipped
lane:: heavy
verdict:: current
evidence:: Shipped in PR #625 with the delta spec openspec/changes/archive/2026-11-12-console-size-budget: a domain declares console_size_budget_warn/fail in the domaiNN_NN.md frontmatter (validated, reported when unusable), scripts/console-views.mjs resolveSizeBudget + evaluateSizeBudget report the thresholds and the strategy actually applied, and the export degrades in a fixed order (strip resolved citations, then per-element provenance/history) before CONSOLE_TOO_LARGE. Covered by scripts/console-size-budget.test.mjs. The citation-table compaction was dropped on purpose: thresholds moved 5/15 MB to 30/100 MB in PR #567, so a ~21% payload win no longer pays for a payload-format change.
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

## NN Item: console-builder-d01-csp-hash
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/console-views.mjs:524 rewrites only the first script-src match and the pattern is unanchored, so it also matches the script-src prefix of script-src-elem; :523 returns the page unchanged when no hashes can be added; :500 CSP_META needs http-equiv before content with double quotes. A policy with no script-src is left as is with no diagnostic. Shells come from INNFO_CONSOLE_DIR, the repo, the script folder or ~/.agents/console (scripts/export-console.mjs:91-97), never from a domain. Creating script-src must copy the default-src sources or it narrows the policy; throw only when hashes.size > 0 because test/console-views-lib.test.mjs:628-631 pins the no-op. The lane is borderline: CSP is not literally one of the four heavy triggers, so confirm with the maintainer. Audited 2026-11-14 at main 551d5a18.
done_when:: allowInlineScripts on a policy with no script-src, with script-src-elem before script-src, and with single-quoted or reordered meta attributes either adds the hashes to the effective directive or throws, while the shipped-shell output stays byte-identical.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D1
batch:: b10a-console-builder-csp-hash

## NN Item: console-builder-d02-scaffold-input
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:2219-2222 joins an unvalidated blueprint into iNNfo/specs/bluepriNNts/<blueprint>/assets, and :2241, :2264, :2272 and :2282 interpolate the title inside single quotes while :2238, :2262 and :2279 put it in block comments. The base-name guard already exists in scripts/console-views.mjs:45 (viewRootCandidates). path.join does not reset on an absolute segment, so a dot-dot segment is the only escape and the blast radius is one generated file. SPEC_BASE_RE (console-views.mjs:33) is not exported, so reuse needs an export; test/console-view-scaffold.test.mjs:61 pins the title Resumen de Programas, so escape in place instead of switching quote style. Audited 2026-11-14 at main 551d5a18.
done_when:: --blueprint ../x is rejected with a usage error and writes nothing, and --title "O'Brien */" yields a view that compiles and registers the literal title.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D2
batch:: b10b-console-builder-cli-input

## NN Item: console-builder-d03-delivery-guard-scope
value:: M
effort:: S
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1893-1894 sets isDelivery with the literal view === conntent-delivery and the strip of cost, budget, ledger and prompt fields is at :1900-1933; a second literal is at iNNfo/packages/nn-core/src/console/output-path.ts:57. No test mentions image_prompt or negative_prompt outside the pattern at :1906. The only real producer (delivery.mjs:225-235) also passes stagingDir and an outFile under deliveries/v1, so renaming the view would not leak there; it leaks only for callers passing just the view, so the leak is latent. Drive the strip from scope (delivery, stagingDir, outFile): a new delivery true field on registered views would be a public view-contract change and would make the lane heavy. isDelivery also drives the output path (:1955-1968) and the immutability checks. Audited 2026-11-14 at main 551d5a18.
done_when:: A writeConsole call with a delivery scope, or one named by a view other than conntent-delivery, drops cost, budget, ledger and prompt fields, pinned by a new test.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D3
batch:: b10c-console-builder-delivery-guard

## NN Item: console-builder-d04-staging-immutability-check
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1988 tests isDelivery, finalAbsPath and existsSync(finalAbsPath) and ends with && !stagingDir, while :2089 has the same test without !stagingDir (both from commit 14e57b40; verified again 2026-11-14). The late abort has no side effects because writeFileAtomic has not run, and the only production caller pre-checks (delivery.mjs:196). Which side to change is a design choice: dropping !stagingDir at :1988 fails early, while adding it at :2089 allows staged-over-existing and moves the failure to renameSync (delivery.mjs:274). This is not a security item. Sequence with console-builder-d12-writeconsole-contract, which edits the :2089 return. Audited 2026-11-14 at main 551d5a18.
done_when:: A staged delivery export onto an existing final file either fails before the expensive work or succeeds and leaves the final file untouched, pinned by a regression test.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D4
batch:: b10c-console-builder-delivery-guard

## NN Item: console-builder-d05-stale-asset-fingerprint
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:466-474 inspectDomainConsole compares only bundle and shell mtimes and its only call is the --status print at :2387; --stale selects through inspectModelStatus (:2431), which looks at no assets, so a view-only or CSS-only edit is skipped. A per-view sha256 already exists in the page header comment (scripts/console-views.mjs:425-431) as an alternative source. Adding a meta field regenerates every console once and is additive. Land console-builder-d13-asset-candidates first, which simplifies the CSS and bundle path discovery. Audited 2026-11-14 at main 551d5a18.
done_when:: After editing a view script or nn-ui.css with all models fresh, --stale re-exports instead of printing All models are fresh.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D5
batch:: b10f-console-builder-identity-freshness

## NN Item: console-builder-d06-model-identity-path
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1582 sets filePath to the file name (the basename) and the readers at :432, :442 and :486 match on filePath equal to the file name or the relative path with find or some, so duplicate basenames match the first entry; found by reading, no reproduction was run. Consumers: iNNfo/specs/bluepriNNts/console/nn-runtime.js:964, :975, :1169 and :1230-1237, and versionsOf feeding the MCP regenerate_console (console-regeneration.ts:31 and :130, keyed by id, not filePath). The modelFile and location of elements also use the basename (:1511-1514). Tests pin the basename at test/export-console.test.mjs:235 and :383, console-export.test.mjs:708, :754 and :802, and console-s3b-parity.test.mjs:309. No migration: readers accept both forms and consoles are regenerable; it is still a persisted-value change with a tolerant reader, so the lane is a judgment call. Audited 2026-11-14 at main 551d5a18.
done_when:: Two models with the same filename in different folders, exported and then checked, both show fresh and --stale re-exports neither.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D6
batch:: b10f-console-builder-identity-freshness

## NN Item: console-builder-d07-scan-read-errors
value:: M
effort:: S
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:255-260 walk() in findModelFiles has a bare catch that returns, :377 and :411 swallow the same way, and :934-948 swallows in collectWorkspaceFiles; the reference pattern is listEntries in scripts/console-views.mjs:68-76. The backlog item cognitivize-archive-and-gc-decisions cites findModelFiles at a stale line (:216, now :242) and its concern is GC and archive rules, so the overlap is partial and the two stay separate. Rethrow in collectWorkspaceFiles is caught at :1845 and drops files with a warning, while rethrow in findModelFiles aborts the export, so decide which behavior is wanted. The review decision omitted findModelFiles, which is the actual reference of the gpt-luna finding. Audited 2026-11-14 at main 551d5a18.
done_when:: A directory with EACCES makes the export fail with the directory path while ENOENT and ENOTDIR still yield empty.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D7
batch:: b10d-console-builder-scan-errors

## NN Item: console-builder-d08-output-capture
value:: L
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:2480-2503 replaces console.log, console.error, console.warn and the stdout and stderr write of process, while the JSDoc at :2475-2478 and the archived spec openspec/changes/archive/2026-10-19-simplify-change-workflow/specs/console-export-cli/spec.md:7 say it must not mutate globals. Only tests call runExportConsole; the MCP calls writeConsole directly (iNNfo/packages/nn-mcp/src/console-regeneration.ts:103-107), so concurrent use is not a demonstrated scenario and the priority is lower than the review proposed. A log collector does not cover about 14 process.stderr.write sites and about 40 console sites. It conflicts with D7, D9 and D17 on the same functions, so land it alone and last. Audited 2026-11-14 at main 551d5a18.
done_when:: Two overlapping runExportConsole calls each receive only their own output, and console.log is identical before and after.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D8
batch:: b10h-console-builder-output-capture

## NN Item: console-builder-d09-unknown-flag
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:227-231 gives --filter no guard against a value starting with two dashes and :232-236 falls through to args.root or args.model with no unknown-flag branch; a typo such as --no-opne becomes the root or a substring model match (:2415-2420). Related gap: --new-view, --template, --blueprint and --title silently ignore a missing value (:208-219) and a bare --new-view runs a full export. Only --no-open, --domain and --view appear in docs and scripts, so tightening is low risk. Audited 2026-11-14 at main 551d5a18.
done_when:: --no-opne and --filter --no-open exit 2 with usage.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D9
batch:: b10b-console-builder-cli-input

## NN Item: console-builder-d10-preview-utf8
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1122-1133 reads min(size, 500, budget) bytes and decodes them as utf8, so a multibyte preview comes out shorter than 500 characters and a split sequence ends in a replacement glyph. The review overstated it as affecting every truncated non-ASCII preview: the shortfall is always present but mild, and the glyph appears only when the cut splits a sequence. The existing test (test/console-export-files.test.mjs:244) checks only length <= 500. Audited 2026-11-14 at main 551d5a18.
done_when:: A preview of 600 two-byte characters is capped at 500 characters with no trailing replacement glyph.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D10
batch:: b10e-console-builder-files-section

## NN Item: console-builder-d11-citation-basename
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1086-1092 matches citations with basename(c.norm) === basename(rel), and the changes loop at :1100-1106 has the identical defect, which the review omitted. Only one assertion touches it (test/console-export-files.test.mjs:130). It does not depend on console-builder-d06-model-identity-path. Prefer the exact normalized path, then the longest matching suffix, then the basename only when unambiguous. Audited 2026-11-14 at main 551d5a18.
done_when:: Two same-named files in different folders get citation counts only from their own paths, and bare-basename citations still count when unambiguous, in both the inventory and the changes loop.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D11
batch:: b10e-console-builder-files-section

## NN Item: console-builder-d12-writeconsole-contract
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: The JSDoc at scripts/export-console.mjs:1225 lists breakdown and summary, but the returns at :1989-1996, :2090-2097 and :2162-2169 carry neither; breakdown is only logged (:2075) and summary exists nowhere. The MCP type ConsoleWriterResult.status allows only written or unchanged (iNNfo/packages/nn-mcp/src/console-regeneration.ts:30), so the error status return already violates it. Land after console-builder-d04-staging-immutability-check, which edits the :2089 return. Audited 2026-11-14 at main 551d5a18.
done_when:: The JSDoc and every return path of writeConsole agree, pinned by one test.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D12
batch:: b10c-console-builder-delivery-guard

## NN Item: console-builder-d13-asset-candidates
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:137 lists nn-console.bundle.js twice and :1323 lists nn-ui.css twice, both left by the breaking nn- rename (commit e68fb7d6); verified again 2026-11-14. Related remnants the review did not name: artifact_blueprint.html (:52) and the nn-or-innfo prefix pattern at :1296. Do not restore the legacy innfo- names. Audited 2026-11-14 at main 551d5a18.
done_when:: The candidate lists are single paths and the existing asset tests pass.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D13
batch:: b10f-console-builder-identity-freshness

## NN Item: console-builder-d14-scope-key-order
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:496-498 takes the key prefix from the name of the first selected model and hashes the sorted relative paths, while loadModels sorts by the raw OS-separator path at :781; on Windows that order and the slash-normalized order at :497 can differ, so the CLI does not fully hide the dependence. Audited 2026-11-14 at main 551d5a18.
done_when:: scopeKeyOf returns the same key for any permutation of selected.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D14
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d15-spec-name-parser
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/console-views.mjs:36-39 parses the spec version suffix with a case-sensitive pattern and no trim, while scripts/export-console.mjs:327-332 uses a case-insensitive pattern with trim and lowercase; coreBlueprintOf feeds only the core-catalog allowlist (:348). Keep each call site's naming and validation rules. Audited 2026-11-14 at main 551d5a18.
done_when:: One helper serves both call sites, with a case and whitespace test per caller.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D15
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d16-code-unit-compare
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:435 sorts meta.generated and :1881 sorts path with localeCompare, and :781 holds a third inline code-unit comparison; compareCodeUnits in scripts/console-views.mjs:65 is not exported, so sharing needs an export. Both strings are fixed-format ASCII, so the impact is theoretical. Audited 2026-11-14 at main 551d5a18.
done_when:: Both sorts use code-unit comparison and no localeCompare is left in the two files.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D16
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d17-rendertree-branches
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:526-551 has two near-duplicate loops in renderTree; the dot branch prints no directory line and uses no childIndent, so childIndent must be empty for that case. Tests at test/export-console.test.mjs:360 and :1002 cover --tree. Audited 2026-11-14 at main 551d5a18.
done_when:: --tree output is byte-identical before and after.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D17
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d18-view-id-discovery
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/console-views.mjs:138 scans raw text with a lazy registerView pattern, so a commented-out or quoted registerView with id ghost yields a view and the lazy match can reach a later block's id; the runtime rule is at iNNfo/specs/bluepriNNts/console/nn-runtime.js:3537-3541 and the code is hashed twice (:135 and :147). Keep the extra view entries: the rejected decision D25 depends on them (they serve the cross-file duplicate check, the audit header and --view selection). Audited 2026-11-14 at main 551d5a18.
done_when:: A commented-out or quoted registerView with id ghost and an unrelated object with an id yield no extra view, and ids that are neither the slug nor slug- prefixed are ignored.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D18
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d19-changeset-counts
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1563-1578 runs a reduce and filter over all changesets inside the per-model loop, and :1575 is the set-like indexOf, so a model whose title and stem lower to the same string is counted once. Aggregate by modelPart into a Map and walk a model's keys through a Set. Audited 2026-11-14 at main 551d5a18.
done_when:: Per-model changeCount is identical before and after, including a model whose title equals its stem.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D19
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d20-data-theme-guard
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:2006-2008 guards with html.includes of data-theme=, and the shipped iNNfo/specs/bluepriNNts/console/nn-ui.css contains 12 data-theme dark selectors (counted 2026-11-14) and is inlined before the check, so the block is unreachable with shipped assets. The shell's own html tag carries data-theme light at line 2 but not the literal being replaced. Deleting the block is the simplest option. Audited 2026-11-14 at main 551d5a18.
done_when:: The block is deleted and buildHtml output is byte-identical for the shipped shell.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D20
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d21-shell-csp-hash-test
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/console/artifact_shell.html has no executable inline script: only four JSON islands (nn-config, nn-schema, nn-model, nn-view-data) and three external scripts (counted 2026-11-14). The four hand-written hashes in its CSP (line 10, added by commit a54a9656) match nothing in the shell or in test/fixtures/testlab/domaiNN_console.html according to the audit, which hashed the shell's inline scripts. The review deferred this as unverified; it is now verified. Deleting the tokens changes a shipped release asset, so add the test first. Audited 2026-11-14 at main 551d5a18.
done_when:: A test asserts that every sha256 token in the shell CSP matches an inline script in the shell, or the four tokens are removed.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D21
batch:: b10g-console-builder-hygiene

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
state:: done

## NN Batch: b3c-markers-review
order:: 4
lane:: light
items:: markers-review
risk:: M
state:: done

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
state:: done

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

## NN Batch: b10a-console-builder-csp-hash
order:: 24
lane:: light
items:: console-builder-d01-csp-hash
risk:: M
state:: planned

## NN Batch: b10b-console-builder-cli-input
order:: 25
lane:: light
items:: console-builder-d02-scaffold-input, console-builder-d09-unknown-flag
risk:: L
state:: planned

## NN Batch: b10c-console-builder-delivery-guard
order:: 26
lane:: light
items:: console-builder-d03-delivery-guard-scope, console-builder-d04-staging-immutability-check, console-builder-d12-writeconsole-contract
risk:: M
state:: planned

## NN Batch: b10d-console-builder-scan-errors
order:: 27
lane:: light
items:: console-builder-d07-scan-read-errors
risk:: M
state:: planned

## NN Batch: b10e-console-builder-files-section
order:: 28
lane:: light
items:: console-builder-d10-preview-utf8, console-builder-d11-citation-basename
risk:: L
state:: planned

## NN Batch: b10f-console-builder-identity-freshness
order:: 29
lane:: light
items:: console-builder-d13-asset-candidates, console-builder-d06-model-identity-path, console-builder-d05-stale-asset-fingerprint
risk:: M
state:: planned

## NN Batch: b10g-console-builder-hygiene
order:: 30
lane:: light
items:: console-builder-d14-scope-key-order, console-builder-d15-spec-name-parser, console-builder-d16-code-unit-compare, console-builder-d17-rendertree-branches, console-builder-d18-view-id-discovery, console-builder-d19-changeset-counts, console-builder-d20-data-theme-guard, console-builder-d21-shell-csp-hash-test
risk:: L
state:: planned

## NN Batch: b10h-console-builder-output-capture
order:: 31
lane:: light
items:: console-builder-d08-output-capture
risk:: M
state:: planned
