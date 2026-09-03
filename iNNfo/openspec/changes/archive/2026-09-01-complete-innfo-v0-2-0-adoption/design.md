# Design: Complete iNNfo V_0-2-0 Adoption

## Technical Approach

No new architecture. The change is a **version-identity propagation** across four existing boundaries, in dependency order: `specs/` artifacts (L1 status + L2 template files) → `apps/innfo-editor` constants/registries → docs → the `actioNN` bundled copy. No package is added, no ESM export surface changes, no build config changes, no `packages/innfo-core` or `packages/innfo-mcp` behaviour changes (the engine is already V_0-2-0-aware).

The one non-mechanical piece is a **rewrite rule** for the copied template files (D2), because the proposal's "exactly 5 frontmatter lines" premise is wrong — verified below.

## Architecture Decisions

### D1 — `status` values (O1)

| | Choice | Rejected |
|---|---|---|
| `specs/iNNfo_V_0-2-0_NN.md:9` | `status: "Stable"` | `"Active"` — outside the L0-declared vocabulary (`defiNNe_V_0-1-0_NN.md:145` = `Draft \| Stable \| Deprecated`). Picking it would require a `defiNNe_V_0-1-1` bump, dragging an L0 migration into an adoption change |
| `specs/iNNfo_V_0-1-0_NN.md:9` | `status: "Deprecated"` | Leaving `"Draft"` — the vocabulary exists precisely to mark a superseded spec; leaving both files identical keeps the ambiguity this change removes |

**Legality of the in-place edit.** Verified: `status` is inert. `packages/innfo-core/src/types.ts:96` declares `status?: string` with no enum, no validator, no consumer anywhere in core/mcp/editor; `scripts/check-spec-version.mjs` never reads it. R-SV-02 immutability protects *resolution semantics* — what a model pinned to `iNNfo_V_0-1-0_NN.md` parses into. `status` changes none of that. Treat it as mutable lifecycle metadata, not versioned content. Call this out in the PR body so a reviewer does not read it as an R-SV-02 breach.

**Pre-existing tech debt, out of scope**: `defiNNe` declares `status` only in the *Level 0* frontmatter shape (lines 137-147); the *Level 1* shape (153-161) declares no `status`. Both L1 files carry it today. It parses (free-form passthrough) but is formally undeclared. File as a follow-up for the next `defiNNe` bump.

### D2 — Template copy rewrite rule (O2) — **corrects the proposal**

The proposal claims each new template differs by 5 frontmatter lines. **False.** `blank_V_0-1-0_NN.md` and `procedures_V_0-1-0_NN.md` carry in-body "Parent Chain" / "Models targeting this template" YAML examples that name `iNNfo_V_0-1-0` and their own `_V_0-1-0` identity. The already-shipped `business_V_0-2-0_NN.md:229-246` proves the established convention re-points those body blocks too.

**Rule R1** — in the copy, rewrite a `V_0-1-0` occurrence **iff** it denotes (a) this file's own identity, (b) the L1 parent `iNNfo_V_0-1-0`, or (c) a sibling artifact this change also creates at V_0-2-0. Leave every occurrence denoting a third-party artifact that stays at V_0-1-0.

| New file | Lines changed | Exact lines (source numbering) | Residual `V_0-1-0` |
|---|---|---|---|
| `blank_V_0-2-0_NN.md` | **13** | FM 2,3,6,7,8; body 68, 110, 111, 126, 139, 140, 147, 148 | 0 |
| `cogNNitive_V_0-2-0_NN.md` | **7** | FM 2,3,6,7,8; body 276, 277 | **6** (lines 108, 148, 309, 311, 318, 319 — illustrative L3 `model_version` / `artifact_version` / example model filenames, not spec pins) |
| `innovation_V_0-2-0_NN.md` | **7** | FM 2,3,6,7,8; body 372, 373 | 0 |
| `procedures_V_0-2-0_NN.md` | **12** | FM 2,3,6,7,8; body 184, 185, 229, 236, 237, 241, 242 | 0 |

Line 229 of `procedures` is rule (c): the canonical-sample path becomes `CodeReviewProcess_V_0-2-0_procedures_NN.md`, which slice C creates.

**Allow-list amendment**: add a row for `cogNNitive_V_0-2-0_NN.md` (6 legitimate residual hits). Without it, the reasoned-green review flags a false positive.

**Samples** follow the shipped pattern (`EngineeringTeam_V_0-2-0_organization_NN.md:4-6`): exactly 3 lines — `parent_spec.name`, `parent_spec.url`, `model_version`.

**Worked example — `blank` frontmatter:**

```yaml
# BEFORE (blank_V_0-1-0_NN.md:1-20)        # AFTER (blank_V_0-2-0_NN.md:1-20)
---                                         ---
spec_version: "V_0-1-0"                     spec_version: "V_0-2-0"
spec_url: ".../templates/blank/blank_V_0-1-0_NN.md"   spec_url: ".../templates/blank/blank_V_0-2-0_NN.md"
level: 2                                    level: 2
parent_spec:                                parent_spec:
  name: "iNNfo_V_0-1-0"                       name: "iNNfo_V_0-2-0"
  url: ".../specs/iNNfo_V_0-1-0_NN.md"        url: ".../specs/iNNfo_V_0-2-0_NN.md"
template_version: "V_0-1-0"                 template_version: "V_0-2-0"
title: "Blank Template"                     title: "Blank Template"
relationship_types: { ...unchanged... }     relationship_types: { ...unchanged... }
---                                         ---
```

(URL prefix elided: `https://raw.githubusercontent.com/cogNNitive/iNNfo/main`. `level`, `title`, `relationship_types` unchanged. Body copied verbatim except the R1 lines in the table above.)

### D3 — Constants and registries (O3)

`apps/innfo-editor/src/utils/constants.ts`:

| Line | Target | Rationale |
|---|---|---|
| 13 | `DEFAULT_INNFO_VERSION = 'V_0-2-0'` | Step 2 of `nn-dev-spec-version-propagator`. Single source of truth for "current L1" |
| 19 | `DEFAULT_TEMPLATE_VERSION = 'V_0-2-0'` | **Stays scalar.** Verified consumers: `buildTemplateUrl` default arg (constants.ts:43), `Header.vue:330,486,493`, `useModelFrontmatter.ts:71,82`. All three want a single scaffolding fallback, never a per-template lookup. It names **no** template — it is the version half of `buildTemplateUrl(name, version)`. Turning it into a map would recreate the dual-source-of-truth `spec-version-simplification` removed; the per-template registry already exists as `SHIPPED_TEMPLATE_VERSIONS`. After slice B every shipped template except `analysis`/`business-model` exists at `V_0-2-0`, so a `V_0-2-0` scalar fallback resolves for every template the scaffolder offers |

`apps/innfo-editor/src/config/samples.ts:31-36` — **target map (all 9 slugs, O4)**:

```ts
export const SHIPPED_TEMPLATE_VERSIONS: Record<string, string> = {
  analysis: 'V_0-1-0',        // spec_version V_0-2-0, template_version V_0-1-0 (R-SV-03)
  blank: 'V_0-2-0',
  business: 'V_0-2-0',
  'business-model': 'V_0-1-0', // same as analysis
  cogNNitive: 'V_0-2-0',
  innovation: 'V_0-2-0',
  organization: 'V_0-2-0',
  procedures: 'V_0-2-0',
  projects: 'V_0-2-0',
}
```

Values are `template_version`, verified against each file's frontmatter line 8. `workspace_spec` is excluded: its filename carries no `_V_x-y-z_` segment, so `parseVersionedFilename` (`useTemplateVersionNotice.ts`) can never match it.

Membership safety (`useTemplateVersionNotice.ts:160-176`): a slug absent from the map contributes nothing to `found`. Adding `analysis`/`business-model` at their real `V_0-1-0` is behaviourally inert (`compareVersions(latest, parsed.version) <= 0` → `notice = null`). Adding `blank`/`cogNNitive`/`innovation` only affects models pinned to those slugs, which the map cannot serve today at all. The **intended** behaviour change is `procedures_V_0-1-0`-pinned models finally getting the staleness badge.

`apps/innfo-editor/src/utils/version.ts` — 3 hits, classified:

| Line | Text | Verdict |
|---|---|---|
| 2 | `(spec V_0-1-0 §8)` | **Stale + wrong.** Verified: neither `iNNfo_V_0-1-0_NN.md` nor `iNNfo_V_0-2-0_NN.md` has numbered sections; both use `## Identity & Naming` (line 273). Replace with `(iNNfo V_0-2-0 — "Identity & Naming")`. Same for the `(§8.1)` at line 8 and `(§8.2 SemVer rules)` at line 95 |
| 6 | `V_MAJOR-MINOR-PATCH   (e.g. V_0-1-0)` | Historical/illustrative — **keep** |
| 34 | ``e.g. `V_0-1-0` `` | Illustrative — **keep** |

**Additional finding not in the proposal**: three source files hardcode `_V_0-1-0_` **sample** URLs for templates that already ship V_0-2-0 samples on disk — `HomeView.vue:62,71,79,176`, `SetupWizard.vue:53,62,70`, `useWorkspaceScaffolding.ts:248,253,258`. `Ghostbusters_V_0-2-0_business_NN.md`, `EngineeringTeam_V_0-2-0_organization_NN.md` and (after slice C) `CodeReviewProcess_V_0-2-0_procedures_NN.md` all exist. These are genuine "current default" assertions and move to `_V_0-2-0_`. Promote them from *audit* to *edit* in slice D.

**Consistency win, no code change**: `extensions/registry.ts:20` already keys `procedures_V_0-2-0`. Slice B makes that exact-match key resolve against a real file instead of relying on the bare `procedures` alias (registry.ts:29).

### D4 — Golden snapshot (O4)

**Recommendation: the snapshot does NOT regenerate. Zero-line diff is the expected outcome.**

Verified mechanics: `recursiveParser.models.golden.test.ts` reads the 7 fixtures in `tests/fixtures/models/`, wraps each in an in-memory `buildFakeTree`, and calls `recursiveParse`. It never imports `DEFAULT_INNFO_VERSION`, `DEFAULT_TEMPLATE_VERSION`, `SHIPPED_TEMPLATE_VERSIONS` or `buildTemplateUrl`, and never resolves a template from disk or network. All 266 `V_0-1-0` hits trace to a single fixture filename, `FORMAT_V_0-1-0_business_F.md`, echoed as `id` / `name` / `parentId` strings (allow-list row 8 — a legacy `_F.md` backward-parsing fixture; its own `model_version: "V_0-1-0"`, `spec_version: "V_0-1-1"`).

**Exact regeneration condition** — the snapshot changes iff **any** of:
1. a file is added to / removed from / renamed in `apps/innfo-editor/tests/fixtures/models/`;
2. a fixture's frontmatter keys change (`fieldKeys` is `Object.keys(n.fields)`) or its `# NN` body structure changes;
3. `recursiveParse`, `buildFakeTree`, or `summarize` changes.

None of 1-3 is in scope. Every fixture's intent is "a model at *its own* pinned version" — **pin all 7, re-point none.** If `apply` or `verify` sees a snapshot diff, the cause is one of the three above and must be root-caused; **never** absorb it with `-u`.

## Data Flow

```
specs/iNNfo_V_0-2-0_NN.md  ──parent_spec.url──→  specs/templates/{name}/{name}_V_0-2-0_NN.md
        ▲ (status: Stable)                                    ▲
        │                                                     │ template_version
constants.ts                                          samples.ts
  DEFAULT_INNFO_VERSION ──→ buildSpecificationUrl()     SHIPPED_TEMPLATE_VERSIONS
  DEFAULT_TEMPLATE_VERSION ──→ buildTemplateUrl(name, v)        │
        │                                                      ▼
        ├──→ Header.vue, useModelFrontmatter.ts        useTemplateVersionNotice.refresh()
        └──→ HomeView / SetupWizard / useWorkspaceScaffolding (sample URLs)   → staleness badge

  [no edge to] packages/innfo-core, packages/innfo-mcp, recursiveParser golden
```

## File Changes

| File | Action | Description |
|---|---|---|
| `specs/iNNfo_V_0-2-0_NN.md` | Modify | L9 `status: "Stable"` |
| `specs/iNNfo_V_0-1-0_NN.md` | Modify | L9 `status: "Deprecated"` (D1) |
| `specs/templates/{blank,cogNNitive,innovation,procedures}/*_V_0-2-0_NN.md` | Create | Copy + R1 rewrite (13 / 7 / 7 / 12 lines) |
| `specs/templates/innovation/samples/DeLoreanTimeTravel_V_0-2-0_innovation_NN.md` | Create | Copy + 3 lines |
| `specs/templates/procedures/samples/CodeReviewProcess_V_0-2-0_procedures_NN.md` | Create | Copy + 3 lines |
| `apps/innfo-editor/src/utils/constants.ts` | Modify | L13, L19 |
| `apps/innfo-editor/src/config/samples.ts` | Modify | 9-entry map (D3) |
| `apps/innfo-editor/src/views/HomeView.vue`, `components/layout/SetupWizard.vue`, `composables/useWorkspaceScaffolding.ts` | Modify | Sample URLs → `_V_0-2-0_` |
| `apps/innfo-editor/src/utils/version.ts` | Modify | Doc comment L2/L8/L95 (comment-only) |
| `apps/innfo-editor/tests/unit/constants.test.ts` | Create | TDD gate for D3 |
| `apps/innfo-editor/tests/unit/shipped-template-versions.test.ts` | Create | Disk-integrity guard for the map |
| `apps/innfo-editor/tests/unit/sample-urls.test.ts` | Create | Starter-sample URL guard |
| `apps/innfo-editor/tests/unit/useTemplateVersionNotice.test.ts` | Modify | Badge-fires case |
| `docs/**`, `CHANGELOG.md` | Modify | Slice E (per proposal) |
| `actioNN/skills/nn-innfo/{templates/workspace_spec_NN.md,SKILL.md}`, `nn-router/SKILL.md` | Modify | Slice F, separate repo |
| golden `.snap` | **No change** | D4 |

## Testing Strategy (O5) — `strict_tdd: true`

**Not TDD-gated** (no executable behaviour): the 6 new markdown files, the two `status:` lines, `version.ts` doc comments, all of slice E, all of slice F. State this in the PR body so verify does not flag missing tests.

**TDD-gated**, red assertion first:

| Source edit | Test file | Failing assertion to write first |
|---|---|---|
| `constants.ts:13` | `tests/unit/constants.test.ts` **(new)** | `expect(DEFAULT_INNFO_VERSION).toBe('V_0-2-0')` and `expect(buildSpecificationUrl()).toMatch(/iNNfo_V_0-2-0_NN\.md$/)` |
| `constants.ts:19` | same file | `expect(DEFAULT_TEMPLATE_VERSION).toBe('V_0-2-0')` and `expect(buildTemplateUrl('procedures')).toMatch(/procedures_V_0-2-0_NN\.md$/)` |
| `samples.ts:31` (behaviour) | `tests/unit/useTemplateVersionNotice.test.ts` | new case: `templateName='procedures_V_0-1-0'`, no `handle` → `expect(notice.value?.latest).toBe('V_0-2-0')` (today: `null`) |
| `samples.ts:31` (integrity) | `tests/unit/shipped-template-versions.test.ts` **(new)** | for each map key, read `specs/templates/{slug}/{slug}_V_*_NN.md` from disk and `expect(map[slug]).toBe(maxTemplateVersionOnDisk)`; assert every on-disk slug with a versioned filename is a map key. **Requires slice B on disk** → PR 2 must stack on PR 1 |
| Sample URLs in 3 files | `tests/unit/sample-urls.test.ts` **(new)** | assert each starter URL matches `_V_0-2-0_` and the referenced path exists under `specs/` |

Regression (run, do not rewrite): `tests/component/LeftSidebar-template-taxonomy.test.ts`, `tests/unit/version.test.ts` (its `V_0-1-0` at L20 is a filename example — **keep**), both golden suites. Gates per `openspec/config.yaml`: `npm run test`, `typecheck`, `lint`, `format`.

### O1 amendment (verify-phase finding — C1: do not mutate the superseded L1 file)

`sdd-verify` flagged that flipping `iNNfo_V_0-1-0_NN.md` `status: "Draft"` → `"Deprecated"` contradicts this change's own delta spec `spec-versioning/spec.md` R-SV-09 scenario 3 (the superseded L1 file stays byte-identical). **Resolution: reverted.** `iNNfo_V_0-1-0_NN.md` is left byte-unchanged. Only `iNNfo_V_0-2-0_NN.md` moves `Draft` → `Stable` — that transition IS sanctioned by R-SV-09 (the adopted version MUST be `"Stable"`) and the file was never released/adopted before this change. The "no longer current" signal for `V_0-1-0` lives in `DEFAULT_INNFO_VERSION`, `specifications.md`, and `CHANGELOG.md`. The `status`-vocabulary-at-L1 gap (defiNNe only declares `status` on the L0 shape) remains pre-existing tech debt for a future `defiNNe` bump.

### O5 amendment (apply-phase finding — fixture staleness from the `business` map change)

O4/O5 above analysed only the map *additions* (`analysis`/`business-model`/`blank`/`cogNNitive`/`innovation`) as inert and named `procedures` as the intended behaviour change. It missed that flipping `business`/`organization`/`projects` from `V_0-1-0` to `V_0-2-0` in `SHIPPED_TEMPLATE_VERSIONS` **is itself a behaviour change** that collides with pre-existing fixtures which encode the pre-adoption world (`business` shipping `V_0-1-0`). Five tests regressed:

- `tests/unit/useTemplateVersionNotice.test.ts` ×2 — "sets notice when the workspace scan finds a newer template version", "leaves notice null when the model already pins the newest known version"
- `tests/component/ModelInfoPanel-templateBadge.test.ts` ×3 — the shared `rootContent` pinned `business_V_0-1-0`

**Resolution (in scope — mechanical fixture maintenance forced by the adoption):** re-point these fixtures from `business` to **`analysis`**, the template that deliberately stays at `V_0-1-0` in the shipped map. This isolates the workspace-scan path (the tests' actual intent) from the now-dominant bundled-map path. `useTemplateVersionNotice.ts` and `ModelInfoPanel.vue` code is unchanged and correct per D3. The new `procedures_V_0-1-0` badge-fires case (row above) stays.

## Migration / Rollout — PR plan (O6)

**Chained PRs: Yes. 400-line budget risk: High (raw) / Low (reviewable). Decision needed before apply: Yes.**

| # | Repo | Slices | Files | Raw lines | Reviewable delta | Exception |
|---|---|---|---|---|---|---|
| **1** | iNNfo | B + C | 4 templates + 2 samples | ~1,871 added | **45** (13+7+7+12+3+3) | **`size:exception` required.** Justification: pure additions, verbatim copies, 45-line semantic delta, nothing references them yet, revert = delete 6 files |
| **2** | iNNfo | A + D | 2 `status:` lines, `constants.ts`, `samples.ts`, 3 sample-URL files, `version.ts`, 3 new + 1 updated test | ~250 | ~250 | No |
| **3** | iNNfo | E | docs + `CHANGELOG.md` | ~150 | ~150 | No |
| **4** | actioNN | F | bundled template + 2 skill docs | ~250 | ~30 | No |

**Dependency order (all hard, none preference):**
- **1 → 2**: PR 2 flips `DEFAULT_TEMPLATE_VERSION` to `V_0-2-0` and points `SHIPPED_TEMPLATE_VERSIONS` at files PR 1 creates; its `shipped-template-versions` test reads them from disk and fails without PR 1.
- **2 → 3**: PR 3 asserts in prose that the migration is complete. It is also the PR that **rebases onto the orchestrator's staged `docs/documentation/specifications.md`** — read on-disk content immediately before editing, never overwrite from a stale read.
- **1 → 4**: `actioNN`'s canonical `raw.githubusercontent.com/.../main/...` URLs resolve against `iNNfo` **`main`**, not against a branch. PR 4 merges **after PR 1 is on `iNNfo` main**, in a separate repo with its own merge queue. `nn-innfo/SKILL.md:3` frontmatter `version:` is the skill's own — do not touch.

Chain strategy fits `feature-branch-chain`: PR 1 → tracker branch, PR 2 → PR 1's branch, PR 3 → PR 2's branch. If a child diff shows an ancestor's files, rebase until clean.

**Post-merge, not this change**: `eNNvironment/docs/use/manifest.md` pin bump — needs a merge sha that does not exist yet. File at archive time.

## Open Questions

- [ ] **A1 is still unverified and is a hard gate at the start of `sdd-apply`** (this phase had no shell either): `git log --follow --oneline -- specs/templates/{analysis/analysis,business-model/business-model}_V_0-1-0_NN.md`. If either predates `feat/business-template-decomposition`, allow-list rows 6-7 collapse, two more `_V_0-2-0_` template files enter PR 1, and two `SHIPPED_TEMPLATE_VERSIONS` values change. **Escalate; do not absorb.**
- [ ] Confirm with the user that editing `iNNfo_V_0-1-0_NN.md`'s `status` to `"Deprecated"` is acceptable (D1 argues it is inert; a strict R-SV-02 reading would keep it at `"Draft"` — that fallback costs nothing but leaves the vocabulary unused).
- [ ] `blank` and `cogNNitive` still ship no sample at any version (A3). Acceptable in the `specifications.md` table, or does slice C grow by two authored samples? Deferred to `sdd-tasks`/user.
