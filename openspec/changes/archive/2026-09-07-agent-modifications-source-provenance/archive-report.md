# Archive Report: Agent Modifications Source Provenance (2026-09-08)

**Archived**: 2026-09-08
**Mode**: openspec
**Status**: `success` — **intentional-with-warnings** (stale-checkbox reconciliation)

## Archive Classification

Archived as **intentional-with-warnings**: the `tasks.md` checkboxes were
unchecked at archive time (reconciled to `[x]` during archive), and the two
PowerShell integration harnesses (`test:integration`, `test:promotion`) were
never executed in-session — there is no `pwsh` on the authoring host and
neither script is wired into `.github/workflows/ci.yml`. The work itself is
fully implemented, merged to `main` (PR #75, merge `201c882`), and green on
`main` CI (`spec-integrity`, `verify`, `quality`, `deploy-pages`). The Node
lifecycle test (`test/unit/test-conversations-lifecycle.js`, 47 assertions)
covers the promotion contract that `test:promotion` re-checks.

## Change Summary

Made every successful agent mutation on an iNNfo model traceable and citeable,
and formalised "a Model is a first-class Source".

- **`innfo-core`** — new pure, side-effect-free `buildAgentModificationBlock(op, args, ctx)`
  in `src/agentModification.ts`. Deterministic `scope` / `change` / heading slug
  from `(op, args)`; fixed key order
  `scope, change, rationale, approved_by, model, [version_transition], model_version, timestamp`;
  `rationale:: _` marker when the caller supplies none (never omitted);
  `approved_by` defaults to `agent`; returns `null` for `add_marker` / unknown
  ops. Re-exported from `src/index.ts` and `src/browser.ts`. 11 unit tests.
- **`innfo-mcp`** — `ApplyChangeResult` gained optional `modification?: string`,
  populated on both success paths (general mutation and `bump_version`, which
  also records `version_transition:: <from> → <to>`); absent on every failure.
  `bumpVersion` gained an `id` parameter and captures the pre-mutation version.
  `apply_change` accepts pass-through `rationale` / `approved_by` args. 4 new
  integration tests in `mutate.spec.ts`.
- **`nn-innfo` SKILL.md (V_0-3-0)** — §5 mandates pasting the returned
  `modification` block verbatim under `## NN Agent Modification: <slug>` and
  replacing the `rationale:: _` marker at paste time; §8d threads the
  change-preview rationale + `approved_by: "user"` into `apply_change`; §4
  formalises `models/<path>.md#<slug>` as a first-class citation target plus the
  H1/H2/H3 heading-level convention; §0 promotion prompt reduced to `[full]` / `[none]`.
- **`nn-trannsform` (V_3-1-0)** — `_summary.md` promotion retired:
  `PROMOTION_OPTIONS` = `[full]` (Recommended) + `[none]`; `promoteConversation`
  drops the summary/both branches; the raw transcript is always registered.
  `citations.md` documents Models as citation targets, the artifact → model →
  source chain, and the heading-level convention. `test-conversations-lifecycle.js`
  rewritten for the two-option contract (47 pass); new `test-promotion-e2e.ps1`
  + `test:promotion` npm script.

Workstream B (Model as first-class Source) needed no parser/validator/`transformer.js`
code change — `parseSourceRef` and `validateWorkspaceSources` already resolve
`models/…`; it is now formalised in the two skills and the `document-citations` spec.

## Spec Deltas Merged into `openspec/specs/`

- `agent-modification-provenance` — **created** (4 requirements: block builder,
  canonical field contract, success-result block, nn-innfo verbatim-paste mandate).
- `document-citations` — **created** (4 requirements: Model as first-class citation
  source, uniform block identifier, artifact citations may target Models,
  heading-level convention).
- `conversations-lifecycle` — **modified** (Interactive Transcript Promotion Prompt:
  `[full]` / `[none]` only).
- `source-normalization-pipeline` — **modified** (multi-subtree scanning example;
  Conversation Transcript normalization no longer requires a `_summary.md` branch).

## Verification

- `npm --prefix iNNfo/packages/innfo-core test` → 426 (11 new)
- `npm --prefix iNNfo/packages/innfo-mcp test` → 195 (4 new)
- `npm --prefix iNNfo run test` (workspace) → 630
- `npm --prefix actioNN/skills/nn-trannsform run test` → 284 (47 lifecycle)
- `main` CI after PR #75 + #76 → all jobs green
- `openspec validate 2026-09-07-agent-modifications-source-provenance` → valid

## Not Verified

- `npm --prefix actioNN/skills/nn-trannsform run test:integration` (pwsh)
- `npm --prefix actioNN/skills/nn-trannsform run test:promotion` (pwsh, new)

Both require PowerShell (absent on the authoring host) and are not in CI.
Recommend running them on a Windows runner, or wiring `test:promotion` into
`ci.yml` alongside the existing node suites.
