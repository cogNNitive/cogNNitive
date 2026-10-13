# Design: S5 — retire the Vue editor, the hosted app and the MCP live preview

## Preconditions

1. S3 complete: `audit.md` reviewed, its *port* rows applied. Every S5 REMOVED delta for
   an editor feature follows an audit decision; if the audit ported a feature (for example
   a workspace lineage graph view), the console requirement lives in S3's deltas and the
   editor requirement is still removed here.
2. S6 complete: preview is a regenerated console file; the knowledge scaffold lives in
   `innfo-core` (`scaffoldKnowledgeDocument`); `init_knowledge` is an `add_model` wrapper.

## Coupling inventory (verified 2026-10-13)

| Area | Location | Action |
|------|----------|--------|
| App | `iNNfo/apps/innfo-editor/**` (~290 files) | delete |
| npm | root `package.json` `typecheck` / `test` / `test:coverage` (hardcode the editor workspace), devDeps `eslint-plugin-vue`, `vue-eslint-parser`; `package-lock.json` | edit; regenerate the lockfile (build-only, no `npm ci` from the worktree: node_modules are junctions) |
| Lint | `eslint.config.mjs` (Vue config) | edit |
| CI | `.github/workflows/ci.yml:137,149,152`; `release.yml` if it names the editor | edit |
| Config | `openspec/config.yaml` (module list, `per_package.innfo-editor`, coverage note) | edit |
| Dev scripts | `run-dev.bat`, `iNNfo/run-dev.bat` | delete or edit |
| Ignore | `.gitignore:14-15` (`docs/innfo/app/...`) | delete lines |
| Ledger | `legacy-ledger.yaml:56-60` (`editor-legacy-domain`) | delete entry (its code is deleted) |
| Scripts | `scripts/build-docs.mjs` (app build + deploy to `docs/innfo/app/`), `scripts/sync-versions.mjs` + `sync-versions.test.mjs:98`, `scripts/check-integrity.js`, `scripts/check-spec-version.mjs:285`, `scripts/migrate-spec-urls.mjs`, `scripts/migrate-spec-urls-web.mjs`, `scripts/lib/nn-name-regex-guard.js:50-53` + test | edit |
| Guard kept | `scripts/guard-template-immutability.js:231` normalizes old badge URLs (`innfo/app/`, `innfo-doc`) found in published write-once `_V_` specs | KEEP; extend so the new badge line is equivalent too; comment why |
| Tests | `scripts/generate-about-twin.test.mjs`, `test/no-workspace-hub-references.test.mjs:34-35`, `iNNfo/packages/innfo-core/tests/legacy/layout/retired-paths.test.ts:13`, `iNNfo/packages/innfo-core/tests/console-dom.test.ts`, `console-citations-dom.test.ts` (editor mentions) | edit |
| Baseline | `iNNfo/validation-baseline.json` (editor paths) | regenerate |
| Core comments | `innfo-core/src/{sourceRef.ts,types/graph.ts,validator/content.ts,workspace/integrity/report.ts,workspace/integrity/versionStatus.ts}` | reword |
| MCP | `innfo-mcp/src/tools/preview-server.ts` (`PREVIEW_APP_URL` `:21`), `withPreview` (`server.ts:124`, `:884`, `:959`), `src/server-preview.test.ts` (asserts `?view=editor`) | delete |
| Badge emitters | `innfo-core/src/parser/serializer.ts`, `src/changeset/serializer.ts`, `src/schema/canonical-registry.ts`, the shared scaffold (`src/scaffold/knowledge.ts`, from S6), console `innfo-runtime.js` `serializeChangesetMarkdown`, every maintained `iNNfo/specs/bluepriNNts/**/spec_NN.md` and procedure template | retarget |
| Samples / fixtures | `_samples_nn/**`, `docs/cognitive_nn/use-cases/**`, `ecosystem_NN/**`, `docs/workspace_NN.md`, `test/fixtures/testlab/**` (regenerated), simulation fixtures | retarget (not write-once ones) |
| Docs | delete `docs/innfo/documentation/innfo-editor.md`, `live-preview.md`; edit `usage.md`, `specifications.md`, `README.md`, `_sidebar.md`, `_navbar.md`, `ai-index.yaml`, `documentation_NN.md`, `index.html`, `llms.txt`, `tags-and-taxonomy.md`, `innfo-core.md`, `docs/innfo/llms.txt`, `docs/innfo/llms-full.txt`, `docs/innfo/about.{md,html}`, `docs/index.{md,html}`, `docs/innfo/index.html`, `docs/404.html`, `docs/skills/**`, `docs/use-cases.{md,html}`, `docs/contact.html`, `docs/legal.html`, `docs/privacy.html` | edit |
| Tracked app files | `docs/innfo/app/404.html`, `docs/innfo/app/starter/*_NN.md` (4) | delete |
| Root docs | `README.md:34`, `.agents/skills/nn-dev-check-integrity/SKILL.md` | edit |

## Decisions

- **CTAs.** "Open App" (`docs/index.html:899`, `docs/innfo/index.html:338`) becomes
  "Read the docs" linking `https://cognnitive.com/innfo/documentation/`. No redirect page is
  left at `/innfo/app/` (no backwards-compat artifacts); the old URL 404s.
- **Badge.** The canonical line becomes
  `> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.`
  Maintained templates bump `template_version`; write-once `_V_` specs keep the old line.
- **Scaffold notice.** S6 kept the old bytes so `init_knowledge` output stayed identical;
  S5 updates `scaffoldKnowledgeDocument`, the templates and `canonical-registry.ts`
  together and refreshes the scaffold golden test.
- **Guardrail.** `rg "innfo-editor|innfo/app/"` returns nothing outside: `iNNfo/specs/**/*_V_*`
  (write-once), `openspec/changes/archive/**`, `scripts/guard-template-immutability.js`
  (the normalization, commented), `legacy-ledger.yaml` history-free (entry deleted), and
  this change directory. The match is on `innfo/app/` (not `docs/innfo/app`).
- **Living specs.** Disposition per capability is the delta set of this change; specs
  whose requirements are all removed stay as empty capability files after archive (repo
  convention).

## Cross-cutting

Releases after the `dev → main` batch: `innfo-mcp-v*`, `innfo-console-v*`,
`blueprints-v*`, `skills-v*`, per `.agents/skills/nn-dev-release/SKILL.md`.
