import { describe, it, expect } from 'vitest'
import { buildLineageChain } from '../../src/components/editor/lineageChain'
import type { SourceCitation } from '../../src/stores/knowledgeStore'

function citation(overrides: Partial<SourceCitation> = {}): SourceCitation {
  return {
    nodeId: 'Compras/Pagos/Registrar',
    nodeName: 'Registrar Pago',
    conceptType: 'Procedure',
    modelPath: 'kNNowledge/compras_V_0-1-0_business_NN.md',
    headingSlug: 'registrar-pago',
    slug: 'registrar-pago',
    relationships: [],
    ...overrides,
  }
}

describe('buildLineageChain', () => {
  it('orders upstream, focal, then citations', () => {
    const steps = buildLineageChain({
      sourceFile: 'sources/import/pago.pdf',
      sha256: 'abcdef1234567890',
      filePath: 'sources/import/pago.md',
      fileName: 'pago.md',
      citations: [citation()],
      showOutgoing: false,
    })

    expect(steps.map((s) => s.role)).toEqual(['upstream', 'focal', 'citation'])
    expect(steps[0].label).toBe('sources/import/pago.pdf')
    expect(steps[0].subtitle).toBe('abcdef12...')
    expect(steps[1].label).toBe('pago.md')
    expect(steps[1].id).toBe('sources/import/pago.md')
  })

  it('carries the element id and slug on a citation step', () => {
    const steps = buildLineageChain({
      filePath: 'sources/import/pago.md',
      fileName: 'pago.md',
      citations: [citation()],
      showOutgoing: false,
    })

    const cited = steps.find((s) => s.role === 'citation')!
    expect(cited.id).toBe('Compras/Pagos/Registrar')
    expect(cited.slug).toBe('registrar-pago')
  })

  it('omits the upstream step when there is no source_file', () => {
    const steps = buildLineageChain({
      filePath: 'sources/import/pago.md',
      fileName: 'pago.md',
      citations: [citation()],
      showOutgoing: false,
    })

    expect(steps.some((s) => s.role === 'upstream')).toBe(false)
    expect(steps[0].role).toBe('focal')
  })

  it('summarizes collapsed outgoing relationships as one hidden step', () => {
    const steps = buildLineageChain({
      filePath: 'sources/import/pago.md',
      fileName: 'pago.md',
      citations: [
        citation({
          relationships: [
            { targetId: 'A', label: 'references', origin: 'metamodel' },
            { targetId: 'B', label: 'references', origin: 'metamodel' },
            { targetId: 'C', label: 'references', origin: 'metamodel' },
            { targetId: 'D', label: 'references', origin: 'metamodel' },
            { targetId: 'E', label: 'references', origin: 'metamodel' },
          ],
        }),
      ],
      showOutgoing: false,
    })

    const hidden = steps.filter((s) => s.role === 'related')
    expect(hidden).toHaveLength(1)
    expect(hidden[0].label).toBe('+5 hidden')
  })

  it('expands outgoing relationships up to the cap, then summarizes the rest', () => {
    const steps = buildLineageChain({
      filePath: 'sources/import/pago.md',
      fileName: 'pago.md',
      citations: [
        citation({
          relationships: [
            { targetId: 'A', label: 'references', origin: 'metamodel' },
            { targetId: 'B', label: 'references', origin: 'metamodel' },
            { targetId: 'C', label: 'references', origin: 'metamodel' },
            { targetId: 'D', label: 'references', origin: 'metamodel' },
            { targetId: 'E', label: 'references', origin: 'metamodel' },
          ],
        }),
      ],
      showOutgoing: true,
    })

    const related = steps.filter((s) => s.role === 'related')
    expect(related).toHaveLength(4)
    expect(related[0].id).toBe('A')
    expect(related[3].label).toBe('+2 hidden')
  })
})
