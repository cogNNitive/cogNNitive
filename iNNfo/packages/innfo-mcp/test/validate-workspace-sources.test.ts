import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join, relative, isAbsolute, resolve } from 'node:path'
import { rm, mkdir, writeFile } from 'node:fs/promises'
import { validateModel } from '../src/tools/validate.js'

const rootDir = join(import.meta.dirname!, '..', 'temp-test-workspace-sources')

const INDEX = `---
spec_version: "V_0-1-2"
level: 0
title: "Workspace Index"
---

# NN index

* [Plan](./models/Plan_V_1-0-0_NN.md)
`

const MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: Template
  url: "https://example.com/template.md"
model_version: "V_0-1-0"
title: "Plan"
---

# NN index

* [[Stakeholders]]

# NN Stakeholders

## NN Stakeholders: Enterprise Clients
sources:: [present.md#overview, missing.md#intro]
relationship_model:: B2B
`

const PRESENT_SOURCE = `---
source_file: "sources/original/present.txt"
sha256: "0"
---

# Overview

Some normalised text.
`

describe('validate_model workspace mode — sources:: Citations', () => {
  beforeEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
    await mkdir(join(rootDir, 'models'), { recursive: true })
    await mkdir(join(rootDir, 'sources', 'nn'), { recursive: true })
    await writeFile(join(rootDir, 'index.md'), INDEX, 'utf-8')
    await writeFile(join(rootDir, 'models', 'Plan_V_1-0-0_NN.md'), MODEL, 'utf-8')
    await writeFile(join(rootDir, 'sources', 'nn', 'present.md'), PRESENT_SOURCE, 'utf-8')
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('reports a dangling sources:: file as an error and leaves a resolvable one clean', async () => {
    const result = await validateModel(rootDir, 'Plan_V_1-0-0_NN', undefined, undefined, true)

    const dangling = [...result.errors, ...result.warnings].find(
      (d) => d.message.includes('missing.md') && /dangling/i.test(d.message),
    )
    expect(dangling).toBeDefined()
    expect(dangling!.severity).toBe('error')

    const falsePositive = [...result.errors, ...result.warnings].find((d) =>
      d.message.includes('present.md'),
    )
    expect(falsePositive).toBeUndefined()
  })

  it('does not run source validation in single-file (non-workspace) mode', async () => {
    const result = await validateModel(rootDir, 'Plan_V_1-0-0_NN', undefined, undefined, false)
    const anySource = [...result.errors, ...result.warnings].find((d) =>
      d.message.includes('missing.md'),
    )
    expect(anySource).toBeUndefined()
  })

  it('rejects path traversal attempts without reading outside files', async () => {
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    const fs = await import('node:fs')
    const readSpy = vi.spyOn(fs, 'readFileSync')

=======
=======
>>>>>>> Stashed changes
    const fs = (await import('node:fs')).default
    const readSpy = vi.spyOn(fs, 'readFileSync')

    const outsidePath = join(rootDir, '..', 'temp-test-outside.md')
    await writeFile(outsidePath, '# Secret\nleaked', 'utf-8')

<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
    const TRAVERSAL_MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: Template
  url: "https://example.com/template.md"
model_version: "V_0-1-0"
title: "Traversal"
---

# NN index

* [[Escaper]]

# NN Escaper

## NN Escaper: Rogue
<<<<<<< Updated upstream
<<<<<<< Updated upstream
sources:: [../outside.md#secret, /etc/hosts#h, ..\\..\\escape.md#h]
`
    await writeFile(join(rootDir, 'models', 'Traversal_V_1-0-0_NN.md'), TRAVERSAL_MODEL, 'utf-8')

    const result = await validateModel(rootDir, 'Traversal_V_1-0-0_NN', undefined, undefined, true)

    // Check that readFileSync was never called on any path outside rootDir
    for (const call of readSpy.mock.calls) {
      const calledPath = String(call[0])
      const rel = relative(rootDir, calledPath)
      const escapes = rel === '' || rel.startsWith('..') || isAbsolute(rel)
      expect(escapes, `readFileSync was called on escaped path: ${calledPath}`).toBe(false)
    }

    // Traversal citations must be reported as errors/unresolved
    const dangling = [...result.errors, ...result.warnings].filter((d) =>
      /outside\.md|hosts|escape\.md/.test(d.message),
    )
    expect(dangling.length).toBeGreaterThan(0)
    readSpy.mockRestore()
  })

  it('resolves valid in-workspace cross-model and subfolder citations', async () => {
    await mkdir(join(rootDir, 'sub', 'dir'), { recursive: true })
    const SUB_NOTE = `---
source_file: "sub/dir/note.txt"
=======
=======
>>>>>>> Stashed changes
sources:: [sources/nn/../../../temp-test-outside.md#secret, sources/nn/../../../../etc/hosts.md#h, models/../../escape.md#h]
`
    await writeFile(join(rootDir, 'models', 'Traversal_V_1-0-0_NN.md'), TRAVERSAL_MODEL, 'utf-8')
    await writeFile(
      join(rootDir, 'index.md'),
      INDEX + '\n* [Traversal](./models/Traversal_V_1-0-0_NN.md)\n',
      'utf-8',
    )

    try {
      const result = await validateModel(rootDir, 'Traversal_V_1-0-0_NN', undefined, undefined, true)

      // Check that readFileSync was never called on any path outside rootDir
      for (const call of readSpy.mock.calls) {
        const calledPath = String(call[0])
        const resolvedCallPath = resolve(calledPath)
        const rel = relative(rootDir, resolvedCallPath)
        const escapes = rel === '' || rel.startsWith('..') || isAbsolute(rel)
        expect(escapes, `readFileSync was called on escaped path: ${calledPath}`).toBe(false)
      }

      // Traversal citations must be reported as errors/unresolved
      const outsideDangling = [...result.errors, ...result.warnings].find((d) =>
        d.message.includes('temp-test-outside.md'),
      )
      expect(outsideDangling).toBeDefined()
      expect(outsideDangling!.severity).toBe('error')
    } finally {
      await rm(outsidePath, { force: true })
<<<<<<< Updated upstream
=======
      readSpy.mockRestore()
>>>>>>> Stashed changes
    }
  })

  it('resolves valid in-workspace cross-model and subfolder citations', async () => {
    await mkdir(join(rootDir, 'sources', 'nn', 'sub', 'dir'), { recursive: true })
    const SUB_NOTE = `---
source_file: "sources/original/sub/dir/note.txt"
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes
sha256: "0"
---

# SubHeading

Note content.
`
    const OTHER_MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: Template
  url: "https://example.com/template.md"
model_version: "V_0-1-0"
title: "Other"
---

# OtherHeading

Other doc text.
`
<<<<<<< Updated upstream
<<<<<<< Updated upstream
    await writeFile(join(rootDir, 'sub', 'dir', 'note.md'), SUB_NOTE, 'utf-8')
=======
    await writeFile(join(rootDir, 'sources', 'nn', 'sub', 'dir', 'note.md'), SUB_NOTE, 'utf-8')
>>>>>>> Stashed changes
=======
    await writeFile(join(rootDir, 'sources', 'nn', 'sub', 'dir', 'note.md'), SUB_NOTE, 'utf-8')
>>>>>>> Stashed changes
    await writeFile(join(rootDir, 'models', 'Other_NN.md'), OTHER_MODEL, 'utf-8')

    const VALID_CITATIONS_MODEL = `---
specification_version: "V_0-1-0"
level: 3
parent_spec:
  name: Template
  url: "https://example.com/template.md"
model_version: "V_0-1-0"
title: "ValidCitations"
---

# NN index

* [[ValidElem]]

# NN ValidElem

## NN ValidElem: Good
sources:: [sub/dir/note.md#subheading, models/Other_NN.md#otherheading]
`
    await writeFile(
      join(rootDir, 'models', 'ValidCitations_V_1-0-0_NN.md'),
      VALID_CITATIONS_MODEL,
      'utf-8',
    )
<<<<<<< Updated upstream
<<<<<<< Updated upstream
=======
=======
>>>>>>> Stashed changes
    await writeFile(
      join(rootDir, 'index.md'),
      INDEX +
        '\n* [ValidCitations](./models/ValidCitations_V_1-0-0_NN.md)\n* [Other](./models/Other_NN.md)\n',
      'utf-8',
    )
<<<<<<< Updated upstream
>>>>>>> Stashed changes
=======
>>>>>>> Stashed changes

    const result = await validateModel(
      rootDir,
      'ValidCitations_V_1-0-0_NN',
      undefined,
      undefined,
      true,
    )

    const errors = [...result.errors, ...result.warnings].filter(
      (d) => d.message.includes('note.md') || d.message.includes('Other_NN.md'),
    )
    expect(errors).toEqual([])
  })
})

