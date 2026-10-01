# Design: Console feedback round-trip completion

Change A of 3 (this -> `2026-10-01-console-ui-kit` -> `2026-10-01-console-review-ux`). It rebases `archive/2026-09-30-console-feedback-roundtrip/design.md` onto HEAD `fc925f8a`. Paths: `CONSOLE` = `iNNfo/specs/bluepriNNts/console`, `CORE` = `iNNfo/packages/innfo-core`, `MCP` = `iNNfo/packages/innfo-mcp`, `BP` = `iNNfo/specs/bluepriNNts`.

## Technical Approach

Pure core, thin adapters (unchanged from the archive). `CORE/src/console/` owns the payload, citations, ledger rules and slot serialization. There are three adapters. The MCP tools inject the workspace resolver. The CLI loads the esbuild CJS mirror and injects an fs resolver. The bundle only consumes payloads and emits schema-conformant exports. Verdicts reach `<domaiNN>/feedback-ledger.jsonl` only through MCP tools.

Facts verified at HEAD that change the archived plan:
- **Both runtimes need array schema slots.** `render-model-viewer.js:117` and `innfo-runtime.js:2634` read `schema.concepts` as an array, and the viewer reads `mx.rows`/`mx.cols` (:381). The builder emits `concepts: {}` and matrices without `rows`/`cols`, so a builder payload fails silently in `model_console.html`.
- **The CLI does not escape `<`.** `export-console.mjs:315` `injectSlots` writes `JSON.stringify` without escaping `<`. Once citations carry excerpts, a `</script>` inside one breaks the page. The procedure prose already requires escaping `<`.
- **The citation map only has the viewer as a consumer.** It reads `el.citations[field]` (`render-model-viewer.js:305-341`). InnfoConsole's `renderElementPill(…, citations[])` (:804) has no production caller.
- **Schema-typed citation fields need the schema.** `precio_source` resolves only through `findDeclaredField(schema)` (`resolve-sources.ts:156`). The builder only knows `SOURCE_FIELD_NAMES` (`sources`, `source`).
- **The procedure and the CLI write to different paths.** The procedure writes `export/<Model>_V_<version>_console/`, while CLI `--status` reads `export/<stem>_console/` (:238). So procedure consoles are never `fresh`.
- **Reconcile records verdicts before validating.** Its step 5 ledgers verdicts before step 6 validates. Applying an item also changes the element hash, so a staleness check made at record time would flag every applied item.
- **The CDN script tags point at a dead path.** All shells load `…/iNNfo/specs/templates/console/…`, and that directory no longer exists. Only the vendored `./innfo-console.bundle.js` executes today.
- **The release targets are free.** The latest tags are `innfo-console-v0.6.0`, `innfo-mcp-v0.12.0`, `blueprints-v0.19.1` and `skills-v2.8.1` (`.git/refs/tags`). None of 0.7.0, 0.13.0, 0.20.0 or 2.9.0 exists yet.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| A1 | Citation shape | Per-field map `el.citations: {field: ResolvedCitation[]}` (entries without `field`) plus `meta.citationsResolvedAt` (= `meta.generated`). A core `groupCitationsByField` does the grouping. Consumer plan: the viewer is unchanged; `renderElementPill` takes the map (only tests call it); B's `CitationIcon` consumes the map; the MCP `resolve_sources` tool API keeps its flat array. | Builder array (the viewer would need a converter; violates living spec `console-field-citations`). |
| A2 | Citation logic home | Delete `resolve-sources.ts:179-386`. Import `resolveCitation`/`capExcerpt`/… from core and re-export `EXCERPT_CHAR_CAP` so `resolve-sources.spec.ts` passes unchanged. Field selection: name-based fields plus schema `type:: citation`, in core (`citationFieldsFor(concept, fields, schema?)`). | Keep the MCP copies (two implementations drift). |
| A3 | Resolver injection | Move the lookup algorithm of `createWorkspaceSourceResolver` (ancestor `sources/` walk, containment) into `CORE/src/console/fs-source-resolver.ts` as `createFsSourceResolver(rootDir)`. It lives in the node entry `index.ts`; `browser.ts` excludes `console/`, and `node:crypto` is the precedent. The MCP wrapper adds only the miss-time `suggestions`. The CLI gets it through the mirror. | A CLI-local resolver (a second lookup that could silently diverge). Core with injected IO (needs pure Windows path math, larger change). |
| A4 | Schema input | The builder takes `schema?: BlueprintSchema` and emits array slots through `buildConsoleSchemaSlot` (the procedure's Schema JSON Contract). With no schema, concepts are derived from elements. The MCP tool resolves via `resolveBlueprintWithCache`. The CLI resolves only the workspace-hydrated blueprint (Tier 1 `specs/bluepriNNts/<base>/<version>/`), else derives and prints a stderr `WARNING` naming `parent_spec`. Gate 0.3 decides the Tier-1 + includes port. | CLI runs the full 4-tier/network resolver (not standalone). Schema left out of the parity contract (`precio_source` would diverge). |
| A5 | Procedure payload source | A new MCP tool `build_console_payload` returns `{schemaSlot, modelSlot, outputPath, schemaSource, warnings}`. The slots are strings from `serializeConsoleSlot` (`JSON.stringify(v,null,2)` with `<` → `<`), and the CLI uses the same serializer. The procedure pastes them verbatim into `model_console.html` at `outputPath` = `export/<stem>_console/<stem>_console.html`. Byte-equality applies to the slots, not the HTML: the shells differ by design. | The procedure runs the mirror (agents cannot `require`, and there is no resolver/ledger IO). A tool that writes the HTML (MCP would need shell distribution). |
| A6 | Element ids/hash | Keep the as-built scheme (`slugify(concept+' '+name)`, `-1` suffix; 16-hex canonical hash). `computeSha256` switches to the portable `validator/crypto.ts`, leaving one implementation. The builder gains `relations` per element (`extractWikilinkTargets`, intra-model targets only), `meta.template` and matrix `rows`/`cols`. | Change the id scheme (churn; C accepts name-slug ids). |
| A7 | CLI failure | The mirror is required from `consoleDir` (repo fallback kept). A missing mirror or a load error means exit 1 naming the path. Delete `fallbackBuildPayload` (:85-142). | Keep the fallback (different ids/hashes; the silent bug the maintainer banned). |
| A8 | Mirror drift | `build-console-payload.mjs --check` builds to memory (`write:false`, `absWorkingDir: repoRoot` so esbuild path comments do not depend on cwd), compares bytes, and on mismatch exits 1 naming the file. It runs as `verify.js` step 7b-bis next to the slug-mirror check. | A CI-only check (local drift goes unseen). |
| A9 | Mirror distribution | New `console_assets` entry `innfo-console-payload` → `CONSOLE/console-payload.generated.cjs`, `ref_key: innfo-console`. | Under `scripts/` (needs `DISTRIBUTION_PATHS` edits; conflicts with harden-publish-web). |
| A10 | Ledger location/IO | `FEEDBACK_LEDGER_FILENAME = 'feedback-ledger.jsonl'` in core, joined to the root every tool already resolves (server root or `domain`/`root` arg). The CLI uses its `<workspaceRoot>`, with no upward walk and no other candidates. Writes are a single `appendFile(…, {flag:'a'})` of one validated LF line behind an in-process per-path promise queue. The tool refuses when the file's last byte is not `\n`. | Temp+rename (cross-process lost updates). Lockfile (stale-lock cleanup). |
| A11 | Ledger tools | `evaluate_feedback_items` evaluates staleness before apply and appends a `stale` entry for newly stale items (idempotent). `record_feedback_verdict` appends one verdict. It refuses `applied` while the effective status is `stale` unless `confirm_stale: true`, which is persisted on the entry. It refuses `applied` on orphaned items. The tool derives `source.sha256`, `model_id`, `model_version`, `element_id` and `target_hash` (= item `base_hash`). The agent supplies only `source_path`, `item`, `status`, `by` and optional triage. | Recompute staleness live at record time (post-apply content always reads as stale). A `dry_run` flag (mixes read/write semantics). |
| A12 | Stale rule | Pure `evaluateFeedbackItems`. `stale` = `base_hash ? base_hash !== currentHash : source_knowledge_version !== modelVersion`. `orphaned` = no element by `element_id`, nor by `concept`+`element` name. Latest-wins is unchanged (`source.sha256#item`); appending `pending` reopens. | Version-only staleness (as built; misses same-version edits). |
| A13 | Schema + validators | Drop item `status`. Forbid the aliases with `false` properties (the schema has `additionalProperties: true`): meta `knowledge`, `knowledge_version`, `session_label`, `source_model*`; item `status`, `layer`, `severity`, `target_hash`, `stale`, top-level `field`. Add item `base_hash` (`^[0-9a-f]{16}$`) and meta `source_sha256`. The three validators are checked against one corpus `test/fixtures/feedback/{valid,invalid}/`, with `ajv@^8` as an explicit root devDependency (only transitive today). `$id` is left to the rename change. | Generate one validator (the UMD bundle cannot import). |
| A14 | UI owner/injection | `InnfoConsole` owns it: it boots on `#innfo-config`, which every console has. `InnfoModelViewer` stays feedback-agnostic. `ensureFeedbackUi(doc)` reads `needs[]` from the DOM and, if absent, prepends one `[data-innfo-feedback-root]` with `#innfo-feedback-banner` (title, version, draft count, reviewer chip), `#innfo-feedback-open` and `#innfo-feedback-modal`. It adds one `<style data-innfo-feedback>`, binds with `data-innfo-bound`, and leaves the stepper's `#innfo-export-modal` (`render-procedure-stepper.js:1001`) alone. `autoBoot` sets `data-innfo-console-booted` on `<html>`, so a second bundle execution is a no-op. | Adopt the shell anchors (keeps the contract). The viewer owns it (two draft stores). |
| A15 | Export/status split | Done here, not in C: `draftToItem` → `target{element_id,concept,element,field?}`, `comment`, `base_hash`. `buildExportDoc` → `validateFeedback` → download; on errors, list them in `[data-innfo="errors"]` and do not download. Delete `buildReviewDoc`, `validateReviewDoc`, `serializeReviewDoc`, `buildReviewFilename`, `parseReviewFilename`, `REVIEW_FILENAME_PATTERN`, the status `<select>` (:2248) and `updateDraftStatus`/`updateStatus`. Drafts stop carrying `status`. C replaces the draft store and `window.prompt`. | Leave the select to C (it would edit a field the export no longer has). |
| A16 | CDN path | Shells re-pinned in this change also get `templates/console` → `bluepriNNts/console` in their CDN/raw tags (the same lines). Everything else is left to the rename change. | Leave a dead CDN path in a new release. |

## Data Flow

```
model.md ─┬ MCP build_console_payload (workspace resolver, BlueprintSchema, ledger) ─┐
          └ CLI export-console (mirror, fs resolver, Tier-1 schema, ledger) ────────┴→ buildConsolePayload
                → serializeConsoleSlot → shell slots (model_console | artifact_shell)
console → drafts{base_hash} → buildExportDoc → validateFeedback → sources/import/feedback/*.json
reconcile_feedback: validate → evaluate_feedback_items (stale/orphaned, appends stale) → triage
   → apply_change → validate_model (abort: no verdicts) → record_feedback_verdict
   → <domaiNN>/feedback-ledger.jsonl → patch bump → regenerate (meta.feedbackState)
```

## Interfaces / Contracts

```ts
// CORE/src/console (new relative imports carry .js)
buildConsolePayload(o: { content; path?; schema?: BlueprintSchema; resolver?: SourceResolver;
  ledgerEntries?: FeedbackVerdictEntry[]; generated? }): ConsolePayload
ConsolePayload = { schema: ConsoleSchemaSlot /* arrays */; model: { meta; elements; matrices /* +rows,cols */ } }
meta = { modelId; title; template?; modelVersion; sha256; generated; citationsResolvedAt?; feedbackState }
element = { id; concept; name; description; fields; markers; hash; relations: {field;target;targetLabel}[];
  citations?: Record<string, Omit<ResolvedCitation,'field'>[]> }
serializeConsoleSlot(v): string; buildConsoleSchemaSlot(s?: BlueprintSchema, elements): ConsoleSchemaSlot
createFsSourceResolver(rootDir): SourceResolver; FEEDBACK_LEDGER_FILENAME
FeedbackVerdictEntry += { confirm_stale?: true }; validateFeedbackVerdictEntry(e) → string[]
evaluateFeedbackItems({ feedback, sourceSha256, payload, entries }) →
  { item; element_id?; effective_status; base_hash?; current_hash?; stale; orphaned }[]
```

| MCP tool | Input | Effect |
|---|---|---|
| `build_console_payload` | `model`/`knowledge_id`, `domain?` | Read-only; returns slot strings |
| `evaluate_feedback_items` | `source_path`, `domain?` | Appends `stale` observations only |
| `record_feedback_verdict` | `source_path`, `item`, `status` (`applied`\|`rejected`\|`pending`), `by`, `confirm_stale?`, `layer?`, `severity?`, `note?` | Appends 1 line or refuses (file unchanged) |

Contracts consumed by B and C, guaranteed by A in **both** producer paths: `meta.modelId`, element `hash`, export item `base_hash` (= element `hash` at draft time, stored by `addDraft`), `meta.feedbackState[{id,source,element_id,status,version}]` with `status ∈ pending|applied|rejected|stale`, and the hooks `[data-innfo-feedback-root]`, `#innfo-feedback-{banner,open,modal}`, `[data-innfo="identifier|instructions|agent-prompt|download|errors|draft-count"]`, `.innfo-feedback-*` classes (B re-skins). Public API: `+ensureFeedbackUi, draftToItem`; removed as listed in A15.

## File Changes (by slice; chain A1→A2→A3→A4→A5→A6)

| Slice | Files | Est. lines |
|---|---|---|
| A1 | `CONSOLE/feedback.schema.json`; `innfo-runtime.js` (`validateFeedback`, `buildExportDoc` without `status`); `skills/nn-trannsform/scripts/lib/scanner-converters.js` (:336-414), `SKILL.md` (:205-207 → `reconcile_feedback`); `test/fixtures/feedback/**`, `test/feedback-validators-parity.test.mjs`; root `package.json` (`ajv`); `BP/metrics/samples/feedback/*.json` (drop alias/status) | ~350 |
| A2 | `CORE/src/console/{payload-builder,citations,feedback-ledger,slot,index}.ts`; core tests; `scripts/build-console-payload.mjs` (`--check`); `scripts/verify.js`; regenerated cjs | ~400 |
| A3 | `CORE/src/console/fs-source-resolver.ts`; `scripts/export-console.mjs` (delete fallback/candidates, add resolver, serializer, Tier-1 schema, loud errors); `manifest/source.yaml` (asset); standalone test | ~300 |
| A4 | `MCP/src/tools/{resolve-sources,validate}.ts` (dedup, wrapper), `build-console-payload.ts`, `server.ts`, `server.spec.ts` tool list; `BP/workspace/procedures/compile_model_console_NN.md` (thin; path; `model_version` bump); docs-facts regen; golden test | ~400 |
| A5 | `innfo-runtime.js` (A14/A15), bundle regen; `CONSOLE/artifact_shell.html`, `BP/metrics/assets/timeline.html` (delete `#innfo-banner`/`#innfo-export-*` markup + CSS, CDN path); `model_console.html` (CDN path); `needs-registry.json`; `scripts/lib/console-shell-guard.js` (delete :215-217) + test; `BP/metrics/scripts/verify.harness.js:516`; `test/console-review.test.mjs` (rewrite); `docs/innfo/documentation/{reviewer-guide,templates}.md` | ~400 |
| A6 | `MCP` ledger tools + `server.ts`; `BP/workspace/procedures/reconcile_feedback_NN.md` (path, order, tools; version bump); **delete** `BP/{business,metrics}/procedures/apply_feedback_NN.md` (333 lines); `BP/metrics/procedures/create_timeline_NN.md` (:123 prose, :145 link); `docs/innfo/documentation/lifecycle-walkthrough.md:136`; `docs/research/cognnitive-value-proposition.md` (:111, :202, :278, :420); `CORE/tests/metrics-console-feedback.test.ts` (:43, :110-112); release prep | ~350 + 333 pure deletion |

Kept (historical fixtures): `CORE/tests/{fixtures/simulacro-refactorizacion,legacy/fixtures}/**/apply_feedback_NN.md`. `canonical-registry.ts` and `innfo-mcp.bundle.js` have no `apply_feedback` hits today. Both are still regenerated for the version bumps. Not touched: `procedures/procedures/export/document_sop_console/*` (a frozen export sample that the guard skips).

## Testing Strategy (strict TDD; seams below; expected values are literals; every stub is proven red)

| Seam | RED test | Prove red by |
|---|---|---|
| Validators (A1) | The corpus agrees across ajv, `validateFeedback` and `validateFeedbackJson` (cases: alias, item `status`, top-level `field`, `kind: rewrite`, valid with `target.field` and `base_hash`) | Running on HEAD (status/alias accepted) |
| Normalizer (A1) | Output contains `### fb-001` and `- **Kind**: correction`; the slug-mirror heading slug equals `fb-001` | Restoring the old heading |
| Builder (A2) | Id `problems-paranormal-infestation` and a `-1` duplicate; `modelId` literal; hash stable on a version edit; relations; `rows`/`cols`; schema arrays; citation map incl. schema-typed field; `<` escaped | HEAD builder (array/no relations) |
| Ledger rules (A2) | Latest-wins, reopen, stale via base_hash and via version fallback, orphaned, `applied` over stale refused, entry validation | Pure literals |
| Mirror (A2) | `--check` exits 1 against a stale `--out` (real process) | Corrupting one byte |
| CLI (A3) | Missing mirror → exit≠0 naming the path, no file; root ledger read and `sources/import/feedback/ledger.jsonl` ignored; `el.citations.sources` present | Restoring the fallback |
| Golden (A4) | MCP `build_console_payload` slots === CLI-embedded slots (real process; `generated`/`citationsResolvedAt` normalized) on a temp fixture domaiNN with sources, a ledger and a Tier-1 blueprint; procedure console reports `fresh` in `--status` | CLI without the resolver |
| Dedup (A4) | `resolve-sources.spec.ts` unchanged and green; a grep test finds exactly one `function classifyOrigin` | — |
| DOM (A5, `@vitest-environment jsdom`) | Unchanged `model_console.html` + bundle evaluated ×2 → one root, one open button, `showModal` called once per click; seeded draft exports with `target.field` and `base_hash`; invalid meta → `createObjectURL` never called, errors listed; no `.innfo-review-status-select`; undeclared need → nothing injected; stepper modal coexists; viewer renders an icon from builder output | Removing the idempotency guard / validation gate |
| Guard (A5) | `model_console.html` passes; the guard source has no `model_console.html` literal | Re-adding anchors to the registry |
| Tools (A6) | N lines stay byte-identical after an append; invalid entry → file unchanged; stale refusal then `confirm_stale` success; feedback source hashes unchanged | Writing without the queue/validation |

Per slice: `npm run lint`, `npm run typecheck`, `npm run test`, `node scripts/verify.js`, `node scripts/check-integrity.js`. Rebuild innfo-core before MCP tests. Re-run preflight-adjacent suites with an empty `USERPROFILE`/`HOME`. Rebuild the bundle in every slice that touches `innfo-runtime.js` (B adds the bundle drift test).

## Migration / Rollout

No data migration. Old `console-review-v1` exports are not reconcilable and must be re-exported (sole user). Release order (tags only after `git push origin dev:main` as a merge commit):
1. Set `MCP/package.json` to `0.13.0`, then run `node scripts/sync-versions.mjs`. This propagates innfo-core and the manifest; also raise the nn-innfo `mcp.min_version` to `0.13.0`, because the procedures now require the new tools. Rebuild innfo-core, then `innfo-mcp.bundle.js`. Pages `build-docs.mjs` adds a **new** `docs/innfo/cdn/innfo-mcp-v0.13.0.bundle.js`; `innfo-mcp-v0.12.0.bundle.js` is never touched.
2. Bump all four `console_assets` to `0.7.0` **before** `build-console-bundle.mjs` (the header version comes from the manifest), regenerate the mirror, and re-pin the shells to `@innfo-console-v0.7.0`. Files at the `innfo-console-v0.6.0` tag are immutable.
3. Bump `blueprint_version` of business and metrics (procedure removed → minor). Bump the `model_version`/`knowledge_version` of the two edited workspace procedures. Set `channels.stable.refs` blueprints to `0.20.0`, then run `generate-canonical-registry.mjs`.
4. Bump `nn-trannsform` to `V_3-5-0` and skills to `2.9.0`.
5. Gates: `verify.js`, `check-integrity.js`, `sync-versions --check`, and a detached-worktree `--release` rehearsal. Then tag `innfo-mcp-v0.13.0`, `innfo-console-v0.7.0`, `blueprints-v0.20.0` and `skills-v2.9.0` on `origin/main`, and run `verify.js --release`.

Whether step 2 runs after A or once for the A+B+C batch is proposal question 3; the default is one batch.

## Departures from the archived design

D5 → A3 (the resolver algorithm also moves to core). D7 → the path is unchanged, but the root definition is concrete (A10). D8 → staleness is evaluated before apply (A11). D16 → `reconcile_feedback_NN.md` is kept. D17 → the read tool became `evaluate_feedback_items`. New items: array schema slot, the `<` serializer, `rows`/`cols`, the procedure output path, `ajv`, and the CDN path. Amendment am.1 (no `suggest`) is kept: model_console gains export in A, and draft creation arrives with C.

## Open Questions

- [ ] Gate 0.3 (before A3): can the Tier-1 blueprint lookup plus include chain move to core in ≤150 lines? If not, the CLI derives the schema with a WARNING. The golden fixture then has no `parent_spec`, and the `precio_source`-via-CLI scenario is deferred (needs a spec amendment).
- [ ] Spec amendments: `relations` is per element, not `model.relations` (both runtimes read `el.relations`). The stale-refusal scenario depends on `evaluate_feedback_items` running pre-apply (A11).
- [ ] Should the mirror stop importing the whole core barrel (311 KB)? Measure in A2 with an esbuild metafile.
- [ ] Batch the release with B and C (proposal question 3).
