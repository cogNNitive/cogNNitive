---
level: 3
parent_spec:
  name: "procedures_V_0-1-0"
  url: "https://example.invalid/procedures_V_0-1-0.md"
knowledge_version: "V_0-1-0"
title: "Draft Scene Visuals"
slots:
  - { name: presenter_persona, kind: value, required: true }
  - { name: scene_structure, kind: value, required: true }
  - { name: tools_invocation, kind: value, required: true }
---

# NN Procedure

## NN Procedure: Draft Single-Visual Scenes (Roll A) for {{series_name}}
slug:: draft-single-visual-scenes-roll-a-for-{{series_slug}}
summary:: Turn one news item into an episode of single-visual scenes resolved by a reviewed draft.

## NN Step: Define the presenter
Define the presenter image once, before the review: {{slot:presenter_persona}}

## NN Step: Draft the scenes
Split the narration into single-visual scenes. Keep the series structure: {{slot:scene_structure}}

## NN Step: Generate the HTML view
Run {{slot:tools_invocation}} on the draft to produce one self-contained HTML file.

## NN Step: Approve
Wait for the human approval of the plan hash before spending anything. {{presenter}} stays the presenter of every avatar scene.
