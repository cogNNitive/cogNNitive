---
level: 3
parent_spec:
  name: "procedures_V_0-5-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Using the Site Blueprint"
---

# NN Work

## NN Work: Using the Site Blueprint
step_type:: task
condition:: You want to publish content from this domaiNN as a static site
input:: [[Site Model]]
output:: [[Site Model]]
tool:: [[Console]]
scope:: internal
Getting started with the Site blueprint: describe the site once, then add one Page per topic.

## NN Work: Describe the Site
parent:: [[Using the Site Blueprint]]
step_type:: task
next:: [[Add a Page]]
condition:: No Site element exists yet
input:: [[Site Model]]
output:: [[Site Model]]
tool:: [[Console]]
scope:: internal
Add the single Site element with its tagline and an absolute base URL ending in a slash.

## NN Work: Add a Page
parent:: [[Using the Site Blueprint]]
step_type:: task
condition:: The Site element exists
input:: [[Site Model]]
output:: [[Site Model]]
tool:: [[Console]]
scope:: internal
Add a Page with a slug, a kind, an order and a summary, then write the body. Put each kind in its own document.

# NN Artifact

## NN Artifact: Site Model
type:: input
description:: The Site and Page kNNowledge documents of this domaiNN.

# NN Tools

## NN Tools: Console
type:: manual
description:: The cogNNitive console used to author and inspect the model.
