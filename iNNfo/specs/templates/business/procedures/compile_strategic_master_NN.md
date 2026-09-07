---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_0-1-0"
title: "Compile Strategic Master Procedure"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN Work

## NN Work: Compile Strategic Master
step_type:: task
parent:: -
next:: -
condition:: Active L3 business model loaded
input:: [[Active Business Model]]
output:: [[Strategic Master HTML]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Generate a single HTML dashboard compiling the strategic diagrams based on the active L3 business model data.

## NN Work: Load Reference Layout
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Extract Model Strategic Data]]
condition:: Procedure starts
input:: [[Master HTML Reference Layout]]
output:: [[Loaded Reference Layout]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Load the reference dashboard layout from `../assets/master.html` (all CSS, structure, and baseline visualization components self-contained).

## NN Work: Extract Model Strategic Data
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Inject Model Data Slot]]
condition:: Reference layout is loaded
input:: [[Active Business Model]]
output:: [[Structured Strategic Data]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Extract strategic elements from the active L3 business model (including [[Journey]], [[Emotions]], [[Problems]], [[Value propositions]], [[Profiles]], [[Behaviors]], [[Finance]], and [[Team]]) into a structured JSON payload conforming to the dashboard data schema.

## NN Work: Inject Model Data Slot
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Verify Output]]
condition:: Strategic data extraction complete
input:: [[Structured Strategic Data]]
output:: [[Strategic Master HTML]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Inject the extracted model data JSON into the `<script id="innfo-model-data" type="application/json">` data slot of the loaded reference layout, and save the deliverable.

## NN Work: Verify Output
parent:: [[Compile Strategic Master]]
step_type:: task
next:: -
condition:: Data slot injected
input:: [[Strategic Master HTML]]
output:: [[Verified Strategic Master]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Verify the generated dashboard compiles all 25 strategic diagrams with the model data correctly bound in the data slot and no broken or empty sections.

# NN Tools

## NN Tools: AI Agent
scope:: external
LLM agent (e.g. OpenCode Desktop) that executes the generation workflow and writes the output artifact.

# NN Artifact

## NN Artifact: Active Business Model
type:: spec
format:: markdown
The active L3 business model conforming to business_V_0-2-0, source of all data to inject.

## NN Artifact: Master HTML Reference Layout
type:: asset
format:: html
The static reference dashboard at `../assets/master.html` with inline styling and responsive visual components.

## NN Artifact: Loaded Reference Layout
type:: data
format:: html
In-memory copy of the reference layout ready for value injection.

## NN Artifact: Structured Strategic Data
type:: data
format:: json
Normalized JSON payload extracted from the L3 model ready for injection into the dashboard data slot.

## NN Artifact: Strategic Master HTML
type:: deliverable
format:: html
The generated single-file dashboard with the model data slot populated.

## NN Artifact: Verified Strategic Master
type:: report
format:: status
Confirmation that the generated dashboard is complete and correct.