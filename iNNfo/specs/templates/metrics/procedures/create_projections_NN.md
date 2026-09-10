---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/spec_NN.md"
model_version: "V_0-1-0"
title: "Create Projections Procedure"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN Work

## NN Work: Create Projections
step_type:: task
parent:: -
next:: -
condition:: Workspace models available
input:: [[Source Workspace Models]]
output:: [[Projections HTML]]
output_status:: verified
tool:: [[AI Agent]]
Generate a standalone Projections dashboard from a workspace: analyze its models, agree a metric plan with the user, build (or complete) the L3 metrics model, snapshot its rows into MODEL_DATA, mirror dependencies into DEPS, bind FORMULAS logic, apply the visual system, and verify headless with zero page errors.

## NN Work: Analyze Workspace Models
parent:: [[Create Projections]]
step_type:: task
next:: [[Confirm Metric Plan]]
condition:: Procedure starts
input:: [[Source Workspace Models]]
output:: [[Metric Plan]]
output_status:: draft
tool:: [[AI Agent]]
Read the workspace index and its L3 models plus normalized sources. Extract every quantifiable fact (amounts, rates, counts, periods, horizons) and map each to proposed Metrics / Variables / Evolution / Scenario rows with per-row source references. Consolidate measured historical series (past months with actual values, typed as historical scenarios) alongside projection assumptions. Flag figures that are missing, ambiguous, or contradictory as open questions instead of inventing them.

## NN Work: Confirm Metric Plan
parent:: [[Create Projections]]
step_type:: decision
next:: [[Build Metrics Model]]
condition:: Metric plan drafted
input:: [[Metric Plan]]
output:: [[Metric Plan]]
output_status:: approved
tool:: [[AI Agent]]
Present the proposed rows, their source traceability, and the open questions. Proceed only with explicit user approval; adjust scope, row set, or horizons on request.

## NN Work: Build Metrics Model
parent:: [[Create Projections]]
step_type:: task
next:: [[Extract Model Snapshot]]
condition:: Metric plan approved
input:: [[Metric Plan]]
output:: [[Metrics Model]]
output_status:: verified
tool:: [[AI Agent]]
Create the L3 metrics model from the approved plan (Metrics with metricType, Variables, Evolution rules, Scenarios, dependsOn references, evaluable matrices, is_variable / is_formula / is_derived markers). If a Metrics model already exists, review and complete it instead of creating a new one.

## NN Work: Extract Model Snapshot
parent:: [[Create Projections]]
step_type:: task
next:: [[Map Dependency Graph]]
condition:: Metrics model verified
input:: [[Metrics Model]]
output:: [[Model Data Block]]
output_status:: verified
tool:: [[AI Agent]]
Copy values (metricValue), units (metricUnit, variableUnit) and verbatim formula text (metricFormula) from the Level 3 model into the artifact MODEL_DATA block. Each row declares source "model" (verbatim) or "derived" (artifact-invented help). Rows with measured past carry history: [v0, v1, ...] so the sheet renders actuals distinctly from computed months. Record meta: model, model_version, source_model, generated_at, months, historyMonths (leading actuals columns), charts, slug, title, startMonth/startYear (first projection month). Scenario variants live in the model as variant rows; the artifact renders the single neutral flow.

## NN Work: Map Dependency Graph
parent:: [[Create Projections]]
step_type:: task
next:: [[Build Master HTML]]
condition:: Snapshot extracted
input:: [[Metrics Model]]
output:: [[Model Data Block]]
output_status:: verified
tool:: [[AI Agent]]
Translate each dependsOn of the model into the DEPS map (row ids). Feeds the Metric focus selector (metric, dependents, direct dependencies, transitive base inputs).

## NN Work: Build Master HTML
parent:: [[Create Projections]]
step_type:: task
next:: [[Apply Visual System]]
condition:: Master HTML built
input:: [[Model Data Block]]
output:: [[Projections HTML]]
output_status:: draft
tool:: [[Tailwind Play CDN]]
Single-page structure from the Projections Layout asset: parameter topbar, result summary cards, collapsible tabbed charts, spreadsheet, Export CSV. Calculation logic lives in FORMULAS, strictly separated from data. Declare the console capabilities in `<script type="application/json" id="innfo-config">` via `needs[]` (pins resolve through `console/needs-registry.json`), reference the single-file console bundle with static `<script src>` tags (CDN primary, mirror fallback — no `fetch()`, no `type=module`), and ship the vendored `innfo-console.bundle.js` next to the output for offline `file://` double-click. Write the deliverable folder as `export/<Model>_V_<version>_console/` containing `<Model>_V_<version>_console.html` plus `innfo-console.bundle.js` — self-contained and portable. Pinned CDNs: Tailwind Play, uPlot 1.6.32 (dist/uPlot.iife.min.js), Lucide 1.42.0, Inter + JetBrains Mono.

## NN Work: Apply Visual System
parent:: [[Create Projections]]
step_type:: task
next:: [[Implement CSV Export]]
condition:: Master HTML built
input:: [[Projections HTML]]
output:: [[Projections HTML]]
output_status:: draft
tool:: [[Tailwind Play CDN]]
Apply the ported iNNfo pill system (concept pills, color palettes, Lucide icons). Rules: blue = editable, gray = computed; compact k/m format with unit in sticky Unit column; per-metric heat scale via colors {min, mid, max}; minimal columns (content-sized inputs); everything left-aligned.

## NN Work: Implement CSV Export
parent:: [[Create Projections]]
step_type:: task
next:: [[Verify In Browser]]
condition:: Visual system applied
input:: [[Projections HTML]]
output:: [[Exported CSV]]
output_status:: verified
tool:: [[AI Agent]]
Export button capturing live state (overrides, evolutions) with ; separator and dot decimals. Includes 6 # traceability lines (model, model_version, source_model, generated_at, exported_at ISO, start) plus a Kind row (Actual/Projection) and filename projections_{version}_{timestamp}.csv.

## NN Work: Verify In Browser
parent:: [[Create Projections]]
step_type:: task
next:: [[Version And Archive]]
condition:: CSV export implemented
input:: [[Projections HTML]]
output:: [[Verification Report]]
output_status:: verified
tool:: [[Verify Harness]]
Serve the folder over HTTP and load in headless Chromium: zero pageerrors, tabs/collapse/focus/export operative, valid CSV download, sheet and chart screenshots. See the template verify harness.

## NN Work: Version And Archive
parent:: [[Create Projections]]
step_type:: task
next:: -
condition:: Verification report clean
input:: [[Verification Report]]
output:: [[Projections HTML]]
output_status:: archived
tool:: [[AI Agent]]
If the model changed: bump model_version in frontmatter, new generated_at, regenerate MODEL_DATA. The Data badge in the header always reflects the embedded snapshot.

# NN Artifact

## NN Artifact: Source Workspace Models
The workspace index plus the L3 models and normalized sources under analysis (figures, rates, periods).

## NN Artifact: Metric Plan
Proposed Metrics / Variables / Evolution / Scenario rows with per-row source traceability and open questions. Approved by the user before modeling.

## NN Artifact: Metrics Model
The Level 3 metrics model file with metric rows, formulas, dependencies and markers.

## NN Artifact: Model Data Block
JSON snapshot embedded in the artifact: meta + rows with model/derived provenance. Single point to update when the model changes.

## NN Artifact: Projections Layout
The static reference shell at `../assets/projections.html` with inline styling and the MODEL_DATA / FORMULAS / DEPS slots.

## NN Artifact: Projections HTML
The standalone deliverable file (logic + data + style, CDNs over network).

## NN Artifact: Exported CSV
File projections_{version}_{timestamp}.csv downloaded from the artifact with full traceability.

## NN Artifact: Verification Report
Headless harness output: console errors, dimensions, screenshots. Zero pageerrors required.

# NN Tools

## NN Tools: AI Agent
scope:: internal
AI agent executing the technical steps and the headless verification.

## NN Tools: Tailwind Play CDN
scope:: external
shadcn-style aesthetics with no build. Caveat: does not process theme() inside plain <style>, and its preflight forces svg to block.

## NN Tools: uPlot 1.6.32
scope:: external
Lightweight chart library (~45 kB). Initial data must carry as many series as opts, and setData takes a flat array ([xs, ...series]).

## NN Tools: Lucide 1.42.0
scope:: external
Icons via CDN with data-lucide + createIcons() after each render. Pinned version with legacy aliases.

## NN Tools: Verify Harness
scope:: internal
Portable Node script (playwright-core + headless Chromium) checking console, tabs, focus, CSV and screenshots. No absolute paths; Chromium resolved via PLAYWRIGHT_CORE / CHROME_EXE env with npx fallback.

# NN Roles

## NN Roles: Agent
scope:: internal
AI agent responsible for technical execution and headless verification.

## NN Roles: User
scope:: external
User responsible for providing the model, reviewing artifact aesthetics, and approving each version.

# NN matrices: work-roles matrix
| Work \ Roles | Agent | User |
| :--- | :--- | :--- |
| Analyze Workspace Models | Responsible | Consulted |
| Confirm Metric Plan | Responsible | Accountable |
| Build Metrics Model | Responsible | Accountable |
| Extract Model Snapshot | Responsible | Accountable |
| Map Dependency Graph | Responsible | Informed |
| Build Master HTML | Responsible | Informed |
| Apply Visual System | Responsible | Consulted |
| Implement CSV Export | Responsible | Informed |
| Verify In Browser | Responsible | Informed |
| Version And Archive | Responsible | Accountable |

# NN matrices: work-tools matrix
| Work \ Tools | AI Agent | Tailwind Play CDN | uPlot 1.6.32 | Lucide 1.42.0 | Verify Harness |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Analyze Workspace Models | Uses | - | - | - | - |
| Confirm Metric Plan | Uses | - | - | - | - |
| Build Metrics Model | Uses | - | - | - | - |
| Extract Model Snapshot | Uses | - | - | - | - |
| Map Dependency Graph | Uses | - | - | - | - |
| Build Master HTML | Uses | Uses | Uses | Uses | - |
| Apply Visual System | Uses | Uses | - | Uses | - |
| Implement CSV Export | Uses | - | - | - | - |
| Verify In Browser | - | - | - | - | Uses |
| Version And Archive | Uses | - | - | - | - |

# NN matrices: work-artifacts matrix
| Work \ Artifact | Source Workspace Models | Metric Plan | Metrics Model | Model Data Block | Projections Layout | Projections HTML | Exported CSV | Verification Report |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Analyze Workspace Models | Reviews | Creates | - | - | - | - | - | - |
| Confirm Metric Plan | - | Reviews | - | - | - | - | - | - |
| Build Metrics Model | - | Reviews | Creates | - | - | - | - | - |
| Extract Model Snapshot | - | - | Reviews | Creates | - | - | - | - |
| Map Dependency Graph | - | - | Reviews | Modifies | - | - | - | - |
| Build Master HTML | - | - | - | Reviews | Reviews | Creates | - | - |
| Apply Visual System | - | - | - | - | Reviews | Modifies | - | - |
| Implement CSV Export | - | - | - | - | - | Modifies | Creates | - |
| Verify In Browser | - | - | - | - | - | Reviews | Reviews | Creates |
| Version And Archive | - | - | - | Reviews | - | Modifies | - | Reviews |
