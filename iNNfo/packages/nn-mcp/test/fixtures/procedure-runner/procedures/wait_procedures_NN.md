---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Wait"
slots:
  - { name: name, kind: value, required: true }
---

# NN Procedure

## NN Procedure: Wait
slug:: wait-procedure

# NN Work

## NN Work: Probe
slug:: probe
executor:: engine
command:: node -e "require('fs').writeFileSync('probe-{name}.txt', 'probed'); process.exit(2)"
exit_codes:: {"2": "waiting"}
output:: @probe-log
next:: @land

## NN Work: Land
slug:: land
step_type:: task
executor:: agent

# NN Artifact

## NN Artifact: Probe Log
slug:: probe-log
verify:: file:probe-{name}.txt
