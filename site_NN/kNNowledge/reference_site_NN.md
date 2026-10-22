---
level: 3
parent_spec:
  name: "site"
  url: "specs/bluepriNNts/site/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Reference Pages"
---

# NN Page

## NN Page: Domain layout and tools
slug:: reference
kind:: reference
order:: 1
summary:: The folders of a domaiNN and the MCP tools you will use first.

### Folders

`domaiNN_NN.md` is the manifest of the domaiNN.

`kNNowledge/` holds the kNNowledge documents.

`specs/bluepriNNts/` holds the bluepriNNts.

`sources/import/` holds raw files and their sidecars.

`artifacts/` holds generated, write-once outputs.

`changes/` holds the record of every change.

### Tools

`init_domain` creates an empty domaiNN.

`init_knowledge` creates a kNNowledge document from a bluepriNNt.

`validate_knowledge` validates one document.

`check_domain` checks the whole domaiNN.

`cognitivize` writes the sidecar of one raw file.

`propose_changeset` and `apply_change` review and apply edits.

`sync_lineage` regenerates the lineage record.
