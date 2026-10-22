# Tags & Open Taxonomy

cogNNitive documents support open-ended tagging across all architectural layers. This document outlines the **Open Taxonomy** pattern: lightweight ad-hoc labeling that needs no upfront schema, rendered consistently by the Domain Console.

---

## 1. Concepts: Tags, Fields, and Releases

To keep clean architectural boundaries, cogNNitive distinguishes three dimensions of classification:

| Mechanism | Purpose | Scope | Schema Requirement |
| :--- | :--- | :--- | :--- |
| **Tags (`tags::`)** | Cross-cutting categorization, ad-hoc taxonomy, and multi-dimensional view filtering (e.g. `strategy-a`, `enterprise`, `q4`). | Every Concept and Element | **None** (ad-hoc, open vocabulary). |
| **Fields** | Quantitative evaluation and matrix intersections. A former flag "marker" is now just a value of the built-in `tags` field; a former valued "marker" is a normal Field. Matrix scales and cycles live directly on the `# NN Matrix Definition`. | Concepts, Elements, and Matrices | Defined in the Level 2 `spec_NN.md`. |
| **Releases / Snapshots** | Immutable point-in-time milestones for frozen baselines, pipeline inputs, and public distribution. | Whole domain | Defined via `knowledge_version` frontmatter and git tags. |

> [!TIP]
> **CONCEPTS > CODE**: Use **Tags** to filter the dimensional space (what elements belong to which strategy); use **Releases** to freeze the timeline (a verified baseline of the whole domain).

> [!NOTE]
> The former `Marker` primitive (its definition heading, `item-markers` matrices, and the `set_marker` operation) was **removed** in iNNfo `V_0-5-0`. Attempts to use it fail with `MARKERS_REMOVED` / `UNKNOWN_OPERATION`. Flag markers became values on the built-in `tags` field; valued markers became normal Fields.

---

## 2. Using Tags in Documents (Ad-hoc / Open Vocabulary)

At the document level (Level 3), you can attach `tags::` to any Element or Concept heading without declaring anything upfront in your blueprint:

```markdown
# NN Offering

## NN Offering: Enterprise Cloud Platform
tags:: strategy-growth, b2b, enterprise
price:: 12000
status:: active

## NN Offering: Community Starter
tags:: [strategy-plg, open-source]
price:: 0
status:: active

## NN Offering: Premium Onboarding
tags:: strategy-growth, strategy-plg
price:: 2500
status:: optional
```

### Syntax Rules
* **Comma-separated**: `tags:: strategy-a, b2b, core`
* **Bracket array**: `tags:: [strategy-a, b2b, core]`
* The parser normalizes tags to trimmed, lowercase strings (`string[]`).
* Elements can belong to one, multiple, or zero tags.

---

## 3. `tags` Is a Built-in Field

In `V_0-5-0`, `tags` is the **built-in multi-valued `select` Field** present on every Concept and Element. There is no reserved `Tag` concept in a domaiNN, and no domain-root tag catalog:

* A tag is simply a value of the `tags` field — there is nothing to declare or register.
* Tags are never validated against a closed list; an unknown tag is always valid.
* Adding a tag is adding a value to the field, exactly like any other field value.

---

## 4. Tag Rendering in the Console

The Domain Console renders tags without any per-tag configuration:

1. **Deterministic colors**: Each tag chip's color is computed from the tag **name** with an FNV-1a 32-bit hash (`InnfoUI.tagSlot(name)`). The same tag always gets the same color, on every machine, with no catalog.
2. **No catalog, no fallback**: Because color is hashed from the name, there is no "workspace hit vs. graceful fallback". A tag created ad-hoc in a document renders with the same deterministic chip as any other tag and never triggers a validation warning.

---

## 5. View Projection and Filtering

In the Domain Console, the toolbar narrows the view through `FilterSelect` facets:

* **Models / Concepts**: Filter by document structure (e.g. show only `Offerings` or `Stakeholders`).
* **Fields**: Filter by field presence or value.
* **Tags**: Lists all tags present across the domain. Toggling a tag dynamically filters the view to show only elements carrying it.
  * Multi-tag filtering projects specific combinations (e.g. all offerings belonging to both `strategy-growth` AND `enterprise`).
* **Changes**: Filter by change status.

The search box also accepts a `tags:<tag>` token to filter directly by tag.
