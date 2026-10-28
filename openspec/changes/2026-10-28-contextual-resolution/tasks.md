# Tasks: Contextual Resolution — Scope Chain and Typed Cascade (Umbrella Roadmap)

This file is the LIVING ROADMAP of an umbrella change. The total scope must never be lost.

## How To Use This File

- Every phase PR MUST tick the tasks it completes in this file, in the same PR.
- Every phase PR MUST append dated entries to the `design.md` Decision log for each scope or
  strategy decision it makes or reverses.
- A PR that unlocks a Deferred item moves it into a phase section (with tasks) and logs a
  dated `design.md` entry. Adding a new deferred item also requires a dated entry.
- The change stays ACTIVE (not archived) until the last in-scope phase (Adoption B) lands.
  Slice A3 is outside this repository and is tracked here but does not gate archive.
- Strict TDD: inside each slice the `RED` task precedes its `GREEN` tasks. The `RED` test
  must be seen failing before the implementation is written. Each slice ends with a
  verification task.
- Test runners: nn-core `npm --workspace=@cognnitive/nn-core test`; nn-mcp
  `npm --workspace=@cognnitive/nn-mcp test`; script suites `node scripts/verify.js --only=<substring>`;
  video suites `node --test <file>`.
- Chain strategy: `feature-branch-chain`. A draft/no-merge tracker PR targets `dev`; PR 1
  targets the tracker branch; every later PR targets the branch of the PR before it. Only the
  tracker merges to `dev`. Every child PR carries a dependency diagram marking itself with
  the pointer glyph, and states start, end, prior dependencies, follow-ups and out-of-scope.
- No backwards-compatibility code anywhere in this change: no aliases, fallbacks, dual readers.

### Path Legend

`CORE` = `iNNfo/packages/nn-core/src/`; `SCOPE` = `CORE/scope/`; `MCP` =
`iNNfo/packages/nn-mcp/src/`; `FIX` = `iNNfo/packages/nn-core/tests/fixtures/scoped-portfolio/`;
`VID` = `iNNfo/specs/bluepriNNts/video-script/skills/nn-video-script/scripts/lib/`;
`PROJ` = `iNNfo/specs/bluepriNNts/projects/`. Spec ids refer to
`openspec/changes/2026-10-28-contextual-resolution/specs/<capability>/spec.md`.

## Phase Overview

| Slice | Goal | Depends on | ~Lines | PR target branch | Status |
|-------|------|------------|--------|------------------|--------|
| Tracker | Draft/no-merge PR; accumulates all phases | - | 0 | `dev` | pending |
| G0.1 | `chain.ts`, `fs-chain.ts`, `findStemCollisions`, fixture, purity spec | - | 380 | tracker branch (PR 1) | pending |
| G0.2 | nn-mcp swaps to `findDomainRoot`; `dev-checkout.ts`; collision diagnostic | G0.1 | 300 | G0.1 branch (PR 2) | pending |
| G0.3 | Core mirror build (`build-core-mirrors.mjs`); video `resolveWorkspace` on `findDomainRoot` | G0.1 | 220 | G0.2 branch (PR 3) | pending |
| G1.1 | `resolve.ts`, `fs-layers.ts`, explain round-trip | G0.1 | 380 | G0.3 branch (PR 4) | pending |
| G1.2 | `compareEffective`; isolate-bounded source resolver | G1.1 | 150 | G1.1 branch (PR 5) | pending |
| G2.1 | `procedures.ts`, `fs-procedures.ts`, procedure fixtures | G1.1 | 380 | G1.2 branch (PR 6) | pending |
| G2.2 | `discoverTransitiveAssets` reports shadowed entries | G2.1 | 150 | G2.1 branch (PR 7) | pending |
| G3 | `resolve_effective`, `explain`, scope-aware listing, SKILL.md §16-bis.2 | G1.1, G2.1, G2.2 | 350 | G2.2 branch (PR 8) | pending |
| A1 | Video params resolve through the core mirror; delete `cascade.mjs` | G0.3, G1.1, G2.1 | 400 | G3 branch (PR 9) | pending |
| A2 | `findNearest*` becomes `findInChain`; delete `nearest.mjs`; folder contract | A1 | 300 | A1 branch (PR 10) | pending |
| A3 | `video_NN` domaiNN data: markers, one slotted `draft_scene_visuals` (external repo) | A2 | n/a | n/a (external) | pending |
| B | `projects` bluepriNNt adopts scopes; `template_version` bump | G2.1 | 300 | A2 branch (PR 11) | pending |

Dependencies: G0.1 → G0.2/G0.3 → G1 → G2 → G3; A1–A2 need G0.3 + G1 + G2; B needs G2.
Each slice reverts on its own. Estimates exclude the generated mirror bundle (drift-checked,
not reviewed).

---

## Slice G0.1: Scope chain core (specs: scope-chain; design Data Shapes, Interfaces)

Start: no `scope/` module exists. End: pure `buildScopeChain` and fs adapter `findScopeChain` pass the fixture.

- [ ] G0.1.1 Create the tracker branch and the draft/no-merge tracker PR; record branch names in the PR body and in a `design.md` Decision log entry.
- [ ] G0.1.2 Build fixture `FIX` (do not implement yet): root `domaiNN_NN.md`, optional root values doc, `portfolio/` → `programs/alpha/` → `projects/p1/` (3+ depths), isolated `programs/legacy/` (`isolate: true`), a nested `domaiNN_NN.md` subtree, two sibling scopes sharing a model stem, a folder without a marker, a marker with `scope: "yes"`, a directory with two markers.
- [ ] G0.1.3 RED `CORE/scope/chain.spec.ts`: in-memory `probe`/`parentOf` map. Cases: root found from a deep document; three-level chain, outermost first; folder without marker is not a scope; non-boolean `scope` value is not a scope; two markers in one dir returns `DUPLICATE_SCOPE_MARKER`; no marker returns `NO_DOMAIN_ROOT` with `searched`; isolate sets `cutAt` and truncates; sibling unaffected; nested `domaiNN_NN.md` is its own root with implicit isolate. (scope-chain: "Root found from a deep document", "Three-level chain", "Folder without a marker is not a scope", "Flag value other than true", "Two markers in one directory", "Chain cut at an isolated scope", "Siblings are unaffected", "Nested domaiNN is its own root", "Outer discovery stops at the nested root")
- [ ] G0.1.4 GREEN `SCOPE/types.ts`, `SCOPE/chain.ts`: pure `buildScopeChain`. All relative imports carry `.js`.
- [ ] G0.1.5 RED `CORE/scope/stem-collision.spec.ts`: `findStemCollisions` names the id and both paths; same stem across nested domaiNNs is fine. (scope-chain: "Sibling scopes share a stem", "Same stem in different domaiNNs is fine")
- [ ] G0.1.6 GREEN `SCOPE/chain.ts`: `findStemCollisions`.
- [ ] G0.1.7 RED `CORE/scope/fs-chain.spec.ts` against `FIX` plus `mkdtemp` cases: domaiNN without `.git`; `.git` above root ignored; repo root without a marker is not a root; tags/other memberships create no parent. (scope-chain: "domaiNN without git", "Git directory is ignored", "Repository root without a marker is not a root", "Tags do not create parents")
- [ ] G0.1.8 GREEN `SCOPE/fs-chain.ts`: `findScopeChain`, `findDomainRoot`, `findInChain` (reads markers with nn-core `parseFrontmatter`); `SCOPE/index.ts`; re-export from `CORE/index.ts`.
- [ ] G0.1.9 RED then GREEN `CORE/scope/purity.spec.ts` (same pattern as `workspace/integrity/purity.spec.ts`: pure files import no `node:fs`/`node:path` I/O) and genericity test: core contains no `video|series|projects`. (contextual-resolution: "Core contains no consumer vocabulary")
- [ ] G0.1.10 Verify: nn-core test suite; `npm --workspace=@cognnitive/nn-core run build`; `node scripts/verify.js`. Mutation check: dropping the isolate branch turns G0.1.3 red.
- [ ] G0.1.11 Tick tasks here; append Decision log entries; update status column.

Deletes: nothing.

## Slice G0.2: nn-mcp uses the single finder (specs: workspace-entrypoint, scope-chain "Single Scope Finder"; design Root Finder Replacement)

Start: G0.1 merged into the chain. End: `ROOT_DIR` and manifest discovery use `findDomainRoot`; `repo-root.ts` is gone.

- [ ] G0.2.1 RED `MCP/server.spec.ts`: root resolved from a subdirectory of the fixture; no-git domaiNN; `INNFO_DOMAIN_DIR` override wins; no marker falls to `cwd` (see Open Questions Q1). (workspace-entrypoint: "MCP tool called from a subdirectory", "No marker found")
- [ ] G0.2.2 RED `MCP/tools/workspace-sync.spec.ts`: manifest sync works in a domaiNN without git; `walkMarkdownFiles` skips a dir holding a nested `domaiNN_NN.md`. (workspace-entrypoint: "Manifest sync in a domaiNN without git", "Manifest sync does not absorb a nested domaiNN")
- [ ] G0.2.3 RED `MCP/tools/check-workspace.spec.ts`: model-id collision yields an error naming the id and both paths. (scope-chain: "Sibling scopes share a stem")
- [ ] G0.2.4 RED `MCP/tools/dev-checkout.spec.ts`: `devCheckoutRoot` derives from module location, never from the domain path.
- [ ] G0.2.5 GREEN `MCP/tools/dev-checkout.ts` (extract from `console-regeneration.ts`); `MCP/tools/cognitivize.ts:29` uses it.
- [ ] G0.2.6 GREEN `MCP/server.ts:66`: `ROOT_DIR = INNFO_DOMAIN_DIR ?? findDomainRoot(cwd) ?? cwd`.
- [ ] G0.2.7 GREEN `MCP/tools/workspace-sync.ts:63`, `MCP/tools/propose-changeset.ts:56`: `join(root, ENTRYPOINT_FILENAME)`; nested-root skip.
- [ ] G0.2.8 GREEN `MCP/tools/check-workspace.ts`: call `findStemCollisions`.
- [ ] G0.2.9 DELETE `MCP/tools/repo-root.ts`, `MCP/tools/repo-root.spec.ts`, `findManifestPath`, `findWorkspaceRoot`; grep proves zero `.git`-based domaiNN lookups remain in nn-mcp. (scope-chain: "One finder in the codebase")
- [ ] G0.2.10 Verify: rebuild nn-core first (stale `dist` breaks nn-mcp tests), then `npm --workspace=@cognnitive/nn-mcp test`; `node scripts/verify.js`.
- [ ] G0.2.11 Tick tasks; Decision log; status.

Deletes: `repo-root.ts` (+ spec), `findManifestPath`, `findWorkspaceRoot`, the prefix heuristic.

## Slice G0.3: Core mirror and video root (specs: video-script-skill "Workspace resolved without git"; design Root Finder Replacement)

Start: nn-core has `findDomainRoot`. End: video resolves its workspace through a generated CJS mirror.

- [ ] G0.3.1 RED `test/build-core-mirrors.test.mjs`: `--check` fails when `nn-core.generated.cjs` drifts from `CORE/scopePrimitives.ts`; passes when regenerated.
- [ ] G0.3.2 GREEN rename `scripts/build-trannsform-core-mirror.mjs` to `scripts/build-core-mirrors.mjs`; add second target `CORE/scopePrimitives.ts` → `VID/nn-core.generated.cjs`; update every reference (grep old name, including docs and `verify.js`). The mirror is generated, never hand-edited.
- [ ] G0.3.3 GREEN `scripts/verify.js`: run `build-core-mirrors --check`.
- [ ] G0.3.4 RED `VID` video-guard test: workspace resolved without `.git`; guard file only at `<root>/video-guard.json`. (video-script-skill: "Workspace resolved without git")
- [ ] G0.3.5 GREEN `VID/video-guard.mjs:98` `resolveWorkspace` uses `findDomainRoot` via the mirror.
- [ ] G0.3.6 DELETE the `.git` branch and the guard-file upward walk in `video-guard.mjs`.
- [ ] G0.3.7 Verify: `node scripts/build-core-mirrors.mjs --check`; `node scripts/verify.js --only=video`; full `node scripts/verify.js`.
- [ ] G0.3.8 Tick tasks; Decision log; status.

Deletes: `.git` and guard-walk branches in `video-guard.mjs`; the old mirror script name.

## Slice G1.1: Pure resolution (specs: contextual-resolution; design Interfaces, Data Shapes)

Start: chain exists. End: `override` and `union` resolve over a `LoadedChain` with a JSON-safe `explain`.

- [ ] G1.1.1 RED `CORE/scope/resolve.spec.ts` with literal `LoadedChain`: nearest wins at three depths; child without value inherits; floor used when no scope sets the key; no default anywhere gives `present: false`; union accumulates and nearer entry shadows (shadowed listed); `isolate` blocks the parent value; unknown strategy returns `UNSUPPORTED_STRATEGY`; same input gives same output. Every result passes `JSON.parse(JSON.stringify(r))` deep-equal. (contextual-resolution: "Same input, same output", "Unknown strategy", "No scope sets the key", "No default anywhere", "Nearest declaration wins at three depths", "Child without a value inherits", "Entries accumulate", "Nearer entry shadows farther entry", "Trace names the supplier", "Trace round-trips", "Overridden candidates are visible", "Parent value is not inherited across isolate")
- [ ] G1.1.2 GREEN `SCOPE/resolve.ts`: `resolve`, closed `MergeStrategy = 'override' | 'union'`; `keyedEntries` normalization (keyed list `[name=value, …]`, array, object) moved from `cascade.mjs`.
- [ ] G1.1.3 RED `CORE/scope/fs-layers.spec.ts` on `FIX`: values come from the first element of the `scope: true` document via `parseKnowledge`; root may add a values doc beside `domaiNN_NN.md`; floor is the single `_NN.md` under the bluepriNNt `defaults/`, injected via `floorDoc`; consumer-appended layers sort after.
- [ ] G1.1.4 GREEN `SCOPE/fs-layers.ts`: `loadChain`.
- [ ] G1.1.5 Extend purity spec to cover `resolve.ts`; genericity grep still green.
- [ ] G1.1.6 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation check: removing floor injection turns G1.1.1 "No scope sets the key" red.
- [ ] G1.1.7 Tick tasks; Decision log; status.

Deletes: nothing (video `cascade.mjs` is deleted in A1).

## Slice G1.2: Effective-value comparison and source visibility (specs: workspace-sources-resolution, scope-chain "Marker Move Changes Effective Values Warning"; design Invariants)

- [ ] G1.2.1 RED `CORE/scope/compare.spec.ts`: `compareEffective(before, after)` lists keys whose supplier or value changed with `from`/`to`; a move that changes nothing yields `[]`. (scope-chain: "Move into a scope with a different default", "Move that changes nothing")
- [ ] G1.2.2 GREEN `SCOPE/resolve.ts`: `compareEffective`.
- [ ] G1.2.3 RED `fs-source-resolver` spec: nearest copy wins; nearer scope with `sources/` but not the file falls back outward; isolate bounds visibility; sibling scope sources invisible; no implicit prefix. (workspace-sources-resolution: "Nearest copy wins", "Nearer scope has sources but not the file", "Isolate bounds visibility", "Sibling scope sources are invisible", "No implicit prefix", "Nested document resolves a local sub-workspace source", "Nested document falls back to the root workspace")
- [ ] G1.2.4 GREEN `fs-source-resolver.ts`: bound the walk at the chain's outermost link (isolate-aware) instead of `rootDir`.
- [ ] G1.2.5 DELETE the `rootDir` walk bound.
- [ ] G1.2.6 Verify: nn-core and nn-mcp tests; `node scripts/verify.js`.
- [ ] G1.2.7 Tick tasks; Decision log; status.
- [ ] G1.2.8 (SHOULD, pending maintainer decision Q1b) wire the move warning into the move/changeset preview in nn-mcp using `compareEffective`; if descoped, log it in Deferred with a trigger.

Deletes: `rootDir` walk bound in the source resolver.

## Slice G2.1: Procedure resolution and slots (specs: procedure-extension-points, procedure-execution; design Data Shapes)

- [ ] G2.1.1 Extend `FIX` with `<scope>/procedures/*_procedures_NN.md`: a slotted root procedure (`slots:` frontmatter), `fills:` in child values docs, a declared fork (`fork_of`), an undeclared shadow, a `{ procedure: id }` filler.
- [ ] G2.1.2 RED `CORE/scope/procedures.spec.ts` (literal `ScopeProcedures`): slot declared; `DUPLICATE_SLOT`; two series share one procedure; nearest filler wins; `REQUIRED_SLOT_UNFILLED`; `UNKNOWN_SLOT`; `FILLER_KIND_MISMATCH`; `UNKNOWN_FILLER_PROCEDURE`; declared fork recorded; `UNDECLARED_SHADOW` warning; `ORIGINAL_ADVANCED` when recorded version differs, none when equal; precedence model > nearest scope > … > root > bluepriNNt; shadowed listed, never dropped; round-trip through JSON. (procedure-extension-points: all scenarios; procedure-execution: "Model overrides workspace", "Nearest scope wins over farther scope and bluepriNNt", "Scope procedure outranks the bluepriNNt", "No silent drop")
- [ ] G2.1.3 GREEN `SCOPE/procedures.ts`: `resolveProcedures` reusing `union` for the id registry and `override` per slot.
- [ ] G2.1.4 RED `fs-procedures.spec.ts` on `FIX`: sibling procedures not visible; scope-aware context. (procedure-execution: "Sibling procedures are not visible")
- [ ] G2.1.5 GREEN `SCOPE/fs-procedures.ts`: `loadScopeProcedures`.
- [ ] G2.1.6 Extend purity spec to `procedures.ts`; genericity grep green.
- [ ] G2.1.7 Verify: nn-core tests; build; `node scripts/verify.js`. Mutation check: removing the shadow report turns "No silent drop" red.
- [ ] G2.1.8 Tick tasks; Decision log; status.

Deletes: nothing.

## Slice G2.2: Transitive asset discovery reports shadowing (specs: procedure-execution "No silent drop")

- [ ] G2.2.1 RED `MCP/tools/spec.spec.ts`: `discoverTransitiveAssets` returns shadowed entries with the shadowing supplier; none dropped.
- [ ] G2.2.2 GREEN `MCP/tools/spec.ts`: report shadowed entries via `resolveProcedures`.
- [ ] G2.2.3 DELETE the silent `seenProcIds` skip.
- [ ] G2.2.4 Verify: nn-mcp tests; `node scripts/verify.js`.
- [ ] G2.2.5 Tick tasks; Decision log; status.

Deletes: `seenProcIds` silent skip.

## Slice G3: MCP tools and agent guidance (specs: contextual-resolution "MCP resolve_effective And explain Tools", template-procedures-manifest-and-discovery)

- [ ] G3.1 RED `MCP/tools/resolve-effective.spec.ts` on `FIX`: `resolve_effective` returns value and chain; `explain` returns only the trace; path outside any domaiNN returns a structured error. (contextual-resolution: "resolve_effective returns value and chain", "explain returns only the trace", "Path outside any domaiNN")
- [ ] G3.2 RED `MCP/server.spec.ts`: `list_blueprint_procedures` with `path` lists from a project scope with `shadowed`, `forks`, `diagnostics`; slots and fork warnings included; no `path` keeps today's behavior; path outside any domaiNN errors. (template-procedures-manifest-and-discovery: all four scenarios)
- [ ] G3.3 GREEN `MCP/tools/resolve-effective.ts`; register `resolve_effective` and `explain` in `MCP/server.ts`.
- [ ] G3.4 GREEN extend `list_blueprint_procedures` (no rename; 16 files reference it).
- [ ] G3.5 Docs: `skills/nn-innfo/SKILL.md` §16-bis.2 precedence (model > nearest scope > root > bluepriNNt) and "resolve, never copy"; `mcp-tools.md`; keep the installed-skill drift check green.
- [ ] G3.6 DELETE the prose-only precedence wording ("blueprint > domain").
- [ ] G3.7 Verify: nn-mcp tests; `node scripts/verify.js`; check:spec-urls (no bare `cogNNitive/iNNfo` slug in `openspec/specs/`).
- [ ] G3.8 Tick tasks; Decision log; status.

Deletes: prose-only precedence in §16-bis.2.

## Slice A1: Video consumes core resolution (specs: video-script-skill "Skill Consumes nn-core Scope Resolution")

- [ ] A1.1 RED port `cascade.test.mjs` to call the mirrored `resolve`; add "existing cascade behavior is preserved" parity cases; cli/layer/scene/video levels expressed as appended layers. (video-script-skill: "Existing cascade behavior is preserved")
- [ ] A1.2 GREEN migrate call sites in `VID/`: `asset-cost-estimator`, `asset-synthesizer`, `build-script-from-draft`, `render-thumbnail`, `scene-compiler`, `synthesize-avatar`, `video-engine-cli`, `tts-options`.
- [ ] A1.3 GREEN expose `resolve` and `loadChain` in the mirror (`scopePrimitives.ts`); regenerate; `--check` clean.
- [ ] A1.4 DELETE `VID/cascade.mjs`; grep proves no importer remains. (video-script-skill: "Private cascade code is gone")
- [ ] A1.5 Verify: `node scripts/verify.js --only=video`; `node scripts/build-core-mirrors.mjs --check`; full `node scripts/verify.js`.
- [ ] A1.6 Tick tasks; Decision log; status.

Deletes: `cascade.mjs`; `cascade.test.mjs` is ported, not dropped.

## Slice A2: Video nearest-lookup and folder contract (specs: video-folder-contract, video-script-skill)

- [ ] A2.1 RED video tests: in-scope asset accepted; ancestor-scope asset accepted; path above the scope root rejected; path beyond an isolate rejected; sibling series rejected. (video-folder-contract: all five scenarios)
- [ ] A2.2 GREEN replace `findNearest*` with `findInChain`; series = innermost scope.
- [ ] A2.3 GREEN folder-contract check: path literals bounded by the scope root; named lookup climbs the chain.
- [ ] A2.4 DELETE `VID/nearest.mjs`, `SERIES_MARKERS`.
- [ ] A2.5 Verify: video suites; `node scripts/verify.js`.
- [ ] A2.6 Tick tasks; Decision log; status; unlock Deferred "Video drift fixes" (move to its own task list).

Deletes: `nearest.mjs`, `SERIES_MARKERS`.

## Slice A3: video_NN domaiNN data (external; specs: video-script-skill "Scene Visuals Procedure Defined Once With Slots")

Outside this repository. Tracked here; not CI-verifiable (see Open Questions Q8).

- [ ] A3.1 Add `scope: true` markers for each series in the `video_NN` domaiNN.
- [ ] A3.2 Define `draft_scene_visuals` once at the root with slots; both series fill them. (video-script-skill: "One definition, two series", "Both series run it through slots")
- [ ] A3.3 Delete the per-series copies. (video-script-skill: "No copy remains")
- [ ] A3.4 Run `list_blueprint_procedures{path}` and a draft-authoring tool against each series; record evidence in the Decision log. (video-script-skill: "Tools run against any series", "No series is hardcoded", "Generated script validates")

## Slice B: projects adopts scopes (specs: contextual-resolution "projects bluepriNNt resolves across three levels")

- [ ] B.1 RED fixture test: portfolio → program → project resolves one `override` key (`priority`) and one slotted procedure (`generate-status-report`, slots `audience`/`format`). (contextual-resolution: "projects bluepriNNt resolves across three levels")
- [ ] B.2 GREEN `PROJ`: `generate-status-report` gains `slots:`; `priority` declared for `Project`; defaults document under `defaults/`.
- [ ] B.3 GREEN bump `template_version` and register it in the editor's `SHIPPED_TEMPLATE_VERSIONS` in the same PR (recurring gap); `manifest/source.yaml` `version:` is `spec_version`, not `template_version`.
- [ ] B.4 Release path decision (Q7): templates tag and repin either inside this umbrella or as a follow-up.
- [ ] B.5 Verify: `node scripts/verify.js` including template inventory and manifest checks.
- [ ] B.6 Tick tasks; Decision log; status; mark the change ready to archive (diff and `wc -l` the archive copy; do not trust a haiku archive).

---

## Deferred (not in this change)

Each item has an unlock trigger. Adding an item requires a dated `design.md` entry.

- `restrict` strategy. Unlock: a second real constraint beyond `video-guard.json` `allowedModels`.
- `append` strategy. Unlock: agent-context assembly work starts.
- Per-field `inherit::` (L1) and L2 scope declaration. Unlock: the next iNNfo (L1) version is opened.
- Per-scope `aggregate` (manifest, console, lineage, change views). Unlock: a consumer needs a per-scope index or console after Adoption.
- Per-scope ingestion (`sources/` scanner, `importRaw`). Unlock: a domaiNN needs to import into a sub-scope.
- Lockfile / materialization on publish. Unlock: first publish flow that needs frozen effective values.
- Per-scope bluepriNNt version pin. Unlock: two scopes in one domaiNN need different bluepriNNt versions.
- User/org scope above the domaiNN. Unlock: a second domaiNN needs shared defaults.
- `extends` (explicit multi-composition). Unlock: a case single-parent containment demonstrably cannot express.
- Video drift fixes (`shared/` vs `assets/`, stale `video-production-hierarchy` spec). Unlock: Adoption A lands.
- Scope-qualified model ids. Unlock: first real sibling-scope stem collision.
- Issue for the suspected `nn-upgrade --import-as-source` discovery bug (tracked separately, not part of this change).

## Open Questions / Maintainer Decisions Pending

From `design.md`:

- [ ] Q1 When nn-mcp starts outside any domaiNN, `ROOT_DIR` falls back to `cwd`; a repo subfolder used to resolve to the repo root. Acceptable? (affects G0.2.1)
- [ ] Q7 Adoption B edits the `projects` package: `template_version` bump plus templates tag/repin. Ship inside this umbrella or as a follow-up? (affects B.3, B.4; see Review Workload Forecast)

Assumptions flagged by spec and design review:

- [ ] Q1b Is the marker-move warning (`compareEffective` on move/changeset preview) SHOULD-in-scope? Currently a SHOULD in scope-chain; G1.2.8 is conditional on it.
- [ ] Q2 `isolate: true` frontmatter syntax: confirm strict boolean on the marker document, same as `scope: true`.
- [ ] Q3 Nested `domaiNN_NN.md` is not descended by outer discovery (implicit isolate, own root). Confirm, including for `walkMarkdownFiles`, `check_domain` and sources.
- [ ] Q4 `workspace/procedures/` is placed in the root scope, above the bluepriNNt. This reverses the documented "blueprint > domain" precedence in §16-bis.2. Confirm the reversal.
- [ ] Q5 The living `workspace-entrypoint` spec still names `workspace_NN.md` plus an `index.md` fallback, which conflicts with the marker walk on `domaiNN_NN.md` (and the no-fallback rule). Confirm the delta replaces it fully.
- [ ] Q6 Broader source visibility: each scope's `sources/` is visible nearest-first (own scope plus ancestors, bounded by isolate). Confirm this widening.
- [ ] Q9 `scope::` field-name confusion in the procedures bluepriNNt (an existing field vs the new `scope: true` frontmatter flag and `fork_of.scope`). Rename, or document the distinction?
- [ ] Q8 A3 dedupe is data in the external `video_NN` domaiNN and is not CI-verifiable. Accept manual evidence in the Decision log as the gate?

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~3,310 excluding A3 (G0.1 380, G0.2 300, G0.3 220, G1.1 380, G1.2 150, G2.1 380, G2.2 150, G3 350, A1 400, A2 300, B 300; A3 n/a) |
| Per-PR range | 150 to 400 lines each, 11 repo PRs plus one draft tracker PR |
| 400-line budget risk | High for the umbrella as a whole; Medium per slice (A1 at 400 and G0.1, G1.1, G2.1 at 380 sit at the limit) |
| Chained PRs recommended | Yes |
| Delivery strategy | ask-on-risk |
| Chain strategy | feature-branch-chain (chosen by maintainer) |
| Suggested split | One PR per slice in table order; split A1 by call-site group if it exceeds 400 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
400-line budget risk: High

Decisions needed before apply: confirm per-slice chained PRs under the cached
`feature-branch-chain` (no `size:exception` expected), and answer Q1 (affects G0.2) before
G0.2 starts. Q7 must be answered before Slice B. The first apply batch is limited to G0.1.
