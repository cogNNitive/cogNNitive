# Tasks: S5 — freeze the Vue editor now, delete it later

`strict_tdd: true`: each group leads with the guard or test that must end green. Tasks cite
the requirement they serve as `[capability: Requirement]`.

- **Section A — S5-freeze: ships now. No dependency on S3 or S6.**
- **Section B — S5-delete: DEFERRED.** Do not start it, and do not sync or archive anything
  under `deferred-delete/specs/`, until the Section B preconditions hold.

## Review Workload Forecast

| Item | Phase A (freeze) | Phase B (delete, deferred) |
|------|------------------|----------------------------|
| Estimated changed lines | ~250 edited, 1 new test (~90), 1 FROZEN.md (~60), lock regen; **plus 81 generated snapshot files (5.6 MB, not reviewed line by line)** | ~600 edited / ~52,000 deleted plus mechanical badge edits in ~200 files |
| 400-line budget risk | Low for hand-written lines; the snapshot is generated output and goes in its own commit | Low per slice, High by raw count |
| Chained PRs recommended | No. One PR with work-unit commits: docs, snapshot, guard + deps, decouple, FROZEN.md | Yes: S5a, S5b-1, S5b-2, S5b-3, S5c-1, S5c-2, S5d |
| Decision needed before apply | No (maintainer decided variant A3 on 2026-10-14) | Yes: preconditions B.0 and the badge/CTA questions in `2026-10-13-DEPENDENCIES.md` |

## Release plan

Tag-driven; never hand-edit pins; this change does not tag.

- Phase A touches no release-owned path, so it needs no `skills-v*`, `blueprints-v*`,
  `innfo-mcp-v*` or `innfo-console-v*` tag; `node scripts/verify.js --release` must stay green.
- Integration: normal batched `dev -> main` (`nn-dev-development` section 4). After the push,
  the `site` job publishes the committed snapshot, so confirm `https://cognnitive.com/innfo/app/`
  still serves.
- Recommended (maintainer, at integration time): lightweight restore-point tag
  `innfo-editor-frozen` on the `dev` commit immediately before the freeze lands.
- Phase B cuts `innfo-mcp-v<next>`, `innfo-console-v<next>`, `blueprints-v<next>`,
  `skills-v<next>` per `.agents/skills/nn-dev-release/SKILL.md`, after its own batch.

---

## A. S5-freeze (variant A3)

### A1. Snapshot (before any decoupling, while the editor is still gated)

- [x] A1.1 Build the hosted app once in a session worktree with its own real install:
      `npm --workspace=@cognnitive/innfo-editor run build` (vue-tsc + vite, offline, `base=/innfo/app/`).
- [x] A1.2 TEST: extend `scripts/guard-text-encoding.test.js` so `docs/innfo/app/assets/**`
      is skipped while other files still fail on U+FFFD; then implement the skip.
      [quality-gates: A frozen app is outside every gate]
- [x] A1.3 Copy `dist/` into `docs/innfo/app/` (keep `404.html` and `starter/`), remove
      `.gitignore:14-15`, add `docs/innfo/app/assets/` to `.prettierignore`. Commit the snapshot alone.
      [quality-gates: A frozen app is outside every gate]

### A2. Guard first, then dependencies

- [x] A2.1 TEST (red): `test/editor-freeze.test.mjs` per `design.md` Guard test, including a
      planted-reference fixture proving it can fail. It fails today.
      [quality-gates: A frozen app is outside every gate]
- [x] A2.2 Move `jsdom` and `happy-dom` to root `devDependencies` (same ranges as the
      editor); regenerate `package-lock.json` with `npm install --package-lock-only`.
      [quality-gates: A frozen app is outside every gate]

### A3. Decouple (each edit leaves the guard greener)

- [x] A3.1 Root `package.json`: drop `iNNfo/apps/*` from `workspaces`; strip the editor from
      `typecheck`, `test`, `test:coverage`; regenerate the lock; reword the pre-push header comment.
      [quality-gates: A frozen app is outside every gate]
- [x] A3.2 `.github/workflows/ci.yml` `quality` job: remove the editor typecheck, test and build steps.
      [quality-gates: A frozen app is outside every gate]
- [x] A3.3 `scripts/check-integrity.js`: remove the editor test run (Group 5) and the
      `samples.ts` wording in Group 2b; `.agents/skills/nn-dev-check-integrity/**` mentions.
      [quality-gates: Coverage and spec URLs in the local pre-push mirror]
- [x] A3.4 TEST then edit `scripts/sync-versions.mjs` + `sync-versions.test.mjs`: no `samples.ts`
      target; MCP/core version sync unchanged. [quality-gates: A frozen app is outside every gate]
- [x] A3.5 `scripts/build-docs.mjs`: remove the editor build, the `docs/innfo/app/` staging
      and the `assets/` rmSync. [quality-gates: MCP CDN bundle staging is independent of the docs build]
- [x] A3.6 TEST then edit `legacy-write-guard.js` and `nn-name-regex-guard.js`: drop the
      `iNNfo/apps/<app>/src` scope and the 4 editor allowlist entries; update their tests.
      Leave the ledger entry and markers. [quality-gates: A frozen app is outside every gate]
- [x] A3.7 `eslint.config.mjs`: ignore `iNNfo/apps/innfo-editor/**` (replaces the
      `scratch_graph_test.mjs` entry). `run-dev.bat`, `iNNfo/run-dev.bat`: remove the editor block.
      `openspec/config.yaml`: remove the `innfo-editor` workspace and test line.
      [quality-gates: A frozen app is outside every gate]

### A4. Document and verify

- [x] A4.1 `iNNfo/apps/innfo-editor/FROZEN.md`: state, rationale, what is gone from the gates,
      thaw steps (re-add the workspace line, restore the three scripts and CI steps, `npm install`,
      `npm --workspace=@cognnitive/innfo-editor test`), what rots (`samples.ts`,
      `shipped-template-versions.test.ts` would fail, newer L3 and changeset shapes), deletion is the end state.
- [x] A4.2 Before `verify.js`: `npm --workspace=@cognnitive/innfo-core run build` and
      `npm --workspace=@cognnitive/innfo-mcp run build`. Then `node scripts/verify.js`,
      `npm run typecheck`, `npm test`, `npm run check:spec-urls`, `npm run check:versions`.
- [x] A4.3 Record deviations from the study under "Verification notes"; hand off to the maintainer.
- [ ] A4.4 (maintainer, at integration; not done in the session) Spec bookkeeping when the freeze lands: sync `specs/quality-gates` into
      `openspec/specs/quality-gates` and move the delta to `applied/specs/quality-gates`.
      **Do not archive this change directory and do not sync `deferred-delete/`.**

### Verification notes

Verified on `session/s5-freeze-editor` after a clean `npm ci`: `node scripts/verify.js` green
(includes `test/editor-freeze.test.mjs`), `npm run typecheck`, `npm test` (core + mcp), `npm run lint`
(0 errors), `check:spec-urls`, `check:versions`, `build:docs`. Deviations from the study:

- jsdom importers: 14 `test/` files (plus `test/helpers/console-boot.mjs`) and 3 core files, not 10 + 2.
  `happy-dom` is used through `@vitest-environment` pragmas in core.
- The lockfile on `dev` was already stale (workspace versions 0.14.2 vs 0.19.0, `peggy` / `fast-check`
  entries no package declares). `npm install --package-lock-only` also kept the dropped editor as an
  `extraneous` entry, so that one entry was deleted before the final regeneration (stable on re-run,
  `npm ci --dry-run` and a real `npm ci` pass). The lock diff is therefore large; review it as a regeneration.
- `scripts/sync-versions.test.mjs` called `syncVersions` without `samplesTsPath` in some cases, so it
  rewrote the live editor `samples.ts`; removing the target fixed that.
- The snapshot is 81 files, 5.6 MB; two chunks contain a literal U+FFFD, hence the encoding-guard
  prefix exemption and the `.prettierignore` entry (CI format check is changed-files-only).
- `check-spec-version.mjs:285` and `migrate-spec-urls*.mjs` fixture skips are kept: the fixtures still exist.
- Not done: tagging `innfo-editor-frozen` (sessions never tag); a browser smoke test of the snapshot
  (needs serving under `/innfo/app/`); A4.4 spec sync.
- `docs/innfo/blueprints/catalog.json` drifts by 4 lines after `build:docs` on `dev` independent of this change (reverted).

---

## B. S5-delete (DEFERRED)

### B.0 Preconditions (all required)

- [x] B.0.1 S3a audit reviewed and S3b ports applied; S6 applied. Shas: S3b ports `ba68e66e` (groups 9-12), `c1322989` (group 13), S3 archived in `299708a1` (2026-10-15); S6 `985487ab`, `e27d881f`, archived in `9166521f` (2026-10-14).
- [x] B.0.2 The maintainer has dogfooded the domain console (S3b and S6).
- [x] B.0.3 The maintainer gives explicit sign-off to delete. Granted 2026-10-15: "Adelante con ese 5 delete".
- [x] B.0.4 Move `deferred-delete/specs/*` back to `specs/` (the freeze delta is already applied). Done with `git mv`; `deferred-delete/` no longer exists.

Marked **[done by freeze]** below means Section A already did it; Phase B only confirms.

### B1. MCP live preview (S5a)

- [x] B1.1 TEST (`iNNfo/packages/innfo-mcp/src/server.spec.ts`): no tool result carries a preview URL; tool list and descriptions never mention a live preview or the hosted app. [mcp-live-preview: Loopback Preview Server (REMOVED)] [mcp-live-preview: Preview URL Advertisement (REMOVED)] [mcp-live-preview: Change Event Stream (REMOVED)] [mcp-live-preview: Read-Only Editor Live Mode (REMOVED)] [mcp-live-preview: Endpoint Access Control (REMOVED)]
- [x] B1.2 Delete `innfo-mcp/src/tools/preview-server.ts` (`PREVIEW_APP_URL`), `withPreview` and call sites in `server.ts`, and `src/server-preview.test.ts` (and `src/tools/preview-server.test.ts`); rebuild the bundle. [mcp-live-preview: Loopback Preview Server (REMOVED)] [mcp-live-preview: Preview URL Advertisement (REMOVED)] [mcp-live-preview: Change Event Stream (REMOVED)]
- [x] B1.3 Delete `docs/innfo/documentation/live-preview.md` and its sidebar and llms entries. [mcp-live-preview: Read-Only Editor Live Mode (REMOVED)] [mcp-live-preview: Endpoint Access Control (REMOVED)]

### B2. Delete the app and the workspace leftovers (S5b-1)

- [ ] B2.1 Delete `iNNfo/apps/innfo-editor/**` (including `FROZEN.md`) and `docs/innfo/app/**` EXCEPT `docs/innfo/app/index.html`, which is rewritten as the static retirement notice page (maintainer override 2026-10-15, see `design.md` Deviations and `specs/hosted-app-retirement-notice/spec.md`): delete `404.html`, `starter/`, `assets/` and the A3 snapshot. [hosted-app-retirement-notice: Retired app address serves one static notice page] [hosted-app-retirement-notice: Notice page explains the replacement and links to the docs] [editor-lineage-ui: Pills and modal use the core parser and resolver (REMOVED)] [editor-lineage-ui: Explorer classifies files by contract role (REMOVED)] [editor-lineage-ui: Preview modal UI strings are English (REMOVED)] [editor-lineage-ui: Lineage tab uses the single edge (REMOVED)] [editor-lineage-ui: Editor reverse lookup uses canonical path equality (REMOVED)] [editor-lineage-ui: New bluepriNNt versions are registered (REMOVED)] [editor-lineage-ui: Read-Only Guard for Level 3 kNNowledge Models (D18) (REMOVED)] [editor-navigation: Sidebar Dedicated to Model and Concept Tree Navigation (REMOVED)] [editor-navigation: Workspace View Controls in Header (REMOVED)] [editor-navigation: Tree Node Selection Reactivity Across Workspace Views (REMOVED)] [editor-routing: Deprecation and Redirection of Legacy Editor Routes (REMOVED)] [editor-routing: Removal of Legacy Single-Document View and Tests (REMOVED)] [editor-tag-authoring: Element Tag Inspection in Read Mode (REMOVED)] [editor-tag-authoring: Element Tag Authoring in Edit Mode (REMOVED)] [editor-tag-authoring: Concept Tag Authoring and Display (REMOVED)]
- [ ] B2.2 **[done by freeze]** root `package.json` scripts and workspaces. Remaining: drop `eslint-plugin-vue` and `vue-eslint-parser`; regenerate the lock (`--package-lock-only`). [quality-gates: Coverage and spec URLs in the local pre-push mirror]
- [ ] B2.3 `eslint.config.mjs` Vue config and the ignore entry; delete `run-dev.bat` / `iNNfo/run-dev.bat` if empty; `README.md:34`. [dual-mode-sidebar: Sidebar Mode and Ancestry State Management (REMOVED)] [dual-mode-sidebar: Workspace Mode View Rendering (REMOVED)] [dual-mode-sidebar: Focused Model Mode View Rendering (REMOVED)] [dual-mode-sidebar: Multi-Level Breadcrumb Ancestry Navigation (REMOVED)] [dual-mode-sidebar: Hierarchical Submodel Nesting Under Owning Element in ConceptTreeNode (REMOVED)]
- [ ] B2.4 `legacy-ledger.yaml`: delete `editor-legacy-domain` together with its two markers' files; `legacy-ledger-guard.js` green. [template-freshness-diagnostic: Web Editor Displays Warning Without Mutating Files (REMOVED)]

### B3. Scripts and CI leftovers (S5b-2)

- [ ] B3.1 **[done by freeze]** `build-docs.mjs`, `sync-versions.mjs` (+test), `check-integrity.js` editor group, `ci.yml`, the two guard scopes. Confirm only. [quality-gates: MCP CDN bundle staging is independent of the docs build] [canonical-spec-hosting: Editor Runtime Spec Base Constant (REMOVED)] [template-derived-taxonomy: Sidebar Taxonomy Rendering (REMOVED)]
- [ ] B3.2 `scripts/check-spec-version.mjs:285`, `scripts/migrate-spec-urls.mjs`, `scripts/migrate-spec-urls-web.mjs`: drop editor fixture skips. [canonical-spec-hosting: Editor Runtime Spec Base Constant (REMOVED)]
- [ ] B3.3 `scripts/guard-template-immutability.js:231`: KEEP the old-URL normalisation; extend so the new badge normalises to the same value; comment why. [document-badge: Canonical Markdown Header Badge Syntax and Target URL]
- [ ] B3.4 Remove the snapshot exemptions (encoding guard, prettier) with the snapshot.

### B4. Tests, baselines and core comments (S5b-3)

- [ ] B4.1 `scripts/generate-about-twin.test.mjs`, `test/no-workspace-hub-references.test.mjs`, `retired-paths.test.ts:13`, `tests/console-dom.test.ts`, `tests/console-citations-dom.test.ts`: drop editor paths. [lineage-graph-legibility: Mermaid renders at natural size, top-down (REMOVED)] [lineage-graph-legibility: 4th-level outgoing relationships collapse by default (REMOVED)] [lineage-timeline-view: Lineage style switch defaults to Timeline (REMOVED)] [lineage-timeline-view: Timeline renders the known provenance chain (REMOVED)] [lineage-timeline-view: Timeline nodes expose element identity (REMOVED)] [lineage-timeline-view: Timeline is built from an extensible chain structure (REMOVED)]
- [ ] B4.2 Regenerate `iNNfo/validation-baseline.json` without editor entries. [lineage-focus-resolution: Unit-pointed opens default to Preview (REMOVED)] [lineage-focus-resolution: Preview auto-scrolls to the targeted unit (REMOVED)] [lineage-focus-resolution: Plain opens keep the content-type default (REMOVED)] [file-preview-modal-ui: Original File action is always visible (REMOVED)] [file-preview-modal-ui: Low-signal metadata is collapsed behind a more-menu (REMOVED)] [file-preview-modal-ui: Mode toggles are compact icons (REMOVED)] [file-preview-modal-ui: The traceability affirmation is not a permanent footer band (REMOVED)]
- [ ] B4.3 Reword editor mentions in `innfo-core/src/{sourceRef.ts,types/graph.ts,validator/content.ts,workspace/integrity/report.ts,workspace/integrity/versionStatus.ts}`. [typed-source-references: Single shared source-reference parser] [typed-source-references: Source fields are typed onto the graph] [normalize-frontmatter-level: Downstream `level` defenses are removed]
- [ ] B4.4 Model-creation, tag and preset UI leave with the app (S3 audit decisions recorded). [model-primitive-type: Editor Widget Registry and Field Viewer (REMOVED)] [model-primitive-type: Inline Submodel Creation and Scaffolding in FieldModel (REMOVED)] [element-concept-tags: Global Tag Registry and Reactive State Aggregation (REMOVED)] [element-concept-tags: TagInput Autocompletion UI Component (REMOVED)] [element-concept-tags: Header Search Tag Filtering Integration (REMOVED)] [docs-workspace-explorer: Web Application Preset Deep-Links (REMOVED)] [provenance-vocabulary: Per-field editor envelope is named edit attribution (REMOVED)] [provenance-vocabulary: Per-field edit envelope is named edit attribution]

### B5. Badge emitters and templates (S5c-1) — off the freeze critical path

- [ ] B5.1 TEST (`iNNfo/packages/innfo-core/tests/serializer*.test.ts`, the scaffold suite, `tests/changeset/serializer.test.ts`, `test/console-review.test.mjs`): every emitter writes the canonical badge; the scaffold golden is refreshed. [document-badge: Serializer and Generator Badge Emission]
- [ ] B5.2 Retarget `src/parser/serializer.ts`, `src/changeset/serializer.ts`, `src/scaffold/knowledge.ts`, `innfo-runtime.js` `serializeChangesetMarkdown`, and the `nn-sources` emitters `skills/nn-sources/scripts/lib/bootstrap.js` and `provenance-knowledge.js`; rebuild the console and innfo-mcp bundles. [document-badge: Serializer and Generator Badge Emission]
- [ ] B5.3 Retarget every maintained `iNNfo/specs/bluepriNNts/**/spec_NN.md` and procedure template, bump `template_version`, regenerate `canonical-registry.ts` and the catalog. Never edit a `_V_x-y-z_` file. [document-badge: Canonical Markdown Header Badge Syntax and Target URL]

### B6. Samples, fixtures and docs (S5c-2)

- [ ] B6.1 Retarget the badge in `_samples_nn/**`, `ecosystem_NN/**`, `docs/cognitive_nn/use-cases/**`, `docs/workspace_NN.md`, `docs/innfo/samples/**` (non-write-once), `simulation/**` fixtures; regenerate `test/fixtures/testlab`. [document-badge: Workspace Fixture and Sample Alignment]
- [ ] B6.2 Docs: delete `docs/innfo/documentation/innfo-editor.md`; edit `usage.md`, `specifications.md`, `README.md`, `_sidebar.md`, `_navbar.md`, `ai-index.yaml`, `documentation_NN.md`, `index.html`, `llms.txt`, `tags-and-taxonomy.md`, `innfo-core.md`, `docs/innfo/llms.txt`, `docs/innfo/llms-full.txt`, `docs/innfo/about.{md,html}`. [canonical-vocabulary: Canonical term dictionary is machine-readable and human-visible] [canonical-vocabulary: Excluded senses of "template"]
- [ ] B6.3 CTAs: "Open App" in `docs/index.html` and `docs/innfo/index.html` becomes "Read the docs"; remove app links in `docs/404.html`, `docs/skills/**`, `docs/use-cases.{md,html}`, `docs/contact.html`, `docs/legal.html`, `docs/privacy.html`. No redirect page, and `/innfo/app/` is NOT removed from navigation as a 404: it serves the notice page (override 2026-10-15), so the app CTAs may point to it where that is the better UX. [document-badge: Workspace Fixture and Sample Alignment]
- [ ] B6.4 At archive: edit `openspec/specs/documentation-template/spec.md:36` to drop `innfo-editor.md`. [all requirements]

### B7. Guard and verification (S5d)

- [ ] B7.1 Replace `test/editor-freeze.test.mjs` with `test/no-editor-references.test.mjs`: `innfo-editor` and `innfo/app/` occur nowhere outside the design allowlist. Allowlist amendment (2026-10-15): `docs/innfo/app/index.html` (the notice page, the only file allowed under `docs/innfo/app/`) and its spec `specs/hosted-app-retirement-notice/`. The Pages publish guard (today in `test/editor-freeze.test.mjs`, asserting `index.html` + `assets/`) asserts `index.html` only and that `assets/` is absent. Interim: B2 already rewrote that guard section in `editor-freeze.test.mjs`. [console-architecture: Two-Pathway Authorship and Review] [console-architecture: Three-Pathway Authorship and Review (REMOVED)]
- [ ] B7.2 `npm run typecheck`; `npm test`; `node scripts/verify.js`; `npm run check:integrity`. [all requirements]
- [ ] B7.3 After the `dev -> main` batch: `innfo-mcp-v<next>`, `innfo-console-v<next>`, `blueprints-v<next>`, `skills-v<next>` per `nn-dev-release`. [all requirements]
