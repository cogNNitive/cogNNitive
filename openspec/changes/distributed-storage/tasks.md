# Tasks: Distributed storage

Change: `distributed-storage`. Mode: Strict TDD (every behavior task is `[RED]` failing test, then `[GREEN]` implementation, then `[REFACTOR]` where useful). Artifact store: openspec. Inputs: `proposal.md`, `design.md` (A1-A17, sections 9, 12, 14), 27 `specs/*/spec.md` files (the brief said 28; the folder holds 27), `exploration.md`.
Delivery strategy (decided by the maintainer, 2026-11-03): chained PRs, with `size:exception` admitted for a slice that exceeds the 400-line budget and has no pre-declared fallback split. Chain strategy (decided, 2026-11-03): `feature-branch-chain` with tracker branch `feature/distributed-storage`; PR 1 targets the tracker, every later PR targets the immediately previous PR branch, and only the tracker merges to `main`. The Review Workload Forecast is the last section of this file.

## Maintainer decisions (resolved 2026-11-03; apply unblocked)

Source: design.md section 14. The maintainer answered in chat on 2026-11-03: Q1 and Q2 apply (the defaults below are accepted as written), and Q3 is yes. The "Blocks" column now only says which slice each decision shapes.

| # | Decision | Default the design assumes if unanswered | Blocks |
|---|---|---|---|
| Q1 | Accept the narrow scope-chain spec delta: `scope_elements[].parent` values become `@slug` addresses instead of `[[title]]` references. Chain semantics (`findScopeChain`, `isolate`, inheritance) stay byte for byte. | Accepted. The `scope-chain` delta spec gets one explicit MODIFIED scenario (task S3b.10). | S3b |
| Q2 | Confirm that decision 6 (one grammar, no second form) covers in-document typed references: typed `[[Name]]` values become `@slug`, and the corpus cost (samples and fixtures) is paid in S7b. | Confirmed. In-document `[[Name]]` in typed fields is removed. Prose wikilinks are untouched. | S3b, S7b |
| Q3 | Cut the pending `lineage-as-changes` `templates-v*` tag together with this release (one tag, one re-pin). | Yes, one `templates-v*` tag at S7d, with the maintainer's explicit go at the S7d stop. | S7d |

Delivery-level decisions (also resolved 2026-11-03): chained PRs with `size:exception` admitted per slice, and chain strategy `feature-branch-chain` (tracker `feature/distributed-storage`). See the forecast.

## Other spec-level ambiguities and reconciliations (non-blocking; each has a default)

The spec phase and this planning pass found the following. Each row states the default that the tasks implement. Where a default changes spec text, a task edits the delta spec in this change folder.

| # | Ambiguity | Default implemented | Task |
|---|---|---|---|
| A-1 | Scope-chain `scope_elements` parent changes to `@slug` (the `scope-chain` delta says "left as is"; design A7 changes it). | Follows Q1. | S3b.8-S3b.10 |
| A-2 | Sealed changesets vs retargeting a moved instance. | Resolved by design A10: recorded targets are never rewritten; the fold re-keys through a `rekey` event and `ChangeLog.identities`. | S6b, S6c |
| A-3 | Citation scope: what the unified grammar covers. | Model and kNNowledge-unit citations use the unified grammar. Raw-file citations under `sources/` and every non-model file (including `_sidecar_NN.md` headings, CSV rows, JSON pointers) keep the path grammar. Only model-by-path and changeset-by-heading citations are removed (`MODEL_CITED_BY_PATH`, `NN_DOCUMENT_CITED_BY_HEADING`). | S1a, S1b |
| A-4 | Version uniformity also applies to compact concepts. | Applies to every L3 model, grouped by bluepriNNt name; error-level. Every domaiNN with mixed pins of any bluepriNNt turns red in `check_domain`. This is intended (design A14) and called out in docs. | S2b, S4a, S7c |
| A-5 | No operation removes an instance model (spec gap; `instance-model-lifecycle` lists removal as out of scope). | Out of scope for this change. Hand-deleting an instance file is reported as `MODEL_WITHOUT_FILE` (warning in fold mode, error in strict). A `remove_model` operation is recorded as a follow-up change; skill guidance states "not supported". | S6c, S7c |
| A-6 | A container slug `specs` collides with the blueprint-definition address prefix `specs/<family>@...` (`knowledge-unit-address`). | `specs` is reserved as the head of a model id. `parseAddress` treats `specs/<family>@...` as a blueprint address. A model whose derived id has head `specs` gets error `RESERVED_MODEL_ID`. Placement templates already reject a `specs` literal (design A2). | S1a.1, S2b.3 |
| A-7 | `video-folder-contract` living requirement "Canonical Domain, Series And Episode Layout" still names `<s>_scope_NN.md` and `<slug>_video-script_<s>_NN.md`; the delta only modifies "Naming Scheme By File Class". | Restate the stale requirement in the delta (a MODIFIED entry) so archive does not leave contradictory text. | S7a.11 |
| A-8 | Vocabulary page path: the living `canonical-vocabulary` spec says `docs/innfo/documentation/vocabulary.md`; `AGENTS.md` says `docs/documentation/content/vocabulary.md`. | Verified: the generator `scripts/generate-vocabulary-doc.mjs` writes `docs/documentation/content/vocabulary.md`, and `docs/innfo/documentation/` does not exist. The `AGENTS.md` path is correct. The living spec path is corrected at archive. | S7c.2 |
| A-9 | `nn-naming-contract` scenario "Two distributed concepts in one bluepriNNt: the two stems differ" contradicts design A4 (the concept is not in the file name; equal stems are legal because ids are hierarchical and `PLACEMENT_OVERLAP` keeps one folder to one template). | Tests assert design A4 (equal stems legal, ids differ). The delta scenario is amended to "the two ids differ; both stems satisfy `_NN`". The derivation lives in `naming/contract.ts` only (spec requirement), called from `domain/placement.ts`. | S2b.1, S2b.2 |
| A-10 | Single-file `validate_knowledge` must report file-local placement, naming and cardinality (`placement-validation`); design A12 only files layout diagnostics in `workspace: true` mode. | Add a pure file-local check (`fileLocalDiagnostics`: path vs template, name vs folder slug, slug vs folder, cardinality) that needs no domaiNN. Container existence, duplicates and skew stay domain-level. | S2b.6, S4a.4 |
| A-11 | Design says "there is no ambiguity code"; specs require that an unresolved or bare-slug address lists the candidate ids sharing its last segment, and a stale address SHOULD name its recorded successor. | `REF_MODEL_NOT_FOUND` messages list candidates (no new code). The successor comes from `ChangeLog.identities` (S6c). | S3b.2, S6c.9 |
| A-12 | Design A7 lists `MULTIVALUE_SYNTAX` as removed; the spec requires a stable-code diagnostic with a hint for non-canonical multivalue syntax. The code is frozen (`workspaceReferences.ts:52`, baseline fingerprints). | Keep the code `MULTIVALUE_SYNTAX`. Retarget it to address lists: the canonical form is the standard `[a, b]` field list; comma-joined or newline forms outside it fail with the code and a hint. The qualified-reference detection is removed. | S3b.3 |
| A-13 | Design A7 deletes the name fallback in typed references (`references.ts:81-115`); `model-mutation-references` keeps slug-first then name fallback and `AMBIGUOUS_ELEMENT_NAME` for intra-model wikilinks. | Split the two paths: typed field values are address-only; `[[target]]` wikilinks keep slug-first resolution. A non-regression test pins `AMBIGUOUS_ELEMENT_NAME`. | S3b.6, S3b.7 |
| A-14 | `instance-model-migration` requires all-or-nothing for a set of selected elements; the apply engine partitions per change (clean changes apply, the changeset ends `partially_applied`). | `extract_instance` changes of one changeset targeting the same source model form an atomic group: if one conflicts, the others get `DEPENDS_ON_CONFLICTED_CHANGE` (the `add_model` dependent-conflict pattern). | S6d.5 |
| A-15 | `instance-model-lifecycle`: the concept may be named explicitly or implicitly when the bluepriNNt has one distributed concept; design A9 only has explicit `concept::`. | Explicit `concept::` only. This satisfies "MUST identify". `video-script` has two distributed concepts, so implicit inference would not apply to it. | S6a.4 |
| A-16 | `version-uniformity-check`: the finding names the concept and lists the minority-group paths, and a model whose `parent_spec.url` cannot be classified is an incomparable pin; design A14 groups by bluepriNNt name from the name token only. | One finding per bluepriNNt. Its message and `meta` also carry `concepts` (the root and distributed concepts held by the skewed models) and the minority group paths. A pin with no version token, or with a present but unclassifiable `parent_spec.url`, is listed under `incomparable`. Verify phase may relax the url rule if it produces false errors on testlab fixtures. | S2b.9, S2b.10 |
| A-17 | `video-script-model` keeps "Flat headings SHALL remain supported for backward compatibility"; the design does not rule on it. | Untouched: it is heading syntax, not identity, addressing or storage. Recorded as out of scope. | none |
| A-18 | Sample inventory: design names 8 samples with typed `[[Name]]` (business x3, documentation, projects, organization, metrics, procedures); a count of single-bracket `[[...]]` finds 10 sample files (also `design-presets`, `innovation`, and a fourth `business`). Many hits may be prose. | S7b.1 builds the exact inventory (typed fields only) and records it in `apply-progress.md`. | S7b.1 |
| A-19 | The `changes` bluepriNNt ops (`concept` on `add_model`, `move_model`, `extract_instance`) must be in the closed `op` set before the apply engine can validate a changeset using them; design places the `changes` V_0-7-0 edit in S7a (after S6). | Deviation: the `changes` bluepriNNt edit moves into S6a, S6b and S6d (one unreleased `blueprint_version` V_0-7-0, bumped once in S6a and edited in place afterwards). S7a keeps `video-script`. Slice IDs and order are unchanged. | S6a.7, S6b.9, S6d.8 |

## Conventions

- **Paths.** `core/` = `iNNfo/packages/nn-core/src/`; `core-tests/` = `iNNfo/packages/nn-core/tests/` (vitest, flat `*.test.ts` plus subfolders; some specs sit beside sources as `*.spec.ts`); `mcp/` = `iNNfo/packages/nn-mcp/src/`; `mcp-tests/` = `iNNfo/packages/nn-mcp/test/` (singular `test`); `bp/` = `iNNfo/specs/bluepriNNts/`; `vs/` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/`; `pre/` = `skills/nn-preflight/scripts/`; `src-lib/` = `skills/nn-sources/scripts/lib/`. (M) modify, (D) delete, NEW create. Every M and D path below was confirmed with Glob or Grep at planning time unless marked "confirm at apply".
- **Imports.** New relative imports in nn-core MUST carry `.js` (NodeNext ESM). Browser-safe modules (`address/`, `domain/`, `schema/storage.ts`) stay pure: no `fs`, no `path`; `core-tests/browser-safe.test.ts` is extended for each.
- **Write-once.** Never edit a published `_V_x-y-z_` file. L1 `iNNfo_V_0-7-0_NN.md` is created new; `iNNfo_V_0-6-0_NN.md` is untouched. bluepriNNt `spec_NN.md` files are edited in place with a version bump. Samples are re-issued as new files and the superseded ones deleted (the `lineage-as-changes` A15 pattern; the immutability guard passes deletions).
- **Two version axes.** `blueprint_version` / `spec_version` / `template_version` are different axes, and `manifest/source.yaml` `version:` means `spec_version` for templates. After any version edit run `npm run sync:versions` and `npm run check:versions`; a swapped axis passes local gates and fails on `main` under `--release`.
- **Strict TDD.** One work-unit commit per `[RED]` + `[GREEN]` pair (Conventional Commits, no AI attribution). A `[RED]` and its `[GREEN]` never cross a PR boundary. The first test of each slice is run and seen red before any implementation.
- **Writers.** Builds and tests only. Never run `npm ci` or `npm install` in a worktree (`node_modules` are junctions into the primary checkout). Rebuild nn-core (`npm --workspace=@cognnitive/nn-core run build`) before trusting nn-mcp test failures. Preflight tests run with empty `HOME` and `USERPROFILE`.
- **Mirrors.** Any change under `core/` that is mirrored to CJS needs `node scripts/build-core-mirrors.mjs`, the regenerated `*.generated.cjs` committed, and `node --test scripts/build-core-mirrors.test.mjs` green. `console/nn-address.generated.js` is a mirror of the address builders. Mirrors, console bundles, catalogs and `canonical-registry.ts` are generated and excluded from the 400-line budget.
- **Standard PR gate.** `npm run verify:fast`, plus the targeted suites of the slice, plus `npm --prefix skills/nn-sources test` when `src-lib/` or mirrors changed. Targeted loops use `npm --workspace=@cognnitive/nn-core test -- <filter>`, `npm --workspace=@cognnitive/nn-mcp test -- <filter>`, `node --test <file>`, or `node scripts/verify.js --only=<substring>`. Full `node scripts/verify.js` runs at S2a, S5b, S7c, S7d.
- **Chained-PR structure.** Every PR body states start, end, prior dependency, follow-up and out-of-scope, with a dependency diagram marking the current PR. Draft/no-merge tracker rules apply only if `feature-branch-chain` is chosen. Replacement before deletion: every slice leaves all capabilities present.
- **Markers.** `[P]` can run in parallel with sibling tasks (disjoint files). `[S]` is sequential.
- **Spec traces.** Each RED names the capability slug and scenario it asserts, in parentheses.

---

## S0 - Provenance ban gate (PR 1, ~60 LOC)

Goal: the `sources::` ban applies to any pinned L1 `V_0-6-0` or later, so repinning to `V_0-7-0` cannot disable it (design A17, F13).
Depends on: `dev` at or after merge `81837577` (lineage-as-changes merged).
Files: `core/validator/knowledge-checks.ts` (M, `checkProvenanceBan` at line 350, the equality test `/V_0-6-0/i` at about line 360); `core/validator/knowledge-checks.spec.ts` (M; design named `tests/validator/knowledge-checks.test.ts`, which does not exist).
First failing test: a document pinned to `iNNfo_V_0-7-0` still raises `SOURCES_FIELD_BANNED`; `V_0-10-0` is later than `V_0-6-0` (numeric comparison, not lexicographic); `V_0-5-9` is not banned.

- [x] S0.1 [RED] [S] Add the three cases above to `core/validator/knowledge-checks.spec.ts`. (design A17; lineage-as-changes regression)
- [x] S0.2 [GREEN] [S] Replace the equality test with a numeric L1-version comparison helper `l1AtLeast(scope, 'V_0-6-0')` in the same file; no regex per version.
- [x] S0.3 [S] Standard PR gate. Open PR 1. (`verify.js --fast` green; two planning-spec requirements fixed to carry MUST; PR 1 targets the tracker.)

Verification: `npm --workspace=@cognnitive/nn-core test -- knowledge-checks`, `npm run verify:fast`.
Rollback: revert the PR; no persisted data changes.

---

## S1a - Address module, unwired (PR 2, ~350 LOC forecast; actual 648 hand-authored, `size:exception`, PR 500)

Goal: one pure `parseAddress` / `formatAddress` that is the only grammar for model, element, field, body, cell, concept and matrix addresses (design section 6). Nothing calls it yet.
Depends on: PR 1.
Files: NEW `core/address/{index,parse,format}.ts`; NEW `core-tests/address/{parse,format}.test.ts`; `core-tests/browser-safe.test.ts` (M).
First failing test (`core-tests/address/parse.test.ts`): `villabotijos-today/intro@00-gancho&voice` parses to a unit address with model `villabotijos-today/intro`, element `00-gancho`, field `voice`; `@programa-alfa` parses as relative; `kNNowledge/x_NN.md@## A` returns `MODEL_CITED_BY_PATH`.

- [x] S1a.1 [RED] [S] `parse.test.ts` table: model, element, field, `&#body`, cell `m@matrix&row&col`, `concept:Goal&owner`, `matrix:swot`, relative `@slug`; rejections `ADDRESS_MALFORMED` naming the offending segment (empty, URL, absolute path, `..`, line anchor, uppercase slug segment after the head); `[[T :: N]]` and a bare `Title :: Name` rejected naming the removed form; `kNNowledge/x_NN.md@## A` -> `MODEL_CITED_BY_PATH`; `changes/x_changes_NN.md@## NN Change: c-09` -> `NN_DOCUMENT_CITED_BY_HEADING`; `sources/import/interview.md@## Clients`, `report.pdf_sidecar_NN.md@## Findings`, `prices.csv@R12&price`, `data.json@/items/0/name` classified as source citations (not parsed here); `specs/business@concept:goal` classified as a blueprint address (reserved head `specs`, A-6); `intro_video-script` is a syntactically valid id (resolution is the index's job). (unified-reference-grammar: One grammar, Removed forms are rejected, Raw-file citations keep the path grammar; citation-parser-resolver; knowledge-unit-address)
- [x] S1a.2 [GREEN] [S] Implement `core/address/parse.ts` following the parse rules of design section 6 in order; types `ModelId` (branded), `Unit`, `Address`, `AddressError` in `core/address/index.ts`.
- [x] S1a.3 [RED] [S] `format.test.ts`: canonical output for every kind; relative form; round trip `parse(format(parse(x))) == parse(x)` over a generated table of every unit kind x model-id shape (compact stem, one-segment, three-segment). `fast-check` is not a dependency: use table-driven generation, do not install.
- [x] S1a.4 [GREEN] [S] Implement `core/address/format.ts`.
- [x] S1a.5 [RED]+[GREEN] [P] Extend `core-tests/browser-safe.test.ts` to cover `core/address/`; keep the module free of `fs`/`path`.
- [x] S1a.6 [REFACTOR] [S] Single regex source for segments shared by parse and format. Standard PR gate. Open PR 2.

Verification: `npm --workspace=@cognnitive/nn-core test -- address browser-safe`, `npm run verify:fast`.
Rollback: delete `core/address/` and its tests; nothing imports it.

---

## S1b - Wire the grammar into citations, targets and resolved targets (PR 3, ~380 LOC plus generated mirrors)

Goal: `sourceRef`, `resolved-target` and change-target parsing delegate to `parseAddress`; model-by-path and changeset-by-heading citations are rejected; source citations are unchanged.
Depends on: PR 2.
Files: `core/sourceRef.ts` (M: `parseCitation` line 114, `resolveUnitPath` line 444) and `core/sourceRef.spec.ts` (M); `core/changeset/resolved-target.ts` (M: `canonicalUnitModelId` line 15); `core/console/unit-address.ts` (M, builders accept hierarchical ids); `core/index.ts`, `core/browser.ts`, `core/trannsformPrimitives.ts` (M exports and CJS mirror); `mcp/tools/change-args.ts` (M, `parseTargetAddress`); NEW `mcp/tools/change-args.spec.ts`; `core-tests/changeset/facts.test.ts` (M); generated: `iNNfo/specs/bluepriNNts/console/nn-address.generated.js`, `*.generated.cjs` mirrors; `src-lib/{impact-checker,gc,duplicate-guards}.js` (M only if the nn-sources suite goes red, see S1b.9).
First failing test: `core-tests/changeset/facts.test.ts`: `resolvedTarget.field('a/b','s','f') === 'a/b@s&f'`; `parseCitation` keeps `report.pdf_sidecar_NN.md@## Findings`.

- [x] S1b.1 [RED] [S] `core/sourceRef.spec.ts`: `parseCitation('villabotijos-today/pepper-mapache@00-gancho')` returns a kNNowledge unit address (not a path); `kNNowledge/Client_business_NN.md` returns a failure naming the unified grammar and does not throw; `sources/import/a.md@## Intro`, CSV and JSON citations parse identically to today; a mixed `sources::` list parses a `header` unit and an element address; `resolveUnitPath` on `kNNowledge/...@## NN ...` returns a diagnostic naming the removed form and `<hierarchical-id>@<slug>`; retired prefixes still dangle `KU_DANGLING_FILE` with no special message; `sources/archive/...` still resolves; binary raw target yields `KU_BINARY_TARGET`; `@## NN Change: c-09` fails naming the removed form. (citation-parser-resolver; typed-source-references; unified-reference-grammar)
- [x] S1b.2 [GREEN] [S] Model branch of `sourceRef.ts` delegates to `parseAddress`; the source branch (non-model `.md` including sidecars, `.csv`, `.json`) is kept as is.
- [x] S1b.3 [RED] [S] `facts.test.ts`: `resolvedTarget.field/body/cell/concept` equal `formatAddress` output and equal `unitAddress.value/cell`; `canonicalUnitModelId('a/b')` accepted; a `.md` path or a backslash is rejected; matrix cell target equals `unitAddress.cell`. (changeset-document-model: Element and value targets equal canonical addresses; knowledge-unit-address)
- [x] S1b.4 [GREEN] [S] `resolved-target.ts` delegates to `formatAddress`; `unit-address.ts` validates each model-id segment with `^[A-Za-z0-9][A-Za-z0-9_-]*$`; regenerate `nn-address.generated.js`.
- [x] S1b.5 [RED] [S] `mcp/tools/change-args.spec.ts` (NEW): `parseTargetAddress` accepts `villabotijos-today/pepper-mapache@00-gancho&voice`, `m@concept:goal&owner`, `m@swot&r1&c1`, bare `m`; rejects path-like (`.md`, `\`) and `[[...]]` values naming the removed form. Rejection of a stem as a model needs the index and is tested in S3a.
- [x] S1b.6 [GREEN] [S] `parseTargetAddress` delegates to `parseAddress`.
- [x] S1b.7 [S] Export `parseAddress`, `formatAddress`, types from `core/index.ts`, `core/browser.ts`, `core/trannsformPrimitives.ts`; run `node scripts/build-core-mirrors.mjs`; `node --test scripts/build-core-mirrors.test.mjs`.
- [x] S1b.8 [REFACTOR] [S] Remove the duplicated model-id regexes now covered by `address/`.
- [x] S1b.9 [S] Run `npm --prefix skills/nn-sources test`. Adapt `src-lib/{impact-checker,gc,duplicate-guards}.js` only for what the suite shows red; bulk text and docs belong to S7c.
- [x] S1b.10 [S] Standard PR gate (green; PR 3 is opened by the orchestrator, targets `ds/s1a`).

Verification: `npm --workspace=@cognnitive/nn-core test -- sourceRef changeset address`, `npm --workspace=@cognnitive/nn-mcp test -- change-args`, `npm --prefix skills/nn-sources test`, `npm run verify:fast`.
Rollback: revert; address module from PR 2 stays inert.

---

## S2a - Storage declaration schema and L1 `iNNfo_V_0-7-0` (PR 4, ~350 LOC; new L1 file and registry are generated and excluded)

Goal: an L2 Concept Definition declares `storage::`, `container::`, `placement::`; `extractBlueprintSchema` reads them into `Concept.storage`; composition validates them (design A1, A2).
Depends on: PR 3.
Files: NEW `core/schema/storage.ts`; `core/schema/{extract,compose,index,metaschema}.ts` (M); `core/types/index.ts` (M, `Concept.storage`); NEW `iNNfo/specs/iNNfo_V_0-7-0_NN.md` (the diff against `iNNfo_V_0-6-0_NN.md` is stated in the PR body); `core/schema/canonical-registry.ts` (M, regenerated); `manifest/source.yaml` (M, only if the L1 or suite version is registered there; confirm at apply); NEW `core-tests/schema/storage.test.ts`; `core-tests/canonical-registry.test.ts` (M); NEW fixture bluepriNNts under `core-tests/fixtures/distributed-storage/`.
First failing test (`core-tests/schema/storage.test.ts`): placement grammar table (`{container}` not first, two `{slug}`, `..`, a `kNNowledge` literal) returns `PLACEMENT_INVALID`.

- [x] S2a.1 [RED] [S] Placement grammar table: valid `series/{slug}/` and `{container}/assets/{slug}/` and `proyectos/{slug}/models/`; invalid: no `{slug}`, two `{slug}`, `{container}` not first, `{container}` without `container::`, `..`, a `.`-prefixed segment, literals `archive`, `staging`, `specs`, `backups`, root `sources`, `kNNowledge`, uppercase literal, missing trailing `/`. (concept-storage-declaration: A distributed concept declares a placement rule; design A2)
- [x] S2a.2 [GREEN] [S] `core/schema/storage.ts`: `StorageMode`, `PlacementSegment`, `ConceptStorage`, `parsePlacement`, `validateStorage`; add `storage?: ConceptStorage` to `Concept` in `core/types/index.ts`.
- [x] S2a.3 [RED] [S] Declaration codes: `STORAGE_UNKNOWN_MODE` (`scattered` names the concept and the accepted values `compact`, `distributed`), `PLACEMENT_REQUIRED` (names the concept), `PLACEMENT_FORBIDDEN`, `CONTAINER_NOT_DISTRIBUTED` (names both concepts), `CONTAINER_CYCLE`, `PLACEMENT_OVERLAP` (two templates of one schema can match one folder); undeclared concept is `compact` with no diagnostic; a mixed declaration (`Series`, `Video` distributed, `Preset` compact) is read correctly; a local bluepriNNt that includes the declaring one inherits storage through composition; a distributed concept whose container is a compact concept is rejected (design A8 consequence: a compact model may not hold elements of a distributed concept). (concept-storage-declaration: all requirements except scope orthogonality)
- [x] S2a.4 [GREEN] [S] `extract.ts` reads the three Concept Definition properties; `compose.ts` merges them with concept definitions; `schema/index.ts` exports; `metaschema.ts` stops warning on the three properties when the pinned L1 is `V_0-7-0` or later (F18). Add a canonical-registry test that the new L1 declares them.
- [x] S2a.5 [GREEN] [S] Create `iNNfo/specs/iNNfo_V_0-7-0_NN.md` (verbatim `V_0-6-0` plus the three properties and the unified address grammar section; do not touch `V_0-6-0`). Regenerate `canonical-registry.ts` through `npm run sync:versions`; confirm the generator invocation in `scripts/sync-versions.mjs`.
- [x] S2a.6 [S] Standard PR gate plus `node scripts/verify.js` (full: template inventory guard, immutability guard `node --test scripts/guard-template-immutability.test.js`). Open PR 4. (Gate green incl. full `node scripts/verify.js` and the immutability guard; PR 4 is opened by the orchestrator, targets `ds/s1b`.)

Verification: `npm --workspace=@cognnitive/nn-core test -- storage canonical-registry schema`, `npm run sync:versions` leaves a clean diff, `npm run check:versions`, `node scripts/verify.js`.
Rollback: revert; the new L1 file is deleted with the PR (never released).

---

## S2b - Domain index: ids, classification, placement, collections, diagnostics, skew (PR 5, ~400 LOC; at budget)

Goal: `buildDomainIndex(models, declarations)` is the single source of ids, collections and layout diagnostics (design A5, A8, A12, A14, section 8).
Depends on: PR 4.
Files: NEW `core/domain/{index,classify,placement,skew}.ts`; `core/naming/contract.ts` (M: add the instance file-name derivation here, A-9); `core/index.ts`, `core/browser.ts`, `core/trannsformPrimitives.ts` (M exports and mirror for `versionSkew`); generated mirrors; NEW `core-tests/domain/{index,placement,skew,naming}.test.ts`.
First failing test (`core-tests/domain/index.test.ts`): two series each with a Video `intro` yield ids `villabotijos-today/intro` and `innteresante/intro`; adding a file leaves every other id unchanged.
Pre-declared fallback if hand-authored lines exceed 400 at apply: split S2b-i (S2b.1-S2b.4 placement, ids, classify) and S2b-ii (S2b.5-S2b.11 diagnostics, collections, skew); record in `apply-progress.md` and keep every task ID.

- [x] S2b.1 [RED] [S] `placement.test.ts` and `naming.test.ts`: `placementFor('Video','villabotijos-today/intro','video-script')` returns folder `series/villabotijos-today/assets/intro/` and file `intro_video-script_NN.md`; `{container}` expands to the container's instance root folder; a compact id with `/` is rejected; the stem derives from the folder slug and never contains the series name; equal stems in different folders are legal; two distributed concepts sharing a slug yield equal stems and distinct ids (design A4; see A-9). (nn-naming-contract: all three requirements; placement-validation: Instance naming)
- [x] S2b.2 [GREEN] [S] `naming/contract.ts` instance-stem function (derivation lives only here); `domain/placement.ts` calls it; `roleOf` is not changed and reads no folder (nn-naming-contract: Placement is checked separately from role; add the assertion that the same bytes at two paths give the same role).
- [x] S2b.3 [RED] [S] `index.test.ts`: ids of the worked table in design A5; id independent of discovery order (shuffle inputs); `DUPLICATE_MODEL_ID` lists every path and `byId` returns nothing for it; a bare stem (`intro_video-script`) and a bare slug (`intro`) do not resolve; `byPath` works; compact id equals the stem without `_NN` and is unchanged when a same-stem file is added elsewhere; head `specs` yields `RESERVED_MODEL_ID` (A-6); `MODEL_UNADDRESSABLE` when the resolver returns null, with no fallback id. (hierarchical-identity: all requirements; placement-validation: Identity is unique)
- [x] S2b.4 [GREEN] [S] `domain/index.ts` (`buildDomainIndex`, `byId`, `byPath`, `resolve`) and `domain/classify.ts` (compact vs instance, container chain); `resolve` returns `REF_MODEL_NOT_FOUND` with candidate ids sharing the last segment (A-11), `REF_ELEMENT_NOT_FOUND`, `REF_CONCEPT_MISMATCH`, `REF_BLUEPRINT_MISMATCH`, `ADDRESS_NOT_CANONICAL`.
- [x] S2b.5 [RED] [S] One test per layout code, with the message shape `<CODE>: <subject> - <what is wrong>; <fix>` (design A12 table): `PLACEMENT_MISMATCH` (shows the expected folder), `INSTANCE_NAME_MISMATCH` (expected name), `INSTANCE_SLUG_MISMATCH`, `CONTAINER_MISSING` (names the container concept and folder), `DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL` (registry double storage, and a Video only in a registry; names concept, slugs, would-be ids, fix `extract_instance` or `remove_element`), two roots in one model (cardinality), `MIXED_INSTANCE_MODEL`, `INSTANCE_SHADOWS_ELEMENT_ASSETS` (warning); a per-instance folder whose concept declares no storage yields no diagnostic; models pinning a non-declaring bluepriNNt are not checked; a changeset is never an instance model. (placement-validation; concept-storage-declaration: Folder shape never implies storage, Two instances in one model; video-folder-contract: An episode is stored once; video-script-model: A Video listed in a registry; model-discovery-predicate; changes-collection: Changeset is not an instance model)
- [x] S2b.6 [GREEN] [S] Diagnostics in `classify.ts`/`placement.ts`; export a pure `fileLocalDiagnostics(input)` (placement vs template, name vs folder slug, slug vs folder, cardinality; no domaiNN needed, A-10).
- [x] S2b.7 [RED] [S] Collections: `collection('Video')` over three instance models equals the same three Videos stored as compact elements (equal slugs; storage `distributed` vs `compact`); mixed storage (Series, Video distributed, Preset compact) each returns all instances; a misplaced instance is present and flagged; a double-stored Video appears once per copy, none dropped; ordered by id; compact element address is `<model-id>@<slug>`. (distributed-collection-resolution: One collection per concept, Instances are found wherever discovery finds models)
- [x] S2b.8 [GREEN] [S] `collection()` and `CollectionMember`.
- [x] S2b.9 [RED] [S] `skew.test.ts`: 24 uniform pins pass; two versions yield exactly one `BLUEPRINT_VERSION_SKEW` error per bluepriNNt with `meta { blueprint, concepts, versions: [{version,count,paths<=10}], incomparable }`; bare name counts as `unpinned` and is listed incomparable; unclassifiable `parent_spec.url` is listed incomparable (A-16); `villabotijos-today_V_0-1-0` vs `innteresante_V_0-1-0` are different bluepriNNts (no skew); applies to compact models; one finding not one per model. (version-uniformity-check: first three requirements)
- [x] S2b.10 [GREEN] [S] `domain/skew.ts` (`versionSkew`), exported in the CJS mirror.
- [x] S2b.11 [REFACTOR] [S] Shared segment helpers with `address/`; mirrors; standard PR gate. Open PR 5. (Gate green; PR 5 is opened by the orchestrator, targets `ds/s2a`.)

Verification: `npm --workspace=@cognnitive/nn-core test -- domain naming browser-safe`, `node --test scripts/build-core-mirrors.test.mjs`, `npm run verify:fast`.
Rollback: revert; the old id producers are still in place (nothing consumes the index yet).

---

## S3a - Node adapter; replace the four id producers (PR 6, ~380 LOC plus deletions counted separately)

Goal: `listKnowledge`, `findKnowledgeFile`, `provenance-models` and the console-independent producers all use the domain index; the stem-collision flip, `AMBIGUOUS_MODEL_ID` and the package-stem alias are removed (design A5, F4).
Depends on: PR 5.
Files: NEW `mcp/tools/domain-index.ts` (Node adapter with the `StorageDeclarationsResolver` port over the spec cache, sync after warm-up); NEW `mcp/tools/domain-index.spec.ts`; `core/helpers.ts` (M, `listKnowledge`; remove the collision flip at lines 127-131); `core/workspace/discoverModels.ts` (M: return each model's `(concept, slug)` element list); `mcp/tools/{spec,list-read,provenance-models,change-args,apply-change,resolve-sources,read-lineage,init-knowledge,mutate,validate,check-workspace}.ts` (M, id lookups only; `check-workspace` keeps a temporary `collisions` field computed from `DUPLICATE_MODEL_ID` until S4a); `mcp/tools/list-read.spec.ts` (M); `core-tests/helpers.test.ts` (M); `core/scope/index.ts`, `core/index.ts` (M exports); `scripts/dev/validate-scope-golden.mjs` (M, references `AMBIGUOUS_MODEL_ID` and `findStemCollisions`); (D) `core/scope/model-index.ts`, `core/scope/model-index.spec.ts`, `core/scope/stem-collision.ts`, `core/scope/stem-collision.spec.ts`, `mcp/tools/model-collisions.ts`, `mcp/tools/model-id.ts`; `mcp-tests/normalize-id.test.ts` (M or D with `model-id.ts`).
First failing test (`mcp/tools/list-read.spec.ts`): no id is a path; equal stems keep distinct ids; `read_knowledge` with an argument ending in `.md` or containing `\` returns `MODEL_ADDRESSED_BY_PATH`.

- [x] S3a.1 [RED] [S] `domain-index.spec.ts`: the adapter builds the index from a temp domaiNN with two series; an unresolvable bluepriNNt yields `MODEL_UNADDRESSABLE` naming the bluepriNNt and the model gets no id (R3). (hierarchical-identity; concept-storage-declaration)
- [x] S3a.2 [GREEN] [S] Implement `mcp/tools/domain-index.ts`.
- [x] S3a.3 [RED] [S] `list-read.spec.ts` and `helpers.test.ts`: ids are hierarchical (compact stem or instance id), unchanged when a same-stem file is added; `MODEL_ADDRESSED_BY_PATH`; the bare stem `intro_video-script` does not resolve and no `AMBIGUOUS_MODEL_ID` exists; unresolved `intro` lists `villabotijos-today/intro` and `innteresante/intro` as candidates; a misplaced instance model under `kNNowledge/` is still listed (discovery stays path-agnostic); a changeset under `changes/` is not listed; `knowledge_slug` does not resolve a model. (hierarchical-identity; knowledge-unit-address: Stem does not resolve; model-discovery-predicate; typed-source-references: Semantic Model Citation Target Resolution)
- [x] S3a.4 [GREEN] [S] `listKnowledge` and `discoverModels` use the index; `findKnowledgeFile` resolves through `DomainIndex.byId`; add `MODEL_ADDRESSED_BY_PATH`; remove the package-stem alias and the `knowledge_slug` aliasing used by id lookup.
- [x] S3a.5 [GREEN] [S] Switch the remaining id consumers listed in Files; build one index per tool call (per apply, under the lock).
- [x] S3a.6 [S] Delete the files listed under (D); update `scope/index.ts`, `core/index.ts`, mirrors and the golden script; rebuild nn-core.
- [x] S3a.7 [S] Standard PR gate. State the pure-deletion line count in the PR body. Open PR 6.

Verification: `npm --workspace=@cognnitive/nn-core run build`, `npm --workspace=@cognnitive/nn-core test -- helpers scope`, `npm --workspace=@cognnitive/nn-mcp test -- list-read domain-index`, `npm run verify:fast`.
Rollback: revert; S2b stays inert.

---

## S3b - References: title resolution deleted; address-only typed fields (PR 7, ~400 LOC; at budget; Q1 and Q2 resolved: apply)

Goal: typed reference and model fields resolve by address only; titles are display-only; `scope_elements[].parent` is an address (design A7, F9, F14).
Depends on: PR 6.
Files: `core/validator/workspaceReferences.ts` (M: delete `QUALIFIED_REF_RE`, `parseQualifiedRef`, `collectQualifiedReferenceCandidates`, the title and filename ladders and `resolveTargetModel`); `core/recursiveParser/workspaceIndex.ts` (M: delete `titleToNodeIds`, `fileNameToNodeIds`, `nodeElementConcepts` and the duplicate-title issue); `core/validator/references.ts` (M, name fallback for typed values) and `core/validator/references.spec.ts` (M); `core/validator/content.ts` (M, `conv-wikilinks` qualified-reference bypass); `core/validator/index.ts`, `core/index.ts` (M exports); `core/recursiveParser/knowledge.ts` (M, FR-005 note); `core/scope/elements.ts` and `core/scope/elements.spec.ts` (M); `core-tests/workspaceReferences.test.ts`, `core-tests/workspace-taxonomy-submodels.test.ts` (M, both mention the removed symbols); `core-tests/fixtures/programas-golden/kNNowledge/tutorias_NN.md` (M: `programa_ref:: [[Programa Alfa]]` -> `@programa-alfa`); `mcp/tools/propose-changeset.ts`, `mcp/server.ts` (M, one hit each of the removed symbols; confirm by Grep); `openspec/changes/distributed-storage/specs/scope-chain/spec.md` (M, delta).
First failing test (`core-tests/workspaceReferences.test.ts`): `[[T :: N]]` is `ADDRESS_MALFORMED` naming the removed form; a cross-model address resolves; an absolute self-reference is `ADDRESS_NOT_CANONICAL`; `scope/elements.spec.ts`: `parent` by `@slug`.
Pre-declared fallback if over 400: S3b-i (S3b.2-S3b.5 workspace references and index) and S3b-ii (S3b.6-S3b.10 typed-field resolution and scope parent).

- [x] S3b.1 [S] Confirm Q1 and Q2 are recorded as answered or defaulted in `apply-progress.md` before any edit.
- [x] S3b.2 [RED] [S] `workspaceReferences.test.ts`: dangling model names the address and referencing location; dangling element; valid reference passes; stale address after a move names the old id (successor named later, S6c.9); bare slug lists every candidate and resolves neither (A-11); absolute self-reference is `ADDRESS_NOT_CANONICAL`; `target_concepts` mismatch warns, including an instance model target whose root concept differs; `target_template` mismatch warns; a typed field with an address inside prose is not scanned; equal titles are legal (no duplicate-title issue); workspace-mode `validateModel` includes the diagnostics. (cross-model-reference-validation: all MODIFIED requirements; unified-reference-grammar: Titles are display-only, An address resolves exactly or not at all, Membership checks)
- [x] S3b.3 [GREEN] [S] Rewrite `validateWorkspaceReferences` over the domain index (`DomainIndex.resolve`); retarget `MULTIVALUE_SYNTAX` to address lists with the `[a, b]` canonical form and an inline hint (A-12); delete the removed symbols.
- [x] S3b.4 [RED] [S] `workspaceIndex`: no title, filename or element-name maps; two models with the same `title` produce no issue; `knowledge_slug` is not required unique and both Videos named `intro` keep distinct ids; the `conv-wikilinks` bypass for `[[<text> :: <text>]]` is gone and such a value is reported as a removed form. (cross-model-reference-validation: removed requirements; stable-element-identity: Model Frontmatter Identity Allow-List)
- [x] S3b.5 [GREEN] [S] Delete the maps and the bypass; key the index by `DomainIndex`; update the FR-005 note.
- [x] S3b.6 [RED] [S] `references.spec.ts`: a typed value is address-only (no name fallback); a prose wikilink `[[op-margin]]` still resolves slug-first, `[[Customer Acquisition Cost]]` still resolves by name fallback, `[[Priority]]` across two concepts still emits `AMBIGUOUS_ELEMENT_NAME`. (model-mutation-references; A-13)
- [x] S3b.7 [GREEN] [S] Remove the typed-value name fallback (`references.ts` lines 81-115 region); keep the wikilink path.
- [x] S3b.8 [RED] [S] `scope/elements.spec.ts`: `parent: programa_ref` resolves when the value is `@a1`; a `[[Title of a1]]` parent is rejected with the removed-form message; chain, `isolate`, inheritance and scope node ids (`<doc>#<Concept>/<slug>`) are unchanged. (scope-chain: unchanged chain; A-1)
- [x] S3b.9 [GREEN] [S] `scope/elements.ts` resolves `parent` through the address grammar (relative form); update the `programas-golden` fixture.
- [x] S3b.10 [S] Edit the `scope-chain` delta spec: add a MODIFIED scenario "Parent given by a reference field" (`[[Title of a1]]` -> `@a1`) next to the REMOVED collision requirement, and update its "left as is" note. (Q1)
- [x] S3b.11 [S] Corpus gate. Run `npm run verify:fast`. If samples or fixtures with typed `[[Name]]` or `[[T :: N]]` turn it red, pull the mechanical corpus commit of S7b.2-S7b.4 forward into this PR as separate `chore(corpus):` commits (mechanical, excluded from the budget) and record it in `apply-progress.md`; S7b then shrinks to the remainder. (risk T-1)
- [x] S3b.12 [S] Mirrors, standard PR gate. Open PR 7.

Verification: `npm --workspace=@cognnitive/nn-core test -- workspaceReferences references elements workspace-taxonomy`, `npm run verify:fast`, `rg "QUALIFIED_REF_RE|titleToNodeIds|resolveTargetModel" iNNfo/packages --glob "!**/bin/**"` returns nothing.
Rollback: revert; S3a ids remain.

---

## S3c - Slug-keyed graph identity (PR 8, ~250 LOC)

Goal: repeated element names are legal; node ids are `<model-id>@<slug>`; a repeated slug stays `DUPLICATE_SLUG` (design A6, F10).
Depends on: PR 7.
Files: `core/identity.ts` (M, `IdentityRegistry.register(parent, slug)`); `core/recursiveParser/normalize.ts` (M, remove the name-keyed drop at lines 248-291); `core/recursiveParser/{types,topology,relationships,workspace}.ts` (M if node-id shape is consumed; confirm by Grep); `core-tests/recursive-parser.test.ts` (M).
First failing test: two elements with the same name and distinct slugs are both in the graph.

- [x] S3c.1 [RED] [S] `recursive-parser.test.ts`: two Layers named `Gancho Presenter` with different slugs under one Scene are both present and no diagnostic is emitted; a repeated slug yields `DUPLICATE_SLUG` and the document is invalid; Scene `00-gancho` in two models is not a duplicate and the node ids are `villabotijos-today/pepper-mapache@00-gancho` and `innteresante/intro@00-gancho`; prefixed slugs stay valid. (stable-element-identity: A repeated element name is never dropped, Element slugs are scoped by the model id; hierarchical-identity: Element identity is scoped by the model id)
- [x] S3c.2 [GREEN] [S] Key the registry on slug; delete the name-keyed drop.
- [x] S3c.3 [RED] [S] Hosts: no element is omitted without an error; if registration ever rejects one, `validate_knowledge`, `check_domain` and the console build each surface an `error` naming model, parent and name (`mcp/tools/validate.spec.ts`, `core-tests/console-payload-builder.test.ts`). 
- [x] S3c.4 [GREEN] [S] Graph node ids use `<model-id>@<slug>` through an optional `modelId` parse option; a single-file parse without a domaiNN uses the relative `@<slug>` form. Adapt consumers of node ids.
- [x] S3c.5 [S] Mirrors, standard PR gate. Open PR 8.

Verification: `npm --workspace=@cognnitive/nn-core test -- recursive-parser console-payload`, `npm run verify:fast`.
Rollback: revert; the name-keyed drop returns.

---

## S4a - `check_domain.layout` (PR 9, ~350 LOC; logical dependency PR 6)

Goal: layout, identity and skew diagnostics reach users through `check_domain`, `validate_knowledge {workspace: true}` and single-file `validate_knowledge` (file-local only) (design A12).
Depends on: PR 6 (linear chain order: after PR 8).
Files: `mcp/tools/check-workspace.ts` and `check-workspace.spec.ts` (M: remove `collisions`, add `layout: { ok, diagnostics }`, `summaryOnly` cap 25 with `layoutTruncated`); `mcp/tools/validate.ts` and `validate.spec.ts` (M: `collectWorkspaceDiagnostics` files layout diagnostics against the model they name; single-file mode runs `fileLocalDiagnostics`); `mcp/server.ts` (M, output schema).
First failing test (`check-workspace.spec.ts`): `layout.diagnostics` carries `BLUEPRINT_VERSION_SKEW` with `meta` for a two-version fixture; `collisions` is absent.

- [x] S4a.1 [RED] [S] `check-workspace.spec.ts`: skew finding shape and meta; `ok: false` with skew; `PLACEMENT_MISMATCH` exact message `PLACEMENT_MISMATCH: series/x/videos/intro/intro_video-script_NN.md holds Video "intro" - Video instances live at series/x/assets/intro/; move the file there`; `DUPLICATE_MODEL_ID` message names every path; double storage reported with no flag that silences it; `summaryOnly` cap and `layoutTruncated`; a domaiNN pinning a non-declaring bluepriNNt has no placement findings; an unmigrated `video_NN`-shaped fixture is never modified (hash before and after). (placement-validation: Diagnostics are available where validation runs, Existing domaiNNs may fail until migrated; version-uniformity-check: A skew finding makes the domaiNN not clean, A new instance with an older pin; instance-model-migration: Migrating existing domaiNNs is out of scope; video-blueprint: Existing episodes pinning older versions)
- [x] S4a.2 [GREEN] [S] Implement `layout` in `check-workspace.ts`; delete the S3a `collisions` shim.
- [x] S4a.3 [RED] [S] `validate.spec.ts`: single-file `validate_knowledge` on a skewed model is silent for skew; on a misplaced file it reports the placement error (A-10); a duplicate identity is reported only by `check_domain`; `workspace: true` files each layout diagnostic against the model it names. (version-uniformity-check: Skew is a domain-level finding; placement-validation)
- [x] S4a.4 [GREEN] [S] Wire `fileLocalDiagnostics` and the workspace filing in `validate.ts`.
- [x] S4a.5 [S] Standard PR gate. Open PR 9.

Verification: `npm --workspace=@cognnitive/nn-mcp test -- check-workspace validate`, `npm run verify:fast`.
Rollback: revert; the S3a shim keeps duplicate-id reporting.

---

## S4b - `nn-upgrade` / `nn-preflight` grouped plan (PR 10, ~350 LOC)

Goal: Flow B upgrades every model of a bluepriNNt group or none (design A14).
Depends on: PR 9.
Files: `pre/upgrade-check.js` and `pre/upgrade-check.test.js` (M); `skills/nn-upgrade/SKILL.md` (M); the CJS `versionSkew` mirror consumed by preflight (confirm the import path at apply).
First failing test (`pre/upgrade-check.test.js`): the plan groups by bluepriNNt; a member added after planning changes `planHash`.

- [x] S4b.1 [RED] [S] `upgrade-check.test.js` (run with empty `HOME` and `USERPROFILE`): 24 Video instances on `V_0-14-1` plan one unit with count 24; `planHash` covers each group's member paths and current pins, and a model added after planning aborts the run; B4 repins every member or none (one member failing re-validation restores all 24 and the report names the failing id); the consent prompt states the number of models in the unit and no file is written before `[a]`; a mapping question is asked once per concept and applied to all instances; a pre-existing skew is reported first and the whole group goes to the adopted version. (workspace-template-upgrade: all three requirements)
- [x] S4b.2 [GREEN] [S] Group planning through `versionSkew`; hash over members; all-or-none repin using the existing backup and restore.
- [x] S4b.3 [S] Update `skills/nn-upgrade/SKILL.md` Flow B text (unit = bluepriNNt group). Standard PR gate (`node --test pre/upgrade-check.test.js`). Open PR 10.

Verification: `node --test skills/nn-preflight/scripts/upgrade-check.test.js`, `npm run verify:fast`.
Rollback: revert; per-model planning returns.

---

## S5a - Collections: `query_units`, `list_knowledge` (PR 11, ~300 LOC; logical dependency PR 6)

Goal: reads see one collection per concept regardless of layout (design A15).
Depends on: PR 6 (linear chain order: after PR 10).
Files: `core/queryUnits.ts` and `core/queryUnits.spec.ts` (M); `mcp/tools/query-units.ts` and `query-units.spec.ts` (M); `mcp/tools/list-read.ts` and `list-read.spec.ts` (M); `mcp/server.ts` (M); `mcp/tools/resolve-effective.spec.ts` (M, regression only; `resolve-effective.ts` is unchanged, F8).
First failing test (`query-units.spec.ts`): `collection:Video?status=published` across two instance models and one compact model returns the same URI-set shape.

- [x] S5a.1 [RED] [S] `query-units.spec.ts`: Videos `villabotijos-today/pepper-mapache` (published), `villabotijos-today/intro` (draft), `innteresante/intro` (published) -> filter returns the first and third; Scene collection URIs are full addresses with their owning instance; a bare element target with `?` is still rejected; same logical result for a compact copy. (distributed-collection-resolution: `query_units` filters across a concept's instances)
- [x] S5a.2 [GREEN] [S] Selector `collection:<Concept>?filter[&projection]` runs `runQuery` over member snapshots.
- [x] S5a.3 [RED] [S] `list-read.spec.ts`: items are `{ id, path, version, blueprint, storage }` sorted by id; asking for the `Video` collection returns both `intro` ids with distinct addresses; a misplaced instance is listed with a placement finding; listing models still returns only discoverable models; equal slugs, titles and field values across compact and distributed layouts. (distributed-collection-resolution: `list_knowledge` exposes collections; model-discovery-predicate: Misplaced instance is still returned)
- [x] S5a.4 [GREEN] [S] `list_knowledge` shape and collection argument.
- [x] S5a.5 [RED]+[GREEN] [P] `resolve-effective.spec.ts`: an instance model inherits `fps` from the series scope exactly as before; membership in a collection adds, removes and reorders no supplier; a folder holding an instance model without `scope: true` is not in the chain. (concept-storage-declaration: Storage is orthogonal to the scope chain; distributed-collection-resolution: Value resolution is unchanged)
- [x] S5a.6 [S] Standard PR gate. Open PR 11.

Verification: `npm --workspace=@cognnitive/nn-core test -- queryUnits`, `npm --workspace=@cognnitive/nn-mcp test -- query-units list-read resolve-effective`, `npm run verify:fast`.
Rollback: revert; the S3a `list_knowledge` stays.

---

## S5b - Console: model ids, exact cell keys, collections, title autocomplete (PR 12, ~400 LOC plus generated bundle and fixture; at budget)

Goal: the console payload carries the hierarchical `modelId`, matches provenance exactly, exposes a `collections` slot, renders references by title and stores the address (design A15, F5).
Depends on: PR 11.
Files: `core/console/payload-builder.ts` (M: replace `normalizeModelId` at line 156; remove the suffix match at lines 357-366; add `collections`); `core/console/slot.ts` (M if the slot type changes); `iNNfo/specs/bluepriNNts/console/{nn-runtime.js,ui-kit.js}` (M: reference rendering and autocomplete); `core-tests/console-payload-builder.test.ts`, `core-tests/console-payload.test.ts`, `core-tests/console-runtime.test.ts`, `core-tests/console-dom.test.ts` (M); generated: `console/nn-console.bundle.js` (`node scripts/build-console-bundle.mjs`), `test/fixtures/testlab/domaiNN_console.html` (`node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`, committed with the sources).
First failing test: `modelId` is the hierarchical id; a cell key from another model with the same suffix is not matched.

- [x] S5b.1 [RED] [S] Payload tests: `modelId` equals the domain index id; exact-key cell provenance (no suffix match; two models with the same suffix never cross); `collections` lists `collection(C)` members per concept; two exported copies (Videos compact vs distributed) list the same titles and field values. (distributed-collection-resolution: The console builds collections from declarations; hierarchical-identity)
- [x] S5b.2 [GREEN] [S] `payload-builder.ts` uses the index; delete `normalizeModelId` and the suffix match.
- [x] S5b.3 [RED] [S] DOM/runtime tests (jsdom): a field storing `villabotijos-today/pepper-mapache` displays `El mapache fuera de la ley` and links to the instance while the stored value stays the address; autocomplete over `collection(target_concepts)` filters by title substring and shows `title - address`; two Videos titled `Intro` are both listed and nothing is written until one is selected; selection inserts the address (relative when the target is in the same model); validator messages show title and address. (unified-reference-grammar: Titles are display-only, Authoring surfaces autocomplete by title and write the id)
- [x] S5b.4 [GREEN] [S] Runtime and ui-kit changes; run `node scripts/build-console-bundle.mjs` and regenerate and commit the testlab fixture. Never edit generated inline hashes by hand.
- [x] S5b.5 [S] Standard PR gate plus full `node scripts/verify.js`. Open PR 12.

Verification: `npm --workspace=@cognnitive/nn-core test -- console`, `node scripts/verify.js`, `node --test scripts/export-console.test.mjs`.
Rollback: revert; regenerate the bundle and fixture from the reverted sources.

---

## S6a - `add_model` with placement and replay skeleton (PR 13, ~380 LOC; logical dependency PR 6)

Goal: `add_model` with `concept::` creates an instance model at its placement path; strict replay rebuilds the same skeleton (design A9).
Depends on: PR 6 (linear chain order: after PR 12).
Files: `mcp/tools/apply-change.ts` (M: `addModelProblems`, placement path, persistence creating and cleaning folders, `MODEL_EXISTS` by id and by occupied path, `DOMAIN_LAYOUT_INVALID` only for compact, `modelIdAliases` and `canonicalizeTarget` compact-only); `core/scaffold/knowledge.ts` (M, `scaffoldKnowledgeDocument({root})` writes `## NN <Concept>: <name>` and `slug:: <slug>`); `mcp/tools/provenance-strict.ts` (M, same scaffold call); `core/changeset/{types,parser,serializer,hasher}.ts` (M: optional `concept` on `add_model`; absent keys must not change existing `proposal_sha` values); `bp/changes/spec_NN.md` (M: `concept` option, `blueprint_version` -> `V_0-7-0`, bumped once, A-19); `mcp/tools/apply-change-facts.spec.ts`, `mcp-tests/apply-change-models.test.ts`, `mcp-tests/provenance-strict.test.ts`, `core-tests/changeset/{parser,serializer,hasher,template}.test.ts` (M); NEW fixture bluepriNNt with `Series` and `Video` distributed (test-only; the real `video-script` arrives in S7a).
First failing test (`apply-change-facts.spec.ts`): `add_model {concept: Video, target: villabotijos-today/intro}` writes `series/villabotijos-today/assets/intro/intro_video-script_NN.md`; `provenance-strict` replay is clean.

- [x] S6a.1 [RED] [S] Apply tests: file at the placement path with the skeleton root element; nothing under `kNNowledge/`; `validate_knowledge` valid; `models` entry has `result_version` and no `base_version`; no `kNNowledge/` folder needed (no `DOMAIN_LAYOUT_INVALID`); compact `add_model` (`acme`) unchanged; container missing rejects naming `no-such-series` and writes nothing; container created earlier in the same changeset works and a later-created container yields `ADD_MODEL_ORDER`; `MODEL_EXISTS` on an existing id and on an occupied path, file byte-identical, dependents `DEPENDS_ON_CONFLICTED_CHANGE`; an unresolvable bluepriNNt writes nothing (`BLUEPRINT_UNRESOLVED`); a failing final rename removes the folders it created. (instance-model-lifecycle: add_model, Existing identity is a conflict; changeset-apply-engine: Crash-safe persist, Model creation via add_model)
- [x] S6a.2 [GREEN] [S] Implement the instance branch of `add_model` using `DomainIndex.placementFor`; scaffold with root; folder creation with cleanup.
- [x] S6a.3 [RED] [S] Targeting and atomicity: `update_field` on `villabotijos-today/pepper-mapache@00-gancho&voice` updates the placement file and stamps that `resolved_target`; unknown model id is a conflict naming the id, no file written; bare slug `intro@00-gancho&voice` is a conflict listing both candidates; a stem target (`pepper-mapache_video-script@00-gancho&voice`) is rejected as a removed form; a recorded target keeps resolving when a same-slug Video is added elsewhere; a three-instance changeset with one invalid model is `rejected` `VALIDATION_FAILED` and writes none; all valid -> `models` has three entries keyed by id, each with its own `base_version` and `result_version`; a placement violation aborts before Phase 2. (change-addressing-for-instance-models: all but strict replay and MODEL_WITHOUT_FILE; changeset-document-model: models map keyed by id, Stem target is rejected; changeset-apply-engine: Two-Phase Apply Transaction)
- [x] S6a.4 [GREEN] [S] Target resolution through `DomainIndex.byId`; candidate listing; `concept::` is explicit only (A-15); `modelIdAliases` applies to compact targets only.
- [x] S6a.5 [RED] [S] Strict replay: a created instance edited by two `update_field` changes is rebuilt through the same `scaffoldKnowledgeDocument({root})` call and compared; a one-byte unrecorded hand edit is reported as drift; an instance with no recorded creation is reported as not strictly checkable naming its id. (change-addressing-for-instance-models: Strict replay reproduces instance models)
- [x] S6a.6 [GREEN] [S] `provenance-strict.ts` uses the shared skeleton and handles instance models.
- [x] S6a.7 [RED]+[GREEN] [S] Parser, serializer and hasher accept `concept` on `add_model`; the `changes` bluepriNNt declares it; `template.test.ts` asserts the blueprint validates a changeset using it and `proposal_sha` of existing fixtures is unchanged. (changeset-document-model: Instance operations belong to the closed `op` set; A-19)
- [x] S6a.8 [S] `npm run sync:versions`, mirrors, standard PR gate. Open PR 13.

Verification: `npm --workspace=@cognnitive/nn-core run build`, `npm --workspace=@cognnitive/nn-mcp test -- apply-change provenance-strict`, `npm --workspace=@cognnitive/nn-core test -- changeset`, `npm run verify:fast`.
Rollback: revert; compact `add_model` is unchanged by design.

---

## S6b - Rekey, `move_model`, referrer check, asset-rename deletion (PR 14, ~400 LOC; at budget)

Goal: moving or renaming an instance is one atomic recorded operation; recorded targets stay valid through a fold-time rekey (design A10, F12, F19).
Depends on: PR 13.
Files: `core/changeset/{types,parser,serializer}.ts` (M: op `move_model`, field `to`); `core/changelog/{fold,units,index,load}.ts` (M: `rekey(old -> new, order)` event, `ChangeLog.identities(id)`); `mcp/tools/apply-change.ts` (M: move checks, folder rename, stem rename, root `slug::` rewrite, version bump of the moved model only, `MOVE_LEAVES_DANGLING_REFERENCES`; delete the `rename_element` asset-directory rename at lines 1439-1463); `mcp/tools/propose-changeset.ts` (M: `missing_referrer_updates`); `mcp/server.ts` (M); `bp/changes/spec_NN.md` (M: `move_model` option); `core-tests/changelog/fold.test.ts`, `mcp/tools/apply-change-facts.spec.ts`, `mcp/tools/propose-changeset.spec.ts`, `mcp-tests/apply-change-models.test.ts` (M).
First failing test (`core-tests/changelog/fold.test.ts`): a rekey keeps history under the new id; `apply-change` of a move with an unretargeted referrer returns `MOVE_LEAVES_DANGLING_REFERENCES`.
Pre-declared fallback if over 400: S6b-i (S6b.1-S6b.2 fold rekey and identities) and S6b-ii (S6b.3-S6b.9 move apply).

- [x] S6b.1 [RED] [S] Fold tests: after `move_model innteresante/intro -> villabotijos-today/intro`, units, element origins, tombstones and history keyed `old@...` or `old/...@...` re-key to the new id from that order on; descendant instances get the prefix rewrite; on a slug change `old@old-slug...` maps to `new@new-slug...`; `identities(id)` returns former ids oldest first; `history(unit)` follows the chain; earlier sealed changeset bytes and `proposal_sha` are untouched. (instance-model-lifecycle: Recorded targets stay resolvable; hierarchical-identity: Moving an instance changes its id)
- [x] S6b.2 [GREEN] [S] Implement the `rekey` event and `identities` in the fold.
- [x] S6b.3 [RED] [S] Apply tests: `MOVE_REQUIRES_INSTANCE` on a compact target; `MODEL_EXISTS` when the new id is taken (nothing changes); `CONTAINER_MISSING`; folder, stem and id agree after a rename (`intro` -> `welcome`) and the old id no longer resolves; destination folder occupied rejects with the original unchanged; a persistence failure after the folder rename restores folder, file, id and releases the lock (locked-file test, R4); an invalid result is `rejected` `VALIDATION_FAILED` with no file or folder change; a move that also rewrites a reference in a second model that would be invalid changes neither; the moved model is bumped only when its body changed and descendants are relocated with no version transition; changing a title is not a move; `rename_element` no longer touches `assets/<slug>`. (instance-model-lifecycle: Rename, Move, Result is validated as a whole; changeset-apply-engine: Instance operations are applied through the same transaction)
- [x] S6b.4 [GREEN] [S] Implement the `move_model` apply path inside the existing atomic persistence and rollback.
- [x] S6b.5 [RED] [S] Referrers: a move whose referrers are not retargeted by `update_field` in the same changeset is `MOVE_LEAVES_DANGLING_REFERENCES`; with the retargets it applies and validation reports no broken reference; `propose_changeset` returns the missing `update_field` changes as `missing_referrer_updates`. (hierarchical-identity: Stale references after a move are rewritten or reported, never guessed; instance-model-lifecycle: Rename and move report broken references)
- [x] S6b.6 [GREEN] [S] Referrer scan and `propose_changeset` payload.
- [x] S6b.7 [REFACTOR] [S] Delete the asset-rename code path; remove dead helpers.
- [x] S6b.8 [S] Parser, serializer and `server.ts` accept `move_model` and `to`.
- [x] S6b.9 [S] `changes` bluepriNNt: add `move_model` to the `op` options (unreleased `V_0-7-0`, edited in place); `template.test.ts` asserts it; `npm run sync:versions`. (changeset-document-model: Changeset with an instance operation validates; A-19)
- [x] S6b.10 [S] Mirrors, standard PR gate. Open PR 14.

Verification: `npm --workspace=@cognnitive/nn-core test -- changelog changeset`, `npm --workspace=@cognnitive/nn-mcp test -- apply-change propose-changeset`, `npm run verify:fast`.
Rollback: revert; instances can still be created but not moved.

---

## S6c - Drift, identity-chain replay, history and impact keyed by id (PR 15, ~350 LOC)

Goal: a touched model with no file entry is never skipped silently; strict replay, staleness and delete impact follow ids and identity chains (design A10, section 7).
Depends on: PR 14.
Files: `core/changelog/drift.ts` (M, `checkProvenance` at line 167); `mcp/tools/provenance-strict.ts`, `mcp/tools/provenance-models.ts`, `mcp/tools/check-workspace.ts` (M); `core/changeset/history.ts` (M, `checkStaleTarget` maps through `identities`); `core/changeset/impact.ts` (M, `evaluateBatchDeleteImpact` at line 228 keys by `ModelId`); `core/changeset/conflicts.ts` (M); `core/validator/workspaceReferences.ts` (M, successor in stale-reference errors); `core-tests/changelog/drift.test.ts`, `core-tests/changeset/{history,impact}.test.ts`, `mcp-tests/provenance-differential.test.ts`, `mcp-tests/provenance-strict.test.ts`, `mcp-tests/provenance-contracts.test.ts` (M).
First failing test (`core-tests/changelog/drift.test.ts`): `MODEL_WITHOUT_FILE` names the model and the change; the fold/replay differential with a move is clean.

- [x] S6c.1 [RED] [S] Drift: an applied change on `villabotijos-today/intro` with no file entry yields `MODEL_WITHOUT_FILE` naming the id and the change (warning in fold mode, error in strict); the same change with the model present yields none; a model renamed by `move_model` whose identity chain ends in a live model yields none (a hand-deleted instance is reported, A-5). (change-addressing-for-instance-models: A touched model with no file entry is reported)
- [x] S6c.2 [GREEN] [S] `checkProvenance` emits `MODEL_WITHOUT_FILE`; `check_domain.provenance` surfaces it.
- [x] S6c.3 [RED] [S] Replay: instance created, edited, then renamed -> strict replay reproduces the renamed file with no drift; the identity chain gathers changes recorded under former ids; the differential test (fold vs replay) gains move sequences (R5); `check_domain` reports no drift for an instance after a rename, and the earlier changeset bytes and `proposal_sha` verify. (instance-model-lifecycle: Recorded targets stay resolvable; change-addressing-for-instance-models)
- [x] S6c.4 [GREEN] [S] Identity-chain replay in `provenance-strict.ts`.
- [x] S6c.5 [RED] [S] History and staleness: `STALE_TARGET_DELETED` is keyed by model id plus slug (`00-gancho` removed in `villabotijos-today/intro` does not stale a pending change on `innteresante/intro@00-gancho&voice`; it does for the same instance); a pending change authored against a renamed instance is resolved through the identity chain or conflicts naming the new id and never applies to another instance; the 50-changeset cap and the stop at the latest `add_element` are unchanged. (delete-impact-and-lifecycle: The staleness scan is keyed by model id and slug)
- [x] S6c.6 [GREEN] [S] `history.ts` maps through `identities`.
- [x] S6c.7 [RED] [S] Impact: equal-stem instances do not collapse (a reference to `innteresante/intro@00-gancho` from `innteresante/pitch` does not block removing `villabotijos-today/intro@00-gancho`; it blocks removing `innteresante/intro@00-gancho` with `REFERENCED_BY: innteresante/pitch&<field>`); cascaded matrix cells stay within the model. (delete-impact-and-lifecycle: Delete impact is keyed by hierarchical id)
- [x] S6c.8 [GREEN] [S] `impact.ts` keyed by `ModelId`; `displayStem` is no longer a key.
- [x] S6c.9 [RED]+[GREEN] [S] A stale reference to a moved instance names the old id and SHOULD name its recorded successor from `identities` (A-11). (unified-reference-grammar: Stale address after a move names the successor; cross-model-reference-validation: Stale reference after a move)
- [x] S6c.10 [S] Mirrors, standard PR gate. Open PR 15.

Verification: `npm --workspace=@cognnitive/nn-core test -- changelog changeset`, `npm --workspace=@cognnitive/nn-mcp test -- provenance`, `npm run verify:fast`.
Rollback: revert; moves still work but are reported as `UNIT_WITHOUT_RECORD` drift when scanned.

---

## S6d - `extract_instance` (PR 16, ~400 LOC; at budget)

Goal: a recorded compact-to-distributed operation that creates drift-free instance models (design A11).
Depends on: PR 15.
Files: `core/mutate.ts` (M: extract a subtree by `parentSlug`); `core/changeset/{types,parser,serializer}.ts` (M: op `extract_instance`); `core/changelog/{fold,units}.ts` (M: `rekey(compact-id@S -> instance-id@S)` for the extracted slug set); `mcp/tools/apply-change.ts` (M); `mcp/tools/provenance-strict.ts` (M: seed from the source); `bp/changes/spec_NN.md` (M: `extract_instance` option); `core-tests/changelog/fold.test.ts`, `mcp-tests/provenance-strict.test.ts`, `mcp-tests/apply-change-models.test.ts`, `core-tests/mutate.test.ts` (M).
First failing test (`core-tests/changelog/fold.test.ts`): extract yields no `UNIT_WITHOUT_RECORD` or `EDITED_WITHOUT_RECORD`; strict replay seeds from the source.

- [x] S6d.1 [RED] [S] Apply: a registry `InnteresanteVideos` holding Videos `intro` and `nuevo` becomes instance models `innteresante/intro` and `innteresante/nuevo` with Scene and Layer slugs preserved (`innteresante/intro@00-gancho`), field values and evidence citations equal; the source no longer holds them and placement reports no double storage; instance models record only `result_version`, the registry is bumped once with base and result version; field values are never altered; a selected element of a concept that is not distributed is rejected; an existing instance gives `MODEL_EXISTS` and the message points to `remove_element` for double storage. (instance-model-migration: Compact instances become instance models, Versions follow the existing rules)
- [x] S6d.2 [GREEN] [S] `mutate.ts` subtree cut; `apply-change.ts` extract path reusing the S6a skeleton.
- [x] S6d.3 [RED] [S] Fold and drift: no `UNIT_WITHOUT_RECORD` or `EDITED_WITHOUT_RECORD` for moved units; the old target `InnteresanteVideos@intro&status` resolves to `innteresante/intro` through the identity chain with no drift; the same layout produced by hand still reports drift (negative control). (instance-model-migration: The migration is recorded and drift-free, Addresses recorded for the old location still resolve)
- [x] S6d.4 [GREEN] [S] Fold rekey of the slug set.
- [x] S6d.5 [RED] [S] Atomic group (A-14): with one destination occupied (`series/innteresante/assets/nuevo/`), the changeset rejects naming `innteresante/nuevo`, `innteresante/intro` is not created and both registry elements remain. (instance-model-migration: The migration is all or nothing)
- [x] S6d.6 [GREEN] [S] Group conflict propagation for `extract_instance` changes with the same source.
- [x] S6d.7 [RED]+[GREEN] [S] Strict replay seeding: replay the source up to the extract change, cut subtree S into the skeleton, continue under the new id; instances and the reduced registry both match their replay; differential test gains extract sequences (R5). (instance-model-migration: Strict replay across the migration)
- [x] S6d.8 [S] `changes` bluepriNNt gets `extract_instance`; `template.test.ts` asserts the full op set (`move_model`, `extract_instance`, `add_model.concept`); `npm run sync:versions`. (A-19)
- [x] S6d.9 [S] Mirrors, standard PR gate. Open PR 16.

Verification: `npm --workspace=@cognnitive/nn-core test -- changelog changeset mutate`, `npm --workspace=@cognnitive/nn-mcp test -- apply-change provenance`, `npm run verify:fast`.
Rollback: revert; `video-script` in S7a does not depend on the op.

---

## S7a - `video-script` V_0-15-0 and video engine (PR 17, ~400 LOC plus mechanical test renames)

Goal: the real bluepriNNt declares its storage; the video engine follows the new file names and the declared placement (design A16).
Depends on: PR 16.
Files: `bp/video-script/spec_NN.md` (M: `blueprint_version` `V_0-15-0`, L1 pin `iNNfo_V_0-7-0`, `Series` and `Video` declarations per design section 5, `Scene`, `Layer`, `Preset`, `Video Defaults` compact, guidance that the Series instance model is the series scope document with `scope: true`); `bp/video-script/defaults/**` (M, package defaults `parent_spec` to the same version); the skill `SKILL.md` under `vs/` (M, `version:` bumped once); catalogs regenerated by `npm run sync:versions`; `vs/references/{folder-contract,series-template-convention,parameters}.md` (M); `vs/scripts/{build-script-from-draft,finalize-video}.mjs`, `vs/scripts/draft-template.html` (M: `<s>_scope_NN.md` -> `<s>_video-script_NN.md`, `<slug>_video-script_<s>_NN.md` -> `<slug>_video-script_NN.md`); `vs/test/{build-layout,build-script-from-draft,finalize-video,frame,preset-selector,render-thumbnail-series,series-root,series-scope,folder-contract-crosscheck}.test.mjs` (M; Grep confirms 14 files name `_scope_NN` or `_video-script_<s>` across scripts, references and tests); `vs/scripts/lib/nn-core.generated.cjs` (regenerated mirror); NEW `core-tests/video-script-storage.test.ts`; `openspec/changes/distributed-storage/specs/video-folder-contract/spec.md` (M, A-7). The `video` bluepriNNt is retired (F3) and gets no version.
First failing test (`core-tests/video-script-storage.test.ts`): the shipped `video-script` declares `Series` and `Video` distributed (`Video` container `Series`, placement `{container}/assets/{slug}/`) and `Scene`, `Layer`, `Preset`, `Video Defaults` compact.

- [ ] S7a.1 [RED] [S] `video-script-storage.test.ts`: declarations as above; an episode at `series/villabotijos-today/assets/pepper-mapache/` validates with no placement finding; an episode under `kNNowledge/` yields `PLACEMENT_MISMATCH`; a Video also present as a registry element yields the double-storage error naming both locations; Scene and Layer are not models and are addressed `villabotijos-today/pepper-mapache@00-gancho`; a second Video in one script is rejected; two episodes each with Scene `00-gancho` give two Scenes. (video-blueprint: The video-script bluepriNNt declares its storage; video-script-model: One Video Per One Script; concept-storage-declaration: Video instance model holds Scenes and Layers)
- [ ] S7a.2 [GREEN] [S] Edit `bp/video-script/spec_NN.md` (in place, version bump) and defaults; `npm run sync:versions`.
- [ ] S7a.3 [RED] [S] Existing pins: an episode on `video-script_V_0-14-1` among `V_0-15-0` is reported as skew and the file is not modified; an episode pinning `villabotijos-today_V_0-1-0` gets no placement finding and is untouched. (video-blueprint: Existing episodes pinning older versions are reported; placement-validation: Models pinning a non-declaring bluepriNNt are not checked)
- [ ] S7a.4 [GREEN] [S] Fixtures only; no code beyond S2b-S4a is needed. If a test is red, record the gap in `apply-progress.md` rather than patching around it.
- [ ] S7a.5 [RED] [S] Engine: `vs/test/*.test.mjs` assert `build-script-from-draft.mjs` writes `<slug>_video-script_NN.md` (no series name), the same slug in two series produces two names that both satisfy the rule and `check_domain` reports no duplicate id, the Series scope document is recognized by `scope: true` as `<s>_video-script_NN.md` (`series-root.test.mjs`, `series-scope.test.mjs`), and `folder-contract-crosscheck.test.mjs` compares the layout in `folder-contract.md`, SKILL.md and the spec with the declared placement rules. (video-folder-contract: Naming Scheme By File Class, Series and episode locations are declared by the bluepriNNt)
- [ ] S7a.6 [GREEN] [S] Update the scripts, template and references; regenerate the skill mirror.
- [ ] S7a.7 [S] Scope regression: `resolve_effective` for an episode still resolves `fps` from the series scope document (the Series instance model carrying `scope: true`).
- [ ] S7a.8 [RED]+[GREEN] [P] `changes` regression: the `changes` bluepriNNt keeps `nature: { structure: members, ownership: derived }`; a `Change` unit keeps `<batch>#<change-id>`; a changeset is never an instance model. (changes-collection)
- [ ] S7a.9 [S] Immutability and catalog gates: `node --test scripts/guard-template-immutability.test.js` (a strictly greater `blueprint_version` passes), `npm run check:versions`, catalog freshness and parity.
- [ ] S7a.10 [S] Skill `version:` bumped exactly once.
- [ ] S7a.11 [S] Edit the `video-folder-contract` delta: add a MODIFIED entry for "Canonical Domain, Series And Episode Layout" restating the script name and the series anchor name (A-7).
- [ ] S7a.12 [S] Standard PR gate. Open PR 17.

Verification: `npm --workspace=@cognnitive/nn-core test -- video-script-storage`, `node --test iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/test/*.test.mjs` (or `node scripts/verify.js --only=video-script`), `npm run verify:fast`.
Rollback: revert; the released `video-script` stays at `V_0-14-1`.

---

## S7b - Corpus: new sample versions and fixtures (PR 18, ~100 LOC plus mechanical corpora; Q2 resolved: apply)

Goal: samples and fixtures use addresses; superseded sample files are deleted (the `lineage-as-changes` A15 pattern).
Depends on: PR 17.
Files: sample files under `bp/*/samples/*_NN.md` (NEW with a patch-bumped `knowledge_version`; (D) the superseded ones); fixtures under `core-tests/fixtures/**` (M); `test/fixtures/testlab/**` (M, regenerate the console fixture); `test/simulation/fixtures/**` (path from design.md; not found by Glob at planning, confirm at apply); catalogs and references to deleted samples (M); NEW `core-tests/corpus-address-scan.test.ts`.
First failing test (`core-tests/corpus-address-scan.test.ts`): every kNNowledge document under samples and fixtures validates with no removed-form or `ADDRESS_MALFORMED` diagnostic.

- [ ] S7b.1 [S] Inventory (A-18): list sample files whose typed reference or model fields contain `[[Name]]` or `[[T :: N]]`, with counts; record in `apply-progress.md`. A single-bracket Grep finds 10 sample files today, the design names 8.
- [ ] S7b.2 [RED] [S] Corpus scan test as above, plus: no reference to a deleted sample file remains; the immutability guard passes the deletions. (unified-reference-grammar: Removed forms are rejected)
- [ ] S7b.3 [GREEN] [S] Create the new sample versions through the repo's own change path where practical (changes applied to a copy), delete the superseded files, update catalogs and references. Migrate typed `[[Name]]` to `@slug`; prose wikilinks stay.
- [ ] S7b.4 [GREEN] [P] Migrate fixtures under `core-tests/fixtures/**`, `test/fixtures/testlab/**`, `test/simulation/fixtures/**`; regenerate `test/fixtures/testlab/domaiNN_console.html` (`node scripts/export-console.mjs test/fixtures/testlab --domain --no-open`) and commit it.
- [ ] S7b.5 [S] If S3b.11 already pulled the corpus forward, reduce this PR to the remainder and say so in the PR body.
- [ ] S7b.6 [S] Standard PR gate. Open PR 18.

Verification: `npm --workspace=@cognnitive/nn-core test -- corpus`, `node scripts/verify.js --only=sample`, `npm run verify:fast`.
Rollback: revert; restores the superseded samples.

---

## S7c - Vocabulary, skills, shared rules, docs, final gate test (PR 19, ~400 LOC; at budget)

Goal: documentation and agent guidance match the behavior; a gate test keeps the removed forms out of live code (design A3, section 10 S7).
Docs already authored (2026-11-03, side PR 501 `docs/distributed-storage`, based on `ds/s0`): `docs/documentation/content/concepts/storage-and-identity.md`, `content/how-to/distribute-a-concept.md`, the glossary, the concept and how-to pages that mention ids, references, citations or changes, and the `nn-innfo` / `nn-upgrade` docs pages (plus `documentation_NN.md`, `_sidebar.md`, `llms.txt`, `ai-index.yaml`). S7c therefore keeps only `vocabulary.json` and its generated page, the `SKILL.md` files, shared rules and mirrors, `src-lib/*`, and the gate test; at S7c, reconcile PR 501's diagnostics tables with the final code names and re-check the docs facts guards.
Depends on: PR 18.
Files: `iNNfo/specs/vocabulary.json` (M); `docs/documentation/content/vocabulary.md` (M, generated by `node scripts/generate-vocabulary-doc.mjs`; check with `--check`); `AGENTS.md` (M, vocabulary block if the consistency check requires it); `iNNfo/AGENTS.md` (the spec names it; not found by Glob at planning, confirm at apply); `skills/nn-innfo/SKILL.md`, `skills/nn-upgrade/SKILL.md`, `skills/nn-sources/{SKILL.md,citations.md}` (M); `scripts/skill-shared-rules.md` and its mirrors (M; locate the mirrors with Grep for a rule marker); `src-lib/{impact-checker,gc,duplicate-guards}.js` (M, model citations as addresses, remaining work after S1b.9); NEW `scripts/no-removed-address-forms.test.mjs` (gate; confirm it is picked up by the shape-based test discovery of `scripts/verify.js` and not hand-enumerated).
First failing test: `scripts/no-removed-address-forms.test.mjs`: live code contains no `QUALIFIED_REF_RE`, `titleToNodeIds`, `AMBIGUOUS_MODEL_ID`, `findStemCollisions`, and no parser of `@## NN Change:`.

- [ ] S7c.1 [RED] [S] Gate test: `rg` over live code excluding `openspec/changes/archive/`, write-once files, generated bundles rebuilt at release, and spec history. Also asserts no code resolves an address by title.
- [ ] S7c.2 [RED]+[GREEN] [S] `vocabulary.json`: one entry each for compact storage, distributed storage, instance model, collection, placement rule, hierarchical id; "title is display-only for addressing"; no entry uses "catalog"; the existing `catalog` meaning unchanged; each entry states that these are kNNowledge-level concepts, not new levels, and that an instance model is a kNNowledge document; the `collection` entry states its relation to the `members` collection of `changes`; remove entries that exist only for removed forms. Regenerate the page; run the vocabulary consistency check. (canonical-vocabulary: all three requirements; A-8)
- [ ] S7c.3 [GREEN] [P] Skills and shared rules: unified grammar, no title addressing, one `bluepriNNt` version per bluepriNNt and `nn-upgrade` unit semantics, how to create, move and extract instances, and that removing an instance is not supported (A-5).
- [ ] S7c.4 [GREEN] [P] `skills/nn-sources/citations.md` and `src-lib/*`: model citations become addresses; source citations (including sidecar headings) unchanged.
- [ ] S7c.5 [GREEN] [S] Mirrors for shared rules; `npm run sync:versions` if a skill version moves; skill `version:` bumps follow the repo rule (once per changed skill).
- [ ] S7c.6 [GREEN] [S] Doc note: `check_domain` now errors on any bluepriNNt pinned at several versions (A-4).
- [ ] S7c.7 [S] Standard PR gate plus full `node scripts/verify.js` and `npm --prefix skills/nn-sources test`. Open PR 19.

Verification: `node --test scripts/no-removed-address-forms.test.mjs`, `node scripts/generate-vocabulary-doc.mjs --check`, `node scripts/verify.js`.
Rollback: revert; docs and the gate test only (the shared-rules mirrors regenerate).

---

## S7d - Release commit (PR 20, ~60 LOC plus generated; MAINTAINER STOP; Q3 resolved: cut the lineage-as-changes tag together)

Goal: one release event at the tracker tip (design section 11).
Depends on: PR 19.
Files: `manifest/source.yaml` (M: the `changes` entry at lines 61-64 is `V_0-6-0`; confirm the correct version axis per the two-axis rule, and confirm how `video-script` is registered because it is not named in the file at planning time); the new L1 and the suite version registration; generated catalogs, `core/schema/canonical-registry.ts`, MCP bundle per the repo release mechanism (`scripts/lib/channel-refs.js` computes refs; versions come from `npm run sync:versions`).
First failing check: before the tag and re-pin exist, `node scripts/manifest/validate-manifest.js --channel stable` (in the rehearsal worktree) is red; it must be green after.

- [ ] S7d.1 [S] Run `node scripts/nn-session.mjs batch-status` and read the per-key "bump needed" output (templates, skills, nn-mcp, nn-console). Decide the tag set with the maintainer; do not cut any tag without explicit confirmation in chat.
- [ ] S7d.2 [S] Version bumps: `manifest/source.yaml` entries, `npm run sync:versions`, `npm run check:versions`; confirm `iNNfo_V_0-7-0` is registered; regenerate catalogs and `canonical-registry.ts`.
- [ ] S7d.3 [S] Rehearsal in a detached worktree (`git worktree add --detach <tmp> <sha>`, never a stash or reset in the primary): `node scripts/verify.js --release` and `node scripts/manifest/validate-manifest.js --channel stable`; keep `HOME` and `USERPROFILE` empty for preflight fixtures.
- [ ] S7d.4 [S] Tracker or tip merge to `main` with a merge commit, not a squash (validate-manifest rejects an unmerged tag and byte-checks template content on `main` against the pin). If the pending `lineage-as-changes` tag has not been cut, both changes ship in one `templates-v*` tag (Q3).
- [ ] S7d.5 [S] After the maintainer confirms: cut `templates-v*`, re-pin `channels.stable.refs`, wait for the Pages deploy and the post-push CI gate on `main` (`verify`, `quality`, `spec-integrity`, `site`, `publish-web`).
- [ ] S7d.6 [S] Success-criteria sweep: `rg` finds no title-based resolution and no `@## NN Change:` parsing in live code; `video_NN` and `LC_programas` untouched; `node scripts/verify.js --release` and CI green after the re-pin.

Verification: the four gates above.
Rollback: before the tag, revert the PR; after the merge, revert the tracker merge commit and re-pin the previous `templates-v*` tag. No existing domaiNN is migrated by this change.

---

## Traceability: capability -> slices

Every one of the 27 spec files maps to at least one task. Task ids name the RED that asserts the scenarios.

| Capability (spec file) | Requirements -> task ids |
|---|---|
| concept-storage-declaration | per-concept storage, placement and container, combinations: S2a.1-S2a.4; model root and children, folder shape never implies storage, two roots: S2b.5; scope orthogonality: S5a.5, S7a.7; video instance model: S7a.1 |
| hierarchical-identity | container plus slug, uniqueness, stem is not an id: S2b.3, S3a.3; move changes id, stale references: S6b.1, S6b.5; element identity scoped: S3c.1; compact ids stable: S2b.3 |
| unified-reference-grammar | one grammar, removed forms: S1a.1, S1b.1, S3b.2-S3b.5; titles display-only: S3b.2, S3b.4, S5b.3; autocomplete: S5b.3; exact resolution and successor: S2b.4, S3b.2, S6c.9; raw-file citations: S1a.1, S1b.1; membership checks: S3b.2 |
| version-uniformity-check | uniform pins, one finding, incomparable pins: S2b.9, S2b.10; error-level: S4a.1; domain-level only: S4a.3; scope floors unchanged: S5a.5 |
| distributed-collection-resolution | one collection, found wherever discovered: S2b.7, S5a.3; `list_knowledge`, `query_units`: S5a.1-S5a.4; value resolution unchanged: S5a.5; console: S5b.1, S5b.3 |
| change-addressing-for-instance-models | targets by id, unrelated additions, atomic multi-instance, never guessed: S1b.5, S3a.3, S6a.3; `MODEL_WITHOUT_FILE`: S6c.1; strict replay: S6a.5 |
| instance-model-lifecycle | `add_model`, conflicts: S6a.1; rename, move, validated whole: S6b.3; recorded targets, references: S6b.1, S6b.5, S6c.3 |
| instance-model-migration | create, drift-free, old targets, all-or-nothing, versions: S6d.1-S6d.7; unmigrated domaiNN untouched: S4a.1, S7d.6 |
| nn-naming-contract | stem from folder slug, suffix rule, placement not in `roleOf`: S2b.1, S2b.2 (A-9) |
| model-discovery-predicate | classification, misplaced still returned, folder alone does not classify: S2b.5, S3a.3, S5a.3 |
| stable-element-identity | `knowledge_slug` not unique, repeated name never dropped, slug scoped by model: S3b.4, S3c.1, S3c.3 |
| cross-model-reference-validation | existence, membership, typed fields only, host wiring, canonical multivalue, removed requirements: S3b.2-S3b.5 (A-12) |
| knowledge-unit-address | builders accept hierarchical ids, stem does not resolve: S1b.3, S1b.4, S3a.3 |
| citation-parser-resolver | `parseCitation`, `resolveUnitPath`, `@## NN Change:` not parsed: S1a.1, S1b.1 |
| model-mutation-references | slug-first wikilinks unchanged, cross-model link is an address: S3b.6, S3b.7 (A-13) |
| typed-source-references | parser shapes, citation target resolution, bare slug candidates: S1a.1, S1b.1, S3a.3 |
| changeset-document-model | targets use the unified grammar, `models` keyed by id: S1b.3, S6a.3; instance ops in the closed `op` set: S6a.7, S6b.9, S6d.8 |
| changeset-apply-engine | two-phase transaction, crash-safe persist, `add_model` placement: S6a.1, S6a.3; instance operations through the same transaction: S6b.3 |
| delete-impact-and-lifecycle | impact keyed by id, staleness keyed by id plus slug, rename after `base_version`: S6c.5-S6c.8 |
| workspace-template-upgrade | all-or-nothing unit, mapping once, pre-existing skew: S4b.1, S4b.2 |
| video-folder-contract | naming scheme, layout declared by the bluepriNNt, episode stored once: S7a.5, S7a.1, S7a.11, S2b.5 |
| video-blueprint | declares storage, ships as a new version, old pins reported: S7a.1-S7a.3, S7a.9, S7d.2, S7d.3 |
| placement-validation | placement, path-agnostic discovery, naming, identity, double storage, diagnostics where validation runs, unmigrated domaiNNs: S2a.1, S2b.1-S2b.6, S3a.3, S4a.1, S4a.3 |
| video-script-model | one Video per script, no registry copy, Scenes belong to their instance: S2b.5, S3c.1, S7a.1 |
| canonical-vocabulary | storage terms, "catalog" not reused, title display-only: S7c.2 (A-8) |
| changes-collection | `changes` collection unaffected: S6a.7, S7a.8, S2b.5 |
| scope-chain | collision requirement removed: S2b.3, S3a.3; `parent` by `@slug`: S3b.8-S3b.10; chain unchanged: S5a.5, S7a.7 |

Design-only items: A17 (S0); the L1 file (S2a.5); R3 (S3a.1); R4 (S6b.3); R5 (S6c.3, S6d.7); R6 (`INSTANCE_SHADOWS_ELEMENT_ASSETS`, S2b.5); release (S7d).

## Risks and dependency notes

- T-1 (sequencing): S3b removes the typed-name fallback, so write-once samples and fixtures with typed `[[Name]]` can turn `verify:fast` red before S7b. Contingency is S3b.11.
- T-2 (linear chain vs logical edges): S4a, S5a and S6a depend logically on PR 6 only. In a linear chain they queue behind PR 8, PR 10 and PR 12. Reordering does not change content; stacked PRs against `main` would allow S4, S5 and S6 to run in parallel only if each is independently green.
- T-3 (at-budget slices): S2b, S3b, S5b, S6b, S6d, S7a and S7c are at or near 400 hand-authored lines. Fallback splits are pre-declared for S2b, S3b and S6b; S5b, S6d, S7a and S7c need a split decision at apply if the diff exceeds budget.
- T-4 (tracked build artifacts): `iNNfo/packages/nn-mcp/bin/nn-mcp.bundle.js` is tracked and contains the removed symbols. Confirm at apply whether a freshness guard requires regeneration per slice or only at release; never commit a locally built artifact that CI does not expect.
- T-5 (cold spec cache): `MODEL_UNADDRESSABLE` can appear offline for a domain-local bluepriNNt that is not on disk. Core bluepriNNts are in the embedded registry (R3).
- T-6 (Windows): folder renames with open handles (R4) need the locked-file rollback test at S6b.3.
- T-7 (single-writer): one writer per slice. Do not run parallel writers without isolated worktrees.

## Review Workload Forecast

Hand-authored lines exclude generated files (mirrors, bundles, catalogs, `canonical-registry.ts`, the new L1 spec file, console fixture) and mechanical corpora. Numbers are planning estimates from design.md section 12, not diff counts.

| PR | Slice | Hand-authored LOC | Generated or mechanical (excluded) | Depends on (logical) |
|---|---|---|---|---|
| 1 | S0 | ~60 | none | dev |
| 2 | S1a | ~350 | none | 1 |
| 3 | S1b | ~380 | mirrors, `nn-address.generated.js` (~150) | 2 |
| 4 | S2a | ~350 | new L1 spec (~700), `canonical-registry.ts` (~200) | 3 |
| 5 | S2b | ~400 | mirrors (~100) | 4 |
| 6 | S3a | ~380 | mirrors; ~600 deleted lines counted separately | 5 |
| 7 | S3b | ~400 | mirrors; possible corpus pull-forward (see T-1) | 6 |
| 8 | S3c | ~250 | mirrors | 7 |
| 9 | S4a | ~350 | none | 6 |
| 10 | S4b | ~350 | mirror | 9 |
| 11 | S5a | ~300 | none | 6 |
| 12 | S5b | ~400 | console bundle, testlab fixture (thousands) | 11 |
| 13 | S6a | ~380 | catalogs (~50) | 6 |
| 14 | S6b | ~400 | mirrors | 13 |
| 15 | S6c | ~350 | mirrors | 14 |
| 16 | S6d | ~400 | mirrors | 15 |
| 17 | S7a | ~400 | catalogs, skill mirror, mechanical test renames | 16 |
| 18 | S7b | ~100 | samples (about 8-10 new and as many deleted), fixtures, testlab console | 17 |
| 19 | S7c | ~400 | generated vocabulary page, shared-rules mirrors | 18 |
| 20 | S7d | ~60 | generated registries, bundle | 19 |

Estimated total: about 6,460 hand-authored lines across 20 PRs, plus roughly 5,000-8,000 generated or mechanical lines.

| Field | Value |
|---|---|
| Estimated changed lines | ~6,460 hand-authored (+ generated and mechanical) |
| 400-line budget risk | High (seven slices at 380-400 lines) |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 -> PR 2 -> ... -> PR 20, one slice per PR (see the table above) |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: No (resolved 2026-11-03: chained PRs, `size:exception` admitted per slice, `feature-branch-chain`)
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Ban gate for L1 `V_0-6-0` or later | PR 1 | Base: tracker (feature-branch-chain) or `main`/`dev` (stacked-to-main) |
| 2 | Address module, unwired | PR 2 | Depends on PR 1 |
| 3 | Grammar wired into citations, targets, resolved targets | PR 3 | Depends on PR 2 |
| 4 | Storage declaration schema and L1 `V_0-7-0` | PR 4 | Depends on PR 3; full `verify.js` |
| 5 | Domain index | PR 5 | Depends on PR 4; fallback split S2b-i/ii |
| 6 | Node adapter; one id producer | PR 6 | Depends on PR 5 |
| 7 | Address-only typed references | PR 7 | Depends on PR 6; blocked by Q1, Q2 |
| 8 | Slug-keyed graph identity | PR 8 | Depends on PR 7 |
| 9 | `check_domain.layout` | PR 9 | Logical dependency PR 6 |
| 10 | Grouped `nn-upgrade` plan | PR 10 | Depends on PR 9 |
| 11 | Collections, `query_units`, `list_knowledge` | PR 11 | Logical dependency PR 6 |
| 12 | Console ids, collections, autocomplete | PR 12 | Depends on PR 11; full `verify.js` |
| 13 | `add_model` with placement | PR 13 | Logical dependency PR 6 |
| 14 | Rekey and `move_model` | PR 14 | Depends on PR 13; fallback split |
| 15 | Drift, identity-chain replay, impact by id | PR 15 | Depends on PR 14 |
| 16 | `extract_instance` | PR 16 | Depends on PR 15 |
| 17 | `video-script` V_0-15-0 and video engine | PR 17 | Depends on PR 16 |
| 18 | Corpus re-issue | PR 18 | Depends on PR 17; blocked by Q2 |
| 19 | Vocabulary, skills, docs, gate test | PR 19 | Depends on PR 18; full `verify.js` |
| 20 | Release commit | PR 20 | Maintainer stop; blocked by Q3 |

Splits and merges versus design.md section 12: none of the 20 slices is split or merged. The only deviation is content placement (A-19): the `changes` bluepriNNt edit moves from S7a into S6a, S6b and S6d because the apply engine validates changesets against it.

Delivery decisions (maintainer, 2026-11-03): `delivery_strategy` = chained PRs (the 20 above), with `size:exception` admitted for a slice that runs over 400 lines and has no pre-declared fallback split (S5b, S6d, S7a, S7c need that call at apply; S2b, S3b, S6b have declared splits). `chain_strategy` = `feature-branch-chain` with tracker `feature/distributed-storage`. Rationale: existing domaiNNs (`video_NN`, `LC_programas`) stop validating once the old forms are removed, so only the tracker may reach `main`, and only after S7d. Q1-Q3 are resolved as recorded at the top of this file.
