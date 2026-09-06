# Exploration: migrate-spec-hosting-to-monorepo

Scope is fixed by the locked decisions: (1) rewrite `spec_url` / `parent` / `parent_spec` / `spec.url` frontmatter in every spec file (including frozen) from base `https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/` to `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/`; (2) make the URL checker strict — fail on any remaining `cogNNitive/iNNfo` reference, no dual-base.

## Answer 1 — Classification of the 119 matches

Rewrite rule ("MIGRATE") = `raw.githubusercontent.com/cogNNitive/iNNfo/(main|v0.1.x)/<path>` -> `raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/<path>` (dropping any abandoned `v0.1.x` tag pin), and `github.com/cogNNitive/iNNfo/blob/main/<path>` -> `github.com/cogNNitive/cogNNitive/blob/main/iNNfo/<path>`.

### Bucket A — Canonical spec / template / model frontmatter — MUST MIGRATE

**A1. L1 + defiNNe specs** (`spec_url` L3, `parent` name/url ~L5 + repeated ~L307, `spec.url` ~L529, prose "It declares `parent:`" ~L914):
- `iNNfo\specs\iNNfo_V_0-2-1_NN.md`
- `iNNfo\specs\iNNfo_V_0-2-0_NN.md` (frozen)
- `iNNfo\specs\iNNfo_V_0-1-0_NN.md` (frozen)
- `iNNfo\specs\defiNNe_V_0-1-0_NN.md` (frozen — also has `includes[].url` ~L173/351/356)

**A2. L2 template specs** (`iNNfo/specs/templates/`, both `V_0-1-0` and `V_0-2-0`; `business*`/`business-model*` also carry multi-line `includes[].url`):
- `iNNfo\specs\templates\workspace_V_0-2-0_spec_NN.md`, `workspace_V_0-1-0_spec_NN.md`, `workspace_spec_NN.md`
- `iNNfo\specs\templates\base\base_V_0-1-0_spec_NN.md`
- `analysis\analysis_V_0-2-0_NN.md`, `analysis\analysis_V_0-1-0_NN.md`
- `blank\blank_V_0-2-0_NN.md`, `blank\blank_V_0-1-0_NN.md`
- `business\business_V_0-2-0_NN.md`, `business\business_V_0-1-0_NN.md`
- `business-model\business-model_V_0-2-0_NN.md`, `business-model\business-model_V_0-1-0_NN.md`
- `cogNNitive\cogNNitive_V_0-2-0_NN.md`, `cogNNitive\cogNNitive_V_0-1-0_NN.md`
- `innovation\innovation_V_0-2-0_NN.md`, `innovation\innovation_V_0-1-0_NN.md`
- `organization\organization_V_0-2-0_NN.md`, `organization\organization_V_0-1-0_NN.md`
- `procedures\procedures_V_0-2-0_NN.md`, `procedures\procedures_V_0-1-0_NN.md`
- `projects\projects_V_0-2-0_NN.md`, `projects\projects_V_0-1-0_NN.md`
- `documentation\V_0-2-0\spec_NN.md`, `documentation\V_0-1-0\spec_NN.md`

**A3. L3 sample models** (`iNNfo/specs/templates/**/samples/`, `parent_spec.url` ~L5; two `business` samples also reference `.../samples/master.html` in the body):
- `analysis\samples\Ghostbusters_V_0-2-0_analysis_NN.md`
- `business\samples\Ghostbusters_V_0-2-0_business_NN.md` (+ body ~L828), `business\samples\Ghostbusters_V_0-1-0_business_NN.md` (+ body ~L671)
- `innovation\samples\Ghostbusters_V_0-2-0_innovation_NN.md`
- `organization\samples\Ghostbusters_V_0-2-0_organization_NN.md`
- `procedures\samples\Ghostbusters_V_0-2-0_procedures_NN.md`
- `projects\samples\Ghostbusters_V_0-2-0_projects_NN.md`
- `documentation\V_0-2-0\samples\Ghostbusters_V_0-2-0_documentation_NN.md`, `documentation\V_0-1-0\samples\Ghostbusters_V_0-1-0_documentation_NN.md`
- `base\samples\workspace_NN.md`, `base\samples\Ghostbusters_V_0-1-0_base_NN.md`, `base\samples\Ghostbusters_cogNNitive_NN.md`

**A4. Procedure sub-models under the documentation template** (`parent_spec.url` ~L5):
- `iNNfo\specs\templates\documentation\V_0-2-0\procedures\generate_docsify_suite_NN.md`
- `iNNfo\specs\templates\documentation\V_0-1-0\procedures\generate_docsify_sidebar_NN.md`

**A5. Sample reference HTML under `specs/`** (one `<a href>` raw URL ~L266, referenced by the A3 business samples):
- `iNNfo\specs\templates\business\samples\master.html`

**A6. Root `specs/` island** (see Answer 3):
- `specs\iNNfo_V_0-2-0_NN.md`, `specs\defiNNe_V_0-1-0_NN.md`
- `specs\templates\innfo\V_0-2-0\innfo_V_0-2-0_NN.md`, `specs\templates\innfo\V_0-2-0\spec_NN.md`
- `specs\templates\definne\V_0-1-0\definne_V_0-1-0_NN.md`, `specs\templates\definne\V_0-1-0\spec_NN.md`

**A7. Docs-tree model files** (frontmatter `parent_spec.url` / `spec.url`; docsify-suite source models):
- `docs\workspace_NN.md`
- `docs\innfo\documentation\documentation_NN.md`
- `docs\actionn\documentation\documentation_NN.md`

**A8. Editor runtime — bundled spec references** (ship in the built app; see Answer 2):
- `iNNfo\apps\innfo-editor\src\config\samples.ts` — `REMOTE_SAMPLE_BASE` const (L13)
- `iNNfo\apps\innfo-editor\src\views\StandaloneProcedureView.vue` — `canonicalSampleMarkdown` literal, L80 + L84
- `iNNfo\apps\innfo-editor\src\ai-guide\procedure_NN.md` — bundled guide frontmatter, L3 + L7
- `iNNfo\apps\innfo-editor\src\components\editor\ModelInfoPanel.vue` — `:href` template literal (L249, dynamic `${formatVersion}`) + visible text (L254)

**A9. actioNN / skill template + model copies** (not archived, live frontmatter):
- `actioNN\skills\nn-innfo\templates\workspace_spec_NN.md` (L3, L7, L140)
- `actioNN\models\Test_V_1-0-0_procedures_NN.md` (L3, L7)
- `docs\actionn\templates\workflow\V_0-1-0\workflow_V_0-1-0_NN.md` (L3, L7, L165)
- `docs\actionn\templates\workflow\V_0-1-0\samples\example_V_1-0-0_workflow_NN.md` (L3)
- `docs\actionn\templates\workflow\V_0-1-0\documentation.md` (fenced example, L89)

### Bucket B — Prose / doc references in `docs/**` — MIGRATE for consistency

- `docs\specifications.md` — yaml example `url:` (L67, L69) + two `github.com/.../blob/main/...` links (L111-112)
- `docs\innfo\documentation\specifications.md` — 7 `github.com/cogNNitive/iNNfo/blob/main/specs/templates/.../samples/...` links (L58-64)
- `docs\innfo\documentation\citations-provenance.md` — yaml example `url:` (L99)
- `docs\innfo\template-package-spec.md` — yaml example `url:` (L64, L67, L74)
- `docs\innfo\repair-guide.md` — JSON example `"template_url"` (L42)
- `docs\use\manifest.md` — mirror of the manifest: `repo: cogNNitive/iNNfo` x10 + one pinned bundle URL (L34-125)
- `docs\use\manifest-next.md` — same shape (L34-125)

`docs/use/manifest*.md` mirror `manifest/source.yaml`; if the yaml stays (recommended), keep these in sync with it — i.e. do NOT migrate their `repo:` slugs.

### Bucket C — Incidental repo links / skill docs / runtime consts — CASE BY CASE

- `iNNfo\CONTRIBUTING.md:142` — Spanish prose describing the CI check. REWORD to the new base.
- `actioNN\AGENTS.md:88` — "The canonical file always lives in `cogNNitive/iNNfo` under `specs/templates/`". REWORD -> `cogNNitive/cogNNitive` under `iNNfo/specs/templates/`.
- `actioNN\skills\nn-innfo\SKILL.md:252-255` — canonical spec URL list shown to agents. MIGRATE.
- `actioNN\skills\nn-trannsform\scripts\lib\provenance-model.js:5,7` — hardcoded canonical L1 / cogNNitive-template URLs used as runtime provenance defaults. MIGRATE (JS string consts).
- `.agents\skills\nn-template-audit\SKILL.md:101-107` — raw template URLs in a yaml block. MIGRATE.
- `iNNfo\.agents\skills\nn-dev-spec-version-propagator\SKILL.md:134-135` — example raw URLs. MIGRATE.
- `iNNfo\packages\innfo-mcp\README.md:77,80,87` — example composite manifest. MIGRATE (docs).
- `manifest\source.yaml` — `repo: cogNNitive/iNNfo` x~20 + `channels.*.refs[].repo` + `ref_key: innfo-mcp`. GitHub repo slug resolved over the API at a pinned tag, not a raw URL. RECOMMEND OUT OF SCOPE (see Answer 6 + Risks). The strict checker as designed will not reach it.

### Bucket D — Test assertions / fixture inputs

**Key finding: NO test asserts the canonical URL string as an expected value.** Every match is an inline fixture input (fake model markdown fed to a parser/resolver) or manifest-tooling test data. Migrating Bucket A breaks none of these.

**D1. Inline model fixtures** (`parent_spec.url` / `template_url` inside test strings) — safe to leave, optional to migrate:
- `iNNfo\packages\innfo-core\src\resolver.spec.ts:134`
- `iNNfo\packages\innfo-core\tests\workspace-spec-c.test.ts:72`
- `iNNfo\packages\innfo-core\tests\workspace-taxonomy-submodels.test.ts:174`
- `iNNfo\packages\innfo-mcp\test\includes-and-scaffold.test.ts:30` (`l1Url()` helper)
- `iNNfo\packages\innfo-mcp\test\mutate-repair.test.ts:22,42` (`template_url` arg; path `specs/latest/level2/...` is already non-existent)
- `iNNfo\apps\innfo-editor\tests\component\InfoDocView.test.ts:15`
- `iNNfo\apps\innfo-editor\tests\component\ModelInfoPanel-version.test.ts:51` (old `specs/v0.2.0/level2/...` layout)
- `iNNfo\apps\innfo-editor\tests\component\ModelInfoPanel-templateBadge.test.ts:34`
- `iNNfo\apps\innfo-editor\tests\unit\validator.test.ts:6,10,24,28` (`v0.1.1` tag-pinned)

**D2. e2e fixtures — NOT run in CI** (`quality` job runs only `vitest run`; `test:e2e` / `playwright test` is never invoked by `.github/workflows/ci.yml`). Migration is cosmetic:
- `iNNfo\apps\innfo-editor\e2e\00-bug-report-mini-test.spec.ts:12,16,80,84`
- `iNNfo\apps\innfo-editor\e2e\11-color-propagation.spec.ts:19,56,137,173` (old `specs/v0.1.0/level*/...`)
- `iNNfo\apps\innfo-editor\e2e\14-url-navigation.spec.ts:12`

**D3. Byte-exact parser fixtures — LEAVE ALONE** (`.prettierignore` protects `**/fixtures/**` and `**/*.md`; header comments require byte-exactness for golden/smoke tests; several reference paths that never existed in the monorepo):
- `iNNfo\apps\innfo-editor\tests\fixtures\models\{mini-file_V_0-0-1_business_F, iNNv0_Innovation_Process_V_1-0-0_procedures_F, Ghostbusters_V_0-1-1_business_F, FORMAT_V_0-1-1_business_F, FORMAT_V_0-1-0_business_F, EngineeringTeam_V_1-0-0_organization_F, Comprehensive_Test_Procedure_V_1-0-0_procedures_F}.md`

**D4. Manifest / skills tooling tests** — exercise the manifest tooling with `repo: cogNNitive/iNNfo` as data; `.js` files (not touched by the strict checker's extension filter). Migrate only if `manifest/source.yaml` migrates:
- `scripts\manifest\validate-manifest.test.js` (L216, 283, 318, 350, 359, 368, 382, 386, 390)
- `scripts\manifest\generate-manifest.test.js:60,73,81`
- `actioNN\scripts\skills-manager.test.js:170`

### Bucket E — Historical / frozen — LEAVE ALONE

`check-spec-version.mjs` already skips any dir named `archive` unless `--include-archives`.
- `openspec\changes\archive\2026-09-05-submodel-element-tree-and-creation\{verify-report,design}.md`
- `openspec\changes\archive\2026-09-05-workspace-entity-evolution\design.md`
- `openspec\changes\archive\2026-09-03-manifest-release-integrity\{proposal,verify-report,design}.md`
- `openspec\changes\archive\2026-09-03-manifest-release-integrity\specs\{template-skill-bundling,manifest-release-integrity}\spec.md`
- `openspec\changes\archive\2026-09-02-template-package-and-composition\exploration.md`
- `openspec\changes\archive\2026-09-02-submodels-recursive-and-spec-alignment\verify-report.md`
- `openspec\changes\archive\2026-09-02-submodels-recursive-and-spec-alignment\specs\submodel-conformance-validation\spec.md`
- `openspec\changes\archive\bundle-templates-and-skills\{verify-report,design,exploration}.md`
- `iNNfo\openspec\changes\archive\2026-09-01-complete-innfo-v0-2-0-adoption\{design,archive-report}.md`
- `iNNfo\openspec\changes\archive\2026-08-19-spec-version-simplification\{design,archive-report}.md`
- `temp\citaciones test\citaciones test_V_0-1-0_cogNNitive_NN.md` (scratch dir)

**Not actually frozen — needs a call:** `openspec\specs\submodel-conformance-validation\spec.md:65` is an **active** capability spec (not under `archive/`); L65 is a `GIVEN` example with `target_template:: https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/procedures/procedures_V_0-1-0_NN.md`. Recommend **MIGRATE**.

### Bucket F — Built artifacts — LEAVE ALONE

- `docs\innfo\cdn\innfo-mcp-v0.2.1.bundle.js:227` — compiled bundle, `-diff` in `.gitattributes`, regenerated by `build:docs` (current mcp version is `0.2.4`, so this `v0.2.1` file is itself a stale orphan).
- Any `**/dist/**`, `docs/innfo/app/assets/**`.

## Answer 2 — Editor runtime: literals vs derived; single source of truth; starter files

**Not a single source of truth.** Two independent hardcoded bases:

| Concern | Location | Form |
|---|---|---|
| L2 sample fetch base | `src/config/samples.ts` `REMOTE_SAMPLE_BASE` (L13) | one const; `SAMPLE_BASE = DEV ? '/specs/templates' : REMOTE_SAMPLE_BASE` |
| L1 spec URL (`iNNfo_<ver>_NN.md`) | `components/editor/ModelInfoPanel.vue:249,254`, `views/StandaloneProcedureView.vue:80,84`, `ai-guide/procedure_NN.md:3,7` | each hardcoded inline; ModelInfoPanel builds it with `${formatVersion}` |

`SAMPLE_BASE` consumers: `composables/useWorkspaceScaffolding.ts` (`getStarterByTemplate`), plus `views/HomeView.vue` and `components/layout/SetupWizard.vue` (per `tests/unit/sample-urls.test.ts`, which asserts >=9 `${SAMPLE_BASE}/...` literals across those three files — it checks `_V_0-1-0_` staleness and on-disk path existence under `iNNfo/specs/templates/`, NOT the host, so it is unaffected by this migration). There is **no** `constants.ts` / `version.ts` / `sourceRef.ts` for the L1 URL — it is copy-pasted. Recommend the design phase add a shared `REMOTE_SPEC_BASE` alongside `REMOTE_SAMPLE_BASE`.

**Does the editor generate `docs/innfo/app/starter/*.md`? NO.** They are hand-authored static files. `scripts/build-docs.mjs` step 2 copies the editor `dist/` into `docs/innfo/app/` "while preserving `starter/` and `404.html`" — it never writes them. They already use `cogNNitive/cogNNitive` but with a **stale layout** (`.../cogNNitive/cogNNitive/main/models/starter/...` and `.../main/specs/v0.1.0/level2/business/business_V_0-1-1_NN.md` — old `models/` + `specs/v0.1.0/level2/` scheme, missing the `iNNfo/` prefix). They contain no `cogNNitive/iNNfo`, so they are outside the 119 and outside locked scope — but broken today. Runtime path: `useWorkspaceScaffolding.ts` `prepopulateSpecs(handle, starterUrl)` `fetch`es the starter URL and walks `parent_spec.url` up to depth 10; on a non-200 it silently `return`s, so stale starter URLs just make spec pre-population a no-op. `getStarterByTemplate` builds its starter URLs from `SAMPLE_BASE`, not from those files.

## Answer 3 — Root `specs/` provenance

**Hand-curated island, not generated, not synced, and not consumed by any CI path.** Only 6 files, layout different from `iNNfo/specs/` (`specs/templates/innfo/V_0-2-0/...`, `specs/templates/definne/...`). No script under `scripts/` or `manifest/` reads/writes/copies/diffs root `specs/` — `build-docs.mjs`, `generate-docsify-suite.mjs`, `generate-docsify-sidebar.mjs`, `verify.js` never reference it. `manifest/source.yaml` `templates[].path` values resolve **inside the `cogNNitive/iNNfo` repo over the GitHub API at the pinned tag**, not local root `specs/`. `scripts/verify.js` Template Inventory Guard and `tests/unit/sample-urls.test.ts` both read `iNNfo/specs/templates/`. The editor dev server (`vite.config.ts serveLocalSpecs`) serves the repo `specs` dir at `/specs` in DEV only, and with cwd `iNNfo/apps/innfo-editor` it is almost certainly `iNNfo/specs`. Looks like a pre-monorepo leftover of the defiNNe/innfo L0-L1 split. Decision (1) still says migrate it (6 files, low risk); recommend the proposal flag it as "migrate for hygiene; candidate for deletion in a follow-up".

## Answer 4 — The checker `iNNfo/scripts/check-spec-version.mjs --check-urls`

**How `--check-urls` works today:**
- CI: `.github/workflows/ci.yml` job `spec-integrity` -> `npm --prefix iNNfo run check:spec-urls` -> `node scripts/check-spec-version.mjs --check-urls` (no `--with-skills`).
- `ROOT = <repo>/iNNfo`. `collectFiles(ROOT)` walks **only the `iNNfo/` subtree**, skipping `node_modules`, `.git`, `.playwright-mcp`, `home-page`, and any dir named `archive`.
- `--check-urls` filters that set to `.ts` / `.vue`, **excluding** `.test.ts` / `.spec.ts`. `.md` is only included when the path contains `actioNN/skills/` (i.e. only under `--with-skills`, which CI does not pass). `.js` / `.mjs` / `.yaml` / `.json` are never collected.
- Regex: `GITHUB_RAW_URL_RE = /https:\/\/raw\.githubusercontent\.com\/cogNNitive\/iNNfo\/(?:main|v[\d.]+)\/([^\s"')\]]+)/g`.
- Per match: skip if it contains `${` (dynamic). Else take capture group 1 (path after `main/`), `join(ROOT, repoPath)`, `existsSync`; if missing, fall back to checking the parent dir exists. `broken` only if parent dir also missing. **No network** — local file existence only. Exit 1 iff `broken.length > 0`.
- Effective CI coverage today: essentially `src/config/samples.ts`, `src/views/StandaloneProcedureView.vue`, and `ModelInfoPanel.vue` (mostly `${}`-skipped). `src/ai-guide/procedure_NN.md` is NOT scanned.

**Minimal change to retarget + add the strict assertion:**
1. **Retarget the regex** (L42-43) to capture the path *after* `iNNfo/` so `join(ROOT, capture)` keeps resolving (ROOT is already `.../iNNfo`):
   `/https:\/\/raw\.githubusercontent\.com\/cogNNitive\/cogNNitive\/(?:main|v[\d.]+)\/iNNfo\/([^\s"')\]]+)/g`
2. **Add a strict legacy scan**: a function that scans collected files for `/cogNNitive\/iNNfo(?![\w-])/` (catches raw host, `github.com/cogNNitive/iNNfo`, bare slug); any hit -> print file+line, exit 1. Call it in the `if (checkUrls)` branch.
3. **Widen the file set** for the strict scan beyond `.ts`/`.vue` (add `.md`, `.mjs`, `.js`, `.yaml`/`.yml`, `.json`, `.html`) and reach **outside `iNNfo/`** (root `specs/`, `docs/`, `actioNN/`, `manifest/`). Two shapes:
   - **4a** — in `--check-urls` mode, set scan root to `resolve(ROOT, '..')`, keep the `archive` skip, and add `iNNfo/` back for the existence check; allowlist `manifest/**` if it stays on `cogNNitive/iNNfo`.
   - **4b (recommended)** — leave `check-spec-version.mjs` scoped to `iNNfo/`; add a second workspace-level guard step in `scripts/verify.js` (already repo-root-wide) that greps the whole tree (minus `archive/`, `node_modules/`, `dist/`, `*.bundle.js`, and — if applicable — `manifest/` + `docs/use/manifest*.md`) for `cogNNitive/iNNfo` and fails.
4. Update the script usage comment (L23-24) and `CONTRIBUTING.md:142`.

**Gotcha:** step 1 alone is a vacuous green — post-migration the old regex matches nothing and the job passes without enforcing anything. Steps 2-3 are the actual "strict" requirement.

## Answer 5 — `check:spec-version -- --inventory`

**Will not break.** `--inventory` runs `categorizeByVersion` with `FORMAT_VERSION_RE = /V_\d+-\d+-\d+/g` over file content, prints a `version -> files` map, and **always `process.exit(0)`** (informational; cannot fail the job). The migration rewrites only the host/org/branch/path-prefix segment of URLs — zero `V_x-y-z` tokens added or removed (the `..._V_0-2-0_NN.md` filename inside each URL is unchanged), and frozen-spec edits never touch `spec_version:` or filenames. Inventory output and per-version counts stay identical.

## Answer 6 — Other CI gates / scripts

| Gate | Where | Impact |
|---|---|---|
| `spec-integrity` -> `check:spec-urls` | `ci.yml` | Needs Answer-4 changes; passes after retarget. |
| `spec-integrity` -> `check:spec-version -- --inventory` | `ci.yml` | No impact (Answer 5). |
| `quality` -> `prettier --check` (changed files, PR only) | `ci.yml` L66-77 | Filter is `*.ts *.mts *.vue *.js *.mjs *.json` — **`.md` excluded**. Only `samples.ts`, `StandaloneProcedureView.vue`, `ModelInfoPanel.vue`, `provenance-model.js` get checked; string-content edits stay clean. |
| `iNNfo/.prettierignore` | — | Ignores `**/*.md`, `**/fixtures/**`, `archive/**` -> spec `.md` and fixtures never prettier-checked. |
| `quality` -> `eslint .` | `ci.yml` L64 | String-literal edits; no impact. |
| `quality` -> `vue-tsc` / `vite build` / `vitest run` | `ci.yml` L79-95 | Pure string changes compile; no test asserts the URL. `test:e2e` is **not** in CI. |
| `verify` -> `verify.js` Template Inventory Guard | `verify.js` L48-72 | Compares manifest `- name:` to `iNNfo/specs/templates/` folder names; URL edits don't change folders. Safe. |
| `verify` -> `verify.js` Line-Count Guard / `tsc -p tsconfig.scripts.json` | L74-103 | Unaffected (checker is `.mjs`, not typechecked). If Answer-4b guard is added in TS, keep it under 200 lines. |
| `verify` -> `validate-manifest.js --channel stable` | `verify.js` L106 | **Pre-existing risk, orthogonal to locked scope.** Resolves `cogNNitive/iNNfo` tags `templates-v0.2.0` + `innfo-mcp-v0.2.4` over the GitHub API. Archived repos stay API-readable, so this keeps passing **only if `manifest/source.yaml` is left untouched**. Migrating those slugs to `cogNNitive/cogNNitive` (where the tags don't exist) turns it red. -> keep `manifest/source.yaml` + `docs/use/manifest*.md` + `scripts/manifest/*.test.js` OUT of this change. |
| `verify` -> "Build Docs & Bundles Gate" (`npm run build:docs`) | `ci.yml` L38 | Builds core/mcp/editor + `generate-docsify-suite.mjs` on the two `documentation_NN.md` models. The generator parses only `## NN Concept:` blocks and `key:: value` fields and checks non-http `source::` targets on disk — it does NOT read `parent_spec.url` frontmatter. Editor build bundles the A8 files — string edits compile. Safe. |
| `deploy-pages` (push to main) | `ci.yml` L118 | Same `build:docs`; same conclusion. |
| `.gitattributes` `*.md text eol=lf` | repo root | **Apply gotcha**: ~90 `.md` files edited on Windows — preserve LF, verify `git diff --stat` is minimal and LF-clean. |

## Recommended edit strategy per bucket

- **A1-A7, A9** — mechanical base find-replace, one occurrence per matched line, LF preserved, no other bytes touched; include the L1 prose "It declares `parent:`" lines; drop `v0.1.x` tag pins to `main`.
- **A5** `master.html` — same rewrite on the single `<a href>`.
- **A8** editor runtime — `samples.ts`: `REMOTE_SAMPLE_BASE` -> `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates`. `ModelInfoPanel.vue` / `StandaloneProcedureView.vue` / `ai-guide/procedure_NN.md`: rewrite the literal base, keep `${formatVersion}` / `{{ formatVersion }}`. Optional (design): shared `REMOTE_SPEC_BASE`.
- **B** docs prose — base rewrite for `raw.githubusercontent.com` and `github.com/.../blob/main/<path>` -> `github.com/cogNNitive/cogNNitive/blob/main/iNNfo/<path>`. Skip `docs/use/manifest*.md`.
- **C** skill docs + `provenance-model.js` + `nn-innfo/SKILL.md` + `AGENTS.md` + `CONTRIBUTING.md` — base rewrite for raw URLs; reword the two prose sentences. `manifest/source.yaml`: do not touch.
- **D1/D2** — optional. Migrate only if a widened strict scan (4a) will see them; otherwise exclude tests/e2e from the guard and leave them.
- **D3 / D4 / E-archive / `temp/` / F** — leave; exclude from the strict scan.
- **E-active** `openspec/specs/submodel-conformance-validation/spec.md` — migrate the one `GIVEN` example line.
- **Checker** — retarget regex + strict legacy scan + widen file set; recommend the repo-wide guard in `scripts/verify.js` (4b); update usage comment + `CONTRIBUTING.md`.

## Risks / gotchas

1. **Vacuous-green checker** if only the regex is retargeted without the strict legacy scan.
2. **Checker scope is `iNNfo/`-only today** — root `specs/`, `docs/`, `actioNN/`, `manifest/` are invisible to it. A "strict repo-wide" guarantee needs re-rooting or a `verify.js` guard. Decide before `sdd-tasks`.
3. **`manifest/source.yaml` collision** — it uses `repo: cogNNitive/iNNfo` (API slug + pinned tags `templates-v0.2.0` / `innfo-mcp-v0.2.4` that don't exist on `cogNNitive/cogNNitive`); migrating it breaks `validate-manifest.js`. Keep it, `docs/use/manifest*.md`, and `scripts/manifest/*.test.js` out of scope, and explicitly allowlist them in the strict scan.
4. **`.gitattributes` LF on `.md`** — ~90 files edited on Windows; guard against CRLF creep.
5. **Byte-exact fixtures** (`tests/fixtures/models/*.md`) — do not rewrite; several already point at non-existent `specs/v0.1.0/level2/...` paths.
6. **Archived-repo raw URLs still 200** during the transition, so nothing breaks the instant this lands — strict enforcement is what prevents drift.
7. **Pre-existing debt surfaced, not in locked scope**: `docs/innfo/app/starter/*.md` use a stale layout (spec pre-population silently no-ops); `docs/innfo/cdn/innfo-mcp-v0.2.1.bundle.js` is orphaned (mcp is `0.2.4`); root `specs/**` appears entirely unconsumed. Recommend the proposal flag these for a follow-up.
8. **e2e not in CI** — migrating `e2e/*.spec.ts` has no CI effect.
9. **`ModelInfoPanel.vue` dynamic URL** is skipped by the checker's `${` guard — its retarget is not machine-verified; human-check it.

## Explicit "LEAVE ALONE" list

- `openspec/changes/archive/**`, `iNNfo/openspec/changes/archive/**` (all matched files)
- `temp/**` (`temp/citaciones test/citaciones test_V_0-1-0_cogNNitive_NN.md`)
- `iNNfo/apps/innfo-editor/tests/fixtures/models/*.md` (7 byte-exact fixtures)
- `docs/innfo/cdn/*.bundle.js`, `**/dist/**`, `docs/innfo/app/assets/**`
- `manifest/source.yaml` (separate change), `docs/use/manifest.md`, `docs/use/manifest-next.md`
- `scripts/manifest/validate-manifest.test.js`, `scripts/manifest/generate-manifest.test.js`, `actioNN/scripts/skills-manager.test.js`
- (Optional, if the strict scan excludes tests) `iNNfo/**/*.test.ts`, `iNNfo/**/*.spec.ts`, `iNNfo/apps/innfo-editor/e2e/**`

## Open decision for Proposal

**How wide is "strict"** — (a) re-root `check-spec-version.mjs` to repo-root, or (b) add a repo-wide `cogNNitive/iNNfo` guard in `scripts/verify.js` (recommended) — and **confirm `manifest/source.yaml` (+ doc mirrors + tooling tests) is out of scope**. Everything else (base string, file buckets, edit strategy) is determined.
