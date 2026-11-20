# Handoff — federated lineage: trace from a coNNtent unit to an intake article

Implementation start point. Read this file first, then the review it points at.

## The requirement (maintainer's words)

> "Lo que me importa es que el modelo content pueda rastrear el artículo original de intake
> y llegar a él. El pantallazo lo saca content."

Target chain, all three domains local:

```
coNNtent unit  →  (mirror) AI_stack element  →  its evidence  →  intake resource/article
```

**In scope:** `read_lineage` in a consumer domaiNN must be able to walk from one of its units,
through a mirrored element from a synchronized domaiNN, to the upstream evidence recorded in
the origin.

**Out of scope:** asset/byte transport. Getting the article image into coNNtent is not part of
this. Do not implement it, do not block on it, and do not let it widen the design.

## Where the analysis lives

`openspec/analysis/2026-11-19-linaje-federado/` — read in this order:

1. `PROVENANCE.md` — roster, deviations, and the four claims that were disproved
2. `consolidated-plan-and-verdict.md` — **D1, D2, D7 and D10 are the operative decisions**
3. `independent-analysis-deepseek.md` and `independent-analysis-luna.md` — raw phase-1 output
4. `cross-critique-*.md` — raw phase-2 output

Do not re-litigate the review. It is settled. Implement D7.

## The build order (D7, as corrected by D10)

### Step 1 — Wire the dormant evidence-drift resolver (no contract change)

`checkProvenance` accepts a `sha256` resolver (`iNNfo/packages/nn-core/src/changelog/drift.ts:31`)
and silently skips the whole comparison when it is absent (`drift.ts:190`). The workspace
caller never supplies one (`iNNfo/packages/nn-mcp/src/tools/validate.ts:422-443`, which calls
`checkProvenance(log, models)` with no options). `apply_change` already stamps
`evidence_sha256` per evidence file (`iNNfo/packages/nn-mcp/src/tools/apply-change.ts:575,
3045`, persisted at `:1545`).

Wire the resolver. Verify that `EVIDENCE_SOURCE_CHANGED` actually fires on an edited evidence
file. This step is cheap and proves the mechanism before the contract work in step 2.

### Step 2 — One mirror parser/resolver shared by references and evidence

This is the real change and the high-risk item. Two facts drive it:

- `parseSourceClass` routes every `sources/`-prefixed path to `{kind:'source'}`
  (`iNNfo/packages/nn-core/src/address/parse.ts:42-66`), so `MODEL_CITED_BY_PATH` never fires
  for a mirror path. The design's original explanation was wrong.
- `parseCitation` then reads `.md@<slug>` as a heading-unit citation and rejects it before any
  resolver runs (`iNNfo/packages/nn-core/src/sourceRef.ts:604-637`;
  `iNNfo/packages/nn-core/src/console/citations.ts:226-235`).

So the fix is **parser plus resolver**, not a grammar tweak. Reference fields already do this
correctly through the mirror lookup (`validator/workspaceReferences.ts:164-221, 231-243`);
source/evidence validation does not get that lookup (`tools/validate.ts:358-371`). Unify them.

### Not in this handoff

- `domain_id` — deferred. Trigger: cross-machine identity, or an origin rename that must stay
  attributable.
- Persisted revision lock — deferred. Its honest justification (deepseek N2) is that the
  existing stamp hashes the *consumer's copy*, which a refresh replaces; that only matters once
  mirror evidence is legal, so it is a follow-up to step 2, not a prerequisite.
- Lineage bundle export — deferred. Trigger: provenance must be answerable while the origin is
  offline, moved or renamed. Export policy must be specified first (D5).

## Environment notes for the implementer

- Work in a session worktree (`nn-dev-development` §1), never in the primary checkout.
- `git rev-parse HEAD` at the branch point of the review was `5bd09ded`. Line numbers in the
  analysis hold for that SHA; check `git diff 5bd09ded HEAD -- <file>` before trusting one.
- The worktree created for the review had a broken `nn-core` build (`tsc` not found after the
  session link). If the same happens, fix the toolchain before running tests.
- Lane: this touches a validation contract that `nn-core`, `nn-mcp` and the console consume.
  Under `nn-dev-development` §2 that is **heavy**: it needs a delta spec at
  `openspec/changes/<slug>/specs/<capability>/spec.md`.
- Tests to extend: `iNNfo/packages/nn-core/tests/sync-mirror-references.test.ts`,
  `iNNfo/packages/nn-core/tests/validateCitations.test.ts`,
  `iNNfo/packages/nn-mcp/test/domain-synchronization.e2e.test.ts`.

## Two deviations to be aware of, not to repeat

1. An analyst wrote a throwaway test outside its allowed surface. Do not write outside the
   paths your task names.
2. A model claimed a `refresh.ts:42` lock hook that does not exist. If a claim about current
   behaviour matters, read the line.

## Key Learnings

1. `fs-snapshot.ts` excludes `sources/sync`, so mirrors never enter a domaiNN's own lineage snapshot.
2. `evidence_sha256` is already stamped at apply time; only the drift resolver wiring is missing.
3. `parseSourceClass` routes all `sources/` paths to source kind, so the mirror rejection happens later, in `parseCitation`.
4. `refresh.ts:255` writes the declared `origin_uri` unresolved, which is an existing defect rather than a design gap.
