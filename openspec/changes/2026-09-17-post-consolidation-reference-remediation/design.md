# Design: Post-Consolidation Reference Remediation

## Why `scripts/verify.js`, not a new CI job

`scripts/verify.js` is the repository's deterministic verification runner —
the same script CI's push-to-main job and local pre-push both invoke. It
already runs one skill test suite:

```js
run('node skills/nn-preflight/scripts/preflight-check.test.js', 'Test Preflight Workspace Freshness');
```

That line proves the seam already exists: `skills/` suites are plain
zero-dependency Node scripts (repo convention — no external test framework,
see `skills/nn-workspace-git/test/skill-contract.test.js` header comment),
each runnable with a bare `node <path>` and each exiting nonzero on failure.
`verify.js`'s `run()` helper already treats a nonzero exit as a hard failure
(`process.exit(1)`), so no new plumbing is needed — only two more `run()`
calls.

Adding a separate `.github/workflows/ci.yml` job was considered and rejected:
it would duplicate the exit-code-checking logic `run()` already provides, it
would run on GitHub's schedule instead of locally at pre-push (so a
developer could still push a broken skill suite and only find out after CI
ran), and it would leave `scripts/verify.js`'s own doc comment
("Deterministic workspace verification runner for cogNNitive tooling")
inaccurate — the runner would no longer be the single source of truth for
"is this workspace green." Extending the existing gate keeps one place to
look.

## Placement and ordering

The two new `run()` calls go immediately after the existing
`skills/nn-preflight` line (current step 5), as a new step 5b, before the
preflight-primitives drift guard (step 6). Rationale:
- Keeps all `skills/` suites adjacent in the script, so the next skill added
  to the repo has an obvious insertion point.
- Runs before the drift-guard and manifest-freshness checks (steps 6-8),
  which are about generated-artifact staleness, not skill correctness — skill
  suite failures are a different failure class and should surface first.
- Does not reorder or touch steps 0-5, which have their own documented
  ordering constraints (e.g. step 0b explicitly predates step 1, step 5
  explicitly predates step 6).

## Residual gap: Playwright e2e stays ungated

`.github/workflows/ci.yml` runs Vitest only; Playwright specs under
`iNNfo/apps/innfo-editor/e2e/` (including `16-innfo-console.spec.ts`, one of
the three dangling references this change fixes) are not executed by any
automated gate today. Wiring Playwright into CI is a materially larger
change — browser provisioning, CI runtime cost, flake handling — and is out
of scope here. This change fixes the one broken `require()` path inside that
suite (so a human running it locally gets a working suite, not a load-time
crash) and documents the gap in the `quality-gates` delta spec rather than
silently leaving it undiscoverable.

## `nn-trannsform` PowerShell layer: not a regression

`skills/nn-trannsform/test/run.js` intentionally skips its PowerShell
integration layer when invoked through the Node test runner — this is
existing, documented behavior (see `skills/nn-trannsform/TESTING.md`), not
something this change introduces or must fix. Wiring the suite into
`scripts/verify.js` runs it exactly as `node skills/nn-trannsform/test/run.js`
already runs it standalone: 451 assertions execute, the PowerShell layer is
skipped, and the gate accepts that as a pass. No behavior change to the suite
itself.
