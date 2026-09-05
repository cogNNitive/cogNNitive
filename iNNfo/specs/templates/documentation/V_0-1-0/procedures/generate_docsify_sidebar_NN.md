---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/procedures/procedures_V_0-2-0_NN.md"
model_version: "V_0-1-0"
title: "Generate Docsify Sidebar Procedure"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN Work

## NN Work: Generate Docsify Navigation
step_type:: task
parent:: -
next:: -
condition:: Documentation model updated or site build triggered
input:: [[Documentation Model]]
output:: [[Docsify Sidebar]]
output_status:: verified
tool:: [[Sidebar Generator Script]]
scope:: internal
Standard procedure to parse a documentation model, validate source markdown paths, and compile the Docsify _sidebar.md navigation file.

## NN Work: Verify Documentation Model
parent:: [[Generate Docsify Navigation]]
step_type:: task
next:: [[Audit Source Markdown Files]]
condition:: Execution begins
input:: [[Documentation Model]]
output:: [[Validated Model AST]]
output_status:: verified
tool:: [[iNNfo Core Validator]]
scope:: internal
Verify that documentation_NN.md conforms to the level-2 documentation specification template and contains valid DocSite, Section, and Page concepts.

## NN Work: Audit Source Markdown Files
parent:: [[Generate Docsify Navigation]]
step_type:: task
next:: [[Compile Sidebar Markdown]]
condition:: Model syntax is valid
input:: [[Validated Model AST]]
output:: [[File Audit Report]]
output_status:: verified
tool:: [[Sidebar Generator Script]]
scope:: internal
Inspect every Page element in the model and verify that the file referenced in the source field exists on the local filesystem.

## NN Work: Compile Sidebar Markdown
parent:: [[Generate Docsify Navigation]]
step_type:: task
next:: [[Verify Navigation Output]]
condition:: All source files exist
input:: [[File Audit Report]]
output:: [[Docsify Sidebar]]
output_status:: verified
tool:: [[Sidebar Generator Script]]
scope:: internal
Iterate through Sections and Pages in order, generating Markdown list items with labels and routes into _sidebar.md.

## NN Work: Verify Navigation Output
parent:: [[Generate Docsify Navigation]]
step_type:: task
next:: -
condition:: _sidebar.md written
input:: [[Docsify Sidebar]]
output:: [[Verified Documentation Site]]
output_status:: verified
tool:: [[Docsify Runtime Checker]]
scope:: internal
Ensure the generated _sidebar.md is non-empty, contains valid markdown link syntax, and matches expected site sections.

# NN Artifact

## NN Artifact: Documentation Model
type:: spec
format:: markdown
Authoritative level-3 model file (documentation_NN.md) conforming to the documentation template.

## NN Artifact: Validated Model AST
type:: data
format:: json
Parsed in-memory AST representing the documentation entities and field relationships.

## NN Artifact: File Audit Report
type:: log
format:: text
Filesystem resolution status confirming every source markdown file is present.

## NN Artifact: Docsify Sidebar
type:: config
format:: markdown
The generated _sidebar.md file consumed by Docsify to render the navigation menu.

## NN Artifact: Verified Documentation Site
type:: report
format:: status
Confirmation of clean navigation tree without dead links or missing routes.

# NN Tools

## NN Tools: Sidebar Generator Script
type:: cli
Executable Node.js CLI script (scripts/generate-docsify-sidebar.mjs) that deterministically compiles the model into _sidebar.md.

## NN Tools: iNNfo Core Validator
type:: service
Deterministic parser and schema validator provided by @cognnitive/innfo-core.

## NN Tools: Docsify Runtime Checker
type:: linter
Verification step inspecting file presence and route formatting.

# NN Roles

## NN Roles: Documentation Maintainer
role_type:: human
Responsible for organizing pages, creating content in markdown files, and maintaining the model.

## NN Roles: Build Orchestrator
role_type:: agent
Automated process or agent that runs the procedure steps during CI/CD or local build orchestration.
