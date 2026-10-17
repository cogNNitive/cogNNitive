import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'
import { parseKnowledge, serializeKnowledge } from '../src/parser/index.js'
import { rawPathOfSidecar } from '../src/naming/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(here, '..', '..', '..', '..')

function findModelDocuments(dir: string): string[] {
  const found: string[] = []
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) found.push(...findModelDocuments(full))
      else if (entry.name.endsWith('_NN.md') && rawPathOfSidecar(entry.name) === null) found.push(full)
    }
  } catch {
    // skip non-existent
  }
  return found
}

function sampleFiles(): string[] {
  return findModelDocuments(join(REPO_ROOT, '_samples_nn'))
}

function domainFiles(): string[] {
  const all: string[] = []
  for (const dir of [
    join(REPO_ROOT, '_samples_nn'),
    join(REPO_ROOT, 'ecosystem_NN'),
    join(REPO_ROOT, 'test', 'fixtures', 'testlab'),
    join(REPO_ROOT, 'docs', 'cognitive_nn', 'use-cases'),
    join(REPO_ROOT, 'simulation', 'fixtures'),
  ]) {
    for (const f of findModelDocuments(dir)) {
      if (f.endsWith('domaiNN_NN.md')) all.push(f)
    }
  }
  return all
}

function testlabFiles(): string[] {
  return findModelDocuments(join(REPO_ROOT, 'test', 'fixtures', 'testlab'))
}

function fullCorpus(): string[] {
  return Array.from(new Set([...sampleFiles(), ...domainFiles(), ...testlabFiles()]))
}

describe('Corpus Scan: Concept-Level Fields and Prose Boundary (Task 1.12)', () => {
  const files = fullCorpus()

  it('scans a non-empty corpus of samples, domain files, and testlab', () => {
    expect(files.length).toBeGreaterThan(0)
  })

  it('zero prose consumed as concept fields across corpus', () => {
    const suspiciousKeys: Array<{ file: string; concept: string; field: string; value: unknown }> = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      const parsed = parseKnowledge(content)
      if (parsed.conceptFields) {
        for (const [concept, fields] of Object.entries(parsed.conceptFields)) {
          for (const [key, value] of Object.entries(fields)) {
            // A legitimate property key is short and identifier-like (alphanumeric, underscore, hyphen)
            if (/[\s#*>[\]`]/.test(key) || key.length > 50) {
              suspiciousKeys.push({
                file: relative(REPO_ROOT, file),
                concept,
                field: key,
                value,
              })
            }
          }
        }
      }
    }
    expect(suspiciousKeys).toEqual([])
  })

  it('zero existing concept-level tags:: lines move into content', () => {
    const lostTags: Array<{ file: string; concept: string }> = []
    for (const file of files) {
      const content = readFileSync(file, 'utf-8')
      // Find concept sections `# NN <Concept>` (not element headings `## NN` or `# NN Concept: Element`)
      const lines = content.split('\n')
      let currentConcept: string | null = null
      let inPrologue = false
      for (const line of lines) {
        const topHeading = line.match(/^#\s+NN\s+([^:\n]+)$/)
        if (topHeading) {
          currentConcept = topHeading[1].trim()
          inPrologue = true
          continue
        }
        if (line.match(/^#{2,6}\s+NN/)) {
          inPrologue = false
          currentConcept = null
          continue
        }
        if (inPrologue && currentConcept && /^\s*tags::/.test(line)) {
          const parsed = parseKnowledge(content)
          const hasTags = parsed.conceptTags?.[currentConcept] ?? parsed.conceptFields?.[currentConcept]?.['tags']
          if (!hasTags) {
            lostTags.push({
              file: relative(REPO_ROOT, file),
              concept: currentConcept,
            })
          }
        }
      }
    }
    expect(lostTags).toEqual([])
  })

  it('roundtrip-fidelity stays 100% byte-identical across samples and domain files', () => {
    const mismatches: string[] = []
    for (const file of [...sampleFiles(), ...domainFiles()]) {
      const original = readFileSync(file, 'utf-8')
      const parsed = parseKnowledge(original)
      const serialized = serializeKnowledge(parsed)
      if (serialized !== original) {
        mismatches.push(relative(REPO_ROOT, file))
      }
    }
    expect(mismatches).toEqual([])
  })
})
