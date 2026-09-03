# Design: Template Concept Hierarchy via `parent::` Field

## Architecture & Data Structures

### 1. `Concept` Interface in `packages/innfo-core/src/types.ts`
Add `parent?: string` to `Concept`:
```typescript
export interface Concept {
  name: string
  parent?: string
  icon?: string
  type: ConceptType
  color?: string
  weight?: number
  fields?: ConceptField[]
  tags?: string[]
}
```

### 2. Schema Extraction in `packages/innfo-core/src/schema.ts`
During `extractTemplateSchema`:
1. Parse `parent::` property from `# NN Concept Definition` elements:
   ```typescript
   function cleanWikilink(val: string | undefined): string | undefined {
     if (!val) return undefined
     const trimmed = val.trim()
     if (trimmed.startsWith('[[') && trimmed.endsWith(']]')) {
       return trimmed.slice(2, -2).trim()
     }
     return trimmed
   }
   ```
2. For each Concept Definition:
   `parent: cleanWikilink(asString(el.fields['parent']))`
3. Derive `taxonomy: TaxonomyEdge[]`:
   - Check if any concept defines `parent`:
     `const hasParentDecls = concepts.some(c => c.parent !== undefined)`
   - If `hasParentDecls`:
     For each `concept` in `concepts`:
       `taxonomy.push({ parent: concept.parent ?? '', child: concept.name })`
   - Else fallback to `parsed.taxonomy` (parsed from `# NN index`).

### 3. Semantic Validation in `packages/innfo-core/src/validator/content.ts`
Add validation checks for Level 2 and Level 3:
1. **Level 2 - Parent Exists:** For each concept with `parent`, verify that `concepts.some(c => c.name.toLowerCase() === parent.toLowerCase())`. If not found, report error `template-parent-not-found`.
2. **Level 2 - No Cycles:** Walk up parent chains with cycle detection. If a cycle is detected, report error `template-parent-cycle`.
3. **Level 3 - Redundant / Disallowed Index:** If `fm.level === 3` and `parsed.taxonomy.length > 0`, emit warning `l3-index-ignored`: `"Level 3 models must not declare an '# NN index' block; taxonomy is owned by the parent template."`
4. **Syntax/Content Index Check:** If concepts are present, do not require an `# NN index` section if the concepts themselves declare structure or if it's Level 3.

### 4. Hierarchy Validation in `packages/innfo-core/src/validator/hierarchy.ts`
In `validateTaxonomyHierarchy`:
Change:
```typescript
const effectiveTaxonomy = templateTaxonomy && templateTaxonomy.length > 0 ? templateTaxonomy : model.taxonomy
```
Level 3 models MUST NOT override template taxonomy.
