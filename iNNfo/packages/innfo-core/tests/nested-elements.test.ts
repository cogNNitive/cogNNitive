import { describe, it, expect } from 'vitest'
import {
  parseKnowledge,
  serializeKnowledge,
  mergeKnowledge,
  deriveElementSlugs,
  ElementsMap,
  validateTaxonomyHierarchy,
  validateFormatContent,
} from '../src/index.js'
import { normalizeSingleKnowledge } from '../src/recursiveParser/index.js'

describe('Nested Level-3 Elements (Phase 1)', () => {
  const nestedDoc = `---
spec_version: "V_0-4-0"
level: 3
parent_spec:
  name: "video-script"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive/main/iNNfo/specs/bluepriNNts/video-script/spec_NN.md"
title: "Sample Nested Script"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file.

# NN Video

## NN Video: Episode 1
slug:: episode-1
title:: "Episode 1: The Beginning"

# NN Scene

## NN Scene: Intro Scene
slug:: intro-scene
template:: [[talking-head]]
transition:: fade

Welcome to the show everyone.
This is the intro scene narration.

### NN Layer: Main Presenter
slug:: intro-presenter
type:: presenter
asset:: https://example.com/avatar.png
prompt:: Talking head presenter

### NN Layer: Title Overlay
slug:: intro-title
type:: title
text:: Welcome to CogNNitive

## NN Scene: Outro Scene
slug:: outro-scene
transition:: wipe

Thanks for watching, see you next time!

### NN Layer: Outro Brand
type:: brand
asset:: https://example.com/logo.png
`

  it('parses multi-depth headings and tracks headingDepth and parentElement', () => {
    const parsed = parseKnowledge(nestedDoc)
    const videos = parsed.elements.get('Video')
    const scenes = parsed.elements.get('Scene')
    const layers = parsed.elements.get('Layer')

    expect(videos).toBeDefined()
    expect(videos!.length).toBe(1)
    expect(videos![0].headingDepth).toBe(2)
    expect(videos![0].parentElement).toBeUndefined()
    expect(videos![0].parentSlug).toBeUndefined()

    expect(scenes).toBeDefined()
    expect(scenes!.length).toBe(2)

    const intro = scenes![0]
    expect(intro.name).toBe('Intro Scene')
    expect(intro.headingDepth).toBe(2)
    expect(intro.parentElement).toBeUndefined()
    expect(intro.parentSlug).toBeUndefined()
    expect(intro.description).toBe(
      'Welcome to the show everyone.\nThis is the intro scene narration.',
    )

    expect(layers).toBeDefined()
    expect(layers!.length).toBe(3)

    const layer1 = layers![0]
    expect(layer1.name).toBe('Main Presenter')
    expect(layer1.type).toBe('Layer')
    expect(layer1.headingDepth).toBe(3)
    expect(layer1.parentElement).toEqual({
      concept: 'Scene',
      name: 'Intro Scene',
      slug: 'intro-scene',
    })
    expect(layer1.parentSlug).toBe('intro-scene')

    const layer2 = layers![1]
    expect(layer2.name).toBe('Title Overlay')
    expect(layer2.type).toBe('Layer')
    expect(layer2.headingDepth).toBe(3)
    expect(layer2.parentElement).toEqual({
      concept: 'Scene',
      name: 'Intro Scene',
      slug: 'intro-scene',
    })
    expect(layer2.parentSlug).toBe('intro-scene')

    const layer3 = layers![2]
    expect(layer3.name).toBe('Outro Brand')
    expect(layer3.type).toBe('Layer')
    expect(layer3.headingDepth).toBe(3)
    expect(layer3.parentElement).toEqual({
      concept: 'Scene',
      name: 'Outro Scene',
      slug: 'outro-scene',
    })
    expect(layer3.parentSlug).toBe('outro-scene')
  })

  it('separates parent prose body before the first child heading', () => {
    const parsed = parseKnowledge(nestedDoc)
    const intro = parsed.elements.get('Scene')![0]
    // The narration should stop cleanly before ### NN Layer: Main Presenter
    expect(intro.description).not.toContain('Main Presenter')
    expect(intro.description).not.toContain('###')
    expect(intro.description).toBe(
      'Welcome to the show everyone.\nThis is the intro scene narration.',
    )
  })

  it('derives parentSlug from parentElement when parent slug is auto-derived', () => {
    const docWithoutSlugs = `---
spec_version: "V_0-4-0"
level: 3
title: "Script Without Explicit Slugs"
---

# NN Scene

## NN Scene: Act One

Narration here.

### NN Layer: Background Layer
type:: background
asset:: bg.jpg
prompt:: Beautiful sunset
`
    const parsed = parseKnowledge(docWithoutSlugs)
    const scene = parsed.elements.get('Scene')![0]
    const layer = parsed.elements.get('Layer')![0]

    expect(scene.slug).toBe('act-one')
    expect(layer.parentElement?.name).toBe('Act One')
    expect(layer.parentElement?.slug).toBe('act-one')
    expect(layer.parentSlug).toBe('act-one')
  })

  it('supports deeper nesting (e.g. depth 4 #### NN)', () => {
    const deepDoc = `---
title: "Deep Nesting"
---

# NN Root

## NN Root: Level 2
### NN Child: Level 3
#### NN Grandchild: Level 4
prop:: value
`
    const parsed = parseKnowledge(deepDoc)
    const grandchild = parsed.elements.get('Grandchild')![0]
    expect(grandchild.headingDepth).toBe(4)
    expect(grandchild.parentElement).toEqual({
      concept: 'Child',
      name: 'Level 3',
      slug: 'level-3',
    })
    expect(grandchild.parentSlug).toBe('level-3')
  })

  it('preserves headingDepth, parentElement, and parentSlug across AST merge', () => {
    const disk = parseKnowledge(nestedDoc)
    const memory = parseKnowledge(nestedDoc)

    // Modify a field in memory
    const memLayer = memory.elements.get('Layer')![0]
    memLayer.fields.prompt = 'Updated prompt in memory'

    const merged = mergeKnowledge(disk, memory)
    const mergedLayer = merged.elements.get('Layer')![0]

    expect(mergedLayer.fields.prompt).toBe('Updated prompt in memory')
    expect(mergedLayer.headingDepth).toBe(3)
    expect(mergedLayer.parentElement).toEqual({
      concept: 'Scene',
      name: 'Intro Scene',
      slug: 'intro-scene',
    })
    expect(mergedLayer.parentSlug).toBe('intro-scene')
  })

  it('serializes nested child elements inline under their parent and omits empty top-level child concept section', () => {
    const parsed = parseKnowledge(nestedDoc)
    const serialized = serializeKnowledge(parsed)

    // Child elements should be emitted as ### NN Layer: under ## NN Scene:
    expect(serialized).toContain('## NN Scene: Intro Scene')
    expect(serialized).toContain('### NN Layer: Main Presenter')
    expect(serialized).toContain('### NN Layer: Title Overlay')
    expect(serialized).toContain('## NN Scene: Outro Scene')
    expect(serialized).toContain('### NN Layer: Outro Brand')

    // Top-level # NN Layer section should NOT be emitted
    expect(serialized).not.toMatch(/^# NN Layer\b/m)

    // Re-parsing serialized text produces the exact same structure
    const roundTripped = parseKnowledge(serialized)
    expect(roundTripped.elements.get('Layer')?.length).toBe(3)
    expect(roundTripped.elements.get('Layer')![0].parentSlug).toBe('intro-scene')
    expect(roundTripped.elements.get('Layer')![2].parentSlug).toBe('outro-scene')
  })

  it('maintains full backward compatibility for flat legacy documents', () => {
    const flatDoc = `---
spec_version: "V_0-4-0"
level: 3
title: "Flat Script"
---

> [!NOTE]
> This is an **iNNfo document** — a plain-text Markdown file. Open it with any text editor; [cogNNitive](https://cognnitive.com/innfo/) shows it in the domain console.

# NN Scene

## NN Scene: S1
slug:: s1

Scene 1 narration.

## NN Scene: S2
slug:: s2

Scene 2 narration.

# NN Layer

## NN Layer: L1
slug:: s1-layer1
type:: presenter

## NN Layer: L2
slug:: s2-layer2
type:: title
`
    const parsed = parseKnowledge(flatDoc)
    expect(parsed.elements.get('Scene')?.length).toBe(2)
    expect(parsed.elements.get('Layer')?.length).toBe(2)

    // Flat layers have undefined parentSlug and parentElement
    for (const l of parsed.elements.get('Layer')!) {
      expect(l.parentSlug).toBeUndefined()
      expect(l.parentElement).toBeUndefined()
      expect(l.headingDepth).toBe(2)
    }

    // Serializing flat document emits separate # NN Layer section
    const serialized = serializeKnowledge(parsed)
    expect(serialized).toContain('# NN Scene')
    expect(serialized).toContain('## NN Scene: S1')
    expect(serialized).toContain('# NN Layer')
    expect(serialized).toContain('## NN Layer: L1')
    expect(serialized).toContain('## NN Layer: L2')
  })
})

describe('Nested Level-3 Elements Validator & Graph (Phase 2)', () => {
  const blueprintTaxonomy = [
    { parent: 'Video', child: 'Scene' },
    { parent: 'Scene', child: 'Layer' },
  ]

  const templateConcepts = [
    { name: 'Video', type: 'list' as const },
    { name: 'Scene', type: 'list' as const },
    { name: 'Layer', type: 'list' as const },
  ]

  it('passes validation when nested child element conforms to blueprint taxonomy', () => {
    const validNested = `---
spec_version: "V_0-4-0"
level: 3
title: "Valid Nested"
---

# NN Scene

## NN Scene: S1
slug:: s1

### NN Layer: L1
slug:: l1
`
    const parsed = parseKnowledge(validNested)
    const diags = validateTaxonomyHierarchy(parsed, templateConcepts, blueprintTaxonomy)
    const errors = diags.filter((d) => d.severity === 'error')
    expect(errors).toHaveLength(0)
  })

  it('rejects invalid nested child element with INVALID_NESTED_CONCEPT', () => {
    // Attempting to nest Scene under Layer (Layer -> Scene is not in blueprint taxonomy)
    const invalidNested = `---
spec_version: "V_0-4-0"
level: 3
title: "Invalid Nested"
---

# NN Layer

## NN Layer: L1
slug:: l1

### NN Scene: S1
slug:: s1
`
    const parsed = parseKnowledge(invalidNested)
    const diags = validateTaxonomyHierarchy(parsed, templateConcepts, blueprintTaxonomy)
    const invalidConceptErrors = diags.filter((d) => d.code === 'INVALID_NESTED_CONCEPT')

    expect(invalidConceptErrors.length).toBeGreaterThan(0)
    expect(invalidConceptErrors[0].message).toContain(
      'Element "S1" of concept "Scene" cannot be nested under "L1" of concept "Layer" per blueprint taxonomy.',
    )
    expect(invalidConceptErrors[0].path).toBe('elements.Scene.S1')
  })

  it('enforces depth-2 section conformance with SECTION_CONCEPT_MISMATCH', () => {
    // In section # NN Scene, a depth-2 heading ## NN Layer: RogueLayer violates section conformance
    const mismatchDoc = `---
spec_version: "V_0-4-0"
level: 3
title: "Section Mismatch"
---

# NN Scene

## NN Layer: RogueLayer
slug:: rogue-layer
`
    const parsed = parseKnowledge(mismatchDoc)
    const diags = validateTaxonomyHierarchy(parsed, templateConcepts, blueprintTaxonomy)
    const mismatchErrors = diags.filter((d) => d.code === 'SECTION_CONCEPT_MISMATCH')

    expect(mismatchErrors.length).toBeGreaterThan(0)
    expect(mismatchErrors[0].message).toContain(
      'Element "RogueLayer" of concept "Layer" cannot be declared as a top-level heading in section "# NN Scene"',
    )
  })

  it('validates content syntax accepting #{2,6} NN in body-element-markers', () => {
    const docWithH3 = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "0.1.0"
title: "Nested Markers Document"
---

> [!NOTE]
> This is an **iNNfo document**.

# NN Scene

## NN Scene: S1
Narration.

### NN Layer: L1
type:: presenter
`
    const report = validateFormatContent(docWithH3, 'nested_doc_NN.md')
    const markerCheck = report.checks.find((c) => c.id === 'body-element-markers')
    expect(markerCheck).toBeDefined()
    expect(markerCheck!.passed).toBe(true)
  })

  it('normalizes parent-child graph edges prioritizing parentSlug / parentElement', () => {
    const doc = `---
spec_version: "V_0-4-0"
level: 3
knowledge_version: "0.1.0"
title: "Graph Script"
---

# NN Scene

## NN Scene: Intro Scene
slug:: intro-scene

### NN Layer: Main Avatar
slug:: main-avatar
`
    const result = normalizeSingleKnowledge(doc, 'script_NN.md', 'script')
    expect(result.issues).toHaveLength(0)

    const sceneNode = Object.values(result.nodes).find(
      (n) => n.kind === 'element' && n.name === 'Intro Scene',
    )
    const layerNode = Object.values(result.nodes).find(
      (n) => n.kind === 'element' && n.name === 'Main Avatar',
    )

    expect(sceneNode).toBeDefined()
    expect(layerNode).toBeDefined()

    // Layer's parentId should be the Scene node's id
    expect(layerNode!.parentId).toBe(sceneNode!.id)
    // Scene's childIds should contain the Layer node's id
    expect(sceneNode!.childIds).toContain(layerNode!.id)
  })
})

