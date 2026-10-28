# Tasks: Contextual Resolution — Scope Chain and Typed Cascade (Umbrella Roadmap)

This file is the LIVING ROADMAP of an umbrella change. The total scope must never be lost.

> Re-sliced 2026-10-28 from real-domain evidence (8 domaiNNs reviewed; see `exploration.md`
> and the `design.md` decision log). The earlier phase order (G0.1 ... B) is replaced by a
> value-first lot order. Old ids map to lots in the Lot Overview, so history stays traceable.

## How To Use This File

- Every lot PR MUST tick the tasks it completes in this file, in the same PR.
- Every lot PR MUST append dated entries to the `design.md` Decision log for each scope or
  strategy decision it makes or reverses.
- A PR that unlocks a Deferred item moves it into a lot section (with tasks) and logs a
  dated `design.md` entry. Adding a new deferred item also requires a dated entry.
- The change stays ACTIVE (not archived) until the last in-scope lot (LC_programas adoption) lands.
  Tasks for data outside this repository (the real `video_NN` and LC_programas domaiNNs) are
  tracked here and do not gate archive.
- Strict TDD: inside each task group the `RED` task precedes its `GREEN` tasks. The `RED` test
  must be seen failing before the implementation is written. Each group ends with a
  verification task.
- Status convention: the Status column and `- [ ]` / `- [x]` checkboxes. A lot is `pending`,
  `in progress` or `done`.
- Test runners: nn-core `npm --workspace=@cognnitive/nn-core test`; nn-mcp
  `npm --workspace=@cognnitive/nn-mcp test`; script suites `node scripts/verify.js --only=<substring>`;
  video suites `node --test <file>`. Builds only inside worktrees: never `npm ci` from a worktree
  (node_modules are junctions to the primary checkout).
- Chain strategy: `feature-branch-chain`. A draft/no-merge tracker PR targets `dev`; PR 1
  targets the tracker branch; every later PR targets the branch of the PR before it. Only the
  tracker merges to `dev`. Lote 0 items are independent small PRs and MAY target the tracker
  branch directly. Every child PR carries a dependency diagram marking itself with the pointer
  glyph, and states start, end, prior dependencies, follow-ups and out-of-scope.
- No backwards-compatibility code anywhere in this change: no aliases, fallbacks, dual readers,
  no root-marker fallback.
- The real `video_NN` backup (`video_NN-backup-2026-10-27_193914`, under `Documents\_NN` or
  `Y:\My Drive\_NN`) is a safe oracle: always copied to a temp fixture, never mutated, and never
  required by CI.

### Path Legend

`CORE` = `iNNfo/packages/nn-core/src/`; `SCOPE` = `CORE/scope/`; `MCP` =
`iNNfo/packages/nn-mcp/src/`; `FIX` = `iNNfo/packages/nn-core/tests/fixtures/scoped-portfolio/`;
`GOLD` = `iNNfo/packages/nn-core/tests/fixtures/video-golden/` (reduced fixture derived from the
backup) ; `VID` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/`.
Spec ids refer to `openspec/changes/2026-10-28-contextual-resolution/specs/<capability>/spec.md`.

## Lot Overview

| Lot | Goal | Depends on | ~Lines | PR target branch | Old ids | Status |
|-----|------|------------|--------|------------------|---------|--------|
| Tracker | Draft/no-merge PR; accumulates all lots | - | 0 | `dev` | - | pending |
| L0.1 | Single `findDomainRoot`; nn-mcp `ROOT_DIR`; `cognitivize.ts` stops loading code found from the domain | - | 250 | tracker branch | G0.2 | pending |
| L0.2 | Model-id collision detection as a reported diagnostic | - | 150 | tracker branch | G0.1 collisions, G0.2.3 | pending |
| L0.3 | Verify (test-first) that `sources/` files are discovered as models; exclude or close with evidence | - | 80 | tracker branch | exploration bug note | pending |
| L1.1 | `ScopeNode` types, folder adapter, fixture, purity and genericity guards | L0.1 | 350 | tracker branch | G0.1 | pending |
| L1.2 | Fold (`override` + `union`), `explain`, node loading | L1.1 | 380 | L1.1 branch | G1.1 | pending |
| L1.3 | Procedure slots, fills, fork recording (pure) | L1.2 | 380 | L1.2 branch | G2.1 (pure) | pending |
| L1.4 | Golden validation: local script on a temp copy of the video backup, reduced committed fixture | L1.3 | 200 | L1.3 branch | new | pending |
| L1 checkpoint | Conclusions into `design.md`; re-plan Lote 2+ | L1.4 | docs | L1.4 branch | new | pending |
| L2+ | To be re-planned at the Lote 1 checkpoint (see below) | L1 checkpoint | re-plan | - | G1.2, G2.2, G3, A1-A3, B | pending |

Dependencies: L0.1, L0.2 and L0.3 are independent of each other. L1 needs only `findDomainRoot`
from L0.1. L2+ needs the L1 checkpoint. Each lot reverts on its own.

---

## Lote 0: Independent value fixes (no cascade)

### L0.1 Single root finder (specs: workspace-entrypoint, scope-chain "Single Scope Finder", "Root Is The Nearest domaiNN Marker"; design Root Finder Replacement)

Start: four inconsistent root finders; nn-mcp keys on `.git`. End: `findDomainRoot` is the only finder; nn-mcp uses it; `repo-root.ts` is gone.

- [ ] L0.1.0 Create the tracker branch and the draft/no-merge tracker PR; record branch names in the PR body and in a `design.md` Decision log entry. (Skipped in apply batch 1: commits live on the session branch `session/contextual-resolution`; the orchestrator handles PRs.)
- [x] L0.1.1 RED `CORE/scope/root.spec.ts` (`mkdtemp`): root found from a deep document; domaiNN without `.git`; `.git` above the root ignored; repository root without a marker is not a root (returns null, no throw); nested `domaiNN_NN.md` is its own root. (scope-chain: "Root found from a deep document", "domaiNN without git", "Git directory is ignored", "Repository root without a marker is not a root")
- [x] L0.1.2 GREEN `SCOPE/root.ts`: `findDomainRoot(path)` (walk up to the nearest `domaiNN_NN.md`; never reads `.git`); `SCOPE/index.ts`; re-export from `CORE/index.ts`. Relative imports carry `.js`.
- [x] L0.1.3 RED `MCP/server.spec.ts`: root resolved from a subdirectory of a fixture domaiNN; no-git domaiNN; `INNFO_DOMAIN_DIR` override wins; no marker falls to `cwd` (see Q1). (workspace-entrypoint: "MCP tool called from a subdirectory", "No marker found")
- [x] L0.1.4 RED `MCP/tools/dev-checkout.spec.ts`: `devCheckoutRoot` derives from the module's own location, never from the domain path; a normalizer planted in a domain-found root is never `require()`d.
- [x] L0.1.5 GREEN `MCP/tools/dev-checkout.ts` (extract `devCheckoutRoot` from `MCP/tools/console-regeneration.ts`); `MCP/tools/cognitivize.ts:29` resolves the normalizer through it.
- [x] L0.1.6 GREEN `MCP/server.ts:65`: `ROOT_DIR = INNFO_DOMAIN_DIR ?? findDomainRoot(cwd) ?? cwd`.
- [x] L0.1.7 RED then GREEN `MCP/tools/workspace-sync.spec.ts` / `MCP/tools/workspace-sync.ts:63` and `MCP/tools/propose-changeset.ts:56`: manifest path is `join(root, ENTRYPOINT_FILENAME)`; `walkMarkdownFiles` skips a dir holding a nested `domaiNN_NN.md`. (workspace-entrypoint: "Manifest sync in a domaiNN without git", "Manifest sync does not absorb a nested domaiNN")
- [x] L0.1.8 DELETE `MCP/tools/repo-root.ts`, `MCP/tools/repo-root.spec.ts`, `findManifestPath`, `findWorkspaceRoot`; grep proves zero `.git`-based domaiNN lookups remain in nn-mcp. (scope-chain: "One finder in the codebase")
- [x] L0.1.9 Verify: rebuild nn-core first (stale `dist` breaks nn-mcp tests), then `npm --workspace=@cognnitive/nn-mcp test`; `node scripts/verify.js`. Mutation check: reintroducing a `.git` branch turns L0.1.1 red.
- [x] L0.1.10 Tick tasks; Decision log; status.

Deletes: `repo-root.ts` (+ spec), `findManifestPath`, `findWorkspaceRoot`, the prefix heuristic.
Out of scope: the video `resolveWorkspace` (`video-guard.mjs`) moves with video adoption in Lote 2+.

### L0.2 Model-id collision detection (specs: scope-chain "Sibling scopes share a stem")

Start: a repeated filename stem in one domaiNN is dropped silently. End: it is reported as a diagnostic naming the id and every path.

- [x] L0.2.1 Locate where model discovery and manifest sync collapse stems (`MCP/tools/workspace-sync.ts`, `MCP/tools/check-workspace.ts`); record the call sites in the PR body.
- [x] L0.2.2 RED `CORE/scope/stem-collision.spec.ts`: `findStemCollisions` names the id and both paths; a stem unique per path yields `[]`; same stem across nested domaiNNs is not a collision. (scope-chain: "Sibling scopes share a stem", "Same stem in different domaiNNs is fine")
- [x] L0.2.3 GREEN `SCOPE/stem-collision.ts`: pure `findStemCollisions(modelPaths)`; export from `SCOPE/index.ts`.
- [x] L0.2.4 RED `MCP/tools/check-workspace.spec.ts` and `MCP/tools/workspace-sync.spec.ts`: a duplicate stem (e.g. two `script.md` or two `NoticiasVillabotijos_noticias_NN.md`) yields a diagnostic naming the id and both paths, never a silent drop.
- [x] L0.2.5 GREEN `MCP/tools/check-workspace.ts` / `workspace-sync.ts`: call `findStemCollisions` and surface the diagnostic.
- [x] L0.2.6 Verify: nn-core and nn-mcp tests; `node scripts/verify.js`. Mutation check: removing the diagnostic turns L0.2.4 red.
- [x] L0.2.7 Tick tasks; Decision log; status.

Deletes: the silent stem drop.
Out of scope: resolving collisions or scope-qualified ids (Deferred).

### L0.3 `sources/` discovery check (exploration: possible `nn-upgrade --import-as-source` bug)

Start: unverified suspicion that `sources/import/*_NN.md` files are discovered as models. End: fixed test-first, or closed with evidence.

- [x] L0.3.1 RED `MCP/tools/workspace-sync.spec.ts` (or the discovery module's spec): a `sources/import/foo_NN.md` fixture is not listed as a model. If the test is already green, stop and go to L0.3.4.
- [x] L0.3.2 GREEN exclude `sources/` from model discovery at the discovery site found in L0.2.1.
- [x] L0.3.3 Verify: nn-mcp tests; `node scripts/verify.js`.
- [x] L0.3.4 N/A, the bug reproduced (RED test failed before the fix), so there is no closing evidence to record. If not reproducible: record the evidence (test name, fixture, commit) in the Decision log and mark the exploration note closed. No code change.
- [x] L0.3.5 Tick tasks; Decision log; status.

---

## Lote 1: Pure nn-core walking skeleton (no MCP)

Goal: prove the abstract scope-node fold on a generic fixture and on the real video evidence,
without touching nn-mcp. Specs: scope-chain, contextual-resolution, procedure-extension-points
(pure side). Design: Scope Nodes, Data Shapes, Interfaces.

### L1.1 Scope nodes and folder adapter (specs: scope-chain)

Start: `findDomainRoot` exists. End: the folder adapter produces `ScopeNode[]` for the fixture.

- [x] L1.1.1 Build fixture `FIX` (no implementation yet): root `domaiNN_NN.md` and a root values doc; `portfolio/` -> `programs/alpha/` -> `projects/p1/` (3+ depths); isolated `programs/legacy/` (`isolate: true`); a nested `domaiNN_NN.md` subtree; two sibling scopes sharing a model stem; a folder without a marker; a marker with `scope: "yes"`; a directory with two markers.
- [x] L1.1.2 RED `CORE/scope/chain.spec.ts` (in-memory `probe`/`parentOf`): three-level chain, outermost first; folder without marker is not a scope; non-boolean `scope` is not a scope; two markers in one dir returns `DUPLICATE_SCOPE_MARKER`; no marker returns `NO_DOMAIN_ROOT` with `searched`; isolate sets `cutAt` and truncates; siblings unaffected; nested `domaiNN_NN.md` is its own root with implicit isolate. (scope-chain: "Three-level chain", "Folder without a marker is not a scope", "Flag value other than true", "Two markers in one directory", "Chain cut at an isolated scope", "Siblings are unaffected", "Nested domaiNN is its own root", "Outer discovery stops at the nested root")
- [x] L1.1.3 GREEN `SCOPE/types.ts` (`ScopeNode`, `ScopeChain`, `JsonValue`), `SCOPE/chain.ts`: pure `buildScopeChain`.
- [x] L1.1.4 RED `CORE/scope/fs-chain.spec.ts` against `FIX` plus `mkdtemp`: `findScopeChain` over the fixture; markers read with `parseFrontmatter`; tags and other memberships create no parent. (scope-chain: "Tags do not create parents")
- [x] L1.1.5 GREEN `SCOPE/fs-chain.ts`: `findScopeChain`, `findInChain` (reuses `findDomainRoot`; no second walker).
- [x] L1.1.6 RED then GREEN `CORE/scope/purity.spec.ts` (pure files import no `node:fs`/`node:path` I/O; same pattern as `workspace/integrity/purity.spec.ts`) and the genericity grep: core contains no `video|series|projects|programa` outside tests and fixtures. (contextual-resolution: "Core contains no consumer vocabulary")
- [x] L1.1.7 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation check: dropping the isolate branch turns L1.1.2 red.
- [x] L1.1.8 Tick tasks; Decision log; status.

### L1.2 Fold, explain and node loading (specs: contextual-resolution)

Start: nodes exist. End: `override` and `union` resolve over `ScopeNode[]` with a JSON-safe `explain`.

- [x] L1.2.1 RED `CORE/scope/resolve.spec.ts` with literal `ScopeNode[]`: nearest wins at three depths; child without value inherits; floor used when no node sets the key; no default gives `present: false`; union accumulates and nearer entry shadows (shadowed listed); `isolate` blocks the parent value; unknown strategy returns `UNSUPPORTED_STRATEGY`; same input gives same output; every result passes `JSON.parse(JSON.stringify(r))` deep-equal. The spec uses only node arrays, never paths. (contextual-resolution: "Same input, same output", "Unknown strategy", "No scope sets the key", "No default anywhere", "Nearest declaration wins at three depths", "Child without a value inherits", "Entries accumulate", "Nearer entry shadows farther entry", "Trace names the supplier", "Trace round-trips", "Overridden candidates are visible", "Parent value is not inherited across isolate")
- [x] L1.2.2 GREEN `SCOPE/resolve.ts`: `resolve(nodes, key, strategy)`, closed `MergeStrategy = 'override' | 'union'`; keyed-list normalization (`[name=value, ...]`, array, object) lifted from `cascade.mjs`'s `keyedEntries` by copy (the original is deleted in video adoption).
- [x] L1.2.3 RED `CORE/scope/fs-layers.spec.ts` on `FIX`: values come from the first element of the `scope: true` document via `parseKnowledge`; root may add a values doc beside `domaiNN_NN.md`; floor is the single `_NN.md` under the bluepriNNt `defaults/`, injected via `floorDoc`; consumer-appended nodes sort after.
- [x] L1.2.4 GREEN `SCOPE/fs-layers.ts`: `loadChain` (folder adapter output -> `ScopeNode[]` plus floor).
- [x] L1.2.5 Extend purity spec to `resolve.ts`; genericity grep still green.
- [x] L1.2.6 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation check: removing floor injection turns the "No scope sets the key" case red.
- [x] L1.2.7 Tick tasks; Decision log; status.

### L1.3 Procedure slots and fork recording, pure (specs: procedure-extension-points)

Start: fold exists. End: `resolveProcedures` composes slotted procedures over nodes with diagnostics.

- [x] L1.3.1 Extend `FIX` with `<scope>/procedures/*_procedures_NN.md`: a slotted root procedure (`slots:` frontmatter), `fills:` in child values docs, a declared fork (`fork_of`), an undeclared shadow, a `{ procedure: id }` filler.
- [x] L1.3.2 RED `CORE/scope/procedures.spec.ts` (literal nodes with `procedures` and `fills`): slot declared; `DUPLICATE_SLOT`; two scopes share one procedure; nearest filler wins; `REQUIRED_SLOT_UNFILLED`; `UNKNOWN_SLOT`; `FILLER_KIND_MISMATCH`; `UNKNOWN_FILLER_PROCEDURE`; declared fork recorded; `UNDECLARED_SHADOW` warning; `ORIGINAL_ADVANCED` when the recorded version differs, none when equal; precedence model > nearest node > ... > root > bluepriNNt; shadowed listed, never dropped; JSON round-trip. (procedure-extension-points: all scenarios; procedure-execution: "Model overrides workspace", "Nearest scope wins over farther scope and bluepriNNt", "Scope procedure outranks the bluepriNNt", "No silent drop")
- [x] L1.3.3 GREEN `SCOPE/procedures.ts`: `resolveProcedures` reusing `union` for the id registry and `override` per slot.
- [x] L1.3.4 RED then GREEN `CORE/scope/fs-procedures.spec.ts` / `SCOPE/fs-procedures.ts`: `loadScopeProcedures` attaches procedures and fills to nodes from `<scope-dir>/procedures/`; sibling procedures not visible. (procedure-execution: "Sibling procedures are not visible")
- [x] L1.3.5 Extend purity spec to `procedures.ts`; genericity grep green.
- [x] L1.3.6 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation check: removing the shadow report turns "No silent drop" red.
- [x] L1.3.7 Tick tasks; Decision log; status.

Out of scope: `discoverTransitiveAssets` in `MCP/tools/spec.ts` (old G2.2) moves to Lote 2+.

### L1.4 Golden validation on the video backup (specs: video-script-skill "Scene Visuals Procedure Defined Once With Slots", as evidence only)

Start: pure fold and procedures exist. End: a manual script proves equivalence with today's `video_NN`; a reduced fixture keeps CI independent of the real path.

- [x] L1.4.1 RED `scripts/golden-video-validate.mjs` (local/manual; takes the backup path as an argument): copy `video_NN-backup-2026-10-27_193914` to a temp dir, add `domaiNN_NN.md` to the COPY only, assert the source tree is byte-unchanged afterwards. Fails first because adapters/fixtures are missing.
- [x] L1.4.2 Assert chain [episode, series, root] for an innteresante episode and a villabotijos-today episode (nodes built from the copy through the folder adapter plus `scope: true` markers added to the copy).
- [x] L1.4.3 Assert resolution equals today's values: innteresante -> `jazz.mp3`; villabotijos-today -> `pasodoble-loop.m4a` at volume `0.06`. Record any mismatch as a finding, not a patch.
- [x] L1.4.4 Assert `draft_scene_visuals` composed from 1 definition and 2 slot fills equals both existing copies modulo naming noise (normalize casing/ids; report remaining diff hunks). Candidate slots: presenter_persona, tools_invocation, scene_structure, attribution_overlay, render_notes, finalize_fields.
- [x] L1.4.5 Assert `explain` for each resolved key serializes (`JSON.parse(JSON.stringify(r))` deep-equal).
- [x] L1.4.6 GREEN derive `GOLD` (reduced committed fixture: 1 root, 2 series, 1 episode each, the two music values, a reduced slotted procedure) and `CORE/scope/golden.spec.ts` running the same assertions against `GOLD`. CI never reads the real path.
- [x] L1.4.7 Verify: nn-core tests (uses `GOLD`); the manual script run locally with the backup path, output pasted in the PR body.
- [x] L1.4.8 Tick tasks; Decision log; status.

### L1 checkpoint (mandatory before Lote 2+)

- [ ] L1.C.1 Write Lote 1 conclusions into the `design.md` decision log: what the golden run proved or contradicted, the `ScopeNode` shape as built, the element-scope marker syntax decision (open question), slot candidates confirmed, and any change to the procedure precedence.
- [ ] L1.C.2 Re-plan the Lote 2+ section of this file with concrete RED/GREEN tasks, file paths and estimates; update the Lot Overview and the Review Workload Forecast.
- [ ] L1.C.3 Maintainer review of the re-plan before any Lote 2+ apply.

---

## Lote 2+ (to be re-planned at the Lote 1 checkpoint)

Coarse placeholders only; do not apply before the checkpoint. Old ids in brackets.

- Element adapter: Programa (LC_programas `## NN Programa` in Tutorias), video episode (`## NN Video` blocks), accounting Period. Unlock trigger: Lote 1 conclusions written.
- Source visibility bounded by the chain, and `compareEffective` marker-move warning (specs: workspace-sources-resolution, scope-chain "Marker Move Changes Effective Values Warning") [old G1.2].
- Procedure precedence and slots in nn-mcp: `MCP/tools/spec.ts` `discoverTransitiveAssets` reports shadowed entries (no silent `seenProcIds` skip) [old G2.2].
- MCP tools: `resolve_effective`, `explain`, scope-aware `list_blueprint_procedures{path}`; `skills/nn-innfo/SKILL.md` §16-bis.2 precedence; `mcp-tools.md` [old G3].
- Video adoption: generated CJS mirror of the core (`build-core-mirrors.mjs`), `resolveWorkspace` on `findDomainRoot`, params resolve through the core, delete `cascade.mjs` and `nearest.mjs`, folder contract bounded by the scope root [old G0.3, A1, A2].
- `video_NN` domaiNN data (external repo): `domaiNN_NN.md`, `scope: true` markers, one slotted `draft_scene_visuals`, `select_*_news` slots news_sources/topic_filter/news_model_ref [old A3].
- LC_programas adoption (external data + element adapter): Programa as element scope, `precio_hora_tutoria` and tutor identity as `override` keys, `Lean_Business_Plan_*` hardcoded paths as slots [replaces old B; `projects` dropped].
- `restrict` strategy for `video-guard.json` `allowedModels` (trigger met; schedule after the MCP slice).

---

## Deferred (not in this change)

Each item has an unlock trigger. Adding an item requires a dated `design.md` entry.

- Element adapter. Unlock: Lote 1 conclusions are written; consumers LC_programas and video episodes. (Scheduled in Lote 2+ once unlocked.)
- `restrict` strategy. Unlock: met by `video-guard.json` `allowedModels`; schedule after the MCP slice.
- `append` strategy. Unlock: agent-context assembly work starts.
- Per-field `inherit::` (L1) and L2 scope declaration. Unlock: the next iNNfo (L1) version is opened.
- Per-scope `aggregate` (manifest, console, lineage, change views). Unlock: a consumer needs a per-scope index or console after Adoption.
- Per-scope ingestion (`sources/` scanner, `importRaw`). Unlock: a domaiNN needs to import into a sub-scope.
- Lockfile / materialization on publish. Unlock: first publish flow that needs frozen effective values; would also narrow the ~25 upgrade backup/copy folders.
- Per-scope bluepriNNt version pin. Unlock: two scopes in one domaiNN need different bluepriNNt versions.
- User/org scope above the domaiNN. Unlock: a second domaiNN needs shared defaults.
- `extends` (explicit multi-composition). Unlock: a case single-parent containment demonstrably cannot express.
- Video drift fixes (`shared/` vs `assets/`, stale `video-production-hierarchy` spec). Unlock: video adoption lands.
- Scope-qualified model ids. Unlock: L0.2 shows collisions that renaming cannot resolve.
- `projects` bluepriNNt adoption. Unlock: a real consumer appears (none today).

## Open Questions / Maintainer Decisions Pending

- [x] Q1 ~~When nn-mcp starts outside any domaiNN, `ROOT_DIR` falls back to `cwd`.~~ Resolved 2026-10-28 (maintainer): no `domaiNN_NN.md` and no `INNFO_DOMAIN_DIR` -> `ROOT_DIR` is `cwd`; never `.git`.
- [x] Q7 ~~`projects` release cost (template_version bump, tag/repin).~~ Moot: `projects` is no longer an adoption target (design entry 2026-10-28, LC_programas).
- [ ] Q1b Is the marker-move warning (`compareEffective` on move/changeset preview) SHOULD-in-scope? Moved to Lote 2+; decide at the checkpoint.
- [x] Q2 `isolate: true` frontmatter syntax: strict boolean on the marker document, same as `scope: true`. Applied in L1.1 as the assumed answer (`isolate: "true"` is not an isolate, tested); maintainer to confirm at the Lote 1 checkpoint. (affects L1.1.2)
- [x] Q3 ~~Nested `domaiNN_NN.md` is not descended by outer discovery.~~ Resolved 2026-10-28 (maintainer): a nested `domaiNN_NN.md` is its own root; outer discovery (`walkMarkdownFiles`, manifest sync) does not descend into it. Applied in `workspace-sync.ts`; `listKnowledge`/`check_domain` descent is tracked in the Decision log.
- [ ] Q4 `workspace/procedures/` is placed in the root scope, above the bluepriNNt. This reverses the documented "blueprint > domain" precedence in §16-bis.2. Confirm the reversal. (affects L1.3.2)
- [ ] Q5 The living `workspace-entrypoint` spec still names `workspace_NN.md` plus an `index.md` fallback, which conflicts with the marker walk on `domaiNN_NN.md` (and the no-fallback rule). Confirm the delta replaces it fully. (affects L0.1)
- [ ] Q6 Broader source visibility: each scope's `sources/` is visible nearest-first (own scope plus ancestors, bounded by isolate). Confirm this widening. (Lote 2+)
- [ ] Q8 Data changes in the external `video_NN` and LC_programas domaiNNs are not CI-verifiable. Accept manual evidence in the Decision log as the gate?
- [ ] Q9 `scope::` field-name confusion in the procedures bluepriNNt (an existing field vs the new `scope: true` frontmatter flag and `fork_of.scope`). Rename, or document the distinction? (affects L1.3)
- [ ] Q10 Element-scope marker syntax (heading flag vs `key::` field) and how `isolate` is expressed on an element. Decide at the Lote 1 checkpoint.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,790 for Lote 0 and Lote 1 (L0.1 250, L0.2 150, L0.3 80, L1.1 350, L1.2 380, L1.3 380, L1.4 200); Lote 2+ re-planned at the checkpoint (previous equivalent estimate ~1,900) |
| Per-PR range | 80 to 380 lines each, 7 repo PRs plus one draft tracker PR for Lote 0-1 |
| 400-line budget risk | Low per PR in Lote 0; Medium in L1.1-L1.3 (350-380, near the limit); High for the umbrella as a whole |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (chosen by maintainer); Lote 0 PRs are independent and small |
| Suggested split | One PR per item in table order; split L1.2 (fold vs loading) if it exceeds 400 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: Medium

Decisions needed before apply: answer Q1 before L0.1.3; Q2 before L1.1.2; confirm per-item PRs
under the cached `feature-branch-chain` (no `size:exception` expected). The first apply batch is
limited to L0.1; L0.2 and L0.3 may run in parallel in separate worktrees. Lote 2+ is not
estimable until the L1 checkpoint.
