import { describe, it, expect } from 'vitest'
import { consoleOutputPath, DOMAIN_CONSOLE_FILENAME } from './output-path.js'

describe('consoleOutputPath', () => {
  it('puts the domain console at the domain root', () => {
    expect(consoleOutputPath('domain')).toBe(DOMAIN_CONSOLE_FILENAME)
    expect(DOMAIN_CONSOLE_FILENAME).toBe('domaiNN_console.html')
  })

  it('builds the stable single-model path with no stamp', () => {
    expect(consoleOutputPath({ model: 'strategy' })).toBe(
      'artifacts/strategy_console/strategy_console.html',
    )
  })

  it('rejects an empty model key', () => {
    expect(() => consoleOutputPath({ model: '' })).toThrow(/model key/)
  })
})
