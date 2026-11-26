---
spec_version: "V_0-9-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/iNNfo_V_0-9-0_NN.md"
knowledge_slug: "verify-lineage-1"
level: 3
parent_spec:
  name: "executions"
  url: "specs/bluepriNNts/executions/spec_NN.md"
knowledge_version: "V_0-3-0"
blueprint_version: "V_0-7-0"
title: "verify-lineage-1"
---

# NN index

* [[Procedure Execution]]
  * [[Step Run]]

# NN Procedure Execution

## NN Procedure Execution: verify-lineage-1
slug:: verify-lineage-1
procedure:: kNNowledge/TestLab_procedures_TestLab_procedures_NN.md
def_rev:: V_0-2-0
params:: "{}"
seq:: 9
state:: open

# NN Step Run

## NN Step Run: Open the Domain Console
slug:: open-the-domain-console
status:: done
attempt:: 1
next:: enable-review-mode

## NN Step Run: Enable Review Mode
slug:: enable-review-mode
status:: done
attempt:: 1
next:: open-element-1b

## NN Step Run: Open Element 1B
slug:: open-element-1b
status:: done
attempt:: 1
next:: read-the-changeset-lineage

## NN Step Run: Read the Changeset Lineage
slug:: read-the-changeset-lineage
status:: waiting
attempt:: 1
waiting_on:: reviewer confirms fb-001 in History & Provenance

## NN Step Run: Propose a Change in the Console
slug:: propose-a-change-in-the-console
status:: pending
attempt:: 0

## NN Step Run: Copy the Changeset Prompt
slug:: copy-the-changeset-prompt
status:: pending
attempt:: 0
