import { describe, it, expect } from 'vitest'
import { normalizeSingleKnowledge } from '../src/recursiveParser/knowledge.js'
import { IdentityRegistry, DuplicateNameError } from '../src/identity.js'

describe('Phase 4: Normalization & Identity Registry Reversing R-IE-02', () => {
  it('4.1.1 Model with identical element names under two distinct concepts retains both elements in normalized graph', () => {
    const md = `---
spec_version: "V_0-3-0"
level: 3
---

# NN Product
## NN Product: Name
slug:: product-name
desc:: Product Name

# NN Vendor
## NN Vendor: Name
slug:: vendor-name
desc:: Vendor Name
`
    const result = normalizeSingleKnowledge(md, 'catalog_NN.md', 'Catalog')
    // No collision error for cross-concept same-name elements
    const duplicateErrors = result.issues.filter(
      (i) => i.severity === 'error' && i.message.toLowerCase().includes('duplicate'),
    )
    expect(duplicateErrors).toHaveLength(0)

    // Both elements retained in graph
    const elements = Object.values(result.nodes).filter((n) => n.kind === 'element')
    expect(elements).toHaveLength(2)

    const productEl = elements.find((n) => n.type === 'Product' && n.name === 'Name')
    const vendorEl = elements.find((n) => n.type === 'Vendor' && n.name === 'Name')

    expect(productEl).toBeDefined()
    expect(vendorEl).toBeDefined()
    expect(productEl!.id).not.toBe(vendorEl!.id)
    expect(productEl!.id).toContain('Product/Name')
    expect(vendorEl!.id).toContain('Vendor/Name')
  })

  it('4.1.2 Sibling elements with duplicate display names under the same concept are rejected with a duplicate sibling error', () => {
    const md = `---
spec_version: "V_0-3-0"
level: 3
---

# NN Product
## NN Product: Name
desc:: First

## NN Product: Name
desc:: Second
`
    const result = normalizeSingleKnowledge(md, 'catalog_NN.md', 'Catalog')
    const duplicateErrors = result.issues.filter(
      (i) => i.severity === 'error' && i.message.toLowerCase().includes('duplicate'),
    )
    expect(duplicateErrors.length).toBeGreaterThan(0)
    // Only one element retained under Product
    const elements = Object.values(result.nodes).filter(
      (n) => n.kind === 'element' && n.type === 'Product',
    )
    expect(elements).toHaveLength(1)
  })

  it('4.1.3 Both cross-concept elements receive distinct qualified IDs in IdentityRegistry', () => {
    const registry = new IdentityRegistry()
    const productConceptId = registry.register('Catalog', 'Product')
    const vendorConceptId = registry.register('Catalog', 'Vendor')

    const productNameId = registry.register(productConceptId, 'Name')
    const vendorNameId = registry.register(vendorConceptId, 'Name')

    expect(productNameId).toBe('Catalog/Product/Name')
    expect(vendorNameId).toBe('Catalog/Vendor/Name')
    expect(productNameId).not.toBe(vendorNameId)

    // Duplicate under same concept throws
    expect(() => registry.register(productConceptId, 'Name')).toThrow(DuplicateNameError)
  })
})
