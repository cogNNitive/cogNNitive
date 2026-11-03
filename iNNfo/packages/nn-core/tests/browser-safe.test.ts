import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as browserExports from '../src/browser'

const FORBIDDEN_IMPORT_RE =
  /(?:from|import)\s*\(?\s*['"](?:node:)?(?:fs|fs\/promises|path|os|child_process|process)['"]|\bprocess\./

describe('address module is browser-safe', () => {
  const dir = join(__dirname, '..', 'src', 'address')
  const files = readdirSync(dir).filter((f) => f.endsWith('.ts'))

  it('contains the expected sources', () => {
    expect(files.sort()).toEqual(['format.ts', 'grammar.ts', 'index.ts', 'parse.ts'])
  })

  it.each(['format.ts', 'grammar.ts', 'index.ts', 'parse.ts'])('%s imports no node built-in', (file) => {
    expect(readFileSync(join(dir, file), 'utf8')).not.toMatch(FORBIDDEN_IMPORT_RE)
  })

  it('flags a node import when one is present', () => {
    expect("import { join } from 'node:path'").toMatch(FORBIDDEN_IMPORT_RE)
    expect('import fs from "fs"').toMatch(FORBIDDEN_IMPORT_RE)
  })
})

describe('schema/storage.ts is browser-safe', () => {
  it('imports no node built-in', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'schema', 'storage.ts'), 'utf8')
    expect(source).not.toMatch(FORBIDDEN_IMPORT_RE)
    expect(source).not.toMatch(/^import /m)
  })
})

describe('domain module is browser-safe', () => {
  const dir = join(__dirname, '..', 'src', 'domain')
  const expected = ['classify.ts', 'index.ts', 'placement.ts', 'skew.ts', 'types.ts']

  it('contains the expected sources', () => {
    expect(readdirSync(dir).filter((f) => f.endsWith('.ts')).sort()).toEqual(expected)
  })

  it.each(expected)('%s imports no node built-in', (file) => {
    expect(readFileSync(join(dir, file), 'utf8')).not.toMatch(FORBIDDEN_IMPORT_RE)
  })
})

describe('domain index is exported from every entry point', () => {
  const names = ['buildDomainIndex', 'versionSkew', 'fileLocalDiagnostics']

  it('browser entry', () => {
    for (const name of names) expect(browserExports).toHaveProperty(name)
  })

  it('node entry', async () => {
    const entry = await import('../src/index')
    for (const name of names) expect(entry).toHaveProperty(name)
  })

  it('trannsform primitives entry exports versionSkew for the nn-preflight mirror', async () => {
    const entry = await import('../src/trannsformPrimitives')
    expect(entry).toHaveProperty('versionSkew')
  })
})

describe('Browser Entry Point', () => {
  it('exports pure spec resolver functions, interface and errors', () => {
    expect(browserExports).toHaveProperty('getSpecForLevel')
    expect(browserExports).toHaveProperty('getBlueprint')
    expect(browserExports).toHaveProperty('getFormatSpec')
    expect(browserExports).toHaveProperty('getDefiNNe')
    // Interface is typescript-only, but let's check class/error type
    expect(browserExports).toHaveProperty('SpecResolutionError')
  })

  it('does NOT export resolveParentChain', () => {
    expect(browserExports).not.toHaveProperty('resolveParentChain')
  })

  it('exports normalizeSingleKnowledge', () => {
    expect(browserExports).toHaveProperty('normalizeSingleKnowledge')
  })
})

describe('address grammar is exported from every entry point', () => {
  const names = ['parseAddress', 'formatAddress', 'isAddressError']

  it('browser entry', () => {
    for (const name of names) expect(browserExports).toHaveProperty(name)
  })

  it('node entry', async () => {
    const entry = await import('../src/index')
    for (const name of [...names, 'parseCitationResult', 'resolveUnitPathResult']) expect(entry).toHaveProperty(name)
  })

  it('trannsform primitives entry', async () => {
    const entry = await import('../src/trannsformPrimitives')
    for (const name of [...names, 'parseCitationResult']) expect(entry).toHaveProperty(name)
  })
})
