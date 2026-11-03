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
| S2b | 508 | `ds/s2b` | `ds/s2a` | open, applied (about 1,636 hand-authored lines, `size:exception`; the S2b-i/S2b-ii split was not shipped, see the S2b section) |
| S3a | 509 | `ds/s3a` | `ds/s2b` | open, applied (`size:exception`) |
| S3b | 510 | `ds/s3b` | `ds/s3a` | open, applied (`size:exception`) |
| S3c | 512 | `ds/s3c` | `ds/s3b` | open, applied (resumed from an interrupted apply; one deviation in S3c.3) |
| S4a | 514 | `ds/s4a` | `ds/s3c` | open, applied |
| S4b | 516 | `ds/s4b` | `ds/s4a` | open, partial (S4b.2 apply pending a decision) |
| S5a | 519 | `ds/s5a` | `ds/s4b` | open, applied |
| S5b | 522 | `ds/s5b` | `ds/s5a` | open, applied (866 hand-authored changed lines, `size:exception`) |
| S6a | 523 | `ds/s6a` | `ds/s5b` | open, applied (1,397 hand-authored changed lines, `size:exception`) |
| S6b | 527 | `ds/s6b` | `ds/s6a` | open, applied (1284 hand-authored changed lines, `size:exception`) |
| S6c | 530 | `ds/s6c` | `ds/s6b` | open, applied (724 hand-authored changed lines, `size:exception`) |
| S6d | 534 | `ds/s6d` | `ds/s6c` | open, applied (~1,574 hand-authored changed lines, `size:exception`) |
| S7a | — | `ds/s7a` | `ds/s6d` | open, applied (~576 hand-authored changed lines, `size:exception`) |
| S7b to S7d | n/a | n/a | n/a | not started |

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

## S2b - Domain index: ids, classification, placement, collections, diagnostics, skew (PR 5, branch `ds/s2b`, targets `ds/s2a`)

Status: S2b done (S2b.1 to S2b.11; PR 5 is opened by the orchestrator). `size:exception` applies: about 1,636 hand-authored lines against a ~400 forecast. The pre-declared split (S2b-i: S2b.1-S2b.4, S2b-ii: S2b.5-S2b.11) was NOT shipped as two PRs: the work is one cohesive module, so all of it is on `ds/s2b`. The commits are already in split order: S2b-i ends at `feat(domain): index models by hierarchical id and resolve addresses`, so the orchestrator can cut the branch there if two PRs are preferred.

### Claim check (before editing)
- `core/domain/` did not exist; `core/naming/contract.ts` had `formatNNName`, `blueprintNameOf`, `displayStem`, `roleOf` and no instance-name derivation; `workspace/integrity/versionStatus.ts` already had `parsePinnedUrl` and `parseUnversionedBlueprintName` (reused for the skew url rule).
- The S2a `ConceptStorage` keeps `placement` as the raw template string (design section 8 shows pre-parsed segments); `parsePlacement` is reused to expand it.

### Tasks and TDD evidence
Commands run from `iNNfo/packages/nn-core`: `node ../../../node_modules/vitest/vitest.mjs run <file>`.
- S2b.1 RED: `tests/domain/naming.test.ts` and `placement.test.ts`: 5 failed in naming (`checkInstanceName is not a function`), the placement suite failed to load (module missing); 1 passed (the `roleOf` characterization: it asserts role does not read the folder, which `roleOf` already guarantees). S2b.2 GREEN: `instanceFileName` and `checkInstanceName` in `naming/contract.ts` (the derivation lives only there), `domain/placement.ts` (`buildRules`, `placementFor`, `expectedFolder`), `domain/types.ts`: 13 passed. Commit `feat(domain): derive instance file names and placements from declared rules`.
- S2b.3 RED: `tests/domain/index.test.ts` (21 tests: A5 worked table, discovery-order shuffles, same-stem addition, bare stem and slug, duplicate, reserved head, unaddressable, changeset, plus the `resolve` cases because S2b.4 builds `resolve`): suite failed to load (`../../src/domain/index` missing). S2b.4 GREEN: `domain/classify.ts` and `domain/index.ts` (`buildDomainIndex`, `byId`, `byPath`, `resolve`, `placementFor`): 34 passed. Mutation check: making `byId` return a duplicated id failed 3 tests (restored). Commit `feat(domain): index models by hierarchical id and resolve addresses`.
- S2b.5 RED: `tests/domain/layout.test.ts` (15 tests): 13 failed (`[]` instead of the diagnostic, `fileLocalDiagnostics is not a function`); the two negative cases (no storage declared, non-declaring bluepriNNt) pass trivially at RED and guard the later code. S2b.6 GREEN: `localDiagnostics`, `registryDiagnostic`, `fileLocalDiagnostics` in `placement.ts`; CONTAINER_MISSING, INSTANCE_SHADOWS_ELEMENT_ASSETS and the double-storage extension in `index.ts`. One real bug found by the tests and fixed in the code: `expectedFolder` filled container slots from the front, so a misplaced instance with no derivable container showed `series/pepper-mapache/assets/{slug}/`; it now aligns known slugs to the end. 49 passed. Commit `feat(domain): report layout diagnostics for placement, naming and double storage`.
- S2b.7 RED: `tests/domain/collection.test.ts` (6 tests): 6 failed (`collection is not a function`). S2b.8 GREEN: `collection()` and `CollectionMember`: 55 passed. Commit `feat(domain): resolve one collection per concept across storage forms`.
- S2b.9 RED: `tests/domain/skew.test.ts` (13 tests): suite failed to load (`../../src/domain/skew` missing). S2b.10 GREEN: `domain/skew.ts`: the 11 pure tests passed at once, the 2 `buildDomainIndex` tests stayed red until the index called `versionSkew`: 68 passed. Commit `feat(domain): report one blueprint version skew finding per bluepriNNt`.
- S2b.11 REFACTOR and exports: RED first in `tests/browser-safe.test.ts` (3 export tests failed: `buildDomainIndex`, `versionSkew`, `fileLocalDiagnostics` missing from the browser, node and trannsform entries); GREEN: exports in `browser.ts`, `index.ts`, `trannsformPrimitives.ts` (`versionSkew` only); shared `byText` and `versionTokenOf` (one definition each): 90 passed across browser-safe and domain. Mirrors regenerated: `node scripts/build-core-mirrors.mjs` (nn-sources mirror changed, scope mirror byte-identical) and, found by `verify --fast`, `node scripts/build-preflight-primitives.mjs` (the nn-preflight `naming-contract.generated.cjs` bundles `naming/contract.ts`). `verify --fast` also caught the retired token `target-template` in a doc comment (Legacy Write Guard); fixed to `target_blueprint`.

### Design decisions inside S2b (beyond design A5, A8, A12, A14)
1. Classification by content (A8), made precise: a model is an instance model of C when it holds exactly one element of one distributed concept C AND either its folder matches C's expanded placement exactly, or its file name is the derived instance name for that slug (`<slug>_<bp>_NN.md`). Otherwise (two or more C elements, or one C element in a registry-named file at a non-matching path) it is a compact model with `DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL`. This resolves the overlap in A8 between "a single C element at a mismatching path is PLACEMENT_MISMATCH" and "C elements inside a model whose path matches no placement are DISTRIBUTED_CONCEPT_IN_COMPACT_MODEL". Two distributed concepts in one model is `MIXED_INSTANCE_MODEL`, and the model is compact for id purposes.
2. Ids are path-derived: an exactly matching folder gives the id from the `{slug}` captures (folder slug, not root slug); a misplaced instance takes the container slugs from the longest matching prefix of the container's expanded folder plus its root slug (so `series/x/videos/intro/...` is `x/intro`), or just the root slug when no container can be read from the path. Misplaced models stay listed and flagged (placement-validation: Discovery stays path-agnostic).
3. The expected folder of a misplaced instance with an unknown container keeps the container's slot as `{slug}` (`series/{slug}/assets/pepper-mapache/`).
4. `placementFor(concept, id, blueprint)` returns a diagnostic, never throws. New code `MODEL_ID_INVALID` (not in the A12 table) covers an id with `/` for a compact concept, a wrong segment count for a distributed one, and a non-slug segment. A pure `placementFor(declarations, ...)` is exported from `domain/placement.ts`; the index method resolves the declarations through the resolver port.
5. `resolve(address, from?, expect?)` gained an optional third argument (`{concepts?, blueprint?}`) so the existing membership checks 3 and 4 (`REF_CONCEPT_MISMATCH`, `REF_BLUEPRINT_MISMATCH`) come back as warnings on an otherwise successful resolution. The result type is `AddressResolution` (not `Resolution`, which `scope/` already exports). An instance model id alone resolves to its instance root; a duplicated id is `REF_MODEL_NOT_FOUND` with a note; an absolute self-reference (a `unit` address whose model equals `from`) is `ADDRESS_NOT_CANONICAL`.
6. Models the index ignores: any non-`knowledge` role (changesets, catalogs, procedures, specs), with no finding. A model with no `parent_spec.name` or an unresolvable bluepriNNt is `MODEL_UNADDRESSABLE` and gets no id; `index.models` holds only addressable models.
7. `versionSkew` input is `{path, frontmatter, concepts?}` (not `IndexedModel`, which lacks the url). Pin value per model: the `_V_x-y-z` token; a bare name is `unpinned`; a token plus a present `parent_spec.url` that neither `parsePinnedUrl` nor `parseUnversionedBlueprintName` can classify is `unclassifiable-url`. Both are listed in `meta.incomparable` as `{path, reason}` and count as distinct values, so they trigger a finding next to any other pin. Versions are ordered by count then label; `meta.versions[].paths` is capped at 10, the message shows 3 per version. The index passes the instance root concept as `concepts` (compact models pass none), so `meta.concepts` names the distributed concepts of the skewed models.
8. `CollectionMember = {concept, address, slug, modelId, path, storage, flags?}`: `storage` is `distributed` only for an instance root; every other element (a Scene in an instance model, a Video inside a registry) is `compact`. `flags` are the layout codes whose `paths` include the member's model (skew included). Order: model id, slug, path.
9. The domain index is NOT wired to any consumer (S3a does that), so no behavior outside `core/domain` changes.

### Deviations from tasks.md
1. Extra files: `domain/types.ts` (shared types; avoids an import cycle), `tests/domain/fixtures.ts` (shared helpers), and `tests/domain/layout.test.ts` and `collection.test.ts` (tasks name only `index`, `placement`, `skew`, `naming` test files; the layout and collection tests got their own files for size).
2. The `size:exception` and the unshipped split: see Status. 1,636 hand-authored lines is about four times the forecast; the forecast assumed the diagnostics would be small.
3. `parsePlacement` is reused as is; the private expansion inside `validateStorage` (`schema/storage.ts`) is not refactored to share `buildRules` (two small expansions of the same rule; sharing would edit S2a code). Candidate follow-up for the verify phase.
4. The `BLUEPRINT_VERSION_SKEW` message uses `-` and `;` per the A12 shape (`<CODE>: <subject> - <what is wrong>; <fix>`), not the em dash of the A14 sample.
5. `build-preflight-primitives.mjs` also bundles `naming/contract.ts` and had to be regenerated (not in the task text). `versionSkew` is exported through the trannsform entry (nn-sources mirror), which is the CJS mirror the task names; nn-preflight consuming it is S4b.

### Line counts (`git diff --numstat ds/s2a..HEAD`, before this tracking commit)
- Hand-authored production: `domain/{index 292, placement 213, types 104, classify 103, skew 93}` = 805, plus `naming/contract.ts` 19, `browser.ts` 11, `index.ts` 11, `trannsformPrimitives.ts` 1 = 847.
- Hand-authored tests: `index.test 220, layout.test 173, skew.test 132, collection.test 86, placement.test 67, naming.test 43, fixtures 37, browser-safe.test 31` = 789.
- Total hand-authored 1,636. Generated, excluded: `skills/nn-sources/scripts/lib/nn-core.generated.cjs` 102+/2-, `skills/nn-preflight/scripts/lib/naming-contract.generated.cjs` 9+.

### Gate (S2b verification)
- `node ../../../node_modules/typescript/bin/tsc --noEmit` (nn-core): exit 0.
- nn-core `vitest run` full: 213 files, 2376 tests passed (S2a baseline: 207 files, 2299 tests).
- `node scripts/build-core-mirrors.mjs --check`: exit 0; `node --test scripts/build-core-mirrors.test.mjs`: pass. `node scripts/build-preflight-primitives.mjs --check`: exit 0; its test passes. `node skills/nn-sources/test/run.js`: 564 passed, 0 failed.
- `node scripts/verify.js --fast`: first run exit 1 (3 steps: Preflight Primitives Bundle Fresh and its test, Legacy Write Guard), fixed as described above; second run exit 0 ("All deterministic pre-checks passed"). nn-mcp not touched; its `dist/server.js` from S1b was reused.

### For the verify phase
- Confirm decision 1 (instance vs registry classification when a single C element sits at a non-matching path) and decision 2 (best-effort id for a misplaced instance).
- Confirm the A-16 url rule (decision 7) does not raise false skew errors on the testlab fixtures; a model whose name pins a version but whose `parent_spec.url` is local is currently an incomparable pin and so triggers a finding.
- Compact ids are the file stem as is (design A5); a stem outside the address grammar (non-ASCII, spaces, dots) is indexed but cannot be parsed back by `parseAddress`. S3a and S4a must decide whether that is a layout error.
- `INSTANCE_SHADOWS_ELEMENT_ASSETS` compares slugs only (design A2); it does not check that the instance placement actually uses an `assets` literal.

## S3a - Node adapter; replace the four id producers (PR 6, branch `ds/s3a`, targets `ds/s2b`)

Status: S3a done (S3a.1 to S3a.7). `size:exception` applies (about 690 hand-authored changed lines outside pure deletions, plus 381 pure-deletion lines; forecast ~380).

### Claim check (before editing)
- Id producers found: core `listKnowledge` (collision flip to a path form), `scope/model-index.ts` (`buildModelIndex`/`resolveModelId`, package-stem alias, `AMBIGUOUS_MODEL_ID`), `scope/stem-collision.ts` + `mcp/tools/model-collisions.ts`, and `findKnowledgeFile` in `mcp/tools/spec.ts`. `core/workspace/discoverModels.ts` only holds `isReconcilableModel` (no element list): the discovery with `(concept, slug)` lives in `helpers.ts` instead (see deviations).
- Many existing tests pin models with a fake `https://example.com/...` blueprint URL, models without any `parent_spec`, and ids that keep `_NN`.

### Tasks and TDD evidence
- S3a.1 RED: `nn-mcp/src/tools/domain-index.spec.ts` (3 tests) failed to load (module missing). S3a.2 GREEN: `mcp/tools/domain-index.ts` (`buildNodeDomainIndex`: discovery, one warm-up per distinct `(name, url)`, a synchronous `StorageDeclarationsResolver`, `pathOf(id)`); 3 passed.
- S3a.3 RED/GREEN: `helpers.test.ts` +3 tests (id is not a path, equal stems keep their id and are never rewritten to a path, a misplaced file is listed, a changeset never is) and `domain-index.spec.ts` +1 (hierarchical-id-only resolution: a bare slug or stem does not resolve, a path throws `MODEL_ADDRESSED_BY_PATH`, an unresolved `intro` lists `innteresante/intro, villa/intro`). Legacy assertions that pinned the old ids (`_NN` kept, collision flipped to a path) were updated, not weakened (`helpers.test`, `discovery.test`, `list-read.spec`, `server.spec`, `sidecar-exclusion.spec`, `workspace-sync.spec`, `check-workspace.spec`, `submodel-discovery.test`, `spec.spec`).
- S3a.4 GREEN: core `listKnowledge` and `discoverDomainModels` use `buildDomainIndex`; `findKnowledgeFile` resolves through the index.
- S3a.5 GREEN: the consumers keep calling `findKnowledgeFile`/`listKnowledge`; `check_domain` and `sync_domain_manifest` project `DUPLICATE_MODEL_ID` into the temporary `collisions` field (`duplicateIdCollisions`).
- S3a.6: deleted `scope/{model-index,stem-collision}.ts` and their specs, `mcp/tools/model-collisions.ts` (381 pure-deletion lines); `scope/index.ts`, `purity.spec.ts`, the golden script (local stem helper) and the video-script scope mirror updated.

### Decisions
1. `AmbiguousModelIdError` is replaced by `ModelIdError` with `code` `MODEL_ADDRESSED_BY_PATH | DUPLICATE_MODEL_ID` (candidates are paths). No `AMBIGUOUS_MODEL_ID` remains.
2. Declared storage is read from LOCAL tiers only (a local `parent_spec.url`, the workspace/global package tiers); no network. By default an unresolvable bluepriNNt is read as declaring no storage (models stay compact and listed); `buildNodeDomainIndex(root, { strict: true })` gives `MODEL_UNADDRESSABLE` and no id (R3). Reason: the existing corpus pins fake URLs and a model must stay readable offline. Flag for verify: with the default, a distributed model whose bluepriNNt is not local gets a compact id.
3. `findKnowledgeFile` resolves non-model documents (entrypoint, plain documents, models without `parent_spec`, specs with `includeSpecs`) through a stem lookup restricted to files discovery does not list, so a bare stem of an indexed instance model never resolves. A trailing `_NN` on the id is tolerated; `.md` or `\` is `MODEL_ADDRESSED_BY_PATH` (except with `includeSpecs`, where specs are documents). With `includeSpecs` a `<folder>/spec_NN.md` package is still addressed by its folder (blueprint package, not a model).
4. Console payload still carries the path-derived id until S5b; `console-export-roundtrip.test.ts` addresses the engine with the index id (`strategy`) and keeps the payload assertion.

### Deviations
1. `discoverModels.ts` not modified; `discoverDomainModels` (helpers.ts) returns each model's `(concept, slug)` list.
2. Bumped `video-script` `blueprint_version` V_0-14-1 -> V_0-14-2 (spec, defaults parent pin, two assertions in `test/video-script-contract-additions.test.mjs`, catalog regenerated): the Template Immutability Guard requires a bump whenever an embedded skill mirror changes, and the scope mirror changed because `model-index`/`stem-collision` left `scope/index.ts`. S7a still moves it to V_0-15-0.
3. `scripts/build-core-mirrors.test.mjs` no longer expects `resolveModelId` in the scope mirror.
4. The mcp `listKnowledge` no longer rescans `kNNowledge/` as a second root (the first scan already recurses into it, and it would have produced ids relative to `kNNowledge/`).

### Gate (S3a verification)
- nn-core `tsc --noEmit`: exit 0. nn-mcp typecheck with a throwaway `tsconfig.tmp.json` (paths to the worktree nn-core `dist`; not committed): exit 0.
- nn-core `vitest run` full: 211 files, 2363 passed. nn-mcp `vitest run` full: 61 files, 657 passed.
- `node scripts/build-core-mirrors.mjs --check`, `node --test scripts/build-core-mirrors.test.mjs`, `node scripts/guard-template-immutability.js`, `sync-versions --check`, `blueprint-catalog --check`: exit 0.
- `node scripts/verify.js --fast`: exit 0.

### For the verify phase
- Confirm decision 2 (lenient default) and the perf cost: every `findKnowledgeFile` call builds one index (reads and parses every model of the domaiNN); a per-apply index is S6a.
- Confirm deviation 2 (video-script bump pulled forward).

## S3b - References: title resolution deleted; address-only typed fields (PR 7, branch `ds/s3b`, targets `ds/s3a`)

Status: S3b done (S3b.1 to S3b.12). `size:exception` applies (459 added and 1,128 deleted hand-authored lines; forecast ~400; no declared fallback split was used).

### Q1 and Q2 (S3b.1)
Recorded before any edit: Q1 (scope `parent` is an `@slug` address) and Q2 (typed `[[Name]]` is removed, corpus cost in S7b) were resolved by the maintainer on 2026-11-03 (see the decisions block of `tasks.md`).

### Claim check (before editing)
- `workspaceReferences.ts` carried `QUALIFIED_REF_RE`, the title and file-name ladders and `resolveTargetModel`; `workspaceIndex.ts` carried `titleToNodeIds`, `fileNameToNodeIds`, `nodeElementConcepts` and the duplicate-title issue; `content.ts` bypassed the qualified form in `conv-wikilinks`.
- The graph (`RecursiveParseResult`) holds no domain index; `validateWorkspaceReferences` only saw nodes. A bridge was needed.

### What changed
- `validateWorkspaceReferences(result, index, domain?)` runs over a `DomainIndex` (built from the graph by the new `domainIndexOfResult` unless the host passes one; `nn-mcp` passes the disk-backed index). Typed `reference`/`knowledge` fields hold addresses: a removed form (`[[Title :: Name]]`, `[[Name]]`, a bare title) is `ADDRESS_MALFORMED`; a relative `@slug` is left to the per-file validator; an absolute address resolves exactly through `DomainIndex.resolve` (`REF_MODEL_NOT_FOUND`, `REF_ELEMENT_NOT_FOUND`, `ADDRESS_NOT_CANONICAL`; `REF_CONCEPT_MISMATCH` and `REF_BLUEPRINT_MISMATCH` warn). `MULTIVALUE_SYNTAX` keeps its code and now means a comma-joined address list outside `[a, b]` (A-12).
- `references.ts`: a typed `reference` value is address-only (relative `@slug` resolved by slug; other-model addresses are delegated). Implicit reference fields (`location`, `room`, ...) are not typed by the template and keep the by-name path; wikilink targets (`resolveReferenceTarget`, matrix headers) keep slug-first then name with `AMBIGUOUS_ELEMENT_NAME` (A-13).
- `workspaceIndex.ts`: the three maps and the duplicate-title issue are gone; `content.ts`: the `conv-wikilinks` bypass is gone and the removed form is named in the message.
- `scope/elements.ts`: `parent` resolves `@slug` (relative address); `[[title]]` is `UNKNOWN_PARENT_ELEMENT` naming the field; `scope-chain` delta spec has the MODIFIED requirement "Element Scope Parent Given By A Reference Field" (S3b.10). `programas-golden/tutorias_NN.md` migrated to `@programa-alfa` etc.
- `recursiveParser/knowledge.ts`: the FR-005 info note now names `<model-id>@<slug>`.

### TDD evidence
- The new reference behavior was written before the tests that pin it, so the RED proof is the legacy suites turning red against the new code: nn-core full run showed 33 failures across `workspaceReferences`, `workspace-taxonomy-submodels`, `index`, `phase5-references-ledger`, `matrix-header-context-resolution` (each asserting the removed behavior), then the suites were rewritten to the new contract (not weakened: removed forms are now asserted as errors; wikilink ambiguity is pinned through `resolveReferenceTarget`) and went green. `tests/workspaceReferences.test.ts` was rewritten (21 tests). Deviation from strict RED-first; flagged for verify.
- `scope/elements.spec.ts` and `fs-elements.spec.ts` were updated to `@slug` (2 red against the new code, then green).

### Corpus gate (S3b.11)
`node scripts/verify.js --fast` stayed green with no sample or fixture migration: no shipped sample, fixture or use-case workspace that verify exercises holds a typed `[[Name]]` value in a declared `reference` field, so the S7b mechanical commits were NOT pulled forward. The S7b inventory (A-18) is still due.

### Deviations
1. `core/validator/index.ts`/`core/index.ts`: `QUALIFIED_REF_RE`, `parseQualifiedRef` and `QualifiedRef` are no longer exported; `domainIndexOfResult` is exported instead. `propose-changeset.ts` and `server.ts` had no hit of the removed symbols (the task's guess).
2. `GRAMMAR_HINT` example in `address/parse.ts` changed to `series-a/episode-1@scene-1`: the video-script scope mirror bundles it and a video-script guard test forbids the token `00-gancho` in the engine scripts.
3. Per-file validation of a `knowledge`-typed field still treats values as submodel paths (untouched).

### Gate (S3b verification)
- nn-core `tsc --noEmit`: exit 0; nn-mcp typecheck (throwaway paths config): exit 0.
- nn-core `vitest run`: 211 files, 2359 passed. nn-mcp `vitest run`: 61 files, 657 passed.
- `node scripts/check-openspec-deltas.mjs`: OK. Mirrors regenerated (core, preflight, console payload, console bundle, address module).
- `node scripts/verify.js --fast`: exit 0.
- Grep for `QUALIFIED_REF_RE|titleToNodeIds|resolveTargetModel` under `iNNfo/packages` (without bin/dist): no match.


## S3c - Slug-keyed graph identity (PR 8, branch `ds/s3c`, targets `ds/s3b`)

Status: S3c done (S3c.1 to S3c.5), one recorded deviation in S3c.3 (console host).

### Resumed from an interrupted apply
The slice was found half-applied and uncommitted in the apply worktree: the graph was already slug-keyed, `modelId` was already threaded, and `tests/slug-keyed-identity.test.ts` existed and passed 5/5. The MCP host test in `validate.spec.ts` had been left with an unterminated string literal (a syntax error that broke the whole file, so its suite never ran). The previous agent stopped mid-edit; no section was recorded here.

Evidence recovered, not witnessed by this session: S3c.1/S3c.2 RED. The adopted `slug-keyed-identity.test.ts` passes; its failure state was not reproduced after the fact and is reported as adopted, not as a fresh RED.

### Claim check (before editing)
- `IdentityRegistry` keyed sibling uniqueness on the display NAME and `normalizeElementsIntoGraph` built ids as `Parent/Child` from a taxonomy ladder (`resolveParentQualifiedId`). Two elements sharing a name were therefore indistinguishable, and one was dropped.
- `ParseIssue.code` was a closed union with no member for a dropped element, and `nn-mcp` consumed `recursiveParse().issues` NOWHERE: `collectWorkspaceDiagnostics` assembled only cross-model references, sources and evidence. A graph-dropped element was invisible to every host.
- Only one parse issue in the whole parser carries `severity: 'error'` (`normalize.ts`, the duplicate-slug drop), so widening the workspace pass to error-severity parse issues cannot change any other diagnostic today.

### RED (S3c.3, witnessed)
`src/tools/validate.spec.ts` - "collectWorkspaceDiagnostics reports an element dropped from the graph as an error naming model and element": `expected [] to have a length of 1 but got +0`. Two elements carrying `slug:: twin` in one model are deduplicated by the graph and the loss reached no host.

### GREEN (S3c.3)
- `ParseIssue.code` gains `'DUPLICATE_SLUG'`; the drop site stamps it and keeps the prose message (`DUPLICATE_SLUG: slug ... is carried by more than one element of model ... (<type> "<name>" is dropped); give each element its own slug`), which names model, element and fix as design A12 requires.
- `collectWorkspaceDiagnostics` now files every `severity: 'error'` parse issue as a `ReferenceDiagnostic` (path, code, message). Both consumers inherit it: `validate_knowledge` in workspace mode and `check_domain` (`checkWorkspace` composes the same pass). Warnings and info stay with the per-model validators.

### Semantics kept
Identity is the slug, scoped by the model. Two elements with the same NAME and different slugs are both present (`Gancho Presenter` with `gancho-presenter-a`/`-b`); two elements with the same NAME and no explicit slug share the derived slug and the second is `DUPLICATE_SLUG`, which is why the pre-existing sibling-collision test still passes unchanged in intent.

### Deviations
1. **S3c.3 console host deferred to S5b.** The console payload is built from `parseKnowledge(content)` (a single-file parse), not from the graph registry, so it never drops an element and has no diagnostics channel to file one into. `ConsolePayload` has no diagnostics slot; adding one ripples into the bundle, the shells and the committed fixture, which is S5b.1-S5b.4's remit (`console-payload-builder.test.ts` is named there too). No element can be silently omitted on that path today.
2. `normalizeSingleKnowledge(...)` takes a new optional 5th argument `{ modelId }`. Inside a workspace parse the parser has no domain index, so `knowledge.ts` defaults it to the model name (`refName`) and a standalone parse keeps the relative `@<slug>` form. Passing the true hierarchical id from a host that already has a `DomainIndex` is S5b/S6 work; the option is the seam.

### Gate (S3c verification)
- nn-core `tsc --noEmit`: exit 0. nn-mcp typecheck against the worktree core (`tsconfig.tmp.json`, throwaway): exit 0.
- nn-core `vitest run`: 212 files, 2365 passed. nn-mcp `vitest run`: 61 files, 658 passed.
- Two nn-mcp tests hit their 30s timeout under full-suite load (`check-workspace.spec.ts` "summary_only", `concept-drift-and-gate.test.ts` "PARENT_RESOLUTION_FAILED"); both pass in isolation (15.7s and 12.4s) and pass in the second full run. Flaky under concurrency, not a regression.
- `node scripts/build-core-mirrors.mjs`: no output change (the parser is not mirrored); `node --test scripts/build-core-mirrors.test.mjs`: 1 passed.
- `node scripts/verify.js --fast`: exit 0.

## S4a - `check_domain.layout` (PR 9, branch `ds/s4a`, targets `ds/s3c`)

Status: S4a done (S4a.1 to S4a.5).

### RED
`src/tools/layout.spec.ts` (NEW, 9 cases) failed 9/9: `check_domain` had no `layout` section, `collisions` was still the S3a shim, and `validate_knowledge` reported no placement at all.

### GREEN
- `domainLayoutDiagnostics(rootDir)` in `domain-index.ts` is now the single read of the layout pass. It returns `index.diagnostics` verbatim: `buildDomainIndex` ALREADY appends `versionSkew` (S2b), so recomputing it here reported every skew twice. That duplication was caught by the new test, not by inspection.
- `check_domain` returns `layout: { ok, diagnostics }` and no longer returns `collisions`. `ok` is false only when some diagnostic is an error (a warning such as `INSTANCE_SHADOWS_ELEMENT_ASSETS` leaves the domaiNN clean). `summaryOnly` caps `layout.diagnostics` at 25 and sets `layoutTruncated`; `truncated` is set when either cap fires.
- `duplicateIdCollisions` stays exported for `sync_domain_manifest`, whose flat `collisions` field is a different tool's output shape; its comment no longer promises an S4a replacement.
- `validate_knowledge`: a single-file pass reports its OWN placement through `fileLocalDiagnostics` (design A10, no domaiNN needed) and stays silent about skew and duplicated ids; a `workspace: true` pass files every domain layout diagnostic whose `paths` include the model, so placement, identity and skew reach the model exactly once. The two branches are mutually exclusive, which is what keeps a diagnostic from being reported twice.
- `loadDeclarations` is exported from `domain-index.ts` so the single-file path resolves the pinned bluepriNNt's storage the same way the index does.

### Fixture notes (for the next slice that needs layout fixtures)
- Models live at the domaiNN root (`series/<slug>/...`), NOT under `models/`: `classifyModel.matchFolder` requires the directory chain to equal the rule's folder exactly, so a `models/` prefix makes every model compact.
- A `{container}` placement needs `container:: <Concept>` on the declaring concept, or `buildRules` drops the rule and the concept reads as compact.
- `parent_spec.url` must be root-relative (`specs/bluepriNNts/x_NN.md`) and the bluepriNNt must pin a resolvable L1, or `validate_knowledge` short-circuits with `PARENT_RESOLUTION_FAILED` before Phase 4 and reports no layout at all.
- A model pinning a blueprint NAME that no local package carries falls back to package lookup, so a "non-declaring blueprint" fixture needs its own name (`plain_V_0-1-0`), not just its own file.

### Gate (S4a verification)
- nn-core `tsc --noEmit`: exit 0. nn-mcp typecheck (throwaway paths config, against the worktree core): exit 0.
- `src/tools/layout.spec.ts`: 9 passed. nn-mcp `vitest run`: 62 files, 667 passed.
- `node scripts/verify.js --fast`: see the PR body.

## S4b - `nn-upgrade` / `nn-preflight` grouped plan (PR 10, branch `ds/s4b`, targets `ds/s4a`)

Status: S4b.1, S4b.2 and S4b.3 done. The apply lives in `nn-upgrade` (see Deviations 1).

### GREEN
`upgrade-check.js` gains a pure, read-only grouped plan:
- `planUpgrade(workspaceDir, catalog)` returns one unit per bluepriNNt. The unit is the WHOLE group (every model pinning it, `current` included), not just its stale members: consent to upgrade a bluepriNNt covers every model that pins it, and a group already holding two pins is the skew the plan resolves. A group with no `upgrade-available` member produces no unit.
- `members[]` carries `{ path, pinned, moves }`; `count` is the unit size; `pinned` lists every distinct pin; `skew` is `pinned.length > 1`.
- `planHash` is a SHA-256 over every member path and its current pin, per unit and for the whole plan. `isPlanFresh(plan, workspaceDir, catalog)` re-plans and compares, so a model added or repinned between consent and apply aborts the run.
- `describePlan(plan)` is the consent text: it states the number of models in each unit and prints `SKEW:` before the upgrade line when the group was already skewed.
- CLI: `--plan` is opt-in and additive. Without it the invocation prints exactly what it printed before.

Evidence (`node upgrade-check.test.js`, all 11 cases green):
- 24 Video instances on `V_0-14-1` plan as ONE unit of 24, and the consent text says `24 model(s)`.
- A model added after planning makes `isPlanFresh` false and changes `planHash`.
- A unit already holding `V_0-1-0` and `V_0-2-0` reports `skew: true`, lists both pins, targets the adopted version, and `describePlan` starts with `SKEW:`.

`skills/nn-upgrade/SKILL.md` Flow B now states the unit rule (B0), the consent count (B1), the once-per-concept mapping (B3) and the all-or-none repin with whole-unit restore (B4).

### Deviations
1. **S4b.2 is partial: no apply implementation.** `upgrade-check.js` is documented and tested as read-only ("it never mutates anything", preflight Tier-3), and the mutating machinery (backup, rehydrate, revalidate, restore) lives in `skills/nn-upgrade/scripts/`. Putting a file-writing `applyPlan` into the preflight scanner would give one script two contracts. The plan, the hash and the freshness gate — everything the apply phase needs to be safe — are in place and tested; the repin loop itself is unwritten. Options for the maintainer: (a) implement `applyPlan` in `nn-upgrade/scripts/` consuming this plan, (b) implement it in `upgrade-check.js` under an explicit `--apply` and accept the dual contract.
2. **The once-per-concept mapping question has no test.** B3 states it in the SKILL, but the mapping itself needs element-level parsing, which this scanner does not do. It belongs with the apply phase in (1).
3. `planUpgrade` treats an `ahead` model (pinned newer than the catalog) as neither a member nor a target: pinning it to `adopted` would be a downgrade. It stays reported by `scanWorkspaceUpgrades` as `ahead`.

### Gate (S4b verification)
- `node upgrade-check.test.js`: 11 cases green.
- `node skills/nn-upgrade/scripts/{skill-contract,backup-workspace,migrate-domain}.test.js`: all green.
- `node scripts/verify.js --fast`: exit 0.

### S4b.2 GREEN - the apply, in `nn-upgrade`
Implemented as `skills/nn-upgrade/scripts/apply-upgrade-plan.js` (maintainer's choice): `upgrade-check.js` keeps its documented read-only contract and the mutating half sits next to the backup it uses.

- `repinContent(content, blueprint, version, mapping)`: rewrites `parent_spec.name` and the version token in `parent_spec.url`, applies the concept mapping (`## NN <from>:` -> `## NN <to>:`), and touches nothing else.
- `applyUpgradePlan({ workspaceDir, plan, catalog, consent, validate, onMapping, concepts, dryRun, backupTarget })`:
  - `PLAN_EMPTY` / `CONSENT_REQUIRED` (states the model count) / `PLAN_STALE` before the first write;
  - backs the workspace up (`backupWorkspace`) before writing anything;
  - asks the mapping ONCE per unit (`onMapping(concepts)`), applies the answer to every member;
  - on any member failing `validate`, restores EVERY member written in the run and returns `UNIT_REVALIDATION_FAILED` with the failing paths - all-or-none across the whole run, not just the unit.
- CLI: `--consent` gates the write, `--dry-run` reports without writing.

Evidence (`node apply-upgrade-plan.test.js`, 5 cases green):
- consent refused -> `CONSENT_REQUIRED`, `models: 3`, workspace byte-identical;
- plan outgrown by one model -> `PLAN_STALE`, no write;
- 24 instances -> `written: 24`, every pin moved, the single mapping answer reached all 24, backup manifest present;
- one of the 24 failing re-validation -> `rolledBack: 24`, workspace byte-identical to before, failing path named;
- `repinContent` leaves title and body untouched.

The five cases passed on their first run, so both critical invariants were proven to bite by mutation: disabling the rollback turns the all-or-none case red ("the workspace is byte-identical after the rollback"), and disabling the consent gate turns the consent case red.

## S5a - Collections: `query_units`, `list_knowledge` (PR 11, branch `ds/s5a`, targets `ds/s4b`)

Status: S5a.1 to S5a.6 done.

### RED
`src/tools/collections.spec.ts` (NEW, 9 cases) failed 7/9: `collection:` was not a selector, `list_knowledge` carried no blueprint/storage/placement and no `collection` argument. `resolve-effective.spec.ts` gained 3 cases that failed only because the fixture keys were guessed wrong (see Deviations), not because the fold was wrong.

### GREEN
- `queryUnits` accepts `collection:<Concept>?filter[&filter...][&projection]`. It resolves the concept's collection through the domain index, runs the query over each member, and scopes the run to the concept (`conceptSlug`): a Video instance also holds its Scenes, so an unscoped `status=` filter matched the Scene too and reported one Video twice.
- The per-member snapshot is keyed by the MODEL ID, so the URIs `runQuery` builds already carry the address. A file path stops being an identity once storage distributes.
- An unknown concept is an ERROR naming the concept, not an empty success: "no member" and "no match" are different answers.
- `listKnowledge(rootDir, { collection? })` returns `{ id, path, version, blueprint, storage, placement? }` sorted by id. A misplaced instance is listed and flagged `PLACEMENT_MISMATCH` (discovery is path-agnostic; the finding is what marks it), never hidden.
- `list_knowledge` in `server.ts` gains the `collection` argument and its description states the shape.
- `resolve-effective.spec.ts` gains three characterization cases proving storage is orthogonal to the scope chain: an instance inherits from its series scope, instances of different series never share a supplier, and an instance folder without `scope: true` is not in the chain.

### Deviations
1. **Collection URIs keep heading text, not slugs.** `serializeKnowledgeUnitRef` deliberately emits `@## NN Scene: 00-gancho` (the human-readable form an author types); the first draft of the test expected `@00-gancho`. The test was wrong, the serializer's rule stands, and the address still carries the owning instance (`<model-id>@## ...`).
2. **`collection:` needs element slugs for element-level selectors.** The index reports `CollectionMember.modelId` (not `id`), and a heading without `slug::` serializes as text; the fixture now freezes the Scene slug the way real models do.

### Gate (S5a verification)
- nn-mcp `tsc --noEmit` (worktree core): exit 0.
- nn-mcp `vitest run`: 63 files, 679 passed. `collections.spec.ts`: 9 passed. `resolve-effective.spec.ts`: 56 passed.
- `node scripts/verify.js --fast`: see the PR body.

## S5b - Console: model ids, exact cell keys, collections, title autocomplete (PR 12, branch `ds/s5b`, targets `ds/s5a`)

Status: S5b.1 to S5b.5 done.

### RED
- `tests/console/payload-builder-identity.test.ts` (NEW, 9 cases) failed 5/9 before any implementation: `modelId` ignored the caller and fell back to a `kNNowledge/...` path, two models with the same matrix and axis slugs read each other's cell provenance, and `collections` did not exist. The 4 that already passed are the today-correct halves (same-model cell lookup, the title-slug fallback, no collections, compact and distributed titles).
- `tests/console-reference-autocomplete.test.ts` (NEW, 9 jsdom cases) failed 9/9 with `UI.buildReferenceIndex is not a function`: there was no reference index, no title rendering, no autocomplete and no title-and-address message.

### GREEN
- `buildConsolePayload` takes an explicit `modelId` and a `collections` slot. It stays pure and browser-safe: it never reads a domaiNN, so the caller that owns the index passes the id. `normalizeModelId` is deleted; the standalone fallback is documented in the builder and covered by a test.
- Cell provenance is keyed exactly: `<model-id>@<matrix-slug>&<row-slug>&<col-slug>`. The suffix map is gone, so a console that aggregates models can no longer read another model's history (F5).
- `ui-kit`: `buildReferenceIndex` (collections + model titles + element names), `referenceCandidates` (a field's `target_concepts`, filtered by title substring), `relativeAddress`, `referenceError`. A field storing an address renders the target's title in a link that carries the address in `data-address`, while the payload keeps the address; `FieldReferenceWidget` is a combobox over `title - address` that writes the address (relative when the target lives in the same model) and writes nothing until a candidate is picked.
- `review.js`: candidates come from the reference index scoped to `target_concepts` (a reference may cross models, which is what the address grammar is for), the edit modal receives the model id so a same-model target is written `@slug`, and the error message names the title and the address of every candidate. The retarget value is the element address, not `[[Name]]`.
- `nn-runtime.js`: builds the reference index at boot from the payload `collections` slot and `meta.models`, threads it into the element cards and the review controller, and a reference link focuses the addressed instance's first card.

### Deviations
1. **The export CLI does not pass `modelId` yet.** `scripts/export-console.mjs` has no domain index (it scans files itself), so it keeps calling the builder without the option and every exported console keeps the standalone stem id. The caller-side contract (an explicit `modelId`) and the exact cell keys are in place; wiring the CLI to `buildDomainIndex` is a separate, larger change that the S5b file list does not include. The fixture's ids therefore did not change in this slice.
2. **The standalone fallback is the display stem, not a path.** `business_V_0-2-5_NN.md` now yields `business_V_0-2-5` where the old `normalizeModelId` yielded `models/business_V_0-2-5`. Two assertions in `scripts/export-console.test.mjs`, one in `tests/console-payload.test.ts` and one in `tests/console-payload-builder.test.ts` were updated to the new semantics; `tests/console/cell-provenance.test.ts` now passes the `modelId` its changeset uses.
3. **A console exported without the collections slot falls back to the elements it holds** (addressed `<model-id>@<slug>`), so a standalone console still offers its own elements. A domain console with the slot never uses the fallback.
4. **The editor message, not the domain validator, shows title and address.** `REF_MODEL_NOT_FOUND` lives in the browser-safe index, which carries no titles; the title-and-address message is implemented where the titles exist (the console editor). Recorded here rather than widening the index types in a console slice.

### Gate (S5b verification)
- nn-core `tsc --noEmit`: exit 0. nn-mcp typecheck (throwaway worktree config): exit 0.
- `vitest run tests/console tests/console-reference-autocomplete.test.ts tests/console-dom.test.ts`: 42 files, 304 passed.
- `node --test scripts/export-console.test.mjs`: 52 passed. `node --test test/console-edit-modal-types.test.mjs`: 13 passed. `node --test test/console-s3b-parity.test.mjs`: 16 passed.
- `node scripts/verify.js --fast`: green. Full `node scripts/verify.js`: 227 steps, exit 0.
- Bundle and testlab fixture regenerated with the shipped scripts; no inline hash edited by hand.

## S6a - `add_model` with placement and replay skeleton (PR 13, branch `ds/s6a`, targets `ds/s5b`)

Status: S6a.1 to S6a.8 done.

### RED
- `src/tools/apply-change-facts.spec.ts` gained a self-contained distributed fixture (a local bluepriNNt declaring `Series` at `series/{slug}/` and `Video` at `{container}/assets/{slug}/`) and 16 cases. The first 8 failed for real reasons: `parseChangeset` rejected `concept` on `add_model` ("must not carry element payload"), the placement was never computed, and the id was always written under `kNNowledge/`.
- The S6a.3 run failed 4 of 8: a bare slug said only `Model not found: intro`, a filename stem was reported as an unknown id instead of a removed form, three instances with one invalid model applied, and a misplaced instance was updated in place.
- `test/provenance-strict.test.ts` gained 3 instance cases; 2 failed: replay rebuilt a compact skeleton (so a clean instance drifted) and an instance with no recorded creation was skipped silently.
- `tests/changeset/template.test.ts` failed on the `concept` description; the serializer/hasher cases passed at intake and were proven to bite by mutation (see Evidence).

### GREEN
- `addModelProblems` (`core/changeset/types.ts`) accepts `concept` on `add_model` and, only then, a hierarchical target. A hierarchical target without `concept` is still rejected as "a plain model id", so the compact branch is unchanged.
- `scaffoldKnowledgeDocument({root})` (`core/scaffold/knowledge.ts`) writes the instance root element (`## NN <Concept>: <name>` plus `slug:: <slug>`) and skips every OTHER distributed concept. A second element of a distributed concept would make the file a registry or a mixed-storage model (design A8), so the skeleton holds the root and the compact concepts only. The document title and `knowledge_slug` default to the instance slug, never to the full id.
- `add_model` (`apply-change.ts`) computes the placement once, before Phase 1, from `DomainIndex.placementFor` plus the models an earlier change in the same changeset creates. It reports `CONTAINER_MISSING` naming the container, `ADD_MODEL_ORDER` when the container is created later, `ADD_MODEL_INVALID_TARGET` for a bad id, and `BLUEPRINT_UNRESOLVED` (before placement can even be computed) when the bluepriNNt does not resolve. `MODEL_EXISTS` now also covers an occupied placement path, so a non-model file is never overwritten. `DOMAIN_LAYOUT_INVALID` stays on the compact branch only.
- Phase 2 creates the folders an instance needs and records exactly the ones it created; the existing rollback removes created files and then those folders, deepest first and only when empty.
- `modelIdAliases` skips `add_model` changes that name a concept or carry a hierarchical id: the stem alias is a compact-model rule (design A9), and `canonicalModelId` would otherwise append the bluepriNNt to the slug.
- Targeting: an unresolved model part lists the ids that share its last segment (a bare slug never resolves), and a filename stem is reported as `MODEL_ADDRESSED_BY_STEM` naming the id to use. Before Phase 2, every touched instance model runs `fileLocalDiagnostics`, so a placement violation aborts the whole changeset.
- Strict replay passes the same `root` to `scaffoldKnowledgeDocument`, and an instance model with no applied `add_model` is reported as `MODEL_WITHOUT_RECORD` (error) instead of being skipped.
- `core/domain/placement.ts` derives the instance file name from the version-less bluepriNNt name, which is what `checkInstanceName` compares against; the two disagreed for a versioned `parent_spec.name`.
- `buildNodeDomainIndex` also warms declarations by bluepriNNt NAME, so `DomainIndex.placementFor` (which takes no url) resolves the same declarations the models pinned.
- `changes` blueprint: `blueprint_version` V_0-6-0 -> V_0-7-0 (bumped once; S6b edits it in place), the `concept` field documents `add_model`, and the `add_model` bullet states the placement rule. `manifest/source.yaml`, `catalog.json` and `canonical-registry.ts` regenerated.

### Evidence
- **Mutation 1**: removing `'concept'` from `PROPOSAL_KEYS` made `hasher.test.ts` fail on the frozen seal and on "the concept is part of the seal"; reverted, 13 passed.
- **Mutation 2**: keying the loaded model by the bare slug instead of the hierarchical id made 8 cases of `apply-change-facts.spec.ts` fail (models map, resolved target, candidates, placement gate); reverted, 24 passed.

### Deviations
1. **Two TDD pairs share one commit.** S6a.1/S6a.2 and S6a.3/S6a.4 touch the same three files (`apply-change.ts`, the spec, `model-id.ts`); both pairs were driven red and green in that order, but the resulting tree cannot be split into two reviewable commits without rewriting the same hunks twice. Recorded here rather than fabricating a split.
2. **An occupied placement path is detected with `stat` on the computed path.** `findKnowledgeFile` never resolves a non-model file whose stem matches a model, so the id check alone cannot see the squatting file.
3. **The placement gate runs `fileLocalDiagnostics` only for touched instance models.** A compact model keeps today's behaviour, including the `DOMAIN_LAYOUT_INVALID` rule, because that rule belongs to the compact branch of `add_model` (task S6a.1).
4. **The "one invalid instance" case uses a file that is already outside its bluepriNNt.** A bad `select` value is refused by the mutation (`MUTATION_FAILED`), so it cannot exercise the Phase 4 `VALIDATION_FAILED` path the spec's scenario is about.
5. **A stem target is reported by the apply engine, not by the parser.** `parseAddress` cannot know the domain's stems; the check lives where the index does, and it runs before any write.
6. **A pre-existing S5b defect was repaired here.** `test/console-export-roundtrip.test.ts` still asserted the pre-S5b path-derived `modelId` (`kNNowledge/strategy`); S5b deleted `normalizeModelId` but left the assertion, so the file was red on `ds/s5b` before this slice. The one-line expectation now matches the shipped behaviour (`strategy`) and is committed separately so the repair is visible.
7. **`mcp-tests/apply-change-models.test.ts` was not edited.** Its compact cases already cover the unchanged branch and passed untouched; the new instance cases live in `apply-change-facts.spec.ts`, which the slice lists as the first failing test's home.

### Gate (S6a verification)
- nn-core `tsc --noEmit`: exit 0; nn-core build: exit 0; nn-core `vitest run`: 214 files, 2392 passed.
- nn-mcp typecheck (throwaway worktree config): exit 0; nn-mcp `vitest run`: 63 files, 700 passed (after deviation 6).
- `node scripts/verify.js --fast`: see the PR body.

## S6b - `move_model` and the `rekey` event (PR 14, branch `ds/s6b`, targets `ds/s6a`)

Status: S6b.1 to S6b.10 done.

### RED
- `tests/changelog/fold.test.ts` gained 4 cases (container move, slug change, descendant prefix plus tombstone, chained identities). All 4 failed for real reasons: `move_model` was not a `ChangeOp`, the fold ignored it, and `identities` did not exist.
- `src/tools/apply-change-facts.spec.ts` gained a self-contained S6b block (12 cases) whose first run failed 11 of 12 (the `rename_element` asset case passed for the wrong reason, see Evidence). Every failure was the missing feature (`MUTATION_FAILED`), never an assertion typo.
- `test/apply-change-persist.test.ts` gained the rollback case; it exercises the existing injected-rename harness.
- `tests/changeset/template.test.ts` failed 2 of 2 until the `changes` blueprint declared `move_model`.

### GREEN
- **Fold**: `FoldResult.rekeys` carries `{from, to, order}`. On `move_model` the fold rewrites units, epochs, element origins, cleared keys and tombstone copies from that order on; `rekeyKey` rewrites the model prefix (descendants included) and the root element slug when the model slug changes. `ChangeLog` builds its unit index with each change mapped forward through later rekeys, so `history(old)` and `history(new)` both return the whole chain, and `identities(id)` walks the chain backwards and returns the former ids oldest first.
- **Apply**: a move plan is computed in Phase 1 from the domain index. A compact target is `MOVE_REQUIRES_INSTANCE`; an occupied id is `MODEL_EXISTS`; a missing or wrong container is `CONTAINER_MISSING`; an existing destination folder is `MOVE_DESTINATION_OCCUPIED`; a bad new id is `MOVE_INVALID_TARGET`. A slug change rewrites the root `slug::` (and `knowledge_slug`) in memory, so only that move bumps the model; a pure container move relocates without a version transition. Phase 2 renames the instance folder (carrying descendants and assets), then the stem, then writes the mutated body through the existing atomic persist. `performedMoves` is reversed first in `rollbackPersistence`, before the original content is restored at the original path.
- **Placement gate** judges a moved model at its planned path, not at the old one, so a slug rename is not reported as `INSTANCE_SLUG_MISMATCH`.
- **Referrers**: `src/tools/move-referrers.ts` scans every discovered model outside the moved folder, rewrites address tokens for the suggestion and reports `MOVE_LEAVES_DANGLING_REFERENCES` at apply unless every unit is retargeted by an `update_field` in the clean subset. `propose_changeset` runs the same scan and returns `missing_referrer_updates` on the error, ready to merge.
- **Asset path deleted**: the `rename_element` asset-directory rename is gone; the legacy `mutate.spec.ts` expectation now pins the folder freeze.
- **Surface**: `move_model` is in `CHANGE_OPS`; `moveModelProblems` rejects a missing `to` and an element/path address; the `changes` blueprint's `op` select, prose and `to` description declare it; the apply tool enum and descriptions list it; catalog, canonical registry, core mirror and console payload regenerated. `sync:versions`/`check:versions` ran via their node scripts.

### Evidence
- **Mutation 1**: removing the asset fixture to its realistic legacy location (`<model dir>/assets/<slug>`) turned the new `rename_element` case red against the shipped code, proving the case bites; deleting the code path made it green.
- **Mutation 2**: dropping `to` from `PROPOSAL_KEYS` failed the new seal assertion ("a different destination is a different proposal"); reverted, all 20 parser cases pass.
- The fold cases were red before implementation, so they needed no mutation.

### Deviations
1. **S6b.3 to S6b.7 share one commit.** The apply path, the referrer scan and the asset deletion are the same hunks of `apply-change.ts`; splitting would rewrite them twice. Recorded rather than fabricating a split.
2. **Placement uses the pinned `parent_spec.name`.** `IndexedModel.blueprint.name` is version-less while `DomainIndex.placementFor` resolves declarations by the versioned name, so a version-less name resolves to an empty declaration map and reads every concept as compact.
3. **The referrer scan does not consult the schema.** Under S3b typed fields are address-only, so any address token naming the old id is a reference; an untyped field holding the same shape is reported too (conservative, never guessed).
4. **The rollback case injects the failure at the staging -> live rename**, after the folder rename, through the existing harness. A real Windows file lock is timing-dependent; the injected failure exercises the same reversal path deterministically.
5. **`MOVE_DESTINATION_OCCUPIED` is a new code.** The task named the failure mode, not a code; the move pre-check needs one, so it is added next to the other move codes.
6. **Two pre-existing tests were updated with the behaviour.** `mutate.spec.ts` asserted the deleted asset rename and `direct-operations.test.ts` classifies every `ChangeOp`; both now match what S6b ships.

### Gate (S6b verification)
- nn-core `tsc --noEmit`: exit 0; nn-core `vitest run`: 214 files, 2403 passed.
- nn-mcp typecheck (throwaway worktree config): exit 0; nn-mcp `vitest run`: 63 files, 713 passed.
- `node --test scripts/build-core-mirrors.test.mjs`: green.
- `node scripts/verify.js --fast`: exit 0.

## S6c - Drift and identity-chain replay keyed by the model id (PR 15, branch `ds/s6c`, targets `ds/s6b`)

Status: S6c.1 to S6c.10 done. `size:exception` (724 hand-authored changed lines against a ~350 forecast; no declared fallback split).

### RED
- `tests/changelog/drift.test.ts` gained a 5-case block. First run: 3 of 19 failed (`MODEL_WITHOUT_FILE` did not exist; the hand-deleted instance produced nothing). The two negative controls (present model, rename to a live model) passed before the implementation, so both were later proven to bite by mutation.
- `test/provenance-strict.test.ts` gained the create -> edit -> rename replay case. It failed with `MODEL_WITHOUT_RECORD: villabotijos-today/welcome`: strict replay looked for the creation under the new id only.
- `test/provenance-differential.test.ts` gained a distributed fixture and two move cases (no drift; a hand edit after the move is flagged). R5.
- `test/provenance-contracts.test.ts` gained the fold-mode surface case (`check_domain.provenance` reports `MODEL_WITHOUT_FILE` when a touched model has no file). Green once the drift commit landed; the behaviour itself was proven red in the drift test.
- `tests/changeset/history.test.ts` +3 and `impact.test.ts` +2: 4 of 14 failed (the rename chain did not stale the new id; impact keyed by `knowledge_slug` collapsed equal-stem instances and missed a same-model reference).
- `tests/workspaceReferences.test.ts` +1: failed on the missing successor in a stale address.

### GREEN
- **Drift**: `MODEL_WITHOUT_FILE` names the id and the first applied change that touched it, warning in fold mode and error in strict. Coverage is computed from each entry's id plus `log.identities(id)`, so a `move_model` chain that ends in a live file is not drift and a hand-deleted instance is (A-5). Concept unit keys are compared in canonical slug form (`normalizeConceptKey`), so a changeset that recorded `model@concept:Goal` still matches a file whose concept is `goal`.
- **Strict replay**: `creationOf` resolves the recorded `add_model` through the identity chain (current id plus `identities`, plus the changeset `models` map), the aliases set carries every id, and `move_model` joins the non-replay ops because the skeleton is already built under the current id. The renamed instance reproduces its file; the earlier changeset bytes and `proposal_sha` are untouched.
- **Staleness**: `checkStaleTarget` derives the id set from `identities` (backward) and applies later moves forward, prefix-aware, so a removal recorded under an old id stales a change on the new id and vice versa. A pending change authored before a rename returns the new `STALE_TARGET_MOVED` naming the new id; `partitionChangeset` carries that code through. The 50-changeset cap and the epoch cut are unchanged.
- **Impact**: `workspaceEntries` picks one id per model (preferring the `/`-keyed id, else the root slug), dedupes by document and scans once; `evaluateBatchDeleteImpact` looks the target model up by hierarchical id first. Equal stems no longer collapse and same-model references match on the full address.
- **Successor**: `ChangeLog.successorOf(id)` walks the rekeys forward (prefix-aware), and `validateWorkspaceReferences` accepts an optional resolver that nn-mcp `validate.ts` fills from the log. The stale-address error keeps the old id and appends `recorded successor: "<new>"` plus `meta.successor` (A-11).
- **Concept key**: `resolvedTarget.concept` strips a `concept:` prefix and emits `slugifyHeading(name)`, the form the grammar parses and `unitAddress.section` already produced. The read side (drift) accepts both forms, so no history key is rewritten.

### Evidence (mutation)
- **Mutation 1 (drift coverage)**: deleting the `identities` contribution from the covered set turned the "renamed by move_model ... is not drift" case red; restored, 19 passed.
- **Mutation 2 (replay chain)**: replacing the chain with `[modelId]` turned the strict replay case red with `MODEL_WITHOUT_RECORD`; restored, 8 passed in the file.
- The positive cases were red before implementation, so they needed no mutation.

### Deviations
1. **Concept-key read side shipped with the drift commit.** `drift.ts` owns both, so it landed with `MODEL_WITHOUT_FILE`; the write side (`resolved-target.ts`) has its own commit.
2. **`STALE_TARGET_MOVED` is a new code.** The task named the behaviour, not a code; `StalenessCheckResult` gained it next to `STALE_TARGET_DELETED`.
3. **`successorOf` is new on `ChangeLog`.** `identities` only walks backward; a stale reference needs the forward successor.
4. **`validateWorkspaceReferences` gained an optional 4th parameter** instead of importing the change log into the nn-core validator; nn-mcp `validate.ts` already holds the log.
5. **The differential move fixture is local** to `provenance-differential.test.ts` (video blueprint + series) because `move_model` needs a distributed instance; the compact seeded generator is unchanged.
6. **Three pre-existing assertions were updated with the behaviour**: `resolved-target.test.ts` and `facts.test.ts` expect the concept slug; the drift "model never touched" case now expects the one `MODEL_WITHOUT_FILE` for the touched-but-missing model.
7. **`npm` scripts were not used** (bin shims are absent in this worktree); every gate ran through `node ../../../node_modules/...`, and nn-core `dist` was rebuilt with `tsc` for the throwaway nn-mcp typecheck.

### Gate (S6c verification)
- nn-core `tsc --noEmit`: exit 0. nn-core `vitest run` full: 214 files, 2414 passed.
- nn-mcp typecheck (throwaway `tsconfig.tmp.json`, against the worktree core): exit 0. nn-mcp `vitest run` full: 63 files, 717 passed.
- `node --test scripts/build-core-mirrors.test.mjs`: 1 pass, 0 fail.
- `node scripts/verify.js --fast`: exit 0 (205 steps) after regenerating the console-payload mirror.

## S6d - `extract_instance` (PR 16, branch `ds/s6d`, targets `ds/s6c`)

Status: S6d.1 to S6d.9 done. `size:exception` (about 1,574 hand-authored changed lines against a ~400 forecast; no pre-declared fallback split).

### RED
- `src/tools/apply-change-facts.spec.ts` gained a self-contained extraction block (8 cases) over a compact registry that lists two Videos, one carrying a nested Scene and Layer. First run failed 7/7 for real reasons: `parseChangeset` rejected the op ("Invalid changeset op: extract_instance"), no placement was computed and nothing was written.
- `tests/changelog/fold.test.ts` gained 4 cases; `tests/changelog/drift.test.ts` gained 3. The fold cases are the S6d.3 pair: the rekey must move units, element origins and history of the extracted slugs only, leave the rest of the source, and stay out of the identity chain.
- `test/provenance-strict.test.ts` gained 2 cases and failed with `MODEL_WITHOUT_RECORD: innteresante/intro`: an extracted instance had no creation record, so strict replay refused to check it.
- `tests/changeset/template.test.ts` gained 3 cases; the op select did not carry `extract_instance`.

### GREEN
- **Subtree cut** (`core/mutate.ts`): `subtreeOf(model, slug, concept?)` reads the element plus every descendant found by `parentSlug`, transitively and across concepts, root first; `extract_instance` (a real mutation handler, so strict replay uses the same code) removes exactly that set and returns it as `MutationResult.extracted`. Field values, prose and citation fields are the parsed nodes, so nothing is re-recorded.
- **Skeleton seeding** (`core/scaffold/knowledge.ts`): `seedExtractedModel(model, subtree)` replaces the skeleton's placeholder list for each concept the subtree holds and keeps the placeholders of the concepts it does not. Apply and its replay call it, so the file is identical by construction.
- **Changeset plumbing**: `extract_instance` joins `CHANGE_OPS`; `extractInstanceProblems` rejects an address that is not `<compact-id>@<slug>`, a non-hierarchical `to`, a missing blueprint and any element payload. `extracted_slugs` is a new execution fact (`EXECUTION_FACT_KEYS`), so it is an annotation line, is excluded from `proposal_sha`, and the immutability check now derives its annotation regex from that same list instead of a hand-kept one.
- **Apply**: an extraction plan runs in Phase 1 with every check before any write — `EXTRACT_INVALID_TARGET`, `MODEL_NOT_FOUND`, `EXTRACT_REQUIRES_COMPACT`, `EXTRACT_ELEMENT_NOT_FOUND` (lists the slugs the source holds), `BLUEPRINT_UNRESOLVED`, `EXTRACT_NOT_DISTRIBUTED` (names the concept and the distributed ones), `EXTRACT_SLUG_MISMATCH`, `CONTAINER_MISSING`, and a conflict (`MODEL_EXISTS` or `EXTRACT_DESTINATION_OCCUPIED`) that also blocks every other extraction of the same source with `DEPENDS_ON_CONFLICTED_CHANGE` (A-14). Phase 1 cuts, scaffolds, seeds and registers the new entry as `created`; Phase 2 writes it through the existing atomic persist and folder cleanup. The source is bumped once, the extracted models record `result_version` only.
- **Fold**: `Rekey` gained `slugs` and `kind`; `rekeyKey` takes an optional slug set and moves only those elements, keeping each slug (so `InnteresanteVideos@00-gancho` becomes `innteresante/intro@00-gancho`). `identities` and `successorOf` skip extraction rekeys: the source keeps its own id and never becomes a former id of the instance. `ChangeLog` exposes `rekeys`.
- **Drift**: a rekey destination counts as touched, so an extracted instance is checked like any other model (this is what makes a hand edit after an extraction visible in fold mode too).
- **Strict replay**: `creationOf` accepts `extract_instance` as a recorded creation; `replayTo` replays the source up to the cut (exclusive log index), lifts the subtree into the same skeleton, then replays the new-id changes. The log now also projects `blueprint_name`, `blueprint_url` and `knowledge_version`, so a creation is replayable without reading the file.
- **Surface**: `changes` bluepriNNt `V_0-7-0` (edited in place, not bumped again) declares the op with the field descriptions it uses; `propose_changeset` validates the payload; a direct `apply_change` refuses the op with `EXTRACT_INSTANCE_REQUIRES_CHANGESET`.

### Evidence (mutation)
- **Mutation 1 (subtree depth)**: dropping the `parentSlug` queue push in `subtreeOf` turned "subtreeOf returns the root, its Scene and its Layer" and "removes exactly the selected subtree" red (only `intro` and `00-gancho` came back); restored, 23 pass in `tests/mutate.test.ts`.
- **Mutation 2 (fold rekey)**: setting the rekey slug set to `undefined` in the fold turned the two new fold cases red (`log.units('innteresante/intro')` empty); restored, 19 pass.
- **Mutation 3 (group propagation)**: skipping the `DEPENDS_ON_CONFLICTED_CHANGE` loop let the sibling extraction apply, so the changeset ended `partially_applied` with `success: true`; restored, 44 pass in `apply-change-facts.spec.ts`.
- **Mutation 4 (replay seeding)**: disabling `seedExtractedModel` in `replayTo` turned the strict case red with `EDITED_WITHOUT_RECORD: innteresante/intro`; restored, 10 pass.
- The `tests/mutate.test.ts` cases were written after the cut existed (the apply work unit already needed it), so they were proven by mutation 1 rather than by a first red run.

### Deviations
1. **The extraction records its slug set as an execution fact.** Design A11 says the fold rekeys "the extracted slug set", but a sealed change cannot carry data that is only knowable at apply time. `extracted_slugs` is written by apply, excluded from the seal, and read back by the fold; it is the only new change property.
2. **`EXTRACT_SLUG_MISMATCH` is a new code.** The instance slug IS the id's last segment (`INSTANCE_SLUG_MISMATCH`), so extracting `intro` into `innteresante/welcome` would immediately produce an invalid instance. The task named no code; this one names the rule.
3. **`EXTRACT_DESTINATION_OCCUPIED` is a new code**, mirroring `MOVE_DESTINATION_OCCUPIED`: an existing destination folder is a conflict, not a silent write into a foreign folder. `add_model` has no such check because it writes into an existing container folder by design.
4. **The destination concept comes from the source element, not from `concept::`.** A-15 makes `concept::` explicit-only for `add_model`; for an extraction the element already IS an instance of its concept, so the payload carries no `concept` and the engine reads it from the cut. A `concept` on the change, if present, only scopes the lookup.
5. **The source of the migration is found by its path-derived compact id.** `add_model` writes `<id>_<blueprint>_NN.md`, so a model created that way is discovered as `<id>_<blueprint>`; a hand-authored registry (`X_NN.md`) is discovered as `X`. This is the existing S2b/S3a id rule, not a new one, and the tests name the id they actually have.
6. **The `replayTo` refactor replaced `replayModel`.** The extraction forced one replay function with an exclusive log index and a recursive source replay; keeping both would have duplicated 60 lines. `checkDomainProvenance` now calls `replayTo`.
7. **`propose_changeset`'s new validation branch has no dedicated case.** It mirrors `extractInstanceProblems`, which the apply tests exercise; the propose path itself is covered only by the existing suite staying green.
8. **`mcp-tests/apply-change-models.test.ts` was not edited** (same as S6a): the compact cases are unchanged and still pass, and the instance cases live in `apply-change-facts.spec.ts`, which the task names as the first failing test.

### Gate (S6d verification)
- nn-core `tsc --noEmit`: exit 0. nn-core `vitest run` full: 214 files, 2428 passed.
- nn-mcp typecheck (throwaway `tsconfig.tmp.json`, against a built worktree core): exit 0. nn-mcp `vitest run` full: 63 files, 729 passed.
- `node --test scripts/build-core-mirrors.test.mjs`: 1 pass, 0 fail. `node scripts/generate-canonical-registry.mjs` and `node scripts/build-console-payload.mjs` regenerated their mirrors; no hand-edited hash.
- `node scripts/verify.js --fast`: exit 0 (205 steps).

---

## S7a - `video-script` V_0-15-0 and video engine (PR 17, branch `ds/s7a`, targets `ds/s6d`)

Status: S7a.1 to S7a.11 done; S7a.12 at PR open.

### RED
- `tests/video-script-storage.test.ts` (NEW, 13 cases) failed 9: the shipped `video-script` declared no `storage`, so `Series`/`Video` read compact, every placement case classified as a registry or a compact model, and the version pin was `V_0-14-2` against `iNNfo_V_0-5-0`.
- `tests/canonical-registry.test.ts` gained one describe (1 case); `findCanonicalBlueprint('iNNfo_V_0-7-0_NN')` returned null. A second case for `video-script_V_0-15-0` was written, failed, and then removed: the registry is the Core-only offline fallback (see Deviations 1).
- Engine: `build-script-from-draft`, `series-root`, `series-scope` and `folder-contract-crosscheck` failed 9 of 42 (old stem shape, `_scope_NN.md` detection, no declared-placement cross-check).
- `test/video-script-contract-additions.test.mjs` and `scripts/verify-inventory.test.js` went red on the version and inventory gates as the blueprint and the registry moved (see Deviations 4 and 5).

### GREEN
- **Blueprint**: `video-script` `V_0-15-0`, pin `iNNfo_V_0-7-0`; `Series` = `storage:: distributed` + `placement:: "series/{slug}/"`; `Video` = `storage:: distributed` + `container:: Series` + `placement:: "{container}/assets/{slug}/"`; `Scene`, `Layer`, `Preset`, `Video Defaults` stay compact. The Structure and guidance sections say the Series instance model IS the series scope document (`scope: true`), that a Video instance lives at `series/<s>/assets/<slug>/<slug>_video-script_NN.md`, and that a Scene or Layer is an element of that model, never a model. Defaults repin to `video-script_V_0-15-0`.
- **Engine**: `scriptFilename(videoSlug)` writes `<slug>_video-script_NN.md`; `seriesDocumentFile` recognises a Series instance model by frontmatter `scope: true` among the folder's `_video-script_NN.md` documents (never by the retired `_scope_NN` name); `finalize-video` lists `_video-script_NN.md`; the draft console writes the same name; `folder-contract.md`, `parameters.md` (regenerated) and `series-template-convention.md` follow.
- **Cross-check**: `folder-contract-crosscheck.test.mjs` reads the declared `placement::` templates from the blueprint and asserts that `folder-contract.md` and `SKILL.md` name the same `series/<s>/` and `series/<s>/assets/<slug>/` folders and the same two instance files.
- **Registry**: a second `innfo` anchor embeds `iNNfo_V_0-7-0` byte-for-byte (`INNFO_V_0_7_0_SPEC_CONTENT`, a `MAP` line in `generate-canonical-registry.mjs`); `V_0-5-0` still resolves to `V_0-5-0` and a bare `innfo` still resolves to it.
- **Scope regression**: `resolve-effective.spec.ts` adds an episode whose `fps` resolves from `<s>_video-script_NN.md` and whose winner is that document.
- **Delta**: `video-folder-contract` gains a MODIFIED "Canonical Domain, Series And Episode Layout" with the instance-model names and a same-slug-two-series scenario (A-7).
- **Skill**: `nn-video-script` `version:` bumped once, `V_0-15-7` -> `V_0-15-8`.

### Evidence (mutation)
- **Mutation 1 (declaration)**: removing `storage::`/`container::`/`placement::` from `Video` turned 7 of the 13 storage cases red (declaration, clean placement, mismatch, double storage, Scene addressing, two Scenes, second Video); restored, 13 pass.
- **Mutation 2 (changes pin)**: setting `nature.structure: catalog` in the `changes` blueprint turned "keeps nature: members/derived and declares no storage" red; restored, 13 pass. That case passed at intake, so the mutation is its proof of bite.
- **Mutation 3 (skew)**: raising the skew threshold to `byVersion.size < 3` turned the V_0-14-1 case red; restored, 13 pass.
- **Mutation 4 (scope)**: making `probeDir` require `scope === 'yes'` turned 22 of the 57 resolve-effective cases red, including the new `fps` one; restored and rebuilt, 57 pass.

### Deviations
1. **`video-script_V_0-15-0` is NOT embedded in the canonical registry.** The registry is the Core-only offline fallback: `scripts/verify-inventory.test.js` pins it to the L0/L1 specs plus exactly the seven Core bluepriNNts, and embedding the blueprint also drags a retired name (`innfo-core`, inside the published blueprint prose) into a file `test/no-retired-references.test.mjs` does not allowlist. A `video-script` model still resolves its blueprint offline from the shipped package; the L1 anchor was the pending item.
2. **`verify-inventory.test.js` now expects two `innfo` anchors** (V_0-5-0 and V_0-7-0) and the new `INNFO_V_0_7_0_SPEC_CONTENT` const. The green set is unchanged.
3. **`test/video-script-contract-additions.test.mjs` pins the new versions** (`V_0-15-0` for the blueprint and its defaults). It is a gate that tracks the shipped blueprint, so it moves with it.
4. **A deeper folder scope inside the episode folder is no longer expressible.** The episode script and a folder scope in the same folder would share `<slug>_video-script_NN.md`, so `series-scope.test.mjs` now puts the deeper scope in the intermediate `assets/` folder (the shape `series-root.test.mjs` already exercises). The cascade is unchanged.
5. **Two fixtures gained `scope: true`.** A Series instance model IS the scope document, so `render-thumbnail-series.test.mjs` and the new file-based `loadSeriesDocument` case in `build-script-from-draft.test.mjs` declare the flag; without it they are a plain model and anchor nothing.
6. **`parameters.md` is generated.** The Series line lives in `scripts/generate-video-parameters-doc.mjs`, not in the output; the file was regenerated rather than hand-edited.
7. **The mechanical rename is in the engine commit.** Twelve test fixtures renamed `<s>_scope_NN.md` -> `<s>_video-script_NN.md` and `<slug>_video-script_<s>_NN.md` -> `<slug>_video-script_NN.md` (45 lines); keeping them apart would have left the suite red between commits.

### Line counts (`git diff --numstat ds/s6d..HEAD`, before this tracking commit)
- Hand-authored: the new core test 224, spec 49, `build-script-from-draft.mjs` 42, `folder-contract-crosscheck` 33, `build-script-from-draft.test.mjs` 27, `canonical-registry.test.ts` 32, `resolve-effective.spec.ts` 19, registry entry 17, SKILL 18, delta spec 40, and 63 across the remaining scripts, references and tests = about 576 changed lines, of which 45 are mechanical fixture renames.
- Generated, excluded: `catalog.json` 4, `parameters.md` 2, the embedded L1 literal 1.
- Forecast ~400: `size:exception`. The overrun is the shipped-blueprint integration test (the whole point of the slice) and the delta requirement.

### Gate (S7a verification)
- nn-core `tsc --noEmit`: exit 0. nn-core `vitest run` full: 215 files, 2442 passed.
- nn-mcp typecheck (throwaway `tsconfig.tmp.json`, against a rebuilt worktree core): exit 0. nn-mcp `vitest run` full: 63 files, 730 passed.
- `node --test "test/*.test.mjs"` in `nn-video-script`: 411 passed, 0 failed.
- `node --test scripts/guard-template-immutability.test.js`: 1 pass. `node scripts/sync-versions.mjs --check`, `node scripts/blueprint-catalog.mjs --check`, `node scripts/generate-canonical-registry.mjs --check`, `node scripts/generate-video-parameters-doc.mjs` fresh, `node scripts/check-spec-version.mjs --check-urls`, `node scripts/check-openspec-deltas.mjs`: all green.
- `node scripts/verify.js --fast`: exit 0. `node scripts/verify.js` full: exit 0.

---

