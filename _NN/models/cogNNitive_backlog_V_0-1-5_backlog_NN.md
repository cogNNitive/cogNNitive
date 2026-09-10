---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
level: 3
parent_spec:
  name: "backlog_V_0-1-4"
  url: "specs/backlog_V_0-1-4_spec_NN.md"
model_version: "V_0-1-5"
title: "cogNNitive Backlog"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://innfo.cognnitive.com/app/innfo-doc).

# NN Backlog
## NN Backlog: cogNNitive Backlog
  title:: "Backlog"
  description:: "Prioritized follow-up work for the cogNNitive monorepo, from the whole-monorepo code audit (2026-09-04). Consolidated 2026-09-10 (26 to 15 work items): coupled items merged, done/obsolete entries retired. Prioritized 2026-09-10 (P0 quick wins to P3 deferred)."

# NN WorkItem
## NN WorkItem: Source import guards
  number:: 1
  key:: "feature/source-import-guards"
  title:: "Import-time guards: conversation history + duplicate detection"
  type:: "functional"
  size:: "medium"
  priority:: "P2"
  status:: "backlog"
  why:: "Importing from sources/import/ is blind: it neither consults past conversations nor compares against the existing corpus, so work is duplicated or update lineage is lost."
  behaviour:: "Run two guards before normalising: (1) search conversation history for prior handling and ask reuse/adjust/from-scratch; (2) detect exact (sha256) and near duplicates, ask whether it is an update, then create the new source and archive the old one."
  approach:: "Share one matching layer; exact hash is cheap via computeFileHash, near-duplicate needs a structural heuristic; archive semantics open; touches the agent workflow layer and a conversation-history index."
  also_consider:: "Tie into the lineage record (# NN Sources / # NN Procedures) to avoid a parallel store."
  suggested_trigger:: "/sdd-explore source-import-guards"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: KB change governance
  number:: 2
  key:: "feature/kb-change-governance"
  title:: "Per-unit change log + RACI-aligned review workflow"
  type:: "functional"
  size:: "medium"
  priority:: "P2"
  status:: "backlog"
  why:: "No record of which changes affected which knowledge units and by whom; RACI owners have no structured artifact to approve or comment on changes in their scope."
  behaviour:: "Per-unit change log (type, scope, timestamp, actor, RACI owner) feeding individualized monthly reports, plus a per-actor review surface with approve/request-changes/comment."
  approach:: "The change log is the data backbone for the review; extend the lineage record with per-unit entries; review-state persistence is open. Design both together to avoid parallel stores."
  also_consider:: "RACI matrix is the single source of ownership scope."
  suggested_trigger:: "/sdd-explore kb-change-governance"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Vocabulary simplification
  number:: 3
  key:: "feat/vocabulary-simplification"
  title:: "Canonical term dictionary + mass rename (template to app)"
  type:: "feat"
  size:: "large"
  priority:: "P3"
  status:: "backlog"
  why:: "The application vocabulary has drifted from its structure, and the Level 2 concept called template is cognitively heavier than app."
  behaviour:: "Pin a canonical term dictionary (with deprecated/alias terms), then rename template to app across user-facing and conceptual vocabulary and audit the remaining element names; keep identifiers stable where renaming breaks resolution."
  approach:: "Split into a low-risk vocabulary pass and a high-risk mechanical identifier migration (catalog, manifest, _spec_NN.md, parent_spec.url) with an alias/version strategy; never a blind find-and-replace."
  risks:: "Large; do not attempt as one change."
  suggested_trigger:: "/sdd-explore vocabulary-simplification"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Core structure
  number:: 4
  key:: "refactor/core-structure"
  title:: "Split types.ts barrel + shared decomposed test fixtures"
  type:: "refactor"
  size:: "medium"
  priority:: "P1"
  status:: "backlog"
  why:: "types.ts is 548 lines and mixes parser/model types with the editor graph model; four core test files hardcode their own include-resolver maps, so attaching metrics broke five tests when one map was missed."
  approach:: "Make types.ts a barrel over types/{parser,validation,io,graph}.ts, and extract one shared tests/fixtures/decomposed.ts consumed by all four test files. Behaviour-preserving."
  also_consider:: "Decide whether the SpecFrontmatter index signature is still needed."
  suggested_trigger:: "/sdd-new core-structure"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: MCP hygiene
  number:: 5
  key:: "chore/mcp-hygiene"
  title:: "Declarative tool registry + enforced coverage gates"
  type:: "refactor"
  size:: "medium"
  priority:: "P1"
  status:: "backlog"
  why:: "Adding an MCP tool touches definitions, dispatch and handler plus a brittle count assertion; and innfo-mcp coverage gates (90/95/85) exist but CI runs vitest run, never test:coverage, so the debt is unenforced."
  approach:: "Drive definitions, dispatch and count from a single name/definition/handler table; run coverage in CI and backfill per file lowest-first."
  suggested_trigger:: "/sdd-new mcp-hygiene"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Trannsform slug codegen
  number:: 6
  key:: "refactor/trannsform-slug-codegen"
  title:: "Generate the nn-trannsform slug mirror from core"
  type:: "refactor"
  size:: "small-medium"
  priority:: "P0"
  status:: "backlog"
  why:: "The nn-trannsform slug mirror is hand-written with only a hardcoded parity test as guard; it will drift again."
  approach:: "Build-time codegen from the TS source during the release build; the parity test asserts the checked-in file matches generated output; runtime stays dependency-free."
  suggested_trigger:: "/sdd-new trannsform-slug-codegen"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Silent fallbacks sweep
  number:: 7
  key:: "fix/silent-fallbacks-sweep"
  title:: "Classify the remaining catch sites"
  type:: "fix"
  size:: "medium"
  priority:: "P2"
  status:: "backlog"
  why:: "The README claims fail-fast, yet ~20 bare/empty catch sites remain across innfo-core and innfo-mcp (down from ~35), unclassified and with only ad-hoc comments."
  approach:: "Classify each into propagate, log+continue, or deliberate ENOENT-guarded swallow with a comment."
  risks:: "Touches behaviour; one reviewer pass; do not batch with a refactor."
  suggested_trigger:: "/sdd-new silent-fallbacks-sweep"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Editor tech debt
  number:: 8
  key:: "chore/editor-tech-debt"
  title:: "Drive down any + extract workspaceStore.readText"
  type:: "chore"
  size:: "medium"
  priority:: "P2"
  status:: "backlog"
  why:: "The editor carries ~106 as any plus ~91 any with only a warn rule and no guard, and file-handle traversal is duplicated across FilePreviewModal and WorkspaceExplorer."
  approach:: "Extract a single async readText helper on the workspace store; remove gratuitous casts incrementally; add a lint/CI guard that fails a PR raising the any count."
  suggested_trigger:: "/sdd-new editor-tech-debt"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Build hygiene
  number:: 9
  key:: "ci/build-hygiene"
  title:: "Stop deploy-pages rebuilding + automate the CDN square check"
  type:: "ci"
  size:: "small"
  priority:: "P0"
  status:: "backlog"
  why:: "deploy-pages rebuilds what verify already built and self-cancels on merge bursts; the CDN bundle build is automated in CI but the version-square check is not wired, and the inline deploy:cdn script is fragile."
  approach:: "Reuse the verify artifact or move Pages deploy to its own main-only workflow; wire the version-square check into CI and retire deploy:cdn."
  suggested_trigger:: "/sdd-new build-hygiene"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: New templates
  number:: 10
  key:: "feat/new-templates"
  title:: "Repository template + video-generator template"
  type:: "feat"
  size:: "medium"
  priority:: "P2"
  status:: "backlog"
  why:: "No Level 2 template manages a GitHub repository lifecycle, and none drives a video generation pipeline."
  behaviour:: "Provide a repositorio template (state, releases, changes) and a video-generator template (source to script/storyboard/asset), each with a canonical sample and catalog/manifest registration."
  approach:: "Standalone structure plus the nn-template-audit criteria; decide standalone vs workflow specialization. The videoscript template committed at 419d9f0 was deleted unregistered; decided 2026-09-10 to subsume it into the video-generator template rather than ship it standalone (discard, revive, or subsume)."
  notes:: "VideoScript content to reuse: recover from commit 419d9f0 (VideoScript/Section/Scene/Layer + generate-VUS procedure serializing to VUS V_0-3-3)."
  suggested_trigger:: "/sdd-explore new-templates"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Metrics scenario compare
  number:: 11
  key:: "feature/metrics-scenario-compare"
  title:: "Side-by-side scenario comparison in Projections"
  type:: "functional"
  size:: "small-medium"
  priority:: "P1"
  status:: "backlog"
  why:: "Projections renders only a single neutral flow; comparing variants means editing variables by hand."
  approach:: "Implement variants as ordinary variant rows through the Metrics/Variables mechanism, then add comparison UI (per-variant series, cards, CSV). Do not reintroduce the scenario selector."
  suggested_trigger:: "/sdd-new metrics-scenario-compare"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Workspace KB perf limits
  number:: 12
  key:: "chore/workspace-kb-perf-limits"
  title:: "Probe performance limits with the workspace KB test"
  type:: "chore"
  size:: "small-medium"
  priority:: "P1"
  status:: "backlog"
  why:: "The scaling limits of the workspace knowledge base are unknown."
  approach:: "Build a perf harness over a disposable SIM workspace; scale dimensions separately, measure check_workspace/validate/query_units/preview latency, and record breaking points and pragmatic limits."
  suggested_trigger:: "/sdd-explore workspace-kb-perf-limits"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Local specialization migration
  number:: 13
  key:: "feat/local-specialization-migration"
  title:: "Migrate local specializations onto new canonical templates"
  type:: "feat"
  size:: "medium-high"
  priority:: "P3"
  status:: "deferred"
  why:: "Local user-authored specializations cannot follow canonical template upgrades; upgrade-check classifies them unlisted and nn-upgrade only reports."
  behaviour:: "Provide a real semantic rebase instead of unlisted detection."
  approach:: "Detect specializations, resolve the base, three-way diff, per-definition conflict pass, then emit a new specialization version and repoint models."
  risks:: "Collision semantics, includes identity, versioning, possible diffTemplates primitive."
  suggested_trigger:: "/sdd-explore local-specialization-migration"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Console domain renderers
  number:: 14
  key:: "refactor/console-domain-renderers"
  title:: "Migrate projections + strategic master to console renderers"
  type:: "refactor"
  size:: "large"
  priority:: "P3"
  status:: "deferred"
  why:: "Projections and the strategic master stay inline as bespoke special cases after the model-viewer renderer was extracted."
  approach:: "Extend the renderer pattern without overloading the generic console template; projections packaging decision, and master data-driven redesign vs freeze-and-document; keep the E2E equivalence bar."
  risks:: "Large if both slices go data-driven; separate specs per slice."
  suggested_trigger:: "/sdd-explore console-domain-renderers"
  sources:: ["sources/nn/backlog.md"]
## NN WorkItem: Pending tree closeout
  number:: 15
  key:: "chore/pending-tree-closeout"
  title:: "Commit/archive work already sitting in the working tree"
  type:: "chore"
  size:: "small"
  priority:: "P0"
  status:: "backlog"
  why:: "Work is done in the tree but not closed: a newer console workstream is uncommitted, and the robustness-coda five pins are present but unarchived with score-matcher edits uncommitted."
  approach:: "Owner re-verifies own paths, batch-commits only own files (never git add -A), completes robustness-coda verify and archive, then the batched dev to main merge. Maintainer decision in chat."
  suggested_trigger:: "Maintainer decision in chat"
  sources:: ["sources/nn/backlog.md"]

# NN matrices: work-item relations
| Row \ Col | New templates | Silent fallbacks sweep | Metrics scenario compare | Console domain renderers | Pending tree closeout | Vocabulary simplification |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| MCP hygiene | - | related | - | - | - | - |
| Vocabulary simplification | related | - | - | - | - | - |
| Metrics scenario compare | - | - | - | related | - | - |
| Console domain renderers | - | - | - | - | related | - |
| New templates | - | - | - | - | - | depends_on |
| Local specialization migration | - | - | - | - | - | depends_on |

# NN matrices: item-markers matrix
| Item \ Marker | ready |
| :--- | :---: |
| Source import guards | X |
| KB change governance | X |
| Vocabulary simplification | X |
| Core structure | X |
| MCP hygiene | X |
| Trannsform slug codegen | X |
| Silent fallbacks sweep | X |
| Editor tech debt | X |
| Build hygiene | X |
| New templates | X |
| Metrics scenario compare | X |
| Workspace KB perf limits | X |
| Local specialization migration | - |
| Console domain renderers | - |
| Pending tree closeout | X |
