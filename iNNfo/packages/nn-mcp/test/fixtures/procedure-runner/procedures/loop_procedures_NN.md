---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Loop"
---

# NN Procedure

## NN Procedure: Loop
slug:: loop-procedure

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
decision:: approve, or send-back with a reason
max_attempts:: 2
input:: @draft-doc
next:: [@publish, @redraft]

## NN Work: Publish
slug:: publish
step_type:: task
executor:: agent
condition:: outcome == approve

## NN Work: Redraft
slug:: redraft
step_type:: task
executor:: agent
condition:: outcome == send-back
next:: @review
output:: @draft-doc

# NN Artifact

## NN Artifact: Draft Doc
slug:: draft-doc
verify:: file:draft.md
