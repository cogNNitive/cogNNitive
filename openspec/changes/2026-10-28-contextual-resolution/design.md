# Design: Contextual Resolution — Scope Chain and Typed Cascade

One new nn-core module, `scope/`, owns three things: finding the root and scopes, folding
values over the chain, and resolving procedures. As of the 2026-10-28 re-slice the fold takes
an abstract `ScopeNode[]` chain (see "Scope Nodes" below); folder containment is only the
first adapter that produces nodes. Each has a pure core and a thin Node
adapter. nn-mcp and the video-script skill call it and delete their own walkers. Video
reaches it through the generated-CJS mirror pattern that `nn-sources` already uses.

## Technical Approach

```
path ─▶ folder adapter: findScopeChain (fs) ─▶ ScopeChain ─▶ loadChain (fs, parseKnowledge) ─▶ ScopeNode[] (+ floor)
        element adapter (later): document + heading ─▶ ScopeNode[]                                  │
                                                                  resolve(nodes, key, strategy) ─▶ Resolution + ExplainTrace (JSON)
                                                                  resolveProcedures(nodes…) ─▶ EffectiveProcedure[] + diagnostics
consumers: nn-mcp (ROOT_DIR, resolve_effective, explain, list_blueprint_procedures{path}) · video mirror · LC_programas (element scopes)
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
concept or field. That rule is enforced by a test that greps the core for `video|series|projects|programa`.

## Scope Nodes (2026-10-28 re-slice)

Evidence from real domaiNNs: most containers are elements inside documents, not folders. The
fold therefore never sees paths. An adapter turns a location into an ordered chain of nodes
(outermost first); `resolve`, `resolveProcedures` and `explain` only see nodes.

```ts
export interface ScopeNode {
  id: string          // stable, domain-relative, JSON-safe ('' = root; 'series/x'; later 'doc#programa-02')
  kind: string        // adapter-defined label ('root' | 'scope' | 'element'); the core never branches on it
  doc: string | null  // supplier document, domain-relative
  isolate: boolean
  values: Readonly<Record<string, JsonValue>>
  fills?: Record<string, Record<string, Filler>>
  procedures?: ProcedureDef[]
}
export type ScopeChainOf = (location: string) => { nodes: ScopeNode[]; cutAt: string | null }  // adapter contract
```

Lote 1 ships only the folder adapter (`ScopeChain` + `loadChain` produce `ScopeNode[]`). The
element adapter is deferred (trigger: Lote 1 conclusions; consumers LC_programas and video
episodes). `Layer`, `Supplier` and `LoadedChain` below are read as views over `ScopeNode`:
`Layer = Supplier + values`, `LoadedChain = { floor: ScopeNode | null; nodes: ScopeNode[]; cutAt }`.
Signatures that say `resolve(loaded: LoadedChain, …)` keep their shape; `layers` becomes `nodes`.

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

## Lot Plan (feature-branch-chain; replaces the earlier Slice Plan)

> Superseded by the 2026-10-28 value-first re-slice entry. The earlier G0.1..B slice plan is
> kept in git history. Old ids map to lots as shown; `tasks.md` carries the concrete ids.

Estimates exclude generated mirror bundles.

| Lot | Content | Old ids | ~Lines |
|---|---|---|---|
| L0.1 | `findDomainRoot` in nn-core; nn-mcp `ROOT_DIR`; `cognitivize.ts` stops `require()`-ing from a domain-found root (resolve via `dev-checkout.ts`); delete `repo-root.ts` | G0.2 | 250 |
| L0.2 | Model-id collision detection (`findStemCollisions`) surfaced as a `check_domain` / manifest-sync diagnostic | G0.1 (collisions), G0.2.3 | 150 |
| L0.3 | Test-first check that `sources/` files are discovered as models; exclude `sources/` if so, else close with evidence | exploration bug note | 80 |
| L1 | `src/scope/`: `ScopeNode`, folder adapter, fold (`override` + `union`), explain, slots and fork recording, generic fixture, golden validation script plus reduced committed fixture | G0.1, G1.1, G2.1 (pure) | 700 |
| L1 checkpoint | Conclusions into the decision log; re-plan `tasks.md` | new | docs |
| L2+ | Element adapter; source-visibility bound and `compareEffective`; procedure precedence in nn-mcp (`spec.ts`); `resolve_effective` / `explain` tools and SKILL.md; video adoption (mirror, `cascade.mjs`, `nearest.mjs`, `draft_scene_visuals` slots); LC_programas adoption; `restrict` for `allowedModels` | G1.2, G2.2, G3, A1-A3, B | re-planned |

Each lot reverts on its own. Dependencies: L0.1 before L1 only for `findDomainRoot`; L0.2 and L0.3 are independent; L2+ needs the L1 checkpoint.

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
| 2026-10-28 | Generic first in nn-core; video is the first consumer only | Video-local fix | Rule of two consumers (second consumer revised by the LC_programas entry) |
| 2026-10-28 | Single-parent containment; other memberships are non-cascading facets | Multi-parent, `extends` | Deterministic fold, simple explain |
| 2026-10-28 | `changes/` stays one root transaction log | Per-scope `changes/` | Lock, conflicts and review queue stay single |
| 2026-10-28 | No lockfile yet; `ExplainTrace` is versioned plain JSON | Materialize now | Keeps the future lockfile a small task |
| 2026-10-28 | Root is never found via `.git`; nearest `domaiNN_NN.md` only | `.git` fallback | A domaiNN must not need git |
| 2026-10-28 | `projects` is the second consumer | `organization`, `procedures` | Containment by nature, has procedures. **Superseded by the 2026-10-28 LC_programas entry** (no real `projects` consumer) |
| 2026-10-28 | Values come from the `scope: true` document's first element; the root may add one beside `domaiNN_NN.md` | Values in `domaiNN_NN.md`; frontmatter `values:` map | Typed kNNowledge; no `domaiNN` schema pollution |
| 2026-10-28 | Floor = bluepriNNt `defaults/` document, injected by the adapter | Field-level `default::` in L2 | Already used by video; no L2 change |
| 2026-10-28 | Precedence: model > nearest scope > root > bluepriNNt | Prose order "blueprint > domain" (§16-bis.2) | The bluepriNNt is the floor; the domaiNN is more specific |
| 2026-10-28 | Slots, fills and `fork_of` live in frontmatter | New procedures L2 fields | Same flag-first stance as `scope: true` |
| 2026-10-28 | Extend `list_blueprint_procedures` with `path`; no rename | `list_procedures` + delete | 16 files reference the name |
| 2026-10-28 | Video uses nn-core through a generated CJS mirror | Runtime import; copy | Skills install where nn-core is absent; precedent `nn-sources` |
| 2026-10-28 | Only `override` and `union` exist; `MergeStrategy` is a closed union | Plugin registry | No speculative generality |
| 2026-10-28 | The fold takes an abstract `ScopeNode[]` chain, not paths. Folder adapter ships first; element adapter later (trigger: Lote 1 conclusions; consumers LC_programas and video episodes) | Folder-only chain; element scopes via fake folders | Real review of 8 domaiNNs: only `video_NN` is hierarchical by folder; most containers are elements inside documents (`## NN Programa`, `## NN Video`, accounting Periods) |
| 2026-10-28 | LC_programas replaces `projects` as the second consumer (Programa as element scope; `precio_hora_tutoria` "84" and tutor identity repeated in 6 orders -> override; `Lean_Business_Plan_*` hardcoded paths -> slots). It follows the element adapter. `projects` becomes deferred: "no real consumer" | `projects` (no consumer); `organization`; `procedures` | An evidence-backed consumer beats a hypothetical one; also makes the earlier Q7 (projects release cost) moot |
| 2026-10-28 | No root-marker fallback. `video_NN`, `transcriptions_NN` and `Electricidad_NN` lack `domaiNN_NN.md`; real domains get it via adoption or the new-domain recipe; validation adds it only to a temp copy | Falling back to lineage records such as `video_NN_cogNNitive_NN.md` | No backwards-compat code; one marker, one finder |
| 2026-10-28 | Value-first lot order: Lote 0 independent fixes (root finder, collision detection, `sources/` check) as small PRs, then Lote 1 pure walking skeleton, then a checkpoint before Lote 2+ | Phase order G0 -> G3 -> adoption | Collisions are already real (40+ `script.md`; duplicated `NoticiasVillabotijos_noticias_NN.md` in 2 series) and the `.git` root finder plus `cognitivize.ts` `require()` are live defects; none needs the cascade. Supersedes the earlier slice plan |
| 2026-10-28 | Golden validation: temp COPY of `video_NN-backup-2026-10-27_193914` with `domaiNN_NN.md` added; chain [episode, series, root]; innteresante -> jazz.mp3, villabotijos-today -> pasodoble-loop.m4a at 0.06; `draft_scene_visuals` composed (1 definition + 2 slot fills) equals both copies modulo naming noise; explain serializes. Local/manual script plus a reduced committed fixture; CI never reads the real path | Test against the live domain; CI test on the real path | Safe oracle never mutated; reproducible in CI through the reduced fixture. Candidate slots: presenter_persona, tools_invocation, scene_structure, attribution_overlay, render_notes, finalize_fields; `select_*_news` trio: news_sources, topic_filter, news_model_ref |
| 2026-10-28 | `restrict` trigger is met by `video-guard.json` `allowedModels`; scheduled after the MCP slice, not in Lote 0/1 | Implement now | Keeps Lote 1 to `override` + `union`; ~25 backup folders keep the lockfile deferred |
| 2026-10-28 | L0.1 applied. `findDomainRoot(path)` lives in `nn-core/src/scope/root.ts` (nearest `domaiNN_NN.md`, file or directory input, no `.git`, returns `null` on a miss). nn-mcp `resolveRootDir(cwd, env)` = `INNFO_DOMAIN_DIR ?? findDomainRoot(cwd) ?? cwd` (exported so it is testable; `ROOT_DIR` is its evaluation). Q1 resolved by the maintainer: no marker and no env falls back to `cwd`, never `.git` | Root-marker fallback to `.git`; `searched` list on the miss now | One finder, no backwards-compat. The `searched: string[]` miss report of the spec arrives with `findScopeChain` (`NO_DOMAIN_ROOT`) in L1.1; `findDomainRoot` returns plain `null` |
| 2026-10-28 | L0.1: `cognitivize.ts` `resolveNormalizer` no longer `require()`s anything derived from the domain: removed the `findRepoRoot(rootDir)` candidate AND the explicit `<rootDir>/skills/nn-sources/...` candidate (both let a planted file execute). Search order is now `INNFO_SOURCES_DIR`, the dev checkout this module runs from (`tools/dev-checkout.ts`), `~/.agents/skills/nn-sources`. `devCheckoutRoot({ startDir?, requires? })` is extracted from `console-regeneration.ts` (the console keeps its extra `scripts/export-console.mjs` requirement through `requires`) | Keeping the `<rootDir>/skills` candidate | The test "a normalizer planted in a domain-found root is never `require()`d" cannot pass while the `rootDir` candidate exists; tasks.md only named the `findRepoRoot` line. A domain-local normalizer is no longer supported (no compat code) |
| 2026-10-28 | L0.1.7: `syncWorkspaceManifest` / `resolveWorkspaceId` take `join(root, ENTRYPOINT_FILENAME)` only (the `domain*`/`workspace*` prefix heuristic and `findManifestPath` are gone; a lone `workspace_NN.md` is no longer a manifest). `walkMarkdownFiles` skips any child directory holding its own `domaiNN_NN.md`. Q3 resolved by the maintainer: a nested `domaiNN_NN.md` is its own root and outer manifest sync does not descend into it | Keeping a legacy manifest-name fallback | No backwards-compat. Follow-up (not done in L0.1): core `listKnowledge`/`collectModels` (used by `list_models` and `check_domain`) still descends into a nested domaiNN; the spec scenario only covers the manifest, so it is left for L1.1/L2 |
| 2026-10-28 | L0.1.8: deleted `tools/repo-root.ts` + spec. A search of `nn-mcp/src` finds no `.git`-based root lookup; remaining `.git` mentions are directory skip lists. The video `findWorkspaceRoot` is out of scope (video adoption, Lote 2+) | - | Matches the tasks.md "Out of scope" note |
| 2026-10-28 | L0.2 applied. Call sites (L0.2.1): ids are filename stems produced by `nn-core/src/helpers.ts` `collectModels` (`id = entry.name` minus `.md`; both documents are returned, then `nn-mcp` `readKnowledge`/`validateKnowledge` resolve by id and silently take the first, which is the silent drop); `check-workspace.ts` `discoverModels` and `workspace-sync.ts` `discoverCandidates` feed the two diagnostics. `findStemCollisions(paths)` + `stemCollisionMessage` live in `nn-core/src/scope/stem-collision.ts` (pure, dedupes repeated paths, normalizes `\`, sorted). nn-mcp `tools/model-collisions.ts` maps them to `{ code: 'MODEL_ID_COLLISION', severity: 'warning', id, paths, message }`, returned as `collisions` by `check_domain` (alongside `lineage`) and `sync_domain_manifest` (always present, `[]` when clean) | Hard error (`check_domain` error per the Invariants table); scope-qualified ids | Real data has 40+ `script.md` and a duplicated `NoticiasVillabotijos_noticias_NN.md`: a hard failure would block existing domaiNNs. The Invariants row "check_domain error" is therefore softened to a warning until a rename path exists (Deferred: scope-qualified ids) |
| 2026-10-28 | L0.2: `collectModels` (core `listKnowledge`, used by `list_models`/`check_domain`) now skips child directories holding their own `domaiNN_NN.md`. This closes the L0.1 follow-up for Q3 and makes "same stem across nested domaiNNs is fine" true without extra parameters on `findStemCollisions` | A `nestedRoots` parameter on `findStemCollisions` | Discovery stopping at the nested root is the one rule; the collision finder stays a pure function over one domaiNN's paths |
| 2026-10-28 | L0.3 reproduced and fixed. RED: `workspace-sync.spec.ts` "never lists a raw import under sources/ as a model" listed `sources/import/foo_NN.md` and `sources/import/old-domain/bar_NN.md` as added models (plus the core predicate case in `tests/naming/contract.test.ts`), because `IGNORED_DIRECTORIES` lacks `sources` and the imported old tree keeps `level: 3` + a model `parent_spec`. Fix in the shared predicate `isModelCandidate` (`naming/contract.ts`): a path whose first segment is `sources` is never a model. This covers `listKnowledge`/`check_domain`, `isReconcilableModel` (manifest sync) and the lineage projection with one rule. `IGNORED_DIRECTORIES` and `isExcludedPath` are intentionally NOT widened (they also drive `recursiveParse` and citation resolution, where `sources/` content must stay visible). Deviation from tasks.md L0.3.2 ("at the discovery site found in L0.2.1"): the shared predicate is that site. Not done: `isConsoleModel` still treats such a file as a console model; revisit if the console shows imports | Widening `IGNORED_DIRECTORIES` | Blast radius: `sources/` must remain walkable for citations and lineage |
| 2026-10-28 | L1.1 applied. `buildScopeChain(startDir, probe, parentOf)` is pure over opaque directory keys and returns `ScopeChain { root, links, cutAt }`; `findScopeChain(path)` (fs adapter) takes the root from `findDomainRoot` (the single root finder; when it misses, the pure builder is run over an empty probe only to list `searched`), reads markers with `parseFrontmatter`, and converts links, `valuesDoc` and `cutAt` to domain-relative POSIX (`root` stays absolute). Markers are `_NN.md` documents only (`parseName(...).kind === 'nn'`, no sidecars, never `domaiNN_NN.md`), listed in sorted order; `scope` and `isolate` are strict booleans (this settles Q2: `isolate: "true"` is NOT an isolate). `ScopeNode` lives in `types.ts` without `fills`/`procedures` (added in L1.3 when they have a test). Two refinements to the plan: (a) an isolate ends the links but the walk still finds the root, so an isolated scope outside any domaiNN is a `NO_DOMAIN_ROOT` miss and `root` is always the domaiNN root; (b) a directory with two markers ABOVE an isolate cut is ignored, because it is not part of the chain. `findInChain(chain, { rel })` ships without the `{ dir, stem }` form, `fromDir` and `fallbackDir` of the design signature: no spec scenario or consumer exercises them yet (video adoption, Lote 2+, adds them with a test) | Reading `findDomainRoot` inside the pure builder; a probe returning domain-relative names | One root authority and a pure core; domain-relative output keeps chains machine-independent. The unused `findInChain` options would be speculative |
| 2026-10-28 | L1.1: purity and genericity guard (`scope/purity.spec.ts`): pure modules (`types`, `chain`, `stem-collision`, and later `resolve`/`procedures`) may not import `node:*`, an fs adapter, nor use clock or randomness; every non-spec file of `src/scope/` is grepped for `\b(video|series|projects?|programa)\b`. The genericity guard went RED on its first run (a `'series/x'` comment example in `types.ts`), so it has teeth. Mutation checks done: removing the isolate branch turns two `chain.spec` cases red; adding a `node:fs` import to `chain.ts` turns the purity case red | - | Tasks L1.1.6/L1.1.7 |
| 2026-10-28 | L1.2 applied. `resolve(loaded, key, strategy: string)` in `scope/resolve.ts`; `LoadedChain` is `{ floor: ScopeNode \| null; nodes }` with no `cutAt` field: the fold itself honours `ScopeNode.isolate` (nearest isolate wins, nodes before it are hidden, the floor never is) and reports it as `explain.cutAt`, so a literal `ScopeNode[]` behaves like a chain built by the adapter. Departures from the design signatures: no `accept` option (no scenario needs it; the video typed-parameter skip returns with video adoption), `Candidate = Supplier + { value, by }` is used for BOTH `overridden` and union `shadowed` (the design's `shadowed` had no `by`, the spec asks for the displacing scope), and the union trace gains `skipped` (items that are not `name=value`, e.g. a number or a bare word, are listed with their supplier instead of dropped as `cascade.mjs` did). Union result value is `Array<{ name, value }>` (not an object, so key order cannot be reshuffled by integer-like names) ordered by SUPPLYING scope outermost first, then declaration order: with root `[risk, issue]` and alpha `[milestone, risk]` the result is `issue, milestone, risk`. Keyed-list forms accepted: bracketed or bare comma string, array of `name=value` strings, object (`parseKnowledge` already yields an array of strings for `[a=b, c=d]` and numbers/booleans for scalars) | Returning `cutAt` from the adapter only; first-appearance ordering of union entries | A pure fold must be correct on literal nodes; supplier ordering is the reading that matches "outermost scope first" in the spec |
| 2026-10-28 | L1.2: `loadChain(chain, { floorDoc?: { label, path } })` (`scope/fs-layers.ts`) builds one `ScopeNode` per link from the first element of the first concept section that has one (an `# NN index` holds none), via `parseKnowledge`; non-JSON field values are coerced to text. The floor node is `{ id: 'bluepriNNt:<label>', kind: 'floor', doc: <basename>, ... }`: machine-independent, the absolute path never reaches a trace. No `findFloorDoc(packageDir)` helper was built: locating "the single `_NN.md` under `defaults/`" is the consumer's job (nn-mcp `resolveBlueprintPackage`, video `findBlueprintPackage`) and nothing in Lote 1 needs it. Mutation check: nulling the floor turns 5 `fs-layers` cases red | A core-side package locator | The core stays ignorant of package layout beyond the injected document |
| 2026-10-28 | L1.3 applied (pure side). `resolveProcedures(loaded, { model? })` in `scope/procedures.ts` takes the same `LoadedChain` as `resolve` (slot fillers and procedures hang off `ScopeNode` as `fills` and `procedures`, so there is no separate `ScopeProcedures` type). Precedence in code: model, then nodes nearest to farthest, then the floor; per id the first is selected and every other definition is listed in `shadowed` with the displacing scope (`selected + shadowed == found`, tested), selected procedures sorted by id. Slots reuse the SAME `override` fold: for each slot a synthetic chain holds only that slot's accepted fillers and `resolve` picks the nearest (so `Binding.shadowed` carries the displaced fills, nearest first); the id registry does NOT go through `union` (a direct first-wins grouping gives the same nearest-wins plus shadowed list without encoding procedures as keyed strings) | Encoding `ProcedureDef`s as `union` entries; a second `ScopeProcedures` input type | One fold for values and fills; the registry needs no string round trip |
| 2026-10-28 | L1.3 slot contract details. `Filler` is any `JsonValue` (not `string \| { procedure }` as in the design) because a value slot legitimately takes a number or a list; a sub-procedure filler is exactly `{ procedure: id }` and the kind check is `kind === 'procedure'` XOR "is a reference". A filler that fails a check (`UNKNOWN_SLOT`, `FILLER_KIND_MISMATCH`, `UNKNOWN_FILLER_PROCEDURE`) is reported and EXCLUDED from binding, so a bad nearest filler lets a valid farther one bind (never coerced). Any scope of the visible chain or the floor may fill a slot; there is no "only scopes below the definition" rule. `UNDECLARED_SHADOW` is raised for scope-over-scope and scope-over-floor shadows, not for a model procedure shadowing a scope one (the model-over-workspace case is already a reported `shadowed` entry and is the documented precedence). `ORIGINAL_ADVANCED` compares the recorded `fork_of.version` with the shadowed original's `knowledge_version` (string inequality; a missing version counts as different); a fork whose original is not in the chain produces nothing (no code exists for it, noted as a gap). Two diagnostic codes were added to the closed set: `INVALID_SLOT_DECL` and `INVALID_FORK_RECORD`, emitted by the loader so a malformed `slots:` / `fork_of:` is never silently dropped | Silent drop of malformed declarations; coercing a mismatched filler | Matches the spec's "MUST NOT silently ignore or coerce" |
| 2026-10-28 | L1.3 folder side. `loadChain` also attaches `fills` from the marker document's frontmatter (it already parses the document), so `loadScopeProcedures(chain, loaded)` only adds `procedures` and returns `{ loaded, diagnostics }` (the loader diagnostics above). Procedures are the `*_procedures_NN.md` documents under `<scope dir>/procedures/`, id from `procedureIdOf` (filename), version from `knowledge_version`, `slots:` and `fork_of:` from frontmatter; scopes without the folder keep their node object unchanged. Not done: loading the floor's (bluepriNNt) procedures (nn-mcp resolves them via `resolveBlueprintPackage`, Lote 2+), and the root-scope reading of `workspace/procedures/` (Q4) which belongs to the nn-mcp `spec.ts` change. Fork finding: a fork must redeclare every slot the fills address, because fills are checked against the SELECTED definition (the fixture's p1 fork copies all three slots; with one slot the alpha fills raised `UNKNOWN_SLOT`) | Reading `workspace/procedures/` now | Keeps Lote 1 free of nn-mcp |
| 2026-10-28 | L1.4 golden validation done. Committed side: reduced fixture `tests/fixtures/video-golden/` (+ `video-golden-blueprint/defaults/` as the floor) and `src/scope/golden.spec.ts` (12 cases, written RED against the missing fixture, then GREEN; mutating the override winner turns 2 red). Manual side: `scripts/dev/validate-scope-golden.mjs <dir> [--keep]` (path differs from tasks.md `scripts/golden-video-validate.mjs`, per the batch brief) copies the domain to a temp folder, adds markers to the COPY, runs the real adapters (`findScopeChain`, `loadChain`, `loadScopeProcedures`, `resolve`, `resolveProcedures`) and re-hashes the source. Run on the text-only copy of `video_NN-backup-2026-10-27_193914` (600 files with the added `domaiNN_NN.md`): 30/30 assertions pass, source hash unchanged. Chains (outermost first): episode `[root, series/innteresante, series/innteresante/assets/bosco-verticale]` and `[root, series/villabotijos-today, .../boa-constrictor-suelta]`; a series-level document gets `[root, series]`. Values: innteresante music `../../shared/music/jazz.mp3` (jazz.mp3), volume 0.4, voice LucasCervera02; villabotijos-today music `../../shared/music/pasodoble-loop.m4a` (pasodoble-loop.m4a), volume 0.06, transition fade, voice Villabotijos01; the transition of innteresante comes from the blueprint floor (`none`). Every explain trace round-trips through JSON (11 resolutions, union included) | Testing against the live domain; asserting values the script itself just authored without a second source | The expected music comes from the maintainer brief and is cross-checked against `script_template.md` / `video.series.json`; the voice is checked against all 8 `## NN Video` blocks of each series (8/8 agree) |
| 2026-10-28 | L1.4 FINDINGS (data vs fold, reported not patched). (1) innteresante: `script_template.md` says volume 0.4 but 5 of 8 episode scripts use 0.06 (bosco-verticale, camuflaje-digital, ciberseguridad-rgpd-ia, esquizofrenia-diagnostico-ia) or 0.2 (robo-carga-centros-de-datos); `ciberseguridad-rgpd-ia` uses `elevator.mp3` instead of jazz.mp3. villabotijos-today: `casimiro-mahou` volume 0.1 (1 of 9), two scripts omit the volume. These per-episode values sit on the FIRST SCENE element (`## NN Scene`) of the script, not on its Video element, so a folder adapter that reads the marker's first element cannot express them: element-adapter need (the scene/Video elements are the real override level, cascade.mjs `scene > video > series`). (2) Series values are scattered in three shapes: prose + `script_template.md` (innteresante), `video.series.json` (villabotijos-today), and `voice_id::` repeated in every `## NN Video` block of the series doc (8/8 equal in each series); `video-guard.json` `voices` maps LucasCervera02 to series `inntrevistas` and Villabotijos01 to `cosicah-explicas...`, contradicting the data. Hoisting them into one `scope: true` marker per series is expressible; the marker needs a UNIQUE stem (`<series>_scope_NN.md`) because model ids are global filename stems (a fixed `series_NN.md` would be one of the L0.2 collisions). (3) Episodes become folder scopes only by adding `scope: true` to the episode script (the Video element is its first element and carries no music), so for folders the episode node adds nothing today. (4) Procedures live in `series/<s>/procedure/` (SINGULAR) in both series; the loader reads `<scope>/procedures/`. (5) `findStemCollisions` over the 96 `_NN.md` documents outside `sources/` and `.moves_backup/` reports 5 collisions: NoticiasVillabotijos_noticias_NN x2, draft_scene_visuals_procedures_NN x2, generate_video_script_procedures_NN x5, select_weird_news_procedures_NN x2, spec_NN x7. (6) `loadScopeProcedures` only reads the chain, so the floor's (blueprint) procedures and `workspace/procedures/` are not covered | - | Inputs to the Lote 1 checkpoint and the element-adapter design |
| 2026-10-28 | L1.4 `draft_scene_visuals` result. Normalization (explicit, in the script and mirrored in `golden.spec.ts`): drop the frontmatter (the two copies differ only in `knowledge_version` and `title`), drop the `> This is an **iNNfo document**` banner (typo variant), replace series name / doc name / slug and the presenter (Lucas, Celedonio) by tokens, trim, collapse blank runs. Residual after normalization: 272 vs 272 lines, 255 shared, 14 hunks, 17 lines on each side = 6.3% of the larger copy; without the name tokens the same diff has 30 hunks, so 16 were naming noise. Reading the 14 hunks by hand, 11 fit the six candidate slots: tools_invocation 4 (build-draft-html, build-script-from-draft, asset-cost-estimator, the engine path), presenter_persona 2 (steps 'previous to the draft' and the portrait definition), scene_structure 2, attribution_overlay 1, render_notes 1 (render order), finalize_fields 1 (formats); 3 need extra slots: the one-line summary, the video-config bullet (3 lines) and the avatar-model rule (2 lines). The composition (1 root definition `procedures/draft-scene-visuals_procedures_NN.md` with 14 required value slots + one `fills:` table per series marker) goes through the real loaders and `resolveProcedures` with zero diagnostics and reproduces both copies exactly. CAUTION: the fills are derived from the diff, so exact equality is true by construction; what the run proves is that the slot machinery carries real-size multi-line fills through YAML, the loaders and the fold, and that the divergence is 6.3% | Claiming the equality as evidence of the slot model | Honest reading: the evidence is the residual size and the pipeline, not the equality |
| 2026-10-28 | L1.4 slot-design friction for the checkpoint. (a) Slots here are whole Spanish paragraphs, not parameters: only persona names and tool paths look like parameters, the rest is prose a series rewrites. A slot per paragraph (14) is workable but heavy; the lever for reducing it is to keep series copies convergent, not richer slots. (b) The body templating (`{{slot:name}}` tokens substituted from bindings) is NOT part of the core: `golden.spec.ts` and the script each carry a 5-line `compose`. If the nn-mcp tools (Lote 2+) must return a composed procedure, a core `composeProcedure` is the next candidate, with its own test. (c) A fork must redeclare every slot the fills address (fills are checked against the selected definition). (d) The real procedures use `## NN Procedure` / `## NN Step` bodies; slot tokens inside steps keep the document valid kNNowledge only if the token sits inside a field or paragraph, which the reduced fixture respects but a validator run on the slotted definition was not done | - | Lote 1 checkpoint inputs |
| 2026-10-28 | L1.C.1 Lote 1 checkpoint conclusions. (1) The core holds: an abstract `ScopeNode` chain, `override` + `union`, a JSON-serializable explain and procedure slots run unchanged on real data (30/30 on the video copy, nn-core 1885 tests, no video identifiers in `src/scope/`). Keep the module shape. (2) The folder adapter is necessary but not sufficient: on the only hierarchical domain, the values that actually vary (music, volume, voice) live in ELEMENTS (first `## NN Scene`, every `## NN Video` block), not in folder markers. The element adapter is the highest-value next step, not MCP. (3) The first direct user value of the cascade is DRIFT VISIBILITY, not deduplication: explain surfaced 5 of 8 innteresante episodes deviating from the series template, one different track, and a `video-guard.json` voice map that contradicts the data. A read-only "effective values and deviations per scope" report is cheap on top of `resolve` + explain. (4) Slots work mechanically but are prose-sized (14 paragraph slots for one procedure; the composed equality is by construction). Do not build richer slot features yet; add a core `composeProcedure` only when an nn-mcp tool must return a composed procedure. (5) Model ids as global stems now block scope markers (unique `<scope>_scope_NN.md` stems needed) and produce 5 real collisions (`spec_NN` x7, `generate_video_script_procedures_NN` x5): the deferred "scope-qualified model ids" item has met its trigger. (6) Data hygiene found by the run (`procedure/` vs `procedures/`, scattered series values) belongs to video adoption, not to the core | Going straight to MCP tools; expanding slot features | Evidence from the golden run; value-first ordering |
| 2026-10-28 | L1.C.2 re-plan of Lote 2+ (maintainer order, binding): L2.1 element adapter (a: pure + spec, b: fs loader + video scenes and LC_programas Programas), L2.2 drift report (a: pure `driftReport`, b: CLI `scripts/dev/scope-drift.mjs`), L2.3 MCP (a: `resolve_effective`/`explain`, b: scope-aware procedure listing, precedence only in core `resolveProcedures`, floor and `workspace/procedures/`), L2.4 scope-qualified ids (spike, hard maintainer gate, provisional 3 PRs), L2 checkpoint, then Lote 3 adoptions (L3.1 video skill a/b/c, L3.2 video data, L3.3 LC_programas data). The deferred items "element adapter" and "scope-qualified ids" are scheduled; "source visibility" and the `compareEffective` marker-move warning move back to Deferred (no ordered slice needs them); `restrict` is placed at the L2 checkpoint; drift as an MCP tool and `composeProcedure` stay deferred with triggers. Drift CLI before MCP tool: it is the thinnest surface with direct maintainer value (no schema, registration, tool-list test or docs). The drift report is a pure function over `resolve`: per scope and key a baseline, units that deviate from it, and variants (a UNIT is caller-chosen: the leaf, or the supplying document for video episodes, which is what makes "5 of 8 episodes" computable when the values sit on scenes); `union` keys are listed as skipped, never omitted silently | Planning the MCP tools first; a drift MCP tool in L2.3; folding L2.4 into L2.3 | Evidence in L1.C.1: the real variance lives in elements, and the first direct value is visibility of deviations |
| 2026-10-28 | Element-scope marker PROPOSAL (confirmed as Q10 on 2026-10-28, see the entry below). The document frontmatter declares scope concepts: `scope_elements: [{ concept: Video }, { concept: Scene }]`, optional `parent: <field>` holding a `[[title]]` reference to the parent element (exact, unique title match; `UNKNOWN_PARENT_ELEMENT` / `AMBIGUOUS_PARENT_ELEMENT`, never a guess). Without `parent`, an element's parent is the nearest preceding element, in document order, of the previous listed concept; the first listed concept hangs from the document's folder chain (`findScopeChain` + `loadChain`). `isolate:: true` (strict boolean, same rule as Q2) is a field on the element; `slug` and `isolate` are not values. Node: `{ id: '<doc>#<Concept>/<slug>', kind: 'element:<Concept>', doc, isolate, values }` (the parser already supplies concept sections, titles, derived or explicit slugs, `fields`, `headingDepth`, `parentElement`). A document with both `scope: true` and `scope_elements` is `AMBIGUOUS_SCOPE_DECLARATION` (so the golden episode loses its folder-scope marker, which L1.4 finding 3 showed added nothing). Sub-elements by heading depth (`### NN Layer`) are not scopes unless listed. Why this option: needs no L1/L2 change and no parser or serializer change (flag-first, like `scope: true`); one frontmatter edit per document instead of one per element (LC_programas has 5 Programas and 6 Prestaciones; a video script has N scenes); keeps values as typed fields; `isolate::` has 0 uses in the specs. Rejected: heading flag (`## NN Programa: X {scope}`) because the heading is identity and the byte-identical round trip is guarded by `roundtrip-fidelity`; `scope:: true` per element because `scope::` is already used 217 times as a procedures field (Q9) and costs one edit per element | A heading flag; a per-element `scope::` field; declaring scopes in the bluepriNNt (L2, deferred with the next L1) | Prefer the option needing no L1 change, with the least data churn |
| 2026-10-28 | Real shapes found while re-planning (read-only). (1) LC_programas: `precio_hora_tutoria:: "84"` is on the six `## NN Prestación de Servicios` elements, NOT on the Programa; each Prestación reaches its Programa through `programa_ref:: [[<Programa title>]]` (titles match the Programa headings exactly in the visible orders); Tutor `nombre` repeats in 5 Tutor elements. The design brief's "Programa with `precio_hora_tutoria`" therefore needs a parent link by reference, which is why `parent: <field>` is in the proposal; the leaf scope is the Prestación (Q11). (2) Video scripts: `music`, `music_volume` and `transition` sit on `## NN Scene` elements and repeat in most scenes of a script (absent in some, for example `01 Intro`); the Video element holds only slug, title, sources; a per-episode deviation is therefore a property of a script's scenes, which is why drift uses a caller-chosen unit (document). (3) LC_programas already has `domaiNN_NN.md` and a root `procedures/` with 10 documents; the `Lean_Business_Plan_from_Model` procedure hardcodes `sources/import/LeanBusinessPlanProyectosCoworkingEOI` (lines 18 and 96). (4) The LC_programas data contains real student names, DNI and NIF: committed fixtures (`programas-golden`) MUST be synthetic. (5) The temp video fixture in the session scratchpad is the old pre-kNNowledge format and is not a source of element shapes; the backup `video_NN-backup-2026-10-27_193914` is | - | Inputs to Q10, Q11 and the L2.1b fixtures |
| 2026-10-28 | MAINTAINER DECISIONS. (1) Q10 CONFIRMED: element-scope marker = document frontmatter `scope_elements: [{ concept: <Concept> }, ...]`, optional `parent: <field>` (a `[[title]]` reference to the parent element), default parent = nearest preceding element of the previous listed concept, `isolate:: true` strict-boolean field per element, `AMBIGUOUS_SCOPE_DECLARATION` when a document has both `scope: true` and `scope_elements`. (2) L1.C.3 DONE: the maintainer reviewed and approved the Lote 2+ re-plan order (L2.1 -> L2.2 -> L2.3 -> L2.4 -> Lote 3). L2.1a and L2.2a are ungated; L2.1b waits for Q11, L2.2b for Q12 | Heading flag; per-element `scope::` | See the proposal entry above |
| 2026-10-28 | L2.1a applied (pure element adapter). `elementChain(source, target)` in `scope/elements.ts` returns `{ ok: true, nodes }` (the element nodes on the path, outermost first, target last; the caller prepends the folder nodes and the floor and calls `resolve` unchanged) or a structured error. Node: `{ id: '<doc>#<Concept>/<slug>', kind: 'element:<Concept>', doc, isolate, values }`; values are the element fields minus `slug` and `isolate`; `isolate` is `fields.isolate === true` (strict boolean, the text "true" is not). Parent: with `parent: <field>` the `[[title]]` reference is resolved against the previous listed concept by exact title (`UNKNOWN_PARENT_ELEMENT` when the field is absent, not a reference, or names nothing; `AMBIGUOUS_PARENT_ELEMENT` when two match); without it the nearest PRECEDING element of the previous listed concept in `source.elements` order (an inner element before every outer one is `UNKNOWN_PARENT_ELEMENT`, never an orphan or a guess). Mutation checks: first-preceding instead of nearest turns 2 cases red, removing the `slug` exclusion turns 1 red, a `node:fs` import turns the purity case red. Spec: ADDED requirement `Element Scopes Declared By Frontmatter` in `specs/scope-chain/spec.md` (11 scenarios). nn-core 1885 -> 1910 tests; the generated nn-sources mirror is unchanged | Importing the parser into the pure module; silent orphan placement | Pure over a structural shape; the fs side (L2.1b) builds it from `parseKnowledge` |
| 2026-10-28 | L2.1a deviations from the tasks text, all additions: (a) `ElementSource` gains `scopeFlag?: boolean` so `AMBIGUOUS_SCOPE_DECLARATION` (document has `scope: true` AND `scope_elements`) is decided in the pure function and not only in the loader; an empty `scope_elements` list is not a declaration. (b) Three codes beyond the spec text: `INVALID_SCOPE_DECLARATION` (a concept listed twice, an empty concept, or `parent` on the first listed concept), `UNKNOWN_ELEMENT` (target concept not listed, or no element with that slug, which also covers a Layer-style unlisted sub-element) and `AMBIGUOUS_ELEMENT` (two elements of the concept share the target slug). Two elements of different concepts may share a slug because ids carry the concept. (c) The spec requirement's first physical line must hold the MUST (the delta checker reads only that line), so the sentence order differs from the first draft | Treating a duplicate slug as first-wins | Never guess, consistent with the rest of the module |
| 2026-10-28 | L2.1a FINDINGS for L2.1b (verified by reading `types/parser.ts` and `scope/fs-layers.ts`, not by running the fs side). (1) `parseKnowledge().elements` is an `ElementsMap` keyed by CONCEPT (case-insensitive); it keeps document order inside one concept and the order of concept sections via `entries()`, but carries no cross-concept position. The loader must flatten concept sections in section order into `source.elements`. Consequence: when the outer and inner concepts live in separate top-level sections (`# NN Video` then `# NN Scene`, the real video shape), every outer element precedes every inner one, so the default rule degenerates to "the LAST outer element"; a document with two Videos and one Scene section needs `parent: <field>` (the nearest-preceding rule is only meaningful for interleaved sections). The two-outer-elements spec case therefore uses interleaved elements. (2) Whether `parseKnowledge` hands `[[Title]]` back as the string "[[Title]]" (what `elementChain` accepts) or in another shape is unverified; L2.1b.2 must test it against a real parse. (3) Every parsed element already carries a `slug` (derived, or authored with `slug::`), so `ScopeElement.slug` can be filled straight from `ElementNode.slug`; `ElementNode.fields` values are `unknown` and must go through the same `asJson` coercion `fs-layers.ts` uses (module-private today; extract or duplicate with a test). (4) `headingDepth` and `parentElement`, named in the 2026-10-28 marker proposal as parser-supplied, do NOT exist in `ElementNode`; nothing in the design depends on them (listed concepts are top-level sections), but the proposal text was wrong on this | - | Inputs to L2.1b.2 and L2.1b.3 |
| 2026-10-28 | L2.2a applied (pure drift report). `driftReport({ floor, chains, keys?, ignore?, strategies? })` in `scope/drift.ts` returns `{ v: 1, rows, skipped }`. Rows exist for every scope that is a NON-FINAL node of at least one chain (a scope that offers values to descendants; leaves get none), per compared key. Baseline = `resolve` over the chain prefix ending at the scope (floor included, isolate honoured); a unit value = `resolve` over the full chain; both through `resolve` only, no second fold. A unit deviates when at least one of its chains differs from the baseline by deep JSON equality (object key order irrelevant, canonical form by recursive key sort); `units.total` counts distinct unit labels, `uniform` means every chain across all units holds one identical value (absence counts as a value), `variants` lists deviating values most-units-first (tie: canonical form) with the supplier of the first chain holding them. A chain that crosses an isolate AFTER the scope is not counted for that scope. A row is not emitted when the baseline is absent and no unit supplies the key; a requested key that nothing declares gets no row and no `skipped` entry. Chains are sorted internally (unit, leaf id, path), so the report does not depend on input order. Mutation checks: reference-style identity for objects (the `===` analogue) turns the deep-equality case red, dropping the floor from the baseline turns the floor case red, ignoring the isolate cut turns the isolate case red, a `node:fs` import turns purity red. Spec: ADDED requirement `Drift Report Is A Pure Read-Only Function` in `specs/contextual-resolution/spec.md` (9 scenarios). nn-core 1910 -> 1927 tests | A second fold inside the report; a `hoistable` boolean on the row | A hoistable repetition is already visible as `uniform` with every unit deviating and an absent baseline, so no extra field is promised |
| 2026-10-28 | L2.2a deviations from the tasks text: (a) `DriftInput.strategies?: Record<key, string>` is new. `driftReport` cannot know which keys are `union` otherwise, and the spec asks for visible skipping; the reasons are `strategy union is not compared` and `unsupported strategy <x>`. (b) `DriftRow.baseline` gains `present: boolean` (an absent baseline is `{ present: false, value: null, from: null }`, because JSON `null` can be a real value). (c) The Lot Overview lists L2.1b as the dependency of L2.2a; the code does not depend on it (the report takes literal chains) and the order stays only because the CLI (L2.2b) needs the element loader. (d) Reading note for L2.2b: the report states drift relative to EVERY ancestor scope, so the root row of a hierarchical domain lists all values as variants when the root declares nothing; the CLI should default to the nearest scope that declares the key, or hide rows with an absent baseline unless asked | `unitOf` function injected into the core | The caller already labels chains (`DriftChain.unit`); an injected callback adds nothing the label does not |

## Open Questions

- [x] ~~When nn-mcp starts outside any domaiNN, `ROOT_DIR` falls back to `cwd`.~~ Resolved 2026-10-28 (maintainer): yes, `cwd`; never `.git`.
- [x] ~~Adoption B edits the `projects` package and needs a `template_version` bump and repin.~~ Moot: `projects` is no longer an adoption target (2026-10-28 LC_programas entry).
- [x] How does an element scope's `isolate` and marker syntax look (heading flag vs `key::`)? Resolved 2026-10-28 (maintainer, Q10): frontmatter `scope_elements` plus an `isolate::` element field.
- [ ] Q11 to Q14 in `tasks.md` (LC_programas data shape, drift exposure, model-id strategy, procedure composition) are tracked there.
