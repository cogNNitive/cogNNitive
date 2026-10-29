---
level: 3
knowledge_version: "V_0-1-3"
title: "Single-visual scenes (Roll A) with a reviewed draft - iNNteresante (Lucas)"
---

> This is an **iNNfo document**: open it with any text editor and view and edit it.

# NN Procedure

## NN Procedure: Draft Single-Visual Scenes (Roll A) for iNNteresante
slug:: draft-single-visual-scenes-roll-a-for-innteresante
summary:: Turn one news item into an episode of single-visual scenes resolved by a reviewed draft.

## NN Step: Define the presenter
Define the presenter image once, before the review: Lucas portrait with a topic-related outfit and background, the SAME image for every avatar scene (`assets/<slug>/media/avatar_lucas.png`).

## NN Step: Draft the scenes
Split the narration into single-visual scenes. Keep the series structure: `00 Gancho -> 02..N News -> Closing`, every scene a single visual.

## NN Step: Generate the HTML view
Run `node tools/build-draft-html.mjs <draft.json>` on the draft to produce one self-contained HTML file.

## NN Step: Approve
Wait for the human approval of the plan hash before spending anything. Lucas stays the presenter of every avatar scene.
