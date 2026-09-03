import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import FileRefPill from '../../src/components/editor/FileRefPill.vue'
import { parseSourceRef, slugifyHeading, extractHeadings, resolveHeadingSection } from '../../src/utils/sourceRef'

describe('parseSourceRef utility (sources/nn/ path format)', () => {
  it('parses canonical source reference string with a heading-slug anchor', () => {
    const res = parseSourceRef('sources/nn/The_Goonies.md#opening-scene')
    expect(res.isValid).toBe(true)
    expect(res.filePath).toBe('sources/nn/The_Goonies.md')
    expect(res.fileName).toBe('The_Goonies.md')
    expect(res.slug).toBe('opening-scene')
  })

  it('parses canonical source reference string with accented unicode characters in the path', () => {
    const res = parseSourceRef('sources/nn/Una_noche_en_la_ópera.md#overview')
    expect(res.isValid).toBe(true)
    expect(res.filePath).toBe('sources/nn/Una_noche_en_la_ópera.md')
    expect(res.fileName).toBe('Una_noche_en_la_ópera.md')
    expect(res.slug).toBe('overview')
  })

  it('parses a multi-word heading-slug anchor', () => {
    const res = parseSourceRef('sources/nn/interviews/interview.md#background-and-context')
    expect(res.isValid).toBe(true)
    expect(res.filePath).toBe('sources/nn/interviews/interview.md')
    expect(res.fileName).toBe('interview.md')
    expect(res.slug).toBe('background-and-context')
  })

  it('parses a full-file reference with no anchor', () => {
    const res = parseSourceRef('sources/nn/clientA/report.md')
    expect(res.isValid).toBe(true)
    expect(res.filePath).toBe('sources/nn/clientA/report.md')
    expect(res.fileName).toBe('report.md')
    expect(res.slug).toBeUndefined()
  })

  it('rejects the legacy line-range anchor format', () => {
    expect(parseSourceRef('sources/nn/The_Goonies.md#L13').isValid).toBe(false)
    expect(parseSourceRef('sources/nn/interviews/interview.md#L12-L45').isValid).toBe(false)
  })

  it('rejects strings that do not carry the sources/nn/ prefix', () => {
    expect(parseSourceRef('Just plain text').isValid).toBe(false)
    expect(parseSourceRef('The_Goonies.md#opening-scene').isValid).toBe(false)
    expect(parseSourceRef('src-003 (sources/nn/The_Goonies.md#opening-scene)').isValid).toBe(false)
    expect(parseSourceRef('sources/original/The_Goonies.docx').isValid).toBe(false)
  })

  it('rejects empty and non-string input', () => {
    expect(parseSourceRef('').isValid).toBe(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(parseSourceRef(undefined as any).isValid).toBe(false)
  })
})

describe('slugifyHeading / heading resolution', () => {
  it('slugifies a normal heading', () => {
    expect(slugifyHeading('Market Overview')).toBe('market-overview')
  })

  it('strips punctuation and markdown formatting characters', () => {
    expect(slugifyHeading('## **Q3 Results:** Revenue & Growth!')).toBe('q3-results-revenue-growth')
    expect(slugifyHeading('_Background_ and `context`')).toBe('background-and-context')
  })

  it('disambiguates duplicate headings within the same document (-1, -2, ...)', () => {
    const doc = ['# Overview', 'a', '## Overview', 'b', '## Overview', 'c'].join('\n')
    const headings = extractHeadings(doc)
    expect(headings.map((h) => h.slug)).toEqual(['overview', 'overview-1', 'overview-2'])
  })

  it('resolves a slug to the section from its heading up to the next same-or-higher-level heading', () => {
    const doc = [
      '# Report', // 0
      'intro text', // 1
      '## Market Overview', // 2
      'market line 1', // 3
      'market line 2', // 4
      '## Methodology', // 5
      'methodology text', // 6
    ].join('\n')

    const section = resolveHeadingSection(doc, 'market-overview')
    expect(section).not.toBeNull()
    expect(section?.startLine).toBe(2)
    expect(section?.endLine).toBe(5)
  })

  it('extends the last section to the end of the document', () => {
    const doc = ['# Report', '## Methodology', 'line a', 'line b'].join('\n')
    const section = resolveHeadingSection(doc, 'methodology')
    expect(section?.startLine).toBe(1)
    expect(section?.endLine).toBe(4)
  })

  it('returns null when the slug has no matching heading', () => {
    const doc = ['# Report', '## Overview'].join('\n')
    expect(resolveHeadingSection(doc, 'missing-section')).toBeNull()
  })
})

describe('FileRefPill component (kind="source")', () => {
  it('renders pill with file name and section slug (no synthetic id) when given a parsed canonical reference', () => {
    const parsed = parseSourceRef('sources/nn/Una_noche_en_la_ópera.md#overview')
    const wrapper = mount(FileRefPill, {
      props: {
        kind: 'source',
        filePath: parsed.filePath,
        fileName: parsed.fileName,
        slug: parsed.slug,
      },
      global: {
        plugins: [createPinia()],
      },
    })

    expect(wrapper.text()).toContain('Una_noche_en_la_ópera.md')
    expect(wrapper.text()).toContain('#overview')
    expect(wrapper.text()).not.toContain('src-')
  })
})
