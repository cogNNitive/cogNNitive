---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Deliver"
---

# NN Procedure

## NN Procedure: Deliver
slug:: deliver-procedure

# NN Work

## NN Work: Write SOP
slug:: write
step_type:: task
executor:: human
next:: @publish
output:: [@sop, @linked-note]

## NN Work: Publish
slug:: publish
step_type:: task
executor:: agent
input:: @sop

# NN Artifact

## NN Artifact: SOP
slug:: sop

## NN Artifact: Linked Note
slug:: linked-note
kind:: element
required:: false
