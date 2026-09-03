# Proposal: Complete iNNfo V_0-2-0 Adoption

## Intent

`feat/business-template-decomposition` did the hard, irreversible work: it authored the L1 spec `specs/iNNfo_V_0-2-0_NN.md`, taught `innfo-core` the two V_0-2-0 rule changes, decomposed the monolithic `business` template into a `business-model` + `analysis` composite pair, and shipped V_0-2-0 template files + re-pointed samples for `business`, `organization`, and `projects`. **That work is done and load-bearing; this change does not touch it.**

What is left is adoption housekeeping — and the branch is currently in a half-applied, internally inconsistent state that is visible to users and to the toolchain:

| Symptom | Evidence (verified on branch) |
|---|---|
| The adopted L1 version constant still says V_0-1-0 | `apps/innfo-editor/src/utils/constants.ts:13` — `DEFAULT_INNFO_VERSION = 'V_0-1-0'`, while 6 of 10 L2 templates already declare `parent_spec.name: iNNfo_V_0-2-0` |
| Four templates cannot be resolved at V_0-2-0 at all | `blank`, `cogNNitive`, `innovation`, `procedures` exist **only** as `*_V_0-1-0_NN.md` with `parent_spec.name: iNNfo_V_0-1-0` |
| The editor already advertises a template file that does not exist | `apps/innfo-editor/src/extensions/registry.ts` keys the procedures extension as `procedures_V_0-2-0`; no `procedures_V_0-2-0_NN.md` file exists (it works today only via the bare `procedures` alias) |
| The staleness badge lies | `apps/innfo-editor/src/config/samples.ts:31-36` — `SHIPPED_TEMPLATE_VERSIONS` reports all four of `business`/`procedures`/`organization`/`projects` at `V_0-1-0`, but `business`, `organization` and `projects` already ship `template_version: V_0-2-0` files |
| The adopted spec still says it is a draft | `specs/iNNfo_V_0-2-0_NN.md:9` — `status: "Draft"`, identical to `iNNfo_V_0-1-0_NN.md:9` |
| Public docs describe the migration as unfinished, in prose | `docs/documentation/specifications.md:99-104` — an "In flight" blockquote stating `DEFAULT_INNFO_VERSION` stays at `V_0-1-0` "until that migration is complete" |
| The CHANGELOG under-describes what shipped | `CHANGELOG.md:5-14` calls `iNNfo_V_0-2-0` "a copy of `V_0-1-0` + one additive rule". It omits the `model` type-enum addition and the entire template decomposition |
| A bundled cross-repo template is not merely stale — it is invalid | `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` is pre-iNNfo legacy syntax (`# NN concept:`, `* field: x \| type:: y`) with `spec_version: V_1-0-0`; the canonical `specs/templates/workspace_spec_NN.md` is already V_0-2-0 |
| The CHANGELOG contradicts the tree | `CHANGELOG.md:31` claims `cogNNitive` was deleted as an orphan template; `specs/templates/cogNNitive/cogNNitive_V_0-1-0_NN.md` (324 lines) exists |

The cost of leaving this half-applied is not cosmetic. `SHIPPED_TEMPLATE_VERSIONS` drives a user-facing staleness badge; `DEFAULT_INNFO_VERSION` is the documented single source of truth for "which L1 is current" (`nn-dev-spec-version-propagator`, step 2); and the `nn-innfo` skill's §2 canonical URL block is what an agent hands to a user scaffolding a brand-new model. Every day this sits half-applied, new L3 models are authored against V_0-1-0 templates by a toolchain that has already moved on.

### Verified scan (this phase)

`node scripts/check-spec-version.mjs` **could not be executed** — the propose phase had no shell. The file set below was reproduced by replicating the script's own matching rules (any `.md`/`.ts`/`.tsx`/`.vue` file containing the literal `V_0-1-0`, excluding `node_modules`/`.git`/`archive`). Re-run the three commands for real at the start of `sdd-apply` and diff against this table.

**89 files in `iNNfo` + 7 files in `actioNN/skills` reference `V_0-1-0`** (excluding archives; archives add a further 32 files).

Two corrections to the exploration's blast-radius estimate, both material:

1. **The checker only scans `.md`, `.ts`, `.tsx`, `.vue`** (`check-spec-version.mjs:483-485`). The 266-hit golden snapshot `apps/innfo-editor/tests/golden/__snapshots__/recursiveParser.models.golden.test.ts.snap` and **every** `.js` bundle (`packages/innfo-mcp/bin/innfo-mcp.bundle.js`, `docs/cdn/innfo-mcp-*.bundle.js`) are **invisible to the gate**. They can only churn through a real test/build run, never through the version check.
2. **`docs/documentation/ecosystem.md` contains zero `V_0-1-0`/`V_0-2-0` references** and `openspec/specs/procedures-template/spec.md` contains none either. Both were listed in the exploration as needing edits. Neither does, on version-string grounds.

A third correction, to `--by-type` itself: `classifyFile` only assigns the `spec`/`template`/`model` categories to legacy `_FORMAT.md`/`_F.md` files (`check-spec-version.mjs:79-92`). Every modern `_NN.md` artifact under `specs/` falls through to `doc`. The grouped output is therefore misleading — read the paths, not the category headers. Do **not** fix this here; `scripts/check-spec-version.mjs` carries unrelated staged work (see *Coordination notes*).

## Scope

### In Scope

Grouped by delivery slice (see *Review Workload Forecast*).

**A — L1 status flip (1 line)**

- `specs/iNNfo_V_0-2-0_NN.md` `status:` moves off `"Draft"`. **The target value is an open sub-decision — see O1; it is not `"Active"` as originally framed.**

**B — Four new L2 template files (~1,330 added lines, verbatim copies)**

Each is a byte-for-byte copy of its `_V_0-1-0_` sibling with exactly five frontmatter edits (`spec_version`, `spec_url`, `parent_spec.name`, `parent_spec.url`, `template_version`). No body change — the V_0-2-0 L1 breaking change (frontmatter `concepts:`/`markers:`/`matrices:` blocks removed in favour of body elements) was already absorbed in the V_0-1-0 era; every current template body uses the `# NN Concept Definition` form.

| New file | Copied from | Lines |
|---|---|---|
| `specs/templates/blank/blank_V_0-2-0_NN.md` | `blank_V_0-1-0_NN.md` | 159 |
| `specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` | `cogNNitive_V_0-1-0_NN.md` | 324 |
| `specs/templates/innovation/innovation_V_0-2-0_NN.md` | `innovation_V_0-1-0_NN.md` | 471 |
| `specs/templates/procedures/procedures_V_0-2-0_NN.md` | `procedures_V_0-1-0_NN.md` | 376 |

The old `_V_0-1-0_` files stay frozen and are **not** edited (R-SV-02).

**C — Two new shipped samples (~541 added lines)**

New V_0-2-0 samples **only** where B adds a template file *and* a V_0-1-0 sample already exists to copy:

| New sample | Copied from | Lines |
|---|---|---|
| `specs/templates/innovation/samples/DeLoreanTimeTravel_V_0-2-0_innovation_NN.md` | `DeLoreanTimeTravel_V_0-1-0_innovation_NN.md` | 282 |
| `specs/templates/procedures/samples/CodeReviewProcess_V_0-2-0_procedures_NN.md` | `CodeReviewProcess_V_0-1-0_procedures_NN.md` | 259 |

No new sample for `blank` or `cogNNitive` (neither has an existing sample to copy), nor for `analysis` (its `StartupValidation_V_0-1-0` sample is already correct) or `business-model` (an intermediate composite, exercised transitively by `Ghostbusters_V_0-2-0_business_NN.md`).

**D — Source constants and their test expectations**

- `apps/innfo-editor/src/utils/constants.ts:13` — `DEFAULT_INNFO_VERSION` → `'V_0-2-0'`.
- `apps/innfo-editor/src/utils/constants.ts:19` — `DEFAULT_TEMPLATE_VERSION` → `'V_0-2-0'`. Stays a **scalar**, not a map: it is the scaffolding fallback consumed by `buildTemplateUrl`'s default arg, `Header.vue` and `useModelFrontmatter.ts`, never a per-template registry.
- `apps/innfo-editor/src/config/samples.ts:31-36` — `SHIPPED_TEMPLATE_VERSIONS` updated to the real per-template mix. Values are `template_version`, **not** `spec_version`; `analysis` and `business-model` therefore stay at `V_0-1-0` there even though they are V_0-2-0-L1-compliant.
- Audit (not blanket-rewrite) the 22 `source`-category files carrying a `V_0-1-0` literal. Each hit is either a legitimate historical reference or a "V_0-1-0 is current" assumption; only the latter changes. Files: `packages/innfo-core/src/{helpers,schema,types,parser/sections,parser/serializer,validator/content,validator/model}.ts`; `packages/innfo-mcp/src/{server.ts,tools/spec.ts,tools/mutate.ts,tools/list-read.ts,tools/resolver-node.ts}`; `apps/innfo-editor/src/{utils/constants.ts,utils/version.ts,config/samples.ts,composables/useTemplateVersionNotice.ts,composables/useWorkspaceScaffolding.ts,services/SpecResolverService.ts,components/layout/SetupWizard.vue,components/editor/FilePreviewModal.vue,views/HomeView.vue,views/StandaloneProcedureView.vue}`.
  - `apps/innfo-editor/src/utils/version.ts` (3 hits) was **not** in the exploration's list. Its hits are doc-comment examples (`spec V_0-1-0 §8`, `e.g. V_0-1-0`) — the §-reference is a real staleness, the `e.g.` is not.
- Expectation churn in the ~28 `test`-category files carrying `V_0-1-0` (list in *Affected Areas*). Under `strict_tdd`, every one of these code edits is test-first.
- `packages/innfo-mcp/bin/innfo-mcp.bundle.js` regenerated **only if** MCP/core source actually changes. The engine is already V_0-2-0-aware, so this may end up a no-op.

**E — Docs and CHANGELOG**

- `docs/documentation/specifications.md` — three tables + **delete the "In flight" blockquote (lines 99-104)**. See *Coordination notes*: this file is also staged by the orchestrator.
- `docs/documentation/{usage,relationships,innfo-editor}.md`, `docs/repair-guide.md`, `docs/changesets/{innfo-repo,format-repo}.md` — version-string refresh where the text asserts "current".
- `CHANGELOG.md` "Unreleased (2026-09-01)" — complete it: add the `model` type-enum addition to both `Concept Definition` and `Field Definition` (already shipped in `packages/innfo-core/src/types.ts`, currently undocumented), the template decomposition, and the adoption itself. Correct the `cogNNitive` deletion claim at line 31.
- `apps/innfo-editor/src/ai-guide/procedure_NN.md` (5 hits) — audit.

**F — Cross-repo: `actioNN` (separate git repo, separate PR)**

- **Sync** `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` from the canonical `iNNfo/specs/templates/workspace_spec_NN.md` (a straight file copy replacing ~55 lines of invalid legacy syntax with 196 lines of valid V_0-2-0).
- `actioNN/skills/nn-innfo/SKILL.md` — the §2 canonical-URL block (lines 237-240) and the "iNNfo V_0-1-0 specification" prose (lines 19, 33, 38, 204, 539) genuinely assert V_0-1-0 is current. Its frontmatter `version: "V_0-1-0"` (line 3) is the **skill's own** version and must NOT be touched.
- `actioNN/skills/nn-router/SKILL.md` lines 61-62 restate the same claim about `nn-innfo`/`nn-trannsform`.

### Out of Scope

- **The `business` → `business-model` + `analysis` decomposition itself**, its concept renames (`Persons`→`Person`, `Positions`→`Position`, `Milestones`→`Milestone`, stakeholder `Roles`→`Stakeholder roles`), and the `Analysis`/`Validation` move. Done, accepted, and locked by ~22 existing tests. Not re-opened, not redesigned, not reverted.
- **Renaming `specs/templates/workspace_spec_NN.md` to a versioned filename.** Its unversioned filename is a real R-SV-02 violation, but the `workspace-taxonomy-and-submodels` change owns that file's full redesign. Deferred there. This change syncs the `actioNN` copy of the file **as-is**; it does not rename it.
- **`eNNvironment/docs/use/manifest.md` pin bumps.** The manifest pins `workspace_spec_NN` and `projects` by `path` + `version` + `commit` (`d60a7109…`). Bumping requires a merge sha that does not exist yet. Explicit **post-merge coordinated step**, documented in *Rollout*, not implemented here.
- **`docs/cdn/innfo-mcp-v0.2.0.bundle.js` / `-v0.2.1.bundle.js`.** Frozen published CDN snapshots. Never regenerated by this change.
- **`actioNN/skills/nn-trannsform/**` and `nn-preflight`/`nn-site-generator`.** `nn-trannsform`'s `V_0-1-0` hits are mostly the still-valid template filename `procedures_V_0-1-0_NN.md`; `nn-preflight:4` and `nn-site-generator:7` are the skills' own `version:` fields. Separate skill lifecycles. Flagged, not touched.
- Any schema rework of the four bumped templates. Their V_0-2-0 files are content-identical copies.
- Fixing `check-spec-version.mjs`'s stale `classifyFile` categorisation (see *Coordination notes*).

### Target Packages and Apps Affected

| Package / app / repo | Nature of impact |
|---|---|
| `specs/` (iNNfo repo, not a workspace package) | 1 status line + 4 new template files + 2 new samples |
| `apps/innfo-editor` | Two constants, `SHIPPED_TEMPLATE_VERSIONS`, ~10 source audits, ~9 test files, ai-guide doc |
| `packages/innfo-core` | Audit only — comment/default `V_0-1-0` literals in 7 source files; ~11 test files may need expectation updates |
| `packages/innfo-mcp` | Audit only — 5 source files; ~7 test/spec files; `bin/innfo-mcp.bundle.js` regen **only if** source changes |
| `docs/` + `CHANGELOG.md` | Prose, three tables, "In flight" blockquote removal, Unreleased entry completion |
| **`cogNNitive/actioNN`** (separate repo) | 1 bundled template file replaced, 2 skill docs updated — **separate PR** |
| **`cogNNitive/eNNvironment`** (separate repo) | Manifest pin bump — **post-merge follow-up, not this change** |

## Approach

Treat V_0-2-0 adoption as a **completion of a migration already in progress**, not a new migration. The single mechanical rule from `nn-dev-spec-version-propagator` still holds — a spec bump always creates a new file and never edits a published one — so the entire change decomposes into "create the missing new files, then flip the one constant that says which L1 is current, then make every human-readable surface agree."

| Decision | Rationale |
|---|---|
| Give `blank`/`cogNNitive`/`innovation`/`procedures` a new `_V_0-2-0_` file rather than editing their `_V_0-1-0_` frontmatter in place | Those files are published and referenced by `DEFAULT_TEMPLATE_VERSION` and by existing models. In-place edit = R-SV-02 violation. `docs/documentation/specifications.md` step 6 is explicit: templates that only exist at the old version must get a new-version file before the L1 can be made the default |
| Set `template_version: V_0-2-0` in each new file | R-SV-03: `template_version` changes when and only when the filename changes. Creating `blank_V_0-2-0_NN.md` **is** a filename change |
| Keep `analysis` / `business-model` at their `_V_0-1-0_` filenames with `spec_version: V_0-2-0` | R-SV-03 makes `spec_version` (L1-compliance level) explicitly independent of `template_version` (template identity). A first-revision, V_0-2-0-compliant template legitimately reads `spec_version: V_0-2-0` + `template_version: V_0-1-0` + `_V_0-1-0_` filename. **Conditional on A1 below** |
| Keep `DEFAULT_TEMPLATE_VERSION` scalar; do not turn it into a map | The per-template registry already exists as `SHIPPED_TEMPLATE_VERSIONS` (`config/samples.ts`, consumed by `useTemplateVersionNotice.ts`). Making the scaffolding fallback a second registry recreates the dual-source-of-truth `spec-version-simplification` just removed |
| New samples only where a template file is added **and** a V_0-1-0 sample exists to copy | A shipped sample is an L3 model pinned to a template version; one authored against `X_V_0-1-0` stays valid forever. New samples exist to *demonstrate a new template file*, not to satisfy symmetry. Yields exactly 2, not 4 |
| Bump `cogNNitive` for completeness rather than dropping it (locked) | Consistency of the `specifications.md` template table beats orphan-pruning. Dropping it would be scope creep into R-SV-06 and would contradict a table this change is already rewriting |
| Define a **reasoned-green** allow-list instead of chasing literal zero on `--check` | `--check` exits 1 on any match (`check-spec-version.mjs:539-541`). Frozen `_V_0-1-0_` spec/template/sample files match the string forever. Literal green is structurally impossible; the gate must be an allow-list review |
| Sync the `actioNN` bundled `workspace_spec_NN.md` but do not rename it | The bundled copy is invalid syntax today (`spec_version: V_1-0-0`, pre-`NN` grammar) — a correctness fix, independent of the deferred rename. Copying the canonical file forward is strictly better than leaving invalid content bundled |
| Ship `actioNN` as its own PR in its own repo | `actioNN`, `iNNfo` and `eNNvironment` are three separate git repositories (`.git` in each). A cross-repo change cannot be one PR, and the `actioNN` URLs must resolve against `iNNfo` `main` — so it lands **after** the template files merge |

## The Frozen-File Allow-List

This is the change's definition of "reasoned-green" for `node scripts/check-spec-version.mjs --version V_0-1-0 --by-type --with-skills`. A file on this list may keep referencing `V_0-1-0` **forever**; anything *not* on it that still references `V_0-1-0` after this change must be justified in the verify report or fixed.

| # | Allowed residual | Files | Why it is legitimate |
|---|---|---|---|
| 1 | Immutable L0 spec | `specs/defiNNe_V_0-1-0_NN.md` (24 hits) | L0 is unchanged and remains the `parent:` of **both** L1 versions |
| 2 | Frozen L1 spec | `specs/iNNfo_V_0-1-0_NN.md` (11) | Immutable; models authored against it must keep resolving (R-LSR-02) |
| 3 | New L1's own back-references | `specs/iNNfo_V_0-2-0_NN.md` (4) | 2 × `parent:` → `defiNNe_V_0-1-0_NN.md` (lines 5, 307); line 543 is a prose bump example; line 914 restates the parent. All correct |
| 4 | The 7 frozen `_V_0-1-0_` template files | `blank`(13), `cogNNitive`(13), `innovation`(7), `procedures`(12), `business`(12), `organization`(8), `projects`(7) | Published and immutable; still referenced by existing L3 models |
| 5 | The 6 V_0-1-0 shipped samples | `Ghostbusters_V_0-1-0_business`(3), `EngineeringTeam_V_0-1-0_organization`(3), `SoftwareReleaseProject_V_0-1-0_projects`(3), `CodeReviewProcess_V_0-1-0_procedures`(3), `DeLoreanTimeTravel_V_0-1-0_innovation`(3), `StartupValidation_V_0-1-0_analysis`(3) | Each is an L3 model correctly pinned to the template version it was authored against |
| 6 | `analysis` / `business-model` first-revision files | `analysis_V_0-1-0_NN.md`(5), `business-model_V_0-1-0_NN.md`(4) | R-SV-03 independence of `spec_version` and `template_version`. **Conditional on A1** |
| 7 | `business_V_0-2-0`'s `includes` URLs | `specs/templates/business/business_V_0-2-0_NN.md`(3) | Lines 12/14 point at the `_V_0-1-0_` filenames of `business-model`/`analysis` — correct while #6 holds. Line 225 is prose history |
| 8 | Legacy FOLDER-mode fixture | `apps/innfo-editor/tests/fixtures/models/FORMAT_V_0-1-0_business_F.md`(2) | Exists to test backward parsing of the legacy `_F.md` shape |
| 9 | CHANGELOG history | `CHANGELOG.md` — **historical sections only** | Released-version history is immutable. The `Unreleased (2026-09-01)` section is explicitly **in scope** |
| 10 | Archived OpenSpec changes | `openspec/changes/archive/**` (32 files) | Excluded by the script by default (`check-spec-version.mjs:38, 65`) |
| 11 | Non-iNNfo `version:` false positives | `actioNN/skills/nn-preflight/SKILL.md:4`, `nn-site-generator/SKILL.md:7`, `nn-innfo/SKILL.md:3` | These are each **skill's own** version field, coincidentally formatted `V_x-y-z`. Not an iNNfo spec reference |
| 12 | `procedures_V_0-1-0_NN.md` filename citations | `actioNN/skills/nn-trannsform/{SKILL,README,TESTING}.md` | Citing a real, still-valid template filename, not asserting a current L1 |
| 13 | Illustrative-only OpenSpec living specs | Subset of `openspec/specs/{spec-versioning,spec-resolution,organization-template,opencode-innfo-agent,guide-prompts}/spec.md` (13 hits total) | Most cite `V_0-1-0` only as a worked example inside a requirement. **Audit file-by-file in `sdd-spec`**; the default is "leave" |
| 14 | Test files asserting backward compatibility | Subset of the 28 `test`-category files | A `V_0-1-0` literal in a test is legitimate unless the assertion is about the *current default*. Audit per file; do not blanket-rewrite |
| 15 | New `cogNNitive_V_0-2-0_NN.md` illustrative L3 examples | `specs/templates/cogNNitive/cogNNitive_V_0-2-0_NN.md` (6 hits, ~lines 108/148/309/311/318/319) | The new V_0-2-0 file keeps 6 `V_0-1-0` strings that are **illustrative `model_version` / `artifact_version` values inside example L3 snippets**, not references to the iNNfo L1 spec or to this template's own identity (which is correctly `V_0-2-0` in FM + parent-chain examples). Copied verbatim from the frozen `cogNNitive_V_0-1-0_NN.md` body |

**Consequence for CI:** `--version V_0-1-0 --check` must **not** be wired as a blocking CI gate — it can never exit 0. The runnable gates remain `check:spec-urls` (which must be literally green, including `--with-skills`) and a human review of `--by-type --with-skills` against this table.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `specs/iNNfo_V_0-2-0_NN.md` | Modified | `status:` (1 line) |
| `specs/templates/{blank,cogNNitive,innovation,procedures}/*_V_0-2-0_NN.md` | Added | 4 files, 1,330 lines, verbatim copies + 5 FM lines each |
| `specs/templates/{innovation,procedures}/samples/*_V_0-2-0_*_NN.md` | Added | 2 files, 541 lines, copy + `parent_spec` re-point |
| `apps/innfo-editor/src/utils/constants.ts` | Modified | `DEFAULT_INNFO_VERSION`, `DEFAULT_TEMPLATE_VERSION` |
| `apps/innfo-editor/src/config/samples.ts` | Modified | `SHIPPED_TEMPLATE_VERSIONS` + sample URL list |
| `apps/innfo-editor/src/{utils/version,composables/useTemplateVersionNotice,composables/useWorkspaceScaffolding,services/SpecResolverService}.ts`, `src/{views/HomeView,views/StandaloneProcedureView,components/layout/SetupWizard,components/editor/FilePreviewModal}.vue` | Audited / targeted | "Current version" assumptions only |
| `packages/innfo-core/src/{helpers,schema,types,parser/sections,parser/serializer,validator/content,validator/model}.ts` | Audited | 1 hit each; mostly comments/defaults |
| `packages/innfo-mcp/src/{server,tools/spec,tools/mutate,tools/list-read,tools/resolver-node}.ts` | Audited | 1-4 hits each |
| `packages/innfo-mcp/bin/innfo-mcp.bundle.js` | Conditionally regenerated | Only if MCP/core source actually changes |
| Tests (28 files) — `packages/innfo-core/tests/{metaplantilla-specs(23),metaschema-selfdescribe(15),workspace-taxonomy-submodels(12),includes-composition(8),business-decomposition-v2(7),workspace-spec-c(5),unified-syntax(3),helpers(2),index(1),organization-v2(1)}.test.ts`, `packages/innfo-core/{test/validator.test.ts(3),src/resolver.spec.ts(6)}`, `packages/innfo-mcp/{src/tools/mutate.spec(20),src/server.spec(11),src/tools/spec.spec(9),src/tools/resolver-node.spec(3)}.ts`, `packages/innfo-mcp/test/{defects-d1-d9-regression(15),includes-and-scaffold(5),mutate-repair(2)}.test.ts`, `apps/innfo-editor/tests/{component/LeftSidebar-template-taxonomy(19),unit/useTemplateVersionNotice(13),component/ModelInfoPanel-templateBadge(6),component/ValidationReport(1),component/ModelInfoPanel-version(1),unit/version(1),golden/recursiveParser.models.golden(1),golden/crlf-fidelity.golden(1)}.test.ts`, `apps/innfo-editor/e2e/11-color-propagation.spec.ts(4)` | Audited / expectation churn | Strict-TDD: failing test first for every source edit |
| `apps/innfo-editor/tests/golden/__snapshots__/recursiveParser.models.golden.test.ts.snap` | Should not change | 266 `V_0-1-0` hits, **invisible to the version checker**. Regenerates only if a fixture model re-points its parent. Keep fixtures V_0-1-0-pinned; review any regen line-by-line, never blind `-u` |
| `docs/documentation/specifications.md` | Modified | 3 tables + delete "In flight" blockquote (L99-104). **Staged — see Coordination notes** |
| `docs/documentation/{usage,relationships,innfo-editor}.md`, `docs/repair-guide.md`, `docs/changesets/{innfo-repo,format-repo}.md`, `CHANGELOG.md` | Modified | Prose + Unreleased entry completion |
| `apps/innfo-editor/src/ai-guide/procedure_NN.md` | Audited | 5 hits |
| `openspec/specs/{spec-versioning,spec-resolution,organization-template,opencode-innfo-agent,guide-prompts}/spec.md` | Audited | 13 hits total; most are examples — likely leave |
| **`actioNN/skills/nn-innfo/templates/workspace_spec_NN.md`** | Replaced | Invalid legacy syntax → canonical V_0-2-0 copy (~250 changed lines) |
| **`actioNN/skills/nn-innfo/SKILL.md`, `nn-router/SKILL.md`** | Modified | §2 canonical URLs + "V_0-1-0 specification" prose |
| **`eNNvironment/docs/use/manifest.md`** | **Not changed here** | Post-merge follow-up (needs a merge sha) |

## Locked Decisions (user-confirmed, do not re-open)

| ID | Decision |
|---|---|
| **L1** | The `business` → `business-model` + `analysis` decomposition and its concept renames are **done and load-bearing**. This change is adoption housekeeping on top. The ~22 existing V_0-2-0 tests are the contract |
| **L2** | `specs/templates/workspace_spec_NN.md` is **not renamed** here — deferred to `workspace-taxonomy-and-submodels`, which owns that file's redesign. The `actioNN` bundled copy **is** synced from canonical |
| **L3** | `cogNNitive` gets a `cogNNitive_V_0-2-0_NN.md` like the other bump-only templates. It is not dropped |
| **L4** | `iNNfo_V_0-2-0_NN.md` `status` flips off `"Draft"`. **The target value and the `defiNNe` treatment are re-framed by finding A2 — see O1** |

## Carried Assumptions (design phase may adjust)

**A1 — `analysis` and `business-model` are branch-new and were never published.** If true, their `spec_version: V_0-2-0` + `_V_0-1-0_` filename is valid under R-SV-03 and requires no change; if false, each needs a real `*_V_0-2-0_NN.md` file and its `_V_0-1-0_` file frozen.

> ⚠️ **NOT VERIFIED.** `git log --follow` could not be run — this phase had no shell. The mandated verification is:
> ```
> git log --follow --oneline -- specs/templates/analysis/analysis_V_0-1-0_NN.md
> git log --follow --oneline -- specs/templates/business-model/business-model_V_0-1-0_NN.md
> ```
> **This is a hard gate at the start of `sdd-apply`.** If either file predates `feat/business-template-decomposition`, **escalate** — allow-list rows 6 and 7 collapse and two more `_V_0-2-0_` template files enter scope.
>
> Circumstantial evidence supporting A1 (strong but not conclusive): neither directory appears in the archived `2026-08-19-spec-version-simplification` target layout; neither is mentioned anywhere in `CHANGELOG.md`; `business-model_V_0-1-0_NN.md` is 3,853 lines against `business_V_0-1-0_NN.md`'s 4,604, consistent with being carved out of the monolith; and `docs/documentation/specifications.md:102` groups them with templates that "do not yet" have V_0-2-0 variants.

**A2 — `defiNNe` already declares a `status` vocabulary, and it is not the one assumed.** See O1. This is a **verified finding that re-frames L4**, not an assumption.

**A3 — New V_0-2-0 shipped samples for `innovation` and `procedures` only.** `blank` and `cogNNitive` have no existing sample to copy; `analysis` and `business-model` need none.

**A4 — `docs/cdn/innfo-mcp-*.bundle.js` are frozen published CDN snapshots**, never regenerated by a source change. Only `packages/innfo-mcp/bin/innfo-mcp.bundle.js` is regenerated, and only if MCP/core source actually changes — which it may not, since the engine is already V_0-2-0-aware.

**A5 — `eNNvironment/docs/use/manifest.md` is a post-merge coordinated step**, not implemented here.

## Open Sub-Decisions for Design

### O1 — `iNNfo_V_0-2-0` `status` value (⚠️ re-frames locked decision L4)

**Finding.** `specs/defiNNe_V_0-1-0_NN.md:145` **already declares a status vocabulary**: `status: "Draft | Stable | Deprecated"`. The task brief assumed no vocabulary existed and proposed adding `Draft` / `Active` / `Superseded`. Two consequences:

1. **`"Active"` is not a valid value.** The L0-declared vocabulary is `Draft | Stable | Deprecated`. Writing `status: "Active"` would put the adopted L1 spec **outside** its own L0 vocabulary — the exact class of inconsistency this change exists to remove.
2. **A second, deeper inconsistency surfaces.** `defiNNe` declares `status` **only** in the *Level 0* frontmatter shape (lines 137-147). The *Level 1* shape (lines 153-161) declares **no `status` field at all** — yet both `iNNfo_V_0-1-0_NN.md:9` and `iNNfo_V_0-2-0_NN.md:9` carry `status: "Draft"`. `status` at L1 is currently an undeclared extra field.

**Revised options:**

| | Option | Cost | Effect |
|---|---|---|---|
| **(a)** | Bump `defiNNe` to `V_0-1-1` to add `Active`/`Superseded` and sanction `status` at L1 | New L0 file + re-point both L1 files' `parent:` + `nn-dev-spec-version-propagator`'s L0 procedure + doc churn | Fully correct, but drags a whole L0 bump into an adoption change |
| **(b)** | Set `status: "Stable"`; document the vocabulary in `docs/documentation/specifications.md` + `CHANGELOG.md` only | ~10 doc lines, zero spec-file churn | Uses the **existing** L0 vocabulary. `status`-at-L1 stays formally undeclared but no worse than today |
| **(c)** | Leave `status: "Draft"`; rely solely on `DEFAULT_INNFO_VERSION` | Zero | Rejected — "the adopted spec still says Draft" is exactly the latent confusion this change removes |

**Recommendation: (b), with `"Stable"` — not `"Active"`.** It satisfies L4's intent (the adopted L1 no longer says `Draft`), costs ~10 doc lines, keeps the change bounded, and does **not** invent vocabulary that contradicts L0. The `status`-at-L1 declaration gap is real but pre-existing; log it as a follow-up for the next `defiNNe` bump rather than forcing one now. **The design phase makes the final call; `"Active"` should not be chosen without also taking option (a).**

### O2 — Does any golden snapshot legitimately regenerate?

`recursiveParser.models.golden.test.ts.snap` carries 266 `V_0-1-0` hits and is invisible to the version checker. It regenerates **only** if a fixture model re-points its resolved parent. Default position: keep every fixture V_0-1-0-pinned, expect a zero-line snapshot diff, and treat any diff as a signal to re-examine — never as something to absorb with `-u`. Design must state, per fixture, whether its intent is "a V_0-1-0 model" (pin) or "the current default" (re-point).

### O3 — Which `test`-category files carry a "current default" assertion?

28 test files reference `V_0-1-0`; most are backward-compat coverage that must stay. `sdd-spec` must produce the per-file verdict (keep / update) before `sdd-tasks` estimates. Highest-suspicion files by hit count: `apps/innfo-editor/tests/component/LeftSidebar-template-taxonomy.test.ts` (19), `tests/unit/useTemplateVersionNotice.test.ts` (13), `packages/innfo-mcp/src/tools/mutate.spec.ts` (20), `packages/innfo-mcp/src/server.spec.ts` (11).

### O4 — `SHIPPED_TEMPLATE_VERSIONS` membership

The map today has 4 entries. After this change 8 templates exist with a `template_version`. Design decides whether the map covers all 8 (including `analysis`/`business-model` at `V_0-1-0` and `blank`/`cogNNitive` at `V_0-2-0`) or stays scoped to templates with shipped samples. The consumer is `useTemplateVersionNotice.ts`'s staleness badge; adding an entry for a template with no sample is harmless but must not change badge behaviour for existing models.

## Proposal Question Round

This phase had no direct user channel. These are the product questions that would sharpen the proposal; the assumptions above are the current working answers.

1. **O1 is the one that matters.** Given `defiNNe` already says `Draft | Stable | Deprecated`, is `"Stable"` acceptable in place of the originally-requested `"Active"` — or is the `Active`/`Superseded` vocabulary a deliberate product choice worth a `defiNNe_V_0-1-1` bump?
2. Should the `status`-at-L1 declaration gap (defiNNe sanctions `status` only at L0) be filed as its own follow-up change, or is it acceptable to leave undocumented indefinitely?
3. `blank` and `cogNNitive` will have a V_0-2-0 template file but **no** shipped sample at any version. Is that acceptable in the `specifications.md` template table, or should this change author two new samples from scratch (~200 lines of new authored content, not a copy)?
4. `nn-trannsform` is excluded, but it instructs agents to author models with `spec_version: "V_0-1-0"` (`SKILL.md:206`) — after this change that is stale user-facing guidance in a sibling repo. In scope for the `actioNN` PR, or a separate ticket?
5. Is a 3-PR chain acceptable given the 400-line budget, or is a single `size:exception` PR preferred on the grounds that ~78% of the diff is verbatim file copies?

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **A1 is false** — `analysis` or `business-model` was published before this branch | Low | Hard-gated by `git log --follow` at the start of `sdd-apply`. If false: two more `_V_0-2-0_` template files enter scope and allow-list rows 6-7 collapse. **Escalate, do not absorb silently** |
| `"Active"` is chosen for O1 without a `defiNNe` bump, putting the adopted L1 outside its own L0 vocabulary | Med | O1 documents the conflict explicitly and recommends `"Stable"`. Design must record the decision and rationale |
| Golden snapshot regenerates unexpectedly (266 hits, invisible to the checker) | Med | Keep fixtures V_0-1-0-pinned. Review any snapshot diff line-by-line. Never run with `-u` |
| Parent-chain resolution breaks for L3 models pinned to `iNNfo_V_0-1-0` templates | Low | Old spec/template files stay frozen; `spec-resolution` R-LSR-02 resolves each model against the exact version it was authored against. Verified by running the golden + MCP suites after the constant flip |
| `strict_tdd` friction — the bulk of the change is markdown (not TDD-gated), but the constant flip and `SHIPPED_TEMPLATE_VERSIONS` update are, with churn across ~28 test files | High | Slice B/C (markdown) ships first and independently. Slice D is TDD-gated and reviewed on its own |
| `docs/documentation/specifications.md` clobber — the file is simultaneously staged orchestrator tooling work and required editing by this change | **High** | See *Coordination notes*. Nothing in this phase edited it. `sdd-apply` must rebase onto the staged version, never overwrite it |
| CI wires `--version V_0-1-0 --check` as a blocking gate and it can never pass | Med | Explicitly documented: `--check` for V_0-1-0 is structurally red. The runnable gate is `check:spec-urls`; the residual scan is a reviewed allow-list |
| `--check-urls` breaks because a new `spec_url`/`parent_spec.url` in a new template file points at a path that does not yet exist on `main` | Med | The URLs are self-consistent within the PR (`check-spec-version.mjs:231` resolves against the **local** tree, not the network), so in-repo it is green immediately. The **`actioNN` PR** is the real exposure — it must merge *after* the iNNfo template files reach `main` |
| Cross-repo ordering — `actioNN` and `eNNvironment` are separate repos with independent merge queues | Med | Explicit ordering in *Rollout*. `eNNvironment` is deferred entirely (needs a merge sha) |
| CHANGELOG line 31's `cogNNitive`-was-deleted claim vs. L3's bump-it decision | Low | Correct the CHANGELOG line as part of slice E |
| `packages/innfo-mcp/bin/innfo-mcp.bundle.js` churns for a no-op source change, adding hundreds of unreviewable lines to the diff | Med | Regenerate **only** if MCP/core source actually changes. If the audit finds only comment edits, do not regenerate |
| Overlap with `workspace-taxonomy-and-submodels` | Low | L2 defers the rename to that change. Its stale exploration should be refreshed to note `type:: model` is already shipped in `packages/innfo-core/src/types.ts` and in `iNNfo_V_0-2-0` |
| Overlap with `graph-view-relationship-types` (active) | Low | It is explicitly bounded to V_0-1-0 and touches no spec/template file. At worst a trivial rebase on doc references |

## Review Workload Forecast

**Estimated changed lines: ~2,400 (iNNfo ~2,150 + actioNN ~250).**

| Slice | Content | Est. lines | Reviewable delta |
|---|---|---|---|
| **B + C** | 4 template files + 2 samples | ~1,870 added | **~30** — 5 FM lines × 6 files; the rest is verbatim copy |
| **A + D** | Status flip, 2 constants, `SHIPPED_TEMPLATE_VERSIONS`, source audits, test churn | ~250 | ~250 — all genuine |
| **E** | Docs + CHANGELOG | ~150 | ~150 |
| **F** | `actioNN` template sync + 2 skill docs | ~250 | ~30 (the template body is a canonical copy) |

- **Chained PRs recommended: Yes**
- **400-line budget risk: High** (raw), **Low-Medium** (reviewable delta — ~78% of the diff is verbatim file copies)
- **Decision needed before apply: Yes**

**Recommended boundary — 3 PRs in `iNNfo` + 1 PR in `actioNN`**, in this order (each ordering constraint is a real dependency, not a preference):

1. **PR 1 — templates + samples** (slices B, C). Pure additions; nothing references them yet, so it is independently mergeable and trivially revertible. ~1,870 lines → **needs `size:exception`**, justified by "verbatim copies, 30-line reviewable delta". *Must land first:* PR 2 flips the constant that makes the app resolve these files.
2. **PR 2 — source + tests** (slices A, D). ~250 lines, strict-TDD, self-contained. This is the PR that actually adopts V_0-2-0.
3. **PR 3 — docs + CHANGELOG** (slice E). ~150 lines. *Must land last:* it asserts the migration is complete. Also the PR that rebases onto the orchestrator's staged `specifications.md`.
4. **PR 4 — `actioNN` repo** (slice F). *Must merge after PR 1 reaches `iNNfo` `main`*, or its canonical URLs will not resolve.

If a single PR is preferred instead, it needs an explicit `size:exception` and should order its commits as *additions → source → docs* so the diff still reads as three reviewable stages.

## Rollout

1. PRs 1 → 2 → 3 in `iNNfo` (order above).
2. PR 4 in `actioNN` after PR 1 is on `iNNfo` `main`.
3. **Post-merge, coordinated, not part of this change:** bump `eNNvironment/docs/use/manifest.md`. It pins `workspace_spec_NN` (`version: "V_1-0-0"`, `path: specs/templates/workspace_spec_NN.md`) and `projects` (`version: "V_0-1-0"`, `path: .../projects_V_0-1-0_NN.md`) by `path` + `version` + `commit` (currently `d60a7109…`). The new commit sha does not exist until this change merges. File as a follow-up ticket at archive time.

## Coordination Notes

The orchestrator has **unrelated staged tooling work** on this branch. This change must **not** modify:

- `package.json`
- `.github/workflows/ci.yml`
- `scripts/check-spec-version.mjs`
- `CONTRIBUTING.md`
- `.agents/skills/nn-dev-spec-version-propagator/SKILL.md`

**`docs/documentation/specifications.md` is the exception and the hazard.** It is *both* staged tooling work *and* a file this change must edit (three tables + the "In flight" blockquote at lines 99-104). Nothing in this phase touched it. `sdd-apply` must read the current on-disk (staged) content immediately before editing and rebase its changes onto it — never overwrite from a stale read.

## Dependencies

- `openspec/changes/complete-innfo-v0-2-0-adoption/exploration.md` — the source investigation. Its blast-radius numbers are corrected in *Verified scan*.
- `openspec/changes/archive/2026-08-19-spec-version-simplification/` — established R-SV-02 (published files are immutable) and R-SV-03 (`spec_version` ⟂ `template_version`). Reference only; that change stays closed.
- `.agents/skills/nn-dev-spec-version-propagator/SKILL.md` — the canonical L1-bump procedure. Read, not modified.
- `workspace-taxonomy-and-submodels` (exploration only, not a committed active change) — owns the deferred `workspace_spec_NN.md` rename (L2).
- No new external packages.

## Success Criteria

- [ ] `git log --follow` confirms A1 for **both** `analysis_V_0-1-0_NN.md` and `business-model_V_0-1-0_NN.md`, or the escalation path is taken
- [ ] Every L2 template resolves at `iNNfo_V_0-2-0`: `blank`, `cogNNitive`, `innovation`, `procedures` have a `_V_0-2-0_NN.md` file; `business`, `business-model`, `analysis`, `organization`, `projects`, `workspace_spec` already do
- [ ] Every new template file's old `_V_0-1-0_` sibling is byte-identical to its pre-change state (no in-place edit — R-SV-02)
- [ ] Each new template file differs from its source by exactly 5 frontmatter lines
- [ ] `specs/iNNfo_V_0-2-0_NN.md` `status` is no longer `"Draft"`, and its value is inside a vocabulary declared by whichever `defiNNe` version it points at (O1)
- [ ] `DEFAULT_INNFO_VERSION === 'V_0-2-0'`; `DEFAULT_TEMPLATE_VERSION === 'V_0-2-0'` and still a scalar
- [ ] `SHIPPED_TEMPLATE_VERSIONS` matches the real `template_version` of every template it lists (O4)
- [ ] `npm run check:spec-urls` and `node scripts/check-spec-version.mjs --check-urls --with-skills` are **literally green**
- [ ] `node scripts/check-spec-version.mjs --version V_0-1-0 --by-type --with-skills` output contains **only** files justified by the frozen-file allow-list; every exception is named in the verify report
- [ ] `apps/innfo-editor/tests/golden/__snapshots__/recursiveParser.models.golden.test.ts.snap` is unchanged, or every changed line is individually justified (O2)
- [ ] `docs/documentation/specifications.md` "In flight" blockquote is gone and its three tables list all V_0-2-0 template files, rebased onto the orchestrator's staged version
- [ ] `CHANGELOG.md` "Unreleased" documents the `includes` dup-name rule, the `model` type-enum addition, the template decomposition, and the V_0-2-0 adoption; the `cogNNitive` deletion claim (line 31) is corrected
- [ ] `actioNN/skills/nn-innfo/templates/workspace_spec_NN.md` is byte-identical to `iNNfo/specs/templates/workspace_spec_NN.md`
- [ ] `actioNN/skills/nn-innfo/SKILL.md` §2 canonical URLs point at V_0-2-0 files; its own frontmatter `version:` field is untouched
- [ ] `eNNvironment` manifest bump is filed as a follow-up ticket with the merge sha
- [ ] None of the five staged orchestrator files appear in any diff
- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format` pass
