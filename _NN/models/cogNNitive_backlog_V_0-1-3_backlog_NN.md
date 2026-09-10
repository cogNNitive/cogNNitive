---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "backlog_V_0-1-3"
  url: "specs/backlog_V_0-1-3_spec_NN.md"
model_version: "V_0-1-3"
title: "cogNNitive Backlog"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# NN Backlog
## NN Backlog: cogNNitive Backlog
  title:: "Backlog"
  description:: "Prioritized follow-up work for the cogNNitive monorepo, sourced from the whole-monorepo code audit (2026-09-04)."

# NN WorkItem
## NN WorkItem: Split types
  number:: 1
  key:: "refactor/split-types"
  title:: "Split innfo-core/src/types.ts"
  type:: "refactor"
  size:: "medium"
  status:: "backlog"
  why:: "types.ts is 493 lines and mixes parser/model types with the editor's graph-node model, so every consumer pulls the whole surface."
  approach:: "Make types.ts a barrel exporting parser, validation, io and graph types; keep all internal imports working unchanged."
  risks:: "Low risk (barrel), but an exacting move; decide whether the SpecFrontmatter index signature is still needed."
  suggested_trigger:: "/sdd-new refactor/split-types"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Editor any ratchet
  number:: 2
  key:: "chore/editor-any-ratchet"
  title:: "Drive down any in innfo-editor"
  type:: "chore"
  size:: "medium"
  status:: "backlog"
  why:: "About 96 as any plus 77 any in the editor non-test source; nothing forces the count down."
  approach:: "Remove casts incrementally, starting with gratuitous casts and the graph renderer d3 typing pass; add a guard that fails a PR raising the count."
  suggested_trigger:: "/sdd-new chore/editor-any-ratchet"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Silent fallbacks sweep
  number:: 3
  key:: "fix/silent-fallbacks-sweep"
  title:: "Classify the remaining catch sites"
  type:: "fix"
  size:: "medium"
  status:: "backlog"
  why:: "The README states fail-fast with no silent fallbacks, yet about 35 catch swallow sites remain across innfo-core and innfo-mcp."
  approach:: "Classify each site into propagate, log and continue, or deliberately swallow only ENOENT-guarded reads."
  risks:: "Medium risk as it touches behaviour; one reviewer pass, do not batch with a refactor."
  suggested_trigger:: "/sdd-new fix/silent-fallbacks-sweep"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Renormalize line endings
  number:: 4
  key:: "chore/renormalize-line-endings"
  title:: "One-time CRLF to LF"
  type:: "chore"
  size:: "large"
  status:: "backlog"
  why:: "The repo had mixed line endings; the gitattributes stops new drift but not already-tracked files."
  approach:: "Run git add --renormalize as its own commit with nothing else in the diff, when no other branch is open."
  suggested_trigger:: "/sdd-new chore/renormalize-line-endings"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Investigate deploy-pages
  number:: 5
  key:: "ci/investigate-deploy-pages"
  title:: "Pages deploy job is slow and self-cancels"
  type:: "ci"
  size:: "small"
  status:: "backlog"
  why:: "The deploy-pages job regularly runs over 12 minutes and self-cancels on merge bursts; verify already builds the docs."
  approach:: "Check whether deploy-pages needs its own build, reuse verify output, or split Pages deploy into its own workflow on main."
  suggested_trigger:: "/sdd-new ci/investigate-deploy-pages"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Import source-history check
  number:: 6
  key:: "feature/import-source-history-check"
  title:: "Consult conversation history before importing a source"
  type:: "functional"
  size:: "small-medium"
  status:: "backlog"
  why:: "The same or a similar document may already have been handled in a past conversation; blind import can duplicate work or ignore prior decisions."
  behaviour:: "Before importing, search conversation history for prior handling; if a match is found, summarise it and ask whether to reuse, adjust, or start from scratch; otherwise import normally."
  approach:: "Likely touches the agent workflow layer and a helper indexing conversation source history; exact vs semantic matching is open."
  also_consider:: "Tie into the lineage record to establish the what-have-we-done-before baseline."
  suggested_trigger:: "/sdd-explore import-source-history-check"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Duplicate-source detection
  number:: 7
  key:: "feature/duplicate-source-detection"
  title:: "Detect duplicate or updated sources on import"
  type:: "functional"
  size:: "small-medium"
  status:: "backlog"
  why:: "An incoming source may be exactly the same content or the same content with a different organisation; blind import duplicates or loses update status."
  behaviour:: "Detect exact and near duplicates before normalising; ask whether it is an update; if confirmed, create the new source and archive the old one, otherwise keep prior behaviour."
  approach:: "Exact matches are cheap via the existing hash; near-duplicate needs a structural similarity heuristic; archive semantics need a decision."
  also_consider:: "Design together with the import-history guard to avoid duplicating matching logic."
  suggested_trigger:: "/sdd-explore duplicate-source-detection"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Local specialization migration
  number:: 8
  key:: "feat/local-specialization-migration"
  title:: "Migrate local specializations onto new canonical templates"
  type:: "feat"
  size:: "medium-high"
  status:: "deferred"
  why:: "Deferred from the workspace upgrade flow; its scope there was only unlisted detection plus guidance."
  approach:: "Detect local spec files, resolve their base template, run a three-way diff, then re-derive the delta over the new base with a per-definition conflict pass."
  behaviour:: "Provide a real migration for user-authored specializations instead of classifying them unlisted."
  risks:: "Collision semantics when the base adopts a specialization definition; includes identity; versioning; possible need for a diff primitive."
  suggested_trigger:: "/sdd-explore local-specialization-migration"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Massive renaming app
  number:: 9
  key:: "feat/massive-renaming-app"
  title:: "Mass rename of application elements, including template to app"
  type:: "feat"
  size:: "large"
  status:: "backlog"
  why:: "The naming vocabulary is cognitively heavier than needed, notably the Level 2 concept called template."
  behaviour:: "Rename template to app across the user-facing and conceptual vocabulary; audit the remaining element vocabulary for a simpler, consistent surface; keep identifiers stable where renaming would break resolution."
  risks:: "Large; split into a vocabulary pass and a mechanical identifier migration; decide per surface, not blindly."
  suggested_trigger:: "/sdd-explore massive-renaming-app"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Repository template
  number:: 10
  key:: "feat/repository-template"
  title:: "New repository template for GitHub repository state"
  type:: "feat"
  size:: "medium"
  status:: "backlog"
  why:: "There is no Level 2 template for managing a GitHub repository lifecycle."
  behaviour:: "Provide a repository template modelling repository state, releases, and changes."
  approach:: "New standalone template mirroring existing structure."
  suggested_trigger:: "/sdd-explore repository-template"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Video generator template
  number:: 11
  key:: "feat/video-generator-template"
  title:: "New video generator template"
  type:: "feat"
  size:: "medium"
  status:: "backlog"
  why:: "No dedicated Level 2 template drives a video generation pipeline."
  approach:: "Decide between a standalone template or a workflow specialization; cover input sources, intermediate models, and generated outputs reusing existing primitives."
  suggested_trigger:: "/sdd-explore video-generator-template"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: MCP tool registry
  number:: 12
  key:: "refactor/mcp-tool-registry"
  title:: "Declarative MCP tool registration"
  type:: "refactor"
  size:: "small"
  status:: "backlog"
  why:: "Adding a tool touches definitions, dispatch and handler plus a brittle count assertion; every new tool risks drift."
  approach:: "Drive definitions, dispatch, and count from a single table of name, definition, and handler."
  suggested_trigger:: "/sdd-new mcp-tool-registry"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Unified diagnostics collector
  number:: 13
  key:: "refactor/unified-diagnostics-collector"
  title:: "Merge validate and check-workspace collection"
  type:: "refactor"
  size:: "medium"
  status:: "backlog"
  why:: "Two tool modules duplicate parse-to-filter-to-merge logic and drift with each validation feature."
  approach:: "Extract a parameterised collect-and-filter routine shared by both tools, behaviour-preserving."
  suggested_trigger:: "/sdd-new unified-diagnostics-collector"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: CDN bundle CI
  number:: 14
  key:: "chore/cdn-bundle-ci"
  title:: "Build and verify the MCP CDN bundle in CI"
  type:: "chore"
  size:: "small"
  status:: "backlog"
  why:: "CDN bundles are rebuilt by hand and staleness already bit once."
  approach:: "Add a CI job that builds the bundle, rewrites the manifest, and runs the square check."
  suggested_trigger:: "/sdd-new cdn-bundle-ci"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Trannsform slug codegen
  number:: 15
  key:: "refactor/trannsform-slug-codegen"
  title:: "Generate the trannsform slug mirror from core"
  type:: "refactor"
  size:: "small-medium"
  status:: "backlog"
  why:: "The skill must hand-mirror core slug functions with only a parity test as guard; it will drift again."
  approach:: "Emit the JS mirror from the TS source during the release build; the parity test asserts the checked-in file matches output."
  suggested_trigger:: "/sdd-new trannsform-slug-codegen"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Editor readtext helper
  number:: 16
  key:: "refactor/editor-readtext-helper"
  title:: "Extract workspaceStore.readText path"
  type:: "refactor"
  size:: "small"
  status:: "backlog"
  why:: "File-handle traversal is duplicated across the file preview modal and the workspace explorer."
  approach:: "Single async helper on the workspace store; callers use it; no behaviour change."
  suggested_trigger:: "/sdd-new editor-readtext-helper"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: MCP coverage debt
  number:: 17
  key:: "chore/mcp-coverage-debt"
  title:: "MCP package below the coverage gates"
  type:: "chore"
  size:: "medium"
  status:: "backlog"
  why:: "The MCP package sits below the gates; lowest files are apply-change, reachability, spec, init-model, and resolver-node."
  approach:: "Per-file test backfill, lowest first; no behaviour change; keep new-code coverage at 100 percent."
  suggested_trigger:: "/sdd-new mcp-coverage-debt"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Workspace KB perf limits
  number:: 18
  key:: "chore/workspace-kb-perf-limits"
  title:: "Probe performance limits with the workspace KB test"
  type:: "chore"
  size:: "small-medium"
  status:: "backlog"
  why:: "Scaling limits of the workspace knowledge base are unknown."
  approach:: "Build a performance harness over the workspace; scale dimensions separately and record breaking points and limits."
  suggested_trigger:: "/sdd-explore workspace-kb-perf-limits"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Shared decomposed fixtures
  number:: 19
  key:: "refactor/shared-decomposed-fixtures"
  title:: "Single resolver map for decomposed template tests"
  type:: "refactor"
  size:: "small"
  status:: "backlog"
  why:: "Four core test files hardcode their own resolver maps; attaching metrics broke five tests because one map was missed."
  approach:: "One shared helper exporting the maps consumed by all four files; behaviour-preserving."
  suggested_trigger:: "/sdd-new shared-decomposed-fixtures"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Metrics scenario compare
  number:: 20
  key:: "feature/metrics-scenario-compare"
  title:: "Side-by-side scenario comparison in Projections"
  type:: "functional"
  size:: "small-medium"
  status:: "backlog"
  why:: "The Projections artifact renders only a single neutral flow; comparing variants means editing variables by hand."
  approach:: "Implement variants as ordinary rows through the variables mechanism, then add comparison UI on top."
  suggested_trigger:: "/sdd-new metrics-scenario-compare"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Console domain renderers
  number:: 21
  key:: "refactor/console-domain-renderers"
  title:: "Migrate projections and strategic master to console renderers"
  type:: "refactor"
  size:: "large"
  status:: "deferred"
  why:: "Left inline in the previous cycle; projections and the strategic master stay bespoke special cases."
  approach:: "Extend the renderer pattern to them without overloading the generic console template; for the master, either build a data-driven dashboard or freeze and document the deviation."
  risks:: "Large if both slices go data-driven; the E2E equivalence bar must hold; separate specs per slice."
  suggested_trigger:: "/sdd-explore console-domain-renderers"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Console remainder
  number:: 22
  key:: "chore/innfo-console-remainder"
  title:: "Batch-commit, push, and release the remaining console work"
  type:: "chore"
  size:: "small"
  status:: "deferred"
  why:: "Prior console follow-up commits landed; the rest is still open in the tree and needs an owning review."
  approach:: "Owner re-verifies each path, then one batch commit; sibling dirties stay out of scope; push needs a maintainer go."
  suggested_trigger:: "Maintainer decision in chat, not an SDD cycle"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Robustness coda
  number:: 23
  key:: "robustness-coda"
  title:: "Five leftover pins from validator-robustness verifies"
  type:: "fix"
  size:: "small"
  status:: "deferred"
  why:: "The robustness cycles closed with warnings and left five honest gaps."
  approach:: "Apply the five pins as one commit-sized unit; re-verify paths touched by a sibling session first."
  suggested_trigger:: "/sdd-apply robustness-coda once the tree is quiet"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Knowledge review workflow
  number:: 24
  key:: "feature/knowledge-review-workflow"
  title:: "Review and approval artifacts for KB changes"
  type:: "functional"
  size:: "medium"
  status:: "backlog"
  why:: "RACI-aligned responsible actors have no structured artifact to approve or comment on changes in their scope."
  behaviour:: "Provide a per-actor view of changes in their scope plus a review artifact with approve, request changes, and comment."
  approach:: "Pair a per-actor view of changes with the review artifact; decide where review state persists."
  also_consider:: "Tie into the lineage record and RACI matrix; design together with the change log."
  suggested_trigger:: "/sdd-explore knowledge-review-workflow"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Term dictionary
  number:: 25
  key:: "feat/term-dictionary"
  title:: "Dictionary of terms matching the application structure"
  type:: "functional"
  size:: "small-medium"
  status:: "backlog"
  why:: "The application vocabulary has drifted from the actual structure; the rename target vocabulary must be pinned first."
  behaviour:: "Produce a glossary mapping canonical terms to current elements, with deprecated and alias terms, feeding the rename work."
  also_consider:: "Decide whether the dictionary lives as a doc, a machine-readable map driving UI copy, or both; coordinate with the renaming."
  suggested_trigger:: "/sdd-explore term-dictionary"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Knowledge change log
  number:: 26
  key:: "feature/knowledge-change-log"
  title:: "Per-unit change log with individualized monthly reports"
  type:: "functional"
  size:: "medium"
  status:: "backlog"
  why:: "There is no record of which changes affected which knowledge units and by whom."
  behaviour:: "Maintain a per-unit change log with type, scope, timestamp, actor, and RACI owner; render individualized monthly reports per responsible person."
  approach:: "Extend the lineage record with per-unit change entries; the monthly report is a filtered rendering."
  also_consider:: "This is the data backbone for the review workflow; design them together to avoid parallel stores."
  suggested_trigger:: "/sdd-explore knowledge-change-log together with the review workflow"
  sources:: ["sources/nn/backlog.md"]

# NN matrices: work-item relations
| Row \ Col | Duplicate-source detection | Term dictionary | Console remainder | Knowledge change log | Knowledge review workflow |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Import source-history check | related | - | - | - | - |
| Massive renaming app | - | related | - | - | - |
| Console domain renderers | - | - | related | - | - |
| Knowledge review workflow | - | - | - | depends_on | - |
| Knowledge change log | - | - | - | - | related |

# NN matrices: item-markers matrix
| Item \ Marker | ready |
| :--- | :---: |
| Split types | X |
| Editor any ratchet | X |
| Silent fallbacks sweep | X |
| Renormalize line endings | X |
| Investigate deploy-pages | X |
| Import source-history check | X |
| Duplicate-source detection | X |
| Local specialization migration | - |
| Massive renaming app | X |
| Repository template | X |
| Video generator template | X |
| MCP tool registry | X |
| Unified diagnostics collector | X |
| CDN bundle CI | X |
| Trannsform slug codegen | X |
| Editor readtext helper | X |
| MCP coverage debt | X |
| Workspace KB perf limits | X |
| Shared decomposed fixtures | X |
| Metrics scenario compare | X |
| Console domain renderers | - |
| Console remainder | - |
| Robustness coda | - |
| Knowledge review workflow | X |
| Term dictionary | X |
| Knowledge change log | X |
