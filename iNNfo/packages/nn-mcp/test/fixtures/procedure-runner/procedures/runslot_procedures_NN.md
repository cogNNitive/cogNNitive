---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Run Slot"
---

# NN Procedure

## NN Procedure: Run Slot
slug:: runslot-procedure

# NN Work

## NN Work: Stamp
slug:: stamp
executor:: engine
command:: node -e "require('fs').writeFileSync('stamp-{run}.txt', 'stamped')"
output:: @stamp-file
next:: @check

## NN Work: Check
slug:: check
step_type:: decision
executor:: human
decision:: is stamp-{run}.txt right?

# NN Artifact

## NN Artifact: Stamp File
slug:: stamp-file
verify:: file:stamp-{run}.txt
