# Design: S5 — freeze the Vue editor now, delete it later

Source analysis: `editor-freeze-study.md` in the S3 change (worktree `session/s3-domain-console`).
Its claims were re-verified against this branch on 2026-10-14; deviations are listed at the end.

## Phase A: S5-freeze (variant A3)

### Decision

The source stays at `iNNfo/apps/innfo-editor`. It leaves npm workspaces and every gate.
The hosted app is a committed static build. Rejected: A1 (stop building: `/innfo/app/` would
404 on the next publish because `publish-web` replaces the whole tree), A2 (isolated install
keeps a core-source coupling), B-prime (vendored core build: more generated output),
C1/C2 (delete or relocate: not what the maintainer wants), D (keep workspace, exclude from
gates: first core refactor that breaks `vue-tsc` reds the site).

### Edits (all verified)

| Area | Location | Freeze action |
|------|----------|---------------|
| Test deps | editor `package.json` declares `jsdom`, `happy-dom`; 17 gated files import them (`test/console-*.test.mjs`, `test/helpers/console-boot.mjs`, `innfo-core/tests/console-*.test.ts`, `tests/helpers/console-review-env.ts`) | add both to root `devDependencies` **before** dropping the workspace |
| npm | `package.json` `workspaces`; `typecheck` / `test` / `test:coverage` | drop `iNNfo/apps/*`; strip the editor from the three scripts; regenerate `package-lock.json` with `npm install --package-lock-only` |
| Pre-push | `.githooks/pre-push` runs `npm run typecheck` | no edit: it now stops paying `vue-tsc`; comments mentioning "3 workspaces" are reworded |
| CI | `.github/workflows/ci.yml` `quality` job: editor typecheck, tests, build | remove the three steps (the `publish-web` `needs: quality` chain no longer includes the editor) |
| Integrity | `scripts/check-integrity.js` Group 5 | remove the editor test run |
| Versions | `scripts/sync-versions.mjs` (`samples.ts` target), `sync-versions.test.mjs`, `verify.js` step 7d | stop generating / checking `samples.ts`; the editor's `SHIPPED_BLUEPRINT_VERSIONS` goes stale by design (noted in `FROZEN.md`) |
| Lint | `eslint.config.mjs` | ignore `iNNfo/apps/innfo-editor/**`; keep `eslint-plugin-vue` devDeps so a thaw only removes the ignore |
| Source guards | `scripts/lib/legacy-write-guard.js` scope regex; `scripts/lib/nn-name-regex-guard.js` scope regex + 4 editor allowlist entries (and their tests) | remove the `iNNfo/apps/<app>/src` scope and the 4 entries: a future retired token must not force an edit in frozen code |
| Docs build | `scripts/build-docs.mjs` editor build + `docs/innfo/app/` staging, including the `assets/` rmSync | delete; the committed snapshot is part of `docs/` already |
| Snapshot | `.gitignore` ignores `docs/innfo/app/assets/` and `index.html`; `docs/innfo/app/` tracks only `404.html` and `starter/` | remove the two ignore lines; commit the build output (81 files, 5.6 MB) |
| Encoding guard | `scripts/guard-text-encoding.js` skips only `*.bundle.js` | skip `docs/innfo/app/assets/` (two chunks contain U+FFFD in the built JS) |
| Prettier | `.prettierignore` | add `docs/innfo/app/assets/` (CI format check is changed-files-only and would scan the minified chunks) |
| Dev scripts | `run-dev.bat`, `iNNfo/run-dev.bat` | remove the editor block (its workspace no longer exists) |
| Config | `openspec/config.yaml` | drop the `innfo-editor` workspace and per-package test line |
| Doc | new `iNNfo/apps/innfo-editor/FROZEN.md` | state, why, thaw steps, what rots |
| Guard | new `test/editor-freeze.test.mjs` (auto-discovered by `collectTestSuites`) | see Guard test |

### Left untouched on purpose

- `legacy-ledger.yaml` `editor-legacy-domain` entry and its two markers: they live in the
  kept source, so the 1:1 ledger contract still holds. Removed together with the code in Phase B.
- `scripts/check-spec-version.mjs:285`, `scripts/migrate-spec-urls*.mjs`: they skip editor
  fixtures that still exist.
- `test/no-workspace-hub-references.test.mjs`: its DELETED list names files that do not exist; independent of the freeze.
- `scripts/guard-template-immutability.js:231` badge normalisation: KEEP in every phase.
- `iNNfo/validation-baseline.json`, core comments: Phase B.

### Guard test (`test/editor-freeze.test.mjs`)

Asserts, from the repo root, that:
1. root `package.json` `workspaces` do not match `iNNfo/apps/*` and no script mentions `innfo-editor`;
2. `jsdom` and `happy-dom` are root `devDependencies`;
3. `.github/workflows/*.yml`, `.githooks/*`, `scripts/build-docs.mjs`, `scripts/sync-versions.mjs`,
   `scripts/check-integrity.js`, `scripts/verify.js` and both source-guard modules contain neither
   `innfo-editor` nor `iNNfo/apps`;
4. `iNNfo/apps/innfo-editor/FROZEN.md`, `docs/innfo/app/index.html` and `docs/innfo/app/assets/` (non-empty) exist.
`FROZEN.md` and the snapshot are deliberately inside the allowlist. A fixture-based unit
checks the scanner flags a planted reference, so the guard can go red.

### Hosted-app facts

The editor fetches specs from `raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/...`
and the catalog from `cognnitive.com/innfo/blueprints/catalog.json`; published `_V_` specs are
write-once, so a frozen build keeps loading but will not understand newer L3 shapes. Vite
`base` is `/innfo/app/` (default), so the snapshot is built with no env override.
The build embeds the commit date (`__COMMIT_DATE__`), so it is reproducible per commit, not byte-identical across commits.

### Order of work

1. Snapshot built from the still-gated editor (own real install in this worktree), committed.
2. Guard test (red), then move `jsdom` / `happy-dom` to root (lock via `--package-lock-only`).
3. Drop workspace and scripts, CI, hooks, sync-versions, guards, build-docs.
4. `FROZEN.md`, `run-dev.bat`, config. Verify.

## Phase B: S5-delete (deferred)

### Preconditions
1. S3 complete (`audit.md` reviewed, *port* rows applied) AND S6 complete (preview is a console file; scaffold in `innfo-core`; `init_knowledge` is an `add_model` wrapper).
2. The maintainer has dogfooded the console and gives **explicit sign-off**.

### Coupling inventory (verified 2026-10-13, revalidated 2026-10-14; rows done by the freeze are marked)

| Area | Location | Action |
|------|----------|--------|
| App | `iNNfo/apps/innfo-editor/**` (~290 files) | delete |
| npm | root `package.json` scripts / workspaces | **done by freeze**; remaining: drop `eslint-plugin-vue`, `vue-eslint-parser`, regenerate lock |
| Lint | `eslint.config.mjs` (Vue config) | freeze ignores the dir; delete the Vue config and the ignore |
| CI | `ci.yml` editor steps | **done by freeze**; `release.yml` has none |
| Config | `openspec/config.yaml` | **done by freeze** |
| Dev scripts | `run-dev.bat`, `iNNfo/run-dev.bat` | **done by freeze** (delete if now empty) |
| Ignore | `.gitignore:14-15` | **done by freeze** |
| Ledger | `legacy-ledger.yaml` `editor-legacy-domain` + 2 markers | delete entry and markers with the code |
| Scripts | `build-docs.mjs`, `sync-versions.mjs` (+test), `check-integrity.js`, `nn-name-regex-guard.js` + `legacy-write-guard.js` | **done by freeze**; remaining: `check-spec-version.mjs:285`, `migrate-spec-urls*.mjs` fixture skips |
| Guard kept | `guard-template-immutability.js:231` badge normalisation | KEEP; extend so the new badge is equivalent; comment why |
| Tests | `generate-about-twin.test.mjs`, `no-workspace-hub-references.test.mjs`, `retired-paths.test.ts:13`, core `console-dom` tests | edit |
| Baseline | `iNNfo/validation-baseline.json` | regenerate |
| Core comments | `sourceRef.ts`, `types/graph.ts`, `validator/content.ts`, `integrity/report.ts`, `integrity/versionStatus.ts` | reword |
| MCP | `preview-server.ts` (`PREVIEW_APP_URL`), `withPreview`, `server-preview.test.ts` | delete (S5a, coupled to S6) |
| Badge emitters / templates / samples / docs | see tasks B | retarget (S5c) |
| Tracked app files | `docs/innfo/app/**` including the A3 snapshot | delete |
| Freeze artefacts | `FROZEN.md`, `test/editor-freeze.test.mjs`, prettier / encoding-guard exemptions for the snapshot | delete or fold into the S5d guard |

### Decisions (unchanged by the freeze)

- **CTAs.** "Open App" becomes "Read the docs" (`https://cognnitive.com/innfo/documentation/`); no redirect page. **Amended 2026-10-15:** `/innfo/app/` serves one static notice page (see Deviations).
- **Badge.** `> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.` Maintained templates bump `template_version`; write-once `_V_` specs keep the old line.
- **Scaffold notice.** `scaffoldKnowledgeDocument`, templates and `canonical-registry.ts` change together with a refreshed golden.
- **Guardrail (S5d).** `rg "innfo-editor|innfo/app/"` returns nothing outside `iNNfo/specs/**/*_V_*`, `openspec/changes/archive/**`, `guard-template-immutability.js` (commented), and this change directory. It must allow the editor directory only until it is deleted.
- **Living specs.** Disposition per capability is the set under `deferred-delete/specs/`; moved back to `specs/` when Phase B starts.

## Deviations from the study

### 2026-10-15: retired app address serves a notice page (maintainer decision)

Reason: maintainer decision. The Phase B decision "no redirect page; `/innfo/app/` 404s after
deletion" is replaced. After deletion, `https://cognnitive.com/innfo/app/` serves ONE static
English page, `docs/innfo/app/index.html`, explaining that the hosted app was retired and that
cogNNitive now uses the domain console (self-contained `domaiNN_console.html` generated locally by
`export-console.mjs` or MCP `regenerate_console`, reviewed through changesets), with links to the
usage, offline consoles, reviewer guide, innfo-mcp and installing-agents docs pages.

Consequences:

- `docs/innfo/app/index.html` is the ONLY file kept under `docs/innfo/app/`; the SPA snapshot,
  `assets/`, `starter/` and `404.html` are deleted. The old `404.html` redirected into the SPA, so
  it must not survive.
- The `/innfo/app/` mention is allowlisted for the notice page and its spec in the S5d guard
  (`test/no-editor-references.test.mjs`).
- The Pages publish guard now asserts that `docs/innfo/app/index.html` exists and that
  `docs/innfo/app/assets/` does not; it no longer requires `assets/`.
- "Open App" CTAs become "Read the docs", or point to the notice page where that is the better UX.
- New delta spec: `specs/hosted-app-retirement-notice/spec.md`.

Recorded in `tasks.md` under "Verification notes" as they are confirmed during apply.

## Cross-cutting

Releases for Phase B after the `dev -> main` batch: `innfo-mcp-v*`, `innfo-console-v*`,
`blueprints-v*`, `skills-v*`, per `.agents/skills/nn-dev-release/SKILL.md`. Phase A needs none.
