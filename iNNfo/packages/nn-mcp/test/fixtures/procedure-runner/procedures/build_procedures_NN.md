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
  - { name: tier, kind: value, required: false, default: "free" }
---

# NN Procedure

## NN Procedure: Build
slug:: build-procedure

# NN Work

## NN Work: Build
slug:: build
executor:: engine
command:: node -e "require('fs').writeFileSync('out-{name}.txt', 'built'); process.exit({code})"
output:: @bundle
next:: @build-and-ship

## NN Work: Build And Ship
slug:: build-and-ship
executor:: engine
command:: node -e "require('fs').writeFileSync('ship-{name}-{tier}.txt', 'shipped')"
output:: @shipment
next:: [@ship-notify, @ship-escalate]

## NN Work: Ship Notify
slug:: ship-notify
step_type:: task
executor:: agent
condition:: outcome == ok

## NN Work: Ship Escalate
slug:: ship-escalate
step_type:: task
executor:: agent
condition:: outcome == bad

# NN Artifact

## NN Artifact: Bundle
slug:: bundle
verify:: file:out-{name}.txt

## NN Artifact: Shipment
slug:: shipment
verify:: file:ship-{name}-{tier}.txt
