# Private run outputs

Objective: a person in a private run produces a step's required output from the offline console. The output is kept private under the run until the final handoff.
Branch: `session/private-run-outputs` · Delivery: `ask-on-risk` · Runners: nn-mcp vitest (`node ../../../node_modules/vitest/vitest.mjs run <file>` from `iNNfo/packages/nn-mcp`), console `node --test test/console-procedure-runner-ux.test.mjs`.

## Specs

- S1. «Esto es crítico: implementarlo bien» (about: "Desde la consola, una persona no puede registrar un output requerido. Un paso humano que tiene que producir uno sigue necesitando al agente."). Decision taken by the user: «Archivo privado (Recomendada)». The option, verbatim: «La persona escribe o adjunta el output en la consola. Al importarlo, el runner lo guarda en executions/<run>/outputs/<artefacto> y lo valida con su sha256; la consola lo muestra embebido. Con 'Register with the agent', el agente lo publica donde corresponde. Cubre los outputs de tipo documento, como el SOP. Los outputs que son modelos canónicos quedan para después.»
- S2. Contract, the Step Request (executions spec):
  - A new optional field `requested_outputs` (string) holds a JSON object: artifact slug -> `{ "name"?: string, "text": string }`.
  - It is valid only with `action: complete`.
  - Each `text` is UTF-8 and at most 256 KiB.
  - The console stores it as `JSON.stringify(map)`, the same one-line form as `params`.
  - Duplicate reconciliation in `import_console` (`sameRequest`) compares it too.
- S3. Runner: `procedure_record` `complete`, both from a request carrying `requested_outputs` and as a direct `outputs` argument of the same shape:
  - Validation, all of it before anything is written:
    - every slug is an output of the step being completed: `INVALID_OUTPUT`;
    - every text is a string within the limit: `INVALID_OUTPUT`;
    - the artifact kind is `file`: `INVALID_OUTPUT` (element and changeset outputs are out of scope).
  - Writing the file:
    - the path is `executions/<run>/outputs/<slug>/<name>`;
    - `name` is a sanitized basename of `[A-Za-z0-9._-]`, defaulting to `<slug>.md`;
    - the runner writes it right before the atomic commit, and removes it if the commit fails.
  - Recording: the same atomic changeset as the completion records the artifact row: `kind: file`, `status: validated`, `value` = that domain-relative path, `rev` = its sha256, `step` = the step. The `MISSING_OUTPUT` gate therefore sees the output as recorded by this step.
  - The boundary: nothing is written outside `executions/<run>/` and `changes/`.
  - A refused request is marked `rejected` with the reason, as today.
- S4. Console (`render-procedure-stepper.js`):
  - The person's step card shows, for each declared output of the step that this step has not already validated:
    - a "Your deliverable" text area and a "Load a text file" picker (read as text, which also fills the name);
    - an optional file name.
  - "Complete" and the outcome buttons stay disabled while a required output is empty, with a hint that names it.
  - The complete draft carries `requested_outputs`. Undo removes it.
  - Answering does not write anything.
- S5. Export and handoff:
  - The regenerated console embeds the output, which is a `file` row whose `value` is under the domain root, so the existing `embedRunArtifacts` path applies; a test pins this.
  - The handoff guidance names the private outputs (`executions/<run>/outputs/`):
    - "Register with the agent": the prompt asks the agent to publish them where the procedure declares, after recording the choice;
    - "Send to the administrator": the outputs travel with the run.
- S6. Spec and docs:
  - The executions `spec_NN.md` gets the field definition plus a rule under "Requests, not writes" and "Artifacts", and a `blueprint_version` bump `V_0-6-1` -> `V_0-7-0`.
  - Delta spec at `openspec/changes/private-run-outputs/specs/executions/spec.md`.
  - The `procedure_record` and `import_console` tool descriptions in `server.ts` are updated.
- S7. End to end, outside the repository: the real nn-mcp over stdio plus Playwright on installed Chrome.
  - The flow: the person writes the deliverable of a human step with a required output, saves, the agent imports, the step completes, the run finishes, handoff.
  - Canonical files stay byte-identical throughout, and the output exists only under `executions/<run>/outputs/`.

## Tasks

- [x] T1 / S2 S3 S6 / delegated writer (parallel unit A) / `86145300c` / RED 6/7 runner + 2/3 import tests, then GREEN.
- [x] T2 / S4 S5 / delegated writer (parallel unit B) / `2001e1cd7` / RED 8 S4 + 2 handoff tests, then GREEN.
- [x] T3 / S7 / inline / `51f12cf55` (regenerated artifacts) / e2e PASS.

## Log

- L1 (2026-11-25): «Esto es crítico: implementarlo bien». Decision: «Archivo privado (Recomendada)».
- Route: T1 and T2 are independent units with disjoint edit surfaces. Each is several files and more than 100 lines, and both are launched together (Writer trigger a), on one shared contract (S2). The parent owns git, regen and the bundles.
- Map (explorer, 2026-11-25):
  - `procedure_record action=artifact` does no checking for `file` (`procedure-record.ts:740-748`).
  - The `MISSING_OUTPUT` gate requires `validated` + `step` (`:527-541`).
  - Step Request actions are `start|wait|complete|fail` (spec `:155-159`).
  - `embedRunArtifacts` embeds `row.value` paths inside the root.
  - Change drafts go into canonical models, so an output must never travel as a model draft.
  - Shipped human steps with required file outputs: Document SOP `workflow-step-decomposition` -> `@decomposed-step-hierarchy`, Model a Business (8 steps), and the usage procedures.
- T1 review (parent): T1 had let a direct `outputs` argument ride on a request that carried none. Reverted: a request carries only the deliverable the person attached, so `outputs` given with `request` is `INVALID_ARGUMENT` (RED, then GREEN).
- Decisions accepted: `{}` reads as no outputs. Element and changeset outputs get no editor and do not block Complete (canonical models are out of scope, S1).
- Writers' notes:
  - A row the agent already marked `rejected` cannot take a deliverable (`rejected` only goes back to `produced`); left alone.
  - The 256 KiB limit is exact.
  - A ~100 KiB text with quotes and newlines round-trips byte for byte through the import.
- Verification (2026-11-25):
  - nn-mcp focused suites: 97/97.
  - Console and export node tests: 991/991.
  - `check:openspec` OK; `tsc` clean; regen fresh.
  - Full nn-mcp: 957 passed. Of the 9 failures, 4 are `minimist` (no `skills/nn-sources/node_modules` in this worktree); the other 5 pass when rerun serially (93/93).
- S7 e2e, in a scratch directory outside the repo: the real `nn-mcp.bundle.js` over stdio, plus `playwright-core` driving installed Chrome with one persistent profile.
  - "Mark as done" was disabled, with the hint "Write or load the required deliverable before completing: SOP." There was no editor for the element output.
  - The person wrote the SOP and named it, then saved and the agent imported. The request was `done`. The file `executions/d1/outputs/sop/inventory-sop.md` held the same bytes, and the row was `validated` with its sha256 and `step: write`.
  - A replay of the same file reported `duplicate`.
  - The agent published and finished the run. The regenerated console payload carries the deliverable, and the agent prompt names `executions/d1/outputs/`.
  - The handoff was recorded. Canonical files were byte-identical at every step.
  - The #868 e2e still passes.
