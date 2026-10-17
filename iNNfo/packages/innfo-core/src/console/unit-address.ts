/**
 * Canonical knowledge-unit address builders, parser, and home derivation.
 *
 * Implements the unified knowledge-unit address grammar (spec: knowledge-unit-address).
 */

import { slugifyHeading, parseCitation, normalizeName } from '../sourceRef.js'
import { roleOf } from '../naming/contract.js'

function assertIdentifier(value: string, name: string): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    throw new TypeError(`unitAddress: ${name} cannot be empty`)
  }
  return trimmed
}

export const unitAddress = {
  domain(): string {
    return 'domaiNN_NN.md'
  },

  document(modelId: string): string {
    return assertIdentifier(modelId, 'modelId')
  },

  section(modelId: string, conceptName: string): string {
    const m = assertIdentifier(modelId, 'modelId')
    const c = assertIdentifier(conceptName, 'conceptName')
    return `${m}@concept:${slugifyHeading(c)}`
  },

  element(modelId: string, elementSlug: string): string {
    const m = assertIdentifier(modelId, 'modelId')
    const s = assertIdentifier(elementSlug, 'elementSlug')
    return `${m}@${s}`
  },

  value(baseAddress: string, fieldName: string): string {
    const b = assertIdentifier(baseAddress, 'baseAddress')
    const f = assertIdentifier(fieldName, 'fieldName')
    return `${b}&${f}`
  },

  cell(modelId: string, matrixSlug: string, rowSlug: string, colSlug: string): string {
    const m = assertIdentifier(modelId, 'modelId')
    const mat = assertIdentifier(matrixSlug, 'matrixSlug')
    const r = assertIdentifier(rowSlug, 'rowSlug')
    const c = assertIdentifier(colSlug, 'colSlug')
    return `${m}@${mat}&${r}&${c}`
  },

  concept(family: string, conceptName: string): string {
    const f = assertIdentifier(family, 'family')
    const c = assertIdentifier(conceptName, 'conceptName')
    return `specs/${f}@concept:${slugifyHeading(c)}`
  },

  field(family: string, conceptName: string, fieldName: string): string {
    const f = assertIdentifier(family, 'family')
    const c = assertIdentifier(conceptName, 'conceptName')
    const fld = assertIdentifier(fieldName, 'fieldName')
    return `specs/${f}@concept:${slugifyHeading(c)}&${fld}`
  },

  matrix(family: string, matrixSlug: string): string {
    const f = assertIdentifier(family, 'family')
    const mat = assertIdentifier(matrixSlug, 'matrixSlug')
    return `specs/${f}@matrix:${mat}`
  },
}

export type UnitKind =
  | 'domain'
  | 'document'
  | 'section'
  | 'element'
  | 'value'
  | 'concept'
  | 'field'
  | 'matrix'
  | 'source'

export interface ParsedUnitAddress {
  kind: UnitKind
  modelId?: string
  family?: string
  slug?: string
  subunits: string[]
  raw?: string
  filePath?: string
}

const MODEL_SEGMENT_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/

function isValidModelPath(rawPath: string): boolean {
  if (!rawPath || /^https?:\/\//i.test(rawPath) || /^[a-zA-Z]:[/\\]/.test(rawPath)) return false
  if (rawPath.startsWith('/') || rawPath.startsWith('\\')) return false
  const segments = rawPath.split(/[/\\]/)
  if (segments.length === 0) return false
  for (const seg of segments) {
    if (!seg || seg.includes('.') || !MODEL_SEGMENT_RE.test(seg)) {
      return false
    }
  }
  return true
}

export function parseUnitAddress(address: string): ParsedUnitAddress | null {
  if (!address || typeof address !== 'string') return null
  const trimmed = address.trim()
  if (!trimmed) return null

  // 1. Bare domain entrypoint
  if (trimmed === 'domaiNN_NN.md') {
    return { kind: 'domain', modelId: trimmed, subunits: [] }
  }

  // 2. Units with '@'
  const atIndex = trimmed.indexOf('@')
  if (atIndex !== -1) {
    const modelPart = trimmed.slice(0, atIndex)
    const rest = trimmed.slice(atIndex + 1)
    if (!modelPart || !rest) return null

    // Blueprint definition (specs/<family>@...)
    if (modelPart.startsWith('specs/')) {
      const family = modelPart.slice('specs/'.length)
      if (!isValidModelPath(family)) return null

      const parts = rest.split('&')
      const unitPart = parts[0]
      const subunits = parts.slice(1)

      if (unitPart.startsWith('concept:')) {
        const slug = unitPart.slice('concept:'.length)
        if (!slug) return null
        return {
          kind: subunits.length > 0 ? 'field' : 'concept',
          family,
          slug,
          subunits,
        }
      }
      if (unitPart.startsWith('matrix:')) {
        const slug = unitPart.slice('matrix:'.length)
        if (!slug) return null
        return {
          kind: 'matrix',
          family,
          slug,
          subunits,
        }
      }
      return null
    }

    // Check if modelPart is a valid semantic model path
    if (isValidModelPath(modelPart)) {
      const parts = rest.split('&')
      const unitPart = parts[0]
      const subunits = parts.slice(1)

      if (unitPart.startsWith('concept:')) {
        const slug = unitPart.slice('concept:'.length)
        if (!slug) return null
        return {
          kind: subunits.length > 0 ? 'value' : 'section',
          modelId: modelPart,
          slug,
          subunits,
        }
      }
      if (unitPart.startsWith('matrix:')) {
        const slug = unitPart.slice('matrix:'.length)
        if (!slug) return null
        return {
          kind: 'matrix',
          modelId: modelPart,
          slug,
          subunits,
        }
      }

      // Unprefixed: element, own field value, or matrix cell
      const slug = unitPart
      if (!slug || slug.includes(':')) return null

      if (subunits.length === 2) {
        // matrix cell
        return {
          kind: 'value',
          modelId: modelPart,
          slug,
          subunits,
        }
      }
      if (subunits.length === 1) {
        // element field value
        return {
          kind: 'value',
          modelId: modelPart,
          slug,
          subunits,
        }
      }
      if (subunits.length === 0) {
        // element
        return {
          kind: 'element',
          modelId: modelPart,
          slug,
          subunits: [],
        }
      }
      return null
    }

    // If modelPart has an extension or is not a model path, delegate to citation parser
    const cit = parseCitation(trimmed)
    if (cit) {
      return {
        kind: 'source',
        filePath: cit.filePath,
        slug: cit.slug,
        subunits: cit.subunits ?? [],
        raw: trimmed,
      }
    }
    return null
  }

  // 3. No '@': check if valid bare model id (document)
  // Paths starting with sources/ or specs/ are never model documents
  if (!trimmed.startsWith('sources/') && !trimmed.startsWith('specs/') && isValidModelPath(trimmed)) {
    return {
      kind: 'document',
      modelId: trimmed,
      subunits: [],
    }
  }

  // 4. Delegate to citation parser for Sources
  const cit = parseCitation(trimmed)
  if (cit) {
    return {
      kind: 'source',
      filePath: cit.filePath,
      slug: cit.slug,
      subunits: cit.subunits ?? [],
      raw: trimmed,
    }
  }

  return null
}

export function unitHome(address: string): 'domain' | 'blueprint' | 'knowledge' | 'source' | null {
  if (!address || typeof address !== 'string') return null
  const trimmed = address.trim()
  if (!trimmed || /^https?:\/\//i.test(trimmed) || /^[a-zA-Z]:[/\\]/.test(trimmed)) return null
  if (trimmed.startsWith('/') || trimmed.startsWith('\\') || trimmed.includes('..')) return null

  if (trimmed === 'domaiNN_NN.md' || trimmed.toLowerCase() === 'domainn_nn.md') {
    return 'domain'
  }

  if (trimmed.startsWith('specs/')) {
    return 'blueprint'
  }

  const parsed = parseUnitAddress(trimmed)
  if (parsed) {
    switch (parsed.kind) {
      case 'domain':
        return 'domain'
      case 'concept':
      case 'field':
        return 'blueprint'
      case 'matrix':
        return parsed.family ? 'blueprint' : 'knowledge'
      case 'document':
      case 'section':
      case 'element':
      case 'value':
        return 'knowledge'
      case 'source':
        return 'source'
      default:
        return null
    }
  }

  // Source files by path prefix or file extension (e.g. sources/report.pdf)
  const pathPart = trimmed.split('@')[0]
  if (trimmed.startsWith('sources/') || /\.[a-zA-Z0-9_-]+$/.test(pathPart)) {
    return 'source'
  }

  return null
}

