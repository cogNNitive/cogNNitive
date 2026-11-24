---
level: 3
parent_spec:
  name: "procedures_V_0-6-0"
  url: "https://example.invalid/procedures/spec_NN.md"
knowledge_version: "V_1-0-0"
title: "Retry"
slots:
  - { name: code, kind: value, required: false, default: 0 }
---

# NN Procedure

## NN Procedure: Retry
slug:: retry-procedure

# NN Work

## NN Work: Fetch
slug:: fetch
executor:: engine
condition:: outcome == retry
max_attempts:: 2
command:: node -e "process.exit(0)"
next:: @check

## NN Work: Check
slug:: check
executor:: engine
command:: node -e "process.exit({code})"
exit_codes:: {"3": "retry"}
next:: [@settle, @fetch]

## NN Work: Settle
slug:: settle
executor:: agent
condition:: outcome == ok
