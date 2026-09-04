---
spec_version: "V_0-2-0"
spec_url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/templates/documentation/V_0-1-0/spec_NN.md"
level: 2
parent_spec:
  name: "iNNfo_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/iNNfo/main/specs/iNNfo_V_0-2-0_NN.md"
title: "Documentation Specification Template"
template_version: "V_0-1-0"
relationship_types:
  hierarchy:
    enabled: true
    via: "index block"
  evaluable_matrix:
    enabled: false
  graph_edge:
    enabled: false
  sequence:
    enabled: false
procedures:
  - id: "generate-docsify-sidebar"
    name: "Generate Docsify Sidebar"
    path: "procedures/generate_docsify_sidebar_NN.md"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor or view and edit it with [cogNNitive](https://cognnitive.com/innfo/app/innfo-doc).

# NN index

* [[DocSite]]
* [[Section]]
* [[Page]]
* [[Asset]]

# NN Concept Definition

## NN Concept Definition: DocSite
icon:: book-open
type:: text
color:: purple
weight:: 100

## NN Concept Definition: Section
icon:: folder
type:: category
color:: blue
weight:: 80

## NN Concept Definition: Page
icon:: file-text
type:: text
color:: green
weight:: 60

## NN Concept Definition: Asset
icon:: paperclip
type:: list
color:: grey
weight:: 40

# NN Field Definition

## NN Field Definition: title
concept:: Page
type:: string
description:: Display title of the page for navigation and headings.

## NN Field Definition: source
concept:: Page
type:: markdown_file
description:: Workspace-relative path to the markdown content file.

## NN Field Definition: route
concept:: Page
type:: string
description:: Routing path or slug used by Docsify or static site generator.

## NN Field Definition: order
concept:: Page
type:: string
description:: Numeric sequence or key used to sort navigation entries.

## NN Field Definition: description
concept:: Page
type:: string
description:: Summary or SEO description for the page.

## NN Field Definition: parent
concept:: Page
type:: reference
target_concepts:: [DocSite, Section]
description:: Owning Section, or the DocSite itself for a top-level page.

## NN Field Definition: section_order
concept:: Section
type:: string
description:: Sorting sequence for sections in the sidebar.

## NN Field Definition: parent
concept:: Section
type:: reference
target_concepts:: [DocSite]
description:: The DocSite this section belongs to.

## NN Field Definition: site_title
concept:: DocSite
type:: string
description:: Global brand name or title for the documentation site.

## NN Field Definition: site_description
concept:: DocSite
type:: string
description:: Short summary of the documentation site's purpose and scope.

## NN Field Definition: base_path
concept:: DocSite
type:: string
description:: Base URL prefix or workspace directory where documentation lives.

## NN Field Definition: asset_path
concept:: Asset
type:: file
description:: Relative path to static media, image, or attached document.

# Documentation Specification Template

## A level-2 template for technical documentation sites and Docsify workspaces

## Philosophy

A documentation model is an architectural map of knowledge assets, not a container for raw markdown prose. Clean markdown files hold the authoritative text; the documentation model governs site hierarchy, sections, ordering, navigation paths, and asset linkages.

By decoupling the semantic taxonomy from the markdown content, documentation sites can be deterministically compiled, linted for broken links, and rendered by lightweight client-side SPAs (such as Docsify) or static site generators.

## Objectives

- Provide a canonical level-2 template for structuring technical documentation workspaces.
- Model pages with first-class `markdown_file` references.
- Enable deterministic generation of navigation artifacts (`_sidebar.md`, `_navbar.md`).
- Eliminate dead links and orphaned markdown files by validating model paths against the filesystem.


# Concept Guidance Documentation

## DocSite

### Summary
The root container of a documentation model. Exactly one DocSite per model, holding the site identity and the location its content is served from.

### Description
A DocSite is the single top-level element of a documentation model. It declares the site brand (`site_title`), a short summary of what the site covers (`site_description`), and the workspace directory or URL prefix its pages resolve against (`base_path`). Every Section attaches to the DocSite through its `parent` field, and top-level Pages may attach directly to it, so the DocSite is the anchor the whole navigation tree is built from. Use one DocSite per model; to publish separate sites (for example an end-user guide and an internal runbook), create separate documentation models rather than multiple DocSites in one file.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## Section

### Summary
A named grouping of pages in the sidebar — the middle level of the hierarchy, between the DocSite and individual Pages.

### Description
A Section groups related Pages under a common heading in the generated navigation (`_sidebar.md`). Its `parent` points to the owning DocSite, and `section_order` fixes where it appears relative to sibling sections. Sections carry no prose of their own; they exist to give the reader a scannable table of contents. Add a Section whenever a set of pages shares a theme (for example Equipment, Procedures, Personnel) and would otherwise crowd the top level. Pages join a Section through their own `parent` field.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## Page

### Summary
A single documentation page backed by one markdown file — the leaf of the hierarchy and the only concept that maps to authored prose on disk.

### Description
A Page couples a navigation entry to a markdown content file. `source` is the workspace-relative path to that file (`type:: markdown_file`), `route` is the slug the site generator publishes it under, `title` is the label shown in the sidebar and page heading, `order` positions it among sibling pages, and `description` supplies a summary for search and previews. `parent` links the Page to its Section, or directly to the DocSite for a top-level page. The model never stores the page body itself — it only references the file — which keeps the markdown authoritative and lets the site be recompiled and link-checked deterministically.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*

## Asset

### Summary
A static media file — image, diagram, or downloadable attachment — that pages reference but that is not itself a navigation entry.

### Description
An Asset records a binary or non-markdown resource that documentation pages link to, such as an architecture diagram, screenshot, PDF, or logo. `asset_path` is the relative path to the file. Assets do not appear in the sidebar and have no `parent`; they form a flat inventory that lets the model verify referenced media exists on disk and lets tooling report missing or orphaned files. Register an Asset for every non-markdown file the documentation depends on.

### Methodologies
*No methodologies provided.*

### Prompts
*No prompts provided.*
