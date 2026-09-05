# Tasks: Provenance & Lineage Consolidation

Strict TDD (`openspec/config.yaml` → `strict_tdd: true`). Each implementation
task is preceded by its failing test. Verification runner:
`npm --prefix iNNfo run verify` (typecheck + test) for iNNfo packages;
`node --test actioNN/skills/nn-trannsform/test/` for the scripts;
`npm --prefix iNNfo run lint` + `format:check` before each commit.

Delivery: 10 stacked PRs to `main`. Merge each only when `npm run verify` and
`npm run build:docs` are green. Pause for human review before PR 5, PR 7, PR 10.

---

## PR 1 — `feat(innfo-core,innfo-mcp): typed & validated source references`

- [x] 1.1 Write `iNNfo/packages/innfo-core/src/sourceRef.spec.ts`: bare-path
      resolution, `sources/nn/` prefix, `models/` prefix, `#L` rejection,
      `src-NNN` rejection, `sources/original/` rejection, `slugifyHeading`
      basic + duplicate disambiguation. (RED)
- [x] 1.2 Create `iNNfo/packages/innfo-core/src/sourceRef.ts` (`SourceRef`,
      `parseSourceRef`, `slugifyHeading` **without** accent transliteration yet —
      byte-match the current editor behaviour so PR 1 stays non-breaking;
      transliteration is PR 10), `extractHeadings`, `HeadingInfo`. Export from
      `src/index.ts` and `src/browser.ts`. (GREEN)
- [x] 1.3 Write `tests/source-citations.test.ts` cases (unit-testing the exported
      `attachSourceCitations`): element with
      `sources::` list → `node.sources` populated + `origin: "source"` edges;
      unparseable value → `node.sources` not populated. (RED)
- [x] 1.4 Extend `normalizeElementsIntoGraph` in `recursiveParser/normalize.ts`:
      recognise `sources`/`source` fields, attach `node.sources`, push
      `origin: "source"` relationships. Add `sources?: SourceRef[]` to
      `ModelNode` and `'source'` to `Relationship.origin` in `types.ts`. (GREEN)
- [x] 1.5 Audit every relationship-edge consumer (`innfo-core` +
      `innfo-editor`) for `origin` switches; ensure `'source'` edges are skipped
      by node-id resolvers. Add a regression test.
- [x] 1.6 Write `tests/workspaceSources.test.ts`: dangling file →
      `error`; missing slug → `warning`; malformed (`#L`) → `error`; clean →
      no diagnostic. (RED)
- [x] 1.7 Create `src/validator/workspaceSources.ts` (`SourceResolver` type,
      `validateWorkspaceSources`). Wire into `validator/index.ts` exports. (GREEN)
- [x] 1.8 Write `iNNfo/packages/innfo-mcp/test/validate-workspace-sources.test.ts`:
      workspace with a dangling `sources::` → response diagnostics include the
      `error`. (RED)
- [x] 1.9 In `innfo-mcp/src/tools/validate.ts`, build a disk-backed
      `SourceResolver` (read file, `extractHeadings().map(h => h.slug)`), call
      `validateWorkspaceSources`, merge diagnostics into the envelope. (GREEN)
- [x] 1.10 Replace `iNNfo/apps/innfo-editor/src/utils/sourceRef.ts` body with a
      thin re-export/adapter over `@cognnitive/innfo-core` (the package exposes
      no `/sourceRef` subpath, so re-export from the barrel; keep the
      `ParsedSourceRef` `isValid` shape the widgets consume) + `@deprecated`
      JSDoc. Editor unit + component tests green (591 pass).
- [x] 1.11 `npm --prefix iNNfo run lint && npm --prefix iNNfo run format:check &&
      npm --prefix iNNfo run verify`. Fix fallout.
- [ ] 1.12 Commit this change folder (`openspec/changes/2026-09-05-provenance-lineage-consolidation/`)
      together with the code. Open PR 1. Merge on green.

## PR 2 — `fix(nn-trannsform): recursive bootstrap copy preserves subfolders`

- [x] 2.1 Write `actioNN/skills/nn-trannsform/test/unit/test-bootstrap-recursive.js`:
      `--src` tree with `a.txt`, `sub/b.txt`, `sub/deep/c.txt` → all three land
      under `sources/original/` with structure preserved; count reported. (RED)
- [x] 2.2 Extract `bootstrapProject` to `scripts/lib/bootstrap.js` and rework it
      to walk `srcDir` via `scanner-core.walkOriginal` (recursive, same ignore
      rules) + `fs.mkdirSync(dirname,{recursive:true})` + `copyFileSync` per
      file; returns `{copiedCount, originalDir, provModelPath}` so callers print.
      Removed a dead `execSync` import from `index.js`. (GREEN)
- [x] 2.3 `node --test actioNN/skills/nn-trannsform/test/`. Update `TESTING.md`.
- [x] 2.4 Commit. Open PR 2. Merge on green.

## PR 3 — `chore(actioNN,openspec): translate remaining Spanish strings to English`

- [ ] 3.1 Add `test/unit/test-no-spanish.js`: grep `scripts/**` for a Spanish
      stop-word list (`soportado`, `convertirlo`, `Proveniencia`, …) → must be
      empty. (RED for `.doc` message)
- [ ] 3.2 Translate the `.doc` skip message in `scanner-core.js`
      (`processPromptFile`). (GREEN)
- [ ] 3.3 Translate `nn-innfo/SKILL.md` §4 "Protocolo de Proveniencia" and the
      remaining Spanish blocks (approx. lines 267–299, 358, 588) to English,
      keeping semantics identical.
- [ ] 3.4 Translate the "Sencillo" format section and any Spanish prose in
      `nn-trannsform/citations.md` to English.
- [ ] 3.5 Grep `openspec/specs/**` and `iNNfo/openspec/specs/**` for Spanish;
      translate any hits.
- [ ] 3.6 `node --test …/nn-trannsform/test/`; skill markdown lint if present.
- [ ] 3.7 Commit. Open PR 3. Merge on green.

## PR 4 — `feat(nn-trannsform): lineage record full filesystem sync + --check`

- [ ] 4.1 Write `test/unit/test-lineage-sync.js`: fixture workspace with 1 model
      + 1 artifact → `# NN Models` / `# NN Artifacts` populated with
      `derived_from`; idempotent re-run byte-identical; deleted model drops out;
      `# NN Procedures` preserved across refresh. (RED)
- [ ] 4.2 Add `collectModels(projectDir)` and `collectArtifacts(projectDir)` to
      `scripts/lib/provenance-model.js`; render `# NN Models` / `# NN Artifacts`
      sections; change `refreshExistingModel` to replace
      Sources/Models/Artifacts but preserve Procedures. (GREEN)
- [ ] 4.3 Write `test/unit/test-lineage-procedures.js`: `--scan` appends one
      `## NN Procedures:` entry with `command`/`flags`/`run_at`/`inputs`/`outputs`. (RED)
- [ ] 4.4 Add `appendProcedureRun(projectDir, run)` to `provenance-model.js`;
      call it from `scripts/index.js` after `--scan`, `--import-url`, `--apply`. (GREEN)
- [ ] 4.5 Write `test/unit/test-lineage-check.js`: model w/o entry → non-zero;
      artifact citing absent model version → non-zero; clean → zero. (RED)
- [ ] 4.6 Add `scripts/lib/lineage-check.js` + `--check` handling in
      `scripts/index.js`. (GREEN)
- [ ] 4.7 Update `nn-trannsform/SKILL.md` §2d and Core Rule 7a: the sections are
      now auto-synced; remove the "manual for now" language and the stale
      `<!-- Verified … -->` comment.
- [ ] 4.8 `node --test …/nn-trannsform/test/`. Update `TESTING.md`.
- [ ] 4.9 Commit. Open PR 4. Merge on green.

## PR 5 — `refactor(nn-trannsform): flatten artifacts/ to a single directory` ⏸ review

- [ ] 5.1 Update fixtures/tests asserting `artifacts/exports/` or
      `artifacts/reports/` to expect `artifacts/`. (RED)
- [ ] 5.2 `scripts/index.js` `bootstrapProject` `dirs`: `['artifacts']` only.
      `provenance.js` / `transformer.js`: any `artifacts/reports/` or
      `artifacts/exports/` output path → `artifacts/`. (GREEN)
- [ ] 5.3 `nn-trannsform/SKILL.md` §1 layout diagram + §5 table: one
      `artifacts/` row; note reports carry `type: report` frontmatter.
      `citations.md`: `artifacts/exports/[Name]_V_x-y-z.md` → `artifacts/[Name]_V_x-y-z.md`.
- [ ] 5.4 `node --test …/nn-trannsform/test/`.
- [ ] 5.5 Commit. Open PR 5. **Pause for review.** Merge on approval + green.

## PR 6 — `chore(openspec): delete dead export-navigator spec`

- [ ] 6.1 `git rm iNNfo/openspec/specs/export-navigator/spec.md` and
      `iNNfo/openspec/changes/archive/2026-07-11-export-navigator/` (recursive).
- [ ] 6.2 Grep repo for `export-navigator` / `traNNsform/output` / `export-meta`
      references in docs/specs; remove or redirect to `--check`.
- [ ] 6.3 `npm --prefix iNNfo run verify` (spec inventory guards).
- [ ] 6.4 Commit. Open PR 6. Merge on green.

## PR 7 — `refactor: consolidate provenance vocabulary → Source/Citation/Lineage` ⏸ review

- [ ] 7.1 Rebase on `main` (pick up `2026-09-05-documentation-v2-and-docsify-suite`
      if it merged; coordinate the `citations-provenance.md` edit otherwise).
- [ ] 7.2 Write `test/unit/test-cited-works-alias.js`: frontmatter with
      `references:` reads as `cited_works`; generator writes `cited_works:`. (RED)
- [ ] 7.3 `scanner-core.js` `generateSourceFrontmatter`: emit `cited_works:`.
      `parseFrontmatterFields` / `parseSourceFrontmatter`: read both keys,
      `references` deprecated. (GREEN)
- [ ] 7.4 Update `citations.md` "Primary vs. Secondary" prose and
      `docs/innfo/documentation/citations-provenance.md` §4 example to `cited_works:`.
- [ ] 7.5 Rewrite `docs/innfo/documentation/citations-provenance.md` around
      Source / Citation / Lineage; delete `artifacts/canonical/`; move OKF /
      PROV-O / RO-Crate under "Planned, not implemented" or delete.
- [ ] 7.6 `innfo-core/src/types.ts`: `FieldValue.provenance` → `editAttribution`;
      `interface Provenance` (field-value one) → `EditAttribution`. Fix the four
      literals in `recursiveParser/normalize.ts` + `model.ts`. (compiler = RED list)
- [ ] 7.7 `innfo-editor/src/shared/provenance.ts` → `shared/editAttribution.ts`;
      update imports (`useMatrixCells`, `TextEditor`, `MetamatrixConfig`,
      `WidgetField`, `MarkerButton`, `TreeEditor`, `WorkspaceView`). Fix
      `SpecResolverService.ts` literal.
- [ ] 7.8 Decide `schema.ts` merge-`Provenance` → `MergeOrigin` (rename or leave;
      internal-only). Record the decision in this file.
- [ ] 7.9 Align `nn-trannsform/SKILL.md` + `nn-innfo/SKILL.md` wording to the
      three terms; drop "traceability"/"grounding".
- [ ] 7.10 `npm --prefix iNNfo run lint && format:check && verify`;
      `node --test …/nn-trannsform/test/`; `npm run build:docs`.
- [ ] 7.11 Commit. Open PR 7. **Pause for review.** Merge on approval + green.

## PR 8 — `chore(nn-trannsform): remove Beatles fixtures, gut heuristic transformer`

- [ ] 8.1 Update `test.ps1` / `test/run.js` to drop assertions on the
      band-shaped transform output. (RED where they assert it)
- [ ] 8.2 `git rm examples/raw/Beatles.txt examples/raw/BeachBoys.txt
      examples/raw/RollingStones.txt`.
- [ ] 8.3 Replace `runHeuristicTransformation` body with a plain passthrough
      (concatenate each source under the template's headings) — or delete
      `applyTransformation`'s fallback entirely and throw a clear
      "agent must perform this transform" error. Record which in this file.
- [ ] 8.4 Update `README.md` (`raw/` sample line) and `TESTING.md`.
- [ ] 8.5 `node --test …/nn-trannsform/test/`; `test.ps1` if on Windows CI.
- [ ] 8.6 Commit. Open PR 8. Merge on green.

## PR 9 — `chore(nn-trannsform): stop copying normalized .md into assets/`

- [ ] 9.1 Update `test/unit/test-provenance.js`: after `buildProvenanceModel`,
      `assets/<slug>/` contains media/binary only, no `*.md` copy. (RED)
- [ ] 9.2 In `provenance-model.js` `materializeAssets`, drop the `.md` copy;
      keep (or add) handling for real asset files referenced by elements. (GREEN)
- [ ] 9.3 Update `nn-trannsform/SKILL.md` §1 layout note for `assets/`.
- [ ] 9.4 `node --test …/nn-trannsform/test/`.
- [ ] 9.5 Commit. Open PR 9. Merge on green.

## PR 10 — `refactor: unify slug algorithm with accent transliteration` ⏸ review

- [ ] 10.1 Extend `innfo-core/src/sourceRef.spec.ts`: `Visión Estratégica` →
      `vision-estrategica`; `Café` → `cafe`. (RED — current impl drops accents)
- [ ] 10.2 Update `slugifyHeading` in `innfo-core/src/sourceRef.ts` to NFD-
      normalise + strip combining marks before filtering. (GREEN)
- [ ] 10.3 Point `nn-trannsform/scripts/markdown-utils.js` `slugifyHeading` and
      the filename `slugify` in `provenance-model.js` / `webImport.js` at one
      shared JS implementation (mirror of core's algorithm; add
      `test/unit/test-slug-parity.js` asserting they match core fixtures).
- [ ] 10.4 One-shot re-slug pass over `iNNfo/specs/**` sample models' internal
      anchors; snapshot-test the result.
- [ ] 10.5 Document in `nn-trannsform/SKILL.md` that existing workspaces must
      re-run `--scan` after upgrading (anchors changed).
- [ ] 10.6 `npm --prefix iNNfo run verify`; `node --test …/nn-trannsform/test/`;
      `npm run build:docs`.
- [ ] 10.7 Commit. Open PR 10. **Pause for review.** Merge on approval + green.

---

## Definition of done

- [ ] All 10 PRs merged to `main`, each green on `npm run verify` +
      `npm run build:docs`, `cognnitive.com` deploy succeeded after each.
- [ ] `node scripts/index.js --check` exits zero on a fresh bootstrapped
      workspace with one model and one artifact.
- [ ] `grep -ri "provenance\|traceability\|grounding" docs/innfo/documentation/`
      returns only the "edit attribution" mention and historical changelog.
- [ ] `openspec` change archived via `sdd-archive`.
