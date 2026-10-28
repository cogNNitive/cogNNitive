# Design: Contextual Resolution — Scope Chain and Typed Cascade

One new nn-core module, `scope/`, owns three things: finding the root and scopes, folding
values over the chain, and resolving procedures. Each has a pure core and a thin Node
adapter. nn-mcp and the video-script skill call it and delete their own walkers. Video
reaches it through the generated-CJS mirror pattern that `nn-sources` already uses.

## Technical Approach

```
path ─▶ findScopeChain (fs adapter) ─▶ ScopeChain ─▶ loadChain (fs, parseKnowledge) ─▶ LoadedChain
                                            │                                            │
                                            │                     resolve(loaded, key, strategy) ─▶ Resolution + ExplainTrace (JSON)
                                            └─▶ loadScopeProcedures (fs) ─▶ resolveProcedures ─▶ EffectiveProcedure[] + diagnostics
consumers: nn-mcp (ROOT_DIR, resolve_effective, explain, list_blueprint_procedures{path}) · video mirror · projects fixture
```

| Module (nn-core `src/scope/`) | Pure? | Interface |
|---|---|---|
| `types.ts` | yes | `ScopeChain`, `Layer`, `Resolution`, `ExplainTrace`, procedure types |
| `chain.ts` | yes | `buildScopeChain(start, probe, parentOf)`, `findStemCollisions(paths)` |
| `fs-chain.ts` | no | `findScopeChain(path)`, `findDomainRoot(path)`, `findInChain(...)` |
| `resolve.ts` | yes | `resolve(loaded, key, strategy)`, `compareEffective(a, b)` |
| `fs-layers.ts` | no | `loadChain(chain, { floorDoc? })` |
| `procedures.ts` | yes | `resolveProcedures(input)` |
| `fs-procedures.ts` | no | `loadScopeProcedures(chain, opts)` |
| `index.ts` | — | re-exported from `src/index.ts`; pure files guarded by a `purity.spec.ts` (same pattern as `workspace/integrity/purity.spec.ts`) |

All new relative imports carry `.js` (NodeNext). The core never names a bluepriNNt,
concept or field. That rule is enforced by a test that greps the core for `video|series|projects`.

## Data Shapes

**Scope marker = values document.** A directory is a sub-scope if it holds exactly one
kNNowledge document with frontmatter `scope: true` (strict boolean, read with nn-core
`parseFrontmatter`). The domaiNN root is the nearest directory with `domaiNN_NN.md`. The
root folder MAY also hold one `scope: true` document that supplies the root's values. This
keeps bluepriNNt-typed values out of the `domaiNN` manifest. `isolate: true` on a marker
ends the chain there. A nested `domaiNN_NN.md` is a new root with an implicit isolate.

**Local values** are the `key:: value` fields of the values document's first element (in
document order, the first non-index concept section) as returned by `parseKnowledge`. `union`
operands use the existing keyed-list grammar `[name=value, …]`, an array, or an object.
Normalization moves out of `cascade.mjs` (`keyedEntries`) into `resolve.ts`.

```markdown
---
level: 3
parent_spec: { name: "projects_V_0-5-0", url: "…" }
title: "Alpha Program"
scope: true
fills:
  generate-status-report:
    audience: "steering committee"           # value filler
    post_step: { procedure: "alpha-review" } # sub-procedure filler
---
# NN Project
## NN Project: Alpha Program
priority:: high
glossary:: [risk=schedule threat, sprint=two weeks]
```

**Floor** is the single `_NN.md` under the bluepriNNt package's `defaults/` folder. The
package is the one named by the innermost values document's `parent_spec`. Video already
uses this convention (`defaults/video-defaults_NN.md`). The adapter injects the floor:
nn-mcp locates it with `resolveBlueprintPackage`, and video with its own `findBlueprintPackage`.
These two adapters make it a real seam.

**Slot declaration** goes in the procedure document's frontmatter (flag-first, so the
procedures bluepriNNt needs no change). The version comes from `knowledge_version`.

```yaml
slots:
  - { name: audience, kind: value, required: true }
  - { name: format, kind: value, required: false, default: "markdown" }
  - { name: post_step, kind: procedure, required: false, step: "Compile Health Dashboard" }
```

**Slot filling** uses `fills.<procedure-id>.<slot>` in a scope's values-document frontmatter
(see above). Per slot, the nearest scope wins (`override`). A `{ procedure: id }` filler
must resolve in the same chain.

**Fork record** goes in the frontmatter of a same-id procedure in a nearer scope:

```yaml
fork_of: { procedure: generate-status-report, scope: "", version: "V_0-1-0" }  # scope "" = root; "bluepriNNt:projects" = floor
```

If the recorded version differs from the original's current `knowledge_version`, the
result carries an `ORIGINAL_ADVANCED` warning. A same-id procedure without `fork_of` still
shadows the original and gets an `UNDECLARED_SHADOW` warning. Shadowing is never silent.

**Procedure placement** is `<scope-dir>/procedures/*_procedures_NN.md`, matching the
existing `DOMAIN_DIRS` `procedures`. Precedence, encoded in code: model `## NN Procedure:` >
nearest scope > … > root > bluepriNNt (including `includes`/`parent_spec`, first-seen,
with the rest reported as shadowed).

## Interfaces

```ts
export type JsonValue = null | boolean | number | string | JsonValue[] | { [k: string]: JsonValue }
export type MergeStrategy = 'override' | 'union'           // closed set; restrict/append deferred

export interface ScopeLink { dir: string /* domain-relative POSIX, '' = root */; valuesDoc: string | null; kind: 'root' | 'scope'; isolate: boolean }
export interface ScopeChain { root: string /* absolute, adapter-only */; links: ScopeLink[] /* outermost first */; cutAt: string | null }
export type ScopeChainResult =
  | { ok: true; chain: ScopeChain }
  | { ok: false; code: 'NO_DOMAIN_ROOT'; searched: string[] }
  | { ok: false; code: 'DUPLICATE_SCOPE_MARKER'; dir: string; markers: string[] }
export interface DirProbe { hasEntrypoint: boolean; scopeMarkers: Array<{ path: string; isolate: boolean }> }

export function buildScopeChain(startDir: string, probe: (dir: string) => DirProbe, parentOf: (dir: string) => string | null): ScopeChainResult
export function findStemCollisions(modelPaths: readonly string[]): Array<{ id: string; paths: string[] }>
export function findScopeChain(path: string): ScopeChainResult            // fs adapter, sync
export function findDomainRoot(path: string): string | null
export function findInChain(chain: ScopeChain, fromDir: string,
  target: { rel: string } | { dir: string; stem: string }, fallbackDir?: string): { path: string | null; searched: string[] }

export interface Supplier { scope: string /* dir | 'bluepriNNt:<name>' | consumer label */; doc: string | null }
export interface Layer extends Supplier { values: Readonly<Record<string, JsonValue>> }
export interface LoadedChain { floor: Layer | null; layers: Layer[] /* outermost first; consumers may append intra-document layers */; cutAt: string | null }
export function loadChain(chain: ScopeChain, opts?: { floorDoc?: { label: string; path: string } }): LoadedChain

export interface ExplainTrace {
  v: 1; key: string; strategy: MergeStrategy
  consulted: Supplier[]; cutAt: string | null
  winner: Supplier | null                                            // override
  overridden: Array<Supplier & { value: JsonValue; by: string }>
  entries?: Array<{ name: string; from: Supplier; shadowed: Array<Supplier & { value: JsonValue }> }> // union
}
export type Resolution =
  | { ok: true; key: string; strategy: MergeStrategy; present: boolean; value: JsonValue; explain: ExplainTrace }
  | { ok: false; code: 'UNSUPPORTED_STRATEGY'; strategy: string }
export function resolve(loaded: LoadedChain, key: string, strategy: string, opts?: { accept?: (v: JsonValue) => boolean }): Resolution
export function compareEffective(before: Resolution[], after: Resolution[]): Array<{ key: string; from: Supplier & { value: JsonValue }; to: Supplier & { value: JsonValue } }>

export interface SlotDecl { name: string; kind: 'value' | 'procedure'; required: boolean; default?: JsonValue; step?: string }
export interface ForkRecord { procedure: string; scope: string; version: string }
export type Filler = string | { procedure: string }
export interface ProcedureDef { id: string; scope: string; doc: string; version: string | null; slots: SlotDecl[]; forkOf?: ForkRecord }
export interface ScopeProcedures { scope: string; doc: string | null; procedures: ProcedureDef[]; fills: Record<string, Record<string, Filler>> }
export interface ProcedureDiagnostic { code: 'DUPLICATE_SLOT' | 'REQUIRED_SLOT_UNFILLED' | 'UNKNOWN_SLOT' | 'FILLER_KIND_MISMATCH'
  | 'UNKNOWN_FILLER_PROCEDURE' | 'UNDECLARED_SHADOW' | 'ORIGINAL_ADVANCED'; severity: 'error' | 'warning'; procedure: string; scope: string; detail: string }
export interface EffectiveProcedure { def: ProcedureDef; bindings: Record<string, { value: Filler | JsonValue; from: Supplier }>; shadowed: Supplier[] }
export function resolveProcedures(input: { model?: ProcedureDef[]; scopes: ScopeProcedures[]; floor: ProcedureDef[] }): { procedures: EffectiveProcedure[]; diagnostics: ProcedureDiagnostic[] }
```

`resolveProcedures` reuses the `union` strategy for the id registry and `override` for each
slot, so procedures and values share one fold. Every trace path is domain-relative, which
keeps the trace JSON-safe and machine-independent.

## Root Finder Replacement

| Call site | Today | Replacement |
|---|---|---|
| `nn-mcp/src/server.ts:66` `ROOT_DIR` | `findRepoRoot(cwd)` (`.git`) | `INNFO_DOMAIN_DIR ?? findDomainRoot(cwd) ?? cwd` |
| `nn-mcp/src/tools/cognitivize.ts:29` | `findRepoRoot(rootDir)` picks a module to `require()` from the domain path | module-location dev checkout (extract `devCheckoutRoot` from `console-regeneration.ts` into `tools/dev-checkout.ts`). This removes a domain-controlled `require`. |
| `nn-mcp/src/tools/workspace-sync.ts:63` `findManifestPath` (+ `propose-changeset.ts:56`) | prefix heuristic `domain*`/`workspace*` | `join(root, ENTRYPOINT_FILENAME)`; `walkMarkdownFiles` skips dirs that hold a nested `domaiNN_NN.md` |
| `video-guard.mjs:98` `resolveWorkspace` | `video-guard.json` walk, then `.git` | `findDomainRoot` via mirror; guard file only at `<root>/video-guard.json` |
| `recursiveParse` | not a walker (it receives the root handle) | unchanged; its callers get the root from `findDomainRoot` |

Deleted: `tools/repo-root.ts`, `tools/repo-root.spec.ts`, `findManifestPath`, `findWorkspaceRoot`.

## Invariants

| Invariant | Handling |
|---|---|
| Type-axis `includes` never overrides | Untouched. `compose.ts` stays strict, and `scope/` never reads L2 schema. Only `DeclMeta` is reused, for the floor supplier label. |
| Video "no upward escape" | Split in two. Path literals (`../../x`) still may not escape the scope root. Named lookup (`findInChain`) climbs the chain, bounded by the root or the nearest isolate. |
| Nested `domaiNN_NN.md` | New root with implicit isolate. Outer discovery stops there. |
| Global model ids | `findStemCollisions` gives a `check_domain` error naming the id and both paths. Same stem across nested domaiNNs is fine. |
| `changes/` | Stays a single root log. Changesets do not gain a scope field in this change. |
| Source visibility | `createFsSourceResolver` bounds its walk at the chain's outermost link (isolate-aware) instead of `rootDir`. |

## Slice Plan (feature-branch-chain)

Estimates exclude the generated mirror bundle, which is drift-checked and not reviewed.

| Slice | Content | Deletes | ~Lines |
|---|---|---|---|
| G0.1 | `chain.ts`, `fs-chain.ts`, `findStemCollisions`, fixture `nn-core/tests/fixtures/scoped-portfolio/` (3+ depths, isolate, nested domaiNN, collision), purity spec | — | 380 |
| G0.2 | nn-mcp swaps above, `dev-checkout.ts`, collision diagnostic in `check-workspace.ts` | `repo-root.ts`(+spec), `findManifestPath` | 300 |
| G0.3 | Rename `scripts/build-trannsform-core-mirror.mjs` to `build-core-mirrors.mjs` with a second target `src/scopePrimitives.ts` → `nn-video-script/scripts/lib/nn-core.generated.cjs`; `resolveWorkspace` on `findDomainRoot`; `verify.js` `--check` | `.git` and guard-walk branches, `findWorkspaceRoot` | 220 |
| G1.1 | `resolve.ts`, `fs-layers.ts`, explain round-trip tests | — | 380 |
| G1.2 | `compareEffective`; isolate-bounded `fs-source-resolver.ts` | `rootDir` walk bound | 150 |
| G2.1 | `procedures.ts`, `fs-procedures.ts`, fixture procedures (slots, fills, fork, undeclared shadow) | — | 380 |
| G2.2 | `spec.ts` `discoverTransitiveAssets`: shadowed entries reported, not dropped | silent `seenProcIds` skip | 150 |
| G3 | `tools/resolve-effective.ts` (`resolve_effective`, `explain`); `list_blueprint_procedures` gains `path` and returns `shadowed`/`forks`/`diagnostics`; `skills/nn-innfo/SKILL.md` §16-bis.2 precedence; `mcp-tools.md` | prose-only precedence | 350 |
| A1 | Video params on `resolve` via mirror (call sites: `asset-cost-estimator`, `asset-synthesizer`, `build-script-from-draft`, `render-thumbnail`, `scene-compiler`, `synthesize-avatar`, `video-engine-cli`, `lib/tts-options`). The `cli/layer/scene/video` levels become appended layers. | `cascade.mjs`; `cascade.test.mjs` ported | 400 |
| A2 | `findNearest*` → `findInChain`; series = innermost scope; folder-contract check | `nearest.mjs`, `SERIES_MARKERS` | 300 |
| A3 | `video_NN` domaiNN data (outside this repo): `scope: true` markers, one slotted `draft_scene_visuals` at root | — | n/a |
| B | `projects`: portfolio→program→project fixture; `generate-status-report` gains `slots:`; `priority` declared for `Project`; `template_version` bump | — | 300 |

Each slice reverts on its own. Dependencies: G0.1 → G0.2/G0.3 → G1 → G2 → G3; A1–A2 need G0.3+G1+G2; B needs G2.

## Testing Strategy (strict TDD seams)

| Layer | Seam | Approach |
|---|---|---|
| Unit | `buildScopeChain(start, probe, parentOf)` | in-memory probe map; no fs |
| Unit | `resolve`, `resolveProcedures`, `compareEffective` | literal `LoadedChain` / `ScopeProcedures`; `JSON.parse(JSON.stringify(r))` deep-equal on every result |
| Integration | `findScopeChain`, `loadChain`, `loadScopeProcedures` | `scoped-portfolio` fixture plus `mkdtemp` cases (no `.git`, `.git` above root) |
| Integration | nn-mcp tools | `server.spec.ts` / new `resolve-effective.spec.ts` against the fixture |
| Consumer | video | existing `node --test` suites, run against the mirror |
| Guard | core genericity, purity, mirror drift | grep test; `purity.spec.ts`; `build-core-mirrors --check` in `verify.js` |

## Decision Log (living — every phase PR appends dated entries)

| Date | Decision | Rejected | Why |
|---|---|---|---|
| 2026-10-28 | Scope declared by frontmatter `scope: true` first; L2 declaration arrives with the next L1 (with `inherit::`) | L1/L2 change now | Ships without a spec-version cascade |
| 2026-10-28 | Generic first in nn-core; video is the first consumer only | Video-local fix | Rule of two consumers |
| 2026-10-28 | Single-parent containment; other memberships are non-cascading facets | Multi-parent, `extends` | Deterministic fold, simple explain |
| 2026-10-28 | `changes/` stays one root transaction log | Per-scope `changes/` | Lock, conflicts and review queue stay single |
| 2026-10-28 | No lockfile yet; `ExplainTrace` is versioned plain JSON | Materialize now | Keeps the future lockfile a small task |
| 2026-10-28 | Root is never found via `.git`; nearest `domaiNN_NN.md` only | `.git` fallback | A domaiNN must not need git |
| 2026-10-28 | `projects` is the second consumer | `organization`, `procedures` | Containment by nature, has procedures |
| 2026-10-28 | Values come from the `scope: true` document's first element; the root may add one beside `domaiNN_NN.md` | Values in `domaiNN_NN.md`; frontmatter `values:` map | Typed kNNowledge; no `domaiNN` schema pollution |
| 2026-10-28 | Floor = bluepriNNt `defaults/` document, injected by the adapter | Field-level `default::` in L2 | Already used by video; no L2 change |
| 2026-10-28 | Precedence: model > nearest scope > root > bluepriNNt | Prose order "blueprint > domain" (§16-bis.2) | The bluepriNNt is the floor; the domaiNN is more specific |
| 2026-10-28 | Slots, fills and `fork_of` live in frontmatter | New procedures L2 fields | Same flag-first stance as `scope: true` |
| 2026-10-28 | Extend `list_blueprint_procedures` with `path`; no rename | `list_procedures` + delete | 16 files reference the name |
| 2026-10-28 | Video uses nn-core through a generated CJS mirror | Runtime import; copy | Skills install where nn-core is absent; precedent `nn-sources` |
| 2026-10-28 | Only `override` and `union` exist; `MergeStrategy` is a closed union | Plugin registry | No speculative generality |

## Open Questions

- [ ] When nn-mcp starts outside any domaiNN, `ROOT_DIR` falls back to `cwd`. Today a repo subfolder resolves to the repo root, and that changes. Is that acceptable?
- [ ] Adoption B edits files in the `projects` package, which needs a `template_version` bump and a templates tag/repin. Should that ship inside this umbrella?
