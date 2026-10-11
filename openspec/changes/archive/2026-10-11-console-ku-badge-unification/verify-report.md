# Verify Report: Knowledge-unit badge unification

## Scope verified

- `console-ui-kit`: `KuBadge` family (7 kinds), `KuActions`, change pip,
  `--innfo-concept-N-bg` tints; `ElementCard` name/fields as badges; `FieldRow`
  returns a `ku-badge[data-ku-kind=field]`.
- `console-payload-builder`: additive matrix `head` metadata.
- `console-review-mode`: info action always (opens the modal on the Info tab),
  change pip for pending drafts, single enlarged modal with `startTab`.
- Renderers: document title badge, matrix header/cell badges (viewer + runtime).

## Evidence

- `npx vitest run console` (innfo-core): **38 files, 255 passed, 5 skipped**
  (`console-ui-kit-ku-badge`, `-card`, `-contrast`, `-kitchen-sink`,
  `console-review-info-pip`, `console-dom`, `console-citations-dom`,
  `console-review-*`, `console-payload`).
- Root node suites: `console-element-card`, `console-review`,
  `console-view-context`, `console-draft-count-live`, `console-export`,
  `console-export-view`, `console-tabs-matrices`, `console-domain-hierarchy`,
  `console-blueprint-views` — all PASS.
- `npm run check:console-bundle` → fresh.
- `node scripts/verify.js` → 611 passed; 6 pre-existing/environmental failures in
  areas untouched by this change:
  - `skills/nn-sources/*` (4): needs the PowerShell/clean-env suite.
  - `skills/nn-upgrade/scripts/migrate-domain.test.js`: worktree junction drift.
  - `Docs-Derived Facts Drift Guard`: `iNNfo/packages/innfo-mcp/dist/server.js`
    is not built in this worktree (the primary checkout also lacks it — same
    failure on `origin/dev` base `85897c15`).

## Deviations

- `ConceptPill`/`ElementPill`/`MarkerChip` were NOT re-pointed at `KuBadge`
  (tasks 1.3 deferred). The observable contract — one badge family for data
  units, renderers composing `KuBadge` — is met additively; delegation would
  churn three components and their suites for no behavioral gain.
- The review edit affordance remains the existing review-mode controls; the new
  always-on action is **info** (in the `ku-actions` cluster). The modal is a
  single component opened on the Info or Edit tab.

## Notes

- `openspec validate` (CLI 1.2.0) reports spurious "must contain SHALL or MUST"
  errors on this and older changes alike (format mismatch); archived with
  `--no-validate` after `openspec list` showed 16/16 tasks complete.
