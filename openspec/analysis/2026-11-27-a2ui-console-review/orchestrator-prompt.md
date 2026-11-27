# Multi-model design review: A2UI fit for the cogNNitive console

Shared, read-only context for the whole panel. Fill nothing here; this file is frozen
for the duration of the run.

## Repo root for this review (absolute)

```
D:\Users\lucas\Documents\GitHub\cogNNitive-a2ui-console-review
```

This is a git worktree at commit `ad1ffe0aa1fe3e1842b22c7296a5396cb6f7418a`. Your shell
working directory may point at a **different checkout** (`D:\Users\lucas\Documents\GitHub\cogNNitive`,
which sits at `ed80ad9` and has different line numbers). Ignore it. Every read and every
write you do for this review uses the absolute worktree root above. All paths below are
relative to it.

Do not create a worktree. Do not load any skill. Do not follow the `AGENTS.md`
session-start ritual. Do not modify any file outside this folder.

## Decision under review

The maintainer asked whether **A2UI**, Google's agent-to-UI protocol, has a role in
cogNNitive, specifically:

> Could knowledge units and the other units/components currently used in the console be
> *defined* through A2UI, and could a knowledge unit be *edited* both in the console and in
> the agent-facing interface?

The orchestrator produced a prior answer (the claim under review, below). The panel's job
is to attack it, not to restate it. A wrong prior verdict that survives review is the
worst possible outcome.

## Claim under review

- **C1 — layer error.** Defining a knowledge unit *through* A2UI is a category error. A
  knowledge unit is domain data (Level 3); what defines it is the blueprint (Level 2) and
  what validates it is the schema carried in the `nn-schema` payload slot. A2UI describes
  rendering, not domain data. Adopting it as a definition format would create a second
  source of truth.
- **C2 — the real seam.** A2UI's only defensible role is as the *interchange format of an
  agent-facing edit surface* outside the console (a host that supports A2UI, e.g. Claude or
  Gemini via MCP Apps). The integration seam is the existing unified changeset:
  `ctx.store.propose({ kind, elementId, field, proposed })`, whose drafts land in the same
  `nn-drafts` slot the console exports.
- **C3 — not inside the bundle.** Putting A2UI inside `nn-console.bundle.js` imports a
  streaming/network protocol into an artifact whose entire design is "zero network calls,
  works offline on `file://`". That is not a trade-off; it is a contradiction.
- **C4 — the smallest experiment.** Generate an A2UI catalog from `ui-kit.js` and render
  exactly one knowledge unit, read-only. If the catalog comes out clean and an agent fills
  it correctly from the catalog `instructions`, editing is viable. If it does not, the idea
  dies for cheap.
- **C5 — the risk.** If the catalog becomes the contract for editing, `propose()` stops
  being an internal format and becomes a public contract (high-risk item 3: contracts other
  consumers rely on).

## Verified protocol facts (use these; do not re-derive from memory)

Sources: `a2ui.org/specification/v1.0-a2ui/`, `github.com/a2ui-project/a2ui`,
`developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces`
(2025-12-15), `developers.googleblog.com/a2ui-10-build-delightful-fast-reliable-agentic-experiences/`
(2026-11-11). Apache 2.0.

1. A2UI is a **declarative JSON protocol for rendering UI**, not a data-definition or
   persistence format. The agent describes *what to show*; the client renders with its own
   native components.
2. v1.0 (stable, 2026-11-11) carries an envelope with `createSurface`, `updateComponents`,
   `updateDataModel`, `deleteSurface`, plus typed bidirectional calls
   (`callRendererFunction` / `rendererFunctionResponse`, `callAgentFunction` /
   `agentFunctionResponse`). Earlier public milestone was v0.8 (2025-12-15).
3. `updateComponents` carries a **flat list** of components linked by `ComponentId`
   references (adjacency list), designed for incremental LLM generation.
4. Data binding uses JSON Pointer: `{"@path": "/contact/email"}`. Function calls use
   `{"@call": "required", "args": {...}}`. `{"@index"}` is a reserved system function.
5. A **catalog** is a JSON Schema document (`catalogId`, `instructions`, `components`,
   `functions`). The client advertises which catalogs it supports; the agent may only
   compose components from them. Catalog resolution is: component-level `@catalogId`, then
   surface default `catalogId`, then **error — there is no fallback**.
6. Catalog entity names and `ComponentId`s must satisfy Unicode UAX #31
   (`^[\p{XID_Start}_][\p{XID_Continue}]*$`): no whitespace, no `-`, no leading digit.
   The `@` namespace is reserved for envelope mixins (`@catalogId`, `@accessibility`,
   `@metadata`, `@checks`).
7. Security model: no arbitrary code; capabilities are exactly the catalog plus schema
   validation. Catalog functions declare `allowedCallers` (`rendererOnly`, `agentOnly`,
   `rendererOrAgent`) and `requiresUserActivation`, enforced at runtime by the renderer.
8. Transport is decoupled: AG-UI is the standard binding; A2A has an official extension;
   MCP and MCP Apps are supported; also SSE+JSON-RPC, WebSocket, REST. The transport
   contract requires ordered delivery, message framing, metadata (data-model sync,
   capability exchange) and an optional return channel for user actions.
9. v1.0 **removed theme properties**: branding is deferred entirely to the target
   framework's native theme. A v1.0 `createSurface` carrying `theme` is invalid.
10. Renderers exist for React, Angular, Lit, Flutter, SwiftUI, Jetpack Compose (0.9.1 at
    the time of writing) and ByteDance's Lynx. Agent SDKs exist for Python, TypeScript and
    Dart. The web and Flutter renderers also run inside MCP Apps.
11. A2UI is explicitly positioned as **complementary** to AG-UI (transport) and **distinct
    from** MCP Apps (UI as a sandboxed resource in an iframe, `ui://` URI). A2UI is
    native-first; the two compose.

## Verified console facts (use these; cite the code yourself)

1. The console is a **single-file, offline, standalone UMD bundle** at
   `iNNfo/specs/bluepriNNts/console/nn-console.bundle.js`, built from 12 canonical sources
   listed in `scripts/lib/console-bundle.js`. It runs on `file://` with no server.
2. `npm run check:console-bundle` fails on any `fetch(` or `type="module"`. Zero runtime
   network calls is an invariant, not a preference.
3. The runtime is Preact + htm tagged templates. **No JSX.**
4. Payload slots inside the HTML shell: `nn-config`, `nn-schema` (plain JSON),
   `nn-model` (model JSON compressed with deflate-raw level 9, base64),
   `nn-drafts` (plain JSON, `{ drafts, uiState }`).
5. Views are classic-script IIFEs discovered by convention
   (`<domainRoot>/consoles/views/<slug>.js`), each calling
   `registerView({ title, icon, order, kind, mount })`. `kind` is `editable` or `readonly`.
   Reserved ids: `explorer`, `matrices`, `review`.
6. `mount(ctx)` exposes: `ctx.container`, `ctx.doc`, `ctx.ui` (InnfoUI), `ctx.payload.model`,
   `ctx.payload.schema`, `ctx.store` (`propose`, `drafts`, `onChange`), `ctx.modal`
   (`edit`, `comment`), and `ctx.mountHtml` for readonly views.
7. All editable views share **one live draft store and one unified changeset**. Proposed
   changes are exported together. `createDraftStore` lives at `review.js:174`.
8. `InnfoUI` is a **semantic** component vocabulary, not generic widgets:
   `KuBadge({ kind, id, name, value })`, `ElementPill`, `ElementMini` (`ui-kit.js:1682`),
   `ElementCard` (`ui-kit.js:1774`), `KpiGrid` (`ui-kit.js:4196`), `Table`, `KuActions`.
   The export block is at `ui-kit.js:5276`.
9. Charts go through ECharts only, via `nnConsole.renderChart`. A second chart library is
   banned; uPlot was removed on 2026-11-24.
10. `scripts/export-console.test.mjs` runs 52 regression tests. Console size warns above
    5 MB and fails above 15 MB.
11. Addressing is by **hierarchical id plus element slug**; a title is display-only. A
    concept is `compact` (instances are elements of one document) or `distributed` (each
    instance is its own model).

## Corpus (read exactly this; nothing else is in scope)

Sizes at `ad1ffe0`:

| Path | Lines |
|---|---:|
| `iNNfo/specs/bluepriNNts/console/review.js` | 1990 (whole file) |
| `scripts/console-views.mjs` | 956 (whole file) |
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` L1600-1900 | 301 (ElementMini, ElementCard) |
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` L4180-4260 | 81 (KpiGrid) |
| `iNNfo/specs/bluepriNNts/console/ui-kit.js` L5260-5345 | 86 (InnfoUI export block) |

`ui-kit.js` is 5345 lines in total; only those three regions are in scope. Everything
else in the repository is out of scope for line-level findings.

## What the panel must answer

Answer these explicitly; a finding that does not bear on one of them is noise.

1. **Is C1 right?** Or is there a coherent reading under which A2UI *is* a legitimate
   definition surface for a knowledge unit? If C1 is wrong, say exactly where.
2. **Is C2's seam real?** Does `ctx.store.propose()` plus the `nn-drafts` slot actually
   carry everything a remote agent needs to render a correct edit form, or does that
   require a projection of `nn-schema`/the model that does not exist today? Cite the code.
3. **Is C3 a real contradiction or an overstatement?** Could A2UI be consumed *outside* the
   bundle and injected as a payload slot without breaking the offline invariant? What
   exactly breaks?
4. **What breaks if a catalog is generated from `InnfoUI`?** Be specific: semantic props
   (`kind`, `id`, `name`, `value`) versus generic component schemas; UAX #31 naming versus
   existing identifiers; JSON Pointer binding versus hierarchical ids and slugs; `@checks`
   validation versus whatever the console already validates; `@accessibility`; the loss of
   styling control (v1.0 removed theme).
5. **Is there a cheaper path to the same outcome?** For example a plain JSON view/edit
   descriptor returned by an MCP tool, reusing `registerView` and `ctx.ui` directly, with no
   new protocol at all. If A2UI buys nothing over that, say so with the comparison.
6. **Security surface.** What does `ctx.store.propose()` enforce today (validation, target
   resolution, allowed field, allowed concept) that an external agent would bypass, and what
   must be validated server-side before a proposals round-trip exists?
7. **Verdict.** adopt / adopt with conditions / defer / reject, and the single smallest
   experiment worth running, with its falsification criterion.

## Hard rules

1. Nobody edits repository files outside `temp/analysis/a2ui-console-review/`. Nobody
   commits, pushes or installs anything.
2. One owner per file. Each analyst writes exactly one file per phase, named after its own
   key (`independent-analysis-alpha.md`, then `cross-critique-alpha.md`). Never write or edit
   another analyst's report.
3. Phase 1 is isolated: do not read another analyst's report.
4. Every finding needs a real `code_ref` (path:line) that you verified by reading the file,
   plus an honest `evidence` value. A finding without a real `code_ref` is dropped.
5. Do not invent problems to fill a quota. Five to twelve findings. Point out
   over-engineering and YAGNI violations too. A finding that argues the proposal is
   unnecessary is as valuable as one that argues it is insufficient.
6. Write the report section by section; do not emit the whole file in a single write.
7. UTF-8 without BOM, LF endings. English only.

## Frozen roster

| Key | Provider | Model | Setting | Estimate |
|---|---|---|---|---|
| alpha | Codex (OpenAI) | `gpt-6.1-terra` | `reasoningEffort: high` | $0.32 |
| beta | Claude (Anthropic) | `claude-sonnet-5-5` | `effort: high` | $0.65 |
| gamma | Antigravity (Google) | `gemini-4-argon` | `thought_level: high` | $0.65 |
| delta | OpenCode (DeepSeek) | `opencode-go/deepseek-v4-pro` | `variant: max` | `unknown price` |
| consolidator | Claude (Anthropic) | `claude-opus-5-5` | `effort: high` | $0.13 |

## Confirmed cost estimate

- Price date: `2026-11-27`.
- Estimate at the rates used in preflight: **$1.75 + `unknown price` for delta**. Orientative:
  prices may be out of date and may contain reading, tier or renamed-model errors. Not a quote.
- Analysts in this run: **4**. Cross-critique runs in full.
- Real token spend is not measured in this run. Do not invent a measured figure.

## Phases

1. **Independent analysis** — each analyst writes `independent-analysis-<key>.md` following
   the format contract `review-panel_spec_NN.md` and its "Example: independent analysis".
2. **Cross critique** — each analyst writes `cross-critique-<key>.md`, one
   `## NN Critiques:` element per foreign finding, plus new findings as `N1`, `N2`, ...
3. **Consolidation** — the consolidator writes `consolidated-plan-and-verdict.md` with the
   verdict, a vote table, `## NN Decisions:` elements, deferred items with a revival
   trigger, and a first batch of at most five decisions.
