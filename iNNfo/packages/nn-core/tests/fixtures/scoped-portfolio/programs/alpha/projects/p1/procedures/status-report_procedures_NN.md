---
level: 3
parent_spec:
  name: "procedures_V_0-1-0"
  url: "https://example.invalid/procedures_V_0-1-0.md"
knowledge_version: "V_0-1-0"
title: "Status Report"
fork_of: { procedure: status-report, scope: "", version: "V_0-1-0" }
slots:
  - { name: audience, kind: value, required: true }
  - { name: format, kind: value, required: false, default: "markdown" }
  - { name: post_step, kind: procedure, required: false, step: compile-health-dashboard }
---

# NN Procedure

## NN Procedure: Status Report
slug:: status-report
summary:: Status Report


## NN Work: Compile Health Dashboard
slug:: compile-health-dashboard
