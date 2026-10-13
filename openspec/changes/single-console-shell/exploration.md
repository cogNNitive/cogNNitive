# Exploration: single-console-shell

Decision under exploration (maintainer, greenfield, no backwards-compat, no fallbacks, no legacy ledger):
ONE console shell = `iNNfo/specs/bluepriNNts/console/artifact_shell.html` (runtime `InnfoConsole`, `innfo-ui.css`, shared `ElementCard`).
There are no "model console", "procedures console" or "custom console" types: every console is the domain console with a different scope (one model, one view, a subset).

## Executive summary

1. Viable. `console/innfo-runtime.js` is a superset of the model viewer except for the gaps in section 2.
2. Per-model export already uses `artifact_shell.html`; `model_console.html` is only the target of the `compile_model_console` procedure, whose only dependency is the `build_console_payload` MCP tool. Retire all three together. The tool's only other consumer is the golden-parity test.
3. The CLI per-model mode (`--all`, `--stale`, `--filter`, `<name>`) still writes a `<stem>_console` family. `--status`, `--stale` and `inspectModelStatus` (`scripts/export-console.mjs:251-279`) depend on it, as does the lineage staleness check (`lineage-single-edge` spec line 114). It must be redesigned, not just deleted.
4. Scoped-domain hazards today:
   - `--domain --filter X` already builds a subset but overwrites the fixed-name `domaiNN_console.html` (`export-console.mjs:890-904`).
   - `domainId` (`:770`) is not scope-aware: a subset console shares localStorage drafts with the full console.
   - Domain meta drops `feedbackState`, `sha256`, `citationsResolvedAt` (`:772-787`): verdict badges (`review.js:1191`) and `source_sha256` are lost in any domain/scoped console.
   - Runtime `consoleScope` means "this view only" (drops explorer, rail, search; `innfo-runtime.js:3340-3351`, `5171-5181`). A model/subset scope needs different semantics; keep them separate.
5. Parity gaps: see section 2.
6. Active OpenSpec changes: none of the five mentions consoles. One collision: `2026-10-10-blueprint-external-skills` edits living spec `template-procedures-manifest-and-discovery`, which this change also needs to delta.
7. Release: `innfo-console-v*`, `blueprints-v*` + repin, `innfo-mcp-v*` (breaking tool removal); `templates-v*` + `SHIPPED_TEMPLATE_VERSIONS` bump if the `business` template text is edited; skills bump for `nn-innfo` tool table.

## 1. Reference inventory (paths relative to repo root)

### Delete
- `iNNfo/specs/bluepriNNts/workspace/assets/model_console.html`
- `iNNfo/specs/bluepriNNts/console/render-model-viewer.js`
- `iNNfo/specs/bluepriNNts/workspace/procedures/compile_model_console_NN.md` (lines 23, 35, 47, 80 hard-wire the shell and the tool). Recommendation: delete, no replacement.
- `iNNfo/specs/bluepriNNts/procedures/procedures/export/document_sop_console/` (html + bundle)
- `iNNfo/specs/bluepriNNts/procedures/samples/export/Ghostbusters_V_0-2-0_procedures_console/` (html + bundle)
- `iNNfo/packages/innfo-mcp/src/tools/build-console-payload.ts` and `.spec.ts`
- `iNNfo/packages/innfo-mcp/test/console-golden-parity.test.ts` (imports the tool at :9, calls it at :190). Replace with a CLI-only golden test if wanted.

### Edit in source
- `scripts/lib/console-bundle.js:24`: drop `render-model-viewer.js` from `SOURCES`.
- `scripts/lib/console-bundle.test.js:61`: update expected source list.
- `console/innfo-console.bundle.js`: regenerate (new `innfo-console-v*`).
- `iNNfo/packages/innfo-mcp/src/server.ts`: remove import `:51`, tool definition `:635-637`, handler `:1016-1019`.
- `iNNfo/packages/innfo-mcp/src/server.spec.ts:151`: remove tool from expected list.
- `iNNfo/packages/innfo-mcp/bin/innfo-mcp.bundle.js`: regenerate (`innfo-mcp-v*`, breaking).
- `iNNfo/specs/bluepriNNts/workspace/procedures/reconcile_feedback_NN.md:141`: remove `build_console_payload` from the semantic-tools sentence (frozen workspace folder).
- `iNNfo/specs/bluepriNNts/business/spec_NN.md:179-180`: prose says consultation "relocated to Compile Model Console". Edit, bump `template_version`, register in `SHIPPED_TEMPLATE_VERSIONS`.
- `iNNfo/packages/innfo-core/src/schema/canonical-registry.ts:42`: business mirror text/procedure list mentions `compile_model_console`; edit with the business spec.
- Comments only: `iNNfo/packages/innfo-core/src/console/schema-resolution.ts:5`, `scripts/export-console.mjs:626`.
- `skills/nn-innfo/SKILL.md:360`, `docs/innfo/documentation/innfo-mcp.md:34`: remove tool row (skills version bump).
- `iNNfo/specs/bluepriNNts/console/needs-registry.json`: optional greenfield cleanup; prune legacy anchor alternates `["rail"]`, `["search"]`, `["content"]`, `["matrices"]`, `["view-matrices"]`.

### Guards and script tests
- `scripts/lib/console-shell-guard.test.js`: `:108-109` asserts >=2 shells and that `model_console.html` is among them; `:168` lists it in `liveShells`; `:114-124` asserts the guard source has no `model_console.html` literal (becomes vacuous: delete/reword). `console-shell-guard.js` itself was NOT read; verify how it enumerates shells.
- `scripts/lib/nn-name-invariant-guard.test.js:84`: fixture path, swap for another frozen procedure.
- `scripts/check-procedures-version.test.mjs:58`: fixture name, rename.
- `test/ui/testlab_smoke.py:3`: wording only.

### Tests that boot `model_console.html` / the viewer
- `iNNfo/packages/innfo-core/tests/helpers/console-review-env.ts`: 27, 29, 55, 87, 97, 102, 107.
- `console-review-{keyboard,info-pip,export,changed-filter,badges,popover,mode,progress}.test.ts`.
- `console-feedback-ui.test.ts`: 9-18, 72, 364-368.
- `console-citations-dom.test.ts`: 28, 62, 81, 132.
- `console-renderers.test.ts`: 17, 20, 25, 37-38.
- `console-ui-kit-renderers.test.ts`: 34, 54, 64, 72, 92, 95.
- `console-thinning.test.ts`: 13, 67-104, frozen list 121-177.
- `console-shell.test.ts:97`.
- `console-citations-payload.test.ts`: `describe.skip` block 10-31 and URL at 56 (delete).
- `naming/contract.test.ts:176`, `naming/console-model.test.ts`.
- `test/console-element-card.test.mjs`: 262-325 (viewer boot, `#el-` hrefs, `sourceUrl` safety).

### Docs
- `docs/innfo/documentation/offline-consoles.md`: 32, 36-37, 52, 111 (line 31-32 says "Two shells are canonical").
- `docs/innfo/documentation/console-ui-kit.md:6`.
- `docs/innfo/documentation/console-needs-and-visuals.md:57, 99` (99 notes the viewer's own palette; remove).
- `openspec/backlog.md`: 178, 309; line 860 is decision D17 ("model console"/"procedures console" stay user-facing terms), contradicts this change and must be superseded.

### Living specs
- `console-architecture`: lines 20, 40, and the L3 "Model Custom Consoles" requirement.
- `innfo-console-runtime`: 26, 48-49, 63-67, 75-90, 99, 118-124.
- `console-payload-builder`: 5, 10-12, 22, 32, 39, 57-59 (core builder stays; drop MCP tool and procedure parts).
- `console-schema-resolution`: 5, 11 (make CLI-only).
- `console-review-mode`: 5, 46. `console-ui-kit`: 278, 286. `console-field-citations`: 5, 11, 113. `innfo-console-feedback:97`.
- `nn-naming-contract`: 143-145 (frozen-procedure example uses `compile-model-console`; pick another).
- `template-procedures-manifest-and-discovery`: 22-24 (the `compile-model-console` scenario), 32 ("8 files" count, already stale).
- `console-export-cli`: 39-63 (per-model family, `--stale`, `--filter`, `--all`).
- `console-view-registry`: 93-103, 136 (`--view` scope).
- `metrics-console-adoption:26`, `lineage-single-edge:114`, `editor-lineage-ui:32`.

## 2. Feature parity gap (single-model scope)

| Viewer / model_console.html capability | In artifact_shell + InnfoConsole? |
|---|---|
| Doc title badge from `meta.title` | NO. `#innfo-domain-title` is static "Domain Console" (`artifact_shell.html:314`), never set. Title appears only in the feedback banner (`innfo-runtime.js:886`). |
| Meta line: Template, Model version, Generated | PARTIAL. Only "Last updated <generated> UTC" (`renderNavbarMeta`, `:842`). |
| `sourceUrl` link with safe-scheme filter | NO. Zero handling in runtime. XSS tests exist at `test/console-element-card.test.mjs:292-326`; port the allowlist if kept. |
| Rail with "All concepts" and counts | MOSTLY. Flat "Concepts (n)" list or per-model `<details>` when `meta.models.length > 1` (`:1266-1377`); no "All" entry (clear via active-filter pills). |
| Concepts sorted by schema weight | NO (declared order). |
| Full-text search | YES, and more (`filterElements`, facets, hash query). |
| Per-concept section headings with "N elements" | NO. Flat card list with concept badge; Cards/Table toggle instead. |
| Collapsible cards, relations, tags, QUD, path | YES via same `UI.ElementCard`. |
| Matrices with header badges | YES. |
| Per-field citation icons + dialog | YES (`onCite`, `renderCitationDialog`, `:4391-4400`). |
| Header-level "sources" icons (`SOURCES_FAMILY`) | UNVERIFIED. Viewer moves `citations.sources` into card head (`render-model-viewer.js:327-335`); runtime only attaches to existing fields (`:1733`). Check in jsdom. |
| Deep link `#el-<id>` open card + switch concept | NO, likely an existing bug: kit hrefs are `#el-<target>` (`ui-kit.js:657,1255,1391`), runtime sets `domId = element.id` (`:1790`) and `onHash` (`:5526-5538`) only scrolls. Ids are model-qualified (`mId/elId`). |
| Empty-shell / "No elements match" messages | NO (minor). |
| Review mode, feedback banner, export modal | YES. |
| Verdict badges from `meta.feedbackState` | Runtime reads it, domain export never sets it (see section 3). |
| `file://` self-contained | YES, better (inlined + CSP). |

Real product risks: missing model identity header and dead deep links. Both must be fixed in the runtime, with tests, before `model_console.html` is deleted.

## 3. Expressing model / view / subset scope on the domain path

Exists:
- `export-console.mjs --domain` aggregates `candidateModels` into one payload; element ids qualified; `meta.models` carries per-model summaries; views inlined.
- `candidateModels` already honors `--filter` and `<name>` on `--domain` (`:468-484`, `:661`). Only `--view` forbids them (`:415`).
- Runtime adapts to model count (1 entry flat rail, >1 hierarchical rail; `:1266`).
- `consoleScope = {view}` is implemented in CLI (`:789`) and runtime (`:3340-3351`, `:3426`, `:5165-5203`).

Missing:
1. Scope descriptor with a reviewer-facing label, e.g. `meta.consoleScope = {view?, models?, label}`. Subset-by-models needs little runtime branching (payload is narrower). Keep distinct from view scope (which strips the explorer). Runtime should derive navbar title/`modelTitle` from `meta.title`.
2. Output path: scoped `--domain` must not target fixed-name `domaiNN_console.html` (`:890-904`); use a write-once family like `artifacts/<scope>_console/` as `--view` does (`:918-951`).
3. Draft-store identity: `domainId` (`:770`) is root-hash only; runtime appends only `::view:<id>` (`:5203`). Add a scope suffix.
4. Dropped meta: `domainPayload.model.meta` (`:775-783`) keeps title, model, modelId, domainId, modelVersion, generated, models. Per-model `feedbackState`, `sha256`, `citationsResolvedAt` are discarded (kills verdict badges and `source_sha256` at `innfo-runtime.js:4834`; affects `inspectModelStatus` freshness at `:278`). Fix: carry `sha256` + `feedbackState` per model in `meta.models`, make `review.js` read them there.
5. Staleness: `--status` / `--stale` are defined over per-model consoles (`:244-285`). Redefine via per-model `sha256` in `meta.models`.
6. `--view` + model subset: relax the check at `:415`; `discoverViews` `specNames` already takes `candidateModels`.

## 4. Active OpenSpec changes audit

Searched case-insensitively for console, shell, consoleScope, model_console, compile_model, build_console_payload, InnfoModelViewer, model-viewer, artifact_shell.
- `2026-09-30-nn-quarantine-removal`, `2026-10-01-nn-domain-git-workflow`, `2026-10-07-nn-upgrade-contract-docs`, `2026-10-11-video-script-contract-additions`: no matches, no contradiction.
- `2026-10-10-blueprint-external-skills`: its delta for `template-procedures-manifest-and-discovery` modifies R-TPD-04 and does not touch the `compile-model-console` scenario (living spec lines 22-24). `specs/template-package-structure/spec.md:10` has a stale example `assets/model_viewer.html`. `tasks.md:100` and `proposal.md:40` are traceability only. Action: archive/merge it before this change's delta to the same living spec lands, or rebase; fix the stale example.

## 5. Tests

`createConsoleEnv.setup()` defaults to `model_console.html`; `loadConsole()` requires the viewer. Review suites call `Viewer.boot()` and rely on viewer card ids (`el-threat-slimer`, from `domId = 'el-' + id`).
Re-point to: default shell `console/artifact_shell.html`; drop `render-model-viewer.js` from `CONSOLE_SOURCES`; boot only `Console.boot(doc)`; render root `innfo-content`; cards found by element id; default `needs` includes `concept-rail`, `fulltext-search`, `feedback-export` (`console-review-mode.test.ts:56`); search tests use `#innfo-search`. `console-citations-dom` and `console-ui-kit-renderers` test viewer-only behavior: rewrite through the runtime (including the unverified header-level sources icons). `console-thinning`: keep shell/slot checks, drop model-console blocks; frozen list 121-177 loses the two deleted consoles.

## 6. Release implications and risks

- `innfo-console-v*`: bundle composition changes + runtime gains identity header and deep-link fix. Regenerate bundle; CDN pin refresh via `channel-refs.js` and `sync-versions.mjs`, never hand-edited.
- `blueprints-v*` + repin: deleting `model_console.html` and `compile_model_console_NN.md` from frozen `workspace`, and editing `artifact_shell.html`. Frozen guard byte-checks the `workspace` folder against its pin (`manifest/source.yaml:147-150`; carve-out in `nn-name-invariant-guard.js:16,37`).
- `innfo-mcp-v*`: breaking tool removal; regenerate bundle.
- `templates-v*` + `SHIPPED_TEMPLATE_VERSIONS` if business spec text edited (known recurring gap).
- Skills version bump for `nn-innfo` tool table.
- Vendored bundle copies: each must be regenerated or declared frozen (two innfo-core test fixtures plus testlab artifacts remain).
- Risks: losing identity header/deep links silently; `--stale` and lineage staleness regressing; scoped export clobbering `domaiNN_console.html`; scoped draft collisions; missing verdict badges in scoped consoles; suites passing vacuously after re-pointing (prove each can still go red); delta collision with external-skills change.

## Open product questions (answered with defaults in the proposal; maintainer may override)
1. CLI per-model export: disappears or becomes sugar for a domain console scoped to one model?
2. Which tabs does a scoped console show?
3. Scoped consoles: write-once timestamped under `artifacts/`, or stable name?
4. Is `meta.sourceUrl` link still a required capability?
5. Scope chosen only at export time (CLI), or also narrowable by the reviewer in the UI?
