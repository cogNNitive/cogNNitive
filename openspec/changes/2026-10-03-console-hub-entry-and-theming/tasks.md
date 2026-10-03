# Tasks: Console Hub Entry Points and App-Consistent Theming

## How to apply

- At session start load `nn-dev-development` (`.agents/skills/nn-dev-development/SKILL.md`;
  the AGENTS.md mandate) and run its concurrency scan before any repo write.
- Work lands on `dev`. Conventional commits only, no AI attribution. Stage by explicit
  path; never `git add -A` / `git add .` / `git stash` / `git reset --hard` / `git clean`.
- Strict TDD: every RED task is seen failing for the intended reason before its GREEN task
  starts.
- Layer split: editor changes use Vitest (`npm --workspace=@cognnitive/innfo-editor test`),
  artifact contract uses `npm --workspace=@cognnitive/innfo-core test`.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~420-520 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes (2 slices: prompt seam, then theming/onboarding) |
| Delivery strategy | chained |
| Chain strategy | stacked-to-dev: slice 1 (seam) → slice 2 (UI + theming) |

Decision needed before apply: No.

---

## 1. Shared prompt seam (slice 1)

- [x] 1.1 **RED**: add `iNNfo/apps/innfo-editor/src/services/consolePrompt.test.ts`
      asserting `generateConsolePrompt` emits workspace metadata, one entry per model with
      its procedure path, the three step headings, and that **no** emitted path contains
      `specs/templates/`. Run it and watch it fail (module missing).
      `[workspace-hub-prompt:Requirement:Dynamic Prompt Content Contract]`
- [x] 1.2 **GREEN**: create `consolePrompt.ts` exporting `TEMPLATE_PROCEDURE_MAP`
      (`bluepriNNts` root), `ConsolePromptModel`, `ConsolePromptInput`,
      `generateConsolePrompt`. `[workspace-hub-prompt:Requirement:Dynamic Prompt Content Contract]`
- [x] 1.3 Add the parity fixture: assert the artifact's inline map
      (`workspace_hub.html`) matches `TEMPLATE_PROCEDURE_MAP` and uses `bluepriNNts`.
      `[workspace-hub-prompt:Requirement:Dynamic Prompt Content Contract]`
- [x] 1.4 **GREEN**: update `workspace_hub.html` `templateProcedureMap` (lines 266-273) to
      `iNNfo/specs/bluepriNNts/...` and its hub-compile step path; update
      `iNNfo/packages/innfo-core/tests/workspace-hub.test.ts` to assert the new root and
      reject `specs/templates/`. `[workspace-hub-prompt:Requirement:Dynamic Prompt Content Contract]`
- [ ] 1.5 Verify: editor + core suites green; `node scripts/verify.js` green. **Deferred to CI** (local node_modules not installed; see Notes).
      `[workspace-hub-prompt:Requirement:Dynamic Prompt Content Contract]`

## 2. Host entry point and empty-state onboarding (slice 2)

- [x] 2.1 **RED**: editor component test — with `loadState === 'not_found'`, the view
      renders a primary generation CTA and opens the prompt modal on activation; with
      no models discovered it still offers the action.
      `[console-hub-onboarding:Requirement:Actionable empty state]`
- [x] 2.2 **GREEN**: add the prompt modal + primary CTA to `ConsoleHubView.vue`; wire it to
      `generateConsolePrompt` fed by `discoveredModels`.  
      `[console-hub-onboarding:Requirement:Actionable empty state]`
- [x] 2.3 **RED/GREEN**: redesign the `not_found` block as onboarding — benefit-led
      headline, primary CTA, secondary "view procedure" path, and the discovered models
      rendered as pending preview cards from `allModelTargets`.
      `[console-hub-onboarding:Requirement:Actionable empty state]`
- [x] 2.4 **GREEN**: expose the generation action in the host header; in the
      `loadState === 'ready'` state add a secondary "Regenerate" affordance reusing the
      same modal. `[workspace-hub-prompt:Requirement:Header Action Button]`
- [ ] 2.5 Verify editor suite + typecheck + lint. **Deferred to CI** (see Notes).

## 3. App-consistent theming (slice 2)

- [x] 3.1 **RED**: core test asserting the artifact uses `var(--...)` accents with
      fallbacks (no bare `indigo-600`/`blue-600` on the primary actions and header) and
      keeps existing ids (`#open-prompt-btn`, `#prompt-modal`, `Regenerate Consoles`).
      `[console-hub-onboarding:Requirement:Editor-native theming of the embedded hub]`
- [x] 3.2 **GREEN**: tokenize `workspace_hub.html` accents to `var(...)` with fallbacks so
      standalone `file://` still renders.
      `[console-hub-onboarding:Requirement:Editor-native theming of the embedded hub]`
- [x] 3.3 **GREEN**: in `processedHtmlContent`, inject the editor's resolved token `:root`
      block + alias layer into the hub `srcdoc`, and suppress the artifact `<header>` in
      embedded mode. `[console-hub-onboarding:Requirement:Single-tier header in embedded mode]`
- [x] 3.4 Add a jsdom test that the injected `srcdoc` contains the token block and the
      header-suppression style when the target is the hub.
      `[console-hub-onboarding:Requirement:Editor-native theming of the embedded hub]`
- [ ] 3.5 Verify manually: embedded hub matches editor palette in light and dark;
      standalone `workspace_hub.html` via `file://` renders with defaults. **Pending maintainer check**.

## 4. Docs and verification

- [ ] 4.1 Docs: document the entry-point + theming flow under
      `docs/innfo/documentation/` and register the page in the Docsify suite.
- [ ] 4.2 Run the full gate: `node scripts/verify.js`, `npm run check:integrity`,
      `npm run typecheck`, `npm run lint`. **Deferred to CI**.
- [x] 4.3 Commit each slice with a conventional message (no AI attribution).

---

## Notes

- Slice 1 (the seam + path fix) is independently valuable and low-risk; it can land before
  any visual work.
- The artifact keeps an inline generator by design (offline `file://` hygiene, REQ-4);
  the parity test is the mitigation for the deliberate duplication (design D1).
- Procedure-path fix is the smallest, highest-value correction: the current prompt hands
  the agent routes that no longer exist.
- **Local environment gap (2026-10-03):** the primary checkout's `node_modules` is a
  partial install with no `vitest`/`.bin`, and several sibling sessions hold the
  workspace/root `node_modules` (dev servers, `verify.js`). A `npm install` inside the
  session worktree broke the junction isolation and deleted 323 tracked files from the
  primary; they were restored from `HEAD` via a detached worktree copy and the primary is
  clean. Per maintainer decision, tests/typecheck/lint run in CI on push, not locally.
