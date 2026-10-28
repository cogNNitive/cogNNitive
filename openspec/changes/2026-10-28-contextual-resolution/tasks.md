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
| Tracker | Draft/no-merge PR; accumulates all lots | - | 0 | `dev` | - | pending (orchestrator) |
| L0.1 | Single `findDomainRoot`; nn-mcp `ROOT_DIR`; `cognitivize.ts` stops loading code found from the domain | - | 250 | tracker branch | G0.2 | done |
| L0.2 | Model-id collision detection as a reported diagnostic | - | 150 | tracker branch | G0.1 collisions, G0.2.3 | done |
| L0.3 | Verify (test-first) that `sources/` files are discovered as models; exclude or close with evidence | - | 80 | tracker branch | exploration bug note | done |
| L1.1 | `ScopeNode` types, folder adapter, fixture, purity and genericity guards | L0.1 | 350 | tracker branch | G0.1 | done |
| L1.2 | Fold (`override` + `union`), `explain`, node loading | L1.1 | 380 | L1.1 branch | G1.1 | done |
| L1.3 | Procedure slots, fills, fork recording (pure) | L1.2 | 380 | L1.2 branch | G2.1 (pure) | done |
| L1.4 | Golden validation: local script on a temp copy of the video backup, reduced committed fixture | L1.3 | 200 | L1.3 branch | new | done |
| L1 checkpoint | Conclusions into `design.md`; re-plan Lote 2+ | L1.4 | docs | L1.4 branch | new | done (L1.C.3 approved 2026-10-28) |
| L2.1a | Element adapter, pure: `scope_elements` declaration, element nodes, spec delta | L1.C.3, Q10 | 360 | L1.4 branch | new | done |
| L2.1b | Element adapter, fs loader, `none` strategy; video scenes and LC_programas Programas as real consumers | L2.1a | 380 | L2.1a branch | new | done |
| L2.2a | Drift report, pure (`driftReport`) | L2.1b (ordering only, no code dependency) | 380 | L2.1b branch | new | done |
| L2.2b | Drift CLI `scripts/dev/scope-drift.mjs`, validated on video copy and LC_programas | L2.2a, Q12 | 200 | L2.2a branch | new | pending |
| L2.3a | MCP `resolve_effective` / `explain` | L2.1b | 350 | L2.2b branch | G3 | pending |
| L2.3b | Scope-aware procedure listing, precedence in code, floor and `workspace/procedures/` | L2.3a, Q4 | 380 | L2.3a branch | G2.2, G3 | pending |
| L2.4 | Scope-qualified model ids: design spike, DECISION GATE, then provisional 3-PR list (riskiest item) | L2.3b, Q13 | spike docs; ~900 provisional | L2.3b branch | new (was deferred) | pending |
| L2 checkpoint | Conclusions; re-plan Lote 3; schedule `restrict` | L2.4 | docs | previous branch | new | pending |
| L3.1a | Video skill: `build-core-mirrors.mjs` rename and scope mirror | L2 checkpoint | 250 (+ generated bundle) | previous branch | G0.3, A1 | pending |
| L3.1b | Video skill: `resolveWorkspace` on `findDomainRoot`, params through the core, `procedures/`, folder contract | L3.1a, Q14 | 380 | L3.1a branch | A1, A2 | pending |
| L3.1c | Video skill: delete `cascade.mjs`, `nearest.mjs` and their tests | L3.1b | ~570 deleted | L3.1b branch | A2 | pending |
| L3.2 | Video domaiNN adoption (data, maintainer-run) plus the dry-run plan script | L3.1c | 250 (+ external) | L3.1c branch | A3 | pending |
| L3.3 | LC_programas adoption (data, maintainer-run) | L2.1b, L2.2b | ~100 (+ external) | previous branch | B (replaced) | pending |

Dependencies: L0.1, L0.2 and L0.3 are independent of each other. L1 needs only `findDomainRoot`
from L0.1. Lote 2 is linear in the order above (binding, maintainer-set); L2.4 is the only item
with a hard maintainer gate before any code. Lote 3 needs the Lote 2 checkpoint. Each lot reverts
on its own.

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

- [x] L1.C.1 Write Lote 1 conclusions into the `design.md` decision log: what the golden run proved or contradicted, the `ScopeNode` shape as built, the element-scope marker syntax decision (open question), slot candidates confirmed, and any change to the procedure precedence. (Done in the 2026-10-28 L1.C.1 entry; the marker syntax is now a proposal, see Q10.)
- [x] L1.C.2 Re-plan the Lote 2+ section of this file with concrete RED/GREEN tasks, file paths and estimates; update the Lot Overview and the Review Workload Forecast. (Done 2026-10-28: Lote 2, Lote 2 checkpoint and Lote 3 below.)
- [x] L1.C.3 Maintainer review of the re-plan before any Lote 2+ apply. Required answers before L2.1a starts: Q10 (element-scope marker) and the order of the lots. (Done 2026-10-28: the maintainer reviewed and approved the Lote 2+ re-plan order; Q10 confirmed, see below.)

---

## Lote 2: Value on real data (re-planned 2026-10-28 at the Lote 1 checkpoint)

Order is binding (maintainer): L2.1 element adapter, L2.2 drift report, L2.3 MCP read tools, L2.4
scope-qualified ids. Evidence behind the order: the L1.C.1 conclusions in `design.md`. Each slice
is its own PR on the `feature-branch-chain` (target = the branch of the slice before it), carries
its own validation and reverts on its own. Spec deltas come FIRST inside a slice; the
`RED` test must be seen failing before its `GREEN`.

Extra path legend for Lote 2+: `ELFIX` = `iNNfo/packages/nn-core/tests/fixtures/programas-golden/`
(new, reduced from LC_programas, SYNTHETIC: no real names, DNI, NIF or order numbers); `GOLD`
gains scene files (see L2.1b). Real data used for read-only validation (always a temp COPY when
anything is added to it, source hash re-checked afterwards, never in CI):
video `D:\Users\lucas\Documents\_NN\video_NN-backup-2026-10-27_193914`;
LC_programas `D:\Users\lucas\Documents\_NN\LC_programas` (`kNNowledge/LC_programas_Tutorias_NN.md`).
The text-only temp copy of the video backup under the session scratchpad (`video_fixture`, 600
files) DOES carry the `## NN Scene` shape (24 files, none with the old `@ scene` format); an
earlier claim that it held the old format was wrong (checked 2026-10-28 in L2.1b.5). It is a
valid source of element shapes and a safe thing to run the manual script against.

Real shapes the element adapter must carry (verified 2026-10-28):

- Video script (`series/<s>/assets/<slug>/<slug>_video-script_<s>_NN.md`): `# NN Video` with one
  `## NN Video` (`slug`, `title`, `sources`), then `# NN Scene` with N `## NN Scene` elements, each
  with `template`, `music`, `music_volume`, `transition` (repeated per scene, absent on some
  scenes such as `01 Intro`), and `### NN Layer` sub-elements by heading depth. Series values
  (`voice_id`) repeat in each `## NN Video` block of the series document.
- LC_programas Tutorias: concept sections `# NN Programa` (5), `# NN Tutor` (one per Programa,
  `nombre` identical, suffixed by the Programa title), `# NN Prestación de Servicios` (6 orders;
  `precio_hora_tutoria:: "84"` in all six; `programa_ref:: [[<Programa title>]]` and
  `tutor_ref`), `# NN Sesión de Tutoría` (`programa_ref`). The price is on the PRESTACIÓN, not on
  the Programa; the Programa is reached by `programa_ref`, never by heading nesting.

### L2.1a Element adapter, pure (specs: scope-chain, element scopes; design Decision log 2026-10-28 element-marker entry)

Goal: a pure, generic function that turns declared elements of one document into `ScopeNode`s
nested under the document's folder chain. Value: fixes the element-scope contract (marker,
parent link, ids, isolate) in a reviewable spec plus a pure implementation before any I/O. No
user-visible change yet; user value arrives in L2.1b. Estimate: ~360 lines. Gate: Q10 answered.

Start: folder adapter only. End: `elementChain` returns the element nodes of a target; the fold
resolves over `[...folder nodes, ...element nodes]` unchanged.

- [x] L2.1a.1 SPEC FIRST `specs/scope-chain/spec.md` (ADDED): Requirement "Element Scopes Declared By Frontmatter" with scenarios: a concept in `scope_elements` makes each of its elements a node; nesting by document order (nearest preceding element of the previous listed concept); `parent: <field>` resolves a `[[title]]` ref by exact unique title; `UNKNOWN_PARENT_ELEMENT`; `AMBIGUOUS_PARENT_ELEMENT`; `isolate:: true` strict boolean ends the chain and `isolate:: "true"` does not; `slug` and `isolate` fields are not values; an unlisted concept (e.g. Layer) is not a node; a document with both `scope: true` and `scope_elements` is `AMBIGUOUS_SCOPE_DECLARATION`; node ids are domain-relative and stable; trace round-trips JSON.
- [x] L2.1a.2 RED `CORE/scope/elements.spec.ts` (literal element lists, no fs): the scenarios above plus two `Video` elements in one document (each `Scene` hangs from the nearest preceding one), determinism, `JSON.parse(JSON.stringify(r))` deep-equal.
- [x] L2.1a.3 GREEN (as built: `ElementSource` also carries `scopeFlag?`; error codes `INVALID_SCOPE_DECLARATION`, `UNKNOWN_ELEMENT`, `AMBIGUOUS_ELEMENT` added; see the L2.1a Decision log entry) `SCOPE/elements.ts` (pure): types `ElementScopeDecl { concept; parent? }`, `ElementSource { doc; decls; elements: Array<{ concept; title; slug; fields }> }` (a plain structural shape the fs side builds from `parseKnowledge`; no parser import), `elementChain(source, target): { ok: true; nodes } | { ok: false; code; detail }`. Node: `{ id: '<doc>#<Concept>/<slug>', kind: 'element:<Concept>', doc, isolate, values }`. Exports in `SCOPE/index.ts`.
- [x] L2.1a.4 RED then GREEN in `elements.spec.ts`: `resolve` over `[root, series, Video, Scene]` literal nodes: scene value wins, `overridden` names the series, an element isolate hides the folder nodes but not the floor.
- [x] L2.1a.5 Extend `CORE/scope/purity.spec.ts` to `elements.ts`; genericity grep still green (concept names appear only as data in tests).
- [x] L2.1a.6 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation checks: nearest-preceding changed to first-preceding turns the two-Videos case red; removing the `slug` exclusion turns the "slug is not a value" case red.
- [x] L2.1a.7 Tick tasks; Decision log; status.

Validation on real data: none in this slice (pure). Rollback: delete `elements.ts`, `elements.spec.ts` and the spec delta.

### L2.1b Element adapter, fs loader and the two real consumers (specs: scope-chain, contextual-resolution "Resolution Is Generic Across bluepriNNts")

Goal: load element chains from real documents and prove them on both consumers. Value: per-scene
and per-episode music/volume/voice and per-order price become resolvable with `explain`
(video golden extension), and LC_programas becomes the second real consumer. Estimate: ~380
lines (near the limit; if it exceeds 400, move L2.1b.5 into L2.2b). Gate: none (Q11 was
reframed as an L3.3 adoption question on 2026-10-28; contractual values use `none`).

Start: L2.1a. End: `loadElementChain` works on `GOLD` and `ELFIX`; the manual script reports on both real domains.

- [x] L2.1b.0 (as built: `explain.notInherited` is the new optional trace field, `consulted` holds only the target, the floor's declaration is listed under `notInherited`; `driftReport` compares `none` keys against an ABSENT baseline; spec requirement "None Strategy Keeps A Declared Value Local To Its Scope" with 4 scenarios plus one drift scenario; see the L2.1b Decision log entries) RED then GREEN `SCOPE/resolve.ts`: add the `none` strategy (spec contextual-resolution, spec first if the requirement is missing). `none` returns only the TARGET node's own declaration (the innermost node of the visible chain); ancestors and the floor are never consulted for the value, and the explain trace says so (`winner` = target or null, ancestor declarations listed as not inherited, never as `overridden`). `driftReport` treats `none` keys like other keys (sibling variants are still reported) but never against an inherited baseline. Mutation check: falling back to `override` turns the "omitted contractual value stays absent" case red.
- [x] L2.1b.1 (as built: ELFIX under `tests/fixtures/programas-golden/` holds `domaiNN_NN.md`, `programas_root_scope_NN.md` and `kNNowledge/tutorias_NN.md`; GOLD gained 3 Scenes in the innteresante script, `innteresante_video_NN.md` with two `## NN Video` blocks, and both episode scripts replaced `scope: true` by `scope_elements`.) Fixtures (no implementation): `ELFIX` with a root `domaiNN_NN.md`, a root values document (`precio_hora_tutoria: "84"` as the current rate, plus a synthetic inheritable key such as `idioma: es`), a Tutorias-shaped document with frontmatter `scope_elements: [{ concept: Programa }, { concept: "Prestación de Servicios", parent: programa_ref }]` (2 Programas, 3 Prestaciones: one omitting the price, one with its own, one with an unknown `programa_ref`; 1 Tutor per Programa); extend `GOLD` with a video script holding `## NN Video` and 3 `## NN Scene` (one with `music_volume: 0.06`, one without, series value 0.4) and a series document with `## NN Video` blocks carrying `voice_id`. The existing `GOLD` episode markers (`scope: true`) are replaced by `scope_elements` (the document cannot be both; the episode FOLDER scope disappears, which was L1.4 finding 3). Synthetic data only.
- [x] L2.1b.2 (as built: the spec also covers `NO_DOMAIN_ROOT`, `UNREADABLE_DOCUMENT`, `INVALID_SCOPE_DECLARATION`, `AMBIGUOUS_SCOPE_DECLARATION` and a `null` target.) RED `CORE/scope/fs-elements.spec.ts` (`ELFIX`, `GOLD`, `mkdtemp`): `loadElementChain(path, { concept, slug })` returns folder nodes then element nodes, outermost first; ids domain-relative POSIX; values via `parseKnowledge`; a document without `scope_elements` yields only the folder nodes; an unresolved `programa_ref` returns the structured error, not a guess; `listScopeElements(path)` lists every scope element of a document in document order.
- [x] L2.1b.3 (as built: `loadElementChain(path, target | null, { floorDoc? })` returns `{ ok, loaded, chain }`; `asJson` was extracted to the pure `json.ts`; `purity.spec.ts` now classifies every module as pure or fs adapter.) GREEN `SCOPE/fs-elements.ts`: `loadElementChain` = `findScopeChain` + `loadChain` + `parseKnowledge` + `elementChain`; `listScopeElements`; export from `SCOPE/index.ts` and `CORE/index.ts`. Add the module to `purity.spec.ts` as an fs adapter (allowed to import `node:fs`).
- [x] L2.1b.4 RED then GREEN extend `CORE/scope/golden.spec.ts`: the 0.06 scene resolves `music_volume` 0.06 with winner = the scene node and `overridden` naming the series 0.4; the scene without it resolves 0.4 from the series; the series `## NN Video` `voice_id` resolves; `precio_hora_tutoria` resolved with `none` on the Prestación omitting it is ABSENT (never the root "84"), the one with its own value returns it; `idioma` resolved with `override` on a Prestación comes from the Programa or the root; chain for a Prestación is `[root, Programa, Prestación]`. Update the existing L1.4 assertions that named the episode folder node.
- [x] L2.1b.5 (as built: `--elements [<video-dir>] [--programas=<LC_programas-dir>]`; 31/31 assertions on the real data, see the Decision log.) Extend `scripts/dev/validate-scope-golden.mjs` with `--elements`: video COPY (markers and `scope_elements` frontmatter added to the copy only) prints per-script scene music/volume and asserts the known L1.4 deviations (innteresante volume 0.06 / 0.2, `elevator.mp3` once; villabotijos-today `casimiro-mahou` 0.1); LC_programas via a temp COPY of the Tutorias document with `scope_elements` added asserts 5 Programa nodes and 6/6 Prestaciones resolving their Programa by `programa_ref`; source hashes unchanged. Output is pasted in the PR body (Q8).
- [x] L2.1b.6 Verify: nn-core tests; build; `node scripts/verify.js`; run the manual script. Mutation checks: breaking ref resolution turns the LC 6/6 assertion red; ignoring `isolate::` turns the isolate case red.
- [x] L2.1b.7 Tick tasks; Decision log (include the real-shape findings above and the manual output); status.

Rollback: remove `fs-elements.ts`, the fixtures and the script flag; L2.1a stays pure.

### L2.2a Drift report, pure (specs: contextual-resolution, ADDED "Drift Report Is A Pure Read-Only Function")

Goal: "effective values and deviations per scope". For each scope and key: the baseline value
that scope offers its descendants, how many units deviate from it, and the variants. Value: the
first direct user value of the cascade (L1.C.1 conclusion 3): it states, for example, that 5 of 8
innteresante episodes deviate from the series template volume, or that 6 of 6 orders repeat
`precio_hora_tutoria` "84" and could be hoisted. Estimate: ~380 lines. Gate: none (exposure is Q12, L2.2b).

Definitions (to be fixed in the spec): a UNIT is a caller-chosen grouping of leaf chains (the
leaf itself by default, the supplying document for video episodes); a unit DEVIATES from scope S
on key K when its effective `override` value differs (deep JSON equality) from the value K
resolves to at S; `uniform` means every unit has the same value; sibling grouping uses `kind` and
the parent id as opaque equality labels, never parsed. `union` keys are listed as `skipped` with
a reason (no silent omission). Output is plain JSON, versioned, deterministically ordered.

- [x] L2.2a.1 SPEC FIRST `specs/contextual-resolution/spec.md` (ADDED): scenarios "Deviating units are counted" (5 of 8), "Uniform repetition is reported as hoistable" (6 of 6 equal), "No deviation", "Key declared nowhere is not a row", "Floor value is the baseline when no scope declares", "Isolate bounds the baseline", "Union keys are skipped visibly", "Report round-trips JSON and is deterministic", "Report never mutates its input".
- [x] L2.2a.2 RED `CORE/scope/drift.spec.ts` (literal nodes): the scenarios above with 8 units / 5 deviating and variants `0.06 x4, 0.2 x1`; unit grouping by an injected `unitOf`; `ignore` keys.
- [x] L2.2a.3 GREEN (as built: input gains `strategies?`, baseline gains `present`; see the L2.2a Decision log entry) `SCOPE/drift.ts` (pure): `driftReport({ floor, chains: Array<{ unit: string; nodes: ScopeNode[] }>, keys?, ignore? }): { v: 1; rows: DriftRow[]; skipped: Array<{ key; reason }> }`, `DriftRow = { scope; key; baseline: { value; from }; units: { total; deviating; uniform }; variants: Array<{ value; units; from }> }`, built from `resolve` only (baseline = `resolve` over the chain prefix ending at S; unit value = `resolve` over the full chain). No second fold.
- [x] L2.2a.4 Extend `purity.spec.ts` to `drift.ts`; genericity grep green.
- [x] L2.2a.5 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation checks: comparing with `===` instead of deep equality turns the object-valued case red; dropping the floor from the baseline turns the floor case red.
- [x] L2.2a.6 Tick tasks; Decision log; status.

Rollback: delete `drift.ts`, its spec and the spec delta.

### L2.2b Drift CLI and validation on real data (decision: CLI first, no MCP tool yet)

Goal: put the report in the maintainer's hands. Exposure choice (Q12): a read-only script
`scripts/dev/scope-drift.mjs` is the thinnest useful surface. It needs no MCP schema, server
registration, tool-list test, SKILL.md or docs change, follows the `scripts/dev/` precedent, and
works on any domaiNN path today. An MCP `drift` tool is deferred until an agent needs the report
(see Deferred). Value: the maintainer can run it on `video_NN` and LC_programas now. Estimate: ~200
lines. Gate: Q12 confirmation.

- [ ] L2.2b.1 RED `scripts/dev/scope-drift.test.mjs` (`node --test`; use the shape `verify.js` `collectTestSuites` discovers): over `GOLD` and `ELFIX` it prints the expected rows, `--json` output parses and equals `driftReport`, a path outside any domaiNN exits non-zero with the searched list, and the domain hash is unchanged after a run.
- [ ] L2.2b.2 GREEN `scripts/dev/scope-drift.mjs <domain-dir> [--unit leaf|doc] [--keys a,b] [--ignore slug,title] [--json]`: discovers documents, builds chains with `listScopeElements` + `loadElementChain`, calls `driftReport`, prints a table (scope, key, baseline, deviating/total, variants). Read-only; never writes.
- [ ] L2.2b.3 Validate on the video COPY with `--unit doc`: expect innteresante `music_volume` baseline 0.4 with 5 of 8 deviating (0.06 x4, 0.2 x1), one `music` variant `elevator.mp3`; villabotijos-today `casimiro-mahou` 0.1 (1 deviating); `voice_id` uniform per series. Validate on LC_programas (temp COPY of the Tutorias document): `precio_hora_tutoria` 6 of 6 uniform "84", Tutor `nombre` 5 of 5 uniform. Record the real outputs, and any mismatch as findings, in the Decision log (Q8).
- [ ] L2.2b.4 Verify: `node scripts/verify.js --only=scope-drift`; full `node scripts/verify.js`.
- [ ] L2.2b.5 Tick tasks; Decision log; status.

Rollback: delete the script and its test.

### L2.3a MCP `resolve_effective` and `explain` (specs: contextual-resolution "MCP resolve_effective And explain Tools", MODIFIED)

Goal: agents resolve and explain a value from any document or element. Value: the "what applies
here, and why" question has an answer through MCP, using the same fold as the CLI. Estimate:
~350 lines. Gate: none new (builds on L2.1b). A core `composeProcedure` is NOT part of this slice:
neither tool returns a composed procedure.

- [ ] L2.3a.1 SPEC FIRST `specs/contextual-resolution/spec.md` (MODIFIED requirement): add the optional element target `{ concept, slug }`; the floor is located by nn-mcp through `resolveBlueprintPackage` plus the single `_NN.md` under the package `defaults/`; structured errors `NO_DOMAIN_ROOT` (with `searched`), `UNSUPPORTED_STRATEGY`, element errors; both tools never throw.
- [ ] L2.3a.2 RED `MCP/tools/resolve-effective.spec.ts` against `FIX`, `GOLD`, `ELFIX`: the three spec scenarios; element target; floor fallback; trace of `explain` equals the trace of `resolve_effective`; every response JSON round-trips.
- [ ] L2.3a.3 GREEN `MCP/tools/resolve-effective.ts` (+ `MCP/tools/floor-doc.ts` locating the floor) using only core `findScopeChain`, `loadElementChain`, `loadChain`, `resolve`; register both tools in `MCP/server.ts` and update the tool list in `MCP/server.spec.ts`.
- [ ] L2.3a.4 Docs: `skills/nn-innfo/SKILL.md` (tool mentions) and `mcp-tools.md`.
- [ ] L2.3a.5 Verify: rebuild nn-core first (stale `dist` breaks nn-mcp tests), then `npm --workspace=@cognnitive/nn-mcp test`; `node scripts/verify.js`. Mutation check: a tool that re-implements the fold instead of calling `resolve` turns the trace-equality case red.
- [ ] L2.3a.6 Validate: call both tools in-process against the video COPY (a scene's `music_volume`) and LC_programas (a Prestación's price), read-only; paste outputs in the PR body.
- [ ] L2.3a.7 Tick tasks; Decision log; status.

### L2.3b Scope-aware procedure listing and precedence in code (specs: template-procedures-manifest-and-discovery, procedure-execution, both existing deltas plus new scenarios)

Goal: one precedence implementation (core `resolveProcedures`) behind the MCP listing; no
shadowed procedure is silently dropped; floor (bluepriNNt) procedures and the root
`workspace/procedures/` are included. Value: an agent asking "which procedures apply here" gets
selected AND shadowed entries with slots and fork warnings. Estimate: ~380 lines (split the docs
into their own commit; split the PR if it exceeds 400). Gate: Q4 (reversal of "blueprint >
domain", `workspace/procedures/` in the root scope) MUST be answered before L2.3b.1; Q9 decision
(document or rename) before L2.3b.3.

- [ ] L2.3b.1 SPEC FIRST: add scenarios to `specs/template-procedures-manifest-and-discovery/spec.md` (floor procedures listed and shadowed by a scope procedure; root `workspace/procedures/` listed as root scope) and to `specs/procedure-execution/spec.md` ("No silent drop" for `discoverTransitiveAssets`).
- [ ] L2.3b.2 RED `MCP/tools/spec.spec.ts`: `discoverTransitiveAssets` reports shadowed entries (no `seenProcIds` skip); `listBlueprintProcedures({ path })` from the `p1` scope returns selected and shadowed per the spec with slots, fork record and `ORIGINAL_ADVANCED`; no `path` behaves as before with status `selected`; a path outside any domaiNN returns the structured error with `searched`; floor procedures come from the blueprint package; root `workspace/procedures/` appears as root scope.
- [ ] L2.3b.3 GREEN `MCP/tools/spec.ts` (`discoverTransitiveAssets` ~829, `listBlueprintProcedures` ~1116): build the floor `ProcedureDef[]` in nn-mcp (`MCP/tools/floor-procedures.ts`; the core never loads the floor, per the L1.3 decision), run `loadChain` + `loadScopeProcedures` + `resolveProcedures`, map to listing entries; add the `path` input to the schema at `MCP/server.ts` (~690). `rg seenProcIds iNNfo/packages/nn-mcp/src` returns nothing (precedence exists only in the core).
- [ ] L2.3b.4 Docs: `skills/nn-innfo/SKILL.md` §16-bis.2 precedence rewritten as model > nearest scope > ... > root (including `workspace/procedures/`) > bluepriNNt; `mcp-tools.md`.
- [ ] L2.3b.5 Verify: rebuild nn-core, nn-mcp tests, `node scripts/verify.js`. Mutation check: restoring the first-seen skip turns the "No silent drop" case red.
- [ ] L2.3b.6 Validate (read-only): LC_programas lists its 10 root `procedures/` as root scope; the video COPY lists zero series procedures because they live in the SINGULAR `series/<s>/procedure/` (documents the L3.1b rename, not a bug); blueprint procedures appear as floor.
- [ ] L2.3b.7 Tick tasks; Decision log; status.

### L2.4 Scope-qualified model ids (RISKIEST item; spike, decision gate, then a provisional list)

Trigger met (L1.C.1 conclusion 5): 5 real collisions in the video copy (`spec_NN` x7,
`generate_video_script_procedures_NN` x5, `NoticiasVillabotijos_noticias_NN` x2,
`draft_scene_visuals_procedures_NN` x2, `select_weird_news_procedures_NN` x2) and every scope
marker needs a unique `<scope>_scope_NN.md` stem. Why it is the riskiest: ids are filename stems
used by tool arguments, `collectModels`, `readKnowledge`/`validateKnowledge`, manifest `## NN
Models` entries persisted in real domaiNNs, lineage, console and citations. Estimate: spike is
docs only; the provisional implementation is ~900 lines in 3 PRs and is re-planned after the gate.

- [ ] L2.4.1 SPIKE (docs only, no code): new `design.md` section "Scope-Qualified Model Ids": an inventory with counts of every producer and consumer of a model id (`rg` over nn-core, nn-mcp, console, scripts); the collision count per real domaiNN using the L0.2 diagnostic (all 8 reviewed domaiNNs, read-only); options A (path-qualified id only for colliding stems; bare stem accepted when unique, ambiguity is an error listing the candidates, never first-wins), B (always path-qualified), C (keep global stems, enforce unique stems by `check_domain` and a rename tool); effect on manifest entries persisted in real domains; a recommendation and a rollback story.
- [ ] L2.4.2 DECISION GATE (Q13): the maintainer chooses A, B or C. NO L2.4.3+ task starts before this answer, and the list below is re-planned from the spike.
- [ ] L2.4.3 (provisional) SPEC FIRST: MODIFIED `specs/scope-chain/spec.md` "Model Id Collision Is An Error" (reconciles the warning shipped in L0.2 with the chosen option) plus the naming contract spec.
- [ ] L2.4.4 (provisional) RED/GREEN core: id derivation in `CORE/naming/contract.ts`, `CORE/helpers.ts` `collectModels`, an ambiguity result type; `findStemCollisions` retired or repurposed.
- [ ] L2.4.5 (provisional) RED/GREEN nn-mcp: `readKnowledge`/`validateKnowledge` return an ambiguity error with candidates; `workspace-sync.ts`, `check-workspace.ts`, lineage use the new ids.
- [ ] L2.4.6 (provisional) RED/GREEN consumers: console/export and citations; remove the `<scope>_scope_NN.md` unique-stem convention if the option makes it unnecessary.
- [ ] L2.4.7 (provisional) Validate read-only: the 5 video collisions resolve with zero renames (A or B); `check_domain` before/after diff on all 8 reviewed domaiNNs; nn-core, nn-mcp tests, `node scripts/verify.js`.

Rollback: option-dependent; the manifest-entry change is the irreversible part, which is why the gate exists.

### L2 checkpoint (mandatory before Lote 3)

- [ ] L2.C.1 Write Lote 2 conclusions into the `design.md` decision log: drift numbers on the real domains, the element contract as built, MCP surface, the id decision, and what Lote 3 now needs.
- [ ] L2.C.2 Re-plan Lote 3 with concrete RED/GREEN tasks; decide the placement of `restrict` for `video-guard.json` `allowedModels` (trigger met; scheduled after L2.3) and of the marker-move warning (Q1b).
- [ ] L2.C.3 Maintainer review of the Lote 3 plan before any Lote 3 apply.

---

## Lote 3: Adoptions (coarser; re-planned in detail at the Lote 2 checkpoint)

Each adoption has its own task list and validation. Steps that touch real external data are
maintainer-run, never CI (Q8), and every such step is first rehearsed on a temp copy.

### L3.1 Video skill consumes nn-core (code in this repository; CI-verifiable)

Value: one resolver instead of two private ones; the video skill honours the same chain the MCP
tools show. Gates: Q14 (composition of procedure bodies) before L3.1b; Q8.

- [ ] L3.1a.1 RED/GREEN `scripts/build-trannsform-core-mirror.mjs` -> `scripts/build-core-mirrors.mjs` (update every reference found with `rg`; keep its existing test, renamed): a second target generates a CJS mirror of the scope module for the video skill, following the `nn-sources` precedent; `--check` mode wired into `scripts/verify.js` (drift test: a hand-edited mirror turns it red). Estimate ~250 excluding the generated bundle.
- [ ] L3.1b.1 RED/GREEN `video-guard.mjs` `resolveWorkspace` (~98) on `findDomainRoot` through the mirror; the guard file is only read at `<root>/video-guard.json`; no `.git` branch.
- [ ] L3.1b.2 RED/GREEN generic `accept` option on core `resolve` (the typed-parameter skip that `cascade.mjs` has; removed in L1.2 until a consumer needs it), with its own core test and mutation check.
- [ ] L3.1b.3 RED/GREEN callers of `cascade.mjs`/`nearest.mjs` move to the mirror and the element chain (`scene > video > series`): `video-engine-cli.mjs`, `synthesize-avatar.mjs`, `scene-compiler.mjs`, `render-thumbnail.mjs`, `lib/tts-options.mjs`, `build-script-from-draft.mjs`, `asset-synthesizer.mjs`, `asset-cost-estimator.mjs`; existing `node --test` suites stay green.
- [ ] L3.1b.4 RED/GREEN the skill's procedures folder constant `procedure/` -> `procedures/`; the folder contract becomes "no escape above the scope root" (specs `video-folder-contract`, `video-script-skill`).
- [ ] L3.1b.5 CONDITIONAL on Q14: if a tool or the skill must return a composed procedure body, RED/GREEN a core `composeProcedure(def, bindings)` (replaces the 5-line `compose` in `golden.spec.ts` and the script); otherwise skip with a Decision log entry.
- [ ] L3.1c.1 DELETE `lib/cascade.mjs`, `lib/nearest.mjs`, `test/cascade.test.mjs`, `test/nearest.test.mjs` (about 570 lines, mechanical); `rg` proves no importer remains. Deletion-only PR; flag it in the PR body as such.
- [ ] L3.1.V Verify each PR: `node --test` for the video suites against the mirror, `node scripts/verify.js`, golden script re-run on the video COPY (output in the PR body). Tick tasks; Decision log.

### L3.2 Video domaiNN adoption (external data, maintainer-run)

Value: `draft_scene_visuals` exists once, series values live in one marker per series, and the
domaiNN stops contradicting itself (`video-guard.json` voice map). Slot reduction guidance
(L1.C.1): converge the two copies first, then keep slots only for the residual divergence; the
L1.4 diff has 14 hunks (6.3% of the larger copy) and 14 paragraph slots is too heavy.

- [ ] L3.2.1 RED/GREEN `scripts/dev/adopt-video-plan.mjs <dir>` (dry run only, writes nothing in `<dir>`; CI-tested on `GOLD`): emits the plan for adding `domaiNN_NN.md`, one `<series>_scope_NN.md` per series (hoisting the scattered series values), `procedure/` -> `procedures/`, and the before/after drift report.
- [ ] L3.2.2 Maintainer decision per hunk of the `draft_scene_visuals` diff: converge or keep as a slot; target a handful of slots, not 14. `select_*_news`: slots news_sources, topic_filter, news_model_ref.
- [ ] L3.2.3 MAINTAINER-RUN on a copy, then live: apply the plan; run `check_domain`, `scope-drift`, `resolve_effective` on the result; paste the evidence in the Decision log. Not a CI gate and not required for archive.

### L3.3 LC_programas adoption (external data, maintainer-run)

Value: `precio_hora_tutoria` and tutor identity stop being repeated 6 and 5 times; the
`Lean_Business_Plan_*` procedures stop hardcoding `sources/import/...` paths. This is the second
real consumer that closes the umbrella.

- [ ] L3.3.1 Maintainer-run on a copy first: add frontmatter `scope_elements` to `kNNowledge/LC_programas_Tutorias_NN.md` (the domaiNN already has `domaiNN_NN.md` and a root `procedures/`); decide the data shape (Q11): the current rate may live as a default at the root or on the Programa, but each Prestación KEEPS its own explicit `precio_hora_tutoria` (contractual/invoiced value, strategy `none`; never removed in favour of inheritance). `scope-drift` reports Prestaciones below or above the current rate instead. Only genuinely inheritable keys may be de-duplicated, and only where `scope-drift` shows `uniform`.
- [ ] L3.3.2 Slot the hardcoded import paths of `Lean_Business_Plan_from_Model` / `_from_Transcript` (first seen: `sources/import/LeanBusinessPlanProyectosCoworkingEOI` at lines 18 and 96 of the Model variant) with the smallest slot set the copies need.
- [ ] L3.3.3 Close-out check: LC_programas resolves at least one `override` key and one slotted procedure through element scopes (`resolve_effective`, `explain`, procedure listing) with evidence in the Decision log. This is the last in-scope item; the change may then be archived (diff the archive copy: `sdd-archive` on haiku has truncated artifacts before).

---

## Deferred (not in this change)

Each item has an unlock trigger. Adding an item requires a dated `design.md` entry.

Scheduled out of Deferred on 2026-10-28 (see the re-plan entry in `design.md`): element adapter
(L2.1), scope-qualified model ids (L2.4), video adoption (L3.1/L3.2), LC_programas adoption (L3.3).

- `restrict` strategy. Unlock: MET by `video-guard.json` `allowedModels`; scheduled after L2.3. Placement and the tighten-only merge semantics are decided at the L2 checkpoint (L2.C.2), then it moves into a lot section.
- Source visibility bounded by the chain (specs: workspace-sources-resolution; Q6). Unlock: Q6 answered and a domaiNN with per-scope `sources/` exists. (Was in the old Lote 2+ list; no maintainer-ordered slice needs it yet.)
- `compareEffective` marker-move warning (spec scope-chain "Marker Move Changes Effective Values Warning"; Q1b). Unlock: Q1b answered yes and a move/changeset preview needs it; the drift report (L2.2) already shows the building blocks.
- Drift report as an MCP tool. Unlock: an agent workflow needs the report (for example before editing a series template); L2.2b ships the CLI only.
- Core `composeProcedure` and richer slot features. Unlock: a tool or skill must return a composed procedure body (Q14), or a second procedure needs more than the current slots. Keep series copies convergent instead.
- Snapshot on create (generic): when a document is created (`init_knowledge` or a procedure step), resolve the effective value of selected keys through the chain and write it EXPLICITLY into the new document, so contractual/historical values are frozen at creation and never re-inherited (pairs with `none`). Added 2026-10-28. Unlock: the first consumer that creates documents carrying contractual values (e.g. a new LC_programas Prestación) through a cogNNitive tool.
- `append` strategy. Unlock: agent-context assembly work starts.
- Per-field `inherit::` (L1) and L2 scope declaration. Unlock: the next iNNfo (L1) version is opened.
- Per-scope `aggregate` (manifest, console, lineage, change views). Unlock: a consumer needs a per-scope index or console after Adoption.
- Per-scope ingestion (`sources/` scanner, `importRaw`). Unlock: a domaiNN needs to import into a sub-scope.
- Lockfile / materialization on publish. Unlock: first publish flow that needs frozen effective values; would also narrow the ~25 upgrade backup/copy folders.
- Per-scope bluepriNNt version pin. Unlock: two scopes in one domaiNN need different bluepriNNt versions.
- User/org scope above the domaiNN. Unlock: a second domaiNN needs shared defaults.
- `extends` (explicit multi-composition). Unlock: a case single-parent containment demonstrably cannot express.
- Video drift fixes (`shared/` vs `assets/`, stale `video-production-hierarchy` spec). Unlock: video adoption lands.
- `projects` bluepriNNt adoption. Unlock: a real consumer appears (none today).

## Open Questions / Maintainer Decisions Pending

- [x] Q1 ~~When nn-mcp starts outside any domaiNN, `ROOT_DIR` falls back to `cwd`.~~ Resolved 2026-10-28 (maintainer): no `domaiNN_NN.md` and no `INNFO_DOMAIN_DIR` -> `ROOT_DIR` is `cwd`; never `.git`.
- [x] Q7 ~~`projects` release cost (template_version bump, tag/repin).~~ Moot: `projects` is no longer an adoption target (design entry 2026-10-28, LC_programas).
- [ ] Q1b Is the marker-move warning (`compareEffective` on move/changeset preview) SHOULD-in-scope? Now a Deferred item (2026-10-28 re-plan); decide at the L2 checkpoint (L2.C.2).
- [x] Q2 `isolate: true` frontmatter syntax: strict boolean on the marker document, same as `scope: true`. Applied in L1.1 as the assumed answer (`isolate: "true"` is not an isolate, tested); maintainer to confirm at the Lote 1 checkpoint. (affects L1.1.2)
- [x] Q3 ~~Nested `domaiNN_NN.md` is not descended by outer discovery.~~ Resolved 2026-10-28 (maintainer): a nested `domaiNN_NN.md` is its own root; outer discovery (`walkMarkdownFiles`, manifest sync) does not descend into it. Applied in `workspace-sync.ts`; `listKnowledge`/`check_domain` descent is tracked in the Decision log.
- [ ] Q4 `workspace/procedures/` is placed in the root scope, above the bluepriNNt. This reverses the documented "blueprint > domain" precedence in §16-bis.2. Confirm the reversal. (Applied in the core since L1.3.2; GATE before L2.3b.1, which makes it the MCP behaviour.)
- [ ] Q5 The living `workspace-entrypoint` spec still names `workspace_NN.md` plus an `index.md` fallback, which conflicts with the marker walk on `domaiNN_NN.md` (and the no-fallback rule). Confirm the delta replaces it fully. (affects L0.1)
- [ ] Q6 Broader source visibility: each scope's `sources/` is visible nearest-first (own scope plus ancestors, bounded by isolate). Confirm this widening. (Deferred item; no scheduled slice needs it.)
- [ ] Q8 Data changes in the external `video_NN` and LC_programas domaiNNs are not CI-verifiable. Accept manual evidence in the Decision log as the gate?
- [ ] Q9 `scope::` field-name confusion in the procedures bluepriNNt (an existing field vs the new `scope: true` frontmatter flag and `fork_of.scope`). Rename, or document the distinction? (affects L1.3)
- [x] Q10 Element-scope marker syntax. RESOLVED 2026-10-28 (maintainer confirmed): element-scope marker = document frontmatter `scope_elements: [{ concept: <Concept> }, ...]`, optional `parent: <field>` (a `[[title]]` reference to the parent element), default parent = nearest preceding element of the previous listed concept, `isolate:: true` strict-boolean field per element, and `AMBIGUOUS_SCOPE_DECLARATION` when a document has both `scope: true` and `scope_elements`. No heading syntax, no `scope::` field. Rationale in the `design.md` entries of 2026-10-28.
- [ ] Q11 (reframed 2026-10-28; now an L3.3 adoption question, no longer a gate for L2.1b) LC_programas data shape: `precio_hora_tutoria` lives on each `## NN Prestación de Servicios` (6 orders, all "84"), linked to its Programa by `programa_ref`. Repo-level conclusion already taken: contractual/invoiced values use strategy `none` and are never inherited (an earlier proposal to move "84" to a root document and let Prestaciones inherit it was rejected: changing the rate would silently rewrite historical orders). Open for the maintainer at L3.3: where the CURRENT rate lives as a default (root or Programa), given that every Prestación keeps its own explicit value.
- [x] Q12 RESOLVED 2026-10-28 (maintainer confirmed: CLI first, MCP tool stays deferred). Drift report exposure (gate for L2.2b). Proposal: ship a read-only CLI `scripts/dev/scope-drift.mjs` first and defer the MCP tool (thinnest surface, no server or docs change). Confirm, or ask for the MCP tool in L2.3.
- [ ] Q13 Model-id strategy (gate for L2.4.2; answered after the L2.4.1 spike): A path-qualified id only for colliding stems (bare stem accepted when unique, ambiguity is an error with candidates), B always path-qualified, C keep global stems and enforce unique stems with a rename tool.
- [ ] Q14 Who composes a slotted procedure body? (gate for L3.1b.5). Option 1: a core `composeProcedure(def, bindings)` shared by the video skill and the MCP tools. Option 2: tools return definition plus bindings and the agent composes. Decide when a consumer first needs the composed text.

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | Lote 0 + Lote 1 (done): ~1,790. Lote 2: ~2,050 (L2.1a 360, L2.1b 380, L2.2a 380, L2.2b 200, L2.3a 350, L2.3b 380) plus L2.4, whose spike is docs only and whose provisional implementation is ~900 in 3 PRs, re-planned after the Q13 gate. Lote 3: ~1,000 added in this repository (L3.1a 250, L3.1b 380, L3.2 250, L3.3 ~100) plus ~570 deleted lines (L3.1c) and external data steps that are not reviewed here. Umbrella total ~6,300 changed lines including the provisional L2.4 work |
| Per-PR range | 200 to 380 lines each for 11 planned repo PRs in Lote 2 and Lote 3 (excluding L2.4); L3.1c is a ~570-line deletion-only PR; the three provisional L2.4 PRs are ~300 each |
| 400-line budget risk | Medium per PR: L2.1b, L2.2a, L2.3b and L3.1b sit at 380 (near the limit; each names its split point); High for L2.4 (cross-cutting ids) and for the umbrella as a whole; L3.1c exceeds the budget only through mechanical deletions |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (chosen by maintainer); each PR targets the branch of the PR before it; only the tracker merges to `dev` |
| Suggested split | One PR per slice in Lot Overview order: L2.1a -> L2.1b -> L2.2a -> L2.2b -> L2.3a -> L2.3b -> L2.4 (spike PR, then gated) -> L2 checkpoint -> L3.1a -> L3.1b -> L3.1c -> L3.2 -> L3.3 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: Medium

Decisions needed before apply (L1.C.3 maintainer review of this re-plan): Q10 before L2.1a.1;
Q11 before L3.3.1 (reframed 2026-10-28); Q12 before L2.2b.1; Q4 before L2.3b.1; Q13 before any L2.4.3+ task (hard
gate, after the L2.4.1 spike); Q14 before L3.1b.5. L2.1a is the first apply batch after
L1.C.3. No `size:exception` is expected except possibly L3.1c (deletions) if the maintainer
prefers one PR. Real-data validation steps are read-only and maintainer-run or local-only; none
is a CI gate.
