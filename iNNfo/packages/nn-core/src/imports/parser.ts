import { parseKnowledge } from '../parser/index.js'
import type {
  ImportedDomainDeclaration,
  ImportDeclaration,
  ParsedDomainImports,
} from './types.js'

export function validateImportSource(
  originPath: string,
  sourceAddress?: string,
): { valid: boolean; error?: string } {
  const p = (originPath || '').trim()

  if (/^[a-zA-Z]+:\/\//.test(p) || p.startsWith('http:') || p.startsWith('https:')) {
    return { valid: false, error: 'Remote URL origins are not supported. Use local relative filesystem paths.' }
  }

  if (p.startsWith('/') || p.startsWith('\\') || /^[a-zA-Z]:/.test(p)) {
    return { valid: false, error: 'Absolute paths are not allowed. Use relative filesystem paths.' }
  }

  if (sourceAddress) {
    if (sourceAddress.includes('imports/') || sourceAddress.includes('imports\\')) {
      return { valid: false, error: 'Transitive imports are prohibited. Imports must source directly from origin models.' }
    }
  }

  return { valid: true }
}

export function parseDomainImports(domainContent: string): ParsedDomainImports {
  const parsed = parseKnowledge(domainContent)
  const domains: ImportedDomainDeclaration[] = []
  const imports: ImportDeclaration[] = []

  const domainElements = parsed.elements.get('Imported Domain') ?? []
  for (const el of domainElements) {
    const rawPath = String(el.fields['path'] ?? '').trim()
    domains.push({
      alias: el.name,
      path: rawPath,
    })
  }

  const importElements = parsed.elements.get('Import') ?? []
  for (const el of importElements) {
    const from = String(el.fields['from'] ?? '').trim()
    const gt = from.indexOf('>')
    if (gt === -1) continue

    const originAlias = from.slice(0, gt).trim()
    const rest = from.slice(gt + 1).trim()

    let model = rest
    let concept: string | undefined
    let filters: Record<string, string> | undefined

    const qMark = model.indexOf('?')
    let queryPart = ''
    if (qMark !== -1) {
      queryPart = model.slice(qMark + 1)
      model = model.slice(0, qMark)
    }

    const atSign = model.indexOf('@')
    if (atSign !== -1) {
      const sectionPart = model.slice(atSign + 1)
      model = model.slice(0, atSign)
      if (sectionPart.startsWith('concept:')) {
        concept = sectionPart.slice('concept:'.length)
      } else {
        concept = sectionPart
      }
    }

    if (queryPart) {
      filters = {}
      const pairs = queryPart.split('&')
      for (const pair of pairs) {
        const eq = pair.indexOf('=')
        if (eq !== -1) {
          const k = decodeURIComponent(pair.slice(0, eq).trim())
          const v = decodeURIComponent(pair.slice(eq + 1).trim())
          if (k) filters[k] = v
        }
      }
    }

    imports.push({
      name: el.name,
      from,
      originAlias,
      model,
      concept,
      filters,
    })
  }

  return { domains, imports }
}
