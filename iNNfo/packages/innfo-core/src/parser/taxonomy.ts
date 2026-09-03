import { TaxonomyEdge } from '../types'
import { normalizeSource, WIKILINK_RE } from './markdown'

export function parseIndexBlock(content: string): TaxonomyEdge[] {
  const edges: TaxonomyEdge[] = []
  const lines = normalizeSource(content).split('\n')
  const stack: Array<{ name: string; indent: number }> = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed.startsWith('*') && !trimmed.startsWith('-')) continue
    const indent = line.search(/\S/)

    // Index items use [[wikilinks]]
    const wikiMatch = /\[\[([^\]]+)\]\]/.exec(trimmed)
    if (!wikiMatch) continue
    const name = wikiMatch[1].trim()

    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
      stack.pop()
    }

    if (stack.length > 0 && indent > stack[stack.length - 1].indent) {
      edges.push({ parent: stack[stack.length - 1].name, child: name })
    } else {
      edges.push({ parent: '', child: name })
    }
    stack.push({ name, indent })
  }
  return edges
}

export function printTaxonomyNode(
  name: string,
  allEdges: TaxonomyEdge[],
  lines: string[],
  depth: number,
): void {
  if (name !== '') {
    const indent = '  '.repeat(depth)
    lines.push(`${indent}* [[${name}]]`)
  }
  const children = allEdges.filter((e) => e.parent === name)
  for (const child of children) {
    printTaxonomyNode(child.child, allEdges, lines, depth + 1)
  }
}
