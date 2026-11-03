# Apply progress: distributed-storage

## Chain status (updated 2026-11-03)

Strategy: chained PRs, `feature-branch-chain`, tracker `feature/distributed-storage`; `size:exception` admitted per slice without a declared split. Only the tracker reaches `main`.

| Slice | PR | Branch | Base | State |
|---|---|---|---|---|
| S0 | 495 | `ds/s0` | tracker | open, applied |
| S1a | 500 | `ds/s1a` | `ds/s0` | open, applied (648 lines, `size:exception`) |
| Docs (side PR) | 501 | `docs/distributed-storage` | `ds/s0` | open; vocabulary, skills and gate test stay in S7c |
| S1b | 505 | `ds/s1b` | `ds/s1a` | open, applied (741 hand-authored changed lines, `size:exception`) |
| S2a | 506 | `ds/s2a` | `ds/s1b` | open (756 hand-authored lines incl. fixtures, `size:exception`) |
| S2b to S7d | n/a | n/a | n/a | not started |

Pending decisions: none blocking. Labels: the repo has no `size:exception` label; the exception is recorded in each PR body.

## S0 - Provenance ban gate (PR 1)

Status: S0 done (S0.1, S0.2, S0.3). The two `verify --fast` failures the apply pass reported were resolved by the orchestrator: the "Check OpenSpec Delta Specs" failure was real planning text (ADDED requirements in `specs/citation-parser-resolver/spec.md` and `specs/stable-element-identity/spec.md` lacked MUST; both now carry it), and the "Docs-Derived Facts Drift Guard" failure was environmental (nn-mcp `dist/` not built in the worktree; built with `tsup --config tsup.dist.config.ts`). `node scripts/verify.js --fast` then passed in full.

### Claim check (before editing)
`checkProvenanceBan` in `iNNfo/packages/nn-core/src/validator/knowledge-checks.ts` gated on `/V_0-6-0/i.test(scope)`, where scope = `${l1Version} ${parentName} ${parentUrl}`. Confirmed: only the literal `V_0-6-0` fires the ban; `V_0-7-0` and `V_0-10-0` do not. The only caller (`validator/knowledge.ts:168`) passes the template `parent_spec.name` as `l1Version`.

### Tasks
- [x] S0.1 RED: five cases appended to `src/validator/knowledge-checks.spec.ts` (describe "checkProvenanceBan - L1 version gate"): `V_0-6-0` banned, `V_0-7-0` banned, `V_0-10-0` banned (numeric), `V_0-5-9` not banned, and a guard that a bluepriNNt version (`business_V_0-9-0`) is not an L1 pin.
- [x] S0.2 GREEN: `l1AtLeast(scope, floor)` (exported) plus `PROVENANCE_BAN_FLOOR = 'V_0-6-0'`; numeric per-component compare; no per-version regex.
- [x] S0.3 standard PR gate: `verify.js --fast` green; PR 1 opened against the tracker `feature/distributed-storage`.

### TDD evidence
- RED: `node ../../../node_modules/vitest/vitest.mjs run src/validator/knowledge-checks.spec.ts` (cwd `iNNfo/packages/nn-core`): 14 tests, 2 failed (`V_0-7-0` and `V_0-10-0`: `expected [] to include 'SOURCES_FIELD_BANNED'`), the right reason. The `V_0-6-0`, `V_0-5-9` and bluepriNNt-version cases passed already (they pin existing behavior).
- GREEN: same command plus `tests/validator/knowledge-checks.test.ts`: 2 files, 19 tests passed.
- REFACTOR: none needed.

### Deviations
1. Test file: tasks.md and the orchestrator name `src/validator/knowledge-checks.spec.ts`; used it. Note that `iNNfo/packages/nn-core/tests/validator/knowledge-checks.test.ts` DOES exist (it holds the existing `checkProvenanceBan` tests), contrary to the note in tasks.md. Left untouched; passes.
2. `l1AtLeast` only counts tokens of the form `iNNfo_V_x-y-z`, not any `V_x-y-z`. The old regex matched a bluepriNNt version too (`business_V_0-6-0`), which was accidental; counting any token with a `>=` rule would newly ban every document whose bluepriNNt is at or after 0-6-0 regardless of its L1. Verify phase: confirm no caller relies on a bare `V_0-6-0` without the `iNNfo_` prefix (the full nn-core suite is green).

### Line counts (hand-authored)
- `knowledge-checks.ts`: +34 / -4 (diff stat 38 lines changed).
- `knowledge-checks.spec.ts`: +57 / -1 (58 lines changed).
- Total 92 insertions, 4 deletions. No generated files. Below the 400-line budget; no `size:exception` needed.

### Gate (S0 verification)
- `node ../../../node_modules/typescript/bin/tsc` (nn-core): exit 0.
- `vitest run` full nn-core: 204 files, 2118 tests passed.
- `node scripts/verify.js --fast`: 202 of 204 steps green; 2 failures, neither caused by S0:
  - "Check OpenSpec Delta Specs": `specs/citation-parser-resolver/spec.md:80` and `specs/stable-element-identity/spec.md:48` have ADDED requirements without SHALL/MUST (pre-existing planning text in the change folder).
  - "Docs-Derived Facts Drift Guard": nn-mcp `dist/server.js` is not built in this worktree (environment).
- For verify: both failures need a decision outside S0 (spec wording fix; build nn-mcp before the drift guard).

## S1a - Address module, unwired (PR 2, branch `ds/s1a`, targets `ds/s0`)

Status: S1a done (S1a.1 to S1a.6). Nothing outside the new module and its tests references it.

### Claim check (before editing)
- `core/address/` did not exist. `roleOf` and `parseName` live in `src/naming/contract.ts` (pure, browser-safe) and are reused for the path-class decision. `tests/browser-safe.test.ts` only tested the browser entry export list, so S1a.5 adds a per-module source check instead of an export check.
- `MODEL_CITED_BY_PATH` and `NN_DOCUMENT_CITED_BY_HEADING` are new codes; no existing code defines them.

### Tasks
- [x] S1a.1 RED `tests/address/parse.test.ts` (35 tests).
- [x] S1a.2 GREEN `src/address/{index,parse,grammar}.ts`.
- [x] S1a.3 RED `tests/address/format.test.ts` (59 tests including a generated round-trip table: 4 model-id shapes x 7 unit kinds plus bare ids, relative, blueprint and source rows).
- [x] S1a.4 GREEN `src/address/format.ts`.
- [x] S1a.5 RED+GREEN `tests/browser-safe.test.ts` extended (6 new tests).
- [x] S1a.6 REFACTOR: one pattern source (`grammar.ts`) used by parse and format; built into S1a.2 and confirmed by S1a.4 (format imports the same constants).

### TDD evidence
- S1a.1 RED: `node ../../../node_modules/vitest/vitest.mjs run tests/address/parse.test.ts` (cwd `iNNfo/packages/nn-core`): suite failed to load, module `../../src/address/index` absent (the right reason). GREEN: same command, 35 passed.
- S1a.3 RED: `... run tests/address/format.test.ts`: suite failed, `formatAddress` not a function (export absent). GREEN: `... run tests/address`: 2 files, 94 passed.
- S1a.5: the new tests pass on the first run because the module is already clean, so RED was proven by mutation: appended an `import { join } from 'node:path'` line to `src/address/format.ts`, observed `format.ts imports no node built-in` fail (1 failed, 8 passed), restored the file, 9 passed. A matcher self-test (`flags a node import when one is present`) stays in the suite.
- Triangulation: each unit kind has a positive and a rejecting case; model ids cover compact stem, one-segment and three-segment; the `specs` head has positive and negative cases.
- REFACTOR: only `grammar.ts`; tests re-run green.

### Design decisions inside S1a (beyond design section 6)
1. `Address` has two extra kinds, `blueprint` (`specs/<family>[@concept:|@matrix:]`) and `source` (`{ raw }`), because tasks.md requires the parser to classify those without parsing them. `parseAddress` returns `Address | AddressError`; `isAddressError` narrows.
2. `AddressError = { kind: 'error', code, segment, message, removed? }` with codes `ADDRESS_MALFORMED`, `MODEL_CITED_BY_PATH`, `NN_DOCUMENT_CITED_BY_HEADING`. Removed forms (`[[Title :: Name]]`, bare `Title :: Name`, `[[Name]]`) are `ADDRESS_MALFORMED` with `removed` set to `title-qualified reference` or `wikilink reference`, and the message names the removed shape and the grammar to use. No new code name was introduced (the S7c gate greps for the retired qualified-reference identifiers, so none appears in the module).
3. Path-class classification without the filesystem: the part before the first `@` ends in `.md`, `.csv` or `.json`. A `.md` is a model if `roleOf` says `knowledge` (`MODEL_CITED_BY_PATH`), a changeset if its stem ends `_changes` (`NN_DOCUMENT_CITED_BY_HEADING`); anything else (sidecars, plain markdown, `sources/` paths, entrypoint, spec, catalogs, procedures, CSV, JSON) is `source`. A bare `sources/x.pdf` falls to the model grammar and is `ADDRESS_MALFORMED` (the `.` is not a slug character). `sources` is NOT reserved as a model-id head (only `specs`, per A-6).
4. `specs` reserved: `specs/<family>@...` is a blueprint address; a bare `specs` is `ADDRESS_MALFORMED`. The model-index `RESERVED_MODEL_ID` error is S2b.3.
5. Segment grammar: head `[A-Za-z0-9]+([-_][A-Za-z0-9]+)*`; later segments and element, matrix, row and column slugs `[a-z0-9]+(-[a-z0-9]+)*`; field and concept names accept Unicode letters and digits (`-` and `_` joins; concept names also allow a space). The design ABNF leaves `field` and `Name` undefined; these follow `normalizeName` and existing concept names. A matrix unit allows no sub-unit (the legacy `parseUnitAddress` tolerated them).
6. `formatAddress` validates every segment against the same patterns and throws `TypeError` on one the parser would reject, so a writer cannot persist a non-parseable value.

### Deviations from tasks.md
1. Added `core/address/grammar.ts` (not listed): S1a.6 requires one pattern source shared by parse and format; putting the patterns in `index.ts` would create a runtime import cycle (index re-exports parse and format).
2. S1a.5: the test asserts the module sources import no node built-in (design: keep the module free of `fs` and `path`) instead of checking an export from `browser.ts`; exporting from `browser.ts` is S1b.7.
3. nn-mcp `dist/server.js` (needed by the Docs-Derived Facts Drift Guard): the documented `tsup --config tsup.dist.config.ts` resolves `@cognnitive/nn-core` through the junction to the PRIMARY checkout's `dist/`, which is stale (missing `splitEvidence`, `isChangesetPath`, `canonicalUnitModelId`), so it fails here. Workaround without touching the primary: built nn-core in the worktree (`tsc`; `dist/` is git-ignored), then ran tsup with a throwaway config (deleted, not committed) that aliases `@cognnitive/nn-core` to the worktree `nn-core/dist/index.js`. Environmental; for verify: the primary nn-core `dist/` needs a rebuild.

### Line counts (hand-authored, `git diff --stat ds/s0..HEAD` before this docs commit)
- Production: `address/format.ts` 64, `grammar.ts` 24, `index.ts` 45, `parse.ts` 174 = 307.
- Tests: `address/parse.test.ts` 206, `address/format.test.ts` 112, `browser-safe.test.ts` +23 = 341.
- Total 648 insertions, 0 deletions, no generated files. The forecast was ~350, so this slice exceeds the 400-line budget (the forecast undercounted the parser's removed-form, classification and per-segment diagnostics). `size:exception` applies (admitted by the maintainer for a slice with no declared fallback split). The module is one cohesive inert unit.

### Gate (S1a verification)
- `vitest run tests/address tests/browser-safe.test.ts`: 3 files, 103 passed.
- `vitest run` full nn-core: 206 files, 2218 tests passed (after building nn-core `dist/`; `tests/node-esm-smoke.test.ts` needs it and was the only failure before, environmental).
- `node ../../../node_modules/typescript/bin/tsc --noEmit` (nn-core): exit 0. nn-mcp not touched.
- `node scripts/verify.js --fast`: all deterministic pre-checks passed (204 steps) once nn-mcp `dist/server.js` was built as described.

### For the verify phase
- Confirm the `size:exception` call on PR 2 (648 lines against a ~350 forecast).
- `parseAddress` returns `source` for any `.md|.csv|.json` value that is not a model or changeset document, including sidecars; S1b delegates real source parsing to the existing `sourceRef` branch.
- The parser accepts concept names containing a space; S1b should confirm canonical `concept:` addresses stay slug-like (`unitAddress.section` slugifies the concept, the address module does not).

## S1b - Wire the grammar into citations, targets and resolved targets (PR 3, branch `ds/s1b`, targets `ds/s1a`)

Status: S1b done (S1b.1 to S1b.10; PR 3 is opened by the orchestrator). `size:exception` applies (741 hand-authored changed lines against a ~380 forecast; the slice has no declared fallback split).

### Claim check (before editing)
- `sourceRef.ts` `resolveUnitPath` resolved any `_NN.md` by `roleOf` (kind `model` for knowledge) and any extensionless `[A-Za-z0-9_-]` stem as a model; hierarchical ids were not resolvable.
- `parseTargetAddress` (nn-mcp `change-args.ts`) never throws and is also called on `produce_artifact` path targets and on legacy display-name targets (matrix names with spaces). The tasks.md line numbers (`parseCitation` 114, `resolveUnitPath` 444, `canonicalUnitModelId` 15) were correct.
- `unit-address.ts` builders only trimmed; `parseUnitAddress` already split hierarchical ids.

### Tasks and TDD evidence
- S1b.1 RED: new `describe` blocks in `src/sourceRef.spec.ts` (hierarchical id, field/body, cell/concept/matrix, raw-file citations, mixed `sources::` list, model path and changeset heading failures, `resolveUnitPathResult`, retired prefixes). Command (cwd `iNNfo/packages/nn-core`): `node ../../../node_modules/vitest/vitest.mjs run src/sourceRef.spec.ts`: 42 tests, 14 failed (missing exports and old behavior: `kNNowledge/...` still resolved, hierarchical ids returned null).
- S1b.2 GREEN: same command, 42 passed. `parseModelUnitRef` maps `parseAddress` onto the existing `SourceRef` unit kinds; `parseCitationResult` and `resolveUnitPathResult` carry the reason; the `MODEL_ID` regex is deleted. The full nn-core run then showed 18 legacy assertions pinned to the removed forms; they were updated, not weakened: `parseCitation.test.ts`, `sourceRef.unit.spec.ts` (fixtures moved to `sources/import/ghostbusters.md`), `validateCitations.test.ts`, `workspaceSources.test.ts` (plus new `KU_MALFORMED` cases), `use-cases-workspaces.test.ts` (resolver maps a model id to `kNNowledge/<id>_NN.md`). Re-run after resume: full nn-core 206 files, 2236 passed.
- S1b.3 RED: `tests/changeset/facts.test.ts` (+57 lines): 4 failed of 15 (builders did not reject a file path, a backslash or a non-canonical slug; `unitAddress` accepted `a b`; `concept:vision--mission` did not parse). Also RED in `tests/address/parse.test.ts`: 2 failed (`--` slug, non-Latin slug).
- S1b.4 GREEN: `resolved-target.ts` delegates to `formatAddress`; `unit-address.ts` validates each model-id segment with `^[A-Za-z0-9][A-Za-z0-9_-]*$` (one shared constant); `address/grammar.ts` widened. Full nn-core: 206 files, 2246 passed. Mirrors regenerated: `node scripts/export-address-module.mjs`, `node scripts/build-console-bundle.mjs`, `node scripts/build-console-payload.mjs`.
- S1b.5 RED: `nn-mcp/src/tools/change-args.spec.ts` (NEW, 5 tests): 3 failed (no `error` field). Command (cwd `iNNfo/packages/nn-mcp`): `node ../../../node_modules/vitest/vitest.mjs run src/tools/change-args.spec.ts`.
- S1b.6 GREEN: 5 passed; full nn-mcp 60 files, 653 passed.
- S1b.7 RED then GREEN: `tests/browser-safe.test.ts` +3 tests (3 failed, then 12 passed). Exports: `parseAddress`, `formatAddress`, `isAddressError`, the address types, `parseCitationResult` and `resolveUnitPathResult` from `index.ts` and `browser.ts`; the address functions and `parseCitationResult` from `trannsformPrimitives.ts`. Ran `node scripts/build-core-mirrors.mjs` and `node --test scripts/build-core-mirrors.test.mjs` (1 pass, 0 fail), and `node scripts/build-preflight-primitives.mjs` (found by `verify --fast`; regenerated the `nn-upgrade` mirror).
- S1b.8 REFACTOR: `MODEL_ID` (sourceRef) deleted and the matrix/concept/element model branch of `parseKnowledgeUnitRef` (about 70 lines) removed; `unit-address.ts` `MODEL_SEGMENT_RE` is now the single copy used by the builders and `isValidModelPath`.
- S1b.9: `node test/run.js` in `skills/nn-sources`: 564 passed, 0 failed; no edits to `src-lib/{impact-checker,gc,duplicate-guards}.js` were needed.
- S1b.10: gate below.

### Decisions
1. Concept addresses (carried over from S1a). The living `knowledge-unit-address` spec makes the canonical `concept:` segment a slug (`unitAddress.section` is `slugifyHeading`), while `resolvedTarget.concept` has always stored the concept name as the change carried it (`m@concept:Goal`, pinned by `resolved-target.test.ts` and frozen in recorded history, where equality is by exact string). Decision: the `unitAddress` builders stay slugged; `resolvedTarget.concept` keeps the name as given but now goes through `formatAddress` (an invalid name throws); the parser keeps accepting a space and now also `--` runs (`vision--mission` is what `unitAddress.section('strategy','Vision--Mission')` emits, and it did not parse). Normalizing recorded concept targets to slugs would rewrite history keys, so it belongs with the identity-chain work (S6c). Flagged for verify.
2. Slug grammar widened (S1a module): `SLUG` is now lowercase letters of any script plus digits with hyphen runs, with the unicode flag. Reason: frozen slugs come from `slugifyHeading`, which emits `--` (the Concept/Element boundary) and non-Latin letters; a strict ASCII slug would make `resolvedTarget.*` throw on legitimate frozen slugs. Uppercase and leading or trailing hyphens are still rejected.
3. Failure channel: `parseCitation` and `resolveUnitPath` keep their `| null` signatures (callers and the CJS mirrors depend on them); the reason comes from the new `parseCitationResult` and `resolveUnitPathResult`. The spec wording "resolveUnitPath returns a diagnostic" is met by the sibling function.
4. `resolveUnitPath` now ignores a trailing `@<unit>` (it classifies the path part), so the spec scenarios that pass a full citation work.
5. `parseTargetAddress` keeps the lenient split and adds `error?: AddressError`. It cannot throw: it is called on `produce_artifact` path targets and on display-name targets the apply engine still resolves by name until the index-backed resolution (S3a). The engine rejecting on `error` is S3a.
6. `canonicalUnitModelId` stays lenient (strips the version token only): `provenance-strict.ts` passes a whole target to it. The rejection of `.md` paths and backslashes lives in the `resolvedTarget.*` builders (through `formatAddress`) and the unit-address builders.
7. Retired prefixes (`sources/nn|original|export/`, `export/`, `models/`): the living spec says they dangle with no special message, and also that a kNNowledge `_NN.md` path is rejected. Both are honored: a model-looking path under a retired prefix still resolves as a plain path (the `validateCitations` test is unchanged); any other `_NN.md` knowledge or changeset path is rejected. One small `RETIRED_PREFIX_RE` constant in `sourceRef.ts`.
8. An extensionless path under `sources/` is never a model id (`RAW_AREA_RE`), preserving the old `parseCitation('sources/import/notes') === null` behavior; `address/` still does not reserve `sources` (S1a decision).
9. A prefixed matrix cell (`m@matrix:x&r&c`) is no longer accepted (the grammar allows `matrix:` alone; cells are `m@x&r&c`). No emitter existed in the repo.

### Deviations from tasks.md
1. Fixture migration outside the listed files: `docs/cognitive_nn/use-cases/{consulting-sales,freelance-designer,startup-founder,youtube-creator}/artifacts_NN.md` (7 `sources::` lines `kNNowledge/X_NN.md` rewritten to the id `X`) and the resolver in `tests/use-cases-workspaces.test.ts`. Reason: those workspaces are validated by a nn-core test and cited models by path, a removed form. Accepted by the coordinator. Bulk docs and corpus remain S7b and S7c.
2. Extra grammar change in `address/grammar.ts` (decision 2) with extra tests in `tests/address/parse.test.ts`.
3. `parseCitationResult`, `resolveUnitPathResult` and the `CitationResult` and `UnitPathResult` types are not named in tasks.md.
4. The `preflight-primitives` and `nn-upgrade` mirrors, `console-payload.generated.cjs` and `nn-console.bundle.js` were also regenerated.
5. nn-mcp typecheck: `tsc --noEmit -p tsconfig.json` resolves `@cognnitive/nn-core` types through the junction to the primary's stale `dist`; it was run with a throwaway `tsconfig.tmp.json` (a `paths` entry to this worktree's `nn-core/dist/index.d.ts`), deleted afterwards. The nn-mcp `dist/server.js` was built with a throwaway tsup config that aliases nn-core to the worktree dist (deleted). Environmental.

### Line counts (`git diff --numstat ds/s1a..HEAD` before this tracking commit)
- Hand-authored: 549 insertions and 192 deletions = 741 changed lines. Production src 348+/133-; nn-core tests 128+/48-; `change-args.spec.ts` 42+; `change-args.ts` 24+/4-; fixtures 7+/7-.
- Generated, excluded from the budget: `console-payload.generated.cjs` 253+/91-, `nn-address.generated.js` 258+/91-, nn-sources core mirror 298+/87-, nn-upgrade core mirror 10+, `nn-console.bundle.js` (regenerated).
- Over the 400-line budget (forecast ~380): the rewrite of legacy assertions and the new tests are most of it. `size:exception`.

### Gate (S1b verification)
- nn-core `vitest run` full: 206 files, 2246 tests passed. nn-core `tsc --noEmit`: exit 0; `tsc` build: exit 0.
- nn-mcp `vitest run` full: 60 files, 653 passed. nn-mcp typecheck (throwaway paths config): exit 0.
- `node --test scripts/build-core-mirrors.test.mjs`: 1 pass. nn-sources suite (`node test/run.js`): 564 passed, 0 failed.
- `node scripts/verify.js --fast`: all deterministic pre-checks passed (204 steps) with nn-mcp `dist/server.js` built as above.

### For the verify phase
- Confirm decision 1 (recorded concept targets stay name-as-carried) and decision 2 (slug grammar widening).
- `parseTargetAddress` reports but does not reject; the engine consumes `error` in S3a.
- `KU_MALFORMED` now covers a model file path in the validator with the generic message; the specific removed-form message is available through `parseCitationResult` but not yet surfaced by `workspaceSources.ts`.
- `canonicalUnitModelId` accepts any string (by design, decision 6).

## S2a - Storage declaration schema and L1 `iNNfo_V_0-7-0` (PR 4, branch `ds/s2a`, targets `ds/s1b`)

Status: S2a done (S2a.1 to S2a.6; PR 4 is opened by the orchestrator). `size:exception` applies (756 hand-authored lines against a ~350 forecast; no declared fallback split).

### Claim check (before editing)
- The three-property Concept Definition surface did not exist: `Concept` (in `types/parser.ts`, re-exported by `types/index.ts`) had no `storage`; `extract.ts` ignored the three properties; L1 `V_0-6-0` declares only `slug`, `type`, `icon`, `color`, `weight` for a Concept Definition, so a `storage::` line produced `Property "storage" is not declared on Concept Definition` warnings.
- `scripts/sync-versions.mjs` does NOT regenerate `canonical-registry.ts` (it only syncs the MCP/core package versions and blueprint versions). The generator is `scripts/generate-canonical-registry.mjs`. The registry bundles `iNNfo` only at `V_0-5-0` (V_0-6-0 was published in `c8b81392` without being bundled), so the registry mirrors are byte-identical after this slice.
- `manifest/source.yaml` registers only L2 blueprints (and `version:` on `changes` and `procedures`), no L1 entry: no edit needed. `npm run check:versions` equivalent (`node scripts/sync-versions.mjs --check`) is green.

### Tasks and TDD evidence
Commands run from `iNNfo/packages/nn-core`: `node ../../../node_modules/vitest/vitest.mjs run <file>`.
- S2a.1 RED: `tests/schema/storage.test.ts` (placement table: 3 valid, 21 invalid rows): suite failed to load, `Cannot find module '../../src/schema/storage.js'` (right reason). S2a.2 GREEN: `parsePlacement`, `STORAGE_MODES`, types in `src/schema/storage.ts`; `Concept.storage` added to `src/types/parser.ts`: 25 passed. Commit `ecc4ab54`.
- S2a.3 RED: the declaration-code, extraction and composition tests were added to the same file (42 tests): 15 failed (`storageOf` and `validateStorage` missing, `Concept.storage` never read, composed schema had no storage errors), the right reasons. S2a.4 GREEN: `readStorage` and `validateStorage` in `storage.ts`, `extract.ts` reads the properties, `compose.ts` validates the composed schema and renames the container through `applyAliasToSchema`, `schema/index.ts` exports: 42 passed after one test correction (my first overlap case used templates of different depth, which cannot overlap; fixed the test, not the code). Alias test RED proven by mutation: reverting the container rename in `compose.ts` failed `a concept alias renames the container reference with the concept` (1 failed, 42 passed), restored, 43 passed. Browser-safe: `tests/browser-safe.test.ts` +8 lines (storage.ts has no imports at all). Commit `ec43bac3`.
- S2a.4 (canonical-registry test) RED: six new tests in `tests/canonical-registry.test.ts` (describe "iNNfo V_0-7-0 (distributed storage)"): 6 failed, `ENOENT iNNfo_V_0-7-0_NN.md` (right reason). S2a.5 GREEN: the L1 file created: 23 passed. The same tests prove F18 without a code change in `metaschema.ts` (see deviations): against `V_0-6-0`, a `storage::`/`placement::` L2 still warns; against `V_0-7-0` it does not. Commit `99c8e17b`.
- Generated mirror: `console-payload.generated.cjs` (bundles the schema code) drifted, found by `verify --fast` ("Check Console Payload Mirror Fresh"); regenerated with `node scripts/build-console-payload.mjs`. Commit `chore(console): regenerate the console payload mirror`.
- REFACTOR: none needed beyond keeping `storage.ts` import-free.

### Design decisions inside S2a (beyond design A1, A2)
1. `ConceptStorage = { mode, container?, placement?, unknownMode? }`. An unrecognised `storage::` value reads as `compact` with the raw text kept in `unknownMode`, so `validateStorage` can report `STORAGE_UNKNOWN_MODE` without the reader throwing. A concept with none of the three properties has `storage === undefined` (and `storageOf` returns `{ mode: 'compact' }`).
2. A concept with only `placement::` or `container::` and no `storage::` reads as compact and gets `PLACEMENT_FORBIDDEN` (the declaration is never inferred).
3. `container::` declared but the placement never names `{container}` is `PLACEMENT_INVALID` (spec: "a rule that cannot name a container"; design A2 says `{container}` forces physical nesting).
4. `kNNowledge` is rejected case-folded (`knowledge/{slug}/` too), since the Windows file system does not tell them apart. `sources` is rejected only as the first segment (`{container}/sources/{slug}/` is legal); `archive`, `staging`, `specs`, `backups` are rejected at any position.
5. `CONTAINER_NOT_DISTRIBUTED` also covers a container name that is not a concept of the schema (both names appear in the message). One `CONTAINER_CYCLE` per cycle, naming its members.
6. `PLACEMENT_OVERLAP`: each placement is expanded (the container's instance root folder replaces `{container}`); two expansions of equal length overlap when every position is equal literals or at least one side is `{slug}`. The real `video-script` shape (`series/{slug}/`, `series/{slug}/assets/{slug}/`) does not overlap.
7. Composition: `validateStorage` runs on the composed schema at depth 0 only, and is skipped when an include was declared but not resolved (no resolver, or "could not be resolved"), because the container may live in the missing include (no false positive on an incomplete schema). `applyAliasToSchema` also renames `container` with its concept.
8. Diagnostic message shape follows design A12: `<CODE>: concept "<Name>" - <what is wrong>; <fix>`, plus the `code` field and `Concept Definition.<Name>.<property>` path.
9. The L1 `V_0-7-0`: `V_0-6-0` verbatim except (a) frontmatter version and URL, and the description line, (b) the two stale example URLs and the self-description file name pointed to `V_0-7-0` (the `V_0-6-0` publish did the same for the URLs), (c) three rows, a "Storage Declaration" sub-section and an example under Concept Definition, (d) the three Field Definitions in the metaschema block (`storage` as `select [compact, distributed]`, `container` and `placement` as `string`), (e) the "Universal Addressing Grammar" section replaced by "Unified Address Grammar" (see deviations).

### Deviations from tasks.md and the orchestrator brief
1. Generator: tasks.md and the brief name the `sync-versions` generator for `canonical-registry.ts`; the real one is `scripts/generate-canonical-registry.mjs`, and `--check` reports no drift. `canonical-registry.ts` is NOT modified: the registry bundles no L1 later than `V_0-5-0` (precedent: `V_0-6-0` was not bundled either). If the verify phase wants `V_0-7-0` bundled (offline fallback for a pin), that is a registry entry plus a `MAP` line and belongs with the repin in S7a.
2. `metaschema.ts` is not modified. The "stops warning when the pinned L1 is V_0-7-0 or later" behavior is data-driven: `validateBlueprintAgainstMetaschema` checks against the resolved L1 content, and the V_0-7-0 metaschema block declares the three properties. A code gate on the version would duplicate the L1 and contradict the spec-as-data design. The canonical-registry tests prove both sides (V_0-6-0 warns, V_0-7-0 does not).
3. `Concept.storage` lives in `core/types/parser.ts` (the `Concept` interface), not `types/index.ts` (a barrel).
4. `validateStorage` was written in S2a.4's GREEN (after its S2a.3 RED), not S2a.2, to keep strict TDD (a test existed before the code; S2a.2 only needed `parsePlacement` and the types).
5. "Universal Addressing Grammar" is replaced, not kept beside the new section: the old section's table (legacy heading and `doc.md#heading` rows) and its 3-tier `[[target]]` precedence for typed references contradict decisions 5 and 6. Prose wikilink behavior (slug first, then name, `AMBIGUOUS_ELEMENT_NAME`) is restated in the new section (A-13). V_0-6-0 and earlier keep the old text.
6. Exports: `schema/index.ts` exports the new API; `core/index.ts` and `core/browser.ts` (named export lists) are not touched; S2b imports the module directly or adds the names when it needs them.
7. Fixtures: two files under `tests/fixtures/distributed-storage/` (`video-like_spec_NN.md`, `local-includer_spec_NN.md`); invalid declarations are built inline in the test with a small helper.

### Line counts (`git diff --numstat ds/s1b..HEAD`)
- Hand-authored production: `storage.ts` 332, `index.ts` 17, `compose.ts` 16, `extract.ts` 3, `types/parser.ts` 4 = 372.
- Hand-authored tests and fixtures: `storage.test.ts` 256, `canonical-registry.test.ts` 69, `browser-safe.test.ts` 8, two fixtures 51 = 384. Total 756, 0 deletions in these files. Forecast ~350: `size:exception`. The overrun is the validation (cycle, overlap, container checks) and the 21-row grammar table; the module is one cohesive unit with no fallback split declared.
- Generated or published, excluded: `iNNfo/specs/iNNfo_V_0-7-0_NN.md` 645 lines (585 are `V_0-6-0` verbatim, about 60 new), `console-payload.generated.cjs` 233+/1-.

### Gate (S2a verification)
- `node ../../../node_modules/typescript/bin/tsc --noEmit` (nn-core): exit 0.
- nn-core `vitest run` full: 207 files, 2299 tests passed.
- `node scripts/generate-canonical-registry.mjs --check`: exit 0; `node scripts/sync-versions.mjs --check`: exit 0.
- `node --test scripts/guard-template-immutability.test.js`: exit 0 (V_0-6-0 untouched). `node --test scripts/spec-integrity.test.mjs`: 9 pass.
- `node scripts/verify.js --fast`: exit 0 (after regenerating the console payload mirror). Full `node scripts/verify.js`: exit 0 ("All deterministic pre-checks passed").
- nn-mcp not touched; its `dist/server.js` from S1b was reused for the drift guard.

### For the verify phase
- Confirm deviation 1 (L1 not bundled in the registry) and deviation 2 (no `metaschema.ts` code change).
- Confirm decision 3 (`container::` requires `{container}` in the placement) and decision 4 (case-folded `kNNowledge`).
- `validateStorage` is not yet wired into `validate_knowledge`/`check_domain` output beyond `resolveBlueprintSchema().errors`; consumers (S2b, S4a) pick it up.
- The `video-script` and `changes` bluepriNNts still pin `V_0-6-0` and declare no storage: repin is S7a.
