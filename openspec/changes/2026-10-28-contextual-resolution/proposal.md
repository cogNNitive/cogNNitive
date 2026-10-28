# Proposal: Contextual Resolution — Scope Chain and Typed Cascade (Umbrella)

> Umbrella change. Its job is to keep the TOTAL scope of one wide architectural decision
> explicit while it lands progressively. `tasks.md` is the living roadmap; nothing here is
> "done" until the last in-scope phase merges.

## Intent

A kNNowledge document cannot ask "what applies to me here?". Shared configuration,
procedures, vocabulary and assets have no defined place between the bluepriNNt default and
the document, so domaiNNs reinvent the answer with copies and ad-hoc folders.

Evidence (motivating, not driving) from the real `video_NN` domaiNN:

| Symptom | Consequence |
|---|---|
| 13-step `draft_scene_visuals` copied 1:1 into two series | Fixes land in one copy only |
| Series stuck on legacy pipelines | No way to share the current one |
| `shared/`, `media/`, `renders/` with byte-identical duplicates | Unbounded ad-hoc layout |
| `series_rules.md` as informal Markdown | Rules are not typed kNNowledge |
| Four inconsistent root finders, one keyed on `.git` | A domaiNN silently depends on git |

The same need exists in any bluepriNNt with nested work (portfolio → program → project).
This change adds one generic cogNNitive primitive instead of a video-specific fix.

## The Primitive

Two orthogonal axes. The **type axis** (defiNNition → iNNfo → bluepriNNt → kNNowledge)
keeps strict composition: `includes` never overrides, a collision is an error. The
**containment axis** (domaiNN → sub-scope → … → document, single parent) carries the
cascade: `effective(S,k) = merge_k(effective(parent(S),k), local(S,k))`, bottoming out at
the bluepriNNt default. Each field declares a typed merge strategy (`override`, `union`
with name shadowing, `restrict`, `append`, `none`). The dual operator `aggregate` rolls
information upward. Procedures are defined once with named **slots** that child scopes
fill; a whole-procedure override is an explicit, tracked **fork**. Guarantees: `explain`
(provenance of every effective value), `isolate` (stops the chain), single-parent
resolution, and serializable resolution output.

## Evidence from real domains (2026-10-28)

A read-only review of 8 real domaiNNs reshaped the plan (details in `exploration.md`):

- Folder containment is rare. Only `video_NN` is hierarchical; most domains are flat and their
  containers are elements inside documents (LC_programas `## NN Programa`, video `## NN Video`
  episodes, accounting Periods). The resolver therefore folds an abstract `ScopeNode` chain:
  folder adapter now, element adapter later.
- `video_NN`, `transcriptions_NN` and `Electricidad_NN` lack `domaiNN_NN.md`. No fallback to
  other markers; real domains get the marker through adoption or the new-domain recipe.
- `projects` has no real consumer. LC_programas replaces it as the second consumer.
- Real duplication exists (`draft_scene_visuals` in 2 series) and real model-id collisions
  exist (40+ `script.md`), so some deliverables pay off before any cascade exists.

## Scope

Delivery is value-first, in lots. G-ids stay traceable through the mapping below.

### In Scope Now

| Lot | Deliverable | Validated by | Old ids |
|---|---|---|---|
| Lote 0 | Independent value fixes, one small PR each: L0.1 single `findDomainRoot` in nn-core (nearest `domaiNN_NN.md`, never `.git`) replacing `nn-mcp` `findRepoRoot` and fixing the `cognitivize.ts` domain-controlled `require()`; L0.2 model-id collision detection as a reported diagnostic; L0.3 verify whether `sources/` files are discovered as models and exclude them if so | Unit and nn-mcp tests; no cascade needed | G0.2 (root finder), G0.1 (collisions), exploration bug note |
| Lote 1 | Pure nn-core walking skeleton, no MCP: `src/scope/` with the `ScopeNode` abstraction, folder adapter (`scope: true`, `domaiNN_NN.md` root, `isolate`), fold with `override` + `union`, JSON-serializable `explain`, procedure slots and fork recording | Generic fixture plus golden validation on a temp copy of the `video_NN` backup (with `domaiNN_NN.md` added to the copy) | G0.1, G1, G2 (pure side) |
| Lote 2+ (re-planned at the Lote 1 checkpoint) | Element adapter (LC_programas, video episodes); procedure precedence and slots in nn-mcp; `resolve_effective` / `explain` MCP tools; video adoption; LC_programas adoption; `restrict` for `allowedModels` | Real consumers | G2 (code side), G3, A1-A3, B (replaced) |

Lote 1 ends with a checkpoint: conclusions go into the `design.md` decision log and
`tasks.md` is re-planned before Lote 2+ starts.

**Why LC_programas as the second consumer (replaces `projects`):** `projects` has no real
consumer. LC_programas is evidence-backed: the Programa is an element scope (`## NN Programa`
inside its Tutorias document); `precio_hora_tutoria` ("84") and tutor identity repeat in 6
orders (`override` candidates); `Lean_Business_Plan_*` procedures hardcode paths (slot
candidates). It depends on the element adapter, so it lands after Lote 1. Rejected earlier:
`organization` (hierarchy is intra-document; name collides with the deferred org scope) and
`procedures` (circular as a proof of the procedure mechanism).

**Golden validation (Lote 1):** on a temp COPY of `video_NN-backup-2026-10-27_193914` with
`domaiNN_NN.md` added, the chain is [episode, series, root]; music/voice resolution equals
today's values (innteresante -> jazz.mp3; villabotijos-today -> pasodoble-loop.m4a at 0.06
volume); `draft_scene_visuals` composed from 1 definition and 2 slot fills equals both
existing copies modulo naming noise; explain serializes. This is a local/manual script plus a
reduced committed fixture derived from it; CI never depends on the real path.

### Deferred (each with its unlock trigger)

| Item | Unlock trigger |
|---|---|
| Element adapter (Programa, Episode, Period as scopes) | Lote 1 conclusions are written; consumers LC_programas and video episodes |
| `restrict` strategy | Trigger met by `video-guard.json` `allowedModels`; schedule after the MCP slice |
| `append` strategy | Agent-context assembly work starts |
| Per-field `inherit::` (L1) and L2 scope declaration | The next iNNfo (L1) version is opened |
| Per-scope `aggregate` (manifest, console, lineage, change views) | A consumer needs a per-scope index or console after Adoption |
| Per-scope ingestion (`sources/` scanner, `importRaw`) | A domaiNN needs to import into a sub-scope |
| Lockfile / materialization on publish | First publish flow that needs frozen effective values; also would narrow the ~25 upgrade backup folders |
| Per-scope bluepriNNt version pin | Two scopes in one domaiNN need different bluepriNNt versions |
| User/org scope above the domaiNN | A second domaiNN needs shared defaults |
| `extends` (explicit multi-composition) | A case single-parent containment demonstrably cannot express |
| Video drift fixes (`shared/` vs `assets/`, stale `video-production-hierarchy` spec) | Video adoption lands |
| Scope-qualified model ids | Collision detection (L0.2) shows collisions that renaming cannot resolve |
| `projects` bluepriNNt adoption | A real consumer appears (currently none) |

## Non-Goals

- No backwards-compatibility code: no aliases, fallbacks or dual readers. Old domaiNNs
  migrate through new-domaiNN + import-as-source.
- No git dependency: the root is never located via `.git`.
- No multi-parent inheritance; other memberships are non-cascading facets (tags).
- No per-scope `changes/` folder: `changes/` stays one domaiNN-root transaction log.
- No change to type-axis composition (`includes` stays strict).
- The `nn-upgrade --import-as-source` discovery question is handled by L0.3 (verify, then fix or close with evidence).
- No `projects` bluepriNNt adoption: no real consumer.
- No root-marker fallback: a domaiNN without `domaiNN_NN.md` is not a root. Validation adds the marker only to a temp copy.

## Capabilities

### New Capabilities

- `scope-chain`: marker-walk root and sub-scope discovery (folder adapter over abstract scope nodes), `isolate`, single parent.
- `contextual-resolution`: typed merge fold over a `ScopeNode` chain, `override`/`union`, serializable `explain`.
- `procedure-extension-points`: procedure slots, slot contract check, fork tracking.

### Modified Capabilities

- `workspace-entrypoint`: the root is the nearest `domaiNN_NN.md`, found by walking up.
- `procedure-execution`: precedence over the scope chain, in code; shadowing is visible.
- `template-procedures-manifest-and-discovery`: scope-aware procedure listing.
- `workspace-sources-resolution`: source visibility = own scope plus ancestors, bounded by `isolate`.
- `video-folder-contract`: "no upward escape" becomes "no escape above the scope root".
- `video-script-skill`: consumes nn-core resolution instead of private cascade code.

## Affected Areas

| Area | Impact |
|---|---|
| `iNNfo/packages/nn-core/src/` (new scope + resolve modules; `schema/compose.ts` provenance reuse) | New |
| `iNNfo/packages/nn-mcp/src/server.ts`, `tools/workspace-sync.ts`, `tools/spec.ts` | Modified |
| `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/{cascade,nearest}.mjs`, `video-guard.mjs` | Removed / Modified |
| `skills/nn-innfo/SKILL.md` §16-bis | Modified |

## Delivery and Governance

- **One umbrella change**, active until the last in-scope lot (LC_programas adoption) lands.
- **`tasks.md` is the living roadmap**, organized by lot (Lote 0, Lote 1, Lote 2+, then Deferred).
- **Every lot PR updates `tasks.md`** (checkboxes, plus any deferred item it unlocks).
- **`design.md` holds a dated decision log**; each scope or strategy decision gets an entry.
- **Chained PRs, `feature-branch-chain`, `ask-on-risk`**: one tracker branch; each lot is
  one or more PRs (Lote 0 items are independent small PRs) with its own fixture-backed verification and rollback boundary.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Action at a distance: editing a parent changes children | High | `explain` mandatory; tools warn when a move or edit changes effective values |
| Opacity: users cannot see why a value applies | Med | `explain` exposed via MCP (G3); trace is serializable |
| Agents copy instead of resolving | High | §16-bis and MCP tools return effective values; forks are recorded and warned |
| Global model-id collisions across sibling scopes | High (already real: 40+ `script.md`) | Detected and reported in L0.2; scope-qualified ids deferred with a trigger |
| Folder-only model misses the real hierarchies | High | Abstract `ScopeNode` chain; element adapter scheduled after Lote 1 |
| Golden validation depends on a private path | Med | Local/manual script plus a reduced committed fixture; CI never reads the real path |
| Video "no upward escape" contradicts upward resolution | High | Contract redefined as scope-root-bounded in video adoption |
| L1 version cost of `inherit::` | Med | Start with the frontmatter flag (no L1/L2 change); defer L1 work to the next L1 version |
| Umbrella scope creep | Med | Deferred table is closed; adding an item requires a dated `design.md` entry |

## Rollback Plan

Each lot reverts independently on the tracker branch. Lote 0 reverts restore the previous
root finder and discovery; Lote 1 is an additive module; later lots are additive tools and
adoption reverts restore the video scripts. No domaiNN data migrates inside this change.

## Dependencies

- None external. Lote 0 items are independent. Lote 1 is pure and needs only `findDomainRoot` from Lote 0 (L0.1). LC_programas adoption depends on the element adapter.

## Assumptions Needing Maintainer Review

| # | Assumption |
|---|---|
| 1 | LC_programas is the second consumer (rationale above); `projects` is dropped |
| 2 | Model-id collision is a detected diagnostic now (L0.2), not resolved, in this change |
| 3 | A nested `domaiNN_NN.md` acts as a root (implicit `isolate`) |
| 4 | No root-marker fallback (e.g. to lineage records); real domains get `domaiNN_NN.md` |

## Success Criteria

- [ ] Lote 0: exactly one root finder exists (`findDomainRoot`); no code path reads `.git` to locate a domaiNN; `cognitivize.ts` no longer loads code found from the domain path.
- [ ] Lote 0: a repeated model-id stem within one domaiNN is reported as a diagnostic, never silently dropped.
- [ ] Lote 0: the `sources/` discovery question is closed (fixed test-first, or recorded as not reproducible with evidence).
- [ ] Lote 1: the generic fixture resolves `override` and `union` correctly at 3+ depths, and `isolate` stops the chain.
- [ ] Lote 1: every effective value has an `explain` trace that round-trips through JSON unchanged.
- [ ] Lote 1: golden validation on the temp copy of the video backup matches today's music/voice values and the composed `draft_scene_visuals`.
- [ ] Lote 1 checkpoint: conclusions logged in `design.md` and `tasks.md` re-planned.
- [ ] Later lots: shadowed procedures are listed, never dropped; forks warn when the original advances; `draft_scene_visuals` exists once in `video_NN`; `cascade.mjs` and `nearest.mjs` are deleted; LC_programas resolves at least one `override` key and one slotted procedure through element scopes.
- [ ] Every deferred item in `tasks.md` carries an unlock trigger; every merged PR touched `tasks.md`.
- [ ] `node scripts/verify.js` is green after each lot.
