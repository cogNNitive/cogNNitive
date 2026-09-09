# Backlog

Prioritized follow-up work. Each item is ready to start with `/sdd-new <slug>`
(or `/sdd-explore <slug>` first when the approach is still open).

Source: whole-monorepo code audit (2026-09-04). The audit's F1–F10 findings and
the `bump_version` backup-abort fix shipped in PRs #1–#14; the items below were
deliberately deferred at that time.

---

## 1. `refactor/split-types` — split `innfo-core/src/types.ts` (F11)

**Why:** `types.ts` is 493 lines and openly mixes two domains — a comment at
line ~366 marks "Graph / App Model Types (moved from apps/innfo-editor)". Parser
/ model types and the editor's graph-node model share one file, so every
consumer pulls the whole surface.

**Approach:** make `types.ts` a barrel that `export *`s from `types/parser.ts`,
`types/validation.ts`, `types/io.ts`, `types/graph.ts`. All ~25 internal
`from './types'` / `from '../types'` imports and the `export * from './types'`
in `index.ts` / `browser.ts` keep working unchanged. Cross-module references
(`ModelNode` → `FieldValue` / `ValidationError` / `TaxonomyEdge`) become
explicit imports.

**Size:** ~1 file → 5 files, no behaviour change. Low risk (barrel), but an
exacting move — do it in a focused pass, not tacked onto other work.

**Also consider:** the `SpecFrontmatter` `[key: string]: unknown` index
signature weakens every property access on that interface; decide whether it is
still needed for pass-through frontmatter.

---

## 2. `chore/editor-any-ratchet` — drive down `any` in innfo-editor (F15)

**Why:** ~96 `as any` + ~77 `: any` in the editor's non-test source. The ESLint
config already tracks this as a documented "ratchet backlog"
(`@typescript-eslint/no-explicit-any: warn`), but nothing forces the count
down, and CI only started running lint in PR #1.

**Approach:** incremental, not one PR. Each cast removal can surface a real gap
— e.g. `(fm as any)?.parent_spec?.version` in `ModelDashboard.vue` reads a field
`ParentRef` does not declare, so removing the cast forces a decision (add
`version?` to `ParentRef`, or change the call site).

**First slices (bounded, high-confidence):**
- The gratuitous `(fm as any)` / `(parseFrontmatter(...) as any)` casts where
  `parseFrontmatter` already returns a typed `SpecFrontmatter` — ~20 sites
  across `stores/`, `composables/`, `components/editor/`, `components/layout/`.
- `components/editor/composables/useGraphRenderer.ts` — 35 `any` in one file
  (d3 typing); a targeted pass with `@types/d3` generics.

**Guard:** add a lint rule / CI check that fails a PR which *raises* the count.

---

## 3. `fix/silent-fallbacks-sweep` — classify the remaining `catch` sites (F2, remainder)

**Why:** the README states "Fail-Fast: No silent fallbacks". PR #8 fixed the
`parseYaml` swallow and PR #9 fixed the dangerous `bump_version` backup swallow.
~35 `.catch(() => {})` / `catch { /* ignore */ }` sites remain across
`innfo-core` and `innfo-mcp` (concentrated in the split `innfo-mcp/src/tools/`
modules).

**Approach:** classify each into one of three buckets and make it explicit —
  1. **propagate** (parse errors, backup/IO failures that must abort),
  2. **log + continue** (`console.warn` with the path + error — genuinely
     optional side operations like the asset-dir rename or `index.md` update),
  3. **swallow deliberately** — only "file may legitimately not exist" reads,
     guarded with `err.code === 'ENOENT'` and a comment saying so.

**Size:** ~35 sites, medium risk (touches behaviour) — one reviewer pass, do
not batch with a refactor.

---

## 4. `chore/renormalize-line-endings` — one-time CRLF → LF (F18)

**Why:** the repo had mixed line endings; PR #1 added `.gitattributes`
(`* text=auto eol=lf`) which stops *new* drift but does not touch already-tracked
files.

**Approach:** `git add --renormalize .` on its own commit, nothing else in the
diff. Large but purely mechanical; land it when no other branch is open to
minimise rebase pain.

---

## 5. `ci/investigate-deploy-pages` — the Pages deploy job is slow / self-cancels

**Why (discovered during the audit merge):** `deploy-pages` in
`.github/workflows/ci.yml` regularly runs 12+ minutes and, because it holds the
`pages` concurrency group, a burst of merges leaves its runs stuck `pending` /
`cancelled`. The code gates (`verify` / `quality` / `spec-integrity`) are
unaffected and pass; `verify` already builds the docs. Pre-existing, not caused
by the audit work.

**Approach:** check whether `deploy-pages` needs `npm ci` at all (it rebuilds
what `verify` already built), consider `actions/upload-pages-artifact` from the
`verify` job's output, or split Pages deploy into its own workflow triggered
only on `main` after CI succeeds.

---

## 6. `feature/import-source-history-check` — consult conversation history before importing a source from `sources/import/`

**Type:** functional

**Why:** When a file from `sources/import/` is about to be ingested as a source
(scan/normalize via `nn-trannsform`, `node scripts/index.js --scan`), the user
may have already handled the *same* or a *similar* document in a past
conversation — importing it again can duplicate work, repeat mistakes, or
ignore decisions that were already made. Today the pipeline imports blindly
with no memory of prior related work.

**Behaviour (as requested):** before incorporating the imported file as a
source, review the source history of past conversations (`conversations/`,
and the promoted transcripts/summaries in `sources/conversations/`) for
anything similar already done:

1. **Find** — search the conversation history for prior handling of the same /
   similar source (e.g. by `source_file`/`source_url`, filename, topic,
   normalized `sha256`, or content overlap).
2. **Summarise** — if a match is found, present a summary of what happened in
   that conversation, and the decisions that were taken.
3. **Ask** — ask the user how to proceed:
   - **reuse** — apply the same approach / decisions as before,
   - **adjust** — reuse but change something,
   - **from scratch** — proceed fresh, ignoring prior context.
4. If no match is found, proceed with the normal import without prompting.

**Approach (open):** this is a research/UX seam more than a pure pipeline
change. Likely touches the agent workflow layer (skill orchestration in
`actioNN`) rather than `innfo-core`, and/or a helper that indexes conversation
source history. Whether matching is deterministic (exact `sha256`/`source_url`)
or semantic (topic/LLM) is an open design decision — explore before proposing.

**Also consider:** tie into the lineage record (`# NN Sources` / `# NN
Procedures`) which already tracks what was ingested and when, to establish the
"what have we done before" baseline without inventing a parallel store.

---

## 7. `feature/duplicate-source-detection` — detect duplicate / updated sources on import

**Type:** functional

**Why:** during an import from `sources/import/`, another file may already
exist whose content is *exactly the same* (identical `sha256`) or *the same
content with a different organisation* (reordered sections, different format,
restructured but same substance). Importing blindly either duplicates the
source or loses the fact that the file is a newer version of an existing one.

**Behaviour (as requested):**
1. **Detect** — before normalising an incoming source, compare it against
   already-ingested sources (`sources/nn/` and existing entries in
   `sources/import/`):
   - **exact duplicate** — identical content (same `sha256`),
   - **near-duplicate** — same content but differently organised (structural
     comparison; exact heuristic is an open design decision).
2. **Ask** — if a match is found, ask the user whether this is an **update** of
   the existing source (same base content plus new content added).
3. **Act** — if the user confirms it is an update, offer to **create the new
   source and archive the old one**; otherwise keep the previous behaviour
   (treat as a new source) or skip, per the user's choice.

**Approach (open):** exact matches already have a cheap signal — the scanner
computes `sha256` per file (`scanner-core.js` `computeFileHash` /
`generateSourceFrontmatter`) and change detection is already hash-based, so an
exact-dup check is low effort. The near-duplicate / "same content, different
organisation" case needs a structural similarity heuristic (token/section
overlap, canonicalised whitespace+ordering) and is the exploratory part.
"Archive" semantics (move to a legacy/archive location vs. delete vs. keep as
`archived` marker in the lineage record) need a decision too.

**Also consider:** fits alongside item #6 (`import-source-history-check`) — both
are import-time "has this been done before?" guards; #6 looks at conversation
history, #7 looks at the file corpus. Design them together to avoid duplicating
matching logic.

---

## 8. `feat/local-specialization-migration` — migrate local `*_spec_NN.md` specializations onto new canonical templates

**Deferred from `2026-09-06-workspace-template-upgrade-flow`** (in scope there only as
`unlisted` detection + guidance).

**Why:** the workspace upgrade flow repoints `parent_spec` for models pinned to
**canonical** templates. A user-authored specialization (`<Model>_<Template>_V_x-y-z_spec_NN.md`,
`level: 2`, pointed to by the model's `parent_spec.url`) is a *local* schema — the canonical
repo evolution does not apply directly, and an upgrade is a **semantic rebase**: the
specialization's Concepts/Fields/Matrices/Markers must be re-derived on top of the new
canonical template, preserving the user's extensions while absorbing the upstream schema
changes.

**Current behavior to extend:** `upgrade-check.js` classifies these models `unlisted`
("template not in catalog"); `nn-upgrade` reports them and does not migrate.

**Approach (proposal, not final):**
1. Detect specializations: models whose `parent_spec.url` is a local `_spec_NN.md` path /
   non-canonical URL → resolve the *base* template name they specialize.
2. Three-way diff: (old base schema, new base schema, specialization delta). The user's
   delta = specialization minus old base; migration = (new base) + re-applied delta.
3. Conflict pass per definition: added/renamed/re-typed base definitions that collide with
   a specialization extension → mapping question; otherwise re-derive automatically.
4. Result: a new specialization file version (`V_x-y-z+1`) pointing `parent_spec` to the
   new canonical base, and models repointed to it.

**Risks / open decisions:** collision semantics when the base *adopts* something the
specialization already defined (dedupe vs error); whether to require the base template
identity (`includes`) to be preserved; versioning of the specialization (patch per rebase);
and whether `innfo-core` needs a real `diffTemplates(old, new)` primitive instead of the
agent-side diff.

**Size:** medium-high — touches `innfo-core` or a new deterministic diff helper, the
detection classification, and the `nn-upgrade` Phase 3/4 logic. Not a silent
auto-migration; consent + backup + re-validation gates from the parent change still apply.

**Suggested trigger:** `/sdd-explore local-specialization-migration` when the workspace
upgrade flow ships.

---

## 9. `feat/massive-renaming-app` — mass rename of application elements for cognitive simplicity, including `template` → `app`

**Type:** functional

**Why:** the application's naming vocabulary is cognitively heavier than it needs to be.
In particular, the Level 2 concept currently called **template** (the iNNfo `_spec_NN.md`
schemas that Level 3 models pin via `parent_spec`) should be renamed to **app** throughout
the product. This is part of a broader desire to mass-rename the application's elements so
the surface is cognitively simpler and more consistent for users.

**Behaviour (as requested):**
1. **Rename `template` → `app`** — replace the term "template" with "app" across the
   user-facing and conceptual vocabulary for the Level 2 concept. Includes the catalog /
   manifest distribution, editor labels and navigation, docs, and skill copy (e.g.
   `nn-innfo`, `nn-trannsform`, `nn-template-audit` trigger language), while keeping any
   internal identifiers / canonical file names stable where renaming them would break
   resolution (explicitly decide per surface, not blindly).
2. **Mass rename of remaining application elements** — audit the full element vocabulary
   (concepts, fields, labels, concepts names, UI copy) and propose a renamed, simpler,
   more consistent surface.

**Approach (open):** precedent exists in `2026-09-06_workspace-models-rename.md`
(concept rename `Models` → `ModelRecords` with composition-collision and provenance
guards). A similar rename audit is needed here, but at product-vocabulary scale rather
than a single concept. The `template` → `app` rename has two surfaces with different
risk: the *conceptual/user-facing* vocabulary (safe to rename) and the *mechanical
identifiers* (`_spec_NN.md`, `parent_spec.url`, catalog entries, template registry in
`scripts/template-catalog.mjs` and `manifest/source.yaml`) where renaming breaks
resolution and pinning — these likely need an alias/migration layer or a coordinated
version bump, not a blind find-and-replace.

**Size:** large — touches product vocabulary, editor UI, docs, skills, and the
template/app distribution and resolution machinery. Do NOT attempt as one change; split
into a user-facing vocabulary pass (low risk) and a mechanical identifier migration (high
risk, needs alias/versioning strategy).

**Suggested trigger:** `/sdd-explore massive-renaming-app` — the `template` → `app`
rename and the general element rename should be scoped separately in the exploration.

---

## 10. `feat/repository-template` — new "repositorio" template for managing a GitHub repository's state, releases, and changes

**Type:** functional

**Why:** there is no Level 2 template for modelling a GitHub repository lifecycle. A
maintainer wants a template called **repositorio** whose job is to manage the *state* of a
repository, its *releases*, and its *changes* — giving a structured place to track where
a repo is, what has shipped, and what is in flight.

**Behaviour (as requested):**
1. A new Level 2 template named **repositorio** (the template's own name is
   "repositorio").
2. It models a GitHub repository's lifecycle: **estado** (current state), **releases**
   (shipped versions / tags), and **cambios** (changes / PRs / commits in flight).

**Approach (open):** a new standalone Level 2 template under
`iNNfo/specs/templates/repositorio/` (mirroring the structure of `projects`,
`procedures`, `analysis`, etc.), with concepts for repository state, releases, and
changes, plus a canonical Ghostbusters Inc. sample and a cross-reference entry from the
business composite if in scope. Follows the `nn-template-audit` 7 compliance criteria and
100% English content rule; whether the canonical template name stays Spanish ("repositorio")
as requested or is anglicised for the artifact layer is an explicit decision to confirm
before authoring.

**Size:** medium — one new standalone template package + sample + catalog / manifest
registration + audit pass.

**Suggested trigger:** `/sdd-explore repository-template`.

---

## 11. `feat/video-generator-template` — new template for a video generator

**Type:** functional

**Why:** the application has no template purpose-built for driving a video generator.
Existing workflow samples (`docs/actionn/templates/workflow/`, e.g. `video-processing`)
and `nn-trannsform` examples (`paper-to-youtube`) touch video script generation ad hoc,
but there is no dedicated Level 2 template that models the inputs and outputs of a video
generation pipeline.

**Behaviour (as requested):** a new template that represents a **video generator** —
modelling the pipeline that turns a source (paper, meeting transcript, raw footage) into a
video (script, storyboard, AnyDeo script, final asset), reusing the existing
video/transcript/script primitives and workflow patterns already in the repo.

**Approach (open):** decide whether this is a standalone Level 2 template or a
specialization / workflow variant reusing `docs/actionn/templates/workflow/`. It should
cover the input sources (PDF, transcript, footage), the intermediate models (narrative,
script), and the generated outputs (AnyDeo script, video asset), following the same
compliance and sample-universe rules as other templates.

**Size:** medium — new template + sample + catalog / manifest registration, or an
extension of the workflow template if the standalone route is not chosen.

**Suggested trigger:** `/sdd-explore video-generator-template`.

---

## 12. `refactor/mcp-tool-registry` — declarative MCP tool registration

**Why:** adding `query_units` touches three places per tool (`toolDefinitions`, dispatch
`switch`, handler) plus a brittle tool-count assertion in `server.spec.ts`. Every new
tool repeats the pattern and risks drift.

**Approach:** single table `{ name, definition, handler }` driving definitions, dispatch,
and count. Mechanical, no behaviour change. Deferred from the KU-query change (out of its
250-line slice).

**Size:** small — one file (`server.ts`) + spec count update.

**Suggested trigger:** `/sdd-new mcp-tool-registry`.

---

## 13. `refactor/unified-diagnostics-collector` — merge validate + check_workspace collection

**Why:** `collectWorkspaceDiagnostics` (`validate.ts`) and `validateAll`
(`check-workspace.ts`) duplicate parse→filter→merge logic; the KU changes add a third
consumer shape (`KU_*`, `?`-rule). Drift risk grows with each validation feature.

**Approach:** extract one parameterized collect+filter routine shared by both tools.
Behaviour-preserving; the KU validator rule set becomes the first consumer test.

**Size:** medium — two tool modules + shared helper + tests.

**Suggested trigger:** `/sdd-new unified-diagnostics-collector`.

---

## 14. `chore/cdn-bundle-ci` — build + verify the MCP CDN bundle in CI

**Why:** `docs/innfo/cdn/` bundles are rebuilt by hand (`build-docs.mjs` + `deploy:cdn`
inline script with a fragile `bin/` path); staleness already bit once (missing v0.3.2
bundle). The version-square gates releases, but nothing produces the artifact automatically.

**Approach:** CI job that builds the bundle, rewrites `manifest.json`, and runs the
square check. No behaviour change to the MCP itself.

**Size:** small — workflow + script hardening.

**Suggested trigger:** `/sdd-new cdn-bundle-ci`.

---

## 15. `refactor/trannsform-slug-codegen` — generate the trannsform slug mirror from core

**Why:** `nn-trannsform`'s `markdown-utils.js` must mirror core's slug functions by hand
with a parity test as the only guard — verified 2026-09-08 that runtime import is NOT
viable (CJS zero-dep portable skill vs ESM-only core with sync consumers). Hand-mirroring
will drift again on the next slug change.

**Approach:** build-time codegen: emit the JS mirror from the TS source during the
release build; parity test asserts the checked-in file matches generated output. Runtime
stays dependency-free.

**Size:** small-medium — codegen script + build wiring + parity assertion flip.

**Suggested trigger:** `/sdd-new trannsform-slug-codegen`.

---

## 16. `refactor/editor-readtext-helper` — extract `workspaceStore.readText(path)`

**Why:** file-handle traversal (~20 lines) is duplicated across `FilePreviewModal`
(`loadFileContent`, `openOriginalFile`) and `WorkspaceExplorer`; the KU-URI Slice 3 adds
more reads (CSV preview). Found during KU-URI deep-impact analysis.

**Approach:** single async helper on the workspace store; modal/explorer call it. No
behaviour change; covered by existing component tests.

**Size:** small.

**Suggested trigger:** `/sdd-new editor-readtext-helper`.

---

## 19. `refactor/shared-decomposed-fixtures` — single resolver map for decomposed template tests

**Why:** four core test files hardcode their own `business-model/analysis/organization/projects(+metrics)` include-resolver maps (`business-decomposition-v2.test.ts`, `index.test.ts`, `test/validator.test.ts`, plus the includes list in `metaplantilla-specs.test.ts`). Attaching `metrics` to business (2026-09-08) broke 5 tests because none of the four maps was updated — the failure mode is always "N maps, N-1 updated".

**Approach:** one shared helper (e.g. `tests/fixtures/decomposed.ts`) exporting `decomposedTemplates()` (`Record<string,string>` read from disk) consumed by all four files; the metaplantilla includes-list expectation derives from the same source. Behaviour-preserving; the metrics attachment becomes the first regression test.

**Size:** small — one helper + 4 call-site swaps, no behaviour change.

**Suggested trigger:** `/sdd-new shared-decomposed-fixtures`.

---

## 17. `chore/mcp-coverage-debt` — MCP package below the 90%/95%/85% coverage gates

**Why:** `innfo-mcp` coverage (verified 2026-09-08) sits at ~87% lines / ~77% branches vs
gates 90/95/85. Lowest files, all untouched by recent work: `apply-change.ts` (71%),
`reachability.ts` (80%), `spec.ts` (81%), `init-model.ts` (82%), `resolver-node.ts`
(89%). The gate fails on `main`-era code, blocking any release that requires green
coverage. (Core is at ~94%, editor green.)

**Approach:** per-file test backfill, lowest-first; no behaviour change. Keep new-code
coverage at 100% in the meantime (the KU changes held that bar).

**Size:** medium — test-only, splittable per file.

**Suggested trigger:** `/sdd-new mcp-coverage-debt`.

---

## 18. `chore/workspace-kb-perf-limits` — probe performance limits with the workspace knowledge-base test

**Why:** the SIM workspace (`temp/sim-workspace/`, see `temp/sim-ku-plan.md`) exercises
integrity, KU-URI (`@`/`&`), KU-query (`?`), and editor flows on a small fixture set.
Its scaling limits are unknown — large CSVs, many models, deep `sources/` trees, and
concurrent `check_workspace` / `validate` calls have never been stress-tested.

**Approach:** build a perf harness over the SIM workspace (disposable, untracked):
1. Scale dimensions separately — row count per CSV, file count, model size, query fan-out.
2. Measure `check_workspace`, `validate`, `query_units`, and editor preview latency vs size.
3. Record the breaking points (timeouts, memory, false `KU_*` errors) and set pragmatic
   limits / warnings before hardening.

**Size:** small-medium — harness + measurements + documented limits; no behaviour change.

**Suggested trigger:** `/sdd-explore workspace-kb-perf-limits`.

---

## 20. `feature/metrics-scenario-compare` � side-by-side scenario comparison in Projections artifacts

**Why:** the Metrics template models scenarios (historical/projection, neutral/optimistic/pessimistic) but the Projections artifact deliberately renders a single neutral flow (see `iNNfo/specs/templates/metrics/spec_NN.md`, Scenario guidance). Comparing variants today means editing variables by hand.

**Approach:** implement variants as ordinary variant rows through the Metrics/Variables mechanism (increment factors on variables, computed variant metrics) � no parallel MODEL_DATA snapshots. Then add comparison UI on top: per-variant series in charts (Actual/Projection split already exists for pinning), variant cards, and a CSV that exports all variants. Scenario selector/dimming must NOT return; selection stays model-side.

**Size:** small-medium � engine charts/cards/CSV extension + procedure text + smoke probes; no spec change expected.

**Suggested trigger:** `/sdd-new metrics-scenario-compare`.


---

## 21. `refactor/console-domain-renderers` - migrate projections + strategic-master inline code to console renderers (deferred, special cases)

**Deferred from the innfo-console cycle (2026-09-09).** The model-viewer renderer
was extracted (`console/render-model-viewer.js`, UMD `window.InnfoModelViewer`,
commit `d2fac2e`); the two assets below were deliberately left inline.

**Scope decision (2026-09-09, maintainer):** the generic console template
(blueprint + shared runtime + per-template renderers) must NOT be overloaded to
fit projections 100% - projections is a special case and stays bespoke. Same
for the strategic master. When this item is taken, extend the renderer pattern
to them; do not bend the generic template around their needs.

**Contract note:** `file://` double-click means no server / no build / no
`fetch()` / no modules - CDN `<script src>` tags are the *primary* loading path
(jsDelivr pin + raw mirror + vendored fallback, see
`console/artifact_blueprint.html`). Online CDN use is expected; "offline" only
ever meant "no local server". So projections' CDN deps are contract-compliant -
robustness (vendored fallbacks), not compliance, is the only CDN concern.

**Why per asset:**

- *projections* (`metrics/assets/projections.html`, 41KB): ~28KB inline metrics
  engine (~24 functions: per-row scaling, compact formatting, real vs projected
  months, history/peak flags, growth overrides with reset, uPlot series
  builders) plus CDN tailwind Play + lucide + uPlot. Moving the JS 1:1 to a file
  changes nothing functional - the weight just relocates and the engine is
  metrics-only (no cross-template reuse). The real work is a packaging decision:
  vendor the chart/icon deps and replace tailwind Play with owned CSS, or
  document the CDN-online requirement and keep the bespoke renderer as the
  metrics special case.
- *strategic master* (`business/assets/master.html`, 103KB): only ~1.6KB of
  inline JS (paints title/version from the `innfo-model-data` slot). The ~94KB
  bulk is 25 static framework sections (Sankey, Canvas, SWOT, PESTEL, Porter,
  BCG, Gantt...) with Ghostbusters sample content. There is almost no code to
  extract - thinning it means *building* a data-driven dashboard renderer plus
  slot contracts for 25 frameworks that do not exist today. That is a feature
  build, not a move.

**Approach (open):** `/sdd-explore` first. Likely two independent slices with
different shapes: (a) projections packaging (vendor vs document-online,
renderer stays metrics-specific under `console/` pins); (b) master data-driven
redesign (slot contracts per framework + renderer + procedure rewrite) versus
freezing master as a reference sample and exempting it from the thin-shell
rule (adjust `console-thinning` expectations + document the deviation, as was
done for the seam-only thinning).

**Size:** large if both slices go data-driven - do NOT attempt as one change;
each slice needs its own spec. Small if the outcome is freeze + document.

**Guard:** any data-driven rewrite must keep the E2E equivalence bar set by
`e2e/17-model-viewer-renderer.spec.ts` (new shell renders identical DOM to the
original) - no silent visual regressions across 25 frameworks.

**Suggested trigger:** `/sdd-explore console-domain-renderers`.
