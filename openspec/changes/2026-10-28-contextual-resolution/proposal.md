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

## Scope

### In Scope Now

| Phase | Deliverable | Validated by |
|---|---|---|
| G0 Scope | One `findScopeChain(path)` in nn-core: walk up to the nearest `domaiNN_NN.md` (root); a sub-scope is a marker document with frontmatter `scope: true`; `isolate` stops the chain. Replaces the four root finders; removes `.git` lookup | Generic nested-scope fixture (non-video) |
| G1 Resolution | Pure `resolve(chain, key, strategy)` with `override` + `union`; serializable `explain` trace; reads kNNowledge through nn-core's parser only | Same fixture |
| G2 Procedures | Procedure precedence implemented in code over the scope chain; shadowed procedures reported, never silently dropped; named slots with contract check; fork recording and "original advanced" warning | Fixture procedure with slots |
| G3 MCP | `resolve_effective` and `explain` tools; scope-aware procedure listing | nn-mcp tests |
| Adoption A | `video-script` consumes the core (`cascade.mjs` / `nearest.mjs` replaced); `draft_scene_visuals` deduplicated into one slotted procedure | Real `video_NN` series |
| Adoption B | `projects` bluepriNNt adopts scopes (portfolio → program → project) | Second real consumer |

**Why `projects` as the second consumer:** its hierarchy is folder containment by nature;
it already ships procedures (`generate-status-report` is a clean slot candidate: audience and
format vary per program); `priority`/`health` defaults are natural `override` keys. Rejected:
`organization` (its hierarchy is intra-document, and the name collides with the deferred
org scope above the domaiNN); `procedures` (circular as a proof of the procedure mechanism).

### Deferred (each with its unlock trigger)

| Item | Unlock trigger |
|---|---|
| `restrict` strategy | A second real constraint beyond `video-guard.json` `allowedModels` |
| `append` strategy | Agent-context assembly work starts |
| Per-field `inherit::` (L1) and L2 scope declaration | The next iNNfo (L1) version is opened |
| Per-scope `aggregate` (manifest, console, lineage, change views) | A consumer needs a per-scope index or console after Adoption |
| Per-scope ingestion (`sources/` scanner, `importRaw`) | A domaiNN needs to import into a sub-scope |
| Lockfile / materialization on publish | First publish flow that needs frozen effective values |
| Per-scope bluepriNNt version pin | Two scopes in one domaiNN need different bluepriNNt versions |
| User/org scope above the domaiNN | A second domaiNN needs shared defaults |
| `extends` (explicit multi-composition) | A case single-parent containment demonstrably cannot express |
| Video drift fixes (`shared/` vs `assets/`, stale `video-production-hierarchy` spec) | Adoption A lands |
| Scope-qualified model ids | First real sibling-scope stem collision (see Risks) |

## Non-Goals

- No backwards-compatibility code: no aliases, fallbacks or dual readers. Old domaiNNs
  migrate through new-domaiNN + import-as-source.
- No git dependency: the root is never located via `.git`.
- No multi-parent inheritance; other memberships are non-cascading facets (tags).
- No per-scope `changes/` folder: `changes/` stays one domaiNN-root transaction log.
- No change to type-axis composition (`includes` stays strict).
- The suspected `nn-upgrade --import-as-source` discovery bug is tracked as a separate issue.

## Capabilities

### New Capabilities

- `scope-chain`: marker-walk root and sub-scope discovery, `isolate`, single parent.
- `contextual-resolution`: typed merge fold, `override`/`union`, serializable `explain`.
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
| `iNNfo/specs/bluepriNNts/projects/` | Modified |
| `skills/nn-innfo/SKILL.md` §16-bis | Modified |

## Delivery and Governance

- **One umbrella change**, active until the last in-scope phase (Adoption B) lands.
- **`tasks.md` is the living roadmap**, organized by phase (G0…Adoption B, then Deferred).
- **Every phase PR updates `tasks.md`** (checkboxes, plus any deferred item it unlocks).
- **`design.md` holds a dated decision log**; each scope or strategy decision gets an entry.
- **Chained PRs, `feature-branch-chain`, `ask-on-risk`**: one tracker branch; each phase is
  one or more PRs with its own fixture-backed verification and rollback boundary.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Action at a distance: editing a parent changes children | High | `explain` mandatory; tools warn when a move or edit changes effective values |
| Opacity: users cannot see why a value applies | Med | `explain` exposed via MCP (G3); trace is serializable |
| Agents copy instead of resolving | High | §16-bis and MCP tools return effective values; forks are recorded and warned |
| Global model-id collisions across sibling scopes | Med | Detected and reported as an error in G0; scope-qualified ids deferred with a trigger |
| Video "no upward escape" contradicts upward resolution | High | Contract redefined as scope-root-bounded in Adoption A |
| L1 version cost of `inherit::` | Med | Start with the frontmatter flag (no L1/L2 change); defer L1 work to the next L1 version |
| Umbrella scope creep | Med | Deferred table is closed; adding an item requires a dated `design.md` entry |

## Rollback Plan

Each phase reverts independently on the tracker branch. G0 revert restores the previous
root finders; G1–G3 are additive modules and tools; Adoption reverts restore the video
scripts and the `projects` bluepriNNt. No domaiNN data migrates inside this change.

## Dependencies

- None external. Adoption A depends on G0–G2; G3 depends on G1–G2.

## Assumptions Needing Maintainer Review

| # | Assumption |
|---|---|
| 1 | `projects` is the second consumer (rationale above) |
| 2 | Model-id collision is a detected error now, not resolved, in this change |
| 3 | A nested `domaiNN_NN.md` acts as a root (implicit `isolate`) |

## Success Criteria

- [ ] Exactly one root/scope finder exists in the codebase; no code path reads `.git` to locate a domaiNN.
- [ ] The nested-scope fixture resolves `override` and `union` keys correctly at 3+ depths, and `isolate` stops the chain.
- [ ] Every effective value returned has an `explain` trace that round-trips through JSON unchanged.
- [ ] A shadowed procedure appears in listing output as shadowed; zero silent drops.
- [ ] A fork is recorded and warns when the original procedure's version advances.
- [ ] `draft_scene_visuals` exists once in `video_NN`; both series run it through slots.
- [ ] `cascade.mjs` and `nearest.mjs` are deleted; video tests pass on nn-core.
- [ ] `projects` resolves at least one `override` key and one slotted procedure across portfolio → program → project.
- [ ] Every deferred item in `tasks.md` carries an unlock trigger; every merged phase PR touched `tasks.md`.
- [ ] `node scripts/verify.js` is green after each phase.
