import type { SourceCitation } from '../../stores/knowledgeStore'

export type LineageRole = 'upstream' | 'focal' | 'citation' | 'related'

export interface LineageStep {
  role: LineageRole
  icon: string
  label: string
  id?: string
  slug?: string
  ref?: string
  subtitle?: string
}

export interface LineageChainInput {
  sourceFile?: string
  sha256?: string
  filePath: string
  fileName: string
  unitLabel?: string
  slug?: string
  citations: SourceCitation[]
  showOutgoing: boolean
  outgoingCap?: number
}

const OUTGOING_CAP = 3

export function buildLineageChain(input: LineageChainInput): LineageStep[] {
  const steps: LineageStep[] = []
  const cap = input.outgoingCap ?? OUTGOING_CAP

  const focalRef = input.unitLabel
    ? `@${input.unitLabel}`
    : input.slug
      ? `#${input.slug}`
      : undefined

  if (input.sourceFile) {
    steps.push({
      role: 'upstream',
      icon: '📄',
      label: input.sourceFile,
      id: input.sourceFile,
      subtitle: input.sha256 ? input.sha256.substring(0, 8) + '...' : undefined,
    })
  }

  steps.push({
    role: 'focal',
    icon: '🔍',
    label: input.fileName,
    id: input.filePath,
    ref: focalRef,
    slug: input.slug,
  })

  for (const citation of input.citations) {
    const headingRef = citation.headingSlug
      ? `${citation.modelPath || citation.nodeName}#${citation.headingSlug}`
      : citation.modelPath || undefined

    const elementSlug = citation.slug

    steps.push({
      role: 'citation',
      icon: '🧩',
      label: `${citation.conceptType}: ${citation.nodeName}`,
      id: citation.nodeId,
      slug: elementSlug,
      ref: headingRef,
    })

    const outRels = (citation.relationships ?? []).filter((r) => r.origin !== 'source')
    if (outRels.length === 0) continue

    if (!input.showOutgoing) {
      steps.push({
        role: 'related',
        icon: '○',
        label: `+${outRels.length} hidden`,
        subtitle: 'related',
      })
      continue
    }

    const shown = outRels.slice(0, cap)
    for (const rel of shown) {
      steps.push({
        role: 'related',
        icon: '🔗',
        label: rel.label || rel.targetId,
        id: rel.targetId,
        subtitle: rel.origin,
      })
    }
    if (outRels.length > cap) {
      steps.push({
        role: 'related',
        icon: '○',
        label: `+${outRels.length - cap} hidden`,
        subtitle: 'related',
      })
    }
  }

  return steps
}
