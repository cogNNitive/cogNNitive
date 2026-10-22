# Apply progress: site-domain-dogfooding

Mode: Strict TDD. Delivery: chained PRs, stacked-to-main (integration branch `dev`). Artifact store: openspec.

## Batch 1: Slice 1 (local bluepriNNt resolution proof)

Status: complete. 8/8 Slice 1 tasks done.

### Gate result (task 1.7): PASSED

A domaiNN-local bluepriNNt (`blueprints_dir::` plus a relative `parent_spec.url` of
`specs/bluepriNNts/site/spec_NN.md`) validates through MCP `validateKnowledge` (which wraps nn-core)
with `rootDir = site_NN/`. Fallback B is NOT needed. Negative control: pointing the url at a missing
spec yields `PARENT_RESOLUTION_FAILED`.

Resolution detail: the local url is resolved by `toLocalFilePath(url, rootDir)` in
`iNNfo/packages/nn-mcp/src/tools/resolver-node.ts:93-123` and read at tier 0 (`:558-573`).
`rootDir` is the domaiNN directory, so the url is relative to `site_NN/`, not to the repository root
(the spec wording "workspace root" holds when the workspace is the domaiNN).

### TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 1.1 | site-domain.spec.ts | Integration | 8/8 failed with ENOENT on `site_NN/...` (right reason) | n/a | n/a | n/a |
| 1.2-1.5 | same | Integration | covered by 1.1 | fixtures created; resolution tests green | Site + Page + broken-url negative control | none needed |
| 1.6 | same | Integration | summary / singleton / sources rejection tests failed (valid was true) | see finding 1 | kind rejected for real | tests reshaped to characterization |
| 1.8 | `node scripts/verify.js --fast` | Repo guards | n/a | all pre-checks passed | n/a | n/a |

Final: `npx vitest run src/tools/site-domain.spec.ts` (cwd `iNNfo/packages/nn-mcp`): 1 file, 9 tests passed.

### Findings (spec/design corrections needed before later slices)

1. nn-core has NO required-field mechanism, NO singleton enforcement and no inline check of the
   `sources::` grammar. The BP scenarios "missing summary rejected", "second Site rejected" and
   "sources:: see the README rejected" are not satisfiable by `validateKnowledge`. Only the
   `kind` select is enforced (`kind: blog` rejected). Slice 1 tests record the current behavior as
   characterization tests, and `loadSite` (Slice 3a) must own these rules. The spec wording
   ("validation fails") should be reconciled to "site model check fails".
2. Platform parents (iNNfo_V_0-5-0, defiNNition_V_0-1-0) try the network first and fall back to the
   embedded canonical registry. "No network" therefore means the local `site` spec is never fetched
   and validation still succeeds with `fetch` failing; the test asserts exactly that.
3. Validation warnings remain on the docs: missing `[!NOTE]` notice, and
   `PARENT_CONCEPT_GUIDANCE_INCOMPLETE` for the blueprint. They are warnings, not errors.
4. The Site singleton uses Concept `type:: category` (convention only, not enforced).
5. `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` shows as modified in the worktree (leftover build
   artifact, revert blocked by a hook). It is never staged: explicit `git add <paths>` only.

### Files

Created: `site_NN/domaiNN_NN.md`, `site_NN/specs/bluepriNNts/site/spec_NN.md`,
`site_NN/specs/bluepriNNts/site/procedures/usage_procedures_NN.md`, `site_NN/kNNowledge/site_NN.md`,
`site_NN/kNNowledge/pitch_site_NN.md`, `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts`.
Modified: `openspec/changes/site-domain-dogfooding/tasks.md` (ticks, chain strategy).

## Batch 2: Slice 2 (seed Pages)

Status: complete. 4/4 Slice 2 tasks done (12/12 cumulative). Slices 3a-5 not started.

### TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 2.1 | site-domain.spec.ts | Integration | 17 of 29 failed with ENOENT on the five missing `<kind>_site_NN.md` files and the procedure (right reason) | n/a | n/a | n/a |
| 2.2 | same | Integration | covered by 2.1 | validate, one-Page-per-kind, unique slug and body-rule tests green | six kinds x (validate, shape, body rules) + site-wide unique slugs with one `index` | bullets replaced (finding 1) |
| 2.3 | same | Integration | covered by 2.1 | procedure validates and names `scripts/site/compile-site.mjs` | extra `validateDoc` assertion on the procedure caught a dangling `tool::` (finding 2) | Tools element added |
| 2.4 | `node scripts/verify.js --fast` | Repo guards | n/a | all pre-checks passed | n/a | n/a |

Final: `npx vitest run src/tools/site-domain.spec.ts` (cwd `iNNfo/packages/nn-mcp`): 1 file, 29 tests passed.
`node scripts/verify.js --fast` (worktree root): all deterministic pre-checks passed.

### Findings (affect Slice 3a)

1. nn-core rejects `- ` / `* ` bullets inside a `# NN <Concept>` section body
   (`format.body-element-markers`, an error: "bullet(s) look like elements but must use ## NN
   headings"). Page bodies therefore cannot use unordered lists. Seeds use numbered lists
   (`1. `) and paragraphs. The markdown subset (task 3.5) must not promise `-` lists for
   Page bodies; ordered lists are the supported flat list. The spec wording "flat lists" should
   be read as ordered.
2. `tool::` on a procedure Work element must equal an element name (dangling-reference check), not a
   free path. The procedure keeps `tool:: scripts/site/compile-site.mjs` as required, backed by a
   `# NN Tools` element with that exact name.
3. Seed content: tutorial `first-domain`, guide `validate-domain`, concept `levels`, reference
   `reference`, legal `legal`, existing pitch `index`. Facts come from `docs/use/index.html`
   (install line), `docs/innfo/documentation/{domain-from-scratch,nn-mcp,vocabulary}.md`; the legal
   Page links to the existing `legal.html` and `privacy.html` and copies no personal data. The
   reference Page cites no Sources (Slice 4).

### Files

Created: `site_NN/kNNowledge/{tutorial,guide,concept,reference,legal}_site_NN.md`,
`site_NN/specs/bluepriNNts/site/procedures/compile_site_procedures_NN.md`.
Modified: `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts`, `tasks.md` (2.1-2.4 ticked).
Protected paths untouched.

### Review follow-up (Slice 2)

Design, tasks 3.5 and the site-compiler spec now say lists are `1. ` only and the renderer rejects `- `/`* ` lines (also inside fences) with its own `file:line` error. Tutorial names the `business` bluepriNNt and links `[[Validate your domaiNN]]`; reference summary says "main folders". Spec kinds are read from the bluepriNNt `kind` select and the set of `*_site_NN.md` Page files must equal them (this guard was green on first run: the content already satisfied it; the tutorial and reference tests were RED first). Result: 32 tests pass; `node scripts/verify.js --fast` passes.

## Batch 3: Slice 3a (parser and renderer)

Status: complete. 8/8 Slice 3a tasks done (20/20 cumulative; Slices 3b-5 not started). Branch `session/site-domain-dogfooding-s3a`.

### TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 3.1, 3.2, 3.2a | `scripts/site/site-model.test.mjs` | Unit | ERR_MODULE_NOT_FOUND for `lib/site-model.mjs` (module absent) | 21 tests green after first implementation (two test-side defects fixed: `bodyLine` vs heading line, a regex order) | one test per rejection (prose key::, in-fence key::, late field, dup name, dup slug, bad slug x2, no index, kind, order x3, base_url x3, missing field x6, 2nd Site x2, no Site, sources) plus positive cases | typecheck fix: `bodyLines` array vs `body` string |
| 3.3, 3.4 | same | Agreement | agreement test written with the parser; mutation (upper-casing field values) turned it and 11 others red | green on first run: no divergence found, so 3.4 needed no parser change | compared name, concept, explicit slug, and raw field strings (`rawFields` minus `slug`) over all 7 seed documents | none |
| (BOM) | same | Unit | mutation removing the BOM strip stayed green for the BOM+CRLF test (no teeth: frontmatter masks it); added a no-frontmatter BOM test, which fails under the mutation | green | n/a | n/a |
| 3.5, 3.6 | `scripts/site/markdown-subset.test.mjs` | Unit + seed integration | ERR_MODULE_NOT_FOUND for `lib/markdown-subset.mjs` | 18 tests green, then 19 with the seed-render test | every supported construct and every rejection asserts `file:line` and message; all 6 seed Pages with a body render | none |
| 3.7 | `npx eslint scripts/site/` (0 problems), `node scripts/verify.js --fast` (all pass) | Repo guards | first verify run failed on Typecheck Scripts (TS2322/TS2339 in `scripts/site/`) | fixed, rerun green | n/a | n/a |

Final: `node --test "scripts/site/**/*.test.mjs"` 41 pass, 0 fail; `node scripts/verify.js --fast` all pre-checks passed.

### Findings

1. `node --test scripts/site/` (bare directory) reports a single failing "test" on Node 22.22.2 / Windows; the glob form `node --test "scripts/site/**/*.test.mjs"` works, and verify.js discovers the files on its own.
2. The spec scenario "Supported constructs render" says `<ul>`; lists are `1. ` only, so the renderer emits `<ol>`. The spec wording should be reconciled to `<ol>`.
3. nn-core `rawFields` keeps `sources` as the raw string; `loadSite` parses it into `{path, unit}` tokens (whitespace separated, `[path@unit]` only).
4. `loadSite` model: `{ dir, site, pages }`; a Page carries `line` (heading) and `bodyLine` (first body line, the value `renderBody` takes as `line`). Errors are `SiteError` with `file` (domaiNN-relative, forward slashes) and `line`.
5. `KEY_LINE` is exported from `site-model.mjs` and reused by the renderer, so both reject the same lines.
6. The Write tool emitted literal U+FEFF/U+FFFD characters for `\uFEFF`/`\uFFFD` escapes in source; they were replaced by real escapes (eslint `no-irregular-whitespace` caught it).

### Files

Created: `scripts/site/lib/site-model.mjs`, `scripts/site/lib/markdown-subset.mjs`, `scripts/site/site-model.test.mjs`, `scripts/site/markdown-subset.test.mjs`.
Modified: `tasks.md` (3.1-3.7 ticked), this file. Protected paths untouched.

### Review follow-up (Slice 3a)

Fresh review fixes, each with a RED test first (14 new tests failed for the right reasons, then 54/54 green):
href positive allowlist plus rejection of control/space/backslash characters (C0/C1 bypass, backslash and protocol-relative bypass, attribute breakout); malformed links (`](` left over, parentheses in URLs) fail closed; ordered lists must be numbered 1, 2, 3; stray `*` is not emphasis; `loadSite` rejects a level-1 heading inside a body, Page names that repeat site-wide, duplicate field keys, unterminated frontmatter, and a `base_url` containing quotes, angle brackets or backslashes; parser fence handling now matches the renderer (only a bare fence closes); weak test assertions made exact; site-compiler spec says `<ol>`. Hand-written lines now 682 (276 code, 406 tests).

## Batch 4: Slice 3b (compiler, shell, CSS, generated `docs/next/`)

Status: complete. 9/9 tasks 4.1-4.9 of `tasks.md` ("Slice 4: Compiler", delivered as PR 4 / slice 3b) done (29/29 cumulative). Tasks 5.x (code facts, staleness script, citing Page) are NOT started. Branch `session/site-domain-dogfooding-s3b`, size exception approved (hand-written about 730 lines, 469 of them tests; generated `docs/next/` 505 lines in its own commit).

### TDD cycle evidence

| Task | Test file | Layer | RED | GREEN | Triangulate | Refactor |
|------|-----------|-------|-----|-------|-------------|----------|
| 4.1-4.3 | `scripts/site/compile-site.test.mjs` | Integration (temp domaiNN, real shell/CSS) | `ERR_MODULE_NOT_FOUND` for `compile-site.mjs` (module absent; whole file red) | 33 of 35 green on first implementation; 2 left: the injection test (a test-side expectation for the llms.txt link text was wrong: only `\`, `[`, `]` are escaped) and the freshness test (no `docs/next/` yet) | pages, nav order/grouping/identity, BOM+CRLF, U+FFFD, slot single-pass, seed compile, link resolution, sitemap, llms, determinism x2, read-spy, failure x6, outDir guard, shell slot x2 | `esc` exported from `markdown-subset.mjs` and reused instead of duplicating |
| 4.4, 4.5 | same | Integration | covered by 4.1 | shell (7 slots) + CSS (morado-nazareno tokens) + `compile-site.mjs` | n/a | none |
| 4.6 | same | Integration (fixtures via `writeOnce` + `cognitivize`) | covered by file-level RED | missing file, missing heading, superseded warn, unresolved fail, stale hash fail (uncited too), non-token `sources::`, current citation visible | all five policy branches | none |
| 4.7, 4.8 | same | Freshness | test written before `docs/next/` existed: failed with "docs/next/ is missing" | `node scripts/site/compile-site.mjs`, then green | byte-compare of file set and every file | none |
| 4.9 | `node scripts/verify.js --fast` | Repo guards | n/a | all pre-checks passed | n/a | n/a |

Mutation checks (each turned the right test red, then reverted): remove `esc` on the description, treat `unresolved_in_latest` as a warning, drop the outDir guard, drop `audit.errors`, skip the stale-hash walk, drop `mdUrl`.

Final: `node --test "scripts/site/**/*.test.mjs"` 89 pass, 0 fail (54 from 3a + 35 new); `npx eslint scripts/site/` clean; `node scripts/verify.js --fast` all pre-checks passed.

### Decisions and deviations

1. Shell slots are seven, not four: `{{title}} {{description}} {{site}} {{tagline}} {{nav}} {{content}} {{sources}}`. The `<meta description>` needs the summary and the header needs the Site name and tagline; the spec text was reconciled. Every slot must appear and unknown slots fail. Filling is single pass, so a body containing `{{nav}}` stays literal.
2. Staleness policy (D7) is fully in the compiler (it needs no Slice 5 code): `auditModelCitations().errors`, `checkScanImpact` `unresolved_in_latest` and `findStaleSources` over every file under `sources/` fail; `superseded` and audit warnings are logged as `warning:` and the run continues. The standalone `site-staleness.mjs` stays in tasks 5.x; no seam is needed. Finding for 5.3: `checkScanImpact` DOES report `superseded` and `unresolved_in_latest` for header-unit citations (`path@## heading`) in this domaiNN layout (see the "superseded" and "unresolved in the latest member" tests).
3. `run` refuses (exit 1, nothing deleted) an `outDir` that is the domaiNN, inside it, or contains it, or that exists as a file. Paths are compared after `realpath` (Windows 8.3 names).
4. Nav has no `aria-current` marker so every page carries byte-identical navigation (spec). The index Page URL in sitemap and llms.txt is `<base_url>index.html`, uniform with the other Pages. `llms.txt` escapes only `\`, `[`, `]` in link text and percent-encodes parentheses in URLs; HTML and XML use the shared `esc`.
5. The injection test covers Site name, tagline, `base_url` (ampersand, parentheses), Page name and summary across HTML, XML and llms.txt (3a review item).
6. The Write tool again emitted literal U+FEFF/U+FFFD for `\u` escapes (test and compiler); a node script replaced them with escapes (verified clean).

### Files

Created: `scripts/site/compile-site.mjs`, `scripts/site/compile-site.test.mjs`, `site_NN/specs/bluepriNNts/site/assets/{shell.html,site.css}`, `docs/next/**` (9 files, generated).
Modified: `scripts/site/lib/markdown-subset.mjs` (export `esc`), `specs/site-compiler/spec.md` (slot list), `tasks.md` (4.1-4.9 ticked), this file. Protected paths untouched.
