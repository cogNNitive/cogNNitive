# Exploration: complete-innfo-v0-2-0-adoption

## Executive Summary

The `feat/business-template-decomposition` branch already did the *hard* part: it authored `iNNfo_V_0-2-0` (L1), rewired `innfo-core` for the two V_0-2-0 rule changes, decomposed the monolithic `business` template into a `business-model` + `analysis` composite pair (with `organization` / `projects` pulled back via transitive `includes`), and shipped V_0-2-0 variants + re-pointed samples for `business`, `organization`, `projects`. What is left is the *adoption housekeeping*: flip `DEFAULT_INNFO_VERSION`, give the four still-V_0-1-0 templates (`blank`, `cogNNitive`, `innovation`, `procedures`) a V_0-2-0 file, resolve three frontmatter-vs-filename inconsistencies (`analysis`, `business-model`, `workspace_spec_NN.md`), refresh docs / CHANGELOG / the `SHIPPED_TEMPLATE_VERSIONS` map, sync the stale `actioNN` bundled `workspace_spec_NN.md`, and note the `eNNvironment` manifest pin bump as a coordinated follow-up.

**This is bigger than "finish a version bump".** The verified-state brief under-describes it: `business_V_0-2-0` is not `business_V_0-1-0` + a new parent pointer — it is a **pure composite** with a different concept set, concept renames (`Persons`→`Person`, `Positions`→`Position`, `Milestones`→`Milestone`, stakeholder `Roles`→`Stakeholder roles`), and `Analysis`/`Validation` moved out to the `analysis` template. Any spec/tasks phase must treat the decomposition as *done and load-bearing*, not re-litigate it.

---

## 1. Corrected L2 Template Inventory

Read from working tree on `feat/business-template-decomposition`. "FM" = frontmatter.

| Template | Files present | `spec_version` (FM) | `parent_spec.name` (FM) | `template_version` (FM) | V_0-2-0 sample? | Notes |
|---|---|---|---|---|---|---|
| **business** | `business_V_0-1-0_NN.md` (369 KB, monolithic), `business_V_0-2-0_NN.md` | V_0-1-0 / V_0-2-0 | `iNNfo_V_0-1-0` / `iNNfo_V_0-2-0` | V_0-1-0 / **V_0-2-0** | ✅ `Ghostbusters_V_0-2-0_business_NN.md` (V_0-1-0 sample also kept) | V_0-2-0 is a **pure composite**: `includes: [business-model, analysis]`. Declares **no** primitives of its own. |
| **business-model** | `business-model_V_0-1-0_NN.md` **only** | **V_0-2-0** | **iNNfo_V_0-2-0** | V_0-1-0 | ❌ (no sample at all) | NEW file, born on this branch. `includes: [organization@V_0-2-0, projects@V_0-2-0]`. FM `spec_version`/`parent` are V_0-2-0 while filename + `template_version` are V_0-1-0. |
| **analysis** | `analysis_V_0-1-0_NN.md` **only** | **V_0-2-0** | **iNNfo_V_0-2-0** | V_0-1-0 | ❌ (has `StartupValidation_V_0-1-0_analysis_NN.md`) | NEW file, born on this branch. Same FM-vs-filename split as business-model. Standalone (no `includes`). |
| **organization** | `organization_V_0-1-0_NN.md`, `organization_V_0-2-0_NN.md` | V_0-1-0 / V_0-2-0 | `iNNfo_V_0-1-0` / `iNNfo_V_0-2-0` | V_0-1-0 / **V_0-2-0** | ✅ `EngineeringTeam_V_0-2-0_organization_NN.md` | Correct target pattern. Index changed: `Position`/`Person`/`Roles` now singular; concept bodies reworked for decomposition. |
| **projects** | `projects_V_0-1-0_NN.md`, `projects_V_0-2-0_NN.md` | V_0-1-0 / V_0-2-0 | `iNNfo_V_0-1-0` / `iNNfo_V_0-2-0` | V_0-1-0 / **V_0-2-0** | ✅ `SoftwareReleaseProject_V_0-2-0_projects_NN.md` | Correct target pattern. Index changed: `Milestone` now nested under `Phases`. |
| **blank** | `blank_V_0-1-0_NN.md` **only** | V_0-1-0 | `iNNfo_V_0-1-0` | V_0-1-0 | ❌ (no sample) | Untouched. Needs a V_0-2-0 file for adoption. |
| **cogNNitive** | `cogNNitive_V_0-1-0_NN.md` **only** | V_0-1-0 | `iNNfo_V_0-1-0` | V_0-1-0 | ❌ (no sample) | Untouched. Needs a V_0-2-0 file for adoption. |
| **innovation** | `innovation_V_0-1-0_NN.md` **only** | V_0-1-0 | `iNNfo_V_0-1-0` | V_0-1-0 | ❌ (has `DeLoreanTimeTravel_V_0-1-0_innovation_NN.md`) | Untouched. Needs a V_0-2-0 file for adoption. |
| **procedures** | `procedures_V_0-1-0_NN.md` **only** | V_0-1-0 | `iNNfo_V_0-1-0` | V_0-1-0 | ❌ (has `CodeReviewProcess_V_0-1-0_procedures_NN.md`) | Untouched. Needs a V_0-2-0 file. NB: `apps/innfo-editor/src/extensions/registry.ts` already keys the procedures extension as `procedures_V_0-2-0` (works via the `procedures` alias today). |
| **workspace_spec** | `specs/templates/workspace_spec_NN.md` (**unversioned filename**, at `templates/` root, no `samples/` dir) | **V_0-2-0** | **iNNfo_V_0-2-0** | V_0-1-0 | n/a | Filename has **no `V_x-y-z` segment** → straight R-SV-02 violation regardless of publish history. Owned jointly with the `workspace-taxonomy-and-submodels` idea (see §6). |

### Real V_0-1-0 → V_0-2-0 delta of a template

Diffing `organization_V_0-1-0` vs `organization_V_0-2-0` and the `business` pair: the change is **not** just a parent pointer + `template_version` bump. It is a genuine schema rework — renamed concepts, re-nested index, redistributed Concept/Field/Marker/Matrix Definitions across the new `business-model` / `analysis` / `organization` / `projects` split, and the `includes` graph that re-composes them. `packages/innfo-core/tests/business-decomposition-v2.test.ts`, `organization-v2.test.ts`, `projects-v2.test.ts`, `includes-dedup.test.ts` and `includes-composition.test.ts` already lock this behaviour in.

Implication for the four untouched templates (`blank`, `cogNNitive`, `innovation`, `procedures`): they have **no schema rework pending** — the V_0-2-0 L1 breaking change (frontmatter `concepts:`/`markers:`/`matrices:` blocks removed in favour of body elements) was already absorbed content-wise in the V_0-1-0 era; every current template body uses `# NN Concept Definition` form. Their V_0-2-0 file is a **content-identical copy** with three FM edits (`spec_version`, `parent_spec.name`, `parent_spec.url`) and a `template_version` bump to match the new filename.

### L1 spec delta (`iNNfo_V_0-1-0` → `iNNfo_V_0-2-0`), read in full

Two changes, only one of which the CHANGELOG mentions:

1. **`includes` duplicate-name rule (in CHANGELOG).** Two composition sources declaring a same-named Definition of the same primitive: AST-identical body → silently merged into one entry (was: any duplicate name = ERROR). Differing bodies → still ERROR, must name both sources. Core has `canonicalizeDefinition` (exported) + updated `mergeSchemaInto`.
2. **`model` added to the type enums (NOT in CHANGELOG).** `Concept Definition` `type` enum goes `text|category|weight|list|steps|sequence` → `…|model` (prose table + metaschema `options::`). `Field Definition` `type` enum gains `model` likewise. `packages/innfo-core/src/types.ts` **already** carries `'model'` in both `ConceptType` and `ConceptField.type`, so spec and engine agree — but the CHANGELOG and the `workspace-taxonomy-and-submodels` exploration are both stale on this.

Both `iNNfo_V_0-1-0_NN.md` and `iNNfo_V_0-2-0_NN.md` carry `status: "Draft"`.

---

## 2. What "V_0-2-0 is the adopted L1" Requires

Authoritative checklist, reconciled from `docs/documentation/specifications.md` ("When a format spec changes", steps 1-9, currently staged) and `.agents/skills/nn-dev-spec-version-propagator/SKILL.md`:

1. **`DEFAULT_INNFO_VERSION = 'V_0-2-0'`** in `apps/innfo-editor/src/utils/constants.ts` (today `'V_0-1-0'`). Single source of truth for "current/adopted" per the propagator skill.
2. **Every L2 template resolvable at `iNNfo_V_0-2-0`.** Already true for `business`, `business-model`, `analysis`, `organization`, `projects`, `workspace_spec`. Needs new files for `blank`, `cogNNitive`, `innovation`, `procedures`.
3. **`iNNfo_V_0-2-0_NN.md` status.** Today `Draft`. **Open question:** `iNNfo_V_0-1-0_NN.md` *also* says `Draft`, so there is no established "adopted" marker in the spec file — the propagator skill leans entirely on the constant. Decide: introduce `status: "Active"`/`"Adopted"`/`"Stable"` (and document the vocabulary in `defiNNe`), or leave `Draft` and rely solely on the constant. Recommendation: flip to a non-Draft value and document it — "the adopted spec still says Draft" is a latent confusion.
4. **`scripts/check-spec-version.mjs --version V_0-1-0 --check --by-type --with-skills` reasoned-green.** Literal zero is impossible — frozen `*_V_0-1-0_NN.md` files and archives always match the string. Real gate: **no `source` / `doc` / `skill` / `test` / active-`fixture` file still assumes V_0-1-0 is *current*.** The proposal must define the accepted residual allow-list (immutable V_0-1-0 spec + the 5 templates keeping a V_0-1-0 file + their V_0-1-0 samples + `CHANGELOG.md` history).
5. **`npm run check:spec-urls` (and `--with-skills`) green** — every new `spec_url` / `parent_spec.url` in the new template files must resolve to a real path under `specs/`.
6. **Docs refreshed:** `docs/documentation/specifications.md` (three tables + delete the "In flight" blockquote), `ecosystem.md`, `usage.md`, `relationships.md`, `innfo-editor.md`, `docs/repair-guide.md`.
7. **`CHANGELOG.md` "Unreleased" entry completed** — currently claims V_0-2-0 is "copy of V_0-1-0 + one additive rule"; omits the `model` type addition and the template decomposition + adoption.
8. **`apps/innfo-editor/src/config/samples.ts` `SHIPPED_TEMPLATE_VERSIONS`** updated (today all four at `V_0-1-0`).
9. **Cross-repo:** sync `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` from canonical; note `eNNvironment/docs/use/manifest.md` pin bumps as a coordinated post-merge step (needs a commit sha that does not exist yet).

---

## 3. Design Decisions to Resolve in the Proposal

### 3a. `analysis` and `business-model` — FM-vs-filename split

Both carry `spec_version: "V_0-2-0"` + `parent_spec.name: "iNNfo_V_0-2-0"` but keep the `_V_0-1-0_` filename and `template_version: "V_0-1-0"`.

Per **R-SV-03**, `spec_version` (L1-compliance level) is *explicitly independent* of `template_version` (template identity). A first-revision template that is V_0-2-0-L1-compliant legitimately reads `spec_version: V_0-2-0` + `template_version: V_0-1-0` + filename `_V_0-1-0_`. So **this is only a bug if those files were already published at `V_0-1-0`** (R-SV-02: no in-place edit of a published file).

- **Almost certainly NOT published:** `business-model` and `analysis` did not exist before the decomposition branch — they are carved out of the old monolith. `git log --follow specs/templates/analysis/analysis_V_0-1-0_NN.md` and same for `business-model` **must be run in the proposal phase** (this explorer cannot run git). If both first appear on `feat/business-template-decomposition`, the current shape is **valid** — keep the `_V_0-1-0_` filenames, no rename, no restore.
- **If either was somehow published:** create `*_V_0-2-0_NN.md` and freeze the `_V_0-1-0_` file.
- Recommendation: **keep as-is** (confirm via `git log`); treat the brief's "R-SV-02 violation" framing as applying only to `workspace_spec_NN.md` (3c).
- Check `StartupValidation_V_0-1-0_analysis_NN.md` `parent_spec.url` points at `analysis_V_0-1-0_NN.md` (should; no change).

### 3b. `blank`, `cogNNitive`, `innovation`, `procedures` — new V_0-2-0 file even with unchanged schema?

Yes. Their `*_V_0-1-0_NN.md` files **are** the currently-adopted, published templates (referenced by `DEFAULT_TEMPLATE_VERSION` and by existing models), so editing `spec_version`/`parent_spec` in place = R-SV-02 violation. `docs/documentation/specifications.md` step 6 is explicit: *"Templates that only exist at the old version must get a new-version file before the L1 can be made the default."*

- **R-SV-03** says `template_version` changes **only when the filename changes**. Creating `blank_V_0-2-0_NN.md` *is* a filename change, so `template_version` goes to `V_0-2-0` in the new file. The change is purely the L1-compliance re-point; body content copied verbatim.
- Net: **4 new template files**, each a copy of its `_V_0-1-0_` sibling with `spec_version: V_0-2-0`, `parent_spec.name: iNNfo_V_0-2-0`, `parent_spec.url: .../iNNfo_V_0-2-0_NN.md`, `template_version: V_0-2-0`, `spec_url` → new filename. Old files stay frozen.
- Consider whether the `cogNNitive` template is in scope at all — zero code references besides its own file; candidate for the "orphan" treatment `businessV2`/`biz` got under R-SV-06. Default to bumping for completeness; get a user decision.

### 3c. Missing V_0-2-0 samples (`analysis`, `innovation`, `procedures`; `business-model` has none)

A shipped sample is an L3 model pinned to a specific template version; a sample authored against `X_V_0-1-0` stays valid forever. New samples are only needed to *demonstrate a new template file*:

- If 3b creates `innovation_V_0-2-0` / `procedures_V_0-2-0` / `blank_V_0-2-0`, then for table consistency in `specifications.md` each should get a `*_V_0-2-0_*` sample = a copy of the V_0-1-0 sample with `parent_spec` + filename re-pointed (mechanical).
- `analysis`: if 3a keeps `template_version: V_0-1-0`, its existing `StartupValidation_V_0-1-0` sample is already correct — **no new sample**.
- `business-model`: intermediate composite; `business_V_0-2-0` Ghostbusters exercises it transitively. Recommendation: **no standalone shipped sample** unless the user wants one.
- Recommendation: new sample **only** where 3b adds a new template file and a V_0-1-0 sample already exists to copy.

### 3d. `DEFAULT_TEMPLATE_VERSION` — single constant vs per-template

`DEFAULT_TEMPLATE_VERSION` (`'V_0-1-0'`) is a **scaffolding fallback** consumed by `constants.ts` (`buildTemplateUrl` default arg), `components/layout/Header.vue`, and `components/editor/composables/useModelFrontmatter.ts` — always "the version to assume when a model's frontmatter doesn't state one". Not a per-template registry.

The per-template "newest known version" registry **already exists**: `SHIPPED_TEMPLATE_VERSIONS` in `apps/innfo-editor/src/config/samples.ts` (consumed by `useTemplateVersionNotice.ts` for the staleness badge).

- Recommendation: **do not make `DEFAULT_TEMPLATE_VERSION` a map.** Keep it scalar; set its value from the one default scaffolding template. If new docs scaffold `blank` and `blank` gets a V_0-2-0 file (3b), bump it to `V_0-2-0`. Update `SHIPPED_TEMPLATE_VERSIONS` to the real per-template mix: `business`/`organization`/`projects` → `V_0-2-0`; `procedures` → `V_0-2-0` once its file exists; optionally add `business-model`/`analysis` at `V_0-1-0` and `blank`/`innovation`/`cogNNitive` at `V_0-2-0`.
- Watch: `SHIPPED_TEMPLATE_VERSIONS` values are `template_version`, **not** `spec_version`. `analysis`/`business-model` stay `V_0-1-0` there even though V_0-2-0-L1-compliant.

### 3e. Cross-repo scope

- **`actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` — IN SCOPE.** Currently non-iNNfo legacy format (`# NN concept:`, `* type::`, `* field: x | type:: y`) with `spec_version: V_1-0-0` — invalid syntax, wholly stale. Canonical `specs/templates/workspace_spec_NN.md` is already V_0-2-0. Straight file copy; low risk; `check-spec-version.mjs --with-skills` sees it.
- **`eNNvironment/docs/use/manifest.md` — FOLLOW-UP, not in scope.** Pins `workspace_spec_NN` (`version: "V_1-0-0"`, `path: specs/templates/workspace_spec_NN.md`) and `projects` (`version: "V_0-1-0"`, `path: .../projects_V_0-1-0_NN.md`) by `path` + `version` + `commit` (`d60a7109…`). Bumping needs a merge commit sha from *this* change → post-merge only. Record as an explicit coordinated rollout step.
- `workspace_spec_NN.md` rename to `workspace_spec_V_0-1-0_NN.md` (fix R-SV-02 filename violation) is entangled with `workspace-taxonomy-and-submodels`. See §6.

---

## 4. Blast Radius

`scripts/check-spec-version.mjs` and `git` could not be executed here (Bash disabled). Numbers below are from `Grep` over the working tree, excluding `**/archive/**`. The proposal phase should run: `node scripts/check-spec-version.mjs --version V_0-1-0 --by-type --with-skills`, `--inventory`, `--check-urls --with-skills`.

**`iNNfo_V_0-1-0` string** — 92 hits / 29 files. **Any `V_0-1-0` string** — 739 hits / 94 files (dominated by one golden snapshot: 266 hits in `apps/innfo-editor/tests/golden/__snapshots__/recursiveParser.models.golden.test.ts.snap`).

### Files that must change for adoption

| Group | Files | Nature of edit |
|---|---|---|
| **Spec (L1)** | `specs/iNNfo_V_0-2-0_NN.md` | `status` field |
| **Templates — new files** | `specs/templates/blank/blank_V_0-2-0_NN.md`, `.../cogNNitive/cogNNitive_V_0-2-0_NN.md`, `.../innovation/innovation_V_0-2-0_NN.md`, `.../procedures/procedures_V_0-2-0_NN.md` | new copy, 4-5 FM lines re-pointed |
| **Templates — FM reconcile (pending 3a/3c)** | `specs/templates/analysis/analysis_V_0-1-0_NN.md`, `.../business-model/business-model_V_0-1-0_NN.md`, `specs/templates/workspace_spec_NN.md` | confirm-or-fix per 3a / 3c |
| **Samples — new (only if 3c says so)** | `.../innovation/samples/*_V_0-2-0_*`, `.../procedures/samples/*_V_0-2-0_*`, `.../blank/samples/*` | copy + re-point `parent_spec` |
| **Source** | `apps/innfo-editor/src/utils/constants.ts` (`DEFAULT_INNFO_VERSION`, maybe `DEFAULT_TEMPLATE_VERSION`), `apps/innfo-editor/src/config/samples.ts` (`SHIPPED_TEMPLATE_VERSIONS` + sample refs), `.../composables/useWorkspaceScaffolding.ts`, `.../views/HomeView.vue`, `.../views/StandaloneProcedureView.vue`, `.../components/layout/SetupWizard.vue`, `.../services/SpecResolverService.ts`, `.../components/editor/FilePreviewModal.vue`, `.../composables/useTemplateVersionNotice.ts`; `packages/innfo-mcp/src/tools/{spec,mutate,list-read,resolver-node}.ts`, `packages/innfo-mcp/src/server.ts`, `packages/innfo-core/src/{helpers,schema,types,parser/sections,parser/serializer,validator/content,validator/model}.ts` (1 `V_0-1-0` hit each — mostly comments/defaults; audit each for "current version" assumption vs legit historical ref) | targeted |
| **MCP bundle** | `packages/innfo-mcp/bin/innfo-mcp.bundle.js` (6), `docs/cdn/innfo-mcp-v0.2.1.bundle.js` / `-v0.2.0.bundle.js` | regenerate bundle; decide if `docs/cdn/*` are frozen CDN artifacts or re-emitted |
| **Docs** | `docs/documentation/specifications.md` (15, staged), `ecosystem.md`, `usage.md`, `relationships.md`, `innfo-editor.md`, `docs/repair-guide.md`, `docs/changesets/{innfo-repo,format-repo}.md`, `CHANGELOG.md` | prose + tables |
| **Skills** | `.agents/skills/nn-dev-spec-version-propagator/SKILL.md` (examples), `apps/innfo-editor/src/ai-guide/procedure_NN.md`, `actioNN/skills/nn-innfo/SKILL.md` (`version: "V_0-1-0"`, §2 canonical URLs), `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` | version strings / URLs / sync file |
| **OpenSpec living specs** | `openspec/specs/{spec-versioning,spec-resolution,organization-template,procedures-template,opencode-innfo-agent,guide-prompts}/spec.md` | most cite V_0-1-0 only as an *example* — audit, likely leave |

### Tests & fixtures already on V_0-2-0 (do NOT need touching)

~22 test files reference `V_0-2-0` already: `packages/innfo-core/tests/{business-decomposition-v2,organization-v2,projects-v2,includes-dedup,includes-composition,metaschema-selfdescribe,index,helpers,parser-standard,recursive-parser,workspace-spec-c,workspace-taxonomy-submodels}.test.ts`, `packages/innfo-mcp/{src/tools/*.spec.ts,test/*.test.ts}`, `apps/innfo-editor/tests/{unit/validator,unit/useTemplateVersionNotice,unit/workspaceStore,component/ModelInfoPanel-version}.test.ts`.

### Tests / fixtures / goldens that WILL churn

- `apps/innfo-editor/tests/golden/__snapshots__/recursiveParser.models.golden.test.ts.snap` (266 `V_0-1-0` hits) + `apps/innfo-editor/tests/golden/{recursiveParser.models,crlf-fidelity}.golden.test.ts` — regenerate only if a fixture model re-points to a V_0-2-0 template. Keep fixtures pinned to V_0-1-0 unless the test's intent is "current default" → near-zero snapshot diff. Any regen reviewed line-by-line, not blind `-u`.
- `apps/innfo-editor/tests/fixtures/models/{FORMAT_V_0-1-0_business_F,FORMAT_V_0-1-1_business_F,EngineeringTeam_V_1-0-0_organization_F,Comprehensive_Test_Procedure_V_1-0-0_procedures_F}.md` — legacy `_F.md` FOLDER-mode fixtures; likely stay frozen (test backward parsing); confirm no test asserts "current version".
- `apps/innfo-editor/tests/unit/{version,useTemplateVersionNotice}.test.ts` (latter 13 hits), `component/{LeftSidebar-template-taxonomy,ModelInfoPanel-templateBadge,ValidationReport}.test.ts`, `e2e/11-color-propagation.spec.ts` — adjust expectations for new default / new shipped versions.
- `packages/innfo-mcp/src/tools/mutate.spec.ts` (20), `server.spec.ts` (11), `spec.spec.ts` (9) — MCP fixtures pinned to V_0-1-0 URLs; audit for "current" assumptions.

---

## 5. Risks

| Risk | Assessment |
|---|---|
| **Parent-chain resolution breaks for L3 models pinned to `iNNfo_V_0-1-0` templates** | **Low / none.** Old `*_V_0-1-0_NN.md` template + spec files stay frozen; `spec-resolution` R-LSR-02 resolves each model against the exact authored version. Confirm by running golden/MCP suites after the constant flip — no fixture pinning a `_V_0-1-0_` URL should change output. |
| **`model` type: spec vs engine vs CHANGELOG mismatch** | Spec adds `model` to both `type` enums; `packages/innfo-core/src/types.ts` already has `'model'` — spec/engine agree. But `CHANGELOG.md` only documents the `includes` dup-name rule, and the `workspace-taxonomy-and-submodels` exploration still lists "introduce `type:: model`" as pending core work that is in fact done. Reconcile the CHANGELOG; note `type:: model` is already a shipped V_0-2-0 primitive. |
| **`strict_tdd` active** | Every code edit (`constants.ts`, `samples.ts`, MCP tools, bundle regen) needs a failing test first. Bulk of the change is markdown (new template files, docs) — not TDD-gated — but the constant flip + `SHIPPED_TEMPLATE_VERSIONS` update are, with expectation churn in ~10 files (§4). |
| **Golden / fixture regeneration** | The 266-hit snapshot regenerates only if a fixture model changes its resolved parent. Keep fixtures V_0-1-0-pinned unless intent is "current default". Review any regen line-by-line. |
| **Feature branch already carries partial work** | `feat/business-template-decomposition` has the decomposition + `iNNfo_V_0-2-0` + core changes but **no OpenSpec change folder** for the decomposition itself (searched: none, active or archived). This change is retrofitted onto in-flight work; spec/tasks phases may need to *document* decisions already made in code. Orchestrator also has unrelated tooling edits staged (`package.json`, `ci.yml`, `scripts/check-spec-version.mjs`, `CONTRIBUTING.md`, `docs/documentation/specifications.md`, the propagator SKILL) — **do not touch those** — but `specifications.md` is *both* staged tooling work *and* a file this change must edit (tables + "In flight" note). Coordinate to avoid a clobber. |
| **`check-spec-version.mjs --version V_0-1-0 --check` can never be literally green** | Frozen `_V_0-1-0_` files always match. The proposal must define the allowed residual allow-list or the CI gate is a judgement call. |
| **`docs/cdn/innfo-mcp-*.bundle.js`** | Published CDN snapshots. If immutable historical artifacts → leave. If the build re-emits them → they churn. Decide explicitly. |
| **`cogNNitive` template relevance** | Zero consumers. Bumping it is busywork; dropping it is scope creep into R-SV-06. Get a user decision. |

---

## 6. Overlap Check — Active Changes

| Change | State | Overlap | Verdict |
|---|---|---|---|
| **`workspace-taxonomy-and-submodels`** | `exploration.md` only — no proposal/spec/tasks/state. Not a committed active change. | **Shares two surfaces.** (1) `type:: model` — its exploration lists adding `model` to `innfo-core` as pending, but that is **already done** (`types.ts`) and already in `iNNfo_V_0-2-0`. (2) `specs/templates/workspace_spec_NN.md` — it wants to formalize this as the L2 workspace template replacing `index.md`; this change needs to fix that file's unversioned filename (R-SV-02). | **Coordinate, don't collide.** Recommendation: this change does the `iNNfo_V_0-2-0` adoption + syncs the `actioNN` copy, but **defers the `workspace_spec_NN.md` → `workspace_spec_V_0-1-0_NN.md` rename** to `workspace-taxonomy-and-submodels` (owns the file's whole redesign), OR does the minimal rename now. Flag the choice for the user. Its stale exploration should be refreshed to note `model` is done. |
| **`graph-view-relationship-types`** | Full `proposal.md` + `design.md` + `tasks.md` + `state.yaml`. Active. | Proposal is **explicitly "Bounded to the iNNfo model/template spec V_0-1-0"**, touches only `packages/innfo-core/src/{types,recursiveParser/normalize,recursiveParser/model}.ts` + editor graph composables + its own new fixtures. **No spec/template file overlap.** Its new capability spec cites `V_0-1-0` once as context. | **No conflict.** If both land, a trivial rebase on `V_0-1-0`→`V_0-2-0` doc references. |
| **`drop-matcher`** | `state.yaml` + `tasks.md`, all tasks checked. Skill-matcher removal. | None — no spec/template/version/`innfo-core` surface. | **No conflict.** |

---

## Ready for Proposal

**Yes**, with these inputs the proposal phase must gather first:

1. Run `git log --follow` on `analysis_V_0-1-0_NN.md` and `business-model_V_0-1-0_NN.md` to confirm they are branch-new (settles 3a).
2. Run `node scripts/check-spec-version.mjs --version V_0-1-0 --by-type --with-skills`, `--inventory`, `--check-urls --with-skills` for the exact file list and define the frozen-file allow-list.
3. User decisions: (a) `iNNfo_V_0-2-0` `status` value + vocabulary; (b) `cogNNitive` template bumped or dropped; (c) `workspace_spec_NN.md` rename now vs deferred; (d) are `docs/cdn/*.bundle.js` frozen artifacts; (e) scope boundary for new samples.
4. Confirm with the user that the **business decomposition itself is accepted as done** and this change only does adoption housekeeping — not re-open the `business` → `business-model`/`analysis` split.

Recommended next phase: `sdd-propose`.
