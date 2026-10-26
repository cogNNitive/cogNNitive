import { createHash } from 'node:crypto'
import type { ProjectSnapshotOptions, SnapshotElement } from './types.js'

export function computeOriginHash(elements: SnapshotElement[]): string {
  const normalized = JSON.stringify(
    elements.map((el) => ({
      name: el.name,
      concept: el.concept,
      fields: Object.keys(el.fields)
        .sort()
        .reduce<Record<string, unknown>>((acc, k) => {
          acc[k] = el.fields[k]
          return acc
        }, {}),
    })),
  )
  return createHash('sha256').update(normalized, 'utf8').digest('hex')
}

export function projectSnapshot(opts: ProjectSnapshotOptions): string {
  const hash = computeOriginHash(opts.elements)
  const title = opts.title ?? opts.importName

  // Group elements by concept
  const byConcept = new Map<string, SnapshotElement[]>()
  for (const el of opts.elements) {
    const list = byConcept.get(el.concept) ?? []
    list.push(el)
    byConcept.set(el.concept, list)
  }

  const lines: string[] = [
    '---',
    `title: ${JSON.stringify(title)}`,
    'level: 3',
    `imported_from: ${JSON.stringify(opts.sourceAddress)}`,
    `origin_path: ${JSON.stringify(opts.originPath)}`,
    `origin_hash: ${JSON.stringify(hash)}`,
    'read_only: true',
    '---',
    '',
    '# NN index',
    '',
  ]

  for (const concept of byConcept.keys()) {
    lines.push(`* [[${concept}]]`)
  }
  lines.push('')

  for (const [concept, elements] of byConcept.entries()) {
    lines.push(`# NN ${concept}`)
    lines.push('')
    for (const el of elements) {
      lines.push(`## NN ${concept}: ${el.name}`)
      for (const [k, v] of Object.entries(el.fields)) {
        if (v !== undefined && v !== null) {
          lines.push(`${k}:: ${String(v)}`)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
