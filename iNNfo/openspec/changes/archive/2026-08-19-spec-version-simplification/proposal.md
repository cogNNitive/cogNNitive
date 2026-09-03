# Proposal: Spec Version Simplification

## Intent

Three parallel, disconnected mechanisms version the same artifact — the spec-of-spec (`defiNNe` L0, `iNNfo` L1, templates L2) — plus a 444-line script whose only job is to paper over the resulting fan-out. The drift is live, not hypothetical:

| Symptom | Evidence |
|---|---|
| `latest/` advertises a version that does not exist | `specs/latest/INDEX.md` → "Active Version: v0.3.0", links `v0.3.0/level1/iNNfo_V_0-3-0_NN.md`; no such directory in the repo |
| Code two minors behind the advertised version | `apps/innfo-editor/src/utils/constants.ts:13` — `DEFAULT_INNFO_VERSION = 'V_0-2-0'` |
| "Complete snapshot" invariant broken | `specs/v0.2.1/` contains only the `business` template; `specs/v0.2.0/` was complete |
| Dead third copy | `models/specs/` frozen at V_0-1-0/V_0-1-1 since 2026-07-28; single live consumer is the first fallback URL in `apps/innfo-editor/src/stores/workspaceStore.ts:378` |
| URL builders already stale | `constants.ts:33-52` emit `specs/iNNfo_*_NN.md` (no `level1/` segment) and mix two strategies: git-tag-in-path vs. main-branch/filename-only |

**Root cause.** `openspec/changes/archive/2026-08-12-spec-foundation-hardening/` shipped Phases 2–5 and deferred Phase 1 (0 of 14 tasks) with an explicit instruction to file a NEW change rather than reopen it. This is that change. The solution here is deliberately more aggressive than Phase 1's sketch: its task 1.14 preserved a 3-way `v0.2.0/` + `archived/` + `latest/` split; this change deletes the `latest/` alias outright.

**Gaps found by lifecycle simulation** (template published → 3 models instantiated → template bumped → one model migrated), measured against the L1 spec's own Immutable Versioning Policy (`specs/latest/level1/iNNfo_NN.md` L581-589, "Published specs are frozen… Parent chain resolution always resolves to the version the model was authored against"):

- **G1** — L2 templates have no independent version field. `specification_version` tracks L1 compliance, not the template's own identity, so there is nothing to bump.
- **G2** — Shipped samples pin `parent_spec.url` at the mutable `specs/latest/…` alias (verified in `specs/latest/level2/procedures/samples/CodeReviewProcess_V_1-0-0_procedures_NN.md`), directly violating that policy.
- **G3** — Consequence of G2: bumping a template in place silently repoints every existing model referencing it, with no consent and no notice.
- **G4** — No "migrate a model to a new template version" operation exists anywhere. `version-management` R-VM-01..R-VM-07 only bumps a model's own `model_version` and never touches `parent_spec`.

The versionless filenames under `specs/latest/` are the mechanical cause. `spec-resolution` R-LSR-02's *entire* integrity guarantee is write-once-by-filename (there is no content hashing); a file whose name carries no version can never satisfy it.

## Scope

### In Scope

- One flat, immutable-per-file `specs/` tree. Remove `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, `specs/latest/INDEX.md`, `specs/CHANGELOG.md` (root `CHANGELOG.md` is retained as the only changelog).
- **Atomic delivery** (D4): the move to the new tree and the deletion of `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, and `models/specs/` land in the **same PR**. Old and new trees never coexist.
- **Delete the three orphan templates outright** (D2): `specs/latest/level2/businessV2/`, `specs/latest/level2/cogNNitive/`, `specs/latest/level2/biz/`. Not archived, not carried into `specs/templates/`.
- **Interim template-bump notice** (D3): a passive badge on a model whose template has a newer `template_version`, carrying a **copyable `innfo:`-prefixed migration prompt** the user pastes into OpenCode. Reuses the existing prompt pattern (`ai-guide/prompt.ts` `innfoPrompt()`, `ai-guide/guide.ts`, `AIGuidePanel.vue`). Not blocking, not silent.
- Version encoded in **every** spec filename — required by R-LSR-02's write-once contract, not a style preference.
- New L2 frontmatter field **`template_version`**: the template's own immutable version, filename-encoded (closes G1). A bump creates a new file; the old file is never edited or deleted while any model still references it.
- Reserve optional **`specializes`** (structural inheritance from a base template) as a documented, deliberately unimplemented field — kept distinct from `template_version` so specialization and versioning are never conflated again.
- Repoint every shipped sample's `parent_spec.url` to an immutable versioned filename (closes G2 and G3).
- Delete `models/specs/`; collapse `workspaceStore.ts` `_ensureGeneralSpec`'s three divergent fallback URLs to one strategy matching the new layout.
- Move `specs/latest/level2/projects/extension/` (manifest.json + `useProjectGantt.ts`) fully into `apps/innfo-editor/src/extensions/projects/`; delete the hardcoded relative re-export shim.
- Rewrite `buildSpecificationUrl`, `buildSpecificationUrlFromMain`, `buildDocumentationLocation`.
- Repoint `SAMPLE_BASE` prefix to `specs/templates` (the starter URL list itself needs no change).
- Scope down `.agents/skills/nn-dev-spec-version-propagator/SKILL.md` + `scripts/check-spec-version.mjs` to their residual job (keeping the single default-version constant in sync), rather than stranding them.

Target layout:

```
specs/
  defiNNe_V_0-1-0_NN.md          # L0, flat
  iNNfo_V_0-1-0_NN.md            # L1, flat
  templates/
    business/
      business_V_0-1-0_NN.md
      samples/Ghostbusters_V_0-1-2_business_NN.md
    procedures/
      procedures_V_0-1-0_NN.md
      procedures_V_0-2-0_NN.md   # bump = new file; old kept while referenced
      samples/CodeReviewProcess_V_1-0-0_procedures_NN.md
    organization/ ...
    projects/ ...
```

`level0/`/`level1/`/`level2/` disappear (level is already a frontmatter field, and `SpecResolverService.findLocalSpecInHandle` searches recursively). Per-template grouping with its own `samples/` is **kept intentionally** — `apps/innfo-editor/src/config/samples.ts` and `useWorkspaceScaffolding.ts` already build starter URLs as `${SAMPLE_BASE}/{templateName}/samples/{file}`.

### Out of Scope

- The end-user Version Panel (`version-management`, R-VM-01..R-VM-07) that bumps a user's own L3 `model_version`. Separate product feature, untouched.
- Any real implementation of `specializes` / template inheritance beyond reserving and documenting the field.
- `openspec/`'s own change-lifecycle mechanics.
- A **first-class in-app** G4 migration operation. The badge + copyable prompt above is the confirmed interim UX; the AI performs the migration out-of-app until (or instead of) a native operation is built.
- Any deprecation/compat window for `specs/latest/…` URLs — explicitly waived (D1).
- Retention / garbage collection of old template versions once zero models reference them — maintenance policy, not part of the core mechanism.

## Capabilities

### New Capabilities

- `spec-versioning`: immutable filename-encoded versioning for L0/L1/L2 specs — canonical `specs/` layout, `template_version`, reserved `specializes`, and the rule that L3 `parent_spec.url` MUST pin a versioned filename (never a mutable alias).

### Modified Capabilities

- `spec-resolution`: R-LSR-01 / R-LSR-02 search paths and scenarios move to the flat + `templates/{name}/` layout; the write-once guarantee becomes structurally satisfiable because no versionless spec filename remains.
- `local-spec-resolution-cache`: R-LSRC-01's scenario cites `specs/v0.1.0/level2/business/business_V_0-1-2_NN.md`, a path shape this change eliminates.
- `guide-prompts`: its "Guide Prompts Use innfo: Prefix" requirement is scoped to **three** prompts; the D3 template-migration prompt makes it four, and adds a prompt surfaced from a model badge rather than only from `AIGuidePanel`.

## Approach

Make immutability structural instead of conventional: every spec artifact is addressable only by a versioned filename, so a bump is *always* a new file and can never silently mutate a consumer's parent chain. Everything else follows from that single rule — the `latest/` alias and the pinned-snapshot folders both become unnecessary, and the version-propagation script loses most of its 13-category fan-out because nothing downstream breaks on a bump anymore.

| Decision | Rationale (verified against repo) |
|---|---|
| Version in the **filename**, not folder-only or frontmatter-only | R-LSR-02's only integrity mechanism is write-once-by-filename; no content hashing exists |
| Delete the `latest/` alias | Its versionless filenames are the direct mechanical cause of G2/G3 |
| Keep `parent_spec` as `{name, url}`; do **not** collapse to a URL string | 15+ call sites read `.name` independently for display (`Header.vue:463`, `ModelDashboard.vue:38`, `BlockSheet.vue:727`, `WorkspaceDashboard.vue:29`, `LeftSidebar.vue:614`, `useConceptVisuals.ts:97`, `metamodelStore.ts:123`, `useModelFrontmatter.ts:63-79`); `innfo-core` validator requires both with distinct errors (`validator/content.ts:84-102`); serializer always emits both (`parser/serializer.ts:30-34`); and `packages/innfo-core/docs/resolver-protocol-test-plan.md` "T3: Version Bump Detection" diffs `parent.name` specifically — the exact mechanism G4's migration should build on |
| Reject "V2"-style sibling forking as the versioning mechanism | The repo already has an ad-hoc `business` / `businessV2` precedent with no formal `parent_spec` link; a bump must yield a new *version* of the same named template, not a new sibling |
| Two independent axes (`template_version` vs. `specializes`) | Conflating them is what produced `business`/`businessV2` |
| Keep `templates/{name}/samples/` grouping | Load-bearing for `SAMPLE_BASE` + starter scaffolding, not folder sprawl |
| Drop `levelN/` folders | Redundant with the `level:` frontmatter field; the resolver already walks subdirectories |
| Break `specs/latest/…` URLs with no grace period (D1) | User-confirmed: no external installed base; actively-developed internal project |
| Ship the whole move + deletion as one atomic PR (D4) | User-confirmed: coexisting trees would reintroduce exactly the dual-source-of-truth this change removes |
| Badge + copyable `innfo:` prompt as G4's stopgap (D3) | User-confirmed; reuses a shipped pattern (`innfoPrompt()` prepends `innfo: ` to activate the nn-router) instead of inventing new UX, and keeps the migration out of the app until the operation is designed |

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `specs/latest/**`, `specs/v0.2.0/**`, `specs/v0.2.1/**` | Removed | Replaced by the flat + `templates/` tree with versioned filenames |
| `specs/CHANGELOG.md`, `specs/latest/INDEX.md` | Removed | Root `CHANGELOG.md` becomes the only changelog |
| `models/specs/**` | Removed | Dead third copy |
| `specs/latest/level2/{businessV2,cogNNitive,biz}/**` | Removed | Orphan templates, zero code references (D2) |
| `apps/innfo-editor/src/ai-guide/guide.ts` | Modified | Adds the D3 template-migration prompt (4th `innfo:` prompt) |
| Model badge surface (e.g. `components/editor/ModelInfoPanel.vue`) | Modified | Passive "newer template version" badge exposing the copyable prompt (D3); exact host component is a design decision |
| L2 template frontmatter (all templates) | Modified | Adds `template_version`; reserves optional `specializes` |
| Shipped samples' `parent_spec.url` | Modified | Repointed from the `latest/` alias to pinned versioned filenames |
| `apps/innfo-editor/src/utils/constants.ts` (L13, L33-52) | Modified | Version constant + three URL builders rewritten for the new layout |
| `apps/innfo-editor/src/config/samples.ts` | Modified | `SAMPLE_BASE` → `specs/templates` (dev and remote) |
| `apps/innfo-editor/src/stores/workspaceStore.ts` (~L376-383) | Modified | `_ensureGeneralSpec`: 3 URL strategies → 1; dead `models/specs/` URL removed |
| `apps/innfo-editor/src/extensions/projects/useProjectGantt.ts` | Modified | Re-export shim replaced by the real implementation moved out of `specs/` |
| `apps/innfo-editor/vite.config.ts` (`serveLocalSpecs`) | Modified | Dev-server mount must follow the new tree |
| `.agents/skills/nn-dev-spec-version-propagator/SKILL.md`, `scripts/check-spec-version.mjs` | Modified | Scope reduced to the residual default-version sync job |
| `openspec/specs/spec-resolution/spec.md`, `openspec/specs/local-spec-resolution-cache/spec.md` | Modified | Path shapes in requirements/scenarios |

## Resolved Decisions (user-confirmed 2026-08-18)

These were raised as open product questions during the proposal round and answered by the user. They are settled; do not reopen them in spec/design.

| ID | Question raised | User decision |
|---|---|---|
| **D1** | Compat window for models pinned at `specs/latest/…` | **No deprecation window.** No external installed base to protect — actively-developed internal project. Breaking those URLs directly is acceptable. |
| **D2** | Disposition of orphan templates `businessV2`, `cogNNitive`, `biz` (zero code references) | **Delete outright.** Do not archive, do not carry into `specs/templates/`. |
| **D3** | What a user sees when their model's template has a newer version, given G4's migration operation does not exist | **Passive badge + copyable AI prompt.** The badge states a newer `template_version` exists and offers a ready-made `innfo:`-prefixed prompt to paste into OpenCode, mirroring the shipped `ai-guide` prompt pattern. Not blocking, not a generic "update available" indicator, not silent. This is the interim UX for G4 until (or instead of) a first-class in-app migration. |
| **D4** | PR scope — may the new tree land before the old one is deleted? | **Atomic.** Move + delete `specs/latest/`, `specs/v0.2.0/`, `specs/v0.2.1/`, `models/specs/` in one PR. No temporary coexistence. |

**Consequences folded in.** D4 resolves the second app-code-under-`specs/` case found during research: `specs/v0.2.0/level2/procedures/extension/` (`manifest.json` + `useProcedureFSM.ts`) needs no separate treatment — it is deleted with `specs/v0.2.0/`. Only the `projects` Gantt extension, which lives under `specs/latest/` and has a live app consumer, is relocated.

### Handed to the design phase (mechanics, not product ambiguity)

- **G4's migration logic.** The prompt from D3 must instruct the AI to perform a concrete operation. Known starting point: `packages/innfo-mcp/src/tools/mutate.ts:268-291` already rewrites `parent_spec.name` via regex inside an existing MCP operation — the likely reuse candidate. A `model_version` major bump should accompany the migration, mirroring R-VM-05's "create a new file, never edit the original". Design must also decide how the badge detects that a newer `template_version` exists (workspace scan vs. resolver-side).
- **`_ensureGeneralSpec` URL strategy.** Which single strategy replaces the three (tag-pinned vs. main-branch/filename-only).
- **Initial `template_version` values** for each template's first file under the new scheme.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Atomic PR (D4) makes a large mechanical diff — file moves + frontmatter + URL rewrites + deletions — far exceed the 400-line review budget, and it cannot be split into chained PRs without violating D4 | High | Unavoidable given D4. `sdd-tasks` MUST forecast this and request an explicit `size:exception`, and SHOULD separate pure renames from content edits within the single PR so the diff reads as moves. The D3 badge/prompt work is the one genuinely separable slice and MAY ship as a follow-up PR |
| Models pinned at `specs/latest/…` stop resolving | Low | Accepted by D1 — no external installed base; no compat window required |
| Deleting `models/specs/` breaks an unknown external consumer of the raw GitHub URL | Low | Same D1 rationale; only in-repo consumer verified (`workspaceStore.ts:378`); still announce in root `CHANGELOG.md` |
| Extension move breaks the Gantt view | Med | The current shim is already a hardcoded relative path into `specs/latest/level2/`; it breaks either way — typecheck + app tests gate the move |
| `template_version` added without a first-class G4 operation leaves bumping half-usable | Med | Mitigated by D3's badge + copyable prompt: the user always has an actionable path. Pinning already removes the *silent* repoint (G3) |
| D3's prompt drives an AI migration with no in-app validation, so a bad migration is only caught later | Med | The prompt must instruct a `validate_model` pass and the "new file, never edit the original" pattern; design phase specifies the prompt text |
| Deleting `cogNNitive` (D2) conflicts with a stale note claiming code uses `cogNNitive_NN.md` | Low | Grep across `.ts`/`.vue`/`.mjs`/`.json` found zero references; D2 confirmed by the user with that evidence stated |
| Scope creep into the user-facing Version Panel | Med | `version-management` R-VM-01..R-VM-07 declared out of scope; no spec delta touches it |

## Rollback Plan

Revert the single PR. Atomic delivery (D4) makes rollback strictly simpler than a chained sequence: there is one commit to revert and no intermediate state in which both trees exist. All artifacts are files in Git — no database, no persisted runtime state, no schema migration. The `template_version` field is additive frontmatter, ignored by parsers that do not know it. Deleted directories (`specs/latest/`, `specs/v0.2.x/`, `models/specs/`, the three orphan templates) return with the revert. The only non-revertible surface is a user workspace whose `.spec-cache/` downloaded a new-layout file during the window; the resolver's write-once rule means those files are simply re-resolved from the restored URLs. D1 means no external consumer contract has to be honored during rollback.

## Dependencies

- `openspec/changes/archive/2026-08-12-spec-foundation-hardening/` — precedent and symptom checklist (Phase 1 tasks, R-MM-01..R-MM-14, and the archived `specs/metamodel-spec/spec.md` delta cover glossary/taxonomy, `_FORMAT.md` deprecation, frontmatter structure, `specification_url` overload). Reference only; that change stays closed.
- No new external packages.

## Success Criteria

- [ ] Zero occurrences of `specs/latest/` in the repo (specs, app source, skills, docs, tests, fixtures)
- [ ] Every file under `specs/` carries a `V_x-y-z` version segment in its filename
- [ ] `specs/v0.2.0/`, `specs/v0.2.1/`, `models/specs/`, `specs/CHANGELOG.md` deleted
- [ ] The `businessV2`, `cogNNitive`, and `biz` template folders no longer exist anywhere (D2)
- [ ] The new tree and all four deletions land in one PR; no commit leaves both trees present (D4)
- [ ] A model whose template has a newer `template_version` shows a passive badge with a copyable `innfo:`-prefixed migration prompt; the badge never blocks editing (D3)
- [ ] Every L2 template declares `template_version`; `specializes` documented as optional/reserved
- [ ] Every shipped sample's `parent_spec.url` resolves to a versioned filename, and resolution succeeds via `spec-resolution` R-LSR-01
- [ ] No app-level code (`.ts`/`.vue`/`manifest.json`) remains under `specs/`
- [ ] `_ensureGeneralSpec` uses exactly one URL strategy
- [ ] `nn-dev-spec-version-propagator` + `check-spec-version.mjs` describe only their residual scope; no reference to removed paths
- [ ] `npm run test`, `npm run typecheck`, `npm run lint`, `npm run format` pass
