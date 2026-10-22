---
level: 3
parent_spec:
  name: "site"
  url: "specs/bluepriNNts/site/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Tutorial Pages"
---

# NN Page

## NN Page: Create your first domaiNN
slug:: first-domain
kind:: tutorial
order:: 1
summary:: Install the skills and the MCP server, then create a domaiNN and your first kNNowledge document.

You will end with a validated domaiNN that holds one source and one kNNowledge document that cites it.

### Install

Open your AI coding agent and paste one line. The agent installs the skills, registers the MCP server and checks that it responds.

```text
I want to use https://cognnitive.com/use
```

### Create the domaiNN

Ask your agent to create a domaiNN. It calls the `init_domain` tool, which creates the folder skeleton and the `domaiNN_NN.md` manifest. The tool refuses a directory that already exists and is not empty.

### Add a source

Copy a raw file, such as meeting notes, into `sources/import/`. Ask the agent to cognitivize it. The `cognitivize` tool writes a sidecar next to the file, which makes the file citable. The original is never changed.

### Write the kNNowledge

Ask the agent to model what the source says. It creates a kNNowledge document under `kNNowledge/` and cites the source for every statement.

### Check your work

Ask the agent to validate the document and to check the domaiNN. The `validate_knowledge` and `check_domain` tools report errors, dangling citations and drift.

The guide on validating a domaiNN explains how to read the results.
