---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/iNNfo_V_0-2-0_NN.md"
template_version: "V_0-1-0"
title: "Platform Capabilities & Value Catalog Template"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: true
  graph_edge:
    enabled: false
  sequence:
    enabled: false
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file defining the Level 2 specification for modeling platform capabilities, end-user value propositions, and interfaces.

# NN index

* [[CapabilityDomain]]
* [[Capability]]
* [[UserBenefit]]
* [[EnablingInterface]]

# NN Concept Definition

## NN Concept Definition: CapabilityDomain
icon:: layers
type:: list
color:: purple
weight:: 100

## NN Concept Definition: Capability
icon:: zap
type:: list
color:: blue
weight:: 90

## NN Concept Definition: UserBenefit
icon:: smile
type:: list
color:: green
weight:: 80

## NN Concept Definition: EnablingInterface
icon:: monitor
type:: list
color:: amber
weight:: 70

# NN Field Definition

## NN Field Definition: domain_code
concept:: CapabilityDomain
type:: string
description:: Unique alphanumeric code for the domain (e.g., DOM-01).

## NN Field Definition: summary
concept:: CapabilityDomain
type:: markdown_inline
description:: High-level purpose and scope of this capability domain.

## NN Field Definition: cap_code
concept:: Capability
type:: string
description:: Unique alphanumeric identifier for the capability (e.g., CAP-01).

## NN Field Definition: domain
concept:: Capability
type:: reference
description:: The capability domain this capability belongs to.

## NN Field Definition: primary_benefit
concept:: Capability
type:: reference
description:: The core user benefit enabled by this capability.

## NN Field Definition: interface
concept:: Capability
type:: reference
description:: The primary interaction interface or delivery mechanism.

## NN Field Definition: maturity
concept:: Capability
type:: string
description:: Current operational maturity (Production, Stable, Beta, Planned).

## NN Field Definition: benefit_code
concept:: UserBenefit
type:: string
description:: Identifier code for the user outcome or benefit.

## NN Field Definition: value_statement
concept:: UserBenefit
type:: markdown_inline
description:: Clear statement of the user ROI or friction eliminated.

## NN Field Definition: interface_type
concept:: EnablingInterface
type:: string
description:: Modality (CLI, Desktop/Web UI, Protocol/MCP, File System).

# NN Marker Definition

## NN Marker Definition: SupportState
applies_to:: [Element]
widget:: cycle
values:: [Core, Advanced, Extensible]
description:: Level of system support and integration.

# NN Matrix Definition

## NN Matrix Definition: CapabilityDomainMatrix
source:: Capability
target:: CapabilityDomain
widget:: boolean
description:: Maps each granular capability to its governing architectural domain.

## NN Matrix Definition: CapabilityBenefitMatrix
source:: Capability
target:: UserBenefit
widget:: boolean
description:: Maps capabilities to direct end-user benefits.

# Concept Guidance Documentation

## CapabilityDomain

### Summary
Strategic architectural domain grouping related system capabilities.

### Description
The `CapabilityDomain` concept models major functional pillars of the platform, defining their core purpose and high-level architectural boundaries.

### Methodologies
- Group related system capabilities under overarching architectural domains.
- Maintain a stable `domain_code` identifier (e.g., DOM-01).

### Prompts
- "Create a `CapabilityDomain` for <domain_name>."
- "List all capabilities under <CapabilityDomain>."

## Capability

### Summary
Granular, user-facing capability delivering concrete system functionality.

### Description
The `Capability` concept represents an individual capability linked to its parent domain, primary enabled user benefit, and delivery interface.

### Methodologies
- Link each `Capability` to its parent `domain` and primary `benefit`.
- Explicitly state `maturity` status.

### Prompts
- "Add a `Capability` named <name> under <domain>."

## UserBenefit

### Summary
Concrete value proposition or friction reduction experienced by end users.

### Description
The `UserBenefit` concept articulates tangible business and operational outcomes, eliminating specific user pains.

### Methodologies
- Articulate clear user ROI and friction removal in `value_statement`.

### Prompts
- "What user benefit is unlocked by <Capability>?"

## EnablingInterface

### Summary
System touchpoint or modality through which capabilities are delivered.

### Description
The `EnablingInterface` concept represents the interaction surface (iNNfo Modeler, MCP Server, CLI, Local File System).

### Methodologies
- Categorize interfaces by delivery modality.

### Prompts
- "Which interfaces support <Capability>?"
