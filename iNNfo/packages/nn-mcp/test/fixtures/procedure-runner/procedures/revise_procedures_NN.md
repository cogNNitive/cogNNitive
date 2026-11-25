---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Revise"
---

# NN Procedure

## NN Procedure: Revise
slug:: revise-procedure

# NN Work

## NN Work: Build
slug:: build-report
step_type:: task
executor:: agent
next:: @check
output:: @report

## NN Work: Check
slug:: check
step_type:: decision
executor:: human
decision:: approve, or send-back with a reason
max_attempts:: 3
input:: @report
next:: [@ship, @revise]

## NN Work: Ship
slug:: ship
step_type:: task
executor:: agent
condition:: outcome == approve

## NN Work: Revise
slug:: revise
step_type:: task
executor:: agent
condition:: outcome == send-back
next:: @check
output:: @report

# NN Artifact

## NN Artifact: Report
slug:: report
verify:: file:report.md
