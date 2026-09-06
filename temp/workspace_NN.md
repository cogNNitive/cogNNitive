---
level: 3
parent_spec:
  name: "workspace_spec"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/workspace_V_0-3-0_spec_NN.md"
model_version: "V_0-1-0"
title: "Simulated Test Workspace"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[Workspace]]
* [[Models]]
* [[Sources]]
* [[Procedures]]
* [[Artifacts]]
* [[Tag]]

# NN Workspace

A simulated test workspace validating the unified V_0-3-0 specification combining inventory, lineage and taxonomy.

# NN Models

## NN Models: Acme Business Model
path:: models/Acme_V_0-1-0_business_NN.md
template:: business_V_0-2-0
status:: active
author:: Senior Architect
derived_from:: [[Project Brief]]

# NN Sources

## NN Sources: Project Brief
raw_filename:: sources/original/brief.txt
raw_hash:: sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
size:: 120
source_format:: txt
normalized_at:: 2026-09-06T10:00:00Z
normalized_by:: traNNsform v2.0
normalized_content:: sources/nn/brief.md

# NN Procedures

## NN Procedures: Test Ingestion
procedure_ref:: procedures/ingest_V_1-0-0_procedures_NN.md
agent:: actioNN + Claude 3.5 Sonnet
run_at:: 2026-09-06T10:00:00Z

# NN Artifacts

## NN Artifacts: Executive Summary
artifact_format:: report
artifact_version:: V_1-0-0
artifact_path:: artifacts/Executive_Summary.md
derived_from_inputs:: [[Acme Business Model]]
produced_by:: [[Test Ingestion]]

# NN Tag

## NN Tag: architecture
color:: #3b82f6
icon:: layers
description:: Core architecture and design patterns.
