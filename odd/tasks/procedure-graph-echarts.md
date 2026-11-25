# Procedure flow rendering and remaining delivery

Branch: `session/document-sop-runner`. Uses the shared ECharts chart API; no remote operations.

## Specs

- S1. «¿Está bien, implementalo?»: render the actual procedure graph through the shared ECharts chart API, retaining the native fallback.
- S2. «dime todas las tareas que tienes que hacer de esta conversación»: inventory completed and pending units.

## Tasks

- [x] T1 / S1 / inline adapter, preserves fallback; RED then 19 tests passed. Scratch export rendered real ECharts SVG in JSDOM.
- [x] T2 / S2 / conversation inventory below.
- [ ] T3 / S1 / Integrate with the separately owned ECharts runtime branch; test the combined bundle in a real browser (narrow/wide, active pulse parity, branches, selection, keyboard, accessibility).
- [ ] T4 / Autonomous draft run: isolated persisted draft, real Runner access from the UI for human and software/agent steps, resume, final review, then send to administrator or register with agent. No canonical writes before that choice; validate publication boundary end to end.
- [x] T4a / Make the standalone start handoff explicit: RED one assertion failed, GREEN 19 tests passed; rebuilt and smoke-tested scratch HTML. No live browser-to-Runner transport added.
- [x] T4b / Follow the next recorded step after selecting the active node; keep manual inspection of a different node. RED transcribe stayed open; GREEN 20 tests passed.
- [ ] T5 / coNNtent usage: preserve guidance and expose individually runnable procedures; fix slot metadata.
- [ ] T6 / Audit follow-up: add consequential outcome branches and selective output verification to audited procedures; test via public API. No global rewrite.
- [ ] T7 / Separate manifest correction: procedures blueprint override V_0-3-2 -> V_0-6-1, verify generator/distribution metadata.
- [x] Prior / structural audit of 32 documents, per-procedure recommendations; actual Document SOP Runner pilot; guided typed start form; definition and run presentation, interactive simulations.

## Log

- L1: ¿Está bien, implementalo? y dime todas las tareas que tienes que hacer de esta conversación.
- RED: shared chart API not called. GREEN: graph links, graph selection, disposal, legacy SVG, and SOP MCP pilot; 19 tests. Actual ECharts scratch export rendered in JSDOM using the local spike vendor and a minimal scratch-only renderChart bridge. Nothing published.
- T3 progress: combined the real spike runtime and current stepper in a temporary tree (no branch merge or remote). Build and freshness check passed. Actual exported HTML loaded ECharts and rendered the SOP SVG via production renderChart in JSDOM without JS errors. Added a current-node halo and reduced-motion CSS; 19 regression tests pass. Real-browser visual/keyboard checks and branch integration remain.
- L2 (2026-11-24): «Cuando he ejecutado el paso 1, veo esto que reflejan la imagen, es decir, no se pasa automáticamente al siguiente paso».
- T4a: The screenshot shows zero recorded runs. State "Request prepared" is only a local start request. The standalone view now calls out that the form is not step 1 and distinguishes starting from publishing. T4 remains open for a connected draft run.
- T4b: Only manual inspection pins the detail card. Selecting the active node follows Runner updates. Local HTML handoff via import_console is supported, but no live browser transport exists on this branch.
- Direct decision: pending human decisions show outcome buttons without a separate start round trip. A single HTML submission carries ordered start and completion requests. RED reproduced missing buttons; 21 tests and Chrome/MCP approval through the next recorded step passed. Same-profile run-start replay and connected execution remain open.
- Task handoff: separate artifact and producer actions, explain projected next steps, and allow direct completion of confirmed linear human tasks. 22 tests passed. Chrome/MCP pilot opened a real recorded scope brief, navigated to its producer, and confirmed task completion at seq 8. Editing or attaching task deliverables in the browser and the autonomous run remain open.
- Existing scratch SOP run resumed without reimporting earlier requests. Produced the inventory hierarchy and toolchain, then confirmed RACI Governance Assignment. Added a UI completion gate for required outputs on human tasks (23 focused tests); the native Runner enforcement landed in PR #853.
- Stepper handoff (2026-11-24): this work was NOT part of PR #853. `main` advanced 40 commits and four console PRs (`e73da0e99`, `6fad25412`, `b0ca7c0d4`, `67c1993d7`) plus `96b72a3ae` rewrote the console. The inherited stepper conflicts head-on and must be redone against current code, not resurrected from stash `gate+stepper`. The Document SOP `V_0-3-0` with typed slots was never integrated into `main` (it still has `V_0-2-0` with no slots block), and the pilot test depends on it, so the SOP and its pilot travel with this package.
