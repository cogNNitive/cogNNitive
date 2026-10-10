# Technical Design: Domain Console Hierarchy, KU Identity & Faceted Omnibar

## 1. Domain Payload Schema (`scripts/export-console.mjs`)

When `--domain` is passed to `export-console.mjs`:
```typescript
interface DomainModelSummary {
  id: string
  title: string
  filePath: string // e.g. "business_model.md"
  conceptNames: string[]
  elementCount: number
}

// In payload.model.elements:
element.modelId = m.id || stem;
element.modelFile = basename(relPath);
element.unitSlug = `${element.modelFile}@${slugify(element.concept)}--${slugify(element.name || element.id)}`;
element.canonicalUnit = `${element.modelFile}@## ${element.concept}: ${element.name || element.id}`;
```

And `payload.model.meta.models` is an array of `DomainModelSummary`.

## 2. Omnibar Query Parser (`innfo-runtime.js`)

The query parser extracts recognized key-value tokens while collecting remaining words as free-text terms:
```javascript
function parseOmnibarQuery(query) {
  var facets = { model: '', concept: '', tag: '', terms: [] };
  var tokens = query.trim().split(/\s+/);
  for (var i = 0; i < tokens.length; i++) {
    var t = tokens[i];
    var m = t.match(/^(model|concept|tag):(.+)$/i);
    if (m) {
      facets[m[1].toLowerCase()] = m[2].toLowerCase();
    } else if (t) {
      facets.terms.push(t.toLowerCase());
    }
  }
  return facets;
}
```

An element matches if:
- If `facets.model` is present, `(element.modelId || element.modelFile).toLowerCase().includes(facets.model)`.
- If `facets.concept` is present, `element.concept.toLowerCase().includes(facets.concept)`.
- If `facets.tag` is present, element tags or fields include it.
- If `facets.terms` has terms, all terms match against name, description, or field values.

## 3. Hierarchical Rail Rendering

In `renderRail(active, concepts, counts, draftCountsByConcept, onConceptSelect, state)`:
- If `state.meta.models` exists and has more than 1 model:
  - Render an accordion using `<ul class="menu menu-xs bg-base-100 p-2">`.
  - For each model, `<details open class="collapse collapse-arrow">` with summary containing file icon, model title/file, and total count badge.
  - Inside, list each concept present in that model with its icon (`InnfoIcons.Icon`), discrete badge border, and count.
  - Clicking model toggles `model:<modelId>` in Omnibar.
  - Clicking concept toggles `model:<modelId> concept:<concept>` in Omnibar.
- Fallback: if `models` is absent or length is 1, keep existing single-model rail.

## 4. Discrete Visual Affordances

- Card borders:
  `style="border-left: 3px solid ${conceptColor};"`
- Badges:
  DaisyUI `.badge .badge-outline .badge-xs` with `style="border-color: ${conceptColor};"`
- KU Locator:
  A copy button next to the model file badge displaying the canonical locator `<span class="badge badge-ghost text-xs">file@unit</span> <button class="btn btn-ghost btn-xs">copy</button>`.
