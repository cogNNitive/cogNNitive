import { describe, expect, it } from 'vitest'
import {
  parseDomainImports,
  projectSnapshot,
  computeImportDiff,
  validateImportSource,
} from '../../src/imports/index.js'
import { parseKnowledge } from '../../src/parser/index.js'

describe('cross-domain-imports: Ponytail Nivel 2', () => {
  describe('Domain and Import Declaration Parsing', () => {
    it('parses valid relative origin domain and filtered concept import', () => {
      const domainDoc = `---
title: "Consumer Domain"
level: 3
---
# NN index
* [[domaiNN]]

# NN domaiNN
## NN domaiNN: Consumer Domain
knowledge_dir:: kNNowledge/

# NN Imported Domain
## NN Imported Domain: inbox
path:: ../inbox

# NN Import
## NN Import: noticias-a
from:: inbox>noticias@concept:noticias?categoria=A
`
      const result = parseDomainImports(domainDoc)
      expect(result.domains).toHaveLength(1)
      expect(result.domains[0]).toEqual({
        alias: 'inbox',
        path: '../inbox',
      })

      expect(result.imports).toHaveLength(1)
      expect(result.imports[0]).toEqual({
        name: 'noticias-a',
        from: 'inbox>noticias@concept:noticias?categoria=A',
        originAlias: 'inbox',
        model: 'noticias',
        concept: 'noticias',
        filters: { categoria: 'A' },
      })
    })

    it('rejects absolute paths, URLs, or invalid origins', () => {
      expect(validateImportSource('https://github.com/org/repo.git').valid).toBe(false)
      expect(validateImportSource('/var/data/domain').valid).toBe(false)
      expect(validateImportSource('C:\\data\\domain').valid).toBe(false)
      expect(validateImportSource('../valid/relative').valid).toBe(true)
      expect(validateImportSource('./local/relative').valid).toBe(true)
    })

    it('rejects transitive snapshot imports (importing from an imported snapshot)', () => {
      const transitiveSource = 'inbox>imports/other/noticias_NN.md@concept:noticias'
      const check = validateImportSource('../inbox', transitiveSource)
      expect(check.valid).toBe(false)
      expect(check.error).toContain('Transitive imports are prohibited')
    })
  })

  describe('Snapshot Projection', () => {
    it('projects matching elements into a read-only Level 3 markdown snapshot', async () => {
      const elements = [
        {
          name: 'Noticia 1',
          concept: 'Noticias',
          slug: 'noticia-1',
          fields: {
            categoria: 'A',
            titulo: 'Primera Noticia',
          },
        },
      ]

      const snapshot = projectSnapshot({
        originAlias: 'inbox',
        importName: 'noticias-a',
        sourceAddress: 'inbox>noticias@concept:noticias?categoria=A',
        originPath: '../inbox',
        elements,
      })

      expect(snapshot).toContain('imported_from: "inbox>noticias@concept:noticias?categoria=A"')
      expect(snapshot).toContain('origin_path: "../inbox"')
      expect(snapshot).toContain('read_only: true')
      expect(snapshot).toContain('origin_hash:')

      // Verifies snapshot is valid Level 3 markdown
      const parsed = parseKnowledge(snapshot)
      expect(parsed.frontmatter.read_only).toBe(true)
      expect(parsed.frontmatter.imported_from).toBe('inbox>noticias@concept:noticias?categoria=A')
      expect(parsed.elements.get('Noticias')).toBeDefined()
      expect(parsed.elements.get('Noticias')![0].name).toBe('Noticia 1')
      expect(parsed.elements.get('Noticias')![0].fields['categoria']).toBe('A')

      // Verifies mutations on snapshot are rejected
      const { applyMutation } = await import('../../src/mutate.js')
      const mutationResult = applyMutation(parsed, 'update_field', {
        concept: 'Noticias',
        element: 'Noticia 1',
        field: 'categoria',
        value: 'B',
      })
      expect(mutationResult.success).toBe(false)
      expect(mutationResult.errors[0].message).toContain('read-only imported snapshot')
    })
  })

  describe('Diff Computation and Refresh Changeset', () => {
    it('detects no change when origin hash matches', () => {
      const elements = [
        {
          name: 'Noticia 1',
          concept: 'Noticias',
          slug: 'noticia-1',
          fields: { categoria: 'A' },
        },
      ]
      const snapshot = projectSnapshot({
        originAlias: 'inbox',
        importName: 'noticias-a',
        sourceAddress: 'inbox>noticias@concept:noticias?categoria=A',
        originPath: '../inbox',
        elements,
      })
      const parsed = parseKnowledge(snapshot)
      const currentHash = parsed.frontmatter.origin_hash as string

      const diff = computeImportDiff({
        currentHash,
        newElements: elements,
      })

      expect(diff.hasChanges).toBe(false)
      expect(diff.changeset).toBeUndefined()
    })

    it('generates a proposed changeset when items change', () => {
      const originalElements = [
        {
          name: 'Noticia 1',
          concept: 'Noticias',
          slug: 'noticia-1',
          fields: { categoria: 'A' },
        },
      ]
      const updatedElements = [
        {
          name: 'Noticia 1',
          concept: 'Noticias',
          slug: 'noticia-1',
          fields: { categoria: 'A', titulo: 'Updated Title' },
        },
        {
          name: 'Noticia 2',
          concept: 'Noticias',
          slug: 'noticia-2',
          fields: { categoria: 'A' },
        },
      ]

      const diff = computeImportDiff({
        currentHash: 'old-sha256-hash',
        newElements: updatedElements,
        targetFile: 'kNNowledge/imports/inbox/noticias-a_NN.md',
        sourceAddress: 'inbox>noticias@concept:noticias?categoria=A',
      })

      expect(diff.hasChanges).toBe(true)
      expect(diff.changeset).toBeDefined()
      expect(diff.changeset?.status).toBe('proposed')
      expect(diff.changeset?.evidence).toBe('inbox>noticias@concept:noticias?categoria=A')
      expect(diff.changeset?.target).toBe('kNNowledge/imports/inbox/noticias-a_NN.md')
    })
  })
})
