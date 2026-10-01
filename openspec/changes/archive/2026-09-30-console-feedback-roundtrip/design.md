# Design: Console feedback round-trip

## Technical Approach

The payload and the ledger are pure code in `innfo-core` (`src/console/`, `src/feedback/`), with no filesystem, network or MCP access. There are three adapters:

- **MCP tools** in `innfo-mcp`, backed by fs.
- **The CLI**, which loads an esbuild-generated CJS mirror of `src/console/index.ts`.
- **The bundle**, which only consumes the payload.

`InnfoConsole` (`console/innfo-runtime.js`, concatenated into the bundle) owns the whole reviewer side: drafts, feedback UI injection, and a schema-conformant export. Verdicts live only in an append-only ledger that the reconcile procedure writes through MCP.

Verified facts that shaped the design:
- The normalized heading `### fb-001 (correction, pending)` slugs to `fb-001-correction-pending` (`slugifyHeading`, `sourceRef.ts:269`), so a `#fb-001` citation can never resolve.
- The pure per-citation logic in `resolve-sources.ts:179-386` depends only on `SourceResolver` (an innfo-core type) and innfo-core helpers.
- `export-console.mjs` must stay standalone (living spec `console-export-slots-and-standalone-pin`).
- `.cogNNitive/` is gitignored.
- Two repo scripts already bundle innfo-core source into committed CJS mirrors with `--check` drift guards: `build-trannsform-slug-mirror.mjs` and `build-preflight-primitives.mjs`.

## Architecture Decisions

| # | Decision | Choice | Rejected (tradeoff) |
|---|---|---|---|
| D1 | Stable model id | `meta.modelId` = domain-relative POSIX path minus `_NN.md`/`.md` (e.g. `kNNowledge/biz/Ghostbusters`). This is the same addressing `findKnowledgeFile` accepts. Moving the file makes it a new model. | Frontmatter `id` (needs a new L1 spec version plus authoring effort for every document). Bare stem (collides across folders). |
| D2 | Element id | `slugify(concept + ' ' + name)` via `uniqueSlugify` in document order, so a duplicate gets `-1`. It matches the procedure's current scheme, and a rename counts as "target changed". | Name-only (CLI today; collides across concepts). Authored `slug::` (YAGNI). |
| D3 | Orphaning | Procedure-built consoles keep their ids. Old CLI exports were `console-review-v1`, which `nn-trannsform` already rejects, so none are reconcilable. The documented action is to re-export. Reconcile still falls back from `element_id` to `concept`+`element` and flags an item `orphaned` when nothing matches. | A migration shim (no consumer; maintainer prefers deletion). |
| D4 | Hashes | `meta.sha256` = `computeSha256(raw content)` (`validator/crypto.ts`, portable). Each element carries `hash` = the first 16 hex chars of the sha256 of the canonical JSON of `{concept, name, description, fields, markers}` with sorted keys. | node `crypto` (not browser-safe). Full-length element hash (payload bloat). |
| D5 | Builder home / citations | Hybrid. The pure `resolveCitation` + `classifyOrigin` + excerpt logic moves to `innfo-core/src/console/citations.ts`. `buildConsolePayload` takes an injected `SourceResolver`. `resolve-sources.ts` keeps file lookup and field selection and imports the moved code. | Move all of `resolveSources` (it pulls MCP fs helpers). Inject a whole citation callback (the CLI would need its own copy, which breaks parity). |
| D6 | CLI import | `scripts/build-console-payload.mjs` bundles `innfo-core/src/console/index.ts` into `console/console-payload.generated.cjs` (esbuild, neutral, cjs, node20). `verify.js` runs `--check`. The CLI `require`s it from the resolved `consoleDir`, the same folder as the shell and bundle. It ships as a new `console_assets` entry. | Import `dist` (can go stale, and needs `node_modules` at the install site). Put it under `scripts/` (would need a `publish-web` `DISTRIBUTION_PATHS` edit, which conflicts with `harden-publish-web`). |
| D7 | Ledger location | `<domain>/feedback-ledger.jsonl`: one committed file at the domain root, one JSON object per LF-terminated line. | `.cogNNitive/` (gitignored, so verdicts are lost). `sources/import/feedback/` (the scanned drop zone; spec forbids it). Per-model sidecar (DOCX feedback spans models). |
| D8 | Ledger semantics | Append-only (`appendFile`). The key is `source.sha256#item`. The newest entry wins. Appending `pending` reopens an item. `stale` is appended when the item's `base_hash` differs from the current element hash. `applied` over `stale` requires `confirm_stale: true`. | Rewriting the feedback JSON (breaks immutability and `#fb-NNN` citations). |
| D9 | Triage | `layer` (`scope`\|`data`\|`domain`\|`anomaly`, mapping to the 4 layers in `reconcile_artifact_feedback`) and `severity` (`low`\|`medium`\|`high`) live on ledger entries only. | Adding them to `feedback.schema.json` (reconcile cannot write sources, so reviewer files would have to carry them). |
| D10 | Schema | Keep `source_knowledge*`. Delete the aliases `knowledge`, `knowledge_version` and `session_label`. Item `status` leaves `required` and `properties` (the ledger owns verdicts). Add optional item `base_hash`. `$id` is left to the rename change. | Keep the aliases (no compat wanted). Keep item `status` (two sources of truth). |
| D11 | Normalized feedback | `nn-trannsform` emits `### fb-001` plus a `- **Kind**:` bullet, with no status, so `#fb-001` resolves. The validator is aligned with the schema. | Keep the status in the heading (the anchor is broken and would drift). |
| D12 | Validator alignment | Keep the two hand-written validators (bundle UMD and `nn-trannsform` CJS). Both are tested against one labeled corpus in `test/fixtures/feedback/{valid,invalid}/`. | Generate one validator (a UMD concatenated bundle cannot import it). |
| D13 | UI owner | `InnfoConsole` owns it: it holds drafts, export and config, and boots on `#innfo-config`. `feedback.isEnabled(doc)` reads `needs[]` straight from the DOM, so boot order does not matter. `InnfoModelViewer` only passes `suggest: true` to change 2's `ElementCard`, which renders `[data-innfo-suggest]`. A single delegated listener handles it. | Model viewer owns it (duplicates the draft store). |
| D14 | Injection | `ensureFeedbackUi(doc)` creates one `[data-innfo-feedback-root]` with `#innfo-feedback-banner`, `-open` and `-modal`, styled with change-2 tokens. It is idempotent because the shell's three script tags can boot the bundle more than once. The old `#innfo-banner`/`#innfo-export-*` markup and CSS are deleted from `artifact_shell.html` and `timeline.html`. The new ids avoid clashing with the procedure stepper's own `#innfo-export-modal` (bundle :4440). | Adopting existing anchors (keeps the anchor contract alive). |
| D15 | Export | The modal builds meta (`source_knowledge` = `modelId`, plus `source_sha256`). `draftToItem` maps drafts to `target{element_id, concept, element, field?}`, `comment` and `base_hash`. `buildExportDoc` → `validateFeedback` → download. On errors the modal lists them and does not download. `buildReviewDoc`, `validateReviewDoc` and `REVIEW_FILENAME_PATTERN` are deleted. | — |
| D16 | Procedures | `workspace/procedures/reconcile_console_feedback_NN.md` sits next to `reconcile_artifact_feedback` (console vs artifact, so the name is unambiguous). Its regenerate step branches: metrics runs `create_timeline`; everything else runs `compile_model_console`. The Staleness Report is shared. Both `apply_feedback_NN.md` files are deleted. | A generic `reconcile_feedback` (ambiguous next to the artifact procedure). A per-blueprint registry key (YAGNI with two cases). |
| D17 | MCP tools | `build_console_payload` (read-only; returns `<`-escaped slot strings). `feedback_items_status` (read-only; effective status, `target_changed`, `orphaned`). `record_feedback_verdict` (append-only). | Agents editing the JSONL by hand (they would rewrite it). |

## Data Flow

```
knowledge.md ─┬─ MCP build_console_payload ─┐ (SourceResolver, schema, ledger→feedbackState)
              └─ CLI (generated cjs) ───────┴→ buildConsolePayload → slots → shell HTML
console (InnfoConsole) → drafts{base_hash} → export JSON (validated) → sources/import/feedback/
reconcile_console_feedback → feedback_items_status → apply_change → record_feedback_verdict
   → feedback-ledger.jsonl (append) → regenerate console (meta.feedbackState)
```

## Interfaces / Contracts

```ts
// innfo-core/src/console/payload.ts
buildConsolePayload(i: { content: string; modelPath: string; schema?: ResolvedBlueprintSchema;
  sourceResolver?: SourceResolver; ledger?: LedgerEntry[]; now: string }):
  { schema: ConsoleSchemaSlot; model: { meta: ConsoleMeta; elements: ConsoleElement[]; matrices: ConsoleMatrix[] } }
ConsoleMeta = { modelId; title; template?; modelVersion; sha256; generated; citationsResolvedAt?;
  feedbackState: { id; source; element_id; status: 'pending'|'applied'|'rejected'|'stale'; version }[] }
ConsoleElement = { id; hash; concept; name; description; fields; markers: Record<string,string|number>;
  relations: { field; target; targetLabel }[]; citations?: Record<string, ResolvedCitation[]> }
// innfo-core/src/feedback/ledger.ts
LedgerEntry = { v: 1; at; source: { kind: 'console-json'|'docx'; path; sha256 }; item; model_id;
  model_version; status; target_hash?; layer?; severity?; by; note? }
parseLedger(text) → { entries; errors: { line; message }[] }; serializeLedgerEntry(e) → string
effectiveVerdicts(entries) → Map<string, LedgerEntry>; feedbackStateFor(entries, modelId)
```

New relative imports carry `.js`.

## File Changes (by slice)

| Slice | Files |
|---|---|
| 1 | `console/feedback.schema.json`; `console/innfo-runtime.js` (export path) + regenerated bundle; `skills/nn-trannsform/scripts/lib/scanner-converters.js` + `SKILL.md`; `innfo-core/src/feedback/ledger.ts`; `test/fixtures/feedback/**`; replace `test/console-review.test.mjs`; `docs/innfo/documentation/{reviewer-guide,templates}.md` |
| 2 | `innfo-core/src/console/{payload,citations,index}.ts`; `innfo-mcp/src/tools/{resolve-sources,build-console-payload}.ts`, `server.ts`; `scripts/build-console-payload.mjs` + `verify.js` step; `console/console-payload.generated.cjs`; `scripts/export-console.mjs`; `workspace/procedures/compile_model_console_NN.md` (thin); `manifest/source.yaml` (`innfo-console-payload` asset) |
| 3 | `innfo-runtime.js` (`ensureFeedbackUi`, delegated suggest), `render-model-viewer.js`, bundle; `artifact_shell.html`, `metrics/assets/timeline.html` (anchors removed); `needs-registry.json` (`feedback-export: []`); change-1 guard exception + `legacy:console/*` marker + `legacy-ledger.yaml` entry deleted; `procedures/assets/procedure_console.html` drops the undelivered `feedback-export` |
| 4 | `workspace/procedures/reconcile_console_feedback_NN.md`; delete `{business,metrics}/procedures/apply_feedback_NN.md`; `metrics/procedures/create_timeline_NN.md`; `innfo-mcp` ledger tools; `innfo-core/tests/metrics-console-feedback.test.ts`; regenerate `canonical-registry.ts` and `innfo-mcp.bundle.js`; version bumps |

## Testing Strategy (strict TDD, expected values from literals)

| Layer | What | Approach |
|---|---|---|
| Unit (Vitest core) | Id `problems-paranormal-infestation` and duplicate `-1`; `modelId` literal; `modelId` identical across a `knowledge_version` bump while `sha256` differs; element hash stable on a version-only edit and changed on a field edit; wikilink relations; no resolver → no citations | Literal fixtures |
| Unit | Ledger: latest wins, reopen, stale-confirm refusal, parse errors carry the line, serialized line equals a literal | Pure strings |
| Regression | Existing `resolve-sources.spec.ts` passes unchanged after the extraction | Unchanged suite is the guard |
| Integration | Golden: CLI slot deep-equals the `build_console_payload` slot on a fixture domain (minus `generated`); an MCP-built console reports `fresh` in the CLI | Temp fixture domain |
| Integration | `record_feedback_verdict`: the first N lines stay byte-identical; feedback file hashes are unchanged | Temp dir |
| DOM (`@vitest-environment jsdom`) | Unchanged `model_console` markup plus boot ×2 gives exactly one root; the export passes `validateFeedback` and has `target.field`; invalid meta leads to no `createObjectURL` call (stub proven red) | jsdom, not happy-dom |
| Parity | Both validators agree with the labeled corpus; `#fb-001` resolves through `resolveHeadingSection` on normalized output | Node + Vitest |
| Drift | `build-console-payload --check` exits 1 against a stale `--out` | Script test |

## Migration / Rollout

One batch to `main` after slice 4, following `nn-dev-release`:
1. Bump `innfo-mcp/package.json` by a minor version, then run `sync-versions.mjs` (propagates innfo-core and the manifest; the tag `innfo-mcp-v*` is derived).
2. Rebuild innfo-core, then the MCP bundle.
3. Bump the `console_assets` versions (next minor after change 2), run `build-console-bundle.mjs`, and create the `innfo-console-v*` tag.
4. Bump `blueprint_version` for business, metrics and procedures, bump `channels.stable.refs` blueprints (from `0.19.1`, after changes 1–2), run `generate-canonical-registry.mjs`, and create the `blueprints-v*` tag.
5. Bump the `nn-trannsform` version and the skills channel (from `2.8.1`), and create the `skills-v*` tag.
6. Gate on `verify.js`, `check-integrity.js`, `sync-versions --check`, and a detached-worktree `--release` rehearsal.

The ledger is new and additive. Any existing non-conformant exports have to be re-exported.

## Open Questions

- [ ] Does editing or adding files under `workspace/` (whose spec is frozen) require any version bump or guard entry? Verify this in tasks before slice 2.
- [ ] Spec reconciliation: the procedure name `reconcile_console_feedback`, both slots being filled (not only `innfo-model`), `status` being dropped from items, and triage living in the ledger.
- [ ] Confirm dropping the `feedback-export` need from `procedure_console.html`.
