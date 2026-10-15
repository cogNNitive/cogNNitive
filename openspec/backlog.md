# Backlog

Prioritized follow-up work. Each item is ready to start with `/sdd-new <slug>`
(or `/sdd-explore <slug>` first when the approach is still open).

Source: whole-monorepo code audit (2026-09-04). F1–F10 shipped in PRs #1–#14.
Consolidated 2026-09-10 (26 → 15): coupled items were merged, and the entries that
were already done (`refactor/unified-diagnostics-collector`) or moot
(`chore/renormalize-line-endings`) were retired. Each merged item lists what it
absorbed under **Merged from**.

Consolidated 2026-09-30 (verified against the working tree): marked **shipped/superseded**
(items 3, 10, 18, 21) and **partially shipped** (item 11). Item 17's "fixed" status was
confirmed. `refactor/identifier-migration` was reconciled against
`2026-09-29-nn-level-nomenclature-rename`. Items 1, 2, 12, 13, 14, 15, 19, 20 and the
someday-maybe/deferred entries remain open.

Consolidated 2026-10-10 (verified against `dev`): retired the items already
shipped / fixed / resolved — 3, 4, 5, 6, 7, 8, 9, 10, 15, 16, 17, 18, 21, 22,
27, 30, 31 (their full text remains in git history and the matching archived
changes). Merged item 19 into item 1 (both are source ingestion) and item 25 into
item 24 (both are de-duplication). The remaining numbered gaps are intentional.

---

## 1. `feature/source-import-guards` — import-time guards, duplicate detection + in-app editor import

**Type:** functional · **Size:** medium

**Merged from:** `feature/import-source-history-check` + `feature/duplicate-source-detection` + `feature/in-app-source-import` (item 19).

**Why:** importing a file from `sources/import/` is blind. It neither consults past
conversation history (the same document may already have been handled, with decisions
taken) nor compares against the existing corpus (exact or restructured duplicates, or
an updated version of an existing source). Blind import duplicates work, repeats
mistakes, or loses update lineage.

**Behaviour (as requested):** before normalising an incoming source, run two guards
sharing one matching layer:

1. **History guard** — search past conversations for prior handling of the same /
   similar source (by `source_file`/`source_url`, filename, topic, normalized
   `sha256`, or content overlap). If a match is found, summarise what happened and
   the decisions taken, then ask: **reuse** / **adjust** / **from scratch**.
   Otherwise import normally.
2. **Duplicate guard** — compare against already-ingested sources (`sources/nn/` and
   existing `sources/import/`): **exact duplicate** (identical `sha256`) or
   **near-duplicate** (same substance, different organisation). If a match is found,
   ask whether the incoming file is an **update**; if confirmed, create the new source
   and archive the old one; otherwise treat as new or skip per the user's choice.

**Approach (open):** a research/UX seam as much as a pipeline change. Exact matching
is cheap — the scanner already computes `sha256` per file (`scanner-core.js`
`computeFileHash`) and change detection is hash-based. Near-duplicate needs a
structural similarity heuristic (section/token overlap, canonicalised whitespace +
ordering). Likely touches the agent workflow layer (`actioNN`, `nn-trannsform`) plus a
helper that indexes conversation source history. Archive semantics (move to legacy vs
delete vs `archived` marker) need a decision. Design the two guards together so they
share matching logic.

**Also consider:** tie into the lineage record (`# NN Sources` / `# NN Procedures`)
to establish the "what have we done before" baseline without a parallel store.

**Editor affordance (absorbed item 19, `feature/in-app-source-import`):** the editor
(`innfo-editor`) has no drag-and-drop or file-picker to import a primary source into
`sources/nn/`; ingestion lives only in the agent/CLI procedures (FINDINGS F-18). The
in-app import flow MUST share this item's matching/guard layer rather than ship a
second, divergent import path. Design both together.

**Suggested trigger:** `/sdd-explore source-import-guards`.

---

## 2. `feature/kb-change-governance` — per-unit change log + RACI-aligned review workflow

**Type:** functional · **Size:** medium

**Merged from:** `feature/knowledge-change-log` + `feature/knowledge-review-workflow`.

**Why:** there is no record of which changes affected which knowledge units and by
whom, and the RACI-aligned responsible actors have no structured artifact to approve,
review, or comment on changes in their scope.

**Behaviour (as requested):**

1. **Change log** — record each change with type, scope (units touched), timestamp,
   actor, and RACI owner; render individualized monthly reports per responsible person.
2. **Review workflow** — a per-actor view of "changes in my RACI scope" plus a review
   artifact with **approve / request changes / comment**.

**Approach (open):** the change log is the data backbone the review workflow renders —
design them together to avoid two parallel stores. Extend the lineage record
(`# NN Sources` / `# NN Procedures`) with per-unit change entries; the monthly report is
a filtered rendering over unit ownership. Whether review state persists as markers on
knowledge units, as a separate review model, or as a procedure-driven workflow is an
open decision. Explore before proposing.

**Also consider:** the RACI matrix is the single source of ownership scope; entries may
be generated by procedures, by the editor on save, or both.

**Update 2026-10-07:** the change-log half is absorbed by
`refactor/stable-identity-and-changesets` (changesets are the per-unit change record). What
remains here is the RACI review workflow and the per-actor reports, rendered over changesets
instead of a new store. Re-scope before starting.

**Suggested trigger:** `/sdd-explore kb-change-governance`.

---

## 11. `feature/metrics-scenario-compare` — side-by-side scenario comparison in Projections

**Type:** functional · **Size:** small-medium · **Status:** partially shipped

**Why:** the Metrics template models scenarios (historical/projection,
neutral/optimistic/pessimistic), but the Projections artifact deliberately renders a
single neutral flow; comparing variants means editing variables by hand.

**Approach:** implement variants as ordinary variant rows through the Metrics/Variables
mechanism (increment factors, computed variant metrics) — no parallel `MODEL_DATA`
snapshots. Then add comparison UI: per-variant series in charts, variant cards, and a
CSV exporting all variants. The scenario selector/dimming must NOT return; selection
stays model-side.

**Status note 2026-09-30:** the Metrics console was adopted (`2026-09-12-metrics-console-adoption`,
timeline console landed in `7cfe4204`, `d400ee6a`), which covers the variant-engine rendering. The
**side-by-side multi-variant comparison UI + CSV export of all variants** from the original ask is not
confirmed shipped — verify before closing the remainder.

**Suggested trigger:** `/sdd-new metrics-scenario-compare`.

---

## 12. `chore/workspace-kb-perf-limits` — probe performance limits with the workspace KB test

**Type:** chore · **Size:** small-medium

**Why:** the SIM workspace exercised integrity, KU-URI (`@`/`&`), KU-query (`?`), and
editor flows on a small fixture set; its scaling limits (large CSVs, many models, deep
`sources/` trees, concurrent `check_workspace`/`validate`) are unknown.

**Approach:** build a perf harness over a disposable SIM workspace: scale dimensions
separately (rows per CSV, file count, model size, query fan-out), measure
`check_workspace`, `validate`, `query_units`, and editor preview latency vs size, then
record breaking points (timeouts, memory, false `KU_*` errors) and set pragmatic
limits.

**Suggested trigger:** `/sdd-explore workspace-kb-perf-limits`.

---

## 13. `feat/local-specialization-migration` — migrate local specializations onto new canonical templates *(deferred)*

**Type:** feat · **Size:** medium-high · **Status:** deferred

**Why:** the workspace upgrade flow repoints `parent_spec` for models pinned to
**canonical** templates. A user-authored specialization
(`<Model>_<Template>_V_x-y-z_spec_NN.md`, `level: 2`) is a local schema; upgrading it is
a **semantic rebase** — re-derive its Concepts/Fields/Matrices/Markers on top of the new
canonical template, preserving the user's extensions. Today `upgrade-check.js` classifies
them `unlisted` and `nn-upgrade` only reports them.

**Approach (proposal):** detect specializations → resolve the base template; three-way
diff (old base, new base, specialization delta); conflict pass per definition; emit a new
specialization version pointing at the new base, and repoint models.

**Risks:** collision semantics when the base adopts a specialization definition;
`includes` identity; versioning; possible need for an `innfo-core` `diffTemplates()`
primitive.

**Suggested trigger:** `/sdd-explore local-specialization-migration`.

---

## 14. `refactor/console-domain-renderers` — migrate projections + strategic master to console renderers *(deferred)*

**Type:** refactor · **Size:** large · **Status:** deferred

**Why:** the model-viewer renderer was extracted (`console/render-model-viewer.js`), but
`metrics/assets/projections.html` (~28KB inline engine) and `business/assets/master.html`
(~94KB of static framework sections) were deliberately left inline as bespoke special
cases. The generic console template must NOT be overloaded to fit them.

**Approach (open):** `/sdd-explore` first; two independent slices — (a) projections
packaging (vendor deps vs document-online; renderer stays metrics-specific under
`console/` pins), (b) master data-driven redesign (slot contracts per framework +
renderer + procedure rewrite) **vs** freeze it as a reference sample and exempt it from
the thin-shell rule (document the deviation). The `console` CDN `<script src>` loading
path is contract-compliant (offline only ever meant "no local server").

**Guard:** any data-driven rewrite must keep DOM equivalence between the old and new
shells. The Playwright spec that used to state this bar (`e2e/17-model-viewer-renderer.spec.ts`)
was deleted on 2026-09-24 along with the rest of the ungated e2e suite, and it would not
have held anyway: it read its "before" baseline from `git show HEAD:<the same file>`, so
from the commit after it landed it compared the file against itself and could never fail.
Rebuild the bar instead of restoring it — capture the baseline from a ref that is actually
older than the change (a tag, or the merge-base), never from `HEAD` of the file under test.
The working harness to build on is `innfo-core/tests/console-dom.test.ts` (boots the
runtime under happy-dom, no browser). A real Chromium `file://` render could be added
later with Windows-only Chrome discovery that skips on CI.

**Suggested trigger:** `/sdd-explore console-domain-renderers`.

---

## 20. `refactor/generate-canonical-registry` — generate `canonical-registry.ts` from template specs

**Type:** refactor · **Size:** medium-large · **Status:** non-goal of `2026-09-13-document-fidelity-and-provenance-integrity`

**Why:** `innfo-core/src/schema/canonical-registry.ts` is 2116 lines of hand-maintained,
vendored template content (concepts/fields/matrices per shipped template), duplicating
what already lives in `iNNfo/specs/templates/*/spec_NN.md`. This is the same class of
drift risk that motivated AD-8's `sync-template-versions.mjs` generator (version fields
only), but for the registry's full content — a strictly larger blast radius.

**Why deferred:** the registry backs the editor's **offline-resilience contract** — it
lets the editor validate/render templates before any workspace or network fetch
resolves the live spec files. Regenerating it from disk-only specs would need to either
(a) still commit the generated output (like AD-8) so the offline path has no new
runtime dependency, or (b) redesign the offline fallback entirely. Either way this
deserves its own design pass, not a rider on a document-fidelity change.

**Approach (open):** `/sdd-explore` first — confirm the generated-and-committed pattern
from AD-8 extends cleanly to full concept/field/matrix content, and how drift detection
(`--check` mode) should treat the registry.

**Suggested trigger:** `/sdd-explore generate-canonical-registry`.

---

## 23. `fix/migrate-domain-esm-cjs` - run the migrator under a workspace with `"type": "module"`

**Type:** fix · **Size:** small

**Why:** `skills/nn-upgrade/scripts/migrate-domain.js` is CJS (`require(...)`); a user
workspace whose `.agents/package.json` declares `"type": "module"` crashes `node
migrate-domain.js`. Not reproducible in this repo (`.agents/` has no `package.json`), but
real for users. Reported by a migrating user alongside the version-skew.

**Behaviour:** ship the migrator as `.cjs` (or isolate the invocation directory); add a
regression test for the `"type": "module"` case.

## 24. `refactor/derived-artifact-consolidation` — one core implementation, fewer committed derived outputs

**Type:** refactor · **Size:** large

**Merged from:** `refactor/derived-artifact-consolidation` (item 24) + `refactor/contract-deduplication` (item 25).

**Why (fewer derived artifacts):** ~12 committed derived artifacts (generated bundles,
mirrors, registries, docs renders) each guarded by one of ~25 guard/drift/parity/freshness
scripts. Each derived file is a second source of truth; every change reddens several gates
in a chain. `verify.js` and CI keep them in lock-step by hand.

**Why (one implementation):** ~6 parity/golden/mirror suites exist because the CLI, MCP
tool, and console bundle reimplement shared logic; design docs note "bitten once by two
copies of the same parser drifting apart". The console-schema-parity resolver
fragmentation (issue #122 / change `console-schema-parity`) was one instance. The test
sprawl compensates for duplication instead of removing it.

**Behaviour:** one `build:all` / regen entry point; CI regenerates and fails on drift;
stop committing outputs that can be regenerated (except CDN-distributed bundles). A
single core implementation in `innfo-core`; the CLI/MCP/console become thin adapters;
parity suites collapse. Needs `sdd-explore` first; land in small reversible slices.

---

## 26. `chore/console-feedback-vocabulary-alignment` - finish the `knowledge_*` sweep

**Type:** chore · **Size:** small-medium · **Status:** open, re-scoped (2026-10-03)

**Re-scope:** the premise "must land before the format ships" no longer holds. Change A shipped (innfo-console-v0.8.0 / blueprints-v0.20.0) with `model_id`/`model_version` in the feedback ledger wire format (`iNNfo/packages/innfo-core/src/console/feedback-ledger.ts`). The sweep is now a wire-format change on a shipped format and needs an explicit format-version/compat decision from the maintainer. Note: the maintainer prefers no backwards-compat code and is the sole user today, so a hard rename without a compat reader is a viable option.

**Why:** the Legacy Write Guard caught `model_version` in the new console feedback ledger.
This session renamed the guarded field (commit `dd801c0a`) and allowlisted the legitimate
fallback/reject/migration cases, but the full `model_*` → `knowledge_*` sweep (`model_id`
→ `knowledge_id`, remaining `model_version`, the `reconcile_feedback_NN.md` procedure, and
samples) is deferred. Originally scheduled to land before the format shipped (change A was then unreleased).

**Behaviour:** sweep the ledger + procedure + samples to `knowledge_*`; drop the
allowlist entries added in `dd801c0a` once clean.

## 28. `chore/cognitivize-in-place-followups` - residuals left when `2026-10-02-cognitivize-in-place` closed

**Type:** chore / decision · **Size:** small-medium · **Added:** 2026-10-04

**Why:** the change shipped and was archived, but its closing sweep and review left items that
need a maintainer decision or a template bump. None blocks a release.

- **`sources` bluepriNNt still names retired folders.** `iNNfo/specs/bluepriNNts/sources/spec_NN.md`
  defines `raw_path` (lines 59, 116), `source_model` (lines 80, 121) and `origin_uri` (115) with
  `sources/original/` and `sources/nn/`. Fixing it needs a `template_version` bump,
  `sync:versions`, canonical registry and `catalog.json` regeneration. It is the source of the
  two matches left in `canonical-registry.ts` (the other, `iNNfo_V_0-3-0_NN.md`, is a frozen
  published spec). The `visual-catalog` and `video` blueprints and
  `_samples_nn/sources_NN.md` may carry the same wording; check with `rg`.
- **`sources/archive` is not a detector signal** (task 2.3 wording said it was). A permanent
  signal can never clear, and a layout-legacy signal used to block parsing. Confirm the
  decision or define a non-blocking "has archive" report.
- **GC never proposes `sources/archive/` files** (design D16 expects it): old archive stamps
  are not contract stamps, so `planGc` treats each file as its own latest. Needs a ledgered
  `legacy:` marker and a core rule if the maintainer wants it.
- **`workspace-index` `index.md` keeps a fixed name** (skip-if-unchanged, not `writeOnce`)
  because MCP `apply_change` and the editor read it by name; this deviates from the
  `write-once-artifacts` spec. Decide whether to amend the spec or migrate the readers.
- **Four published `_V_` Ghostbusters samples were edited by `sync-samples`** (business-model
  V_0-2-1, metrics V_0-1-0, organization V_0-2-0, video V_0-1-0; one citation path each) to
  keep parity with `_samples_nn`. Parity and immutability gates pass, but published `_V_` files
  are meant to be write-once.
- **Smaller:** `export-console.mjs` keeps its own `findModelFiles` walk;
  `workspace/assets/workspace_hub.html` prompt text still uses unsuffixed console names;
  `meta.sources` holds the model path, not citation-level entries; conversation reservation
  still writes `conversations/YYYY-MM-DD_HHmmss.md` where the spec says
  `<YYYYMMDDTHHmmssZ>.md`; `--lineage --check` errors on a missing record while the shared
  drift gate tolerates it; `TESTING.md` Test 4 still expects a `_draft` deliverable that
  SKILL.md says no longer exists; simulation scenarios 01, 05, 07 and `FINDINGS.md` still
  assume `sources/nn`.

## 29. `feature/lineage-recursive-upstream` — recursive upstream chaining in the preview Lineage Timeline

**Type:** functional · **Size:** medium · **Added:** 2026-10-04

**Why:** the Lineage view's new **Timeline** style (`2026-10-04-lineage-modal-simplify`) renders
only one upstream hop — the focal file's own `source_file` — plus its downstream citations. The
real provenance story the maintainer asked for is recursive: *this came from that, which came from
that, which came from…*. That chaining is explicitly deferred from the simplify change
(`openspec/changes/2026-10-04-lineage-modal-simplify/proposal.md`, "Deferred (iteration 2)").

**Behaviour (as requested):** the Timeline walks `source_file` backwards through every upstream
file and appends each hop as an upstream step, so the chain reads top-to-bottom from the oldest
ancestor to the focal file and its citing elements. The graph style mirrors the same depth.

**Approach (open):** `iNNfo/apps/innfo-editor/src/components/editor/lineageChain.ts`
(`buildLineageChain`) is the seam — iteration 2 extends its input/loop with further upstream hops;
the render contract does not change. Needs cycle protection (A→B→A) and a bounded depth. Reading
each upstream file's frontmatter requires the workspace handle (async), so the chain builder likely
becomes async or takes a pre-resolved upstream path list. Consider whether upstream files' own
`sources`/citations should also surface.

**Suggested trigger:** `/sdd-explore lineage-recursive-upstream`.

## Intra-document element identity: key on the slug, not the display name

**Status:** explicit NON-GOAL of `2026-09-13-document-fidelity-and-provenance-integrity`.
Recorded 2026-09-16 while completing work unit 7.

**The behaviour today.** An element whose display name already exists elsewhere in the
same document fails model-wide name uniqueness (R-IE-02, `recursiveParser/normalize.ts`)
— and is **silently dropped from the graph**, not merely reported. It never becomes a
node, so it is invisible to the editor, to `[[wikilink]]` resolution, to matrices and to
every validation pass. `Ghostbusters_business_NN.md` was losing 8 elements on every load
this way before the rename below.

**Why it bites.** Modelling the same real-world entity under several concepts is
natural and correct: `Winston Zeddemore` is legitimately a Stakeholder, a Person **and**
a Shareholder of the same company. AD-7 of that change already ruled the analogous
CROSS-model case legal, and the format ships `[[Model Title :: Element Name]]` precisely
to disambiguate. The intra-document rule is the odd one out — and the format already
offers the right disambiguator for it: an explicit `slug::`.

**Why it was not fixed there.** There are two independent gates, and they disagree by
construction:

1. `normalize.ts` keeps a model-wide `Set` of element NAMES.
2. `IdentityRegistry` (`identity.ts`) enforces sibling-name uniqueness and builds each
   node's `qualifiedId` **from the name** (`buildQualifiedId`).

Keying only the first on the slug leaves the second still rejecting the element. Keying
both means node ids stop deriving from names, which moves `[[wikilink]]` resolution,
matrix endpoint lookup and qualified-reference addressing underneath every consumer
(editor, MCP, workspace index). That is an identity-semantics change, not a sample
repair, and it deserves its own change with its own migration story.

**What was done instead.** The 8 collisions in `Ghostbusters_business_NN.md` were
resolved by RENAMING in the sample (Shareholders entries now name the stake —
`Venkman Equity Stake` — and the duplicated Stakeholders entries carry a role
parenthetical). The duplicate-name issue also gained the `severity: 'error'` it was
missing, so the drop is at least visible to hosts now.

**What a future change should decide:** whether an explicit `slug::` legitimises a
repeated display name within one document; and if so, whether `qualifiedId` derives from
the slug, and what that means for every existing `[[wikilink]]`.

**Suggested trigger:** `/sdd-new intra-document-identity-by-slug`.

---

## `feature/merkle-lineage-and-distributed-workspace` — Merkle invalidation, distributed submodels & lifecycle governance

**Type:** functional / architecture · **Size:** large

**Status:** Postponed from 2026-09-14 change series to prevent premature overengineering. Core model hierarchy and navigation were prioritized instead.

**What it entails:**
1. **Merkle-Tree Lineage & Stale Invalidation (`innfo-core`)**:
   - Container models compute aggregate Merkle hashes from leaf model hashes.
   - When a source SHA-256 changes, all dependent artifacts are automatically flagged as `status: stale` in $O(1)$ time.
2. **Distributed Model Resolver & Reusable Includes**:
   - `type:: model` supports universal URI schemes (`https://`, `git://`).
   - Enables importing corporate standard procedure libraries and base templates as remote submodels.
3. **FSM Workspace Lifecycle & Matrix Coverage Gates**:
   - `workspace_NN.md` defines maturity stages: `[draft, ingesting, modeling, verified, ready]`.
   - Transitions are gated by mathematical coverage thresholds over relationship matrices (`Artifacts × Procedures`, `Artifacts × Sources`, `Models × Sources`).

**Suggested trigger:** `/sdd-explore merkle-lineage-and-distributed-workspace` (evaluate only after unified workspace hierarchy and navigation have stabilized in real-world usage).

---

## `refactor/workspace-manifest-section-ownership` — manage the `# NN Sources` / `# NN Procedures` / `# NN Artifacts` catalog pointers + `models_dir` scope

**Type:** refactor / architecture · **Size:** medium

**Why:** `sync_workspace_manifest` reconciles only `## NN Models`. The workspace spec defines nine sections (`workspace_spec_NN.md:475-528`): `## NN Models` is enumerated, while `# NN Sources`, `# NN Procedures` and `# NN Artifacts` each carry a **single catalog pointer** (e.g. `## NN Procedures: Master Procedures Catalog → procedures/procedures_NN.md`, as `workspace_NN/workspace_NN.md` does). Those pointers are hand-authored, so a renamed/deleted catalog leaves a stale pointer nobody repairs. Separately, `## NN Models` membership is "any Level-3 file outside `{backups,archive,specs}` not in a non-model app" — a negative deny-list (see the shipped change `2026-09-23-workspace-manifest-catalog-app-exclusion`) — whereas the spec states models live under a declared `models_dir` (default `models/`), a convention real workspaces, including `docs/workspace_NN.md`, do not follow.

**Approach (open):** two candidate rules — (1) `models_dir` directory scope for `## NN Models` (spec-literal; needs a migration for workspaces whose models live elsewhere, or their entries archive), and (2) app→section routing that classifies each discovered Level-3 file by `parent_spec` into its target section, with `## NN Models` as the catch-all. Routing subsumes the deny-list. Before designing, resolve: whether the tool adopts the existing hand-authored catalog-pointer entries (`<!-- nn:auto -->`) or leaves them untouched; the `# NN Procedures` header collision with the nn-trannsform lineage record's append-only log (`openspec/specs/lineage-record-sync`); and the catalog-pointer cardinality (one entry per section vs one per file).

**Impact:** `reconcileManifest` generalized from one section to N; `sync_workspace_manifest` per-section discovery + ownership policy; reconcile with `openspec/specs/{lineage-record-sync, lineage-version-status, workspace-directory-conventions, manifest-governance}`; `iNNfo-editor` save path shares `reconcileManifest`.

**Suggested trigger:** `/sdd-explore workspace-manifest-section-ownership`.

---

## `feature/opencode-web-onboarding-hint` — `nn-start` guidance to launch OpenCode's browser mode next to the Cognnitive Web App

**Type:** functional / docs · **Size:** small · **Status:** someday-maybe

**Why:** editing a model in an OpenCode terminal/desktop session and visualizing it in
the Cognnitive Web App means jumping between two separate windows. `opencode web`
already starts a local server and auto-opens a browser tab against it
([opencode.ai/docs/web](https://opencode.ai/docs/web/)) — once that tab exists, putting
it side by side with the Cognnitive Web App tab in a split Chrome window is trivial (two
independent `localhost` tabs, no port conflict). `nn-start` could, once OpenCode is
confirmed installed, surface a short tip pointing this out for users who'd rather work
in the browser than the terminal for both.

**Deliberately NOT chosen:** a "wrapper" that auto-installs OpenCode and hides the CLI
step entirely. Decided against per the user 2026-09-26: the terminal install of OpenCode
should stay a distinct, visible step, so the user understands OpenCode is a separate
tool from Cognnitive, not part of it.

**Open question (blocks starting this):** unconfirmed against primary sources whether
installing the OpenCode **Desktop app** alone (without a separate npm/brew/winget CLI
install) leaves the `opencode` binary on `PATH`. If it doesn't, telling a Desktop-only
user to run `opencode web` in a terminal will just fail with "command not found" —
`nn-start`'s install-check step would need to run `opencode --version` (or equivalent)
regardless of which install path the user took, and only offer the web-mode tip when
that check succeeds. Full research write-up:
[docs/research/opencode-web-side-by-side-cognnitive.md](../docs/research/opencode-web-side-by-side-cognnitive.md).

**Suggested trigger:** `/sdd-explore opencode-web-onboarding-hint` (after the PATH/binary
question above is verified empirically).


---

## `chore/third-party-license-compliance` — audit that every dependency and vendored component honours its license

**Type:** chore / legal · **Size:** medium · **Status:** someday-maybe

**Why:** nothing checks that the libraries and third-party code incorporated into the
monorepo are used within the terms of their licenses. Two gaps make this impossible
today: the root `package.json` declares no `license` field and the repo has no `LICENSE`
file, so there is no project license to check dependencies against; and part of the
third-party code is vendored (SHA-pinned CDN bundles, console assets) rather than
installed, so no manifest-based scanner sees it.

**Behaviour (as requested):** a repeatable check that lists every third-party component
(npm workspaces under `iNNfo/packages/*` and `iNNfo/apps/*`, `skills/nn-trannsform`'s own
`package.json`, and vendored files), classifies each license, flags anything outside an
explicit allow/deny/review policy, and produces an attribution file that includes the
copyright notice and license text MIT/BSD/Apache require (not just package names).

**Prerequisite (blocks starting this):** the maintainer picks the project's own license
and records it (root `package.json` `license` + `LICENSE` file). The allow/deny policy
derives from it.

**Evaluated and rejected (2026-09-29):** the `checking-license-compliance` agent skill
(`jeremylongshore/claude-code-plugins-plus-skills`, penetration-tester plugin). Its
script does not implement what its SKILL.md advertises (`INCOMPATIBLE_PAIRS` is defined
but never used; no source-header or direct/transitive analysis); it classifies only the
first term of an SPDX expression, so `MIT AND GPL-3.0` passes as permissive; with no venv
it audits the machine's global Python site-packages; it skips nested `node_modules`
(non-hoisted versions) and workspace-local `node_modules`; it does not separate dev from
production dependencies; its NOTICE lists names only; and it depends on the plugin's
`lib/` package. Other directory skills found (`license-compliance-auditor` by jorgealves,
GPL-3.0, 2 commits; a5c-ai `license-compliance-checker`; a Snyk-based one needing an
account) were not deeper-reviewed.

**Approach (open):** prefer mature tooling wrapped in a small repo-local check over an
LLM-driven skill — e.g. `license-checker-rseidelsohn --production` with `--onlyAllow` as
a CI gate for npm, plus a hand-maintained `THIRD_PARTY.md` inventory for vendored code
(a file scanner such as ScanCode or a Syft SBOM is the alternative if the inventory
drifts). Mind the CI Node pin and `engine-strict=true` when adding any dev dependency.

**Suggested trigger:** `/sdd-explore third-party-license-compliance` (after the project
license is chosen).

---

## `docs/opencode-ecosystem-listing` — list cogNNitive in the OpenCode ecosystem Projects directory

**Type:** docs / community · **Size:** small · **Status:** someday-maybe

**Why:** cogNNitive runs *on* OpenCode (agents, skills, MCP servers), yet it is absent from
OpenCode's community ecosystem page ([opencode.ai/docs/ecosystem](https://opencode.ai/docs/ecosystem/)),
whose **Projects** section lists tools built on the OpenCode SDK/API. A listing there is free
discovery for exactly the audience already running OpenCode.

**Behaviour (as requested):** add cogNNitive to the **Projects** table of the Ecosystem page
(name + one-line description) by submitting a PR to the OpenCode repo.

**Approach:** the page is generated from `packages/web/src/content/docs/ecosystem.mdx` in
`anomalyco/opencode` (the page's own "Edit page" link points there). Fork, add one row to the
Projects table, open a PR. The same page points to `awesome-opencode` and `opencode.cafe` as
alternative community listings that accept entries with less ceremony — consider those too, or
instead. Open questions: the entry name (`cogNNitive`), target URL (`https://cognnitive.com`),
and whether it best fits **Projects** (built on the SDK) vs **Agents**/**Plugins**.

**Suggested trigger:** maintainer decision in chat (one PR; no SDD cycle needed).

---

## `docs/docs7-external-distribution` — publish a public mirror of the product docs on Context7 Docs7 as an external discovery channel

**Type:** docs / distribution · **Size:** small-medium · **Status:** deferred

**Why:** documentation today is self-hosted on GitHub Pages (`cognnitive.com`, `docs/CNAME`) and largely a *generated* artifact of the engine itself — the Docsify suites, `ai-index.yaml` and `llms.txt` are derived from `_NN.md` models and verified in CI, with `cognnitive.com/use` served *raw* as the agent-bootstrap manifest. That is the SSOT and it works, but it has no external discovery beyond the project's own SEO. Context7's **Docs7** (`docs7` CLI, `docs.json` + MDX, hosted by Upstash) indexes docs to 100k+ active Context7 users and reports AI-crawler traffic and unanswered agent questions — reach and visibility the project does not have.

**Scope decision (from the 2026-09-30 analysis):** **do NOT migrate the core.** Migrating would trade the self-owned, generated→verified pipeline for a third-party hosted SaaS — contradicting the project's *zero vendor lock-in / 100% Markdown in your Git* pillar, and forcing either a second source of truth or a rewrite of the generator (losing freshness, docs-facts, and the pinned raw manifest). Adopt Docs7 **only as an external distribution channel**: publish a mirror of the *public product* docs (landing / use-cases / iNNfo) to capture Context7 traffic, keeping GitHub Pages as SSOT and the pipeline intact.

**Approach (open):** stand up a `docs.json` + MDX mirror in its own folder and deploy via `@upstash/docs7` (CLI `docs7 deploy`, or the GitHub integration with a Context7 teamspace), pointing a custom domain only if it does not conflict with the Pages origin. Decide whether the mirror is hand-maintained or generated from the existing Jekyll/Docsify pages (the latter fits the repo's generated-artifact contract, but docs7 expects MDX). Keep `cognnitive.com/use` on Pages, untouched. Verify Docs7's free/open-source and self-host options before committing — an unrecoverable paid dependency would defeat the point.

**Deferred reason:** maintainer decision 2026-09-30 — the project is not finished yet; revisit after launch, once the public docs surface is stable enough to mirror.

**Suggested trigger:** `/sdd-explore docs7-external-distribution` (after project launch).

---

## `refactor/identifier-migration` — mechanical identifier migration (`template` → `app` identifiers) *(deferred)*

**Type:** refactor · **Size:** large · **Status:** deferred

**Why:** the user-facing vocabulary pass made `app` canonical and kept resolution-bearing identifiers stable as documented deprecated aliases; the actual identifier migration is intentionally deferred because paths, URLs, tool names, manifest keys and version tags all carry resolution semantics.

**Behaviour (as requested):** mechanically migrate the identifiers recorded in `iNNfo/specs/vocabulary.json` under `terms.app.planned_migrations`: `specs/templates/ → specs/apps/`, MCP tool names (e.g. `get_template`), the manifest `templates:` key, and `templates-v*` tags — with a coordinated alias/version strategy so existing pins keep resolving.

**Approach:** follow the deprecation lifecycle from the canonical-vocabulary dictionary; sequence after the user-facing rename; never a blind find-and-replace. Requires coordinated updates across the catalog, `manifest/source.yaml`, `_spec_NN.md` parent pointers, hydration paths, and the editor resolver constants.

**Risks:** large; touches resolution across editor, MCP and skills. Do not attempt as one change; reuse the `planned_migrations` list as the checklist.

**Note (2026-09-30):** the in-flight `2026-09-29-nn-level-nomenclature-rename` change (S7 path/manifest move, T internal identifiers) is already executing this migration — reconcile and close this item when that change archives. Verified 2026-09-30: the rename's R/T/S commits are largely merged on `dev` (`bluepriNNt`/`kNNowledge` identifiers across core, mcp, editor, scripts). Re-evaluate once the rename change is archived.

**Suggested trigger:** `/sdd-explore identifier-migration`.

---

## `feature/innfo-uri-protocol` — `innfo://` custom URI scheme and deep-linking parser *(deferred)*

**Type:** functional · **Size:** medium · **Status:** deferred

**Why:** the iNNfo ecosystem can benefit from a native internal URI scheme (`innfo://`) and deep-linking for cross-referencing models, elements, and procedures across workspaces, avoiding manual modal path pasting.

**Behaviour (as requested):** define and implement the `innfo://` scheme (`innfo://model/<id>`, `innfo://element/<id>`, `innfo://procedure/<id>`), wire custom URI interception and routing in both `innfo-editor` and the static console/runtime views, and register the OS-level protocol handler.

**Approach:** establish a regex/parser utility in `innfo-core` to parse `innfo://` URIs, intercept click events on matching anchors in `innfo-editor` and the consoles, and route them to the internal model navigation engine.

**Suggested trigger:** `/sdd-explore innfo-uri-protocol`.

---

## `chore/trannsform-xlsx-vulnerability` — `xlsx` (SheetJS) ships two highs with no patched version on npm

**Type:** security / chore · **Size:** small-medium · **Status:** resolved (2026-10-10, option b)

**Why:** `skills/nn-trannsform/package.json` depends on `xlsx@^0.18.5`, which carries two open **high** advisories with **no fixed version on the npm registry**: CVE-2023-30533 (prototype pollution) and CVE-2024-22363 (ReDoS). SheetJS distributes current releases from its own CDN, not npm, so `npm audit fix` and any version bump inside the registry **cannot** clear them. `nn-trannsform` reads user-supplied `.xlsx` sources, so untrusted input reaches this code — it is a **production** dependency, not dev tooling.

**Audit context (2026-10-01):** Dependabot flagged 29 alerts on `main`; the other 27 were dev/test tooling (`vitest`, `happy-dom`, `vite`, `esbuild`, `dompurify`, `@xmldom/xmldom`) and were addressed that day (criticals 3→0; `@xmldom` override in `nn-trannsform`; `dompurify` floor raised). Two residuals remain, both **dev-only**: `@vitest/mocker` path traversal (GHSA-82fw-gwwq-j7x9) needs `vitest@5` (major); and the hoisted `vite`/`esbuild` highs/moderates are non-breaking-fixable via `npm audit fix`. `xlsx` is the only one that needs a **product decision**.

**Resolved (2026-10-10, option b):** the migration landed together with the `nn-trannsform` -> `nn-sources` rename. `skills/nn-sources/package.json` now pins `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"` (official SheetJS tarball, 0.20.3) and the lockfile resolves the same URL. 0.20.3 is past both advisories (CVE-2023-30533 fixed in 0.19.3; CVE-2024-22363 fixed in 0.20.2), so neither applies. The stale `skills/nn-trannsform/` directory (0 tracked files, only *gitignored* `node_modules`) was removed.

**Suggested trigger:** `/sdd-explore trannsform-xlsx-vulnerability`.

---

## `refactor/console-bundle-derived-on-release` — derive console & MCP bundles at release instead of committing them

**Type:** build / release • **Size:** medium (multi-session) • **Status:** open • **Added:** 2026-10-02

**Why:** every console/MCP version bump currently pays a ripple across hand-maintained
*derived* artifacts that are committed to git:
- the `innfo-console.bundle.js` banner embeds its version (generated by
  `scripts/build-console-bundle.mjs` from `console/package.json`);
- the `innfo-mcp.bundle.js` bundles the version via `tsup` (`__INNFO_MCP_VERSION__`)
  and must be rebuilt;
- `innfo-core`'s version + the MCP `@cognnitive/innfo-core` dep range are synced by
  `scripts/sync-versions.mjs`;
- the console CDN pin in the 4 generated shells (now handled by
  `scripts/build-console-shells.mjs` — see the shipped pin-injection work).

These duplicates are second sources of truth: each one that drifts reddens a guard.
The maintainer's principle for this repo is **subtract derived artifacts, don't add
guards around them**.

**Scope (open):** decide whether the console and MCP bundles should stop being
committed and instead be produced in the release workflow (build → stage to
`cogNNitive-web`), with the smoke/`sha256` checks and the drift guards
(`core-mirror`, `console-payload`, `preflight-primitives`, `build-console-shells`)
re-scoped accordingly. Touches `tsup.config.ts`, `build-console-bundle.mjs`,
`release.yml`, `smoke.js`, `stage-mcp-bundle.mjs`, and the drift guards.

**Do NOT big-bang it:** land it in small reversible slices (bundle first, then the
version-pinned banner), each behind a green CI, and only after the pin-injection
change has settled.

**Suggested trigger:** `/sdd-explore console-bundle-derived-on-release`.

---

## `feature/okf-v0-2-alignment` — adopt the valuable parts of Open Knowledge Format v0.2 (provenance, trust, attested computation) + an OKF export projector *(working progress)*

**Type:** functional / architecture · **Size:** large (split into independent slices) · **Status:** open — *working progress* · **Added:** 2026-10-03

**Source:** Analysis session 2026-10-03, "Open Knowledge Format v0.2 vs cogNNitive"
(OpenCode session id `okf-v2-compliance`, worktree
`D:/Users/lucas/Documents/GitHub/cogNNitive-okf-v2-compliance`). The full conversation
is captured in Engram (project `cognnitive`, topic `architecture/okf-v2-alignment`) and
this entry is the durable, quotable digest of it.

**Context — what OKF is and what actually shipped.** Google Cloud Platform published the
**Open Knowledge Format (OKF)** in June 2026 (v0.1) and **v0.2** in July 2026. Note: there
is **no "OKF v2"** — the current spec is **v0.2**, a minor, additive, backward-compatible
bump over v0.1. Authoritative sources:
- Spec: `github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md` (the
  portada repo is `github.com/GoogleCloudPlatform/open-knowledge-format`).
- Blog: `cloud.google.com/blog/products/data-analytics/okf-v0-2-adds-trust-signals`.
- License: Apache-2.0. It is a *format*, not a platform: "if you can `cat` a file, you can
  read OKF". No schema registry, no central authority, no required tooling.

**OKF in one paragraph.** A **bundle** is a directory tree of markdown files with YAML
frontmatter. A **concept document** = one `.md` = frontmatter + body; the file path is the
concept's identity. `index.md` (progressive disclosure) and `log.md` (change history) are
reserved filenames. Cross-links are ordinary markdown links. Conformance (§11) is only:
(1) every non-reserved `.md` has parseable YAML frontmatter; (2) every frontmatter has a
non-empty `type` (the only always-required field); (3) `index.md`/`log.md` follow the
spec when present.

**OKF v0.2 added five families of frontmatter signals (all opt-in):**
1. **Provenance** — `sources` (materials the concept derives from; each entry may carry
   `author`, `usage_count`, `last_modified`). Deliberately **records signals, not a
   credibility score** (a score is subjective, unportable, and goes stale).
2. **Trust** — `generated: { by, at }` (how the content was produced, when it last
   meaningfully changed) and `verified: [ { by, at } ]` (independent confirmations). These
   are distinct because who *wrote* a concept need not be who *confirmed* it. Trust tiers
   are **derived**: no `verified` → unverified; machine actors only → machine-confirmed;
   a `human:` actor → human-reviewed.
3. **Lifecycle** — `status: draft | stable | deprecated` (absent = stable) and
   `stale_after` (a single **absolute date**, chosen over a relative TTL so staleness is a
   plain date comparison with no read-time dependence).
4. **Actor convention** (§7) — `human:`, `process:`, `agent:` prefixes.
5. **Attested Computation** (new concept type, §10) — a concept carrying a *sanctioned way
   to compute a value*: `computation`, `executor` (`resource` + `receipt` fields a run must
   return), and `attester` (deterministic, **no-LLM** code that inspects a receipt and
   returns a verdict). OKF records the computation and how to check it; it never executes
   anything.

**Two deliberate breaking renames from v0.1 → v0.2** (with fallbacks): `timestamp` is
superseded by `generated.at`, and the body `# Citations` list is superseded by the
`sources` frontmatter family. A v0.1 bundle drops in unchanged as a v0.2 bundle.

---

### Diagnostic: where cogNNitive actually stands

**Bottom line:** cogNNitive is **not aligned with OKF v0.2**; it claims (in docs) alignment
with **v0.1**, and several specs actively *forbid* mentioning OKF. The underlying
architecture is **conceptually analogous** to v0.2's families, so the gap is **vocabulary
and location of fields**, not mental model. iNNfo is in several respects **richer** than
OKF (finer-grained provenance; a fourth `reviewer` role OKF does not have).

**Conformance gaps (vs §11 + v0.2):**

| Gap | Detail | Evidence |
|---|---|---|
| G1 — no `type` field | OKF requires a non-empty `type`; iNNfo uses `level: N` + `parent_spec.name` as conceptual type. Tolerated as an extra key, but §9.2/§11 needs the key present. | every `_NN.md`; `docs/innfo/documentation/ecosystem.md:38` self-declares the substitution |
| G2 — no literal `index.md` | The index is embedded as `# NN index` *inside* `domaiNN_NN.md`, not a reserved `index.md` file. A consumer looking for `index.md` finds nothing. | `workspace_NN/domaiNN_NN.md`; the docs claim same-convention (`ecosystem.md:39`) |
| G3 — granularity mismatch | OKF: one concept = one file. iNNfo: one file = many concepts/elements (`# NN Stakeholders`, `## NN Stakeholders: X`, …). Not a tolerated extension — a different granularity axiom. | `_samples_nn/kNNowledge/Ghostbusters_business_NN.md` |
| G4 — zero adoption of the v0.2 families | `generated`/`verified`/`status`/`stale_after` do not exist anywhere (verified: `rg stale_after` → 0 hits). `sources::` exists but lives in the element **body**, not frontmatter. | `iNNfo/packages/innfo-core/src/**` |
| G5 — docs contradict each other | `provenance-vocabulary` and `lineage-bluepriNNts-docs` require OKF to appear **only** under "Planned, not implemented" (and the archived `lineage-single-edge` spec said the rewritten pages MUST NOT contain "OKF"); meanwhile `ecosystem.md`, `specifications.md`, `about.md`, `documentation_NN.md` still advertise "OKF v0.1 compatible". | conflicting living specs |
| G6 — no `okf_version` declaration | A bundle MAY declare `okf_version: "0.2"` at the bundle root. cogNNitive declares nothing. | none |

**Why G5 exists (root cause).** The archived `2026-10-01-lineage-single-edge` change was a
**documentation-coherence cleanup**: the docs described a grammar the code no longer used
(`#slug` instead of `@`, `sources/original/` which no longer exists, an unimplemented
"canonical view"). Rewriting those two pages, the cheapest way to guarantee coherence was a
blanket "no OKF" rule — because OKF was part of the same stale claim block. Side effect: a
**style cleanup rule became a concept prohibition**, while `ecosystem.md` kept selling
compatibility. This is an accident, not a design decision. **The reasonable rule is not "no
OKF" but "do not assert compatibility the code does not back".**

### Conceptual mapping: cogNNitive ↔ OKF v0.2

| cogNNitive (today) | OKF v0.2 | Relationship |
|---|---|---|
| `sources::` on an **element** (and per **field**) | `sources:` in **frontmatter** (concept) + `[^id]` footnotes | cogNNitive is **finer-grained** (field-level; `@` can point into a CSV cell) — a superset |
| `path@## Heading&subunit` grammar | footnote `id` → source | iNNfo grammar is more precise |
| `# NN Agent Modification` + `author::` | `generated: { by, at }` | equivalent intent |
| `feedback-ledger.jsonl` `.by`/`.at` | `verified: [ { by, at } ]` | ledger is the SSOT; `verified` would be a view |
| `editAttribution { author, timestamp }` | `generated` (per field, not persisted) | equivalent |
| `origin: agent \| human \| reviewer \| document` | trust tiers (unverified/machine/human) | same philosophy (signals, not scores); cogNNitive has **one extra tier** (`reviewer`) |
| `stale` (hash compare, computed) | `stale_after` (absolute date, stored) | **complementary**, not competing: "changed since review" vs "expired by calendar" |
| `model_version` drift diagnostics | `status: draft\|stable\|deprecated` | analogous intent |
| `# NN Executions` (`command`, `run_at`, `inputs`, `outputs`) | `Attested Computation` (`executor`/`receipt`/`attester`) | cogNNitive has the **receipt**; it lacks the **attester** (mechanical check that the sanctioned computation ran) |
| role from folder + contract (not stored) | `type` (declared) | different, both valid |

**The three differences that matter:**
1. **Granularity** — cogNNitive = field/element; OKF = file/concept. cogNNitive is more
   precise.
2. **Temporal determinism** — cogNNitive `stale` is exact but must read+hash the target;
   OKF `stale_after` is cheap but heuristic. Complementary.
3. **Attestation** — OKF has the formal `executor` + `receipt` + `attester` contract;
   cogNNitive has the receipt (`# NN Executions`) but **no deterministic attester**. This is
   the single most valuable thing to borrow.

### Shared problem space (why v0.2 is worth studying at all)

OKF v0.2 answers three questions cogNNitive also tries to answer, but for the console:
- "Can I trust this value before reading the body?" → OKF: frontmatter signals; cogNNitive:
  `meta.feedbackState` + citation `origin` (console only, not the raw `_NN.md`).
- "Is this still current?" → OKF: `stale_after`; cogNNitive: hash compare + version drift.
- "Was this number computed the sanctioned way?" → OKF: Attested Computation; cogNNitive:
  execution trace without attestation.
Both also **share the philosophy of signals-not-scores** — which is already cogNNitive's
principle (`origin` is a signal; `lineage-single-edge` forbids a stored score).

---

### Decisions taken (2026-10-03)

- **Opportunity B (unify trust signals into a field) — DEFERRED / do nothing now.** The
  scattered signals (`sidecar.normalized_at/by`, `editAttribution`, `feedback-ledger`) all
  already exist; nothing is missing, only *not centralized*. Materializing `generated`/
  `verified` **as persisted fields would duplicate the ledger inside the `.md`** and create
  two sources of truth — explicitly against `lineage-single-edge` ("No other location… MAY
  carry the same relationship"). If a consumer ever needs one-read trust, the right shape is
  **a derived projection** (a pure `trustFor(element)` function in `innfo-core`, exactly
  like `feedbackStateFor()`), never a stored field. YAGNI until a consumer asks.
- **`stale_after` — DEFERRED / someday-maybe.** Confirmed YAGNI: no content today expires by
  calendar, and cogNNitive staleness (content-hash) is strictly more exact. Revisit only when
  a knowledge type with date-validity appears (annual policy, quarterly price), where a
  deterministic date comparison *without reading the target* is worth the maintenance cost.
- **OKF export projector — ACCEPTED.** Do **not** turn iNNfo into OKF. Instead, add a
  **domaiNN-level procedure** that emits a conformant OKF v0.2 **bundle as a derived
  artifact** — exactly the pattern already used by `export-console`. Each iNNfo element
  projects to one OKF concept `.md`, each directory gets an `index.md`, and frontmatter
  carries `type` + (`sources`/`generated`/`verified` when derivable). The domaiNN stays
  SSOT; the OKF bundle is regenerable output. This gives real OKF interoperability *without*
  touching the model format and *without* duplicating information.
- **Documentation policy (G5) — RESOLVED as a direction.** Stop forbidding the *word* OKF;
  instead forbid asserting **unsupported compatibility** ("OKF v0.1 compatible" is a claim
  the code does not back today). Either commit to "iNNfo is a superset of OKF v0.2" (then
  update `ecosystem.md` to v0.2 and amend the "no OKF" spec clauses) or "iNNfo is not OKF"
  (then delete the compatibility page and the claims). Pick one; the current two-sided state
  is the defect.
- **Attested Computation adoption — the highest-value borrow.** Formalize `# NN Executions`
  into an attested-computation contract: keep the receipt (`command`/`run_at`/`inputs`/
  `outputs`), add `executor` (how it is run) and `attester` (deterministic, no-LLM check
  computing a verdict from the receipt). This is net-new capability, not reorganization.

### Non-goals (explicitly rejected)

- Reformatting `_NN.md` into one-concept-per-file to satisfy G3. iNNfo's granularity is a
  feature; the projector handles the boundary instead.
- Persisting duplicated provenance/trust fields in the SSOT documents (see Opportunity B).
- Adding `stale_after` now.
- Adopting OKF's `# Citations` (the `@`/`sources::` grammar is more precise and already
  shipped — OKF's is the one that was superseded).

### Proposed slices (independent; each can be its own SDD change)

| Slice | Contents | Size | Depends on |
|---|---|---|---|
| S1 — **OKF export procedure** | DomaiNN-level `nn-trannsform`/procedure that projects a domaiNN to an OKF v0.2 bundle (per-element `.md`, generated `index.md`, `type` + derivable `sources`/`generated`/`verified`, `okf_version: "0.2"`); `--check` drift mode; docs page. **This is the "future, relatively easy" deliverable the maintainer endorsed.** | medium | — |
| S2 — **`type` frontmatter emission** | Add a `type` normalizer alongside `level` in `parser/yaml.ts` (`NORMALIZERS`) so every `_NN.md` carries `type` (kNNowledge/bluepriNNt/domaiNN/…). Cheapest path to §9.2 conformance without changing the model. | small | — |
| S3 — **Attested computation contract** | Formalize the `Attested Computation` concept type over `# NN Executions`: `executor` + `attester` (deterministic receipt check), wired to the existing verdict ledger. Highest-value borrow. | medium-large | — |
| S4 — **Docs policy resolution (G5)** | Decide superset-vs-not; amend the conflicting spec clauses; fix `ecosystem.md`/`specifications.md`/`about.md`/`documentation_NN.md` to match reality (v0.1 → v0.2, or drop the claim). | small | decision |
| S5 — **Derived trust projection** *(conditional)* | Only if a consumer materializes: pure `trustFor(element)` in `innfo-core` composing sidecar + `editAttribution` + ledger — a function, never a stored field. | small | a real consumer |

**Suggested trigger:** `/sdd-explore okf-v2-alignment` (S1 is the natural first slice; S3 is
the highest-value).

---

## `docs/manual-editing-risks` — tell users that hand-editing `_NN.md` is unsafe, and have the validator say so

**Type:** docs + validator UX · **Size:** small

**Why:** the planned editing model routes every graph change through console changesets
applied by the AI agent. Editing `_NN.md` by hand stays possible but bypasses provenance,
and a copy-pasted `## NN` section duplicates the element's immutable `slug::`. Preventing
hand edits is a non-goal; the user owns that risk, but must be told.

**Behaviour:**

1. User-facing docs state that hand-editing models is unsupported for routine changes
   and that changes should go through a console changeset or the agent.
2. The validator reports a duplicated `slug::` (and other hand-edit fingerprints, such as a
   changed value with no changeset behind it) as a clear, actionable diagnostic that names
   the fix. It warns; it does not block or auto-repair.

**Depends on:** the stable-identity / single-changeset redesign (immutable slugs).

**Suggested trigger:** `/sdd-new manual-editing-risks` once immutable slugs land.

---

## `refactor/stable-identity-and-changesets` — one identity, one change record, one editing UI *(in progress, 4 slices remaining)*

**Type:** architecture · **Size:** large (7 independent SDD changes)

**Status:** vision settled in a grilling session on 2026-10-07, fact-checked against the code
by two fresh-context reviews. **S1, S2a and S2b are DONE and archived** (see the slice table).
The remaining work is fully specified as eight live changes (2026-10-13), each sliced into
batch-sized apply units; their apply order is `openspec/changes/2026-10-13-DEPENDENCIES.md`.
**State lives in `openspec/`**: a slice that has a live change is shown as a pointer here, and
its line is deleted on archive.

**Superseding changes (2026-10-13):** #1A `changes/2026-10-13-changeset-first-class-and-lineage`,
#1B `changes/2026-10-13-changeset-immutability-and-snapshot-removal` and
#1C `changes/2026-10-13-console-changes-view-and-slug-ids` (one consolidated change, split for
apply size) consolidate the coherence work found while auditing the domain console after the PoC — the
changeset as a valid L3 doc + a first-class lineage node role, the removal of the dead
`kNNowledge/archive/` snapshot, proposal immutability, the `changes` console view, the console
element-identity/`domainId` draft-store decisions, and the Source/Citation/Lineage vocabulary
alignment. It also **amends D9** (snapshot removed), **D14** (drafts keyed by a stable
path-scoped id; staleness per element via `base_hash`, resolved at apply; `--view` isolated),
and **D15** (retire the feedback JSON/ledger as specified) and **D20** (a change cites its
evidence so `field → change → source` closes).

**Why:** discovery-driven development left several writers to the graph (hand edits, the MCP
`apply_change`, the Vue editor writing directly through the File System Access API,
`nn-trannsform` scripts, review artifacts) and several provenance formats (pasted
`## NN Agent Modification` blocks in promoted transcripts, `feedback-ledger.jsonl`, editor
`editAttribution`, an orphan `.cogNNitive/change-log.jsonl` library, nothing at all for
direct editor writes). Element identity is derived from display names (derived slugs,
matrix cells keyed `matrix||row||col` by name, `[[Title :: Element]]` cross-model links), so a
rename breaks citations, and `rename_element` even discards an authored `slug::`
(`mutate.ts:578`). There are at least five slugifiers (core `parser/slug.ts`, editor
`knowledgeStore.ts:668` with `_`, MCP asset dirs, console `payload-builder.ts`, heading slugs
in `sourceRef.ts`).

**Target model:** every graph change is a changeset proposed from a console (or a chat
request) and applied by the agent; every graph component has one stable, human-readable
address.

### Decisions

| # | Decision | Reason |
|---|---|---|
| D1 | Every element carries an explicit, immutable `slug::`; concepts and matrices get one in their bluepriNNt definition. Freezing is **per model** (D19). A rename changes the name only, never the slug. | Identity must survive renames. |
| D2 | No history section is persisted inside models. Changesets are the single source of truth; the agent computes per-element history when it generates a console (cached in the console build, never stored as truth), and on demand via MCP. History horizon: from the adoption of changesets. | Single source of truth; an in-model index is derivable and would drift. |
| D3 | Slugs are unique per model, and the slug (not the name) is the node identity. Two elements may share a display name inside one model. This reverses today's model-wide name-uniqueness rule (R-IE-02, `knowledge-checks.ts`). | Models are the unit that moves between domains; supersedes the intra-document identity item above. |
| D4 | Each model carries an immutable `model_slug` in frontmatter, extension-less and path-free, unique per domaiNN. The serializer's frontmatter allow-list must keep it (and `workspace_id`) across rewrites. | Filenames are not identity. |
| D5 | One address grammar for the whole domain, extending the citation grammar `<doc>@<unit>&<subunit>` with a NEW unit kind: when `doc` is a `model_slug` (no extension) the unit is an element or matrix slug. Sources keep today's path-based units unchanged. Element `m@el`, field `m@el&field`, matrix cell `m@matrix&row&col`. No concept segment, no domain segment (the changeset header carries `workspace_id`). Fields keep name identity, versioned by the bluepriNNt; a bluepriNNt field or concept rename ships an `nn-upgrade` mapping. | One resolver for citations, changeset targets and graph references; `::` would collide with `key:: value`. |
| D6 | In the `.md` body, `reference` fields, matrix row/column headers and cross-model references are written with slugs; prose wikilinks accept a slug or a name (slug first; an ambiguous name is reported). | Structural links must not depend on names; prose stays human. |
| D7 | Changesets live in `changes/` at the domain root as `_NN.md` documents of a `changes` bluepriNNt. Names follow the naming contract (`NN_NAME_INVARIANT`: stem ends with the bluepriNNt name; repo UTC stamp `YYYYMMDDTHHmmssZ`), e.g. `<workspace_id>_<author>_<stamp>_changes_NN.md`; `roleOf` must classify them so they are never discovered as models. The proposed content is immutable and sealed by a `proposal_sha` in the header; the agent writes `status::`, `resolution::` and, when it had to suffix a new slug, `resolved_slug::` per change. A changeset is a user-input source, not a primary one. | Sources under `sources/` are sha-audited and must stay immutable; one file tells what was asked and what happened; hand edits between export and import are detectable. |
| D8 | Every graph mutation is a changeset: console, chat request, source import and `cognitivize` alike. `origin::` (`console`, `chat`, `source-import`, `agent-autonomous`) and `author::` / `requested_by::` tell them apart. `apply_change` always applies a changeset (creating one when called without). Large agent-generated changesets (import, cognitivize) are approved in bulk from a summary. The Agent Modification block, its verbatim-paste mandate and transcript promotion as provenance are retired, with no compatibility layer. | Provenance stops depending on two manual steps that fail silently. |
| D9 | Live kNNowledge files are already version-free (`NN_NAME_INVARIANT`); the version lives in frontmatter. The gap is the snapshot: applying a changeset bumps each affected model once (patch by default, the agent asks for minor/major) and MOVES the previous content to `kNNowledge/archive/` (name per the naming contract, carrying version, stamp and changeset id) instead of losing it. `isExcludedPath` must exclude an `archive` segment at any depth (today it only checks the first segment). The changeset records `base_version` and `result_version` per model. Applies to kNNowledge only; bluepriNNt filenames keep `_V_`. Check the `knowledge_version` ↔ parent `spec_version` coupling in `init_knowledge` before changing bump semantics. | Snapshots without git; old content is lost today. |
| D10 | Apply per change, decided in bulk with the agent. A change conflicts when the current value differs from its `from`, or when its slug was deleted after `base_version`. A conflict is resolved by a NEW changeset that cites the original. | One conflict must not block the clean changes; proposals stay immutable. |
| D11 | A console proposes the slug of a new element (core `slugify`, already embedded in the console bundle), checked against the snapshot and the batch. The writer confirms it, or suffixes it, rewrites the references inside the same batch and records `resolved_slug::`. No temporary ids. Names whose slug would be empty (non-Latin) get an explicit slug input in the modal. | The record stays truthful when the writer has to adjust. |
| D12 | Deleting shows the impact first. Matrix cells cascade; `reference` fields and cross-model references become conflicts decided in the batch. Slugs MAY be reused: history starts at the last `add_element`, and a pending batch whose `base_version` predates a delete of that slug conflicts. | Everything needed is already in the changesets. |
| D13 | The vanilla console stack (`iNNfo/specs/bluepriNNts/console/`) is the only UI stack. The Vue `innfo-editor` is retired; only the widgets actually needed are ported to `ui-kit.js`. Consoles open by double-click, never write files, and edit every component through one shared modal. Console states: `draft`, `proposed`; import states: `approved`, `applied`, `rejected`, `conflict`. A "direct apply" state is rejected. | One modal, one widget set, one slugify; editing complexity moves to the single writer. |
| D14 | One `domaiNN_console.html` at the domain root embeds every model, precomputed history and the source index (heavy sources are linked, not embedded; a size budget is specified). It carries a snapshot hash and `base_version` per model; drafts in localStorage are keyed by that hash and a mismatch warns and offers a rebase. The agent regenerates it after every changeset import and on demand. Specific consoles remain as views sharing the bundle and the modal. | The domain is the navigation root; the console is never older than the last apply. |
| D15 | Review feedback becomes `op: comment` changes (target, author, notes, no `to`). The feedback JSON export (console and docx sources), `feedback-ledger.jsonl`, the `source_type: feedback` import and the MCP tools `evaluate_feedback_items` / `record_feedback_verdict` are retired into the changeset import. The modal offers "propose value" or "comment". | One provenance format. |
| D16 | Existing domains migrate through `nn-upgrade`: the slug freeze ships with S1 (D19); the reference and citation rewrite, and removal of retired blocks and ledgers, ship later. Until rewritten, the core reads name-based references tolerantly; that tolerant read is legacy code with a `legacy:` marker and a `legacy-ledger.yaml` entry. | Domains converge even if the full migration is never run. |
| D17 | **Superseded (2026-10-13, `single-console-shell`).** The terms "model console" and "procedures console" are retired. One shell: every console is the **domain console**, optionally scoped (a model, a subset of models, or a view). A reviewer-facing filtered console is a scoped domain console, not a separate kind. | `app` is a deprecated alias of bluepriNNt (`iNNfo/specs/vocabulary.json`); "editor" implies direct writes and names the component being retired. |
| D18 | The Vue editor becomes read-only for kNNowledge from S1 until it is deleted. Editing in the meantime happens through the agent (chat), which emits changesets from S2a. | The editor writes with its own slugify and no knowledge of `slug::`; patching code that will be deleted is waste. The maintainer is the only user today. |
| D19 | Slugs are frozen per MODEL, not per element. The first agent mutation of a model with unfrozen elements first freezes every element slug of that model (a `freeze_slugs` change inside the same changeset). The same operation over the whole domain is the `nn-upgrade` slug migration. An unfrozen model is still readable (validator warning); mutating it without freezing is not allowed. When applying a console changeset against an unfrozen model, the agent freezes first and verifies that each derived slug in the snapshot still names the same element; otherwise that change conflicts. | A derived slug is unstable: renaming or deleting a SIBLING shifts `uniqueSlugify` suffixes. Freezing one element at a time cannot prevent that. |
| D20 | A field's `sources::` citation in the model names the origin of its CURRENT value. When a change is applied, the writer rewrites the citation of every touched field to point at that change (e.g. `changes/<changeset>_changes_NN.md@## NN Change: <id>`); untouched fields keep their citation. Earlier origins are not lost: they live in the archived snapshot (`base_version`) and the changeset chain. | Otherwise the model claims a user-entered value came from the original source. The model answers "where does today's value come from"; changesets answer "how did it get here". Nothing is duplicated, and lineage walks artifact → model → change → archived snapshot → source → sidecar. |

### Non-goals (explicitly rejected)

- A change log JSON under `.cognnitive/` (a fourth source of truth that is lost when the folder is copied). The orphan `nn-trannsform/scripts/lib/change-log.js` is deleted, and the change-log half of `feature/kb-change-governance` is absorbed by this item (its RACI review workflow stays there, rendered over changesets).
- An opaque dual id (UUID/ULID plus slug): the immutable slug is both readable and stable.
- Any console writing graph files directly, including through a local launcher.
- Concept or domain segments inside addresses.
- Preventing hand edits; they are the user's risk (see `docs/manual-editing-risks`).

### Cross-cutting constraints (from the code review)

- **Write-once specs.** D3/D5 need a new `iNNfo` spec version (`iNNfo_V_0-3-0` is hardcoded in `init-knowledge.ts`); concept/matrix slugs and the `changes` bluepriNNt need new bluepriNNt versions, manifest/catalog entries, a `templates-v*` tag and a repin. Plan the release explicitly inside each slice.
- **Generated mirrors.** Core changes regenerate the `nn-trannsform` core mirror, preflight primitives, console `innfo-slug.generated.js` and `console-payload.generated.cjs`, the MCP bundle and every committed `innfo-console.bundle.js` copy.
- **Single writer safety.** One lock per domaiNN (`changes/.lock`, stale timeout); two-phase apply (compute and validate every touched model in memory, write temp files, then rename); `status::` written last and idempotent per model keyed on `result_version`, so a resumed apply skips finished models.
- **Every graph writer is routed or removed.** Known writers: `saveKnowledge` via `apply-change.ts`, `init-knowledge.ts`, `nn-trannsform` `provenance.js` and `workspace-index.js`, `nn-upgrade/migrate-domain.js`, `workspace-sync.ts` (manifest), the editor (frozen by D18), and procedures that say "apply_change or file tools" (e.g. `reconcile_artifact_feedback_NN.md`). The MCP live-preview server reacts to mutating tool calls and must follow the new tool contract.

### Slices

| # | Slice | Contents | Depends on |
|---|---|---|---|
| S1 | `stable-element-identity` ✅ archived · `changes/archive/2026-10-10-2026-10-07-stable-element-identity` | D1, D3, D4, D5, D6, D18, D19: explicit immutable `slug::` and `model_slug`; new address unit kind and resolver; validator diagnostics (duplicate slug, ambiguous name, unfrozen model); `rename_element` keeps the slug; frontmatter allow-list; `freeze_slugs` per model plus the domain-wide `nn-upgrade` freeze; editor read-only; new `iNNfo` spec version; samples and fixtures. | — |
| S2a | `changeset-apply-and-versioning` ✅ archived · `changes/archive/2026-10-10-2026-10-07-changeset-apply-and-versioning` | D7, D8, D9, D15, D20: `changes` bluepriNNt and naming; `apply_change` applies changesets (`update_field`, `add_element`, `rename_*`, matrix-cell op, `comment`); lock and two-phase apply; snapshots in `kNNowledge/archive/` with the deep `archive` exclusion. | S1 |
| S2b | `changeset-conflicts-and-deletes` ✅ archived · `changes/archive/2026-10-10-2026-10-07-changeset-conflicts-and-deletes` | D10, D11, D12: per-change conflicts, console-proposed slugs and `resolved_slug::`, delete impact and cascades, slug reuse. | S2a |
| S2c | `retire-legacy-provenance` → `changes/2026-10-13-s2c-retire-legacy-provenance` | Retire the Agent Modification block (core, `console/citations.ts`, specs, `nn-innfo`/`nn-sources` SKILL.md), the feedback ledger, the two MCP tools, the console feedback JSON and its import, and the orphan change-log library. | #1C |
| S3 | `domain-console-and-edit-modal` → `changes/2026-10-13-s3-domain-console-and-edit-modal` | D13, D14 (D17 superseded 2026-10-13 by `single-console-shell`: one domain console, optionally scoped): parity audit gate (S3a), then ports re-planned from the audit (S3b). | S2c |
| S4 | `retire-legacy-migration-flows` → `changes/2026-10-13-s4-retire-legacy-migration-flows` | Rest of D16, re-scoped 2026-10-13 (no in-place migration): retire `nn-upgrade` Flow A and Flow C and `--migrate-references`; keep Flow B, `--freeze-slugs` and `--import-as-source`; delete the fuzzy reference step and its ledger entry. | — (before S6c) |
| S5 | `retire-innfo-editor` → `changes/2026-10-13-s5-retire-innfo-editor` | Delete the Vue editor, the hosted app, the MCP live preview and every coupling once S3 covers what is actually used; retarget the document badge; remove the editor-bound living specs. | S3, S6 |
| S6 | `console-regeneration-and-propose` → `changes/2026-10-13-s6-console-regeneration-and-propose` | Stable console files and regeneration after propose/apply, `propose_changeset`, `add_model`, `init_domain`, console New element. | #1C, S2c (S6c: S4) |

**Closes:** "Intra-document element identity: key on the slug, not the display name" (above)
and the change-log half of `feature/kb-change-governance`.

**Suggested trigger:** `/sdd-new stable-element-identity` (S1).
---

## 32. `chore/domaiNN-blueprint-publish` — publish the `domaiNN` blueprint (with `bluepriNNts`) so the dogfooding root validates drift-free

**Type:** chore · **Size:** small · **Status:** open · **Refs:** `2026-10-10-domaiNN-root-canonicalization` (commit `103ee795`)

**Why:** the `domaiNN` root-canonicalization change (direction B) added a
`bluepriNNts` concept to `iNNfo/specs/bluepriNNts/domaiNN/spec_NN.md` (bumped
`blueprint_version` V_0-2-0 → V_0-3-0) and migrated the five `domaiNN`-declaring
roots onto the canonical concepts. The four `docs/cognitive_nn/use-cases/*` roots
now validate with zero `CONCEPT_DRIFT_WARNING`. The dogfooding root
(`ecosystem_NN/domaiNN_NN.md`) keeps exactly one: `bluepriNNts` is "not defined in
template", because every root resolves `parent_spec.url` against `cogNNitive-web`,
whose published `domaiNN` blueprint still lacks the concept.

**Action:** ship the edited blueprint via a **`blueprints-v*`** release
(`release.yml` syncs `iNNfo/specs/bluepriNNts/*/spec_NN.md` to `cogNNitive-web`).
A release of any other family (`innfo-mcp-v*`, `skills-v*`, …) does NOT publish
the specs. After the release, re-run `validate_knowledge` on `ecosystem_NN/` and
confirm the last warning clears.

**Note:** non-blocking — the warning is `severity: "warning"` with `valid: true`,
and the root already coexisted with nine such warnings before the change. The only
interim effect is that consumers resolving the remote blueprint do not recognize
the `# NN bluepriNNts` section.


---

## 33. `fix/skills-scripts-typecheck` — restore typechecking of `skills/**` scripts (dead `actioNN` include)

**Type:** fix / chore · **Size:** medium · **Added:** 2026-10-10

**Why:** `tsconfig.scripts.json` (run by `verify.js` → `typecheck-scripts`) still
included `actioNN/scripts/**` and `actioNN/skills/nn-trannsform/scripts/**` after the
`actioNN` → `skills` rename, so those globs matched nothing and the skills JS stopped
being typechecked silently. (The dead includes were removed on 2026-10-10 in PR #150;
restoring the scope is the remaining work.) Repointing the include to `skills/**/*`
surfaces **45** `tsc` errors: `skills/nn-sources/**` (e.g.
`scripts/lib/watch-digest-store.js`, several `test/unit/*`) and `skills/nn-upgrade/**`
(`scripts/batch-update.js`, plus the imported generated
`scripts/lib/legacy-migrate.generated.cjs`).

**Behaviour:** restore the include scope (`skills/**/*`) and drive the 45 errors to
zero — fix the real ones and handle the generated bundle with `// @ts-nocheck` or a
working exclude; confirm `verify` stays green. Keep `scripts/**/*` checked throughout.

**Suggested trigger:** `/sdd-new skills-scripts-typecheck`.

---

## 34. `feature/video-script-review-console` — review a video script while it is authored (structure tree, overlay/animation inspector, validation, preview) *(deferred)*

**Type:** functional · **Size:** large (multi-session) · **Status:** deferred (blocked) · **Added:** 2026-10-10

**Why:** a video script is now a native iNNfo Level-3 document governed by the L2
blueprint `video-script` (Concepts `Video → Scene → Layer`, plus `Template`), and the
Remotion-based engine (`video-engine-cli.mjs`) derives timing and lowers it to a
manifest. But there is no UI to REVIEW a script while it is being authored: the author
cannot see the Video/Scenes/Layers structure, inspect the compiled overlays and their
enter/exit animations, read validation results, or preview the composition without
running CLI commands and reading JSON by hand. The idea is to capture that review
console as its own artifact. Full session reconnaissance is in Engram
(project `cognnitive`, topic `discovery/video-script-review-console-pre-build-findings-2-blockers`).

**Required capabilities (as requested):**
1. Structure tree: Video → Scenes → Layers, with each Scene's narration prose and each
   Layer's `type::` + fields.
2. Overlay & animation inspector: per Scene, the compiled manifest's
   `tracks.overlays[]` with `enterAnimation` / `exitAnimation` / `fromFrame` /
   `durationInFrames`.
3. Validation panel: the blueprint validator (innfo-mcp `validate_knowledge`) AND the
   engine's pre-compile guard (unknown `type::`, missing conditional fields,
   one-video-per-document, declared-timing rejection).
4. Live preview: reuse `video-engine-cli.mjs preview <script.md|manifest.json> [--port]`.
5. Multi-script: pick among a Series' videos.

**Constraint:** consume the STRUCTURED iNNfo model (via innfo-core / innfo-mcp
`read_knowledge`); never re-parse markdown in the console. Reuse the existing engine
(`compile` / `preview`); do not reimplement rendering.

---

### Blockers discovered before building (2026-10-10)

- **B1 — RESOLVED (2026-10-10).** The `video-script` model
  (`iNNfo/specs/bluepriNNts/video-script/`) and the relocated `nn-video-script` skill are
  now on `dev` (CI green). A console session cut from `dev` has the blueprint to consume.
  (Series/episode content is user-workspace data, never shipped in the repo.)
- **B2 — capability 4 ("live preview") cannot be "reused" — it does not exist.**
  `previewVideo()` (`video-engine-cli.mjs:654`) is a stub: it `console.log`s a URL and
  returns `{ previewUrl, port }`; it never bundles or starts Remotion Studio.
  `finalize-video.mjs` and `render-vertical.mjs` contain no `bundle` / `createServer` /
  `studio` either. `@remotion/renderer` and `@remotion/bundler` are NOT installed
  (consent-gated, ~120 MB via `ensure-engine.mjs`).
- **B3 — the repo ships no episode content.** A generic sample has no media, and a real
  script's assets live in the user workspace. `resolveMediaLayers`
  (`video-engine-cli.mjs`) throws `VideoRenderError` on any missing asset, so a
  compile-to-manifest needs resolvable assets (from the user workspace, or none).

### What is feasible by reuse (capabilities 1–3)

- Structured model: innfo-mcp `readKnowledge(rootDir, id)` (`tools/list-read.ts`) or
  innfo-core `parseKnowledge` — the source of truth, never a markdown re-parse. Note
  `readKnowledge` returns `elements` as an `ElementsMap` (a `Map`), whereas the engine's
  `lib/knowledge-model.mjs` reader returns a plain `elements` object; the engine consumes
  the plain-object shape.
- Layer→Scene ownership is DERIVED, not nested: `assignLayersToScenes`
  (`remotion-scene-compiler.mjs:150`) matches on slug (`layer.slug.includes(scene.slug)`)
  with a document-order fallback. Reuse it; do not invent an association rule.
- Pre-compile guard: `RemotionSceneCompiler.checkScript(model)` (`:199`) — one Video per
  document, unknown `type::`, missing conditional field, declared-timing rejection.
- Manifest WITHOUT synthesis or spend: `new RemotionSceneCompiler().compile(model,
  { templates })` emits `tracks.overlays[]` with enter/exit animation + `fromFrame` /
  `durationInFrames`; timing is derived from narration word count (`wordsPerSecond` 2.5)
  when no audio is bound, so no assets are needed for capabilities 1–3.
- Blueprint validation: innfo-mcp `validate_knowledge`.

### Shape decision (justify before building)

**Standalone console app + thin Node BFF**, NOT a panel inside `innfo-editor`. The editor
is a pure browser SPA (`innfo-core/browser.ts`, IndexedDB, fetch); capabilities 2–4 need
Node-side execution (import the engine `.mjs`, read files from disk, call `readKnowledge`).
Bolting a filesystem+engine backend onto the browser editor grows its trust surface and
its scope well beyond a one-blueprint review tool. Recommended shape: a new
`iNNfo/apps/innfo-video-console` (Vue 3 + Vite + TS + Tailwind, mirroring `innfo-editor`,
per `docs/innfo/documentation/console-ui-kit.md` / `console-needs-and-visuals.md` and the
`nn-design-presets` skill) backed by a small Vite dev-server Node middleware acting as the
engine/model adapter. Do not couple the editor to the still-unmerged video-script engine.

### Suggested scope for capability 4 (until B2/B3 clear)

In-app "derived-manifest overlay timeline" (from the compile output) plus a
consent-gated "Open Remotion Studio" action that runs `ensure-engine.mjs` then a real
preview — with the actual live render explicitly OUT of scope until Remotion is installed
and sample media exists.

**Suggested trigger:** `/sdd-explore video-script-review-console` — after B1 is resolved
(the video-script model is on `dev`).
## 35. `chore/sample-media-fields` — give the console sample a declared audio, video and file field

S3b group 10 (declared media rendering) shipped with no sample able to exercise it: the exported `_samples_nn` console boots with 0 `.innfo-field-media` nodes because no bluepriNNt in the sample declares an `audio`, `video` or `file` field (images, urls, markdown, select and bool are covered). Add one declared audio/video/file field to a sample bluepriNNt (bump its version per the write-once rules) and extend `test/console-s3b-parity.test.mjs` to assert a rendered media node.

**Suggested trigger:** `/sdd-new sample-media-fields` (light lane is enough if no public contract changes).

## 36. `fix/validate-workspace-sources-tests` — two red tests in innfo-mcp, unexplained

`iNNfo/packages/innfo-mcp/test/validate-workspace-sources.test.ts` fails 2 of 6 locally on every run since at least 2026-10-14: "reports a dangling sources:: file as an error; a resolvable legacy ref warns deprecation only" (the dangling diagnostic is `undefined`) and "emits missing parent directory and fuzzy suggestions in diagnostics". Stderr shows `[resolver-node] Local tier missed for defiNNition_V_0-1-0 ... ENOENT .../temp-test-workspace-sources/specs/defiNNition_V_0-1-0_NN.md`. CI on `dev` and `main` is green, so the cause is probably environmental (the fixture workspace lacks the defiNNition spec locally, or the local tier is masked on CI by a network tier). Not caused by S6/S3b (verified: those diffs touch neither validator nor resolver). Find the cause, then fix the fixture or the resolver fallback; do not skip the tests.

**Suggested trigger:** `/sdd-explore validate-workspace-sources-red` (light lane).
