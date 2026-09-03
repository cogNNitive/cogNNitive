import { describe, it, expect } from 'vitest'
import { buildFormatFilename, parseFormatFilename, compareSemVer } from '../../src/utils/version'

describe('version utilities', () => {
  it('buildFormatFilename sanitizes spaces in baseName into hyphens', () => {
    const filename = buildFormatFilename('My Model Name', 'business', {
      major: 1,
      minor: 2,
      patch: 3,
    })
    expect(filename).toBe('My-Model-Name_V_1-2-3_business_NN.md')
  })

  it('buildFormatFilename preserves existing dashes', () => {
    const filename = buildFormatFilename('My-Model-Name', 'procedures', {
      major: 0,
      minor: 1,
      patch: 0,
    })
    expect(filename).toBe('My-Model-Name_V_0-1-0_procedures_NN.md')
  })

  it('parseFormatFilename correctly parses a compliant filename', () => {
    const parsed = parseFormatFilename('My-Model-Name_V_1-2-3_business_NN.md')
    expect(parsed).not.toBeNull()
    expect(parsed!.baseName).toBe('My-Model-Name')
    expect(parsed!.templateName).toBe('business')
    expect(parsed!.version).toEqual({ major: 1, minor: 2, patch: 3 })
  })

  it('compareSemVer orders by major first, regardless of minor/patch', () => {
    const higherMajor = { major: 2, minor: 0, patch: 0 }
    const lowerMajor = { major: 1, minor: 9, patch: 9 }
    expect(compareSemVer(higherMajor, lowerMajor)).toBeGreaterThan(0)
    expect(compareSemVer(lowerMajor, higherMajor)).toBeLessThan(0)
  })

  it('compareSemVer falls back to minor then patch when major is equal', () => {
    expect(compareSemVer({ major: 1, minor: 2, patch: 0 }, { major: 1, minor: 1, patch: 9 })).toBeGreaterThan(0)
    expect(compareSemVer({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 5 })).toBeLessThan(0)
    expect(compareSemVer({ major: 1, minor: 2, patch: 3 }, { major: 1, minor: 2, patch: 3 })).toBe(0)
  })
})
