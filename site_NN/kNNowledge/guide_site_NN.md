---
level: 3
parent_spec:
  name: "site"
  url: "specs/bluepriNNts/site/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Guide Pages"
---

# NN Page

## NN Page: Validate your domaiNN
slug:: validate-domain
kind:: guide
order:: 1
summary:: Check one kNNowledge document or a whole domaiNN, and fix the common findings.

Validate after every change. Validation is deterministic: the nn-core validator decides, not the language model.

### Check one document

Ask your agent to run `validate_knowledge` on the document. The tool resolves the bluepriNNt from the `parent_spec` of the document and reports errors and warnings.

### Check the whole domaiNN

Ask your agent to run `check_domain`. It validates every kNNowledge document, compares the lineage record with the files on disk and returns one report. It is informational and never blocks.

### Fix a dangling citation

A citation points at a file and a unit, for example a Markdown heading. If the heading is renamed or the file is moved, the citation no longer resolves.

1. Restore the heading or the file, or update the citation to the new location.
2. Validate again.

### Never edit by hand what is derived

The lineage record is generated. If it drifts from the files, ask the agent to run `sync_lineage` instead of editing it.
