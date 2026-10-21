import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const srcDir = join(import.meta.dirname!, '..', 'src')

describe('retired exports (S2c group 6)', () => {
  for (const entry of ['index.ts', 'browser.ts']) {
    it(`${entry} does not export the Agent Modification block builder`, () => {
      const src = readFileSync(join(srcDir, entry), 'utf8')
      expect(src).not.toMatch(/buildAgentModificationBlock/)
      expect(src).not.toMatch(/AgentModificationContext/)
      expect(src).not.toMatch(/agentModification/)
    })
  }
})
