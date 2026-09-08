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
condition:: Active L3 metrics model loaded
input:: [[Metrics Model]]
output:: [[Projections HTML]]
output_status:: verified
tool:: [[AI Agent]]
Generate a standalone Projections dashboard from the active L3 metrics model: snapshot its rows into MODEL_DATA, mirror dependencies into DEPS, bind FORMULAS logic, apply the visual system, and verify headless with zero page errors.

## NN Work: Extract Model Snapshot
parent:: [[Create Projections]]
step_type:: task
next:: [[Map Dependency Graph]]
condition:: Procedure starts
input:: [[Metrics Model]]
output:: [[Model Data Block]]
output_status:: verified
tool:: [[AI Agent]]
Copy values (metricValue), units (metricUnit, variableUnit) and verbatim formula text (metricFormula) from the Level 3 model into the artifact MODEL_DATA block. Each row declares source "model" (verbatim) or "derived" (artifact-invented help). Record meta: model, model_version, source_model, generated_at, months.

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
condition:: Dependency graph mapped
input:: [[Model Data Block]]
output:: [[Projections HTML]]
output_status:: draft
tool:: [[Tailwind Play CDN]]
Single-page structure from the Projections Layout asset: parameter topbar, cards per scenario, collapsible tabbed charts, spreadsheet, Export CSV. Calculation logic lives in FORMULAS, strictly separated from data. Pinned CDNs: Tailwind Play, uPlot 1.6.32 (dist/uPlot.iife.min.js), Lucide 1.42.0, Inter + JetBrains Mono.

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
Export button capturing live state (overrides, evolutions, scenario) with ; separator and dot decimals. Includes 7 # traceability lines (model, model_version, source_model, generated_at, exported_at ISO, scenario, start) and filename projections_{version}_{timestamp}.csv.

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
| Extract Model Snapshot | Uses | - | - | - | - |
| Map Dependency Graph | Uses | - | - | - | - |
| Build Master HTML | Uses | Uses | Uses | Uses | - |
| Apply Visual System | Uses | Uses | - | Uses | - |
| Implement CSV Export | Uses | - | - | - | - |
| Verify In Browser | - | - | - | - | Uses |
| Version And Archive | Uses | - | - | - | - |

# NN matrices: work-artifacts matrix
| Work \ Artifact | Metrics Model | Model Data Block | Projections Layout | Projections HTML | Exported CSV | Verification Report |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Extract Model Snapshot | Reviews | Creates | - | - | - | - |
| Map Dependency Graph | Reviews | Modifies | - | - | - | - |
| Build Master HTML | - | Reviews | Reviews | Creates | - | - |
| Apply Visual System | - | - | Reviews | Modifies | - | - |
| Implement CSV Export | - | - | - | Modifies | Creates | - |
| Verify In Browser | - | - | - | Reviews | Reviews | Creates |
| Version And Archive | - | Reviews | - | Modifies | - | Reviews |
