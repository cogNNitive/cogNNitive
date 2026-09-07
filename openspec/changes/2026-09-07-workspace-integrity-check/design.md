# Design: Workspace Integrity Check

**Change ID:** `2026-09-07-workspace-integrity-check`
**Related specs:** `workspace-integrity-check` (New), `workspace-template-upgrade` (Modified), `template-cache-staleness-detection` (Modified), `template-freshness-diagnostic` (Modified), `cross-model-reference-validation` (Modified)

---

## Technical Approach

One deep module in `innfo-core` owns the whole check; both surfaces are adapters at its seam.

`buildWorkspaceIntegrityReport(ports, options)` is the single interface. Everything that varies by
platform — model discovery, diagnostics collection, catalog fetch, template resolution/hydration,
byte-hash freshness — is a **port** injected by the caller. The builder itself is pure orchestration:
no `node:fs`, no `fetch`, no `path`. Node (`innfo-mcp`) supplies fs-backed ports; the browser
(`innfo-editor`) supplies `fetch`-backed ports and simply **omits** the two optional ports it cannot
honour, which degrades those fields to `not-checked` instead of failing the pass.

The classification vocabulary already exists in `upgrade-check.js`. It is ported into `innfo-core` as
pure functions and the CLI is re-pointed at a generated CJS artifact, so there is exactly one
classifier in the ecosystem.

```
              ┌──────────────────────── @cognnitive/innfo-core ────────────────────────┐
              │  workspace/integrity/versionStatus.ts   (pure classification)          │
              │  workspace/integrity/report.ts          (buildWorkspaceIntegrityReport)│
              └───────┬─────────────────────┬──────────────────────────┬──────────────┘
                      │ ports               │ ports                    │ codegen
       ┌──────────────┴────────┐   ┌────────┴─────────────┐   ┌────────┴──────────────────┐
       │ innfo-mcp             │   │ innfo-editor         │   │ nn-preflight (CJS, zero-  │
       │ check-workspace.ts    │   │ integrityPorts.ts    │   │ dep, distributed)         │
       │ fs + net, all 5 ports │   │ fetch, 3 ports       │   │ version-status.generated  │
       └───────────────────────┘   └──────────────────────┘   └───────────────────────────┘
```

---

## Architecture Decisions

### AD-1 — Report builder API: injected ports, workspace-shaped not model-shaped

**Choice.** Five ports, two of them optional. Diagnostics collection is **workspace-shaped**
(`validateAll(models)` returns a map) so the Node adapter can run **one** `recursiveParse` for the
whole tree instead of N. Freshness stays a **single-URL** port; deduplication and the concurrency cap
live inside the builder, not in every adapter.

```ts
export type CatalogSource = 'in-repo' | 'remote' | 'offline'
export type FreshnessField = 'fresh' | 'stale' | 'unknown' | 'not-checked'
export type TemplateResolution = 'resolved' | 'hydrated' | 'unresolved' | 'not-checked'

export interface WorkspaceModelRef {
  /** Workspace-relative, forward-slashed. Identity key for the whole report. */
  path: string
  /** Model id (filename stem) when the adapter has one. */
  id?: string
  /** `parent_spec.url` (or `spec_url`), verbatim. `null` ⇒ unpinned. */
  parentUrl: string | null
  parentName: string | null
}

export interface IntegrityDiagnostic {
  path: string
  message: string
  severity: 'error' | 'warning'
  code?: string
}

export interface TemplateResolutionResult {
  outcome: TemplateResolution
  /** Resolver tier when resolved locally: 'workspace-package' | 'workspace-flat' | … */
  tier?: string
  /** Local raw content of the resolved depth-0 template, for the freshness hash. */
  localContent?: string
  detail?: string
}

export interface WorkspaceIntegrityPorts {
  /** REQUIRED. Every Level-3 model in the workspace. */
  discoverModels(): Promise<WorkspaceModelRef[]>
  /** REQUIRED. One call for the whole workspace, keyed by `WorkspaceModelRef.path`. */
  validateAll(
    models: WorkspaceModelRef[],
  ): Promise<Map<string, { errors: IntegrityDiagnostic[]; warnings: IntegrityDiagnostic[] }>>
  /** REQUIRED. `catalog: null` ⇒ source is 'offline'. Never throws. */
  fetchCatalog(): Promise<{ catalog: TemplateCatalog | null; source: CatalogSource }>
  /** OPTIONAL. Self-healing resolve + hydrate. Omitted ⇒ 'not-checked'. Never throws. */
  resolveTemplate?(model: WorkspaceModelRef): Promise<TemplateResolutionResult>
  /** OPTIONAL. Byte-hash vs canonical remote. Omitted ⇒ 'not-checked'. Never throws. */
  checkFreshness?(templateUrl: string, localContent: string): Promise<'fresh' | 'stale' | 'unknown'>
}

export interface ModelIntegrityReport {
  path: string
  template: string | null
  pinnedVersion: string | null
  adoptedVersion: string | null
  versionStatus: VersionStatus
  gap: VersionGap
  templateResolved: TemplateResolution
  templateTier?: string
  freshness: FreshnessField
  errors: IntegrityDiagnostic[]
  warnings: IntegrityDiagnostic[]
}

export interface WorkspaceIntegrityReport {
  schemaVersion: 1
  generatedAt: string
  models: ModelIntegrityReport[]
  aggregate: WorkspaceIntegrityAggregate
  catalogSource: CatalogSource
  offline: boolean
  /** Human-readable notes on what could NOT be determined (AD-6). */
  degraded: string[]
}

export interface WorkspaceIntegrityAggregate {
  modelsScanned: number
  /** The ONLY failure count: models with ≥1 error. Resolved Decision 5. */
  invalid: number
  withWarnings: number
  versionStatus: Record<VersionStatus, number>
  templateResolution: Record<TemplateResolution, number>
  freshness: Record<FreshnessField, number>
}

export async function buildWorkspaceIntegrityReport(
  ports: WorkspaceIntegrityPorts,
  options?: {
    now?: () => Date
    /** Max in-flight freshness fetches. Default 4. */
    freshnessConcurrency?: number
  },
): Promise<WorkspaceIntegrityReport>

/** Pure. Exported so callers can re-summarise a filtered model list. */
export function summarizeWorkspaceIntegrity(
  models: ModelIntegrityReport[],
): WorkspaceIntegrityAggregate
```

**Alternatives rejected.** A per-model `validate(model)` port (N full workspace parses — quadratic on
large trees). A `WorkspaceIntegrityPort` class with a `platform: 'node' | 'browser'` discriminator
(the builder would branch on platform, defeating the seam). Passing the Node resolver in directly
(`innfo-core` would import `node:fs` transitively).

**Rationale.** Two real adapters exist, so the seam is real, not hypothetical. Optional ports express
"this platform genuinely cannot do this" in the type system, and the builder converts absence into an
explicit `not-checked` field rather than a silent `false`.

### AD-2 — Version-status primitives move to core; the CLI consumes a generated CJS artifact

**Choice.** These pure functions move from `upgrade-check.js` into
`innfo-core/src/workspace/integrity/versionStatus.ts`:

| Core export | Signature | Replaces |
|---|---|---|
| `parseSemVer` | `(v: string) => SemVerTriple \| null` | `upgrade-check.js:37` |
| `compareVersions` | `(a: string, b: string) => number` | `upgrade-check.js:58` |
| `gapKind` | `(pinned: string, adopted: string) => VersionGap` | `upgrade-check.js:47` |
| `parsePinnedUrl` | `(url: string) => { name: string; version: string } \| null` | `upgrade-check.js:71` |
| `classifyAgainstCatalog` | `(parentUrl: string \| null, catalog: TemplateCatalog \| null) => VersionClassification` | the whole decision tree at `upgrade-check.js:143-215` |

```ts
export type VersionStatus =
  | 'current' | 'upgrade-available' | 'ahead' | 'unlisted' | 'unpinned' | 'unknown'
export type VersionGap = 'same' | 'major' | 'minor' | 'patch' | null

export interface VersionClassification {
  status: VersionStatus
  template: string | null
  pinned: string | null
  adopted: string | null
  gap: VersionGap
  detail?: string
}
```

`unknown` is an **additive sixth value reachable only when `catalog === null`** (`catalogSource:
'offline'`). `upgrade-check.js` skips its scan entirely when the catalog is unreachable
(`preflight-check.js:518-534`), so the CLI can never emit it — the five published values keep exact
parity.

**Interop.** `upgrade-check.js` is CommonJS, `innfo-core` is ESM-only (`"type": "module"`), the repo
pins `node >= 20.15` (no unflagged `require(esm)` before 22.12), and `nn-preflight` is a
**distributed zero-dependency skill** installed at `~/.agents/skills/` where `@cognnitive/innfo-core`
does not exist at all. So a runtime import is impossible in every direction.

Resolution: a build step bundles the primitives module to CJS and commits the artifact into the skill.

- `scripts/build-preflight-primitives.mjs` → esbuild (via the hoisted `tsup` dependency)
  `--bundle --format=cjs --platform=neutral` from `innfo-core/src/workspace/integrity/versionStatus.ts`
  → `actioNN/skills/nn-preflight/scripts/lib/version-status.generated.cjs`.
- `--check` mode compares rendered vs committed and exits `1` on drift, mirroring
  `scripts/template-catalog.mjs`. Wired into `scripts/verify.js`.
- `upgrade-check.js` deletes its five private functions and `require`s the generated file.
  `discoverModels` / `scanWorkspaceUpgrades` stay in the CLI — they are `fs`-bound orchestration, not
  classification — and now call `classifyAgainstCatalog` per model.

**Alternatives rejected.** Dual ESM/CJS build of the whole `innfo-core` package (changes the public
package shape for one consumer, and still unreachable from an installed skill). Converting
`upgrade-check.js` to `.mjs` (breaks `preflight-check.js:35`'s `require`, and still cannot resolve the
package). A hand-maintained copy plus a cross-implementation parity test (the proposal explicitly
forbids a private copy; a test detects drift but does not prevent it).

### AD-3 — Catalog canonical URL: publish to Pages via `build-docs.mjs`, remote-first resolution

**Finding.** `preflight-check.js:51` already fetches
`https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/catalog.json`, so
a canonical URL exists for Node CLIs. But `docs/**/catalog.json` does not exist, the editor is served
from `https://cognnitive.com/innfo/app/` (`docs/CNAME` = `cognnitive.com`), and a cross-origin
`raw.githubusercontent.com` fetch on every workspace open carries CORS and rate-limit exposure.

**Choice.** `build-docs.mjs` gains a step, adjacent to the existing CDN-bundle staging: run
`node scripts/template-catalog.mjs`, then copy the result to `docs/innfo/templates/catalog.json`.

| Source | URL / path | `catalogSource` |
|---|---|---|
| 1 — Pages (canonical) | `https://cognnitive.com/innfo/templates/catalog.json` | `remote` |
| 2 — raw fallback | `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/catalog.json` | `remote` |
| 3 — local | `<rootDir>/specs/templates/catalog.json`, else the monorepo `iNNfo/specs/templates/catalog.json` | `in-repo` |
| 4 — none | — | `offline` |

**Remote-first**, 2.5 s timeout per attempt, then local, then offline. Upgrade detection is only
useful against the freshest catalog, so a vendored copy must never shadow the published one. The
`offline: true` input to `check_workspace` skips 1 and 2 and starts at 3.

This inherits the "auto-republishes on every Pages deploy" property already documented for the MCP
CDN bundle, and makes the editor's fetch **same-origin**. `docs/innfo/templates/catalog.json` joins
the generated-artifact drift list checked by `nn-dev-check-integrity` Group 7.

**Alternatives rejected.** raw.githubusercontent only (cross-origin + rate limits from the browser).
Bundling the catalog into the editor build (stale the moment a template ships). A new API endpoint
(no server exists — Pages is static).

### AD-4 — `runWorkspaceValidation` split: extract the collector, keep the filter

**Choice.** Split the existing function at `validate.ts:243` in two, changing no behaviour:

```ts
/** Unfiltered workspace-scope diagnostics. ONE recursiveParse for the whole tree. */
export async function collectWorkspaceDiagnostics(
  rootDir: string,
  cache: SpecCache | null,
): Promise<ReferenceDiagnostic[]>

/** Pure. Diagnostics whose `path` names `resolvedModelPath`. */
export function filterDiagnosticsForModel(
  diagnostics: ReferenceDiagnostic[],
  rootDir: string,
  resolvedModelPath: string,
): ReferenceDiagnostic[]

// unchanged call site, now two lines:
async function runWorkspaceValidation(rootDir, resolvedModelPath, cache) {
  return filterDiagnosticsForModel(await collectWorkspaceDiagnostics(rootDir, cache), rootDir, resolvedModelPath)
}
```

`validateModel`'s `workspace: true` path is byte-for-byte identical. The stale doc comment at
`validate.ts:229-242` (which claims `checkOne` is stubbed to `[]`) is deleted and replaced with an
accurate one.

**Cache merging.** `collectWorkspaceDiagnostics` needs a `SpecCache`. `check_workspace` accumulates
the `SpecCache` returned by each model's `resolveParentChainNode` into one **merged** cache
(`Map` union, first-wins) and passes it once. Cross-model reference validation therefore sees every
model's template, which the single-model path never could.

**Alternatives rejected.** A `scope` parameter on `runWorkspaceValidation` (a boolean flag on a
function whose only caller already knows the answer). Calling `validateModel(workspace: true)` N times
from `check_workspace` (N full workspace parses).

### AD-5 — `check_workspace`: self-heal first, classify second, dedup freshness third

**Choice.** New tool `check_workspace` in `iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts`,
registered in `server.ts` (`toolDefinitions` + the `case` at `server.ts:348-374`) and returning
`envelope('innfo-check-workspace', report)`, matching every other handler.

```jsonc
// inputSchema
{
  "root":         { "type": "string",  "description": "Workspace root override (default: server root)" },
  "summary_only": { "type": "boolean", "description": "Omit clean models; return aggregate + failing models only (cap 25). Default false." },
  "offline":      { "type": "boolean", "description": "Skip all network: no catalog fetch, no hydration, no freshness. Default false." }
}
```

Output is `WorkspaceIntegrityReport`. With `summary_only: true`, `models` carries only entries with
`errors.length > 0` **or** `versionStatus === 'upgrade-available'`, capped at 25, plus
`truncated: true`; `aggregate` always reflects the full set (Resolved Decision 3).

Execution order inside the Node `discoverModels`/`resolveTemplate`/`validateAll` ports:

```
1. discover Level-3 models (level === 3 in frontmatter)
2. per model → resolveParentChainNode(rootDir, parentUrl, parentName, { checkFreshness: false })
       ├─ 4-tier hit               → 'resolved' (+ tier)
       ├─ network fetch + hydrate  → 'hydrated'   (write-once, additive only)
       └─ SpecResolutionError      → 'unresolved' (+ detail); never throws out of the port
   ... merge each SpecCache into mergedCache; record url → depth-0 rawContent
3. collectWorkspaceDiagnostics(rootDir, mergedCache)      ← ONE parse
4. per model → validateModel(rootDir, id, …, workspace=false, { checkFreshness: false })
       + filterDiagnosticsForModel(step-3 output, …)
5. fetchCatalog() once  →  classifyAgainstCatalog per model
6. freshness: distinct http(s) parentUrl set, concurrency 4, freshnessVerdict(url, localContent)
```

Step 2 is the one non-read-only step (Resolved Decision 2): `hydrateTemplatePackageAtomically` and
`saveSpecOnce` are additive and write-once, so nothing under `specs/` is ever edited in place, and the
atomic rename is safe against concurrent sessions sharing the tree.
`freshnessVerdict` (today private at `resolver-node.ts:113`) is exported so step 6 can call it per
distinct URL rather than per model — N models pinning one template cost one fetch.

**Alternatives rejected.** Extending `validate_model` with a `scope: 'workspace'` argument (would
break the documented per-model contract and its return shape). Looping `list_models` +
`validate_model` from the agent (the status quo the change exists to remove). Streaming partial
results (MCP tool calls are single-response).

### AD-6 — Editor: fire-and-forget on `open()`, catalog-only, "cannot determine" ≠ "invalid"

**Choice.** In `workspaceStore.open()`, immediately after `this.hasParsed = true`
(`workspaceStore.ts:149`):

```ts
void this._runIntegrityCheck().catch(() => {})   // never blocks, never rejects into open()
```

New store state: `integrityReport: WorkspaceIntegrityReport | null`, `integrityRunning: boolean`,
both cleared in `reset()`. Ports live in `src/services/workspaceIntegrityPorts.ts`:

| Port | Browser implementation |
|---|---|
| `discoverModels` | Reads already-parsed roots from `modelStore.nodes` (zero extra IO) |
| `validateAll` | In-memory validation over parsed roots; no network, no FS |
| `fetchCatalog` | Same-origin `fetch(CATALOG_URL)` (AD-3), 2.5 s timeout |
| `resolveTemplate` | **omitted** — no FS tiers in the browser ⇒ `'not-checked'` |
| `checkFreshness` | **omitted** — Resolved Decision 4 ⇒ `'not-checked'` |

Surface: `src/components/layout/WorkspaceIntegrityNotice.vue`, rendered by
`WorkspaceDashboard.vue`, passive and dismissible, mirroring the `useTemplateVersionNotice` /
`ModelInfoPanel.vue:316` badge + copyable `innfo:` prompt pattern.

Per Resolved Decision 5 the component renders **three visually distinct bands**: *invalid*
(`aggregate.invalid` — errors only), *informational* (`upgrade-available` / `ahead` / `unlisted` /
`unpinned`), and *cannot determine* (`unknown` / `not-checked` / `offline`, sourced from
`report.degraded`). Only the first uses the error treatment.

**Alternatives rejected.** Awaiting the check inside `open()` (blocks first paint on a network
fetch). A router guard (would need the same await). A toast (transient; the report must stay
inspectable).

---

## Data Flow

```
 MCP                                              EDITOR
 agent → check_workspace                          workspaceStore.open() ─┐
   │                                                                     │ fire-and-forget
   ▼                                                                     ▼
 check-workspace.ts                                workspaceIntegrityPorts.ts
   ports: discover · validateAll · fetchCatalog      ports: discover · validateAll · fetchCatalog
        · resolveTemplate · checkFreshness                  (2 optional ports omitted)
   │                                                                     │
   └──────────────► buildWorkspaceIntegrityReport(ports) ◄───────────────┘
                              │
                              ├─ classifyAgainstCatalog()  ← catalog (remote → in-repo → offline)
                              ├─ dedup freshness by URL, concurrency 4
                              └─ summarizeWorkspaceIntegrity()
                              ▼
                    WorkspaceIntegrityReport
                    ├─ MCP  → envelope('innfo-check-workspace', …)  [summary_only trims models]
                    └─ Vue  → workspaceStore.integrityReport → WorkspaceIntegrityNotice.vue

 nn-preflight (CJS, offline-capable, distributed)
   upgrade-check.js → require('./lib/version-status.generated.cjs') → classifyAgainstCatalog()
                      ▲ esbuild, drift-guarded by verify.js
                      └── innfo-core/src/workspace/integrity/versionStatus.ts   (one classifier)
```

---

## File Changes

| File | Action | Description |
|---|---|---|
| `iNNfo/packages/innfo-core/src/workspace/integrity/versionStatus.ts` | Create | AD-2 pure primitives + `classifyAgainstCatalog` |
| `iNNfo/packages/innfo-core/src/workspace/integrity/report.ts` | Create | AD-1 ports, types, `buildWorkspaceIntegrityReport`, `summarizeWorkspaceIntegrity` |
| `iNNfo/packages/innfo-core/src/workspace/integrity/*.spec.ts` | Create | Unit tests (fake ports, no IO) |
| `iNNfo/packages/innfo-core/src/index.ts` · `browser.ts` | Modify | Export both modules from **both** entry points (browser needs them) |
| `iNNfo/packages/innfo-mcp/src/tools/check-workspace.ts` | Create | Node ports + `check_workspace` handler |
| `iNNfo/packages/innfo-mcp/src/server.ts` | Modify | Tool definition + `case 'check_workspace'` |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modify | AD-4 split; delete the stale L229-242 comment |
| `iNNfo/packages/innfo-mcp/src/tools/resolver-node.ts` | Modify | Export `freshnessVerdict` (one-line visibility change) |
| `iNNfo/apps/innfo-editor/src/services/workspaceIntegrityPorts.ts` | Create | Browser ports (3 of 5) |
| `iNNfo/apps/innfo-editor/src/stores/workspaceStore.ts` | Modify | `integrityReport` / `integrityRunning` state, `_runIntegrityCheck()`, call in `open()`, clear in `reset()` |
| `iNNfo/apps/innfo-editor/src/components/layout/WorkspaceIntegrityNotice.vue` | Create | Passive three-band surface |
| `iNNfo/apps/innfo-editor/src/components/layout/WorkspaceDashboard.vue` | Modify | Mount the notice |
| `scripts/build-preflight-primitives.mjs` | Create | esbuild → CJS, `--check` drift mode |
| `actioNN/skills/nn-preflight/scripts/lib/version-status.generated.cjs` | Create | Generated; do not hand-edit |
| `actioNN/skills/nn-preflight/scripts/upgrade-check.js` | Modify | Delete 5 private fns; delegate to the generated module |
| `actioNN/skills/nn-preflight/scripts/preflight-check.js` | Modify | Prefer the Pages catalog URL, keep raw as fallback |
| `scripts/build-docs.mjs` | Modify | Regenerate + stage `docs/innfo/templates/catalog.json` |
| `scripts/verify.js` | Modify | Run `build-preflight-primitives.mjs --check` |
| `actioNN/skills/nn-innfo/SKILL.md` | Modify | Document `check_workspace` in §1; fix the stale tool count (says 13; `server.ts` registers 14, and lists `prune_orphaned_specs` which is no longer registered) |

---

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit — core | `parsePinnedUrl` (flat + package layouts), `gapKind`, `compareVersions`, `classifyAgainstCatalog` across all six statuses | Table-driven vitest; fixtures lifted from `upgrade-check.test.js` so parity is provable |
| Unit — core | `buildWorkspaceIntegrityReport` with hand-written fake ports: all ports present, optional ports omitted, `catalog: null`, throwing ports, freshness dedup + concurrency cap | vitest, zero IO — this is the interface-is-the-test-surface case |
| Unit — mcp | `filterDiagnosticsForModel` (pure), `collectWorkspaceDiagnostics` on a tmp fixture workspace | vitest + `mkdtemp` |
| Integration — mcp | `check_workspace` on a fixture workspace missing a template package: self-heals, returns hydrated status, existing `specs/` files untouched; `offline: true` returns full local validation with `unknown`/`offline`; `summary_only` trims `models` but not `aggregate` | vitest + `mkdtemp`, network stubbed |
| Regression — mcp | `validate_model` (both `workspace` modes) output unchanged after the AD-4 split | Existing suite must pass untouched |
| Unit — editor | Store: `open()` never awaits the check, a rejecting check does not set `error`, `reset()` clears the report. Component: three bands, `unknown` ≠ `invalid` | vitest + `@vue/test-utils`, fake ports |
| Unit — scripts | `build-preflight-primitives.mjs --check` exits 1 on drift; `upgrade-check.test.js` passes unchanged against the delegated implementation | Existing zero-dep node test runner |

**Order gotcha:** `npm --prefix iNNfo/packages/innfo-core run build` MUST run before any `innfo-mcp`
or `innfo-editor` test — a stale `dist/` surfaces as `<fn> is not a function` and looks like an
integration bug.

---

## Migration / Rollout

No data migration, no file-format change, no `specs/` mutation to undo. Every slice is additive and
independently revertable: dropping the `case 'check_workspace'` and the `open()` call restores
current behaviour exactly; the core modules become dead but harmless code. `upgrade-check.js`
delegation reverts by restoring its five inlined functions.

---

## Chained PR Slicing

Confirmed at 4 slices, with slice 3 and 4 swapped from the proposal's ordering: the editor needs the
canonical catalog URL that slice 3 publishes.

| # | Slice | Depends on | Deliverable | Est. changed lines |
|---|---|---|---|---|
| 1 | **core primitives + report builder** | — | `versionStatus.ts`, `report.ts`, specs, index/browser exports | ~380 (≈260 src + 120 test) |
| 2 | **MCP `check_workspace`** | 1 | `check-workspace.ts`, `validate.ts` split + stale-comment deletion, `freshnessVerdict` export, `server.ts` registration, tests | ~420 |
| 3 | **catalog publication + preflight delegation** | 1 | `build-docs.mjs` step, `build-preflight-primitives.mjs`, generated CJS, `upgrade-check.js` delegation, `preflight-check.js` URL, `verify.js` guard | ~180 hand-written + ~120 generated |
| 4 | **editor wiring + UI + docs** | 1, 3 | ports adapter, store state, `WorkspaceIntegrityNotice.vue`, dashboard mount, tests, `nn-innfo` SKILL.md | ~330 |

```
slice 1 ──┬──► slice 2
          └──► slice 3 ──► slice 4
```

Total ≈ 1430 changed lines. Every slice is under the repo's 800-line review budget
(`iNNfo/AGENTS.md`); slices 2 and 1 exceed the SDD default 400-line budget and need an explicit
`size:exception` or a further split of slice 2 (the `validate.ts` refactor is separable from the new
tool). Slice 3's generated `.cjs` is machine-produced and drift-guarded — flag it as review-exempt in
the PR description.

Verification per slice: `npm --prefix iNNfo/packages/innfo-core run build` → the package's own test
suite → `node scripts/verify.js`. Rollback per slice: single `git revert`, no coupled state.

---

## Open Questions

- [ ] `nn-innfo` SKILL.md §1 says "13 herramientas" and lists `prune_orphaned_specs`, but `server.ts`
      registers 14 tools and no `prune_orphaned_specs` case. Fixing that drift in slice 4 is in scope
      for the doc update, but confirm `prune_orphaned_specs` was intentionally retired rather than
      accidentally dropped.
- [ ] `scripts/template-catalog.mjs --check` is not wired into CI today. Slice 3 adds the primitives
      drift guard to `verify.js`; adding the catalog drift guard alongside it is a one-line win —
      confirm it belongs in this change rather than a follow-up.
