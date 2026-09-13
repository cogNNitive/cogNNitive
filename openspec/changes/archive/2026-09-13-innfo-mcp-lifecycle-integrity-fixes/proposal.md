# Proposal: innfo-mcp Lifecycle Integrity Fixes

## Intent

A full manual customer journey against the `innfo-mcp` server (create → author →
cite → cross-reference → validate) surfaced 8 defects. Three of them (H1, H2, H3)
break the primary agent-facing loop outright: a model cannot be scaffolded, and a
citation cannot be written or diagnosed. The rest degrade trust in the tool
surface — misleading errors, unusable result sets, remediation hints that point
at manual file surgery, and warning floods that bury actionable diagnostics.

Each item below was located in code and re-verified against the current worktree;
several root causes turned out to be more precise than the original bug report
assumed. This change fixes the defects only — no new capability, no version bump
(that belongs to `nn-dev-release`).

Baseline before any edit: `innfo-core` 706 passed / 1 skipped / 1 pre-existing
failure (`tests/metrics-console-harness.test.ts` — shells out to headless Chrome,
unrelated, out of scope), `innfo-mcp` 263/263 passed, `tsc --noEmit` clean.

This change assumes `2026-09-13-simple-refactors-batch` as its base: the
`MUTATION_HANDLERS` registry in `mutate.ts` and the `schema/` folder with a
barrel `index.ts`.

## Scope

### In Scope

**H1 (critical) — `init_model` almost never persists.**
`innfo-mcp/src/tools/init-model.ts`, `scaffoldBodyFromSchema()` (line ~51): emits
the literal `[[Target Element]]` for every `type:: reference` field — always
dangling — and for `type:: text` concepts emits prose with no
`## NN Concept: Element` marker, triggering "No NN element markers found".
`initModel()` validates the scaffold *before* writing; on failure it returns
`success: false` yet still populates `filePath` and `content`, so the call looks
successful. Confirmed: for templates `business` and `blank`, the tool never
persists on first attempt. Fix: the generated scaffold must be valid by
construction (omit unsatisfiable reference placeholders rather than emitting a
dangling one; emit at least one real element marker per markered concept), and a
failed init must not return a `filePath`/`content` shaped like a success.

**H3 (critical) — writing never produces valid `sources::`.** Two independent
root causes in `innfo-core/src/`:
- `mutate.ts`, `addElement()` (line ~240): builds `fields` from `args.fields`
  only and never reads `args.sources`, so any `sources` passed to
  `apply_change add_element` is silently dropped.
- `parser/serializer.ts`, `serializePropertyValue()` (lines 6–23): special-cases
  only wikilinks (`[[...]]`, loose or inside an array); everything else falls
  through to `JSON.stringify(value)`. A spec-correct L1 citation
  (`sources:: [sources/nn/foo.md#heading]` — unquoted bracket list, see
  `iNNfo/specs/iNNfo_V_0-2-1_NN.md` line ~383) re-serializes as
  `sources:: ["sources/nn/foo.md#heading"]` or `sources:: "[...]"` depending on
  path. Neither is spec syntax.

Fix: propagate `args.sources` in `addElement`, and add a dedicated serializer
case for citation-list values, coherent with what `splitSourceFieldValue`
(`validator/sourceRef.ts`) expects on the read side. Whether that case keys off
the field name (`sources`) or the value shape is a **design decision** — see
Risks; the serializer is shared by ALL field serialization.

**H2 (critical, coupled to H3) — malformed `sources::` never yields a
diagnostic.** The citation engine (`validator/workspaceSources.ts`,
`validator/sourceRef.ts`) exists, correctly rejects line ranges, and resolves
file+heading; it is well covered by `tests/workspaceSources.test.ts`. The real
defect is that the only path that writes `sources::` today (H3) emits a syntax
the reader was never built to parse. Design must confirm end-to-end whether the
malformed value lands in `KU_MALFORMED` (as code reading suggests) or whether a
second read-side bug exists. Either way the fix must close the write↔read loop,
not one side of it.

**H4 (high) — qualified cross-model references are not distinguished.** Two
independent checkers exist. `validator/workspaceReferences.ts` is the correct one
and already satisfies `openspec/specs/cross-model-reference-validation/`, but it
only inspects fields the resolved template schema declares `type:: reference` or
`type:: model` (`iterateTypedFieldValues()`). Meanwhile `validator/content.ts`
check `conv-wikilinks` (lines 403–430) scans every raw `[[...]]` in the document
against concept names with zero knowledge of the qualified `Model :: Element`
form, so valid and invented qualified references alike collapse into one generic
`N undefined reference(s)` warning. The sibling checker
`validator/references.ts` (lines 210–225) ALREADY has the correct bypass, with an
explicit `AD-06` comment delegating to `workspaceReferences.ts`. Fix: give
`conv-wikilinks` the same bypass.

**H5 (high) — `add_concept` / `add_field` / `set_marker` have no level gate.**
These three ops (in `mutate.ts`, now inside `MUTATION_HANDLERS`) write level-2
TEMPLATE authoring primitives (`# NN Concept Definition`,
`# NN Field Definition` / `Marker Definition`) and are only legitimate when
`model.frontmatter.level === 2`. `apply_change`
(`innfo-mcp/src/tools/apply-change.ts`) runs them against a `level: 3` model; the
mutation structurally "works", then mandatory post-mutation `coreValidate`
rejects it with a confusing schema error (`validator/model-checks.ts`,
`checkElementGroups()`: `Concept "Concept Definition" is not defined in
template`). Atomic rollback does work — nothing is ever written — but the message
does not state the truth. Fix: explicit early gate in `applyChange` /
`runMutation` for these three ops with a clear `level !== 2` error.

**H6 (medium) — `list_models` without `root` scans the whole repo.**
`innfo-core/src/helpers.ts`, `collectModels()` (lines 46–64): filters only on
ignored directories and the `.md` extension — no `_NN.md` suffix filter, no
frontmatter filter (`level: 3`, `parent_spec`) — unlike `isReconcilableModel()`
in `innfo-core/src/workspace/discoverModels.ts`, which applies `NN_FILENAME_RE`.
Two divergent model-discovery predicates in one package. With `root` defaulting
to the monorepo root, `list_models` returns 180+ irrelevant `.md` files
(READMEs, CHANGELOGs, fixtures, openspec proposals). Fix: unify `collectModels`
onto the `isReconcilableModel` predicate rather than maintaining two.

**H7 (medium, UX not logic) — stale-template-cache warning omits the self-heal.**
`innfo-mcp/src/tools/validate.ts` (lines 529–531) emits `TEMPLATE_CACHE_STALE`
correctly and to the letter of
`openspec/specs/template-cache-staleness-detection/`, but its `message` /
`promptHint` tells the agent to delete/replace the file by hand under `specs/`,
never mentioning that `check_workspace` (`tools/check-workspace.ts`) already
performs that write-once rehydration automatically. Fix: point the remediation at
`check_workspace`, not at manual file surgery.

**H8 (minor) — concept-documentation warning flood.**
`innfo-core/src/validator/model-checks.ts`, `checkTemplateDocumentation()`
(line 114): emits one warning per template concept lacking a complete guidance
section. With the `business` template (~85 concepts) this drowns every
actionable warning — and these are gaps in the TEMPLATE's documentation, nothing
the model author can fix. Fix: collapse into a single summary diagnostic (count +
list), or move it to a separate category/severity. Presentation only; validation
semantics unchanged.

### Out of Scope

- Any `package.json` version bump. `innfo-core` and `innfo-mcp` both stay at
  `0.7.0` (`innfo-mcp` depends on `^0.7.0`); releases belong to `nn-dev-release`.
- `tests/metrics-console-harness.test.ts` — pre-existing environmental failure
  (headless Chrome via `file://`), unrelated and not a regression.
- Rebuilding or republishing the global bundle at
  `C:\Users\lucas\.agents\mcp\innfo-mcp.bundle.js`. That bundle was verified to
  already contain the `workspaceSources.ts` / `workspaceReferences.ts` logic, so
  none of these findings is a stale-bundle artifact; redistribution is a separate
  release concern.
- Adding a `root` parameter to `apply_change`. It already has one
  (`innfo-mcp/src/server.ts` lines ~261–265, consumed by `handleApplyChange`);
  the original report's claim to the contrary is retracted.
- Anything in `2026-09-13-simple-refactors-batch` — a separate, already in-flight
  change, treated here as a stable base.
- Broader unification of `content.ts` and `references.ts` into one checker. H4
  only ports the existing `AD-06` bypass.

## Capabilities

### New Capabilities

- `mutation-level-gating`: template-authoring mutations (`add_concept`,
  `add_field`, `set_marker`) are admissible only on `level: 2` documents and
  fail early with a level-explicit error instead of a downstream schema error
  (H5).
- `model-discovery-predicate`: one shared predicate decides what counts as a
  discoverable iNNfo model across `helpers.ts` and `discoverModels.ts` (H6).
- `diagnostic-signal-quality`: diagnostics that are structurally repetitive and
  not actionable by the document's author are aggregated rather than emitted
  per-occurrence (H8).

### Modified Capabilities

- `model-scaffold-robustness`: NEW requirement — a generated scaffold MUST be
  valid against its own template by construction, and a failed init MUST NOT
  return a success-shaped payload. The spec is currently silent on
  invalid-by-default placeholder content (H1).
- `document-citations`: the serialized `sources::` form written by the engine
  MUST round-trip through the citation reader, and `add_element` MUST accept
  `sources` (H2, H3).
- `cross-model-reference-validation`: the per-file `conv-wikilinks` convention
  check MUST bypass qualified `[[Model :: Element]]` values, matching the
  existing `AD-06` delegation in `references.ts` (H4).
- `template-cache-staleness-detection`: the `TEMPLATE_CACHE_STALE` remediation
  hint MUST name `check_workspace` self-heal as the remedy (H7).

## Approach

Fix in place, no new architecture. Each finding is a bounded correction to an
existing function; the only cross-cutting one is H3's serializer change, which is
scoped deliberately (see Risks).

Given 8 findings across 2 packages, implementation lands as a sequence of atomic
commits by work unit, not one large commit. Proposed grouping and order
(cheapest / most isolated first, coupled items together):

| # | Commit | Findings | Package |
|---|---|---|---|
| 1 | `fix(innfo-core): bypass qualified cross-model refs in conv-wikilinks` | H4 | core |
| 2 | `fix(innfo-core): gate template-authoring mutations to level-2 models` | H5 | core + mcp |
| 3 | `fix(innfo-core): unify model discovery predicate in collectModels` | H6 | core |
| 4 | `fix(innfo-core): round-trip sources:: citations through write and read` | H2 + H3 | core |
| 5 | `fix(innfo-mcp): emit a self-valid scaffold from init_model` | H1 | mcp |
| 6 | `fix(innfo-mcp): point stale-cache hint at check_workspace self-heal` | H7 | mcp |
| 7 | `fix(innfo-core): aggregate template documentation warnings` | H8 | core |

H2+H3 stay in one commit because the write side and the read side must land
together to be verifiable. Every commit runs both suites green (against the
baseline above) before the next starts. Scope is a local commit on `dev` — no
push, no PR.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `iNNfo/packages/innfo-mcp/src/tools/init-model.ts` | Modified | `scaffoldBodyFromSchema()` placeholders; failure payload shape (H1) |
| `iNNfo/packages/innfo-core/src/mutate.ts` | Modified | `addElement()` accepts `sources` (H3a); level gate for 3 handlers (H5) |
| `iNNfo/packages/innfo-core/src/parser/serializer.ts` | Modified | `serializePropertyValue()` citation-list case (H3b) — **shared by all fields** |
| `iNNfo/packages/innfo-core/src/validator/sourceRef.ts` | Modified (likely) | Read-side alignment pending design confirmation (H2) |
| `iNNfo/packages/innfo-core/src/validator/content.ts` | Modified | `conv-wikilinks` qualified-form bypass (H4) |
| `iNNfo/packages/innfo-core/src/validator/model-checks.ts` | Modified | `checkTemplateDocumentation()` aggregation (H8) |
| `iNNfo/packages/innfo-core/src/helpers.ts` | Modified | `collectModels()` adopts `isReconcilableModel` predicate (H6) |
| `iNNfo/packages/innfo-mcp/src/tools/apply-change.ts` | Modified | Surfaces the level-gate error (H5) |
| `iNNfo/packages/innfo-mcp/src/tools/validate.ts` | Modified | `TEMPLATE_CACHE_STALE` message/hint (H7) |
| `iNNfo/packages/innfo-core/tests/`, `iNNfo/packages/innfo-mcp/tests/` | Modified | Regression coverage per finding |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| **H3b serializer change leaks beyond `sources::`.** `serializePropertyValue()` serializes EVERY field of EVERY model; a shape-based heuristic (bracket list without quotes) could silently change how unrelated fields round-trip | **High** | Design must pick field-name-keyed vs shape-keyed detection explicitly and justify it. Prefer the narrowest rule that satisfies `splitSourceFieldValue`. Mandatory round-trip test: parse → serialize → parse byte-identical over the existing model corpus before the commit lands |
| H1 scaffold change alters output for every template, breaking scaffold snapshot tests | Med | Change is the point — update snapshots deliberately, and add the invariant "scaffold output validates clean against its own template" as the real test |
| H4 bypass silently hides genuinely broken local wikilinks that happen to contain `::` | Low-Med | Match the qualified form with a precise regex (`[[<text> :: <text>]]`), not a bare `includes('::')`; mirror `references.ts` lines 210–225 exactly rather than inventing a looser rule |
| H5 gate rejects a legitimate call that works today | Low | Rollback proves nothing is written today for `level !== 2`, so no working flow can exist; gate only the 3 named ops, leave the other handlers untouched |
| H6 predicate change hides models that `list_models` currently returns and someone depends on | Med | `isReconcilableModel` is already the de-facto predicate elsewhere in the same package; verify against the repo's real model corpus and keep `root` honored |
| H2 turns out to be a second, independent read-side bug rather than a consequence of H3 | Med | Open question, explicitly assigned to design: reproduce end-to-end first, then decide scope. Do not write the fix before the reproduction exists |
| Divergence with the concurrent `simple-refactors-batch` working tree (`mutate.ts`, `schema/`, `validation.ts`) | Med | Build on the current uncommitted state as the base; re-run both suites before each commit to catch interference early |

## Rollback Plan

Each finding is one atomic commit touching a single function or small cluster.
Revert per-commit with `git revert <sha>` — no migration, no persisted state, no
schema change, no public API change. H3 is the only commit with cross-cutting
blast radius; if the round-trip corpus test regresses after the fact, reverting
that single commit restores the previous (broken but known) serialization without
touching the other six.

## Dependencies

- `2026-09-13-simple-refactors-batch` is the assumed base (`MUTATION_HANDLERS`
  registry, `schema/` barrel, `'parser'` category). It does not need to be
  committed first, but must not be reverted underneath this work.
- No external dependency, no new package.

## Success Criteria

- [ ] H1: `init_model` persists a valid model on the FIRST call for `business`
      and `blank`; a failed init returns no `filePath`/`content`.
- [ ] H2/H3: a citation written via `apply_change add_element` with `sources`
      round-trips (write → read → validate) and a deliberately malformed one
      produces an explicit diagnostic instead of silence.
- [ ] H3: parse → serialize → parse is byte-identical across the existing model
      corpus for all field types, not just `sources`.
- [ ] H4: a valid `[[Model :: Element]]` produces no `conv-wikilinks` warning; an
      invalid one produces the specific `workspaceReferences` diagnostic, not the
      generic `N undefined reference(s)`.
- [ ] H5: `add_concept` / `add_field` / `set_marker` on a `level: 3` model fail
      with an explicit level message, not a template-schema error.
- [ ] H6: `list_models` at the monorepo root returns only `_NN.md` models — no
      READMEs, CHANGELOGs, fixtures, or openspec proposals.
- [ ] H7: the `TEMPLATE_CACHE_STALE` hint names `check_workspace` as remediation.
- [ ] H8: the `business` template produces ONE aggregated documentation
      diagnostic instead of ~85.
- [ ] `innfo-core` 706 passed / 1 skipped, `innfo-mcp` 263 passed, plus the new
      regression tests. `metrics-console-harness.test.ts` remains the only
      failure and is unchanged.
- [ ] `npx tsc --noEmit` clean in `innfo-core` and `innfo-mcp`.
