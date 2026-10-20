import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { parseKnowledge, serializeKnowledge } from '../src/parser/index.js'
import { rawPathOfSidecar } from '../src/naming/index.js'
import { applyMutation } from '../src/mutate.js'

/**
 * Requirement 1 (round-trip identity) and Requirement 2 (idempotency) of
 * `model-document-fidelity`, enforced over the real shipped corpus.
 *
 * This is the test that keeps the serializer honest. Every defect it guards
 * against was a silent data loss on save: dropped frontmatter keys, dropped
 * banner text, dropped marker columns, reordered sections, destroyed tag
 * casing, and indentation that compounded on every cycle.
 */

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(here, '..', '..', '..', '..')

function findModelDocuments(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...findModelDocuments(full))
    // Sidecars are machine-written by `cognitivize`, never loaded or saved through the serializer.
    else if (entry.name.endsWith('_NN.md') && rawPathOfSidecar(entry.name) === null) found.push(full)
  }
  return found
}

/** Every shipped document: the sample workspace, plus each template's own samples. */
function corpus(): string[] {
  const samples = findModelDocuments(join(REPO_ROOT, '_samples_nn'))
  const templateSamples = findModelDocuments(join(REPO_ROOT, 'iNNfo', 'specs', 'bluepriNNts')).filter(
    (f) => /[\\/]samples[\\/]/.test(f),
  )
  return [...samples, ...templateSamples]
}

/** First differing line, as `L<n>: <original> -> <serialized>`, for a readable failure. */
function firstDifference(original: string, serialized: string): string {
  const a = original.split('\n')
  const b = serialized.split('\n')
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) {
      return `L${i}: ${JSON.stringify(a[i])} -> ${JSON.stringify(b[i])}`
    }
  }
  return 'no line differs (trailing whitespace only)'
}

describe('round-trip fidelity over the shipped corpus', () => {
  const files = corpus()

  it('finds the shipped corpus', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('parse -> serialize is byte-identical for every shipped document', () => {
    const mismatches: string[] = []
    for (const file of files) {
      const original = readFileSync(file, 'utf-8')
      const serialized = serializeKnowledge(parseKnowledge(original))
      if (serialized !== original) {
        mismatches.push(`${relative(REPO_ROOT, file)} — ${firstDifference(original, serialized)}`)
      }
    }
    expect(mismatches).toEqual([])
  })

  it('serializing twice changes nothing further', () => {
    const notIdempotent: string[] = []
    for (const file of files) {
      const once = serializeKnowledge(parseKnowledge(readFileSync(file, 'utf-8')))
      const twice = serializeKnowledge(parseKnowledge(once))
      if (twice !== once) {
        notIdempotent.push(`${relative(REPO_ROOT, file)} — ${firstDifference(once, twice)}`)
      }
    }
    expect(notIdempotent).toEqual([])
  })

  it('clearing one field removes exactly that line and nothing else', () => {
    const failures: string[] = []
    let cleared = 0
    for (const file of files) {
      const original = readFileSync(file, 'utf-8')
      // Every mutation first freezes element slugs (a documented engine invariant), so the
      // baseline is the document after a bare freeze: the clear must change nothing beyond it.
      const frozen = parseKnowledge(original)
      applyMutation(frozen, 'freeze_slugs', {})
      const baseline = serializeKnowledge(frozen).split('\n')

      const model = parseKnowledge(original)
      let target: { element: string; field: string; index: number } | null = null
      outer: for (const [, nodes] of model.elements.entries()) {
        for (const node of nodes) {
          for (const field of Object.keys(node.fields)) {
            const matching: number[] = []
            baseline.forEach((line, i) => {
              if (line.trim().toLowerCase().startsWith(field.toLowerCase() + '::')) matching.push(i)
            })
            // Only a field whose line is unique in the document is unambiguous to diff.
            if (matching.length === 1) {
              target = { element: node.name, field, index: matching[0] }
              break outer
            }
          }
        }
      }
      if (!target) continue
      const result = applyMutation(model, 'update_field', {
        elementName: target.element,
        fieldName: target.field,
        to: '',
      })
      if (!result.success) {
        failures.push(`${relative(REPO_ROOT, file)} — clear of ${target.field} failed`)
        continue
      }
      cleared++
      const expected = baseline.filter((_, i) => i !== target!.index).join('\n')
      const serialized = serializeKnowledge(model)
      if (serialized !== expected) {
        failures.push(
          `${relative(REPO_ROOT, file)} — clearing ${target.field}: ${firstDifference(expected, serialized)}`,
        )
      }
    }
    expect(failures).toEqual([])
    expect(cleared).toBeGreaterThan(0)
  })
})
