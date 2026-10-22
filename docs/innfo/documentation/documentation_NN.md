---
level: 3
parent_spec:
  name: "documentation_V_0-4-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/documentation/spec_NN.md"
knowledge_version: "V_0-4-0"
title: "iNNfo Technical Documentation"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN index

* [[DocSite]]
* [[Section]]
* [[Page]]
* [[NavbarItem]]

# NN DocSite

## NN DocSite: iNNfo Documentation
site_title:: iNNfo Technical Documentation
site_description:: Specifications, core engine packages, the domain console, and agent MCP integration.
base_path:: docs/innfo/documentation/
site_logo:: favicon.svg
repo_url:: https://github.com/cogNNitive/cogNNitive-web
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

## NN Section: Blueprints
title:: Blueprints
section_order:: 4
parent:: [[iNNfo Documentation]]

## NN Section: Runtime & Internals
section_order:: 5
parent:: [[iNNfo Documentation]]

# NN Page

## NN Page: Home
title:: Home
source:: README.md
route:: README
order:: 1
parent:: [[iNNfo Documentation]]
description:: Documentation entry point and overview.

## NN Page: nn-core
title:: nn-core
source:: nn-core.md
route:: nn-core
order:: 20
parent:: [[Components]]
description:: Core parser, resolver, validator, and AST engine (@cognnitive/nn-core).

## NN Page: nn-mcp
title:: nn-mcp
source:: nn-mcp.md
route:: nn-mcp
order:: 30
parent:: [[Components]]
description:: Model Context Protocol server (@cognnitive/nn-mcp) exposing iNNfo capabilities to AI agents.

## NN Page: OpenCode Agent
title:: OpenCode Agent (Legacy)
source:: opencode-nn-agent.md
route:: opencode-nn-agent
order:: 40
parent:: [[Components]]
description:: Legacy integration guide for OpenCode and Antigravity agent workflows.

## NN Page: Vocabulary
title:: Vocabulary
source:: vocabulary.md
route:: vocabulary
order:: 5
parent:: [[Architecture]]
description:: Canonical ubiquitous language dictionary across defiNNition, iNNfo, bluepriNNts, kNNowledge, and domaiNNs.

## NN Page: Ecosystem
title:: Ecosystem
source:: ecosystem.md
route:: ecosystem
order:: 10
parent:: [[Architecture]]
description:: Holistic view of cogNNitive ecosystem layers (defiNNition, iNNfo, bluepriNNts, kNNowledge, domain console, agent skills).

## NN Page: Specifications
title:: Specifications
source:: specifications.md
route:: specifications
order:: 20
parent:: [[Architecture]]
description:: Formal specification of the defiNNition meta-specification, iNNfo format (V_0-5-0), and Level 2 bluepriNNt layers.

## NN Page: OKF Compatibility
title:: OKF Alignment
source:: ecosystem.md
route:: ecosystem?id=open-knowledge-format-alignment
order:: 30
parent:: [[Architecture]]
description:: Conceptual inspiration and architectural alignment with the Open Knowledge Format (OKF v0.1), plus future compatibility via a dedicated export mechanism.

## NN Page: Discipline Overlaps
title:: Discipline Overlaps
source:: discipline-overlaps.md
route:: discipline-overlaps
order:: 40
parent:: [[Architecture]]
description:: How cogNNitive overlaps with established disciplines — Model-Driven Engineering, Knowledge Management, Enterprise Architecture, Ontology Engineering, Docs as Code, and Personal Knowledge Management.

## NN Page: Integrations
title:: External Tooling & Integrations
source:: integrations.md
route:: integrations
order:: 50
parent:: [[Architecture]]
description:: Integration of independent external tools (MCP vs CLI), with the WaveSpeed image-generation case study.

## NN Page: Why cogNNitive
title:: Why cogNNitive
source:: value-proposition.md
route:: value-proposition
order:: 5
parent:: [[Guides]]
description:: The problem with chatting straight to a general LLM, and the four pillars cogNNitive addresses — efficiency, traceability, review comfort, and no vendor lock-in.

## NN Page: Usage Guide
title:: Usage
source:: usage.md
route:: usage
order:: 10
parent:: [[Guides]]
description:: Practical workflow examples, kNNowledge authoring, and CLI usage.

## NN Page: Relationships & Connections
title:: Relationships & Connections
source:: relationships.md
route:: relationships
order:: 20
parent:: [[Guides]]
description:: Graph relationships, bidirectional edges, and matrices in iNNfo.

## NN Page: Knowledge Lifecycle
title:: The Knowledge Lifecycle
source:: knowledge-lifecycle.md
route:: knowledge-lifecycle
order:: 25
parent:: [[Guides]]
description:: How kNNowledge enters, is structured, exported to artifacts/, changed via changes/*_changes_NN.md, and traced end to end.

## NN Page: Sources, Citations & Lineage
title:: Sources, Citations & Lineage
source:: sources-citations-lineage.md
route:: sources-citations-lineage
order:: 30
parent:: [[Guides]]
description:: How the pipeline tracks where kNNowledge comes from, with three terms — Source, Citation, Lineage.

## NN Page: Import Modes & Dynamic Sources
title:: Import Modes & Dynamic Sources
source:: import-modes.md
route:: import-modes
order:: 32
parent:: [[Guides]]
description:: How new files enter the domaiNN — one-off, snapshot series, watched folders, and external connectors (APIs) — and how the impact check keeps living sources from silently breaking citations.

## NN Page: Building a Domain from Scratch
title:: Building a Domain from Scratch
source:: domain-from-scratch.md
route:: domain-from-scratch
order:: 34
parent:: [[Guides]]
description:: A hands-on worked example: scaffold an empty domaiNN, ingest sources, author kNNowledge with citations, export an artifact, apply a changeset via apply_change, and read the lineage record.

## NN Page: Lifecycle Walkthrough
title:: Lifecycle Walkthrough (Case Study)
source:: lifecycle-walkthrough.md
route:: lifecycle-walkthrough
order:: 35
parent:: [[Guides]]
description:: End-to-end walkthrough of the 3-phase kNNowledge lifecycle using the Ghostbusters Inc. sample domaiNN and changeset review flow.

## NN Page: Reviewer Guide
title:: Reviewer Guide
source:: reviewer-guide.md
route:: reviewer-guide
order:: 38
parent:: [[Guides]]
description:: How domain experts and stakeholders review kNNowledge in domaiNN_console.html and export changes/*_changes_NN.md changesets for apply_change.

## NN Page: Tags & Open Taxonomy
title:: Tags & Open Taxonomy
source:: tags-and-taxonomy.md
route:: tags-and-taxonomy
order:: 40
parent:: [[Guides]]
description:: Cross-cutting categorization with the built-in tags Field, deterministic FNV-1a tag colors, and multi-dimensional console filtering.

## NN Page: Collaboration with Git
title:: Collaboration with Git
source:: collaboration-git.md
route:: collaboration-git
order:: 50
parent:: [[Guides]]
description:: Gated domaiNN-to-Git review workflow with private defaults, branch-per-change PR gates, version map, and offline backup.

## NN Page: Workspace Backup Strategies
title:: Domain Backup Strategies
source:: workspace-backups.md
route:: workspace-backups
order:: 60
parent:: [[Guides]]
description:: Layered domaiNN safety model: user-led snapshots, full-tree recursive migration backups with SHA-256 manifests, and the optional Git collaboration layer.

## NN Page: Editing kNNowledge by Hand
title:: Editing kNNowledge by Hand
source:: manual-editing-risks.md
route:: manual-editing-risks
order:: 70
parent:: [[Guides]]
description:: Why hand-editing kNNowledge documents is unsupported for routine changes, what silently breaks (duplicate slugs, hash drift, dangling references), and the changeset-based alternatives.

## NN Page: Templates Overview
title:: Blueprints Overview
source:: templates.md
route:: templates
order:: 10
parent:: [[Blueprints]]
description:: Overview of the iNNfo Level 2 bluepriNNts that define schemas for a domaiNN.

## NN Page: Video Script Blueprint
title:: Video Script Blueprint
source:: template-video.md
route:: template-video
order:: 20
parent:: [[Blueprints]]
description:: The video-script bluepriNNt (V_0-2-2) and its generated scenes and artifacts.

## NN Page: Offline Consoles
title:: Offline Consoles
source:: offline-consoles.md
route:: offline-consoles
order:: 10
parent:: [[Runtime & Internals]]
description:: How generated consoles (domaiNN_console.html) boot offline from file:// via static script tags and the vendored nn-console.bundle.js UMD bundle.

## NN Page: Console Needs & Visuals
title:: Console Needs & Visuals
source:: console-needs-and-visuals.md
route:: console-needs-and-visuals
order:: 20
parent:: [[Runtime & Internals]]
description:: Capability needs, changeset export (changes/*_changes_NN.md), and bluepriNNt-driven concept color/icon in generated consoles.

## NN Page: Console UI Kit
title:: Console UI Kit
source:: console-ui-kit.md
route:: console-ui-kit
order:: 25
parent:: [[Runtime & Internals]]
description:: Design tokens and presentational components (InnfoUI) shared by generated consoles.

## NN Page: Validator Behavior
title:: Validator Behavior
source:: validator-behavior.md
route:: validator-behavior
order:: 30
parent:: [[Runtime & Internals]]
description:: Deterministic validation (validate_knowledge, validate_blueprint, check_domain), differential baseline_path output, version inference, and domaiNN-first resolution.

# NN NavbarItem

## NN NavbarItem: Ecosystem
label:: 🌐 **Ecosystem**: cognnitive.com
url:: /
order:: 1
parent:: [[iNNfo Documentation]]

## NN NavbarItem: iNNfo Specs
label:: 📘 **iNNfo Specs & Engine**: cognnitive.com/innfo
url:: /innfo/documentation/
order:: 2
parent:: [[iNNfo Documentation]]

## NN NavbarItem: Agent Skills
label:: ⚡ **Agent Skills Catalog**: cognnitive.com/skills
url:: /skills/documentation/
order:: 3
parent:: [[iNNfo Documentation]]

## NN NavbarItem: Domain Console
label:: 🖥️ **Domain Console**: Read the docs
url:: /innfo/documentation/#/offline-consoles
order:: 4
parent:: [[iNNfo Documentation]]

## NN NavbarItem: Bootstrap
label:: 🚀 **Bootstrap**: Install in Agent
url:: /use
order:: 5
parent:: [[iNNfo Documentation]]
