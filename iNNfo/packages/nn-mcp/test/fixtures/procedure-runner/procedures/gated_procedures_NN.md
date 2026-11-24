---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Review"
slots:
  - { name: doc, kind: value, required: true }
  - { name: format, kind: value, required: false, default: "html" }
---

# NN Procedure

## NN Procedure: Review
slug:: gated-procedure

# NN Work

## NN Work: Draft
slug:: draft
step_type:: task
executor:: agent
next:: @review
output:: @draft-doc

## NN Work: Review
slug:: review
step_type:: decision
executor:: human
decision:: Approve {doc}?
input:: @draft-doc
next:: [@publish, @rework]

## NN Work: Publish
slug:: publish
step_type:: task
executor:: agent
condition:: outcome == approve
input:: @draft-doc

## NN Work: Rework
slug:: rework
step_type:: task
executor:: agent
condition:: outcome == decline

# NN Artifact

## NN Artifact: Draft Doc
slug:: draft-doc
verify:: file:{doc}.md
