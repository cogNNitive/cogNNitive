# OpenSpec archive index

The full contents of every change listed here were removed from the working tree.
Their text is not lost: each one is preserved in git under the tag `openspec-archive-snapshot-2026-10`.

Recover one change:

```bash
git show openspec-archive-snapshot-2026-10:openspec/changes/archive/<change>/proposal.md
git checkout openspec-archive-snapshot-2026-10 -- openspec/changes/archive/<change>
```

The merged outcome of each change lives in `openspec/specs/` (the source of truth).
Changes archived after this snapshot keep their folder here until the next prune
(policy: prune archived changes older than 30 days and append them to this table).

187 changes.

| Change | Title | Delta specs |
|---|---|---|
| `2026-09-01-add-element-concept-tags` | Change Proposal: add-element-concept-tags | `data_model_spec`, `ui_components_spec` |
| `2026-09-01-workspace-taxonomy-and-submodels` | Workspace Taxonomy and Submodels | `dual-mode-sidebar`, `model-primitive-type`, `template-derived-taxonomy`, `workspace-entrypoint` |
| `2026-09-02-submodels-recursive-and-spec-alignment` | Submodels Recursive Traversal & Formal Spec Alignment | `dual-mode-sidebar`, `model-primitive-type`, `recursive-submodel-parsing`, `submodel-conformance-validation` |
| `2026-09-02-template-package-and-composition` | Template Package Structure & Composition | `template-dynamic-discovery`, `template-ecosystem-documentation`, `template-includes-collision-resolution`, `template-package-structure`, `template-version-pruning` |
| `2026-09-03-ci-build-and-purge-bundles` | CI Dynamic Build & Purge Bundles | `ci-dynamic-bundle-build`, `repository-asset-hygiene` |
| `2026-09-03-manifest-release-integrity` | Manifest Release Integrity | `manifest-release-integrity`, `template-skill-bundling` |
| `2026-09-03-scripts-modular-refactor` | Scripts Modular Refactor | `scripts-modular-refactor` |
| `2026-09-03-scripts-type-safety` | Scripts Type Safety | `scripts-ambient-declarations`, `scripts-typechecking` |
| `2026-09-04-documentation-template-and-dogfooding` | Documentation Template and Docsify Dogfooding | `documentation-template-spec` |
| `2026-09-05-documentation-v2-and-docsify-suite` | Documentation V_0-2-0 Template Package and Docsify Suite Generator | `documentation-template-v2` |
| `2026-09-05-editor-element-concept-tags` | Change Proposal: editor-element-concept-tags | `editor-tag-authoring` |
| `2026-09-05-monorepo-release-workflow-and-parity-guards` | Monorepo Release Workflow & Parity Guards | `release-integrity` |
| `2026-09-05-open-taxonomy-workspace-tags` | Open Taxonomy with Progressive Enhancement (Workspace Tags & Views) | `workspace-tags` |
| `2026-09-05-provenance-lineage-consolidation` | Provenance & Lineage Consolidation for the iNNfo Pipeline | `lineage-record-sync`, `provenance-vocabulary`, `typed-source-references` |
| `2026-09-05-quick-wins-ecosystem-alignment` | Quick Wins — Ecosystem Alignment | - |
| `2026-09-05-submodel-element-tree-and-creation` | submodel-element-tree-and-creation | `dual-mode-sidebar`, `model-primitive-type` |
| `2026-09-05-workspace-entity-evolution` | Workspace Entity Evolution | `base-composite-template`, `cross-model-reference-validation`, `model-primitive-type`, `recursive-submodel-parsing`, `workspace-entrypoint`, `workspace-graph-index`, `workspace-identity`, `workspace-manifest-reconciliation` |
| `2026-09-06-integrity-audit-fixes` | Integrity Audit Fixes (2026-09-06) | - |
| `2026-09-06-source-versioning-archive` | Source Versioning & Archive | `lineage-version-status`, `source-versioning-archive` |
| `2026-09-06-sources-conversations-lifecycle` | Workspace Sources and Conversations Lifecycle | `conversations-lifecycle`, `generic-source-integrity-audit`, `source-normalization-pipeline`, `workspace-directory-conventions` |
| `2026-09-06-template-cache-staleness-detection` | Template Cache Staleness Detection (2026-09-06) | `template-cache-staleness-detection`, `template-immutability-guard` |
| `2026-09-06-template-freshness-diagnostic-ui` | Template Freshness Diagnostic and UI Presentation (2026-09-06) | `template-freshness-diagnostic` |
| `2026-09-06-workspace-template-consolidation` | Workspace Template Consolidation | `base-composite-template`, `lineage-version-status`, `workspace-directory-conventions`, `workspace-entrypoint`, `workspace-entrypoint-resolution` |
| `2026-09-06-workspace-template-upgrade-flow` | Workspace Template Upgrade Flow (2026-09-06) | `workspace-template-upgrade` |
| `2026-09-07-agent-modifications-source-provenance` | Agent Modifications Source Provenance | `agent-modification-provenance`, `conversations-lifecycle`, `document-citations`, `source-normalization-pipeline` |
| `2026-09-07-hierarchical-submodel-paths` | Hierarchical Submodel Paths | `model-primitive-type` |
| `2026-09-07-integrity-audit-followups` | Integrity Audit Follow-ups (2026-09-06) | - |
| `2026-09-07-template-pin-main-coherence-gate` | Template Pin ↔ Main Coherence Gate | `monorepo-release-manifest` |
| `2026-09-07-workspace-integrity-check` | Workspace Integrity Check | `template-cache-staleness-detection`, `template-freshness-diagnostic`, `workspace-integrity-check`, `workspace-template-upgrade` |
| `2026-09-08-canonical-template-package-distribution` | Canonical Template Package Distribution | `template-immutability-guard`, `template-package-structure`, `template-release-tagging`, `template-version-pruning` |
| `2026-09-08-knowledge-unit-query` | Knowledge-Unit Query Language | `knowledge-unit-query` |
| `2026-09-08-knowledge-unit-uri` | Knowledge-Unit URI | `document-citations`, `knowledge-unit-uri`, `typed-source-references` |
| `2026-09-09-innfo-console-feedback-loop` | innfo-console Feedback Loop | `innfo-console-feedback`, `innfo-console-runtime`, `source-normalization-pipeline` |
| `2026-09-09-llm-efficiency` | LLM context efficiency | `source-normalization-pipeline` |
| `2026-09-09-nn-workspace-git-plus-collaboration-git-docs` | nn-workspace-git plus collaboration-git docs | `documentation-template`, `monorepo-release-manifest`, `workspace-git-collaboration` |
| `2026-09-09-validator-robustness` | Validator robustness | `cross-model-reference-validation`, `model-scaffold-robustness`, `submodel-conformance-validation`, `template-cache-staleness-detection`, `validation-baseline-differential` |
| `2026-09-10-dev-skills-concurrency-deploy-hardening` | Harden nn-dev Skills Against Concurrent-Session Deploy Pain | `dev-skills` |
| `2026-09-10-robustness-coda` | Robustness Coda | `model-scaffold-robustness`, `source-normalization-pipeline`, `submodel-conformance-validation`, `validation-baseline-differential` |
| `2026-09-11-conversation-author-attribution` | Conversation Author Attribution | `agent-modification-provenance`, `conversations-lifecycle` |
| `2026-09-11-dev-main-process-gaps` | Remaining Dev→Main Process Gaps | `quality-gates` |
| `2026-09-11-opencode-prompt-generator` | On-the-fly OpenCode Prompt Generator | - |
| `2026-09-11-rename-architecture-coach-to-assistant` | Rename Architecture Coach to Architecture Assistant | - |
| `2026-09-12-external-watch-roots-and-timestamped-sources` | External Watch Roots and Immutable Timestamped Primary Sources | `external-primary-sources` |
| `2026-09-12-lifecycle-narrative-and-dynamic-sources` | Lifecycle Narrative and Dynamic Sources Impact Checking | `documentation-narrative`, `dynamic-sources-impact-check` |
| `2026-09-12-metrics-console-adoption` | Metrics Console Adoption | `metrics-console-adoption` |
| `2026-09-12-templates-consoles-and-procedures-ecosystem` | Templates, Consoles, and Procedures Ecosystem | `templates-consoles-and-procedures-ecosystem` |
| `2026-09-12-virtual-workspace-and-use-cases-explorer` | Editor & UX Consolidation (Virtual Workspaces, Prompt Generator & Interactive Explorer) | `virtual-workspace-and-use-cases-explorer` |
| `2026-09-12-vocabulary-simplification` | Vocabulary Simplification — canonical term dictionary + `template` → `app` (user-facing) | `template-ecosystem-documentation` |
| `2026-09-12-workspace-console-hub-and-master-consolidation` | Workspace Console Hub & Canonical Template Console Consolidation | `workspace-console-hub` |
| `2026-09-13-all-sessions-retention-and-closing-flow` | All-Sessions Retention and Intuitive Closing Protocol | `conversations-lifecycle` |
| `2026-09-13-editor-tech-debt` | (no title) | - |
| `2026-09-13-innfo-mcp-lifecycle-integrity-fixes` | innfo-mcp Lifecycle Integrity Fixes | `cross-model-reference-validation`, `diagnostic-signal-quality`, `document-citations`, `model-discovery-predicate`, `model-scaffold-robustness`, `mutation-level-gating`, `template-cache-staleness-detection` |
| `2026-09-13-innfo-validation-resilience-and-schema-integrity` | iNNfo Validation Resilience and Schema Integrity | `innfo-skill-integrity`, `innfo-validation-resilience` |
| `2026-09-13-mcp-coverage-debt` | MCP Coverage Debt & Ratchet Gate | - |
| `2026-09-13-primary-sources-binary-linking-and-preflight-resilience` | Primary Sources Taxonomy, Binary Media Linking, and Preflight Resilience | `source-taxonomy-and-binary-linking` |
| `2026-09-13-samples-workspace-ssot-and-sync-pipeline` | Unified Samples Workspace SSOT & Distribution Pipeline | `samples-workspace-ssot` |
| `2026-09-13-silent-fallbacks-sweep` | Silent Fallbacks Sweep | - |
| `2026-09-13-simple-refactors-batch` | Simple Refactors Batch | - |
| `2026-09-13-template-composition-integrity-and-source-deduplication` | Template Composition Integrity, Source Content-Hash Deduplication, and Contextual Skill UX | `contextual-skill-ux`, `source-hash-deduplication`, `template-composition-integrity` |
| `2026-09-13-workspace-hub-regenerate-all-prompt` | Workspace Hub Agent Prompt Generator for Consoles Regeneration | `workspace-hub-prompt` |
| `2026-09-13-workspace-template-and-polymorphic-sources` | (no title) | `workspace-template` |
| `2026-09-16-2026-09-13-document-fidelity-and-provenance-integrity` | Document Fidelity & Provenance Integrity | `citation-provenance-typing`, `model-document-fidelity`, `mutation-schema-conformance`, `package-distribution`, `shipped-sample-workspace`, `template-version-ssot` |
| `2026-09-16-2026-09-14-unified-model-hierarchy-and-workspace-navigation` | Unified Model Hierarchy & Workspace Single-Root Navigation | `unified-model-hierarchy-and-navigation` |
| `2026-09-16-self-hosted-dogfooding-workspace` | (no title) | `self-hosted-dogfooding-workspace` |
| `2026-09-16-workspace-consolidation-and-skill-migration` | Workspace Consolidation, Root Dogfooding Catalogs, and Skill Migration | - |
| `2026-09-17-compact-workspace-metrics-and-pure-tree-navigation` | Compact Workspace Metrics and Pure Tree Navigation | `concept-tree-navigation`, `sidebar-workspace-metrics` |
| `2026-09-17-console-export-status-and-menu-alignment` | Console Export Status, Stale Inspection, and Menu Alignment | `console-export-cli`, `innfo-skill-menu`, `manifest-governance` |
| `2026-09-17-docs-use-cases-to-canonical-workspaces` | Transform Documentation Use Cases to Canonical Workspaces | `docs-workspace-explorer`, `sample-workspaces` |
| `2026-09-17-innfo-subsystem-tooling-unification` | iNNfo Subsystem Tooling Unification and Legacy Cleanup | `tooling-unification` |
| `2026-09-17-post-consolidation-reference-remediation` | Post-Consolidation Reference Remediation | `quality-gates` |
| `2026-09-17-relocate-workspace-explorer-to-info-view` | Relocate Workspace Explorer to Info View | `sidebar-navigation`, `workspace-file-explorer` |
| `2026-09-17-repository-reorganization-and-workspace-encapsulation` | Repository Structure Encapsulation, Simulation Renaming, and Legacy Cleanup | `repository-reorganization` |
| `2026-09-17-workspace-tree-navigation-and-empty-grouping` | Workspace Tree Navigation and Empty Grouping UX Refinement | `workspace-navigation` |
| `2026-09-17-workspace-tree-performance-and-store-indexing` | Workspace Tree Rendering Performance and Store Indexing Optimization | `tree-performance` |
| `2026-09-17-workspace-tree-submodel-recursion-and-theme` | Workspace Tree Submodel Recursion and Scaffolding Theme | `submodel-recursion` |
| `2026-09-18-multi-agent-guidance-and-ai-workflow-navigation` | Multi-Agent Guidance and AI Workflow Navigation | `ai-workflow-navigation`, `multi-agent-guidance` |
| `2026-09-18-nested-workspace-resolution-and-mutation-hygiene` | Nested Workspace Resolution and Mutation Hygiene | `model-mutation-references`, `source-list-grammar`, `workspace-sources-resolution` |
| `2026-09-18-semantic-ast-merge-and-modeler-save-hygiene` | Semantic AST Merge & Modeler Save Hygiene | `semantic-ast-merge` |
| `2026-09-21-dev-process-and-tooling-gaps` | Dev Process and Tooling Gaps | `dev-skills`, `quality-gates` |
| `2026-09-21-node-test-harness-migration` | Node Test Harness Migration (Discovery Loop & Harness Cleanup) | `quality-gates` |
| `2026-09-21-remove-template-extensions-and-custom-viewers` | Remove Template Extensions and Custom Viewers | `innfo-presentation` |
| `2026-09-21-repo-guardrails-hardening` | Repo Guardrails Hardening | `ci-stable-manifest-on-dev`, `native-pre-push-hook`, `normalize-frontmatter-level`, `safe-ff-merge-technique`, `untrack-skill-registry` |
| `2026-09-22-console-tab-filtering-and-workspace-hub-dedup` | Console Tab Filtering and Workspace Hub Deduplication | `innfo-console-runtime` |
| `2026-09-22-onboarding-bootstrap-flow-and-agent-docs` | Onboarding Bootstrap Flow & AI Agent Installation Guide | `onboarding-flow` |
| `2026-09-22-preflight-spec-freshness-identity` | Preflight Spec Freshness Identity Guard | `template-cache-staleness-detection` |
| `2026-09-22-scanner-destination-collision-and-duplicate-guards` | Scanner Destination Collision Guard & Content Duplicate Detection | `scanner-destination-collision-guard` |
| `2026-09-22-skill-channel-freshness-reporting` | Skill Channel Freshness Reporting | `atomic-state-write-investigation-closed`, `ci-subsystem-freshness-computation`, `preflight-freshness-reporting`, `skills-lifecycle-state-file-doc-fix` |
| `2026-09-22-workspace-agents-router-bootstrap` | Workspace AGENTS.md Router Bootstrap | `bootstrap-workflow`, `router-governance` |
| `2026-09-23-workspace-manifest-catalog-app-exclusion` | Exclude Catalog Apps from `## NN Models` Reconciliation | `workspace-manifest-reconciliation` |
| `2026-09-24-deprecate-legacy-innfodoc-route` | Deprecate Legacy `/innfo-doc` Route & Align Canonical Badges to Workspace-First | `document-badge`, `editor-routing` |
| `2026-09-24-release-single-source-versioning` | One Source of Truth Per Version, Derived Refs | `release-version-generation` |
| `2026-09-24-separate-procedures-and-executions` | Separate Procedure Definitions vs. Execution Runs in iNNfo Workspaces | `lineage-record-sync`, `workspace-executions-provenance` |
| `2026-09-26-console-tabbed-domain-views` | Change Proposal: Tabbed Domain Views for iNNfo Consoles | `console-tabbed-views` |
| `2026-09-26-skill-projection-drift-sync` | Skill Projection Drift Sync | `preflight-projection-drift`, `skill-agent-projection` |
| `2026-09-26-video-template-architecture` | Video Template Architecture (Script Skill, Project/Series Hierarchy, Placeholder Templates, Folder Contract) | `series-script-templates`, `video-folder-contract`, `video-production-hierarchy`, `video-script-skill`, `workspace-directory-conventions` |
| `2026-09-27-console-export-slots-and-standalone-pin` | Console Export JSON Slot Escaping and Standalone CDN Pinning | `console-export-slots-and-standalone-pin` |
| `2026-09-27-design-presets-template-and-video-integration` | Design Presets Template and Video Integration | `design-presets`, `video-template` |
| `2026-09-27-left-sidebar-editor-tree-and-header-views` | Left Sidebar Editor Tree and Header View Controls | `editor-navigation` |
| `2026-09-27-lineage-traceability-quickwins` | Lineage Traceability Quick Wins (Tanda A) | `artifact-staleness-diagnostic`, `citation-source-resolution`, `lineage-graph-legibility`, `typed-source-references` |
| `2026-09-27-skills-manager-node-modules-preservation` | Skills Manager node_modules Preservation and Dependency Self-Healing | `skills-manager-node-modules-preservation` |
| `2026-09-27-template-procedures-manifest-and-discovery` | Template Procedures Manifest Distribution and Dynamic MCP Discovery | `template-procedures-manifest-and-discovery` |
| `2026-09-27-traceability-vocabulary-unification` | Traceability Vocabulary Unification (Tanda B) | `document-citations`, `provenance-vocabulary`, `source-normalization-pipeline`, `template-release-tagging` |
| `2026-09-27-video-asset-and-thumbnail-pipeline` | Video Asset & Programmatic Thumbnail Pipeline | `two-phase-thumbnail`, `video-asset-pipeline` |
| `2026-09-28-console-citation-icons` | Console Citation Icons (Tanda C) | `citation-source-resolution`, `console-field-citations`, `innfo-console-runtime` |
| `2026-09-28-remotion-video-scenes-pipeline` | SDD Proposal: Remotion Video Scenes & Parallax Motion Pipeline | - |
| `2026-09-28-three-tier-consoles-and-asynchronous-review` | Three-Tier Console Architecture and Asynchronous Review | `console-architecture`, `review-workflow` |
| `2026-09-28-web-docs-single-source-of-truth` | Web and Docs Single Source of Truth | `docs-content-hygiene`, `docs-derived-facts`, `docs-install-guide`, `monorepo-release-manifest` |
| `2026-09-29-integrate-cognnitive-video-engine` | Integrate cogNNitive Video Engine | `cognnitive-video-engine`, `video-template` |
| `2026-09-29-nn-level-nomenclature-rename` | NN Level Nomenclature Rename (full migration, migrate-first) | `canonical-spec-hosting`, `canonical-vocabulary`, `domain-blueprint`, `domain-layout-migration`, `innfo-console-feedback`, `legacy-import-as-source`, `legacy-quarantine`, `level-identity-succession`, `manifest-governance`, `mcp-tool-naming`, `model-primitive-type`, `model-scaffold-robustness`, `preflight-freshness-reporting`, `release-version-generation`, `sample-workspaces`, `template-immutability-guard`, `template-package-structure`, `template-release-tagging`, `versioned-document-grammar`, `workspace-directory-conventions`, `workspace-entrypoint`, `workspace-entrypoint-resolution`, `workspace-template-upgrade` |
| `2026-09-30-2026-09-30-mcp-live-model-preview` | MCP-Served Live Model Preview | `mcp-live-preview` |
| `2026-09-30-2026-09-30-nn-nomenclature-commercial-web` | Commercial Web Nomenclature Alignment | `nomenclature-commercial-web` |
| `2026-09-30-2026-09-30-public-web-repository-split` | Public Web Repository Split | `canonical-spec-hosting`, `public-web-distribution` |
| `2026-09-30-2026-09-30-source-convergence-strategies` | Source Convergence Strategies | `source-convergence-strategies` |
| `2026-09-30-console-cleanup-and-lint` | Console cleanup and shell lint | `console-architecture`, `console-export-cli`, `console-shell-integrity` |
| `2026-09-30-console-design-tokens-and-ui-kit` | Console design tokens and UI kit | `console-architecture`, `console-ui-kit`, `innfo-console-runtime` |
| `2026-09-30-console-feedback-roundtrip` | Console feedback round-trip | `console-export-cli`, `console-export-slots-and-standalone-pin`, `console-payload-builder`, `feedback-verdict-ledger`, `innfo-console-feedback`, `innfo-console-runtime` |
| `2026-09-30-console-review-ux` | Console review UX | `console-review-mode`, `innfo-console-feedback` |
| `2026-09-30-external-watch-roots-session-digest` | Session-Start External Watch Root Digest | `external-watch-roots-session-digest` |
| `2026-09-30-fix-video-engine-runtime-refs` | Fix Video Engine Runtime References | `cognnitive-video-engine` |
| `2026-09-30-harden-migrate-domain-destructive-ops` | Harden nn-upgrade Migration Against Data Loss | `domain-layout-migration` |
| `2026-09-30-harden-publish-web` | Harden publish-web | `public-web-distribution` |
| `2026-09-30-render-engine-layer-text-content` | Scene compiler reads `layer_text_content` for text layers | - |
| `2026-09-30-self-hosted-video-engine` | Vendor the VUS Parser and Retire the VidGeNN Pin | `video-script-parser`, `video-script-skill` |
| `2026-10-01-align-scene-compiler-with-vus-parser` | Align the Scene Compiler with the Vendored VUS Parser | `cognnitive-video-engine` |
| `2026-10-01-batch-domain-update` | Batch Domain Update (nn-upgrade Flow C) | `batch-domain-update` |
| `2026-10-01-console-feedback-roundtrip-completion` | Console feedback round-trip completion | `console-export-cli`, `console-export-slots-and-standalone-pin`, `console-field-citations`, `console-payload-builder`, `feedback-verdict-ledger`, `innfo-console-feedback`, `innfo-console-runtime` |
| `2026-10-01-console-review-ux` | Console review UX | `console-review-mode`, `innfo-console-feedback` |
| `2026-10-01-console-ui-kit` | Console UI kit and design tokens | `console-architecture`, `console-ui-kit`, `innfo-console-runtime` |
| `2026-10-01-console-unified-review-pipeline` | Console Unified Review Pipeline | `console-architecture`, `console-export-cli`, `console-export-slots-and-standalone-pin`, `console-payload-builder`, `console-review-mode`, `console-shell-integrity`, `console-ui-kit`, `feedback-verdict-ledger`, `innfo-console-feedback`, `innfo-console-runtime` |
| `2026-10-01-lineage-single-edge` | Lineage as a Single Citation Edge | `citation-parser-resolver`, `console-field-citations`, `document-citations`, `editor-lineage-ui`, `lineage-bluepriNNts-docs`, `lineage-record-sync`, `lineage-single-edge`, `nn-trannsform-lineage-checks`, `source-sidecar` |
| `2026-10-01-nn-domain-state-probe` | Domain State Probe and Single Activation-Gate Owner | `domain-state-probe`, `single-gate-owner` |
| `2026-10-01-nn-entry-contract-repair` | Repair the nn-* Skill Contract and Guard Against Drift | `router-governance`, `skill-contract-guard`, `template-dynamic-discovery` |
| `2026-10-01-nn-entry-followup` | Consolidated /nn Entry-Flow Follow-up & Defect Remediation | `canonical-layout-and-gates`, `domain-state-probe`, `entry-contract-repair`, `entry-job-menu-and-routing` |
| `2026-10-01-nn-entry-job-menu` | Job-Based `/nn` Entry Menu, Unified Procedures, and Wizard Consolidation | `nn-entry-job-menu`, `session-language-policy`, `unified-procedure-catalog` |
| `2026-10-01-nn-workspace-layout-canonical` | Canonical Workspace Layout (`kNNowledge/`) End to End | `bootstrap-workflow`, `preflight-freshness-reporting`, `workspace-layout` |
| `2026-10-01-single-developer-dev-workflow` | Single-developer development workflow | `dev-skills`, `quality-gates`, `safe-ff-merge-technique` |
| `2026-10-01-visual-catalog-blueprint` | `visual-catalog` Level-2 BluepriNNt | `citation-source-resolution`, `manifest-governance`, `template-dynamic-discovery`, `template-ecosystem-documentation`, `template-package-structure`, `template-procedures-manifest-and-discovery`, `typed-source-references`, `visual-catalog-blueprint` |
| `2026-10-01-web-update-portal-and-manifest-serving` | Public Web Update Portal and CDN Manifest Serving | `public-update-hub` |
| `2026-10-02-cognitivize-in-place` | Cognitivize in Place | `canonical-vocabulary`, `citation-parser-resolver`, `cognitivize-in-place`, `console-export-cli`, `conversations-lifecycle`, `document-citations`, `dynamic-sources-impact-check`, `editor-lineage-ui`, `generic-source-integrity-audit`, `lineage-drift-gate`, `lineage-record-sync`, `lineage-single-edge`, `lineage-version-status`, `model-discovery-predicate`, `nn-naming-contract`, `nn-trannsform-lineage-checks`, `sample-workspaces`, `scanner-destination-collision-guard`, `sidecar-blueprint`, `source-normalization-pipeline`, `source-sidecar`, `source-versioning-archive`, `template-procedures-manifest-and-discovery`, `typed-source-references`, `workspace-directory-conventions`, `workspace-sources-resolution`, `workspace-template-upgrade`, `write-once-artifacts` |
| `2026-10-02-tag-driven-release` | Tag-Driven Release ("build once, release by tag") | `ci-stable-manifest-on-dev`, `dev-skills`, `monorepo-release-manifest`, `public-web-distribution`, `quality-gates`, `release-version-generation`, `tag-driven-release-workflow`, `template-release-tagging` |
| `2026-10-02-tag-driven-release-followups` | Tag-Driven Release Follow-ups | - |
| `2026-10-03-console-hub-entry-and-theming` | Console Hub Entry Points and App-Consistent Theming | `console-hub-onboarding`, `workspace-hub-prompt` |
| `2026-10-03-self-contained-video-skill-deps` | Self-Contained Video Skill Dependencies | `cognnitive-video-engine`, `video-script-skill`, `video-skill-dependency-bundling` |
| `2026-10-04-fresh-install-distribution-fixes` | Fresh-Install Distribution Fixes | - |
| `2026-10-04-samples-version-coherence-guard` | Samples Version Coherence Guard | `samples-version-coherence` |
| `2026-10-04-video-composition-media-types` | Video Composition Media Types | `cognnitive-video-engine` |
| `2026-10-08-console-ui-modern-foundation` | Modern Console UI Foundation (Preact + HTM, DaisyUI, Lucide) | `console-ui-foundation` |
| `2026-10-09-console-schema-parity` | console-schema-parity | `console-payload-builder`, `console-schema-resolution`, `template-package-structure` |
| `2026-10-09-embed-video-script-skill` | Embed nn-video-script inside the `video` bluepriNNt | `template-package-structure`, `template-procedures-manifest-and-discovery`, `video-script-skill`, `video-template` |
| `2026-10-09-nn-procedure-executor` | nn-procedure-executor | `innfo-skill-menu`, `procedure-execution`, `router-governance` |
| `2026-10-09-nn-skills-hygiene` | nn-skills-hygiene | `conversations-lifecycle`, `router-governance`, `skill-shared-rules` |
| `2026-10-09-video-blueprint-architecture` | Video Blueprint Architecture & Ephemeral Overlays Migration | `cognnitive-video-engine`, `ephemeral-overlays`, `video-blueprint` |
| `2026-10-10-2026-10-04-lineage-modal-simplify` | Lineage Modal Simplification (File Preview) | `file-preview-modal-ui`, `lineage-focus-resolution`, `lineage-timeline-view` |
| `2026-10-10-2026-10-07-changeset-apply-and-versioning` | Changeset Apply and Versioning (Slice S2a) | `changeset-apply-engine`, `changeset-document-model`, `field-citation-provenance`, `knowledge-version-and-snapshot` |
| `2026-10-10-2026-10-07-changeset-conflicts-and-deletes` | Changeset Conflicts and Deletes (Slice S2b) | `batch-slug-resolution`, `changeset-conflicts`, `delete-impact-and-lifecycle` |
| `2026-10-10-2026-10-07-domain-bootstrap-cleanup` | Domain Bootstrap Cleanup (conversations auto-promote + domaiNN parent_spec fix) | - |
| `2026-10-10-2026-10-07-stable-element-identity` | Stable Element Identity (Slice S1) | `editor-lineage-ui`, `model-mutation-references`, `stable-element-identity`, `typed-source-references` |
| `2026-10-10-2026-10-08-console-changes-unification` | Console Changes Unification | - |
| `2026-10-10-2026-10-08-console-tiddlywiki-patterns` | Console TiddlyWiki Patterns (Declarative Filter Syntax & Live Draft Overlay) | - |
| `2026-10-10-2026-10-08-domain-console-hierarchy-and-omnibar` | Domain Console Hierarchy, Knowledge Unit Identity & Faceted Omnibar | - |
| `2026-10-10-2026-10-09-domain-console-views` | Domain Console Views (one console, registered views) | `console-architecture`, `console-hub-onboarding`, `console-tabbed-views`, `console-view-registry`, `editor-lineage-ui`, `editor-navigation`, `innfo-console-feedback`, `innfo-console-runtime`, `innfo-skill-menu`, `metrics-console-adoption`, `nn-naming-contract`, `template-procedures-manifest-and-discovery`, `workspace-hub-prompt` |
| `2026-10-10-2026-10-10-domaiNN-root-canonicalization` | Canonicalize `domaiNN` roots (direction B — simplify, add `bluepriNNts`) | - |
| `2026-10-10-reconcile-video-script-specs` | Reconcile video-script specs with the shipped engine | `cognnitive-video-engine`, `template-package-structure`, `template-procedures-manifest-and-discovery`, `video-template`, `workspace-directory-conventions` |
| `2026-10-10-video-script-native-model` | Model video scripts natively as iNNfo (replace the VUS artifact) | `cognnitive-video-engine`, `ephemeral-overlays`, `series-script-templates`, `video-blueprint`, `video-script-skill`, `video-skill-dependency-bundling` |
| `2026-10-11-console-ku-badge-unification` | Knowledge-unit badge unification in the console | `console-payload-builder`, `console-review-mode`, `console-ui-kit` |
| `2026-10-12-2026-10-12-console-review-hardening` | console review hardening | `changeset-apply-engine`, `console-export-cli`, `console-review-mode`, `feedback-verdict-ledger`, `innfo-console-runtime` |
| `2026-10-12-nested-l3-elements` | Nested Level-3 Elements via Heading Hierarchy | `nested-l3-elements`, `series-script-templates`, `video-script-model`, `video-script-skill` |
| `2026-10-13-2026-10-13-changeset-first-class-and-lineage` | #1A — changeset as a valid L3 document with proposal-time evidence citation | `changeset-apply-engine`, `changeset-document-model`, `innfo-console-runtime`, `lineage-single-edge` |
| `2026-10-13-2026-10-13-changeset-immutability-and-snapshot-removal` | #1B — proposal immutability on apply and removal of the model snapshot | `changeset-apply-engine`, `field-citation-provenance`, `knowledge-version-and-snapshot` |
| `2026-10-13-2026-10-13-console-changes-view-and-slug-ids` | #1C — console Changes view, slug element ids, Lineage vocabulary and draft store | `console-export-cli`, `console-payload-builder`, `console-review-mode`, `console-view-registry`, `provenance-vocabulary` |
| `2026-10-13-single-console-shell` | One console shell (scoped domain console) | `console-architecture`, `console-export-cli`, `console-field-citations`, `console-payload-builder`, `console-review-mode`, `console-schema-resolution`, `console-scope`, `console-ui-kit`, `console-view-registry`, `editor-lineage-ui`, `innfo-console-feedback`, `innfo-console-runtime`, `lineage-single-edge`, `metrics-console-adoption`, `nn-naming-contract`, `template-procedures-manifest-and-discovery` |
| `2026-10-14-2026-10-10-blueprint-external-skills` | Blueprint-recommended external skills (pinned, integrity-verified) | `blueprint-external-skills`, `template-package-structure`, `template-procedures-manifest-and-discovery` |
| `2026-10-14-2026-10-13-s2c-retire-legacy-provenance` | S2c — retire legacy provenance (feedback JSON, verdict ledger, Agent Modification, change-log) | `agent-modification-provenance`, `changeset-document-model`, `citation-source-resolution`, `console-export-cli`, `console-payload-builder`, `console-review-mode`, `feedback-verdict-ledger`, `innfo-console-feedback`, `nn-naming-contract`, `review-workflow`, `source-normalization-pipeline`, `source-sidecar`, `template-procedures-manifest-and-discovery` |
| `2026-10-14-2026-10-13-s4-retire-legacy-migration-flows` | S4 — retire the in-place legacy migration flows and the name-based reference read | `stable-element-identity`, `workspace-template-upgrade` |
| `2026-10-14-2026-10-13-s6-console-regeneration-and-propose` | S6 — console regeneration, `add_model` and `propose_changeset` | `changeset-apply-engine`, `changeset-document-model`, `changeset-propose-tool`, `console-export-cli`, `console-regeneration`, `console-review-mode`, `domain-initialization`, `model-scaffold-robustness`, `write-once-artifacts` |
| `2026-10-14-2026-10-14-matrix-header-context-resolution` | Matrix header reference resolution by declared `source`/`target` context | `stable-element-identity` |
| `2026-10-15-2026-09-30-nn-quarantine-removal` | Retire the Legacy Quarantine After the Migration Window | `legacy-quarantine` |
| `2026-10-15-2026-10-13-s3-domain-console-and-edit-modal` | S3 — domain console parity gate and edit modal | `canonical-vocabulary`, `changeset-apply-engine`, `console-architecture`, `console-export-cli`, `console-payload-builder`, `console-review-mode`, `console-ui-kit`, `innfo-console-runtime` |
| `2026-10-15-2026-10-13-s5-retire-innfo-editor` | S5 — freeze the Vue editor now, delete it later | `canonical-spec-hosting`, `canonical-vocabulary`, `console-architecture`, `docs-workspace-explorer`, `document-badge`, `dual-mode-sidebar`, `editor-lineage-ui`, `editor-navigation`, `editor-routing`, `editor-tag-authoring`, `element-concept-tags`, `file-preview-modal-ui`, `hosted-app-retirement-notice`, `lineage-focus-resolution`, `lineage-graph-legibility`, `lineage-timeline-view`, `mcp-live-preview`, `model-primitive-type`, `normalize-frontmatter-level`, `provenance-vocabulary`, `quality-gates`, `template-derived-taxonomy`, `template-freshness-diagnostic`, `typed-source-references` |
| `2026-10-16-greenfield-domain-ux-and-tooling` | Greenfield Domain Setup, Tooling Ergonomics & Agent UX Polish | - |
| `2026-10-18-console-change-lifecycle` | Console Change Lifecycle — One Concept, One Signal, One Toast | `console-review-mode` |
| `2026-10-18-fields-replace-markers-and-tags` | Fields replace Markers and Tags | `base-composite-template`, `canonical-vocabulary`, `changeset-apply-engine`, `console-architecture`, `console-export-cli`, `console-payload-builder`, `console-review-mode`, `console-ui-kit`, `element-concept-tags`, `field-value-model`, `innfo-console-runtime`, `innfo-skill-menu`, `markers-removed-diagnostic`, `model-scaffold-robustness`, `mutation-level-gating`, `template-includes-collision-resolution`, `workspace-entrypoint`, `workspace-template-upgrade` |
| `2026-10-18-unified-knowledge-unit-badges` | Unified knowledge-unit badges | `changeset-document-model`, `console-field-citations`, `console-payload-builder`, `console-review-mode`, `console-ui-kit`, `console-view-registry`, `innfo-console-runtime`, `knowledge-unit-address` |
| `bundle-templates-and-skills` | Bundle Templates and Skills | `template-skill-bundling`, `workspace-entrypoint-resolution` |
| `migrate-release-manifest` | Migrate Release Manifest to Monorepo | `monorepo-release-manifest` |
| `migrate-spec-hosting-to-monorepo` | Migrate Canonical Spec Hosting to the Monorepo | `canonical-spec-hosting`, `submodel-conformance-validation` |
| `reorder-workspace-template-concepts` | Reorder Workspace Template Concepts | `workspace-template-spec` |
