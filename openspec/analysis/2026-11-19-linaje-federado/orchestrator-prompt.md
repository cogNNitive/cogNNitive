# Orchestrator brief — linaje federado

Review folder: `
#  role           model                        provider      key
1  analyst        GPT-6 Luna                   opencode-go   luna
2  analyst        DeepSeek V4.1 Flash          opencode-go   deepseek
-  consolidator   Gemini 3.8 Flash             opencode-go   orchestrator
`
Slug: `linaje-federado`
Analyzed SHA (BASELINE): `5bd09ded`
Date: `2026-11-19`

## Target

Not a code corpus in the usual sense: the target is a **design proposal**
(`dominant-design.md`, plus `SUMMARY.md` for the scenario), judged against the code it
describes. The code files in scope are the ones the design touches:

| Path | Lines |
|---|---|
| `iNNfo/packages/nn-core/src/sync/refresh.ts` | 300 |
| `iNNfo/packages/nn-core/src/sync/address.ts` | 45 |
| `iNNfo/packages/nn-core/src/sync/declarations.ts` | 67 |
| `iNNfo/packages/nn-core/src/sourceRef.ts` | 768 |
| `iNNfo/packages/nn-core/src/lineage/project.ts` | 497 |
| `iNNfo/packages/nn-core/src/cognitivize/cognitivize.ts` | 161 |
| `iNNfo/packages/nn-core/src/validator/workspaceSources.ts` | 610 |
| `iNNfo/packages/nn-core/src/validator/workspaceReferences.ts` | 400 |
| `iNNfo/packages/nn-mcp/src/tools/validate.ts` | 1249 |
| `iNNfo/packages/nn-mcp/src/tools/change-args.ts` | 233 |

Plus the specs and docs named in `README.md`. Everything else is out of scope.

## Roster (frozen after maintainer confirmation)

```
#  role           model                      provider      key
1  analyst        GPT-6 Luna                 opencode-go   luna
2  analyst        DeepSeek V4.1 Flash        opencode-go   deepseek
-  consolidator   Gemini 3.8 Flash           opencode-go   orchestrator
```

Two analysts confirmed by the maintainer (a third was proposed and dropped).

`single_provider_panel: true` — every model is served through the one provider this
session exposes (`opencode-go`). The verdict is therefore **not multi-provider**: the
cross-critique phase still catches factual errors, but it cannot rule out a shared-serving
bias. This must be stated in every report and in the consolidation.

Estimated cost: ≈$0.35 list price at 2026-11-19 rates (not measured — the run does not
instrument token spend).

## Rules every analyst carries

- Scope: the files above. Everything else is out of scope.
- Evidence: every finding needs a `code_ref` the analyst actually read, as `path:line`.
  `evidence:: verified | inferred | unverified`.
- YAGNI: do not invent problems to fill a quota. 5 to 12 findings. Flag over-engineering.
- Write **only your assigned file**, in this one worktree. Never write or edit another
  analyst's report. One owner per file.
- **No worktree of your own, no skill loading, no `AGENTS.md` session ritual.** The panel
  stays in this single checkout.
- Write the report section by section. One huge single write times out on slow models.
- UTF-8 without BOM, LF line endings.
- Last line of the reply: the relative path, the model actually run, and the SHA.

## Forbidden

- `git checkout`, `git reset`, `git stash`, `git clean`, `git branch -D`
- editing anything outside `temp/analysis/linaje-federado/`
- running a full `npm run verify` (slow); focused suites only

## Phases

1. `independent-analysis-<key>.md` — nobody reads another report.
2. `cross-critique-<key>.md` — fresh thread, one critique per foreign finding, new findings
   numbered `N1`, `N2`…
3. `consolidated-plan-and-verdict.md` — orchestrator only.
