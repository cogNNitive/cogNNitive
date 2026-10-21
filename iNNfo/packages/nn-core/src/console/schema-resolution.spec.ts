import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { resolveConsoleSchema } from './schema-resolution.js'

const HOST_BLUEPRINT = `---
level: 2
spec_version: V_0-3-0
title: "Business"
---

# NN Concept Definition
## NN Concept Definition: Mission
type:: text

# NN Concept Definition
## NN Concept Definition: Service
type:: list
`

const GLOBAL_BLUEPRINT = `---
level: 2
spec_version: V_0-3-0
title: "Global Business"
---

# NN Concept Definition
## NN Concept Definition: GlobalOnly
type:: text
`

describe('resolveConsoleSchema', () => {
  let rootDir: string
  let globalDir: string
  let skillsDir: string

  beforeEach(() => {
    rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-schema-root-'))
    globalDir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-schema-global-'))
    skillsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-schema-skills-'))
  })

  afterEach(() => {
    fs.rmSync(rootDir, { recursive: true, force: true })
    fs.rmSync(globalDir, { recursive: true, force: true })
    fs.rmSync(skillsDir, { recursive: true, force: true })
  })

  function writePackage(base: string, content: string): string {
    const dir = path.join(rootDir, 'specs', 'bluepriNNts', base)
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'spec_NN.md'), content)
    return dir
  }

  it('resolves the workspace package and derives its schema (workspace beats global)', async () => {
    writePackage('business', HOST_BLUEPRINT)
    const globalBusiness = path.join(globalDir, 'business')
    fs.mkdirSync(globalBusiness, { recursive: true })
    fs.writeFileSync(path.join(globalBusiness, 'spec_NN.md'), GLOBAL_BLUEPRINT)

    const result = await resolveConsoleSchema({
      rootDir,
      parentName: 'business',
      globalDir,
      skillsDir,
    })

    expect(result.schemaSource).toBe('blueprint')
    const names = result.schema?.concepts.map((c) => c.name)
    expect(names).toEqual(['Mission', 'Service'])
  })

  it('falls back to the canonical registry when no workspace or global package exists', async () => {
    const result = await resolveConsoleSchema({
      rootDir,
      parentName: 'blank',
      globalDir,
      skillsDir,
    })

    expect(result.schemaSource).toBe('blueprint')
    expect(result.schema?.concepts.length).toBeGreaterThan(0)
  })

  it('composes a recursive include resolved through the same workspace chain', async () => {
    writePackage(
      'host-pkg',
      `---
level: 2
spec_version: V_0-3-0
title: "Host"
includes:
  - name: "extra-pkg"
    url: ""
---

# NN Concept Definition
## NN Concept Definition: HostConcept
type:: text
`,
    )
    writePackage(
      'extra-pkg',
      `---
level: 2
spec_version: V_0-3-0
title: "Extra"
---

# NN Concept Definition
## NN Concept Definition: ExtraConcept
type:: list
`,
    )

    const result = await resolveConsoleSchema({
      rootDir,
      parentName: 'host-pkg',
      globalDir,
      skillsDir,
    })

    expect(result.schemaSource).toBe('blueprint')
    const names = result.schema?.concepts.map((c) => c.name).sort()
    expect(names).toEqual(['ExtraConcept', 'HostConcept'])
  })

  it('degrades gracefully to the derived schema when nothing resolves', async () => {
    const result = await resolveConsoleSchema({
      rootDir,
      parentName: 'totally-unresolvable-xyz',
      globalDir,
      skillsDir,
    })

    expect(result.schemaSource).toBe('derived')
    expect(result.schema).toBeUndefined()
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('resolves a stale versioned parent_spec by family (canonical fallback) and warns', async () => {
    const result = await resolveConsoleSchema({
      rootDir,
      parentName: 'blank_V_0-1-0',
      globalDir,
      skillsDir,
    })

    expect(result.schemaSource).toBe('blueprint')
    expect(result.schema?.concepts.length).toBeGreaterThan(0)
    expect(result.warnings.some((w) => w.includes('blank_V_0-1-0'))).toBe(true)
  })

  it('warns when the referenced version differs from the blueprint, silently otherwise', async () => {
    writePackage(
      'procedures',
      `---
level: 2
spec_version: V_0-3-0
blueprint_version: "V_0-3-3"
title: "Procedures"
---

# NN Concept Definition
## NN Concept Definition: Procedure
type:: list
`,
    )

    const stale = await resolveConsoleSchema({
      rootDir,
      parentName: 'procedures_V_0-3-2',
      globalDir,
      skillsDir,
    })
    expect(stale.schemaSource).toBe('blueprint')
    expect(stale.warnings.some((w) => w.includes('procedures_V_0-3-2') && w.includes('V_0-3-3'))).toBe(true)

    const current = await resolveConsoleSchema({
      rootDir,
      parentName: 'procedures_V_0-3-3',
      globalDir,
      skillsDir,
    })
    expect(current.schemaSource).toBe('blueprint')
    expect(current.warnings).toEqual([])
  })
})
