# Proposal: Tag-Driven Release Follow-ups

## Intent

The tag-driven release rollout completed: all four canary keys (`innfo-console`, `blueprints`, `skills`, `innfo-mcp`) were released through the new workflow, and the parent change was archived as `openspec/changes/archive/2026-10-02-tag-driven-release/`.

A post-rollout audit surfaced three follow-ups. None blocks releases today. Each is either a **spec/implementation divergence** or an **unverified reproducibility gap**. This change records them with evidence so they are deliberately closed, not lost.

## Findings

### F1 - The post-publish smoke test is advisory while the spec requires it to gate

- **Spec (source of truth):** `openspec/specs/tag-driven-release-workflow/spec.md`, "Staged validation and post-publish smoke test": *"A failing smoke test MUST fail the job and block the release from being reported as deployed."*
- **Implementation:** `.github/workflows/release.yml` step `Run Post-Publish Smoke Test (advisory)` sets `continue-on-error: true` (commit `b9f87555`, "make post-publish smoke test advisory (non-blocking)"). A failing smoke leaves the job green.
- **Consequence:** a release can be reported green with a failing live smoke test. The spec's guarantee is not enforced.
- **Decision needed:** either
  - **(a)** align code to spec: make the smoke gate the job again (the spec already tolerates CDN lag with a 30 s / 15 min poll and a convergent re-run), or
  - **(b)** align spec to code: a delta spec MODIFIED requirement that documents the smoke as advisory, with the rationale (live smoke depends on GitHub API auth and CDN propagation).

### F2 - One tag push produced two identical release runs

- **Evidence:** `gh run list --workflow release.yml` lists runs `36999574864` and `36999575415`, both `event=push`, `ref=skills-v2.11.0`, `attempt=1`, `headSha=cfc7a43c...`, created at the same second. Both succeeded. Idempotency held: `cogNNitive-web` holds exactly one `release(skills): update manifest for skills-v2.11.0` commit for the pair.
- **Consequence:** today the duplicate is serialized by the `concurrency` group and harmless. The cause is unknown; a future non-idempotent stage could double-publish.
- **Investigate:** GitHub duplicate delivery vs a second trigger source (`on:` config, an actor re-tagging, annotated-tag object semantics).

### F3 - Local `verify.js` has three environment-only failures that CI does not see

Reproducible at base commit `cfc7a43c` in **both** the primary checkout and a session worktree while push-to-main CI is green:

| Suite | Local symptom | Read |
|---|---|---|
| `scripts/export-console.test.mjs` (Phase 4) | Exported HTML `config.runtime.cdn` resolves to `@innfo-console-v0.6.0`, while the vendored bundle banner and `console/package.json` are `0.7.3`. | **Possibly a real latent bug masked by CI** (a stale bundle the CLI resolves, e.g. a fixture) - highest signal, investigate first. |
| `skills/nn-preflight/scripts/preflight-check.test.js` | Fails on a `visual-catalog.md` matrix blocker; that file does not exist in the worktree. | Test reads an external watch root; environment leak. |
| `scripts/build-trannsform-core-mirror.mjs --check` | Reports drift in the worktree, but `OK` in the primary checkout. | `node_modules` junction resolves a stale core build; environment. |

- **Consequence:** `node scripts/verify.js` is not green locally, which erodes the local gate's signal and hides a possible real defect behind "known env failures".

## Scope

### In Scope
1. Record F1, F2, F3 with the evidence above.
2. F3/export-console: root-cause and classify (real bug vs environment); fix if real.
3. F1: choose (a) or (b) and implement it (code change or delta spec).
4. F2: root-cause or dismiss with evidence.

### Out of Scope (non-goals)
- Re-releasing any key.
- Changing the stable manifest shape or the release procedure.
- The other unarchived `openspec/changes/*` folders (owned by other sessions).

## Capabilities

### Modified Capabilities
- `tag-driven-release-workflow`: the "Staged validation and post-publish smoke test" requirement, **only if** F1 option (b) is chosen. If (a) is chosen, the code changes and the spec stands.

## Approach

Close in signal order: **F3/export-console** (may be a real bug), then **F1** (small spec reconciliation), then **F2** (investigation). Each resolved item lands as its own reviewable work unit; any item that is deferred is archived with a one-line disposition.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Restoring a blocking smoke test (F1a) reintroduces CDN-propagation flakiness | Med | The spec's poll window (15 min) and convergent re-run already cover lag; confirm with a rehearsal run before merging. |
| F3/export-console is misclassified as "environment" and a real defect ships | Med | Prove it by regenerating the bundle in a clean checkout and re-running the suite; compare with CI's clean `npm ci` path. |
| F2 duplicate runs are non-idempotent in a future stage | Low | Document the invariant; add a duplicate-run assertion to the release rehearsal procedure. |

## Success Criteria

- [ ] F1 resolved: the smoke either gates per spec, or the spec explicitly documents it as advisory with rationale.
- [ ] F2 root-caused, or dismissed with recorded evidence.
- [ ] F3 each failure classified (real bug vs environment); real ones fixed, environment ones documented as such.
- [ ] `node scripts/verify.js` is green locally on this machine, or every remaining local failure is documented as environment with proof.
