---
level: 3
parent_spec:
  name: "documentation_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/documentation/V_0-2-0/spec_NN.md"
model_version: "V_0-2-0"
title: "actioNN Documentation Model"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[DocSite]]
* [[Section]]
* [[Page]]
* [[NavbarItem]]

# NN DocSite

## NN DocSite: actioNN Documentation
site_title:: actioNN Agent Skills Documentation
site_description:: Autonomous agent skills, transformation workflows, and design guides for AI pair programming.
base_path:: docs/actionn/documentation/
site_logo:: favicon.svg
repo_url:: https://github.com/cogNNitive/cogNNitive
nav_enabled:: true

# NN Section

## NN Section: Skills
section_order:: 1
parent:: [[actioNN Documentation]]

## NN Section: Samples
section_order:: 2
parent:: [[actioNN Documentation]]

# NN Page

## NN Page: Home
title:: Home
source:: README.md
route:: /documentation/
order:: 1
parent:: [[actioNN Documentation]]
description:: Overview of the actioNN skills catalog and setup guide.

## NN Page: Model Router
title:: Model Router
source:: skills/opencode-model-router.md
route:: skills/opencode-model-router.md
order:: 10
parent:: [[Skills]]
description:: Evaluates whether the active AI model is suitable for the coding task.

## NN Page: Skills Manager
title:: Skills Manager
source:: skills/skills-manager.md
route:: skills/skills-manager.md
order:: 20
parent:: [[Skills]]
description:: Manages skill lifecycles and Windows NTFS junction links.

## NN Page: traNNsform
title:: traNNsform
source:: skills/trannsform.md
route:: skills/trannsform.md
order:: 30
parent:: [[Skills]]
description:: Document ingestion, normalization, and template transformation pipeline.

## NN Page: Citation & Provenance
title:: Citation & Provenance
source:: skills/citation-traceability.md
route:: skills/citation-traceability.md
order:: 40
parent:: [[Skills]]
description:: Full traceability and citation system across raw documents, models, and artifacts.

## NN Page: Web Design Guide
title:: Web Design Guide
source:: skills/web-design-guide.md
route:: skills/web-design-guide.md
order:: 50
parent:: [[Skills]]
description:: Design tokens and light-mode Morado Nazareno guidelines.

## NN Page: Sample ActioNNs
title:: Sample ActioNNs
source:: sample-actionns.md
route:: /samples/meeting-to-summary/
order:: 10
parent:: [[Samples]]
description:: Ready-to-run sample transformation recipes and demonstrations.

# NN NavbarItem

## NN NavbarItem: Ecosistema
label:: 🌐 **Ecosistema**: cognnitive.com
url:: https://cognnitive.com
order:: 1
parent:: [[actioNN Documentation]]

## NN NavbarItem: iNNfo Specs
label:: 📘 **iNNfo Specs & Engine**: cognnitive.com/innfo
url:: https://cognnitive.com/innfo/documentation/
order:: 2
parent:: [[actioNN Documentation]]

## NN NavbarItem: actioNN Skills
label:: ⚡ **actioNN Skills Catalog**: cognnitive.com/actionn
url:: https://cognnitive.com/actionn/documentation/
order:: 3
parent:: [[actioNN Documentation]]

## NN NavbarItem: iNNfo Modeler App
label:: 🛠️ **iNNfo Modeler App**: Abrir App
url:: https://cognnitive.com/innfo/app/
order:: 4
parent:: [[actioNN Documentation]]

## NN NavbarItem: Bootstrap
label:: 🚀 **Bootstrap**: Instalar en Agente
url:: https://cognnitive.com/use
order:: 5
parent:: [[actioNN Documentation]]
