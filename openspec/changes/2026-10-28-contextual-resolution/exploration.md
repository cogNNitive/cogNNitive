# Exploration: Contextual Resolution (scope chain + cascade)

Date: 2026-10-28. Source: maintainer conversation plus two read-only code mappings.
This is the input for the umbrella change `2026-10-28-contextual-resolution`.

## Origin

An audit of the real `video_NN` domain found:

- a 13-step procedure (`draft_scene_visuals`) copied 1:1 into two series;
- other series stuck on legacy pipelines;
- ad-hoc folders (`shared/`, `media/`, `renders/`), including byte-identical duplicates;
- informal Markdown (`series_rules.md`) instead of typed kNNowledge;
- no standard for sub-domain containers.

A "Fractal Scopes" proposal (same folder layout at every level, plus nearest-wins lookup) was rejected as stated. It was reframed from first principles as a generic cogNNitive primitive.

## Maintainer decisions (binding)

1. **Generic first.** The mechanism is designed and implemented in the cogNNitive core (L1/L2 specs, nn-core, nn-mcp). Video is the first validation consumer, not the driver. A second, non-video bluepriNNt must adopt it to prove genericity (the rule of two consumers).
2. **Single-parent containment.** Only containment resolves. Other memberships are facets: tags that never cascade.
3. **Scope declaration, staged.**
   - Start: a frontmatter flag on the scope's marker kNNowledge document (for example `scope: true`). This needs no L1 or L2 change.
   - Later: the L2 bluepriNNt declares which concepts are scopes. This happens with the next L1 version, which is also needed for per-field `inherit::`.
4. **No backwards-compatibility code.**
   - Old domains migrate through the existing new-domain + import-as-source recipe.
   - Materialization (a lockfile of effective values on publish) is deferred. `explain` output must be serializable, so the lockfile can later be a small task.
5. **Moving a document is a semantic operation.** Tools should warn when a move changes effective values.
6. **The domain root must never be found via `.git`.** A domaiNN must not require git. The root is found by walking up to the nearest `domaiNN_NN.md` marker.
7. **The total scope must stay explicit and under control.**
   - One umbrella change.
   - `tasks.md` is the living roadmap, organized by phase.
   - Every deferred item records its unlock trigger.
   - Every phase PR updates `tasks.md`.
   - Dated decision notes go in `design.md`.
8. **Delivery.** Chained PRs, feature-branch-chain, ask-on-risk.

## First-principles model

### Two orthogonal axes

| Axis | Chain | Role |
|---|---|---|
| Type (vertical) | L0 defiNNition → L1 iNNfo → L2 bluepriNNt → L3 kNNowledge | Its schema composition stays strict: `includes` never overrides, and a name collision is an ERROR |
| Containment (horizontal, within L3) | [user/org] → domaiNN → sub-scope → … → document | The cascade lives here. The chain bottoms out at the bluepriNNt default (the floor) |

### Resolution

```
effective(S, k) = merge_k( effective(parent(S), k), local(S, k) )
effective(⊥, k) = blueprint_default(k)
```

This is a pure fold over the ancestor chain. It is deterministic and memoizable per scope (on change, invalidate the subtree). A trace yields `explain`.

### Merge strategies (declared per field)

| Strategy | Semantics | Typical use |
|---|---|---|
| `override` | The local value wins, else the parent's (lex specialis) | Preferences, defaults |
| `restrict` | Conjunction; a child can only tighten (lex superior) | Policies, validation, compliance |
| `union` | Set union with name shadowing | Registries: procedures, glossary, named assets, source visibility |
| `append` | Ordered concatenation, parent first | Checklists, agent instructions |
| `none` | Never inherited | Identity, outputs, provenance, state |

### The dual operator

`aggregate` rolls information upward: indexes, metrics, status, consoles, and per-scope change views.

### Procedures

A procedure is defined once, at the highest sensible scope, with **named extension points (slots)**. Child scopes fill slots with values or sub-procedures. A whole-procedure override is allowed but recorded as an explicit **fork**, which is visible and warned about when the original advances.

### Mandatory guarantees

1. **explain:** the provenance of every effective value.
2. **isolate / root:** stops the chain.
3. **Single-parent resolution:** see decision 2.
4. **Serializable resolution:** keeps the future lockfile cheap.

## Mechanisms that could use the primitive

| Mechanism | Strategy | Priority |
|---|---|---|
| Agent context and instructions | `append` | high |
| Vocabulary and glossary | `union` + shadowing | high |
| Policies and validation | `restrict` | high (deferred until a real consumer) |
| Parameters and preferences | `override` | high |
| Procedures available | `union` + slots | high |
| bluepriNNt version pin per scope | `override` | medium (turns accidental drift into declared drift) |
| Default type for new documents | `override` | medium |
| Named assets and resources | `override` lookup | medium |
| Source and citation visibility | `union` (visibility) | medium |
| Lifecycle (archived, frozen) | `restrict` | low |
| Outputs, provenance, identity | `none` (+ `aggregate`) | — |

## `changes/` vs `sources/` per scope

- **`changes/` stays a single domain-root transaction log.** It has the lock, conflict resolution and review queue. Changesets gain a scope field, and per-scope views come from `aggregate`.
- **Sources become per-scope through `union` visibility.** A scope sees its own sources plus those of its ancestors.

## Current code map (2026-10-28)

### Reusable

- **Scope chain and lookup.** `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/nearest.mjs` (`findSeriesRoot`, `findNearest`, `findNearestByStem`; misses return `searched`). Video-only, with ad-hoc markers and a single series level.
- **override and union.** `.../scripts/lib/cascade.mjs`:
  - `resolve` returns `{value, source}`;
  - `resolveKeyed` gives per-key shadowing;
  - `SCOPE_ORDER` is a hardcoded chain;
  - `loadCascadeBags` uses a private parser.
  - Tests: `test/cascade.test.mjs`, `test/nearest.test.mjs`.
- **Explain model.** `iNNfo/packages/nn-core/src/schema/compose.ts` (`Provenance`, `attachDeclaredBy`).
- **Closest-wins pattern.** `nn-core/src/metamodel.ts` `resolveEffectiveMetamodel`.
- **Source visibility.** Citations already walk upward: `nn-core/src/console/fs-source-resolver.ts:15-50` finds the nearest ancestor `sources/` that holds the file, bounded by `rootDir`.
- **Role model is location-free.** `nn-core/src/naming/contract.ts` `roleOf`. Sidecars are co-located.
- **Precursor of per-field policy.** Video-script field `concept::` lists already declare the levels at which a field is overridable.
- **Slot contract check.** Overlay slots (`SlotContractError`) are visual-only, but the contract-check idea is reusable for procedure slots.

### Missing

- **One root and scope finder.** There are four inconsistent finders today:
  - `nn-mcp/src/server.ts:65` `findRepoRoot` → `.git` (a bug, see decision 6);
  - `findManifestPath` (`nn-mcp/src/tools/workspace-sync.ts:63`) looks in a single dir with a prefix heuristic;
  - `resolveWorkspace` (`video-guard.mjs:98`) uses `video-guard.json` or `.git`;
  - `recursiveParse` looks at the root handle only.
- **Procedure precedence in code.** "model > blueprint > domain" is prose only (`skills/nn-innfo/SKILL.md:842`). The code (`nn-mcp/src/tools/spec.ts:829-1113`) is first-seen-wins by id and silently drops shadowed procedures. There are no procedure slots.
- **Per-field `inherit::`.** L1 Field Definition has no such property (`iNNfo_V_0-5-0`, `nn-core/src/schema/extract.ts`), so it needs a new L1 version.
- **Per-scope aggregation.**
  - Manifest sync is one flat `## NN Models` list (`workspace-sync.ts:156-202`).
  - Lineage is one flat record per domain.
  - A console scope is a model selection, not a folder.
- **Per-scope ingestion.** nn-sources scanner and `importRaw` hardcode `<root>/sources/{import,conversations}`.

### Conflicts and risks

- **`resolveWorkspace`** uses `.git` / `video-guard.json`, not the `domaiNN_NN.md` marker.
- **`video-guard.json` `allowedModels`** is a constraint merged as a shallow override. It is the first real `restrict` candidate.
- **Model ids are global filename stems.** Same-named documents in sibling scopes collide.
- **Nested `domaiNN_NN.md`.** It is skipped as a model (role `entrypoint`), but its subtree is absorbed into the parent manifest, with no boundary.
- **Video folder contract** forbids paths above the Series folder (no upward escape). This conflicts with upward resolution.
- **Possible bug (unverified).** `nn-upgrade --import-as-source` copies the old `_NN.md` files into `sources/import/`, and `sources/` is not excluded from model discovery. Track it as a separate issue.

## Proposed phasing (generic first)

| Phase | Content | Validation |
|---|---|---|
| G0 Scope | One `findScopeChain(path)` in nn-core, using marker walk (`domaiNN_NN.md` = root, flag = sub-scope), plus `isolate`. It replaces the four root finders and fixes `.git` | Generic nested-scope fixture (non-video) |
| G1 Resolution | Pure `resolve(chain, key, strategy)` with `override` + `union` + serializable `explain`, reading kNNowledge through nn-core's parser | Same fixture |
| G2 Procedures | Precedence in code over the scope chain, plus named extension points (slots) and fork tracking, for any bluepriNNt | Fixture procedure with slots |
| G3 MCP | `resolve_effective` / `explain` tools, with scope-aware procedure listing | nn-mcp tests |
| Adoption | Video consumes the core (cascade/nearest on nn-core, dedupe `draft_scene_visuals`), plus a second non-video bluepriNNt | Two real consumers |

Deferred, each with an unlock trigger:

- `restrict`: a second real constraint;
- `append`: agent-context assembly;
- L1 `inherit::` and L2 scope declaration: the next L1 version;
- per-scope `aggregate` (manifest, console, lineage);
- per-scope ingestion;
- lockfile/materialization;
- per-scope bluepriNNt pin;
- user/org scope above the domaiNN;
- `extends` for explicit multi-composition;
- fixing the video-specific drift (`shared/` vs `assets/`, stale `video-production-hierarchy` spec).

## Real-domain review (2026-10-28)

Read-only review of 8 real domaiNNs, approved by the maintainer as the basis for a re-slice.

- **Folder containment is rare.** Only `video_NN` is genuinely hierarchical (root, 4 series, episodes). Most domains are flat; their containers are elements inside documents: LC_programas `## NN Programa` entries in its Tutorias document, video episodes as `## NN Video` blocks in the series document, accounting Period entries. The resolver therefore needs an abstract scope-node chain: folder adapter first, element adapter later.
- **Root marker gaps.** `video_NN`, `transcriptions_NN` and `Electricidad_NN` have no `domaiNN_NN.md`. `video_NN`'s de facto marker is the lineage record `video_NN_cogNNitive_NN.md`. No fallback to other markers; real domains get `domaiNN_NN.md` through adoption or the new-domain recipe.
- **`projects` has no real consumer.** LC_programas replaces it: Programa as element scope, `precio_hora_tutoria` ("84") and tutor identity repeated across 6 orders (override candidates), `Lean_Business_Plan_*` procedures hardcoding paths (slot candidates).
- **Real procedure duplication in `video_NN`.** `draft_scene_visuals` is copied in innteresante and villabotijos-today (76 changed lines, 31 hunks, mostly naming noise). Candidate slots: presenter_persona, tools_invocation, scene_structure, attribution_overlay, render_notes, finalize_fields. The `select_*_news` trio suggests slots news_sources, topic_filter, news_model_ref.
- **`restrict` is real.** `video-guard.json` `allowedModels`. Stays deferred until after Lote 1.
- **Model-id collisions already exist.** 40+ `script.md` files and a duplicated `NoticiasVillabotijos_noticias_NN.md` in 2 series. Detection has value today, independent of any cascade.
- **Backup sprawl.** About 25 backup/copy folders exist because upgrades back up whole trees; a lockfile would narrow that. Stays deferred.
- **Safe oracle.** `video_NN-backup-2026-10-27_193914` (under `Documents\_NN`, or `Y:\My Drive\_NN`), always copied to a temp fixture, never mutated.
