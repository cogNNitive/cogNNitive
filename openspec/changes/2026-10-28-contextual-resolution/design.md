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

## Open Questions

- [x] ~~When nn-mcp starts outside any domaiNN, `ROOT_DIR` falls back to `cwd`.~~ Resolved 2026-10-28 (maintainer): yes, `cwd`; never `.git`.
- [x] ~~Adoption B edits the `projects` package and needs a `template_version` bump and repin.~~ Moot: `projects` is no longer an adoption target (2026-10-28 LC_programas entry).
- [ ] How does an element scope's `isolate` and marker syntax look (heading flag vs `key::`)? Decide at the Lote 1 checkpoint.
