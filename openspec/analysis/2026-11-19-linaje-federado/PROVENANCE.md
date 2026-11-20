# Linaje federado entre domaiNNs — review provenance

**Date:** 2026-11-19
**Analyzed SHA:** `5bd09ded` (branch point, `main`)
**Session:** `session/linaje-federado`, worktree `../cogNNitive-linaje-federado`

## What this folder is

A two-analyst, single-provider design review of the proposal in `dominant-design.md`, run
with the `nn-dev-multimodel-review` skill. The proposal argues for extending
Synchronization with identity, federated evidence, a revision lock and a lineage bundle
rather than rewriting the sync and provenance layers.

**The reports below are raw model output.** They are kept verbatim, including claims the
consolidation later corrected. Read `consolidated-plan-and-verdict.md` first; treat every
other file as evidence, not as a conclusion.

## Files

| File | Author | Role |
|---|---|---|
| `dominant-design.md` | orchestrator | The proposal under review. Written before the panel; several of its claims were disproved by the panel and are corrected in the consolidation. |
| `SUMMARY.md` | orchestrator | The three-domain scenario, one page. |
| `README.md` | orchestrator | The brief and the four axes the analysts were asked to judge. |
| `orchestrator-prompt.md` | orchestrator | The frozen roster and run rules. |
| `review-panel_spec_NN.md` | skill asset | The report format contract, copied unchanged. |
| `independent-analysis-luna.md` | GPT-6 Luna | Phase 1, isolated. |
| `independent-analysis-deepseek.md` | DeepSeek V4.1 Flash | Phase 1, isolated. |
| `cross-critique-luna.md` | GPT-6 Luna | Phase 2: critiques of deepseek's findings. |
| `cross-critique-deepseek.md` | DeepSeek V4.1 Flash | Phase 2: critiques of luna's findings. |
| `consolidated-plan-and-verdict.md` | orchestrator | Phase 3: decisions D1–D9 and the verdict. |

## Roster actually run

```
#  role           model                      provider      key
1  analyst        GPT-6 Luna                 opencode-go   luna
2  analyst        DeepSeek V4.1 Flash        opencode-go   deepseek
-  consolidator   orchestrator               —             orchestrator
```

### `single_provider_panel: true`

A third analyst (Gemini 3.8 Flash) was proposed and dropped by the maintainer. Gemini 3.8
was named as consolidator role, but consolidation is the orchestrator's job under the
skill's phase contract, so no delegate wrote the verdict.

Every model that ran is served through the one provider this session exposes
(`opencode-go`). **The panel is therefore single-provider and the verdict is not a
multi-provider one.** The cross-critique phase still caught factual errors — it caught
four in the proposal — but it cannot rule out a premise shared by both models through the
same serving path. The consolidation compensates by verifying the four disproved claims
directly against code at `5bd09ded` rather than trusting consensus.

## Process deviations

1. **Luna could not write files.** The `gentle-ai-explore` agent type is read-only. Luna
   returned its findings in the reply and the orchestrator wrote
   `independent-analysis-luna.md` and `cross-critique-luna.md` verbatim from that output.
   The content is the model's; the file write is the orchestrator's. The same applies to
   luna's critique file.
2. **DeepSeek wrote a throwaway test outside its allowed surface.** To reproduce finding
   F8 it briefly created `iNNfo/packages/nn-core/tests/zz-probe-sync.test.ts` and deleted
   it immediately. Verified removed at hand-off; `git status --porcelain` was empty.
   Recorded here because the brief forbade writes outside the analyst's own report file.
3. **The worktree's `nn-core` build failed** (`tsc` not found after the session link), so
   analysts could not run the `nn-core` test suite. They read code instead. No finding in
   this round depends on a test run, except F8, which DeepSeek reproduced successfully
   under the deviation above.

## Corrections the panel made to the proposal

For traceability, the four claims in `dominant-design.md` that are **wrong** and should
not be quoted as fact:

1. The evidence hole is not caused by the `.md` extension needing a heading unit.
2. The revision lock is not missing state; `evidence_sha256` already exists and its
   comparison path is built but never wired.
3. `origin_uri` is not a design gap; it is written unresolved today.
4. Sidecar `origin_uri`/`origin_path` do not form a lineage edge.

See D1, D2 and D9 in the consolidation.

## Next step

The consolidation's D7 lists the corrected build order. Nothing in this folder has been
applied to the codebase; applying anything is a separate decision, registered through
`nn-dev-backlog`.
