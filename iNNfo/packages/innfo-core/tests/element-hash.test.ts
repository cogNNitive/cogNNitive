import { describe, it, expect } from 'vitest'
import { computeElementHash, hashParsedElement } from '../src/console/element-hash.js'
import { buildConsolePayload } from '../src/console/payload-builder.js'

describe('Element Hashes (canonical JSON of concept, name, description, fields)', () => {
  it('computes golden hash from exactly {concept, name, description, fields}', () => {
    const element = {
      concept: 'Roles',
      name: 'Chief Scientist',
      description: 'Leads R&D',
      fields: {
        importance: 'high',
        tags: ['leadership', 'science'],
      },
    }
    const hash = computeElementHash(element)
    expect(hash).toHaveLength(16)
    // Changing description changes hash
    expect(computeElementHash({ ...element, description: 'Leads engineering' })).not.toBe(hash)
    // Changing an own field changes hash
    expect(computeElementHash({ ...element, fields: { ...element.fields, importance: 'critical' } })).not.toBe(hash)
    // Changing own tags changes hash
    expect(computeElementHash({ ...element, fields: { ...element.fields, tags: ['leadership'] } })).not.toBe(hash)
  })

  it('drops markers from the canonical hash input', () => {
    const elWithoutMarkers = {
      concept: 'Roles',
      name: 'Chief Scientist',
      description: 'Leads R&D',
      fields: { role: 'lead' },
    }
    const elWithMarkers = {
      ...elWithoutMarkers,
      markers: { priority: '!' },
    }
    // With markers dropped from computeElementHash, markers presence should NOT change the hash
    expect(computeElementHash(elWithMarkers as any)).toBe(computeElementHash(elWithoutMarkers))
  })

  it('hash tracks content only (version-only edit is stable)', () => {
    const v1Content = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "projects"
  url: "https://example.com/projects.md"
title: "Project Alpha"
knowledge_version: "V_0-1-0"
---
# NN Tasks
## NN Tasks: Setup
slug:: task-setup
description:: Initial setup
`
    const v2Content = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "projects"
  url: "https://example.com/projects.md"
title: "Project Alpha"
knowledge_version: "V_0-2-0"
---
# NN Tasks
## NN Tasks: Setup
slug:: task-setup
description:: Initial setup
`
    const p1 = buildConsolePayload({ content: v1Content })
    const p2 = buildConsolePayload({ content: v2Content })
    expect(p1.model.elements[0].hash).toBe(p2.model.elements[0].hash)
  })

  it('excludes inherited concept-level values from element hash', () => {
    const contentWithoutConceptField = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "projects"
  url: "https://example.com/projects.md"
title: "Project Alpha"
knowledge_version: "V_0-1-0"
---
# NN Tasks
## NN Tasks: Setup
slug:: task-setup
description:: Initial setup
`
    const contentWithConceptField = `---
spec_version: "V_0-5-0"
level: 3
parent_spec:
  name: "projects"
  url: "https://example.com/projects.md"
title: "Project Alpha"
knowledge_version: "V_0-1-0"
---
# NN Tasks
tags:: [core]

## NN Tasks: Setup
slug:: task-setup
description:: Initial setup
`
    const p1 = buildConsolePayload({ content: contentWithoutConceptField })
    const p2 = buildConsolePayload({ content: contentWithConceptField })
    // The element own hash should be identical because inherited tags are excluded from hash
    expect(p1.model.elements[0].hash).toBe(p2.model.elements[0].hash)
  })
})
