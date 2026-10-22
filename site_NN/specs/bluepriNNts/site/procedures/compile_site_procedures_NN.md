---
level: 3
parent_spec:
  name: "procedures_V_0-5-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/spec_NN.md"
knowledge_version: "V_0-1-0"
title: "Compile the Site"
---

# NN Work

## NN Work: Compile the Site
step_type:: task
condition:: The Site element and at least one Page exist
input:: [[Site Model]]
output:: [[Static Site]]
tool:: scripts/site/compile-site.mjs
scope:: internal
Run the compiler from the repository root. It validates the whole site model first and writes the static site only when every Page is valid.

# NN Artifact

## NN Artifact: Site Model
type:: input
description:: The Site and Page kNNowledge documents of this domaiNN.

## NN Artifact: Static Site
type:: output
description:: The generated HTML files, sitemap and llms.txt. Never edit them by hand.

# NN Tools

## NN Tools: scripts/site/compile-site.mjs
type:: manual
description:: Node script, run from the repository root, that compiles the Site and Page kNNowledge documents into static HTML.
