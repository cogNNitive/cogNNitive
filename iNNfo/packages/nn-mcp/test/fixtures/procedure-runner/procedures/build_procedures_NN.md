---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Build"
slots:
  - { name: name, kind: value, required: true }
  - { name: code, kind: value, required: false, default: 0 }
---

# NN Procedure

## NN Procedure: Build
slug:: build-procedure

# NN Work

## NN Work: Build
slug:: build
executor:: engine
command:: node -e "require('fs').writeFileSync('out-{name}.txt', 'built'); process.exit({code})"
output:: [[bundle]]

# NN Artifact

## NN Artifact: Bundle
slug:: bundle
verify:: file:out-{name}.txt
