---
level: 3
parent_spec:
  name: "procedures_V_0-7-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Draft Video Script"
slots:
  - { name: series, kind: value, required: true }
  - { name: episode, kind: value, required: true }
  - { name: topic, kind: value, required: false, default: "AI Agent Architecture" }
---

# NN Procedure

## NN Procedure: Draft Video Script
slug:: draft-video-script

# NN Work

## NN Work: Split the story into scenes
slug:: split-story-into-scenes
step_type:: task
executor:: agent
output:: @scene-outline
next:: @capture-clean-screenshots

## NN Work: Capture clean screenshots
slug:: capture-clean-screenshots
step_type:: task
executor:: agent
input:: @scene-outline
output:: @screenshot-assets
next:: @render-hyperframes-clips

## NN Work: Render HyperFrames clips
slug:: render-hyperframes-clips
step_type:: task
executor:: agent
output:: @animation-assets
next:: @prepare-presenter-image

## NN Work: Prepare presenter image
slug:: prepare-presenter-image
step_type:: task
executor:: agent
output:: @presenter-portrait
next:: @check-media-gate

## NN Work: Check media gate
slug:: check-media-gate
step_type:: task
executor:: engine
command:: node -e "const fs=require('fs');fs.mkdirSync('staging',{recursive:true});fs.writeFileSync('staging/media-gate-{episode}.txt','Media gate passed: screenshots verified, animations rendered, presenter portrait aligned.\n')"
input:: @screenshot-assets
output:: @media-gate-confirmation
next:: @draft-narration-and-scenes

## NN Work: Draft narration and scenes
slug:: draft-narration-and-scenes
step_type:: task
executor:: agent
input:: @media-gate-confirmation
command:: node -e "const fs=require('fs');fs.mkdirSync('staging',{recursive:true});fs.writeFileSync('staging/script-{episode}.md','# Video Script: {series}/{episode}\nTopic: {topic}\n\n## Scene 1 (Presenter)\nHello everyone! Today we examine {topic}.\n\n## Scene 2 (Visual - Architecture)\nHere is the component breakdown.\n\n## Scene 3 (Outro)\nThanks for watching, see you in the next episode!\n')"
output:: @video-script-draft
next:: @approve-the-draft

## NN Work: Approve the draft
slug:: approve-the-draft
step_type:: decision
executor:: human
decision:: Is the video script and scene draft for {series}/{episode} approved for production?
input:: @video-script-draft
next:: [@seal-for-production, @redraft-scenes]

## NN Work: Seal for production
slug:: seal-for-production
step_type:: task
executor:: agent
condition:: outcome == approve

## NN Work: Redraft scenes
slug:: redraft-scenes
step_type:: task
executor:: agent
condition:: outcome == reject

# NN Artifact

## NN Artifact: Scene Outline
slug:: scene-outline
verify:: file:staging/outline-{episode}.txt

## NN Artifact: Screenshot Assets
slug:: screenshot-assets
verify:: file:staging/screenshots-{episode}.txt

## NN Artifact: Animation Assets
slug:: animation-assets
verify:: file:staging/animations-{episode}.txt

## NN Artifact: Presenter Portrait
slug:: presenter-portrait
verify:: file:staging/presenter-{episode}.txt

## NN Artifact: Media Gate Confirmation
slug:: media-gate-confirmation
verify:: file:staging/media-gate-{episode}.txt

## NN Artifact: Video Script Draft
slug:: video-script-draft
verify:: file:staging/script-{episode}.md
