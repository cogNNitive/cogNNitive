---
level: 3
parent_spec:
  name: "documentation_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/templates/documentation/V_0-2-0/spec_NN.md"
model_version: "V_0-2-0"
title: "iNNfo Technical Documentation Model"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[DocSite]]
* [[Section]]
* [[Page]]
* [[NavbarItem]]

# NN DocSite

## NN DocSite: iNNfo Documentation
site_title:: iNNfo Technical Documentation
site_description:: Specifications, core engine packages, visual modeler, and agent MCP integration.
base_path:: docs/innfo/documentation/
site_logo:: favicon.svg
repo_url:: https://github.com/cogNNitive/cogNNitive
nav_enabled:: true

# NN Section

## NN Section: Components
section_order:: 1
parent:: [[iNNfo Documentation]]

## NN Section: Architecture
section_order:: 2
parent:: [[iNNfo Documentation]]

## NN Section: Guides
section_order:: 3
parent:: [[iNNfo Documentation]]

# NN Page

## NN Page: Home
title:: Home
source:: README.md
route:: README
order:: 1
parent:: [[iNNfo Documentation]]
description:: Documentation entry point and overview.

## NN Page: innfo-editor
title:: innfo-editor
source:: innfo-editor.md
route:: innfo-editor
order:: 10
parent:: [[Components]]
description:: Interactive browser-based graphical editor for iNNfo models.

## NN Page: innfo-core
title:: innfo-core
source:: innfo-core.md
route:: innfo-core
order:: 20
parent:: [[Components]]
description:: Core parser, resolver, validator, and AST engine.

## NN Page: innfo-mcp
title:: innfo-mcp
source:: innfo-mcp.md
route:: innfo-mcp
order:: 30
parent:: [[Components]]
description:: Model Context Protocol server exposing iNNfo capabilities to AI agents.

## NN Page: OpenCode Agent
title:: OpenCode Agent
source:: opencode-innfo-agent.md
route:: opencode-innfo-agent
order:: 40
parent:: [[Components]]
description:: Integration guide for OpenCode and Antigravity agent workflows.

## NN Page: Ecosystem
title:: Ecosystem
source:: ecosystem.md
route:: ecosystem
order:: 10
parent:: [[Architecture]]
description:: Holistic view of cogNNitive ecosystem layers (iNNfo, actioNN, eNNvironment).

## NN Page: Specifications
title:: Specifications
source:: specifications.md
route:: specifications
order:: 20
parent:: [[Architecture]]
description:: Formal specification of the iNNfo format and meta-template layers.

## NN Page: OKF Compatibility
title:: OKF Compatibility
source:: ecosystem.md
route:: ecosystem?id=open-knowledge-format-compatibility
order:: 30
parent:: [[Architecture]]
description:: Alignment and compatibility with the Open Knowledge Format standard.

## NN Page: Usage Guide
title:: Usage
source:: usage.md
route:: usage
order:: 10
parent:: [[Guides]]
description:: Practical workflow examples and CLI usage.

## NN Page: Relationships & Connections
title:: Relationships & Connections
source:: relationships.md
route:: relationships
order:: 20
parent:: [[Guides]]
description:: Graph relationships, bidirectional edges, and matrices in iNNfo.

## NN Page: Citations & Provenance
title:: Citations & Provenance
source:: citations-provenance.md
route:: citations-provenance
order:: 30
parent:: [[Guides]]
description:: Unified Citation, Traceability & Provenance Pipeline across sources, models, and artifacts.

# NN NavbarItem

## NN NavbarItem: Ecosistema
label:: 🌐 **Ecosistema**: cognnitive.com
url:: https://cognnitive.com
order:: 1
parent:: [[iNNfo Documentation]]

## NN NavbarItem: iNNfo Specs
label:: 📘 **iNNfo Specs & Engine**: cognnitive.com/innfo
url:: https://cognnitive.com/innfo/documentation/
order:: 2
parent:: [[iNNfo Documentation]]

## NN NavbarItem: actioNN Skills
label:: ⚡ **actioNN Skills Catalog**: cognnitive.com/actionn
url:: https://cognnitive.com/actionn/documentation/
order:: 3
parent:: [[iNNfo Documentation]]

## NN NavbarItem: iNNfo Modeler App
label:: 🛠️ **iNNfo Modeler App**: Abrir App
url:: https://cognnitive.com/innfo/app/
order:: 4
parent:: [[iNNfo Documentation]]

## NN NavbarItem: Bootstrap
label:: 🚀 **Bootstrap**: Instalar en Agente
url:: https://cognnitive.com/use
order:: 5
parent:: [[iNNfo Documentation]]
