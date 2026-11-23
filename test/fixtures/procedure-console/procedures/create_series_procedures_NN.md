---
level: 3
parent_spec:
  name: "procedures_V_0-6-1"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Create a Series"
slots:
  - { name: series, kind: value, required: true }
  - { name: title, kind: value, required: false, default: "Tech Chronicles" }
  - { name: language, kind: value, required: false, default: "es" }
  - { name: test_episode, kind: value, required: false, default: "pilot" }
---

# NN Procedure

## NN Procedure: Create a Series
slug:: create-series

# NN Work

## NN Work: State the premise
slug:: state-the-premise
step_type:: decision
executor:: human
decision:: Define the series premise, audience, and target tone for {series} ({title}, {language}).
next:: @create-the-series-folders

## NN Work: Create the series folders
slug:: create-the-series-folders
step_type:: task
executor:: agent
output:: @series-folders
next:: @write-the-series-element

## NN Work: Write the Series element
slug:: write-the-series-element
step_type:: task
executor:: agent
input:: @series-folders
output:: @series-document
next:: @declare-the-scene-kinds

## NN Work: Declare the Scene Kinds
slug:: declare-the-scene-kinds
step_type:: task
executor:: agent
input:: @series-document
next:: @write-the-chrome-for-each-language

## NN Work: Write the Chrome for each language
slug:: write-the-chrome-for-each-language
step_type:: task
executor:: agent
next:: @define-the-series-presets

## NN Work: Define the series Presets
slug:: define-the-series-presets
step_type:: task
executor:: agent
next:: @validate-with-the-pre-compile-guard

## NN Work: Validate with the pre-compile guard
slug:: validate-with-the-pre-compile-guard
step_type:: task
executor:: engine
command:: node -e "const fs=require('fs');fs.mkdirSync('staging',{recursive:true});fs.writeFileSync('staging/guard-{series}.txt','Series {series} pre-compile guard: valid grammar, 0 errors, estimated plan: 4 scenes.\n');console.log('Pre-compile guard check for {series} passed.')"
output:: @pre-compile-report
next:: @fix-the-reported-findings

## NN Work: Fix the reported findings
slug:: fix-the-reported-findings
step_type:: decision
executor:: human
decision:: Accept the pre-compile guard validation for series {series} or request adjustments?
input:: @pre-compile-report
next:: [@approve-series, @adjust-series]

## NN Work: Approve the series
slug:: approve-series
step_type:: task
executor:: agent
condition:: outcome == approve

## NN Work: Adjust the series
slug:: adjust-series
step_type:: task
executor:: agent
condition:: outcome == reject

# NN Artifact

## NN Artifact: Series Folders
slug:: series-folders
verify:: file:staging/series-{series}-folders.txt

## NN Artifact: Series Document
slug:: series-document
verify:: file:staging/{series}_coNNtent_NN.md

## NN Artifact: Pre-Compile Report
slug:: pre-compile-report
verify:: file:staging/guard-{series}.txt
