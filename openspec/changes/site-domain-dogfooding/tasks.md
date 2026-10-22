# Tasks: Site domaiNN dogfooding

Strict TDD: every GREEN task is preceded by its RED task. All paths are relative to the repo root. Specs: BP = site-blueprint, SC = site-compiler, CF = site-code-facts.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,460 hand-written + ~520 generated |
| 400-line budget risk | Medium (each slice <= 400 hand-written; total is not) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (S1) -> PR 2 (S2) -> PR 3 (S3a) -> PR 4 (S3b) -> PR 5 (S4) |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main (integration branch `dev`) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

| Slice | Hand-written | Generated |
|-------|--------------|-----------|
| S1 resolution proof | ~250 | 0 |
| S2 seed Pages | ~250 | 0 |
| S3a parser + renderer | ~350 | 0 |
| S3b compiler + shell + CSS | ~330 | ~400 (`docs/next/`) |
| S4 code facts + staleness | ~280 | ~120 (snapshots, sidecars) |
| Total | ~1,460 | ~520 |

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Local bluepriNNt resolution proof (gate) | PR 1 | Base = tracker/main. Stop here if fallback B triggers. |
| 2 | `site` bluepriNNt + six seed Pages | PR 2 | Depends on PR 1. Mostly prose. |
| 3 | Parser + markdown renderer (pure libs) | PR 3 | Depends on PR 2 (agreement test reads seeds). |
| 4 | Compiler + shell + CSS + `docs/next/` | PR 4 | Label `docs/next/` as generated. |
| 5 | Code-fact import + staleness + citing Page | PR 5 | Label snapshots as generated. |

## Slice 1: Local bluepriNNt resolution proof (PR 1)

- [x] 1.1 RED: create `iNNfo/packages/nn-mcp/src/tools/site-domain.spec.ts` that runs `validateKnowledge` on `site_NN/kNNowledge/site_NN.md` with no network and expects no unresolved-bluepriNNt error (BP: domain-local resolution). Run vitest, confirm it fails because the files do not exist.
- [x] 1.2 Create `site_NN/domaiNN_NN.md` with `knowledge_dir:: kNNowledge/`, `blueprints_dir:: specs/bluepriNNts/` and the kNNowledge registry. No retired keys.
- [x] 1.3 Create `site_NN/specs/bluepriNNts/site/spec_NN.md` (Level 2, `blueprint_version: "V_0-1-0"`): `Site` singleton (`tagline`, `base_url`, `repository_url?`), `Page` (`kind` select of 6, `order` number, `summary`, `sources` citation list). No `slug` Field, no `Section`/`Navigation`. Required-ness and the Site singleton are enforced by `loadSite` (Slice 3a); `sources` is the reserved citation property, not a declared Field.
- [x] 1.4 Create `site_NN/specs/bluepriNNts/site/procedures/usage_procedures_NN.md`.
- [x] 1.5 Create `site_NN/kNNowledge/site_NN.md` (Site singleton, `parent_spec.url` to the local spec) and `site_NN/kNNowledge/pitch_site_NN.md` (one Page, `slug:: index`).
- [x] 1.6 GREEN: vitest passes. `kind: blog` is rejected by `validateKnowledge`. Missing `summary`, a second Site and `sources:: see the README` are characterization tests: not enforced by nn-core; enforced by `loadSite` (Slice 3a).
- [x] 1.7 STOP GATE: if nn-core or MCP rejects the local `parent_spec.url`, record the rejection reason in the failing test, do NOT start Slice 2, and report that fallback B must be chosen explicitly.
- [x] 1.8 Run `node scripts/verify.js --fast`; confirm the name-invariant, text-encoding and legacy-write guards accept `site_NN/`.

## Slice 2: Seed Pages (PR 2)

- [ ] 2.1 RED: extend `site-domain.spec.ts` to assert that all six kinds are present (BP: seed coverage) and that every seed document validates. Fails first.
- [ ] 2.2 Write `site_NN/kNNowledge/{tutorial,guide,concept,reference,legal}_site_NN.md`, one Page each (the `pitch` document already exists), written for an end user who installs the skills and MCP. Each Page has `slug::`, `kind`, `order` and `summary`. The only `key::` lines are in the field block.
- [ ] 2.3 Add `site_NN/specs/bluepriNNts/site/procedures/compile_site_procedures_NN.md` with `tool:: scripts/site/compile-site.mjs` (the script lands in S3b).
- [ ] 2.4 GREEN: vitest and `node scripts/verify.js --fast` pass. Protected paths (`iNNfo/specs/bluepriNNts/`, `manifest/source.yaml`, `catalog.json`) are untouched.

## Slice 3a: Parser and renderer (PR 3)

- [ ] 3.1 RED: `scripts/site/site-model.test.mjs` for `loadSite`: field block only, mid-prose and in-fence `key::` rejected, duplicate names, duplicate/malformed slug, missing or duplicate `index`, unknown kind, non-integer order, relative `base_url`, BOM+CRLF equals LF, U+FFFD fails, errors carry `file:line`.
- [ ] 3.2 GREEN: `scripts/site/lib/site-model.mjs` (`loadSite`, `SiteError`).
- [ ] 3.2a RED then GREEN: `loadSite` enforces what nn-core does not (BP): missing `tagline`/`base_url`/`kind`/`order`/`summary` named in the error, a second Site element, and a `sources` value that is not a `[path@unit]` token.
- [ ] 3.3 RED: agreement test in the same file. `loadSite` vs nn-upgrade `parseKnowledge` on every seed document, comparing element names and field maps (SC: parser agreement).
- [ ] 3.4 GREEN: fix any parser divergence found; the hand parser stays fail-closed.
- [ ] 3.5 RED: `scripts/site/markdown-subset.test.mjs`. Supported: `###`/`####`, paragraphs, flat lists, fences keep indentation, inline code/bold/em, https and relative links, `[[Page]]`. Rejected, each with `file:line`: `#`/`##`, table, blockquote, image, raw HTML, nested list, unterminated fence, `javascript:` scheme, unknown `[[Nope]]`. HTML escaping.
- [ ] 3.6 GREEN: `scripts/site/lib/markdown-subset.mjs` (`renderBody`).
- [ ] 3.7 REFACTOR: run eslint on `scripts/site/`; `node scripts/verify.js --fast` is green.

## Slice 4: Compiler (PR 4)

- [ ] 4.1 RED: `scripts/site/compile-site.test.mjs` on a temp copy of `site_NN/`, with `outDir` as a temp dir: flat `<slug>.html`, `index.html`, relative `site.css`, `<title>` and meta description, derived nav (fixed kind order, then order, then slug, empty groups omitted), `{{sources}}` list, non-ASCII survives.
- [ ] 4.2 RED: `sitemap.xml` has N `<loc>` values starting with `base_url` and no `lastmod`; `llms.txt` has one line per Page; no `.md` file in the output; rerun and copy-to-another-dir outputs are byte-identical; no data read outside the domaiNN.
- [ ] 4.3 RED: failure behavior. An invalid Page returns exit 1 and leaves the previous `outDir` byte-identical; a removed Page's file disappears on success; only the given directory is removed.
- [ ] 4.4 Create `site_NN/specs/bluepriNNts/site/assets/shell.html` (slots `{{title}} {{nav}} {{content}} {{sources}}`) and `assets/site.css`.
- [ ] 4.5 GREEN: `scripts/site/compile-site.mjs` exporting `run({ domainDir, outDir, log })` and a CLI default of `docs/next/`. It validates and renders everything before touching `outDir`. LF endings, single trailing newline, explicit `utf8`.
- [ ] 4.6 RED then GREEN: citation policy tests. `auditModelCitations` errors fail; `unresolved_in_latest` fails; a stale sidecar hash fails; `superseded` warns, exits 0 and writes output. Use fixtures built with `writeOnce`.
- [ ] 4.7 Generate `docs/next/` with `node scripts/site/compile-site.mjs`; commit it as generated output.
- [ ] 4.8 RED then GREEN: freshness test. Compile into a temp dir and byte-compare with the committed `docs/next/`; the failure message says to rerun the compiler.
- [ ] 4.9 Run `node scripts/verify.js --fast`; diff-check that protected paths (`verify.js`, `package.json`, `build-docs.mjs`, CI, `docs/use/`, `docs/update/`, `.nojekyll`, `CNAME`) are untouched.

## Slice 5: Code facts and staleness (PR 5)

- [ ] 5.1 RED: `scripts/site/import-code-facts.test.mjs`. `renderSnapshot` has one `## name` per entry, sorted, and is stable under input reordering. `run` with injected `facts` and `now` writes `mcp-tools_20260102T030405Z.md` plus a sidecar for both groups; re-import reports `unchanged` and creates no file; changed facts create member 2 and leave member 1 and its sidecar byte-identical; `findStaleSources` does not flag member 1; all writes are under `sources/import/code-facts/`.
- [ ] 5.2 GREEN: `scripts/site/import-code-facts.mjs` (`renderSnapshot`, `run`). It uses `writeOnce` + `cognitivize`, not `importRaw`. The CLI loads `nn-mcp/dist/server.js` `toolDefinitions` and `parseSourceYaml`; shared extractors are unmodified.
- [ ] 5.3 RED: `scripts/site/site-staleness.test.mjs` on a temp domaiNN. **First test: establish whether `checkScanImpact` reports `superseded` for header-unit citations in this layout.** Then cover current = clean/exit 0, superseded = flagged/exit 0, unresolved_in_latest = flagged/exit 1, `--json` is valid JSON, and the end-to-end import-then-flag flow.
- [ ] 5.4 GREEN: `scripts/site/site-staleness.mjs` (`checkStaleness`, CLI with `--json`; exit 1 only on unresolved).
- [ ] 5.5 Run the import CLI to create the committed snapshots and sidecars (generated). Scan for drive letters or home paths and check that none are present (CF: portable paths).
- [ ] 5.6 RED then GREEN: add a citation to `reference_site_NN.md` as `sources:: [sources/import/code-facts/<member>@## <tool>]`. Extend `site-domain.spec.ts` or the compile test so that `validateCitations` passes and the missing heading `## no_such_tool` yields `KU_UNKNOWN_SLUG`.
- [ ] 5.7 Regenerate `docs/next/` (the freshness test from 4.8 goes green again), then run `node scripts/verify.js --fast` and confirm there are no changes outside `site_NN/`, `scripts/site/`, `docs/next/` and the vitest spec.
