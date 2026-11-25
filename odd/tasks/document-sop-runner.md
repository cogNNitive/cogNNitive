# Document SOP Runner pilot

Branch: `session/document-sop-runner` · Delivery: `ask-on-risk` · Verification: Node MCP integration probe, procedure gates.

## Specs

- S1. «Creo que sería buena idea implementar al 100% correcto y compliant con el proceso de runner este procedimiento, luego ejecutarlo para algún nuevo SOP y así podríamos probar que todo el flujo funciona antes de continuar con los otros procedimientos». Adapt Document SOP. In a disposable domaiNN, run a new SOP through the public MCP tool boundary, exercise rejection or rework and approval, verify the final model and observe persisted completion.
- S2. «adelante con esto». After the pilot passes, resolve coNNtent usage start and make consequential approvals and relevant output checks explicit without changing shared Runner behavior unnecessarily.
- S3. «Corrige esto, a lo mejor en una sesión nueva, ¿no crees?». Verify the manifest field meaning and handle its version correction separately from procedure behavior.

## Tasks

- [x] T1 / S1 / inline / `3fcf0a983` / observed RED/GREEN and persisted completion.
- [x] T4 / S1 / delivered in PR #853 / native required-output gate in `procedure_record` (`MISSING_OUTPUT`). RED then GREEN; 65 runner-suite tests and `tsc --noEmit` clean.
- [ ] T2 / S2 / pending delivery strategy before next commit / preserve six authored workflows and improve consequential gates and output checks.
- [ ] T3 / S3 / separate delivery / confirm installer consumer semantics and verify metadata.
- [ ] T5 / S1 / resumability, duplicate draft reconciliation, and the final choose-to-send-or-register handoff; nothing writes to the canonical domaiNN before that choice.

## Log

- L1: «adelante con esto»; «Corrige esto, a lo mejor en una sesión nueva, ¿no crees?»; «Creo que sería buena idea implementar al 100% correcto y compliant con el proceso de runner este procedimiento, luego ejecutarlo para algún nuevo SOP y así podríamos probar que todo el flujo funciona antes de continuar con los otros procedimientos».
- Baseline `fb754586a`; isolated thread worktree verified. No remote operations or publishing. Pilot gates further procedure edits.
- T1 RED: public MCP accepted an invocation missing intake and output. GREEN: `node --test test/document-sop-runner.test.mjs`; rejected scope created no SOP, unverified output refused advancement, inventory SOP validated with zero diagnostics, completed run persisted, and new SOP started. The three procedure gates, their 10 tests, `npm run typecheck`, and `git diff --check` passed. RDD globally off.
- T2 forecast: the pilot uses 305 authored changed lines; preserving and retesting the coNNtent entry point plus the business gates takes the branch past about 400. Existing coNNtent tests pin its six workflows. No T2 edits made.
- T3 confirmed: `generate-manifest.js` prefers an explicit override; its fallback reads `blueprint_version`. No T3 edit made.
- Continuation at `a7beaca59` (2026-11-24): preserved the inherited stepper, CSS, and test changes and the untracked ECharts logbook. The public MCP pilot and console regression command (`node --test test/console-procedure-runner-ux.test.mjs test/document-sop-runner.test.mjs`) passed all 23 tests. This is not proof of a connected private draft: the existing pilot completes scope without recording its output and tests only the later validation transition. Engram #3598 and the ECharts logbook both keep required Runner outputs, draft reconciliation, resumability, and final handoff open. Work order: private SOP first (including isolated Playwright and public MCP proof), then ECharts, then coNNtent/audit, then separate manifest correction.
- T4 (native required outputs, 2026-11-24): `procedure_record` now refuses `complete` and `finish` with `MISSING_OUTPUT` when a step's (or the walked path's) artifact is declared required and was never recorded `validated`. The gate runs before transition selection so the actionable reason wins over an unrelated transition code, and it writes nothing on refusal. Optional artifacts (`required:: false`) never gate; artifacts the fold marks `not_required` (off the walked path) are never asked. Engine steps (`action: run`) fail with the same reason instead of silently passing. Verified: 65 runner-suite tests, `tsc --noEmit` clean, `prettier --check` clean. Delivered as PR #853 (commits `fb6f0e4a8`, `bea84d04d`), 5/5 CI checks green. The shared runner fixtures declare `required:: false` so transition, fence and loop tests still test what they name.
- Stepper handoff (2026-11-24): the stepper/CSS/test work was excluded from #853. `main` advanced 40 commits and four console PRs (`e73da0e99`, `6fad25412`, `b0ca7c0d4`, `67c1993d7`) plus `96b72a3ae` rewrote the console, so the inherited stepper conflicts head-on and must be redone against current code, never resurrected. It lives in stash `gate+stepper`. The pilot test depends on the SOP `V_0-3-0` with typed slots, which `main` never received (it has `V_0-2-0` with no slots block); the SOP and the pilot travel together with the stepper package.
- L2 (2026-11-25): «Abordemos esto en una o dos sesiones distintas». This session owns the runner half: `state.attempts` and T5. Branch `session/runner-attempts-t5`, stacked on PR #865.
- T5 (2026-11-25), private run end to end. Resume, replay reconciliation and the handoff record were already in place (`import-console-reconcile.test.ts`). A real run exposed three gaps on the person's side, now closed:
  - G1: a completed run waiting on its handoff was not the person's turn, so the reopened console showed another procedure with "No run selected". The inbox now lists a completed run with a human step done and no handoff chosen.
  - G2: the export never carried `executions/<run>/handoff.json`, so a recorded choice was offered again and a different pick hit `HANDOFF_CONFLICT`. The export now carries it, and the card shows "Handed off: … (recorded by …)" with no choices.
  - G3: closing a run is never a Step Request. When the person's answer finished the last step, nothing told the agent to record `finish`, so the run never reached `completed` and the choice never appeared. `import_console` now returns `ready_to_finish` and a notice line.
- T5 evidence, both outside the repository, in a scratch directory:
  - The real `nn-mcp.bundle.js` over stdio.
  - `playwright-core` 1.55.0 driving installed Chrome with one persistent profile.
  - The sequence: answer the decision → save (download) → import → replay the same file (all `duplicate`, seq unchanged) → agent publish + finish → reopen the regenerated console in the same profile, which opens on "r1: Hand off this run" → choose "Register with the agent" → save → import (old answers `duplicate`, handoff `recorded`, then `duplicate` on replay) → reopen, which shows "Handed off: Register with the agent (recorded by ana, …)" with no choices and an empty inbox.
  - The canonical snapshot (everything outside `executions/`, `changes/`, the manifest and the console) was byte-identical at every step, the handoff included. No page errors.
- Not covered here: a private run cannot record an artifact. `artifact` is not a request action, so a human step with a required output still needs the agent (`MISSING_OUTPUT`).
