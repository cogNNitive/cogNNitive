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
next:: [[Map Journey and Emotions]]
condition:: Procedure starts
input:: [[Master HTML Reference Layout]]
output:: [[Loaded Reference Layout]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Fetch the reference layout from `https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/business/samples/master.html` (all CSS and SVGs inline) as the base design.

## NN Work: Map Journey and Emotions
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Map Problems and Value Propositions]]
condition:: Reference layout is loaded
input:: [[Active Business Model]]
output:: [[Customer Journey Emotion Map]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Read [[Journey]] and [[Emotions]] elements to build the Customer Journey Emotion Map timeline in the reference layout.

## NN Work: Map Problems and Value Propositions
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Map Profiles and Behaviors]]
condition:: Journey map is complete
input:: [[Active Business Model]]
output:: [[Solution Fit Flow Sankey]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Map [[Problems]] and [[Value propositions]] elements into the Solution Fit Flow Sankey diagram.

## NN Work: Map Profiles and Behaviors
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Inject Values into SVG Elements]]
condition:: Solution fit map is complete
input:: [[Active Business Model]]
output:: [[Buyer Persona Cards]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Map [[Profiles]] and [[Behaviors]] elements into the Buyer Persona Card columns of the reference layout.

## NN Work: Inject Values into SVG Elements
parent:: [[Compile Strategic Master]]
step_type:: task
next:: [[Verify Output]]
condition:: All diagram maps are complete
input:: [[Loaded Reference Layout]]
output:: [[Strategic Master HTML]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Inject the actual L3 model values into the SVG elements of the loaded reference layout.

## NN Work: Verify Output
parent:: [[Compile Strategic Master]]
step_type:: task
next:: -
condition:: All values injected
input:: [[Strategic Master HTML]]
output:: [[Verified Strategic Master]]
output_status:: verified
tool:: [[AI Agent]]
scope:: internal
Verify the generated dashboard compiles all 25 strategic diagrams with the model data correctly injected and no broken or empty sections.

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
The static reference dashboard at `iNNfo/specs/templates/business/samples/master.html` with all CSS and SVGs inline.

## NN Artifact: Loaded Reference Layout
type:: data
format:: html
In-memory copy of the reference layout ready for value injection.

## NN Artifact: Customer Journey Emotion Map
type:: diagram
format:: svg
Timeline derived from [[Journey]] and [[Emotions]] elements.

## NN Artifact: Solution Fit Flow Sankey
type:: diagram
format:: svg
Sankey mapping [[Problems]] to [[Value propositions]].

## NN Artifact: Buyer Persona Cards
type:: diagram
format:: svg
Card columns derived from [[Profiles]] and [[Behaviors]] elements.

## NN Artifact: Strategic Master HTML
type:: deliverable
format:: html
The generated single-file dashboard with all 25 strategic diagrams.

## NN Artifact: Verified Strategic Master
type:: report
format:: status
Confirmation that the generated dashboard is complete and correct.