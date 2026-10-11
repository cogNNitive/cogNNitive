import { describe, it, expect } from 'vitest'
import { isConsoleModel, isModelCandidate } from '../../src/naming/contract.js'

const fm = (parent: string) => ({ level: 3, parent_spec: { name: parent } })

describe('isConsoleModel (console model notion)', () => {
  it('accepts knowledge models', () => {
    expect(
      isConsoleModel({ path: 'kNNowledge/Client_business_NN.md', frontmatter: fm('business') }),
    ).toBe(true)
    // Same as the old role-based console filter: a Level-3 `_NN.md` with no parent_spec is knowledge.
    expect(isConsoleModel({ path: 'models/A_NN.md', frontmatter: { level: 3 } })).toBe(true)
  })

  it('accepts a procedures model in the workspace so the Procedure view has a feeder', () => {
    const proceduresModel = {
      path: 'kNNowledge/Ghostbusters_procedures_NN.md',
      frontmatter: fm('procedures_V_0-3-2'),
    }
    expect(isConsoleModel(proceduresModel)).toBe(true)
    // The knowledge-model predicate still rejects it — that is the whole point of the second notion.
    expect(isModelCandidate(proceduresModel)).toBe(false)
  })

  it('rejects a procedures/ submodel (execution stepper)', () => {
    const submodel = {
      path: 'procedures/import_and_transcribe_audio_procedures_NN.md',
      frontmatter: fm('procedures_V_0-2-0'),
    }
    expect(isConsoleModel(submodel)).toBe(false)
  })

  it('rejects non-model roles (workspace catalogs, changesets, sidecars) and excluded paths', () => {
    expect(isConsoleModel({ path: 'kNNowledge/WS_NN.md', frontmatter: fm('workspace') })).toBe(false)
    expect(
      isConsoleModel({ path: 'changes/c1_changes_NN.md', frontmatter: fm('changes') }),
    ).toBe(false)
    expect(isConsoleModel({ path: 'archive/a_NN.md', frontmatter: fm('business') })).toBe(false)
  })
})
