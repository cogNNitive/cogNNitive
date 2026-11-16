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
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/packages/nn-core/src/mutate.ts:935 removes fields and rawFields for empty string; iNNfo/packages/nn-mcp/test/apply-change.test.ts:402,429 covers clear and wrong-from conflict. Cross-review-sol C2 repairs a banned sources field through sealed apply. The missing-operation premise is obsolete; remaining work is precise guidance and a banned-field regression. Verified against 8a2958b8df4bd4e20363c37bf2feba7dd0bdffdc; private issue-560 recovery remains unverified.
done_when:: Document update_field with to empty string (not null/undefined); a sealed serialized round-trip removes banned sources, preserves unrelated fields, validates and records the applied change; wrong from conflicts without writes. Add only a banned-field regression missing from existing generic clear tests; do not add remove_field or close issue-560 without checking its remaining incident.
ref:: issue-560
batch:: b6-remove-banned-l3-field
merged_from:: improvement-plan P04, R3-reduced; missing-remove_field premise superseded

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
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in the b10a CSP-hash PR. `allowInlineScripts` (scripts/console-views.mjs) now locates the Content-Security-Policy meta by parsing its attributes one by one, so any attribute order and any quoting works, and adds the hashes to the directive that actually governs inline script elements: `script-src-elem` when declared, else `script-src`, else a `script-src` created from the `default-src` sources so the policy is not narrowed (a `'none'` sole source is not carried over). A policy with none of the three throws a clear error instead of returning the page unchanged, and only when there are hashes to place: an inline-free page stays a no-op. Covered by `test/console-views-lib.test.mjs` — the allowInlineScripts cases "creates script-src from the default-src sources when the policy declares none", "adds the hashes to script-src-elem, the directive that governs inline script elements" (both orders), "finds the CSP meta whatever the attribute order or the quotes" and "throws instead of narrowing a policy with no script-src and no default-src" — plus "still appends the inlined bundle hash to the shipped shell CSP, changing nothing else", which pins the shipped shell's rewrite (its own policy bytes plus the single appended hash; the four stale tokens that used to sit there were dropped in the d21 commit). Re-exporting `test/fixtures/testlab` with the base commit's module and with this one yields the same bytes apart from the generated timestamp.
done_when:: allowInlineScripts on a policy with no script-src, with script-src-elem before script-src, and with single-quoted or reordered meta attributes either adds the hashes to the effective directive or throws, while the shipped-shell output stays byte-identical.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D1
batch:: b10a-console-builder-csp-hash

## NN Item: console-builder-d02-scaffold-input
value:: M
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:2219-2222 joins an unvalidated blueprint into iNNfo/specs/bluepriNNts/<blueprint>/assets, and :2241, :2264, :2272 and :2282 interpolate the title inside single quotes while :2238, :2262 and :2279 put it in block comments. The base-name guard already exists in scripts/console-views.mjs:45 (viewRootCandidates). path.join does not reset on an absolute segment, so a dot-dot segment is the only escape and the blast radius is one generated file. SPEC_BASE_RE (console-views.mjs:33) is not exported, so reuse needs an export; test/console-view-scaffold.test.mjs:61 pins the title Resumen de Programas, so escape in place instead of switching quote style. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-cli-input: SPEC_BASE_RE is exported and both entry points refuse a `--blueprint` that is not one folder name before a path is built — runMain returns a usage error (exit 2) beside the --template check, and scaffoldConsoleView throws VIEWS_INVALID for its own callers — so `../escape`, `..`, `a/b`, `a\b`, `C:\absolute` and the empty string create nothing. The title is escaped in place: `\`, `'` and line terminators for the single-quoted string, and `*/` for the block comment, with the template's single-quote style untouched (the `Resumen de Programas` assertion still passes unchanged). Covered by test/console-view-scaffold.test.mjs "refuses a --blueprint that is not one folder name, before any path is built" and "keeps a title with the template quote and a comment terminator inside the generated view", which compiles all three templates in node:vm and reads back the literal title O'Brien */.
done_when:: --blueprint ../x is rejected with a usage error and writes nothing, and --title "O'Brien */" yields a view that compiles and registers the literal title.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D2
batch:: b10b-console-builder-cli-input

## NN Item: console-builder-d03-delivery-guard-scope
value:: M
effort:: S
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: SCOPE CHANGED 2026-11-16: the behaviour this item asked for already shipped in 14e57b40. `scripts/export-console.mjs:1955-1959` builds isDelivery as a four-clause disjunction (view, scopeObj.delivery, stagingDir, an outFile under deliveries/vN), and `git blame -L 1955,1960` shows all four clauses in that same commit, so the original evidence line (a literal `view === conntent-delivery` at :1893-1894) was already false when the item was written. What is still missing is the pinning test: `git grep -l image_prompt -- test/` matches only the strip pattern itself, and no test asserts that a scope-driven delivery drops cost, budget, ledger and prompt fields. The strip lives at :1962-1995; the second literal at iNNfo/packages/nn-core/src/console/output-path.ts:57 is unchanged and out of this item's scope. Shipped 2026-11-16 in session/console-writer-contract as the pin only: no leak appeared, so scripts/export-console.mjs is untouched. test/console-export.test.mjs "drops cost, budget, ledger and prompt for a delivery scope object" exports one model twice — once as { models: [...] }, where the budget, cost, image_prompt and ledger fields, the NN Cost element and the view-data sentinels are all present, and once as { delivery: { series, episode, version }, models }, written to series/s/episodes/e/deliveries/v1/e_delivery.html, where no element field matches the strip pattern, no cost/budget/ledger/spend concept element survives, the nested view data is emptied while its sibling key and value stay, and none of the four dropped values appears anywhere in the page. "drops the same data for another view whose write is staged" repeats it for a different view id (probe) with stagingDir set, asserting the staged copy is the file that was written.
done_when:: A test drives writeConsole with (a) a delivery scope object and (b) a view other than conntent-delivery plus stagingDir, and asserts both drop cost, budget, ledger and prompt fields; the production code is not changed unless the test exposes a real leak.
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
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:466-474 inspectDomainConsole compares only bundle and shell mtimes and its only call is the --status print at :2387; --stale selects through inspectModelStatus (:2431), which looks at no assets, so a view-only or CSS-only edit is skipped. A per-view sha256 already exists in the page header comment (scripts/console-views.mjs:425-431) as an alternative source. Adding a meta field regenerates every console once and is additive. Land console-builder-d13-asset-candidates first, which simplifies the CSS and bundle path discovery. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-identity-freshness: `inspectDomainConsole` is now a wrapper over `domainConsoleStaleness`, which reports `missing`, `assets` or `models`, and the asset half (`inlinedAssetsMatch`) compares the page against the assets on disk instead of assuming the model set is the only thing that can change: the stylesheet must appear byte for byte inside its `<style>` block, and every view must still hash to the sha256 prefix the page's `nn-views` header records (`parseViewsHeader`, the reader next to the writer in scripts/console-views.mjs) — no meta field was added, so no console payload changed. The bundle and shell mtime checks stay as they were. `--stale` now asks `domainConsoleStaleness` too and, when only the assets changed, re-exports the whole console instead of a scoped one, because a scoped page would leave `domaiNN_console.html` stale. Covered by test/console-export.test.mjs "re-exports the console with --stale when only a view script changed", "re-exports the console with --stale when only the stylesheet changed" and "keeps an unchanged console fresh and exports nothing with --stale".
done_when:: After editing a view script or nn-ui.css with all models fresh, --stale re-exports instead of printing All models are fresh.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D5
batch:: b10f-console-builder-identity-freshness

## NN Item: console-builder-d06-model-identity-path
value:: M
effort:: M
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1582 sets filePath to the file name (the basename) and the readers at :432, :442 and :486 match on filePath equal to the file name or the relative path with find or some, so duplicate basenames match the first entry; found by reading, no reproduction was run. Consumers: iNNfo/specs/bluepriNNts/console/nn-runtime.js:964, :975, :1169 and :1230-1237, and versionsOf feeding the MCP regenerate_console (console-regeneration.ts:31 and :130, keyed by id, not filePath). The modelFile and location of elements also use the basename (:1511-1514). Tests pin the basename at test/export-console.test.mjs:235 and :383, console-export.test.mjs:708, :754 and :802, and console-s3b-parity.test.mjs:309. No migration: readers accept both forms and consoles are regenerable; it is still a persisted-value change with a tolerant reader, so the lane is a judgment call. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-identity-freshness: two payload fields change shape, from the bare file name to the model's repository-relative path — `model.meta.models[].filePath` (`models/business_V_0-2-5_NN.md`, not `business_V_0-2-5_NN.md`) and the element and matrix `modelFile`, which now names the same path. `el.location`, `modelId`, `modelDir` and every other field keep their shape. The readers tolerate both forms by design: `inspectModelStatus` and `domainConsoleStaleness` match an entry's `filePath` against the relative path *or* its basename, so a console exported before this change, and a hand-written fixture, still resolve; nothing is migrated because a console is a regenerable artifact. Consumers re-checked: nn-runtime.js uses `modelFile` only as display/search text and `m.id || m.filePath` to key facets, the MCP regenerate_console keys on `id`, and console-s3b-parity matches by `id`. The four assertions that pinned the basename were moved to the relative path (scripts/export-console.test.mjs:241, :389-390, :1099 and console-s3b-parity.test.mjs:309). Covered by test/console-export.test.mjs "keeps two same-named models in different folders distinct and both fresh" (both payload identities distinct, both models and the domain console fresh, --stale exports nothing) and "still resolves a console whose entry carries the bare file name".
done_when:: Two models with the same filename in different folders, exported and then checked, both show fresh and --stale re-exports neither.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D6
batch:: b10f-console-builder-identity-freshness

## NN Item: console-builder-d07-scan-read-errors
value:: M
effort:: S
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:255-260 walk() in findModelFiles has a bare catch that returns, :377 and :411 swallow the same way, and :934-948 swallows in collectWorkspaceFiles; the reference pattern is listEntries in scripts/console-views.mjs:68-76. The backlog item cognitivize-archive-and-gc-decisions cites findModelFiles at a stale line (:216, now :242) and its concern is GC and archive rules, so the overlap is partial and the two stay separate. Rethrow in collectWorkspaceFiles is caught at :1845 and drops files with a warning, while rethrow in findModelFiles aborts the export, so decide which behavior is wanted. The review decision omitted findModelFiles, which is the actual reference of the gpt-luna finding. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-scan-errors: a scan read failure now reports on the export's existing warning channel (`WARNING: [export-console] ...` on stderr — the one `discoverViews` already feeds through `onWarning`) instead of being swallowed: `walk` in findModelFiles and in collectWorkspaceFiles say `cannot read directory <path>: <code>`, the inventory `stat` says `cannot stat <path>: <code>`, and hashing says `cannot read file <path>: <code>`. ENOENT and ENOTDIR stay silent, because an absent optional scan folder is a normal workspace; the export never throws, so an export that used to succeed still succeeds, only louder, with the healthy inventory minus the unreadable subtree. That deliberately supersedes this item's original done_when ("makes the export fail"): a read failure is a warning, not a fatal error. Covered by test/console-export-files.test.mjs "warns with the unreadable directory instead of silently dropping its models", "warns with an unreadable scan directory and keeps the rest of the inventory", "warns with a file it cannot stat and omits only that file", "warns with a file it cannot read for hashing and omits only that file" and "stays silent for an absent path and for ENOENT or ENOTDIR from a scan".
done_when:: An unreadable directory or file during a scan warns on the export's stderr channel, naming the path and the failed operation, and the rest of the inventory still exports; ENOENT and ENOTDIR stay silent.
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
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:227-231 gives --filter no guard against a value starting with two dashes and :232-236 falls through to args.root or args.model with no unknown-flag branch; a typo such as --no-opne becomes the root or a substring model match (:2415-2420). Related gap: --new-view, --template, --blueprint and --title silently ignore a missing value (:208-219) and a bare --new-view runs a full export. Only --no-open, --domain and --view appear in docs and scripts, so tightening is low risk. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-cli-input: parseArgs records usage errors instead of guessing. An unrecognised `-`/`--` token is refused with its own name plus the full accepted-flag list, a value flag whose next token is absent or is another flag is refused naming the flag (`--filter --no-open` included; `--view` keeps its pinned `--view needs a view id.` message), and a bare positional still falls through to root or a model name. Both refusals exit 2, print the usage line and write nothing. Covered by test/console-export.test.mjs "refuses an unrecognised flag, names it and lists the flags the CLI accepts", "refuses a flag whose value is missing, naming the flag" and "still reads a bare positional as a model name and a known flag as a flag". A differential run of the base and the changed CLI on the same sample workspace — --list, --status, --tree, --domain, --all, --stale, --filter business, a Ghostbusters positional, --view missing-descriptions, --domain --no-files, --domain --no-changes and a bare --no-open — produced identical stdout, stderr, exit code and produced file tree for all 12 once the write-once view filename's clock stamp was normalised.
done_when:: --no-opne and --filter --no-open exit 2 with usage.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D9
batch:: b10b-console-builder-cli-input

## NN Item: console-builder-d10-preview-utf8
value:: M
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1122-1133 reads min(size, 500, budget) bytes and decodes them as utf8, so a multibyte preview comes out shorter than 500 characters and a split sequence ends in a replacement glyph. The review overstated it as affecting every truncated non-ASCII preview: the shortfall is always present but mild, and the glyph appears only when the cut splits a sequence. The existing test (test/console-export-files.test.mjs:244) checks only length <= 500. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-files-inventory: the bounded preview decodes through a `node:string_decoder` StringDecoder, which withholds an incomplete trailing sequence, so a cut inside a multi-byte code point no longer emits U+FFFD; the byte budget and the character cap keep their values, binaries stay uninlined, the shared preview budget stays bounded and `snippetTruncated` still marks a cut. Covered by test/console-export-files.test.mjs "cuts a preview between code points instead of emitting a replacement glyph" (a 500-byte cut landing inside a two-byte é) and "keeps a preview that ends exactly on a code-point boundary unchanged".
done_when:: A preview of 600 two-byte characters is capped at 500 characters with no trailing replacement glyph.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D10
batch:: b10e-console-builder-files-section

## NN Item: console-builder-d11-citation-basename
value:: M
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1086-1092 matches citations with basename(c.norm) === basename(rel), and the changes loop at :1100-1106 has the identical defect, which the review omitted. Only one assertion touches it (test/console-export-files.test.mjs:130). It does not depend on console-builder-d06-model-identity-path. Prefer the exact normalized path, then the longest matching suffix, then the basename only when unambiguous. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-files-inventory: both loops call one `referenceMatches` resolver, which keeps the path matches unchanged (exact path, then a suffix of one another) and resolves a directory-less reference by basename only when that name is unique among the inventory files, so two same-named files in different folders no longer receive each other's counts. Covered by test/console-export-files.test.mjs "counts a citation only for the path it names, not for same-named siblings", "counts change evidence only for the path it names, not for same-named siblings", "counts a bare-basename reference when that name is unique, in both loops" and "does not count an ambiguous bare-basename reference for any same-named file".
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
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:137 lists nn-console.bundle.js twice and :1323 lists nn-ui.css twice, both left by the breaking nn- rename (commit e68fb7d6); verified again 2026-11-14. Related remnants the review did not name: artifact_blueprint.html (:52) and the nn-or-innfo prefix pattern at :1296. Do not restore the legacy innfo- names. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-identity-freshness: each asset name now exists once — `BUNDLE_FILENAME`, `CSS_FILENAME` and one `SHELL_FILENAMES` list holding the current name first and `artifact_blueprint.html` second — and the bundle lookup, the stylesheet lookup (`uiCssPathFor`), the shell lookup and the root-leftover warning all read those constants, so no list repeats an entry and no legacy `innfo-` name came back. Behaviour is unchanged: the legacy shell is still the fallback, and the `(?:innfo|nn)-model` island read is untouched. Covered by test/console-export.test.mjs "prefers artifact_shell.html over the legacy artifact_blueprint.html copy", "falls back to artifact_blueprint.html when the current shell name is absent" and "still reads a console whose model island uses the legacy innfo-model id".
done_when:: The candidate lists are single paths and the existing asset tests pass.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D13
batch:: b10f-console-builder-identity-freshness

## NN Item: console-builder-d14-scope-key-order
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:496-498 takes the key prefix from the name of the first selected model and hashes the sorted relative paths, while loadModels sorts by the raw OS-separator path at :781; on Windows that order and the slash-normalized order at :497 can differ, so the CLI does not fully hide the dependence. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-export-hygiene: `scopeKeyOf` now orders the selected models by their slash-normalized repository path and takes both the prefix and the hashed list from that canonical order, so any permutation of `selected` names the same family and the raw-path sort in `loadModels` no longer reaches the key (single-model keys are untouched). Pinned by "keeps the scope key stable when the model list is reordered (d14)" in scripts/export-console.test.mjs, which exports the same three models in two orders and requires one `relativePath` under `artifacts/business_V_0-2-5-plus2-<hash6>_console/`.
done_when:: scopeKeyOf returns the same key for any permutation of selected.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D14
batch:: b10g2-console-export-hygiene

## NN Item: console-builder-d15-spec-name-parser
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in batch b10g: `parseSpecName` (scripts/console-views.mjs) trims the name and matches the `_V_x-y-z` suffix in any case, and `coreBlueprintOf` (scripts/export-console.mjs) delegates to it, so both call sites resolve one rule while each keeps its own case handling. Pinned by the "one spec-name rule for both call sites" tests in test/console-views-lib.test.mjs: padded, suffix-cased and genuinely different names, the views folder a padded name resolves to, and the allowlist key for every spelling.
done_when:: One helper serves both call sites, with a case and whitespace test per caller.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D15
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d16-code-unit-compare
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:435 sorts meta.generated and :1881 sorts path with localeCompare, and :781 holds a third inline code-unit comparison; compareCodeUnits in scripts/console-views.mjs:65 is not exported, so sharing needs an export. Both strings are fixed-format ASCII, so the impact is theoretical. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-export-hygiene: `compareCodeUnits` is exported by scripts/console-views.mjs and the exporter now orders every list with it — the console list in `inspectModelStatus`, the model list in `loadModels`, the selected models in `scopeKeyOf` (now async) and the changesets in `writeConsole` — through one cached `viewsLibOnce()` load, so no `localeCompare` call is left in either file and the two modules cannot drift on locale behaviour. Pinned by three tests in scripts/export-console.test.mjs: "orders changesets by code unit, exactly like the views lib (d16)" (a `Business…`/`audit…` changeset pair, which a locale collator reverses), "lists model paths by code unit, not by locale (d16)" (`Zeta` before `alpha`) and "leaves no localeCompare in the exporter or the views lib (d16)".
done_when:: Both sorts use code-unit comparison and no localeCompare is left in the two files.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D16
batch:: b10g2-console-export-hygiene

## NN Item: console-builder-d17-rendertree-branches
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:526-551 has two near-duplicate loops in renderTree; the dot branch prints no directory line and uses no childIndent, so childIndent must be empty for that case. Tests at test/export-console.test.mjs:360 and :1002 cover --tree. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-export-hygiene: `renderTree` prints one loop for both group kinds — the root group adds no directory line (the `Workspace: .` header names it) and no indent, and every other group prints its line and indents its children — so the two branches can no longer drift. `--tree` output is byte-identical: the existing "renders hierarchical directory tree with --tree in read-only mode" and "--status and --tree read the stable per-model console" tests are unchanged and pass, and a base-vs-change differential run of `--tree` printed the same stdout. Pinned by "renders one tree shape for a root model and a nested model (d17)" in scripts/export-console.test.mjs, which asserts the exact tree bytes for two root models and one nested model.
done_when:: --tree output is byte-identical before and after.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D17
batch:: b10g2-console-export-hygiene

## NN Item: console-builder-d18-view-id-discovery
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in batch b10g: `readViews` hashes a file's code once and adds a second view only for an id the runtime registrar accepts, the file slug or a `slug-` prefixed one and never a reserved id (`registrar` in iNNfo/specs/bluepriNNts/console/nn-runtime.js). An id that is neither, and an id the file only mentions in a comment or a string, now adds no view. Pinned by the "secondary view ids a file registers" table in test/console-views-lib.test.mjs, which asserts the runtime's own verdict for every shape. The raw-text scan is unchanged, so a commented-out `slug-` prefixed id is still counted.
done_when:: A commented-out or quoted registerView with id ghost and an unrelated object with an id yield no extra view, and ids that are neither the slug nor slug- prefixed are ignored.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D18
batch:: b10g-console-builder-hygiene

## NN Item: console-builder-d19-changeset-counts
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:1563-1578 runs a reduce and filter over all changesets inside the per-model loop, and :1575 is the set-like indexOf, so a model whose title and stem lower to the same string is counted once. Aggregate by modelPart into a Map and walk a model's keys through a Set. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-export-hygiene: the counts are aggregated once into a Map keyed by lowercased model part before the per-model loop, and each model walks a Set of its title/id/stem keys, so the loop no longer rescans every changeset. The counts themselves were already right — the old `modelKeys.indexOf` membership test counted each change once, so the item did not reproduce as a miscount, only as a per-model rescan — and a base-vs-change differential export with a changeset produced byte-identical console HTML. Pinned by "counts a model once per change, whichever spelling names it (d19)" in scripts/export-console.test.mjs: a changeset naming the model by stem, title and the payload's own id counts 3 (not one per alias), and a model whose title equals its stem counts 2 for two changes.
done_when:: Per-model changeCount is identical before and after, including a model whose title equals its stem.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D19
batch:: b10g2-console-export-hygiene

## NN Item: console-builder-d20-data-theme-guard
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:2006-2008 guards with html.includes of data-theme=, and the shipped iNNfo/specs/bluepriNNts/console/nn-ui.css contains 12 data-theme dark selectors (counted 2026-11-14) and is inlined before the check, so the block is unreachable with shipped assets. The shell's own html tag carries data-theme light at line 2 but not the literal being replaced. Deleting the block is the simplest option. Audited 2026-11-14 at main 551d5a18. Shipped 2026-11-16 in session/console-export-hygiene: the block is deleted (the guarded code is unreachable — the inlined stylesheet always carries `:root, [data-theme]` and the `[data-theme="dark"]` selectors, and the shell already ships `<html lang="en" data-theme="light">`, so the document-wide `includes('data-theme=')` was always true), with a comment in `buildHtml` recording why the page theme is the shell's job. `buildHtml` output is byte-identical for the shipped shell: a base(75daf23f)-vs-change differential export of the domain, one-model, --all and --filter consoles produced identical files. Pinned by "leaves the page theme to the shell, not to a post-inline patch (d20)" in scripts/export-console.test.mjs (the opening html tag carries the theme attribute exactly once and the inlined stylesheet carries the dark selectors).
done_when:: The block is deleted and buildHtml output is byte-identical for the shipped shell.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D20
batch:: b10g2-console-export-hygiene

## NN Item: console-builder-d21-shell-csp-hash-test
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in the b10a CSP-hash PR, second commit. The four `sha256-` tokens in `iNNfo/specs/bluepriNNts/console/artifact_shell.html:10` authorized nothing — computed, they match none of the shell's inline scripts, and the shell has none: only four `application/json` islands and three external scripts — so they were deleted, leaving `script-src 'self' https://cdn.jsdelivr.net/gh/cogNNitive/` plus the hashes the exporter appends. No directive was added and no other byte changed. `test/console-csp.test.mjs` now has "the shell CSP authorizes exactly the inline scripts the shell ships", a two-directional set equality: it recomputes the sha256 of every executable inline script (no `src`, no non-JavaScript `type`) and asserts the set equals the sha256 tokens of the effective script directive. It catches a stale token added back (verified: appending `'sha256-zC9fVwLc…'` makes it fail) and an inline script added without its token (verified: adding `<script>window.__nn_probe = 1</script>` makes it fail). The old `test/console-views-lib.test.mjs` shell case still proves byte-identity for the new bytes: the shell carries no hand-written hash and the exporter's single appended token is the entire difference. The `Console Shell Integrity Guard` stays green — it checks needs, anchors and the CDN pin, never the shell's bytes, and `build-console-shells.mjs` rewrites only the pin inside the `nn:console-shell` block. Audited 2026-11-14 at main 551d5a18.
done_when:: A test asserts that every sha256 token in the shell CSP matches an inline script in the shell, or the four tokens are removed.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D21
batch:: b10a-console-builder-csp-hash

## NN Item: delete-impact-completeness
value:: H
effort:: M
risk:: H
status:: open
lane:: heavy
verdict:: current
evidence:: iNNfo/packages/nn-mcp/src/tools/apply-change.ts:1684-1698 omits discovered peers on load failure before delete-impact computation; cross-review-sol C3 injected EACCES and remove_element still applied. Source unchanged at 8a2958b8df4bd4e20363c37bf2feba7dd0bdffdc.
merged_from:: improvement-plan P01, QW-C5, R7-minimum
done_when:: A discovered unreadable candidate blocks the affected remove_element before target persistence with a path-specific diagnostic; readable incoming references still conflict; unrelated non-destructive operations retain current behavior and partial-change handling remains correct.
ref:: openspec/analysis/2026-11-14-improvement-plan.md
batch:: b11a-safe-delete

## NN Item: console-runtime-release-identity
value:: M
effort:: S
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: iNNfo/specs/bluepriNNts/console/nn-runtime.js:17 sets CONSOLE_VERSION to 0.1.0 and :6598,6603 uses it in exported provenance; scripts/lib/console-bundle.js:39,68 already receives the package release version. Not the model-path identity of console-builder-d06. Source unchanged at 8a2958b8df4bd4e20363c37bf2feba7dd0bdffdc.
merged_from:: improvement-plan P02, QW-E1, DeepSeek-N4
done_when:: Existing bundle composition derives runtime identity from the same release-info value as the banner; runtime exports and exported changesets match package version, shell release URLs stay correct and the model-version display is unchanged.
ref:: openspec/analysis/2026-11-14-improvement-plan.md
batch:: b11b-console-runtime-status

## NN Item: console-synthetic-changes-freshness
value:: M
effort:: S
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: scripts/export-console.mjs:482 compares embedded and discovered model counts while :1736 adds a synthetic <changes> entry; cross-review-deepseek reproduces perpetual stale after re-export. Distinct from duplicate basename console-builder-d06 and asset freshness console-builder-d05. Source unchanged at 8a2958b8df4bd4e20363c37bf2feba7dd0bdffdc.
merged_from:: improvement-plan P03, QW-E2
done_when:: An unchanged fixture with changesets is fresh after export and re-export; a real model edit is stale; only synthetic summary entries are excluded and real changes documents and asset checks remain covered.
ref:: openspec/analysis/2026-11-14-improvement-plan.md
batch:: b11b-console-runtime-status

## NN Item: authoring-guidance-consistency
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: skills/nn-innfo/SKILL.md:200,408,470 teaches INNFO_MODELS_DIR, :172,860,864 teaches workspace/procedures/, :1042 teaches [[Element Name]] despite current consumers; docs/documentation/content/reference/mcp-tools.md:55 misdescribes read_lineage effects. Source unchanged at 8a2958b8df4bd4e20363c37bf2feba7dd0bdffdc.
merged_from:: improvement-plan P05, QW-D2, QW-D3, QW-D4, SOL-N1
done_when:: Environment-variable, procedure-path and reference examples match current consumers and read_lineage documentation matches its read-only handler; no mass procedure migration, trigger change or public API change.
ref:: openspec/analysis/2026-11-14-improvement-plan.md
batch:: b6-remove-banned-l3-field

## NN Item: console-builder-d26-view-convention-contract
value:: M
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Raised by the maintainer after the review, not by any reviewer, so it carries no decision id in the plan. Discovery is convention-only (scripts/console-views.mjs:8-13): bluepriNNt views are flat `<pkg>/assets/console-view-<slug>.js` (:29-30) and domaiNN views are `<domainRoot>/consoles/views/<slug>.js` (:28). The failures that are already loud: a bad slug (:124-126), a reserved id (:127), a duplicate id across origins (:211), an orphan `.data.mjs` (:110-115), a symlinked view (:97-99), ES module syntax (:129), and two versions of one blueprint resolving to different view folders (:197-201). The failures that stay silent: `viewFiles` skips every entry that does not end in `.js` (:95, pinned as intended for notes and folders at test/console-views-lib.test.mjs:245-253), a bluepriNNt `assets/` folder whose files lack the `console-view-` prefix yields no views (:96) while the export still succeeds, a domaiNN view named `console-view-<slug>.js` under `consoles/views/` silently registers the id `console-view-<slug>` because the domaiNN root keeps the whole stem (:102-104), and `viewRootCandidates` falls back to the next tier when an existing folder is empty (:176), so a domain copy that ships zero views hides the installed package's views with no warning. `<domainRoot>/specs/bluepriNNts/<base>/assets` (:48-53) is itself an undocumented discovery path. Existing onWarning covers only a missing blueprint package (:184-187). Audited 2026-11-14 at main 551d5a18. Scope decision: document and enforce the contract that exists; add no discovery path. Shipped 2026-11-16: discoverViews now warns through onWarning in the three silent cases, naming both paths, with no discovery path added and no id derivation changed. (a) a bluepriNNt `assets/` folder whose `.js` files all lack the `console-view-` prefix warns with the offending files and the `console-view-<stem>.js` name they need; (b) a domaiNN view file keeping the `console-view-` prefix warns with the file and the `<slug>.js` it should be, while still registering the id it derives today; (c) a views folder that exists but yields no views while a later tier supplies them warns with that folder and the one used instead. Pinned by test/console-views-lib.test.mjs: "warns, naming the file and the console-view name it needs, when a bluepriNNt assets folder holds only non-view .js", "warns, naming the file and the plain slug it should use, when a domaiNN view keeps the bluepriNNt prefix", "warns, naming the empty folder and the one that supplied the views, when a tier falls through", plus the silence guard "stays silent when the conventions are followed and the first non-empty tier wins".
done_when:: discoverViews reports through onWarning, naming the offending path and the expected one, when (a) a bluepriNNt assets folder holds .js files without the console-view- prefix, (b) a domaiNN view file is named console-view-<slug>.js under consoles/views, and (c) a views folder yields no views while a later tier does; each message is pinned by a test and names both paths, and the three cases leave an otherwise valid export succeeding.
ref:: openspec/analysis/2026-11-14-console-builder-review/consolidated-plan-and-verdict.md@D26
batch:: b10i-console-builder-view-convention

## NN Item: console-unread-provenance-payload
value:: M
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in batch b12. `attachChangesetHistory` no longer builds `element.provenance`: the per-element payload carries `history` only (every status, which is what the Changes tab reads), and the module doc at `iNNfo/packages/nn-core/src/console/element-history.ts:1-10` names that single reader. `ConsolePayloadElement` lost the never-set `provenance` field, so the type no longer advertises a map nothing emits. The second degrade step is now `stripConsoleHistory` (`scripts/console-views.mjs:653-675`, called from `scripts/export-console.mjs:2243`), the strategy is `strip-citations+history`, and the warning says how many elements lost their history: "exported degraded (strip-citations+history) — dropped the resolved citations of N elements and the history of M elements (their raw field values are untouched)". Pinned by `test/console-payload-provenance.test.mjs`: an exported domain payload has `history` (one entry per recorded change) and no `provenance` key at all in the model slot; the ladder on a domain whose manifest is measured twice (citations alone do not fit, citations+history do) reports `strip-citations+history` and the history count, leaves the raw field values and writes the artifact; the exported console boots in jsdom and renders the Changes tab with one sheet per history entry, the per-field modal listing only the change that touched that field and `No recorded changes for this field.` for a field nothing touched. `iNNfo/packages/nn-core/tests/console-element-history.test.ts` pins the same shape at the builder (`history` lists every status, the element owns no `provenance` property) and `scripts/console-size-budget.test.mjs` pins the rename, the history strip and the strategy in the gate message. Measured on `test/fixtures/testlab`, exported twice from the same copy before and after the change: 1,335,661 B → 1,326,998 B (−8,663 B, −0.65 %), where `element.provenance` was 3 elements / 8,651 B and `element.history` stayed 7 elements / 14,750 B in both runs. The item's original references were stale at eccc1450: the degrade helper was at `scripts/console-views.mjs:653-680` and its caller at `scripts/export-console.mjs:2243`, not `:582-597` / `:2119`. Follow-up, out of this batch: `matrix.provenance` (`iNNfo/packages/nn-core/src/console/payload-builder.ts:418-443`, per row/col `{history, origin}`) is equally unread by every browser-side console source (nn-runtime.js, review.js, ui-kit.js, studio.js, render-*.js, the per-blueprint view modules) and the degrade step never walks matrices, so it still pays `deriveValueHistory` per cell on every export.
done_when:: The export emits no `element.provenance`, stripConsoleProvenance still drops `element.history` on the fail path with the strategy name and gate message kept accurate for what the step now does, element-history.ts documents no reader that does not exist, a console exported from a domain with applied changes still renders the Changes tab and the per-field value history, and the payload measured on iNNtake_NN shrinks by the provenance share without losing history.
batch:: b12-console-unread-provenance

## NN Item: console-focus-mount-budget
value:: H
effort:: M
risk:: M
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in PR #668. The fix is `chunked()`'s new `focusIndex` argument: `mountElementCards` no longer passes `projectedElements.length` as the page size, it passes `RENDER_PAGE` (unchanged, 100) plus the index of the focused element, so `chunked()` mounts the page HOLDING that card up front, inserts it in document order, and leaves the pages before it and the tail on "Show more". `chunked()` also returns a `reveal(index)` handle that `mountElementCards` publishes as `content.__nnCardWindow.revealElement`, so `focusElementCard` mounts the one page that holds an unmounted card and then runs its existing expand/highlight/scroll path; a card the current view does not carry leaves the DOM untouched. No virtual scroller. `test/console-bundle-render.test.mjs` ("a deep link does not mount the whole list") pins the bounded mount on a 450-element domain focused at index 430 (200 cards mounted, `#el-e200` absent), the deferred focus, the inert stale link and a search that still reaches an unmounted element. Measured on a 2,901-element domain booted at `#el-e2880` in jsdom: 2,901 cards / 168,538 DOM nodes / 13,409 ms at HEAD versus 200 cards / 11,881 nodes / 1,458 ms after, the focused card mounted and scrolled in both; the earlier headless-Chrome run on the same domain put the two ends at 214 MB / 21,111 nodes (boot) and 621 MB / 222,477 nodes (fully expanded). The 11 non-focus scenarios (plain boot, three Show more steps, full expansion, table, table+2, badges, badges+2, minicards) render byte-identical HTML at HEAD and after the change.
done_when:: Following a deep link to an element of a 2,900-element domain mounts a bounded page instead of every card, the focused card is visible and focused, `focusElementCard` still scrolls to a card that is not mounted yet (its page opens first), and the DOM node count and per-tab working set are recorded before and after with a blank-page control subtracted.
ref:: pr-648, pr-650, benchmark 2026-11-16
batch:: b13-console-focus-mount

## NN Item: console-bundle-render-test
value:: M
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in PR #662: `test/console-bundle-render.test.mjs` is the first suite that loads the committed artifact instead of the separate modules. It executes `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js` as one classic script inside jsdom (self-boot suppressed, `matchMedia`/`ResizeObserver` stubbed), calls `nnConsole.boot`, and asserts (a) one icon resolves through the `nn-icon-sprite` symbol: an `<svg>` plus `<use href="#nn-i-download">` whose target exists in the SVG namespace with geometry, (b) one `type: markdown` field renders through `nnUI.FieldValue` (heading and strong text, raw HTML still inert), (c) the generated header banner `Version X` equals `console/package.json`, and (d) the header's composition list and its 14 `===== file (defines global) =====` markers equal `scripts/lib/console-bundle.js` SOURCES in order, with every global defined by the executed bundle. Verified failing on five mutations of a scratch copy of the bundle outside the worktree: a dropped module body, `ui-kit.js` moved after `nn-runtime.js` (the load throws "nnUI missing"), a `<use>` pointing at a symbol the sprite does not carry, a `Markdown` returning an empty node, and a banner one patch behind `package.json`; the pristine artifact passes 5/5. Promoted from Idea I-c on 2026-11-16, with the premise corrected. `test/helpers/console-boot.mjs:11` already pins `consoleDir` to the repo copy, and `test/console-markdown.test.mjs:24-127` already covers markdown, fenced code, unsafe HTML and safe/unsafe link handling, so the "port the domain-local renderer test" goal is met. What no test exercised is the COMPOSED artifact: nothing under `test/` loaded `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js`, so a build that assembled the 14 sources in the wrong order, dropped a module or shipped a stale banner reached `main` with only `scripts/lib/console-bundle.test.js` (source-level) guarding it.
done_when:: A test boots the committed `nn-console.bundle.js` in a DOM and asserts one icon renders, one markdown body renders and the version banner matches `package.json`; the test fails if the bundle is rebuilt from a different source set.
batch:: b15-console-bundle-test

## NN Item: console-fixture-stale-assets
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped (promoted from Idea I-a on 2026-11-16). The declaration was not a spec or a view: the payload indexes whatever sits under `artifacts/`, so the two frozen `innfo-ui.css` copies under `test/fixtures/testlab/artifacts/*_console/` were the source, and the two stamped 2026-10-13 console snapshots loaded them through `<link rel="stylesheet" href="./innfo-ui.css" />`. Both copies are deleted and both `<link>` lines are gone, so `git grep -c "innfo-ui" test/fixtures/testlab/` returns no hits. `domaiNN_console.html` is regenerated, never hand-edited: `node scripts/export-console.mjs test/fixtures/testlab --domain --no-open` reports `✔ domaiNN_console.html (3 models, 58 elements, 1 views)` and the payload's file inventory and lineage drop exactly those two entries (14 → 12 files) while elements/matrices/changes stay 58/2/6. No exporter, shell or bundle source changed. `test/ui/testlab_smoke.py` still opens the coverage snapshot over `file://` and passes every check, including `console has no non-CDN failed requests`; `node --test test/console-export.test.mjs test/console-export-files.test.mjs` passes 50 tests and `node scripts/verify.js --fast` passes all 301 steps.
done_when:: The TestLab fixtures declare no `innfo-ui.css`, the regenerated console loads no 404 stylesheet, and `ui-smoke` stays green.
batch:: b16-console-fixture-assets

## NN Item: console-builder-d24-scanner-division-row
value:: L
effort:: S
risk:: L
status:: shipped
lane:: light
verdict:: current
evidence:: Shipped in batch b10g: the `plain` table of `findModuleSyntax` rows in test/console-views-lib.test.mjs now holds `var a = {} / 2; import x from "y"`, pinning that a closing brace immediately followed by a slash starts a regex literal, so the import on that line is hidden and the verdict is a plain syntax error. Removing the `prev === '}'` branch of the regex test flips that verdict to `import`, which is what the row locks. No production change. Audited 2026-11-14 at main 551d5a18.
done_when:: The table gains a row that feeds a closing brace followed by a slash and pins the scanner's verdict, and no production code changes.
batch:: b10g-console-builder-hygiene

## NN Item: console-matrix-provenance-payload
value:: M
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: Found on 2026-11-16 while shipping console-unread-provenance-payload (PR #670). `iNNfo/packages/nn-core/src/console/payload-builder.ts:418-443` emits `matrix.provenance` per row and column, each entry `{history, origin}`, and a grep over every browser-side console source (nn-runtime.js, review.js, ui-kit.js, studio.js, render-*.js, the per-blueprint assets/*.js view modules) returns zero readers. The element map was removed by #670, but the degrade ladder in scripts/console-views.mjs (653-675) never walks matrices, so this one is not even strippable under the size budget today.
done_when:: The export emits no `matrix.provenance`, matrix history still reaches the console wherever a reader exists, the over-budget degrade path reports what it now strips for matrices, and a test pins the payload shape.
batch:: b17-console-matrix-provenance

## NN Item: console-fixture-regeneration-gate
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: Found on 2026-11-16 in batch b10a. `test/fixtures/testlab/domaiNN_console.html` was stale on `main` at 75daf23f by ~3,871 bytes: regenerating it from unchanged sources changed the file, because the bundle and shell had moved since the last committed export and nothing regenerates this fixture. `npm run regen` covers the other derived artifacts (bundle, payload mirror, catalogs) but not the exported console, and the pre-commit hook only stages what `scripts/pre-commit-regen.js` knows about, so the fixture drifts until someone runs the export by hand.
done_when:: A freshness check compares the committed `test/fixtures/testlab/domaiNN_console.html` against a fresh export of the same fixture (timestamps and the path-derived domain id normalized) and fails naming the command that regenerates it; regenerating it makes the check pass.
batch:: b18-console-fixture-integrity

## NN Item: console-domain-id-path-hash
value:: L
effort:: S
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: Found on 2026-11-16 in batch b16. `scripts/export-console.mjs` derives `meta.domainId` as the basename plus a short hash of the lowercased ABSOLUTE export path, so exporting the same fixture from two differently named worktrees produces two different committed artifacts (observed: `testlab-82fea50b` -> `testlab-74fcfcb4`). Two workers hit the resulting churn independently, and a differential harness reported false diffs until both sides ran from the same path.
done_when:: The committed console's domain id is derived from workspace content or from the domain-relative path, never from the absolute checkout path; exporting the same domain from two differently named worktrees yields byte-identical output apart from the wall-clock stamps; a test pins it.
batch:: b18-console-fixture-integrity

## NN Item: console-ui-smoke-current-console
value:: M
effort:: M
risk:: M
status:: open
lane:: light
verdict:: current
evidence:: Found on 2026-11-16 in batch b16. `test/ui/testlab_smoke.py` opens the frozen `artifacts/TestLab_coverage_TestLab_console/..._20261013T045336Z.html` snapshot, not `test/fixtures/testlab/domaiNN_console.html` that the exporter produces. CI's `ui-smoke` therefore validates a month-old artifact, which is how the dead `innfo-ui.css` survived (#664). The repointing is NI-2 in openspec/analysis/2026-11-14-independent-sonnet.md and needs a test/ui change.
done_when:: The UI smoke opens the console the exporter writes today, asserts no non-CDN failed request and no JS page error against it, and still passes on a fixture with zero views.
batch:: b18-console-fixture-integrity

## NN Item: console-focus-refresh-reveal
value:: L
effort:: S
risk:: L
status:: open
lane:: light
verdict:: current
evidence:: Found on 2026-11-16 in batch b13 (PR #668). After a deep-link boot reveals the page holding the focused card, a later refresh re-mounts page 0 only: the focused page is not revealed again, so the element the URL names is no longer in the DOM until the reader clicks Show more. The focus id is consumed once by contract, so this is not a regression, but the URL and the DOM disagree after any refresh and no test covers it.
done_when:: A refresh after a deep-link boot either re-reveals the focused page or clears the focus from the URL, so the address bar and the mounted cards never disagree; a test pins the chosen behaviour.
batch:: b17-console-matrix-provenance

## NN Item: nn-mcp-bundle-reproducibility
value:: M
effort:: M
risk:: M
status:: open
lane:: heavy
verdict:: current
evidence:: Observed on every console batch on 2026-11-16: `npm --workspace=@cognnitive/nn-mcp run build` rewrites the committed `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` with a 22-byte diff (943,460 -> 943,438 on this machine), so the pre-commit hook stages a change no author asked for and every worker has to restore the file and commit with `--no-verify`. The guards only compare an embedded version, so CI stays green and the drift is invisible. Same family as the console bundle, which IS reproducible (build twice, zero diff). Lane is heavy because the artifact is a release asset.
done_when:: Two consecutive builds of the nn-mcp bundle from the same tree produce byte-identical output, the committed artifact equals a clean build in CI, and a check fails when they diverge; the restore-and-no-verify workaround stops being necessary.
batch:: b19-nn-mcp-bundle-reproducibility

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
order:: 9
lane:: heavy
items:: derived-artifacts-consolidation
risk:: H
state:: planned

## NN Batch: b4b-query-unification
order:: 10
lane:: heavy
items:: query-language-unification
risk:: H
state:: planned

## NN Batch: b4d-manifest-section-ownership
order:: 12
lane:: heavy
items:: workspace-manifest-section-ownership
risk:: M
state:: planned

## NN Batch: b4e-okf-export
order:: 13
lane:: heavy
items:: okf-export-projector
risk:: M
state:: planned

## NN Batch: b4g-product-site
order:: 14
lane:: heavy
items:: product-site-projection
risk:: M
state:: planned

## NN Batch: b4h-cross-domain-export
order:: 15
lane:: heavy
items:: cross-domain-export
risk:: M
state:: planned

## NN Batch: b4i-conntent-blueprint-gaps
order:: 16
lane:: heavy
items:: conntent-blueprint-gaps
risk:: M
state:: planned

## NN Batch: b4j-episode-layout-drift
order:: 17
lane:: heavy
items:: episode-layout-drift
risk:: M
state:: planned

## NN Batch: b3f-procedure-references
order:: 18
lane:: light
items:: procedure-reference-form
risk:: M
state:: planned

## NN Batch: b3g-orphan-model-guard
order:: 19
lane:: light
items:: orphan-model-lineage-guard
risk:: M
state:: planned

## NN Batch: b5-kb-change-governance
order:: 20
lane:: heavy
items:: kb-change-governance
risk:: M
state:: planned

## NN Batch: b5b-video-vector-actor-catalog
order:: 21
lane:: heavy
items:: video-vector-actor-catalog
risk:: M
state:: planned

## NN Batch: b5c-docs-skills-retirement
order:: 22
lane:: heavy
items:: docs-skills-retirement
risk:: M
state:: planned

## NN Batch: b5d-conntent-procedures
order:: 23
lane:: heavy
items:: coNNtent-procedures
risk:: M
state:: planned

## NN Batch: b6-remove-banned-l3-field
order:: 8
lane:: light
items:: remove-banned-l3-field, authoring-guidance-consistency
risk:: L
state:: planned

## NN Batch: b9-packages-to-root
order:: 25
lane:: heavy
items:: packages-to-root
risk:: H
state:: planned

## NN Batch: b11a-safe-delete
order:: 1
lane:: heavy
items:: delete-impact-completeness
risk:: H
state:: planned

## NN Batch: b10e-console-builder-files-section
order:: 26
lane:: light
items:: console-builder-d10-preview-utf8, console-builder-d11-citation-basename
risk:: L
state:: planned

## NN Batch: b15-console-bundle-test
order:: 27
lane:: light
items:: console-bundle-render-test
risk:: L
state:: planned

## NN Batch: b16-console-fixture-assets
order:: 28
lane:: light
items:: console-fixture-stale-assets
risk:: L
state:: planned

## NN Batch: b11b-console-runtime-status
order:: 29
lane:: light
items:: console-runtime-release-identity, console-synthetic-changes-freshness
risk:: M
state:: planned

## NN Batch: b10d-console-builder-scan-errors
order:: 30
lane:: light
items:: console-builder-d07-scan-read-errors
risk:: M
state:: planned

## NN Batch: b10i-console-builder-view-convention
order:: 31
lane:: light
items:: console-builder-d26-view-convention-contract
risk:: L
state:: planned

## NN Batch: b10b-console-builder-cli-input
order:: 32
lane:: light
items:: console-builder-d02-scaffold-input, console-builder-d09-unknown-flag
risk:: L
state:: planned

## NN Batch: b10c-console-builder-delivery-guard
order:: 33
lane:: light
items:: console-builder-d03-delivery-guard-scope, console-builder-d04-staging-immutability-check, console-builder-d12-writeconsole-contract
risk:: M
state:: planned

## NN Batch: b10f-console-builder-identity-freshness
order:: 34
lane:: light
items:: console-builder-d13-asset-candidates, console-builder-d06-model-identity-path, console-builder-d05-stale-asset-fingerprint
risk:: M
state:: planned

## NN Batch: b12-console-unread-provenance
order:: 35
lane:: light
items:: console-unread-provenance-payload
risk:: L
state:: planned

## NN Batch: b13-console-focus-mount
order:: 36
lane:: light
items:: console-focus-mount-budget
risk:: M
state:: planned

## NN Batch: b10g-console-builder-hygiene
order:: 37
lane:: light
items:: console-builder-d15-spec-name-parser, console-builder-d18-view-id-discovery, console-builder-d24-scanner-division-row
risk:: L
state:: planned

## NN Batch: b10g2-console-export-hygiene
order:: 38
lane:: light
items:: console-builder-d14-scope-key-order, console-builder-d16-code-unit-compare, console-builder-d17-rendertree-branches, console-builder-d19-changeset-counts, console-builder-d20-data-theme-guard
risk:: L
state:: planned

## NN Batch: b10a-console-builder-csp-hash
order:: 39
lane:: light
items:: console-builder-d01-csp-hash, console-builder-d21-shell-csp-hash-test
risk:: M
state:: planned

## NN Batch: b10h-console-builder-output-capture
order:: 40
lane:: light
items:: console-builder-d08-output-capture
risk:: M
state:: planned

## NN Batch: b17-console-matrix-provenance
order:: 41
lane:: light
items:: console-matrix-provenance-payload, console-focus-refresh-reveal
risk:: L
state:: planned

## NN Batch: b18-console-fixture-integrity
order:: 42
lane:: light
items:: console-fixture-regeneration-gate, console-domain-id-path-hash, console-ui-smoke-current-console
risk:: M
state:: planned

## NN Batch: b19-nn-mcp-bundle-reproducibility
order:: 43
lane:: heavy
items:: nn-mcp-bundle-reproducibility
risk:: M
state:: planned
