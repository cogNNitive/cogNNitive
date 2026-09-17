# simulation

Executable simulations of real cogNNitive user journeys, run against the shipped
`@cognnitive/innfo-core` contract.

## Why this exists

The test suites answer "does this function behave as its author intended?".
This folder answers a different question: **"what happens to a user's document
when they actually use the product?"** — import a source, cite it, rename an
element, save the file, reopen the workspace.

Each scenario is written as a sequence of user-visible steps with an
expectation attached. Nothing here throws on a failed expectation; the run
always completes and writes a full report, because the point is to produce a
picture of real behaviour, not to stop at the first surprise.

## Running it

```bash
node simulation/run-all.mjs
```

Filter to one or more scenarios by substring:

```bash
node simulation/run-all.mjs 03 07
```

Output lands in `results/report.md` (readable) and `results/report.json`
(machine-readable). The exit code is always `0` — **this is a diagnostic, not a
CI gate.** A `FAIL` is a finding to triage.

Prerequisite: `innfo-core` must be built.

```bash
npm --prefix iNNfo/packages/innfo-core run build
```

## Scenarios

| ID | Journey |
| --- | --- |
| S01 | Source ingestion and citation traceability — import a primary source, cite its sections, break it, watch what is reported |
| S02 | Modifying a model — add, edit, rename with reference propagation, remove, and atomicity of failed mutations |
| S03 | Save/load fidelity — feed every shipped sample through `parseModel → serializeModel` and measure what the document loses |
| S04 | Template-authoring gate — an agent tries to extend the schema from inside a level-3 model |
| S05 | Tabular ingestion — import a CSV and cite a single row by key |
| S06 | Workspace manifest reconciliation — add a model file by hand, keep the index honest without touching human-owned entries |
| S07 | Opening the workspace we ship — everything a new user meets on day one |
| S08 | Consuming `innfo-core` from plain Node, the way an integrator would |

## Layout

```
lib/harness.mjs   scenario runner + report writer
lib/nodeFs.mjs    Node-backed DirectoryHandleLike (the parser targets the
                  File System Access API shape the editor runs on)
lib/core.mjs      loads innfo-core; see the comment in that file — it documents
                  a real packaging defect the simulation ran into
fixtures/acme/    a small synthetic workspace with real sources and citations
scenarios/        one file per journey
results/          generated report (committed as evidence)
```

`fixtures/` is never written to. S02 and S04 mutate parsed models in memory
only, so the fixture workspace stays pristine across runs.

## Reading a result

- **PASS** — the expectation held.
- **FAIL** — the expectation broke. Either the product is wrong or the
  expectation encodes an assumption the product never made; the report prints
  both the expectation and the actual value so you can tell which.
- **OBSERVED** — recorded without an expectation, usually a UX or design
  observation worth a human decision.

`FINDINGS.md` in this folder narrates what the current run means.
