# Design: innfo-mcp Lifecycle Integrity Fixes

## Technical Approach

Fix in place, no new architecture. Eight bounded corrections; the only decisions
with blast radius beyond one function are H3b (shared serializer), H5 (layer
placement) and H6 (shared predicate), resolved below with code evidence from the
current worktree. Everything else follows an existing in-repo pattern verbatim.

## Decision 1 (H3b) — Citation serialization keys off the FIELD NAME

**Choice**: `serializePropertyValue(value: unknown, fieldName?: string): string`.
A dedicated citation branch fires only when
`SOURCE_FIELD_NAMES.has(fieldName.toLowerCase())`, i.e. `sources` / `source`.

**Alternatives considered**: shape-keyed detection (array of strings where every
item parses as a source ref and none is a wikilink).

**Rationale — the read side already keys by name, twice.**
`validator/workspaceSources.ts:16` and `recursiveParser/normalize.ts:21` each
declare `const SOURCE_FIELD_NAMES = new Set(['sources', 'source'])` and skip
every other field before ever calling `splitSourceFieldValue`. Keying the writer
the same way makes both sides share one grammar and one key. The constant moves
to `src/sourceRef.ts` (already the home of `splitSourceFieldValue` /
`parseSourceRef`) and is imported by all three call sites — one definition, not
three.

**Shape-keying is disproven by the corpus.** Plain unquoted bracket arrays are
widespread on NON-citation fields and today rely on `JSON.stringify`:
`options::`, `values::`, `applies_to::`, `target_concepts::`, `needs::` (e.g.
`cogNNitive_nn/specs/templates/innfo/V_0-2-0/spec_NN.md` lines 59, 125, 155, 188,
630-641, 785-888; `docs/actionn/templates/workflow/V_0-1-0/workflow_V_0-1-0_NN.md`
lines 79-122). `options:: [.md, .csv]`-style values are path-shaped by nature, so
a shape heuristic would silently re-serialize schema-carrying template fields.
Name-keying makes the blast radius provably zero for every field except
`sources`/`source`: no other field's serialization changes by construction.

**Output grammar** (must satisfy `splitSourceFieldValue`, `sourceRef.ts:124`):

| Input value | Emitted | Re-parse (`parser/sections.ts` `parsePropertyValue`) |
|---|---|---|
| `['a.md#x','b.md#y']` | `[a.md#x, b.md#y]` | array of 2 strings — byte-stable |
| `'a.md#x'` | `a.md#x` (bare, unquoted) | string — byte-stable |
| `[]` | `[]` | `[]` |
| any item containing `,` `[` `]` or non-string | fall back to `JSON.stringify` | unchanged from today |

The comma guard is mandatory: `splitSourceFieldValue` splits bracketed strings on
a naive `,` (line 138), so an item with an embedded comma must not be emitted
unquoted.

## Decision 2 (H2) — Reproduction trace: H2 is a CONSEQUENCE of H3a, not a second read-side bug

Traced by hand for the exact string today's serializer produces,
`sources:: ["sources/nn/foo.md#heading"]` (`JSON.stringify` of a string array):

1. `parser/sections.ts` `parsePropertyValue` — value starts `[` / ends `]` and is
   not `[[`, so line 67-70 splits the inner text and re-parses each part.
2. Each part is `"sources/nn/foo.md#heading"`; line 57-62 strips the surrounding
   double quotes. Result: `['sources/nn/foo.md#heading']` — a clean array.
3. `recursiveParser/normalize.ts` `toFieldValues` stores that parsed value
   verbatim as `node.fields.sources.value`.
4. `splitSourceFieldValue` takes the `Array.isArray` branch (line 131) and
   returns `['sources/nn/foo.md#heading']` — quotes never reach it.
5. `parseSourceRef` matches the `explicit` `sources/nn/…#slug` pattern (line 68)
   and returns a valid ref.

**Verdict: NO `KU_MALFORMED`, and no silent swallow either — the reader ACCEPTS
the value** (it emits `KU_DEPRECATED_HASH`, or `KU_DANGLING_FILE` when the file
is absent). The proposal's "as code reading suggests" assumption is wrong: the
quote-stripping in `parsePropertyValue` neutralises the JSON form before the
citation reader sees it. Genuinely malformed inputs (`#L10-L20`, `src-NNN`,
`sources/original/…`) DO produce `KU_MALFORMED` (`workspaceSources.ts:99-105`).

The observed silence has a single cause: `mutate.ts` `addElement` (line 240-246)
builds `fields` from `args.fields` only, so `sources` is never written — there is
nothing in the file to diagnose. **H2 needs no fix in `sourceRef.ts` or
`workspaceSources.ts`**; propagating `args.sources` in `addElement` closes it.
`Affected Areas` row "`sourceRef.ts` — Modified (likely)" is retired, replaced by
the `SOURCE_FIELD_NAMES` export (Decision 1).

Scope caveat for verification: citation diagnostics only exist in workspace
scope — `collectWorkspaceDiagnostics` (`innfo-mcp/src/tools/validate.ts:263-302`)
is reached by `check_workspace` and `validate_model { workspace: true }` only.
The H2 regression test MUST go through that path, never per-file `validateModel`.

## Decision 3 (H5) — The level gate lives in core `runMutation`

**Choice**: a `LEVEL2_ONLY_OPS = new Set(['add_concept','add_field','set_marker'])`
check inside `runMutation` (`mutate.ts:121`), before handler dispatch, returning
a normal `MutationResult` error. No change to `apply-change.ts` beyond it
surfacing the error it already returns at line 383-385.

**Alternatives considered**: gate in `apply-change.ts` (mcp layer).

**Rationale**: core is already the enforcement engine and `apply-change.ts` says
so in its own comment ("via the core enforcement engine (R-IE-01)", line 358).
Core mutations already enforce semantic preconditions and return them as
`MutationResult` errors: reserved concept names (`mutate.ts:147`), model-wide
element uniqueness R-IE-02 (line 230), "concept not found". The level is on the
model the handler already receives (`model.frontmatter.level`) — zero new
plumbing. The mcp layer's job is IO and template resolution. Gating there would
leave the editor (the other `innfo-core` consumer, via `src/browser.ts`)
unprotected and create a second contract.

Corpus check: all 37 level-2 documents declare `level: 2` explicitly, and the
`mutate.spec.ts` TEMPLATE fixture (line 8) already does, so `level !== 2` is a
safe predicate.

## Decision 4 (H6) — Extract `isDiscoverableModel`, keep manifest rules where they belong

**Choice**: in `workspace/discoverModels.ts`, extract the four structural rules
into an exported `isDiscoverableModel(file: CandidateFile): boolean`
(`level === 3`, `parent_spec` present, `_NN.md` filename, `!isIgnoredPath`).
`isReconcilableModel` becomes `isDiscoverableModel(file) && notTheManifest &&
!isCogNNitiveTemplate(parentSpecName(...))`. `helpers.ts` imports
`isDiscoverableModel`; `discoverModels.ts` keeps ownership (it owns
`NN_FILENAME_RE` and the `CandidateFile` type). No third module.

**Rationale**: the manifest-specific rules must NOT leak into `list_models`.
Excluding manifest self-reference is meaningless without a manifest, and
`isCogNNitiveTemplate` would drop legitimate workspace documents
(`docs/workspace_NN.md`, `docs/innfo/samples/…/workspace_V_0-2-0_workspace_NN.md`,
`iNNfo/specs/templates/base/samples/workspace_NN.md`). H6 asks for "only
`_NN.md` models", not for narrowing beyond that.

**`collectModels` keeps its own directory pruning.** `isIgnoredPath`
(`recursiveParser/workspace.ts:41`) only inspects the FIRST path segment of a
workspace-relative path; `collectModels` walks absolute paths and prunes
`node_modules`, `.git`, dot-dirs and `IGNORED_DIRS` at every level. Dropping that
walk-level prune would both change behaviour and destroy the traversal
performance. New order per file: extension → `index.md` → `_NN.md` name (cheap)
→ read + `parseFrontmatter` → `isDiscoverableModel` with the root-relative path.
Only `_NN.md` candidates are ever read.

**Corpus edge-case audit** (`rg "^level:\s*3$" --glob '*.md'` → 94 files):

| Class | Example | After the change |
|---|---|---|
| Real level-3 models | `docs/samples/use-cases/startup-founder/models/SaaS_Founder_V_1-0-0_business_NN.md` | kept |
| Editor/core fixtures `_F.md` | `iNNfo/apps/innfo-editor/tests/fixtures/models/Ghostbusters_V_0-1-1_business_F.md`, `iNNfo/tests/fixtures/sample-model_F.md` | dropped (not `_NN.md`) — intended |
| Docs prose with `level: 3` inside a fenced block | `docs/innfo/documentation/usage.md:10`, `docs/innfo/documentation/relationships.md`, `docs/actionn/templates/workflow/V_0-1-0/documentation.md`, `actioNN/AGENTS.md` | dropped — the hit is inside a code fence, so frontmatter parsing yields no `level`; a frontmatter predicate excludes them naturally, unlike a grep |
| openspec artifacts | `openspec/changes/archive/**/design.md`, `spec.md`, `exploration.md` | dropped — same reason, plus no `_NN.md` |
| Templates under `specs/` | `iNNfo/specs/templates/business/spec_NN.md` | already excluded today by the `specs` dir prune |

**No accidental casualty found**: every `level: 3` + `parent_spec` document that
is a real iNNfo model in this repo also carries the `_NN.md` suffix. The only
category losing visibility is `_F.md` test fixtures, which is the point of H6.

## File Changes

| File | Action | Description |
|---|---|---|
| `innfo-core/src/sourceRef.ts` | Modify | Export `SOURCE_FIELD_NAMES` (single definition) |
| `innfo-core/src/parser/serializer.ts` | Modify | `serializePropertyValue(value, fieldName?)` + citation branch; call site line 160 passes `k` |
| `innfo-core/src/validator/workspaceSources.ts` | Modify | Import `SOURCE_FIELD_NAMES` instead of redeclaring |
| `innfo-core/src/recursiveParser/normalize.ts` | Modify | Same import |
| `innfo-core/src/mutate.ts` | Modify | `addElement` propagates `args.sources`; `LEVEL2_ONLY_OPS` gate in `runMutation` |
| `innfo-core/src/workspace/discoverModels.ts` | Modify | Extract + export `isDiscoverableModel` |
| `innfo-core/src/helpers.ts` | Modify | `collectModels` reads frontmatter for `_NN.md` candidates, filters via `isDiscoverableModel` |
| `innfo-core/src/validator/content.ts` | Modify | `conv-wikilinks` (line 403-430) bypass, mirroring `references.ts:210-225` |
| `innfo-core/src/validator/model-checks.ts` | Modify | `checkTemplateDocumentation` aggregation |
| `innfo-mcp/src/tools/init-model.ts` | Modify | Scaffold placeholders (line 39-56) + failure payload shape |
| `innfo-mcp/src/tools/validate.ts` | Modify | `TEMPLATE_CACHE_STALE` message/promptHint (line 530-531) |

H4 detail: reuse the exact `references.ts` predicate
(`value.startsWith('[') && value.includes(']')` OR `value.includes('::')`) applied
to each wikilink's inner text, not a looser rule — the risk row demands parity,
and parity with the sibling checker is worth more than a stricter regex invented
here.

H5 gate signature (core):

```ts
const LEVEL2_ONLY_OPS = new Set(['add_concept', 'add_field', 'set_marker'])
// in runMutation, before dispatch:
if (LEVEL2_ONLY_OPS.has(op) && model.frontmatter.level !== 2) {
  return { success: false, errors: [{ path: 'frontmatter.level',
    message: `Operation "${op}" authors template primitives and is only valid on a level-2 template; this document is level ${model.frontmatter.level ?? 'unset'}. Use add_element/update_field on a level-3 model, or target the parent template.` }] }
}
```

## Testing Strategy and Per-Commit Verification

No `AGENTS.md` exists under either package; the de-facto convention is Vitest with
two homes — `src/*.spec.ts` for pure units next to their module
(`sourceRef.spec.ts`, `mutate.spec.ts`) and `tests/*.test.ts` for
scenario/integration suites. New tests follow the home of the module they cover.
Tests are written BEFORE the fix (red first) — each new test must fail against
the current worktree for the documented reason, then pass.

Fast loop (from `iNNfo/packages/innfo-core` or `iNNfo/packages/innfo-mcp`):
`npx vitest run <file>` then `npx tsc --noEmit`. Full gate before every real
commit: `npx vitest run` + `npx tsc --noEmit` in BOTH packages, expecting
innfo-core 706+N passed / 1 skipped / 1 known failure
(`tests/metrics-console-harness.test.ts`) and innfo-mcp 263+N passed.

| # | Commit | Test written first | Fast verification |
|---|---|---|---|
| 1 | H4 conv-wikilinks bypass | `tests/workspaceReferences.test.ts` — add: valid `[[Model :: Element]]` yields no `conv-wikilinks` warning; invalid qualified ref yields the `workspaceReferences` diagnostic, never `N undefined reference(s)`; a plain broken `[[Ghost]]` still warns | `npx vitest run tests/workspaceReferences.test.ts` |
| 2 | H5 level gate | `src/mutate.spec.ts` — the 3 ops on a `level: 3` fixture return `success: false` with a level-explicit message and leave the model byte-identical; the same ops on the existing `level: 2` TEMPLATE fixture still pass | `npx vitest run src/mutate.spec.ts` |
| 3 | H6 discovery predicate | `tests/helpers.test.ts` — a temp tree with one `_NN.md` level-3 model, one `_F.md` fixture, one README, one level-2 `spec_NN.md`: only the model is returned, `root` still honored. Plus `tests/reconcile-manifest.test.ts` must stay green (proves the extraction is behaviour-preserving for reconciliation) | `npx vitest run tests/helpers.test.ts tests/reconcile-manifest.test.ts` |
| 4 | H2+H3 citation round-trip | (a) `src/mutate.spec.ts` — `add_element` with `sources` persists the field; (b) `src/sourceRef.spec.ts` — `SOURCE_FIELD_NAMES` export parity; (c) `tests/source-citations.test.ts` — parse→serialize→parse byte-identical for `sources` (array, scalar, empty, comma-containing fallback) AND for `options`/`values`/`applies_to`/`target_concepts` (proving zero drift on non-citation fields); (d) corpus round-trip over `iNNfo/specs/templates/**/samples/*_NN.md`; (e) a deliberately malformed citation yields `KU_MALFORMED` via `validateWorkspaceSources` | `npx vitest run tests/source-citations.test.ts src/mutate.spec.ts src/sourceRef.spec.ts tests/workspaceSources.test.ts` |
| 5 | H1 scaffold | innfo-mcp `tests/` — invariant test: for `business` and `blank`, `initModel` output validates clean against its own template and the file EXISTS after the first call; a forced failure returns no `filePath`/`content`. Update scaffold snapshots deliberately | `npx vitest run tests/<init-model test>` (innfo-mcp) |
| 6 | H7 stale-cache hint | innfo-mcp `tests/` — the `TEMPLATE_CACHE_STALE` warning's `message` and `promptHint` both name `check_workspace`, and no longer instruct manual `specs/` surgery | `npx vitest run tests/<validate test>` (innfo-mcp) |
| 7 | H8 doc aggregation | `tests/` (innfo-core) — a template with N undocumented concepts yields exactly ONE warning carrying the count and the list; error/validity semantics unchanged | `npx vitest run tests/<model-checks test>` |

Commit 4 is the only one where a fast pass is insufficient: its full-suite run is
the mandatory round-trip guard from the proposal's Risks table.

## Migration / Rollout

No migration. No persisted state, no schema change, no public API break —
`serializePropertyValue` is module-private and its new parameter is optional.
Per-commit `git revert`; commit 4 is the single revert point for serializer
blast radius.

## Open Questions

None blocking. H2's scope question is resolved above by trace, not assumption.
