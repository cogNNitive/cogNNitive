---
level: 3
knowledge_version: "V_0-1-0"
title: "Single-visual scenes (Roll A) with a reviewed draft - Villabotijos Today (Celedonio)"
---

> This is an **iNNfo document**: open it with any text editor or view and edit it.

# NN Procedure

## NN Procedure: Draft Single-Visual Scenes (Roll A) for Villabotijos Today
slug:: draft-single-visual-scenes-roll-a-for-villabotijos-today
summary:: Turn one news item into an episode of single-visual scenes resolved by a reviewed draft.

## NN Step: Define the presenter
Define the presenter image once, before the review: Celedonio portrait (`shared/avatar/celedonio_<scenario>.jpeg`), the SAME image for every avatar scene.

## NN Step: Draft the scenes
Split the narration into single-visual scenes. Keep the series structure: `00 Gancho -> 01 Intro (fixed) -> 02..N News -> Closing`, every scene a single visual.

## NN Step: Generate the HTML view
Run `node <nn-video-script>/scripts/build-draft-html.mjs <draft.json> --series series/villabotijos-today` on the draft to produce one self-contained HTML file.

## NN Step: Approve
Wait for the human approval of the plan hash before spending anything. Celedonio stays the presenter of every avatar scene.
