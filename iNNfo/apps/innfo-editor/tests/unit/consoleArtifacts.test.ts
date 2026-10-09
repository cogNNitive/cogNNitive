import { describe, it, expect } from 'vitest'
import {
  consoleFamilyKey,
  consoleKeyOf,
  latestInFamilyOf,
  latestOfFamilyKey,
  sameConsoleFamily,
  scanHtmlArtifacts,
} from '../../src/utils/consoleArtifacts'
import { buildFakeTree } from '../helpers/fakeFs'

const PATHS = [
  'artifacts/business_console/business_console.html',
  'artifacts/business_console/business_console_20261001T100000Z.html',
  'artifacts/business_console/business_console_20261003T100000Z.html',
  'artifacts/business_console/business_console_20261003T100000Z-2.html',
  'artifacts/business_console/business_console_20261003T100000Z-10.html',
  'artifacts/business_console/innfo-console.bundle_20261003T100000Z.js',
  'artifacts/other_console/other_console.html',
]

describe('consoleFamilyKey', () => {
  it('derives the write-once family key of a console stem', () => {
    expect(consoleFamilyKey('Business_V_1-0-0')).toBe('Business_V_1-0-0_console')
  })
})

describe('latestOfFamilyKey', () => {
  it('picks the latest member by name order, comparing the tie-break numerically', () => {
    expect(latestOfFamilyKey(PATHS, 'business_console')).toBe(
      'artifacts/business_console/business_console_20261003T100000Z-10.html',
    )
  })

  it('matches the key case-insensitively', () => {
    expect(latestOfFamilyKey(PATHS, 'Business_Console')).toBe(
      'artifacts/business_console/business_console_20261003T100000Z-10.html',
    )
  })

  it('treats the unsuffixed file as the oldest member', () => {
    expect(latestOfFamilyKey(['artifacts/a_console.html'], 'a_console')).toBe('artifacts/a_console.html')
  })

  it('returns undefined when no family has that key', () => {
    expect(latestOfFamilyKey(PATHS, 'missing_console')).toBeUndefined()
  })

  it('never mixes folders: the same key in two folders is two families', () => {
    const paths = ['artifacts/x/a_console_20261001T100000Z.html', 'artifacts/y/a_console_20261002T100000Z.html']
    expect(latestOfFamilyKey(paths, 'a_console', 'artifacts/x')).toBe('artifacts/x/a_console_20261001T100000Z.html')
  })
})

describe('latestInFamilyOf', () => {
  it('resolves a reference to an older member to the latest member of its family', () => {
    expect(latestInFamilyOf(PATHS, 'artifacts/business_console/business_console_20261001T100000Z.html')).toBe(
      'artifacts/business_console/business_console_20261003T100000Z-10.html',
    )
  })

  it('tolerates leading ./ and ../ and backslashes', () => {
    expect(latestInFamilyOf(PATHS, '..\\artifacts\\other_console\\other_console.html')).toBe(
      'artifacts/other_console/other_console.html',
    )
  })

  it('returns undefined for a reference outside every family', () => {
    expect(latestInFamilyOf(PATHS, 'artifacts/unknown/unknown.html')).toBeUndefined()
  })
})

describe('scanHtmlArtifacts', () => {
  it('lists every html file under artifacts/ with workspace-relative paths', async () => {
    const root = buildFakeTree('ws', {
      artifacts: {
        'portal_console.html': '<html></html>',
        business_console: { 'business_console_20261003T100000Z.html': '<html></html>', 'notes.md': 'x' },
      },
      'elsewhere.html': '<html></html>',
    })
    expect((await scanHtmlArtifacts(root)).sort()).toEqual([
      'artifacts/business_console/business_console_20261003T100000Z.html',
      'artifacts/portal_console.html',
    ])
  })

  it('returns an empty list when there is no artifacts folder', async () => {
    expect(await scanHtmlArtifacts(buildFakeTree('ws', { 'a.md': 'x' }))).toEqual([])
  })
})

describe('sameConsoleFamily', () => {
  it('is true for two members of one family and false across keys or folders', () => {
    const a = 'artifacts/business_console/business_console_20261001T100000Z.html'
    expect(sameConsoleFamily(a, 'artifacts/business_console/business_console_20261003T100000Z-2.html')).toBe(true)
    expect(sameConsoleFamily(a, '../artifacts/Business_Console/business_console.html')).toBe(true)
    expect(sameConsoleFamily(a, 'artifacts/other_console/other_console.html')).toBe(false)
    expect(sameConsoleFamily(a, 'artifacts/business_console_20261001T100000Z.html')).toBe(false)
  })
})

describe('consoleKeyOf', () => {
  it('returns the lower-cased family key regardless of the suffix', () => {
    expect(consoleKeyOf('artifacts/X/Business_Console_20261001T100000Z-2.html')).toBe('business_console')
    expect(consoleKeyOf('..\\artifacts\\portal_console.html')).toBe('portal_console')
  })
})
