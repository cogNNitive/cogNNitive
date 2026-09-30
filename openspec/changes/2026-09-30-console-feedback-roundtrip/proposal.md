# Proposal: Console feedback round-trip

Change 3 of 4 (`console-cleanup-and-lint` -> `console-design-tokens-and-ui-kit` -> **this** -> `console-review-ux`).

## Why

The reviewer loop (console -> feedback JSON -> apply -> regenerated console) is broken or ambiguous at every hop (code-checked 2026-09-30):

| # | Gap | Evidence |
|---|---|---|
| 0 | The live export is not schema-conformant | the modal calls `buildReviewDoc` (bundle :739-798, `$schema console-review-v1`): no `meta`, items carry `elementId`/`note`, `field` top-level (:780) instead of `target.field` (schema :104). `buildExportDoc` (:579) / `validateFeedback` (:599) are never called. Output fails `feedback.schema.json` and `nn-trannsform` ingestion; violates living spec `innfo-console-feedback` |
| 1 | The canonical console cannot export feedback | `workspace/assets/model_console.html:318` declares `feedback-export`, but the bundle wires the button only if `#innfo-export-open` exists (`innfo-console.bundle.js:2851-2857`); model_console has no anchor |
| 2 | Two payload builders disagree | CLI `scripts/export-console.mjs` hand-parses (`id` = element name, `matrices: []`, no relations/citations, emits `meta.sha256`); `compile_model_console_NN.md:61` uses `id` = slug(concept+name), full payload, no `sha256`. Feedback `target.element_id` depends on which one built the console |
| 3 | Procedure consoles are always "stale" | CLI staleness (`export-console.mjs:224-234`) needs `meta.sha256`; the procedure never emits it |
| 4 | Verdicts are never persisted | both `apply_feedback_NN.md` mark `applied`/`rejected` "in the working copy" (business :61, :73) |
| 5 | Duplicated procedures | `business/` and `metrics/procedures/apply_feedback_NN.md` differ mainly in wording + the regenerate step |
| 6 | Three names for one field | schema requires `source_knowledge*` and also defines alias `knowledge*`; `apply_feedback_NN.md:37` says `source_model*`; validators hand-copied in bundle (:607) and `nn-trannsform` (`scanner-converters.js:355`) |

## What Changes

- **Schema-conformant export**: the modal emits `feedback.schema.json` documents (`meta` + `items[].target{element_id, concept, field}`) and runs `validateFeedback` before download; `buildReviewDoc` / `console-review-v1` deleted (no compat).
- **Bundle-owned feedback UI**: when `feedback-export` is declared, the bundle injects banner, export button and modal; the DOM-anchor contract is removed, so `model_console.html` gains feedback with no markup copy. Removes change 1's time-boxed, ledgered lint exception for `model_console` (marker + `legacy-ledger.yaml` entry).
- **One payload builder**: `buildConsolePayload` in `innfo-core` (meta incl. stable model id, `sha256`, `feedbackState`; elements with stable ids, relations, matrices, markers); CLI and `compile_model_console` both delegate to it. The procedure becomes a thin wrapper over an MCP tool.
- **Verdict ledger**: separate append-only file keyed by feedback-file `sha256` + item id; feedback sources under `sources/import/feedback/` stay immutable (normalized headings embed status, e.g. `### fb-001 (correction, pending)`). Consoles embed `meta.feedbackState: [{id, status, version}]`.
- **One `reconcile_feedback` procedure** with a per-blueprint regenerate step (business: model console + Staleness Report; metrics: `timeline.html` slots). Both `apply_feedback_NN.md` deleted.
- **Triage fields** `layer` / `severity` (mapped to the DOCX 4-layer triage of `reconcile_artifact_feedback_NN.md`) set by reconcile, never by the reviewer.
- **Schema cleanup**: keep `source_knowledge` / `source_knowledge_version`; delete the `knowledge*` alias (no compat); align procedure prose and both validators.

## Capabilities

### New Capabilities
- `console-payload-builder`: single payload contract and builder shared by CLI and procedure.
- `feedback-verdict-ledger`: append-only verdicts, `meta.feedbackState`.

### Modified Capabilities
- `innfo-console-feedback`: export conforms to the schema and is validated before download; alias removal, triage fields, shared reconcile procedure, bundle-injected UI.
- `innfo-console-runtime`: feedback UI no longer requires shell anchors.
- `console-export-cli`: staleness from the shared payload; CLI delegates to core.

## Impact

| Area | Impact |
|---|---|
| `iNNfo/packages/innfo-core` (payload, ledger) | New |
| `iNNfo/packages/innfo-mcp` (tool wrapper, bundle, `canonical-registry.ts` regen) | Modified |
| `iNNfo/specs/bluepriNNts/console/` (bundle sources, `feedback.schema.json`) | Modified |
| `workspace/procedures/compile_model_console_NN.md`, new `reconcile_feedback` | Modified / New |
| `business/`, `metrics/procedures/apply_feedback_NN.md` (+ `spec_NN.md`, `create_timeline_NN.md` refs) | Removed / Modified |
| `scripts/export-console.mjs` | Modified |
| `skills/nn-trannsform/scripts/lib/scanner-converters.js` | Modified |

## Release coupling

- `blueprints-v*` tag: bump `channels.stable.refs` `blueprints` version (now `0.19.1`) in `manifest/source.yaml` in the same batch (procedures, `spec_NN.md` `template_version` bumps).
- `innfo-console-v*` tag, derived from the `console_assets` version (now `0.6.0`; bundle, shell, export CLI share it) + new CDN bundle (`scripts/build-console-bundle.mjs`).
- `innfo-mcp` / `innfo-core` release for the new tool; refs via `sync-versions.mjs` / `channel-refs.js`, never hand-edited.
- `skills-v*` if `nn-trannsform` validator changes.

## Chain and rename boundaries

- Depends on change 1 (shell consolidation, needs/anchor lint, pin normalization for all shells) and change 2 (tokens + `InnfoUI`, `StatusBadge` used by the injected modal/banner). The needs lint from change 1 MUST be updated here: `feedback-export` no longer requires anchors, and its `model_console` exception is deleted.
- Change 4 consumes the stable model id, `meta.feedbackState`, the stable element ids and the conformant export; it removes the reviewer-side status `<select>` (bundle :2376-2391), which this change leaves untouched.
- **Left to the nomenclature rename**: `feedback.schema.json` `$id`, `templates/console` literals and `@innfo-console-v0.4.0` legacy paths in `model_console.html`, `needs-registry.json` URLs.

## Deferred to sdd-design

- Stable model id derivation (identity must not include `knowledge_version`; candidate: workspace-relative path stem or a frontmatter id).
- Ledger location/format (e.g. `sources/import/feedback/ledger.jsonl` vs a `.cogNNitive/` path) and whether triage lives in the ledger rather than the feedback schema.
- Payload function home and citation strategy: `resolveSources` lives in `innfo-mcp` (`tools/resolve-sources.ts`, uses MCP fs helpers), NOT in `innfo-core`. Options: move its fs-free core into innfo-core, or inject a citation resolver into `buildConsolePayload`.
- How `export-console.mjs` imports innfo-core (built `dist` vs a generated mirror like `build-trannsform-slug-mirror.mjs`); no script imports innfo-core today.
- Which bundle module owns injection (InnfoConsole and InnfoModelViewer both auto-boot on model_console).
- Location of `reconcile_feedback` (workspace blueprint vs seam) and naming vs `reconcile_artifact_feedback`.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Element id unification orphans feedback exported from CLI consoles (`id` = name) | Med | Reconcile resolves by `concept`+`element` fallback; test old fixtures |
| `dist` staleness makes CLI use an old builder | Med | Decide import path in design; guard in verify |
| Normalized `#fb-NNN` anchor resolution unverified | Med | Verify in spec phase before relying on citations |
| Multi-channel release drift | Med | Single batch; `check:versions`, `check-integrity.js` |

## Rollback

Revert the change commits on `dev` before the batch reaches `main`. After release: re-pin `manifest/source.yaml` to the previous `blueprints-v*` / `innfo-console-v*` / `innfo-mcp-v*` tags (published tags are immutable). The ledger is additive; deleting it restores the "working copy only" behavior with no source mutation.

## Delivery (ask-on-risk)

Estimated ~1,500-2,000 changed lines (excluding the regenerated bundle): **over the 400-line budget**. Recommended chained slices:

1. Schema alias removal + conformant export (`validateFeedback` wired, `buildReviewDoc` deleted) + validators + verdict ledger module (core).
2. `buildConsolePayload` (stable model id, `sha256`, `feedbackState`) + MCP tool + CLI migration + thin `compile_model_console`.
3. Bundle-injected feedback UI + needs-lint update + removal of the `model_console` lint exception.
4. `reconcile_feedback` + per-blueprint regenerate + delete `apply_feedback` copies; release tags/repins.

Decision needed before apply: chained PRs vs `size:exception`.

## Success Criteria

- [ ] Every console export validates against `feedback.schema.json` and ingests via `nn-trannsform --scan`.
- [ ] `model_console.html`, with unchanged markup, exports feedback; change 1's lint exception and its ledger entry are gone.
- [ ] Payload `meta` carries a stable model id that survives a version bump.
- [ ] CLI and procedure produce identical payloads for the same kNNowledge document (golden test).
- [ ] A procedure-built console reports `fresh` when content is unchanged.
- [ ] A verdict survives re-running reconcile and appears in the regenerated console's `meta.feedbackState`.
- [ ] No feedback source file is modified by reconcile.
- [ ] Exactly one apply/reconcile procedure for console feedback; zero `knowledge*` aliases in the schema.

## Proposal question round

Not asked directly (executor context); assumptions needing user review:

1. Should rejected verdicts be final, or may a later round re-open an item (ledger allows supersede)?
2. Should an item targeting a since-changed element be auto-flagged stale, or still offered for apply?
3. Is `source_knowledge` the right surviving name (matches validators; the archived rename spec agrees)?
4. Must the DOCX path (`reconcile_artifact_feedback`) write into the same ledger in this change, or later?
