# Tasks: S5 — retire the Vue editor, the hosted app and the MCP live preview

Deletion slice. `strict_tdd: true`: each group leads with the guard or test that must
end green. Every task names the requirement it serves as `[capability: Requirement]`.
Pre-conditions: S3 complete (audit reviewed, ports applied) and S6 complete.

## Review Workload Forecast

| Item | Value |
|------|-------|
| Estimated changed lines | ~600 edited / ~52,000 deleted (the app) plus mechanical badge edits in ~200 files |
| 400-line budget risk | Low for review per slice (deletions and mechanical edits), High by raw count |
| Chained PRs recommended | Yes — S5a (MCP), S5b-1 (app + workspace + root config), S5b-2 (scripts and CI), S5b-3 (tests, baselines, core comments), S5c-1 (badge emitters + templates), S5c-2 (samples, fixtures, docs), S5d (guard) |
| Decision needed before apply | Yes — dependency file questions 1 and 2 (badge wording and URL, CTA target) |

## 1. Preconditions

- [ ] 1.1 Confirm S3 `audit.md` is reviewed and its ports are applied, and S6 is applied;
      record both commit shas in the PR. [all requirements]

## 2. MCP live preview (S5a)

- [ ] 2.1 TEST (`iNNfo/packages/innfo-mcp/src/server.spec.ts`): no tool result carries a
      preview URL; the tool list and descriptions never mention a live preview or the
      hosted app. [mcp-live-preview: Loopback Preview Server (REMOVED)] [mcp-live-preview: Preview URL Advertisement (REMOVED)] [mcp-live-preview: Change Event Stream (REMOVED)] [mcp-live-preview: Read-Only Editor Live Mode (REMOVED)] [mcp-live-preview: Endpoint Access Control (REMOVED)]
- [ ] 2.2 Delete `innfo-mcp/src/tools/preview-server.ts` (`PREVIEW_APP_URL`),
      `withPreview` and its call sites in `server.ts` (`:124`, `:884`, `:959`), and
      `src/server-preview.test.ts`; rebuild the innfo-mcp bundle. [mcp-live-preview: Loopback Preview Server (REMOVED)] [mcp-live-preview: Preview URL Advertisement (REMOVED)] [mcp-live-preview: Change Event Stream (REMOVED)]
- [ ] 2.3 Delete `docs/innfo/documentation/live-preview.md` and its sidebar and llms entries.
      [mcp-live-preview: Read-Only Editor Live Mode (REMOVED)] [mcp-live-preview: Endpoint Access Control (REMOVED)]

## 3. Delete the app and the workspace (S5b-1)

- [ ] 3.1 Delete `iNNfo/apps/innfo-editor/**` and the tracked `docs/innfo/app/**` files (5).
      [editor-lineage-ui: Pills and modal use the core parser and resolver (REMOVED)] [editor-lineage-ui: Explorer classifies files by contract role (REMOVED)] [editor-lineage-ui: Preview modal UI strings are English (REMOVED)] [editor-lineage-ui: Lineage tab uses the single edge (REMOVED)] [editor-lineage-ui: Editor reverse lookup uses canonical path equality (REMOVED)] [editor-lineage-ui: New bluepriNNt versions are registered (REMOVED)] [editor-lineage-ui: Read-Only Guard for Level 3 kNNowledge Models (D18) (REMOVED)] [editor-navigation: Sidebar Dedicated to Model and Concept Tree Navigation (REMOVED)] [editor-navigation: Workspace View Controls in Header (REMOVED)] [editor-navigation: Tree Node Selection Reactivity Across Workspace Views (REMOVED)] [editor-routing: Deprecation and Redirection of Legacy Editor Routes (REMOVED)] [editor-routing: Removal of Legacy Single-Document View and Tests (REMOVED)] [editor-tag-authoring: Element Tag Inspection in Read Mode (REMOVED)] [editor-tag-authoring: Element Tag Authoring in Edit Mode (REMOVED)] [editor-tag-authoring: Concept Tag Authoring and Display (REMOVED)]
- [ ] 3.2 Root `package.json`: remove the editor from `typecheck`, `test`, `test:coverage`;
      drop `eslint-plugin-vue` and `vue-eslint-parser`; regenerate `package-lock.json`
      (build-only; no `npm ci` from a worktree). [quality-gates: Coverage and spec URLs in the local pre-push mirror]
- [ ] 3.3 `eslint.config.mjs` (Vue config), `.gitignore:14-15`, `run-dev.bat`,
      `iNNfo/run-dev.bat`, `openspec/config.yaml` (module list, `per_package.innfo-editor`,
      coverage note), `README.md:34`. [dual-mode-sidebar: Sidebar Mode and Ancestry State Management (REMOVED)] [dual-mode-sidebar: Workspace Mode View Rendering (REMOVED)] [dual-mode-sidebar: Focused Model Mode View Rendering (REMOVED)] [dual-mode-sidebar: Multi-Level Breadcrumb Ancestry Navigation (REMOVED)] [dual-mode-sidebar: Hierarchical Submodel Nesting Under Owning Element in ConceptTreeNode (REMOVED)]
- [ ] 3.4 `legacy-ledger.yaml`: delete the `editor-legacy-domain` entry (its code is deleted;
      condition overridden by the retirement); `legacy-ledger-guard.js` green.
      [template-freshness-diagnostic: Web Editor Displays Warning Without Mutating Files (REMOVED)]

## 4. Scripts and CI (S5b-2)

- [ ] 4.1 `scripts/build-docs.mjs`: drop the app build and the `docs/innfo/app/` deploy.
      [quality-gates: MCP CDN bundle staging is independent of the docs build] [quality-gates: MCP CDN bundle staging is independent of the editor build (REMOVED)]
- [ ] 4.2 `scripts/sync-versions.mjs` + `sync-versions.test.mjs:98`: drop the editor package.
      [canonical-spec-hosting: Editor Runtime Spec Base Constant (REMOVED)]
- [ ] 4.3 `scripts/check-integrity.js` (editor group) and `.agents/skills/nn-dev-check-integrity/SKILL.md`.
      [quality-gates: Coverage and spec URLs in the local pre-push mirror]
- [ ] 4.4 `scripts/check-spec-version.mjs:285`, `scripts/migrate-spec-urls.mjs`,
      `scripts/migrate-spec-urls-web.mjs`: drop editor paths.
      [canonical-spec-hosting: Editor Runtime Spec Base Constant (REMOVED)]
- [ ] 4.5 `scripts/lib/nn-name-regex-guard.js:50-53` + its test: drop editor paths.
      [template-derived-taxonomy: Sidebar Taxonomy Rendering (REMOVED)]
- [ ] 4.6 `.github/workflows/ci.yml:137,149,152` and `release.yml`: drop editor steps.
      [quality-gates: MCP CDN bundle staging is independent of the docs build]
- [ ] 4.7 `scripts/guard-template-immutability.js:231`: KEEP the old-URL normalization
      (published write-once specs contain those URLs); extend it so the new badge line
      normalizes to the same value; comment why. [document-badge: Canonical Markdown Header Badge Syntax and Target URL]

## 5. Tests, baselines and core comments (S5b-3)

- [ ] 5.1 `scripts/generate-about-twin.test.mjs`, `test/no-workspace-hub-references.test.mjs:34-35`,
      `iNNfo/packages/innfo-core/tests/legacy/layout/retired-paths.test.ts:13`,
      `tests/console-dom.test.ts`, `tests/console-citations-dom.test.ts`: drop editor paths.
      [lineage-graph-legibility: Mermaid renders at natural size, top-down (REMOVED)] [lineage-graph-legibility: 4th-level outgoing relationships collapse by default (REMOVED)] [lineage-timeline-view: Lineage style switch defaults to Timeline (REMOVED)] [lineage-timeline-view: Timeline renders the known provenance chain (REMOVED)] [lineage-timeline-view: Timeline nodes expose element identity (REMOVED)] [lineage-timeline-view: Timeline is built from an extensible chain structure (REMOVED)]
- [ ] 5.2 Regenerate `iNNfo/validation-baseline.json` without editor entries.
      [lineage-focus-resolution: Unit-pointed opens default to Preview (REMOVED)] [lineage-focus-resolution: Preview auto-scrolls to the targeted unit (REMOVED)] [lineage-focus-resolution: Plain opens keep the content-type default (REMOVED)] [file-preview-modal-ui: Original File action is always visible (REMOVED)] [file-preview-modal-ui: Low-signal metadata is collapsed behind a more-menu (REMOVED)] [file-preview-modal-ui: Mode toggles are compact icons (REMOVED)] [file-preview-modal-ui: The traceability affirmation is not a permanent footer band (REMOVED)]
- [ ] 5.3 Reword editor mentions in `innfo-core/src/{sourceRef.ts,types/graph.ts,validator/content.ts,workspace/integrity/report.ts,workspace/integrity/versionStatus.ts}`.
      [typed-source-references: Single shared source-reference parser] [typed-source-references: Source fields are typed onto the graph] [normalize-frontmatter-level: Downstream `level` defenses are removed]
- [ ] 5.4 Model-creation, tag and preset UI leave with the app (S3 audit decisions recorded).
      [model-primitive-type: Editor Widget Registry and Field Viewer (REMOVED)] [model-primitive-type: Inline Submodel Creation and Scaffolding in FieldModel (REMOVED)] [element-concept-tags: Global Tag Registry and Reactive State Aggregation (REMOVED)] [element-concept-tags: TagInput Autocompletion UI Component (REMOVED)] [element-concept-tags: Header Search Tag Filtering Integration (REMOVED)] [docs-workspace-explorer: Web Application Preset Deep-Links (REMOVED)] [provenance-vocabulary: Per-field editor envelope is named edit attribution (REMOVED)] [provenance-vocabulary: Per-field edit envelope is named edit attribution]

## 6. Badge emitters and templates (S5c-1)

- [ ] 6.1 TEST (`iNNfo/packages/innfo-core/tests/serializer*.test.ts`, the scaffold suite,
      `tests/changeset/serializer.test.ts`, `test/console-review.test.mjs`): every emitter
      writes the canonical badge; the scaffold golden is refreshed.
      [document-badge: Serializer and Generator Badge Emission]
- [ ] 6.2 Retarget `src/parser/serializer.ts`, `src/changeset/serializer.ts`,
      `src/scaffold/knowledge.ts`, `innfo-runtime.js` `serializeChangesetMarkdown`, and the `nn-sources` emitters
      `skills/nn-sources/scripts/lib/bootstrap.js` and `provenance-knowledge.js`; rebuild
      the console and innfo-mcp bundles. [document-badge: Serializer and Generator Badge Emission]
- [ ] 6.3 Retarget every maintained `iNNfo/specs/bluepriNNts/**/spec_NN.md` and procedure
      template (unversioned files), bump each touched template's `template_version`,
      regenerate `canonical-registry.ts` and the catalog. Never edit a `_V_x-y-z_` file.
      [document-badge: Canonical Markdown Header Badge Syntax and Target URL]

## 7. Samples, fixtures and docs (S5c-2)

- [ ] 7.1 Retarget the badge in `_samples_nn/**`, `ecosystem_NN/**`, `docs/cognitive_nn/use-cases/**`,
      `docs/workspace_NN.md`, `docs/innfo/samples/**` (non-write-once), `simulation/**`
      fixtures; regenerate `test/fixtures/testlab`. [document-badge: Workspace Fixture and Sample Alignment]
- [ ] 7.2 Docs: delete `docs/innfo/documentation/innfo-editor.md`; edit `usage.md`,
      `specifications.md`, `README.md`, `_sidebar.md`, `_navbar.md`, `ai-index.yaml`,
      `documentation_NN.md`, `index.html`, `llms.txt`, `tags-and-taxonomy.md`, `innfo-core.md`,
      `docs/innfo/llms.txt`, `docs/innfo/llms-full.txt`, `docs/innfo/about.{md,html}`.
      [canonical-vocabulary: Canonical term dictionary is machine-readable and human-visible] [canonical-vocabulary: Excluded senses of "template"]
- [ ] 7.3 CTAs: "Open App" in `docs/index.html:899` and `docs/innfo/index.html:338` becomes
      "Read the docs" (`https://cognnitive.com/innfo/documentation/`); remove app links in
      `docs/404.html`, `docs/skills/**`, `docs/use-cases.{md,html}`, `docs/contact.html`,
      `docs/legal.html`, `docs/privacy.html`. No redirect page. [document-badge: Workspace Fixture and Sample Alignment]
- [ ] 7.4 At archive: edit `openspec/specs/documentation-template/spec.md:36` (an
      unstructured spec with no requirement heading to delta) to drop `innfo-editor.md`.
      [all requirements]

## 8. Guard and verification (S5d)

- [ ] 8.1 Guard test (`test/no-editor-references.test.mjs`): `innfo-editor` and `innfo/app/`
      occur nowhere outside the design allowlist. [console-architecture: Two-Pathway
      Authorship and Review] [console-architecture: Three-Pathway Authorship and Review (REMOVED)]
- [ ] 8.2 `npm run typecheck`; `npm test`; `node scripts/verify.js`; `npm run check:integrity`.
      [all requirements]
- [ ] 8.3 After the `dev → main` batch: `innfo-mcp-v<next>`, `innfo-console-v<next>`,
      `blueprints-v<next>`, `skills-v<next>` per `.agents/skills/nn-dev-release/SKILL.md`.
      [all requirements]
