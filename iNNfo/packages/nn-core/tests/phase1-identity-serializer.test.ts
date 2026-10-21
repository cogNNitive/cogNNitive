import { describe, it, expect } from 'vitest'
import { parseKnowledge } from '../src/parser/index.js'
import { serializeKnowledge } from '../src/parser/serializer.js'
import { parseFrontmatter } from '../src/parser/yaml.js'

describe('Phase 1: Stable Identity Frontmatter, Serializer & Type Contracts', () => {
  it('1.1.1 Frontmatter parsing preserves knowledge_slug and workspace_id in SpecFrontmatter', () => {
    const content = `---
spec_version: "V_0-3-0"
knowledge_slug: "customer-journey"
workspace_id: "ws-12345"
level: 3
---

# NN System
`
    const fm = parseFrontmatter(content)
    expect(fm).not.toBeNull()
    expect(fm?.knowledge_slug).toBe('customer-journey')
    expect(fm?.workspace_id).toBe('ws-12345')
  })

  it('1.1.2 Serialization with serializeKnowledge (useRawFrontmatter: false) retains knowledge_slug and workspace_id (D4)', () => {
    const content = `---
spec_version: "V_0-3-0"
knowledge_slug: "customer-journey"
workspace_id: "ws-12345"
level: 3
---

# NN System

## NN System: Core
field:: value
`
    const parsed = parseKnowledge(content)
    delete (parsed as any).rawFrontmatter
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toContain('knowledge_slug: "customer-journey"')
    expect(serialized).toContain('workspace_id: "ws-12345"')
  })

  it('1.1.3 Element serialization emits slug:: <slug> when slugExplicit === true (D1)', () => {
    const content = `---
spec_version: "V_0-3-0"
knowledge_slug: "customer-journey"
level: 3
---

# NN System

## NN System: Core
slug:: core-identity
field:: value
`
    const parsed = parseKnowledge(content)
    const elements = parsed.elements.get('System')
    expect(elements).toBeDefined()
    expect(elements![0].slug).toBe('core-identity')
    expect(elements![0].slugExplicit).toBe(true)

    delete (parsed as any).rawFrontmatter
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toContain('## NN System: Core\nslug:: core-identity\nfield:: value')
  })

  it('1.1.4 Concepts and matrix definitions parse explicit slug declarations and serialize them', () => {
    const content = `---
spec_version: "V_0-3-0"
level: 2
concepts:
  - name: "User"
    slug: "concept-user"
matrices:
  - name: "Interaction"
    slug: "matrix-interaction"
    source: "User"
    target: "System"
---

# NN User
`
    const fm = parseFrontmatter(content)
    expect(fm?.concepts?.[0].slug).toBe('concept-user')
    expect(fm?.matrices?.[0].slug).toBe('matrix-interaction')

    const parsed = parseKnowledge(content)
    delete (parsed as any).rawFrontmatter
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toContain('slug: "concept-user"')
    expect(serialized).toContain('slug: "matrix-interaction"')
  })

  it('1.1.5 A non-grammar prose section survives a frontmatter-only mutation (cogNNitive-web#20)', () => {
    const content = `---
spec_version: "V_0-5-0"
level: 2
blueprint_version: "V_0-1-0"
blueprint_name: "neuro"
title: "Neuro"
parent_spec:
  name: "iNNfo_V_0-5-0"
  url: "https://example/iNNfo_V_0-5-0_NN.md"
---

> [!NOTE]
> note

# NN Concept Definition

## NN Concept Definition: Sintoma
icon:: activity

# Neuro App

## Philosophy

Rigor matters.

## Sintoma

### Summary

Un resumen.
`
    const parsed = parseKnowledge(content)
    // Simulate a managed mutation that switches serializeKnowledge off the
    // raw-frontmatter path (a `bump_version`, for instance).
    parsed.frontmatter.blueprint_version = 'V_0-2-0'
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toContain('blueprint_version: "V_0-2-0"')
    expect(serialized).toContain('# Neuro App')
    expect(serialized).toContain('## Philosophy')
    expect(serialized).toContain('Rigor matters.')
    expect(serialized).toContain('### Summary')
    expect(serialized).toContain('Un resumen.')
  })
})
