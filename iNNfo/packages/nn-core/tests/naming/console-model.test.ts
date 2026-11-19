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

  it('surfaces a user-authored procedure whose file lives under procedures/ when no link set is passed only conservatively', () => {
    const submodel = {
      path: 'procedures/import_and_transcribe_audio_procedures_NN.md',
      frontmatter: fm('procedures_V_0-2-0'),
    }
    // Historical conservative default: no link set, so a `procedures/` file stays out.
    expect(isConsoleModel(submodel)).toBe(false)
  })

  it('distinguishes a linked stepper from a user-authored procedure in procedures/ by its procedure_model link', () => {
    const userProcedure = {
      path: 'procedures/export_bundle_procedures_NN.md',
      frontmatter: fm('procedures'),
    }
    const linkedStepper = {
      path: 'procedures/workflow_procedures_NN.md',
      frontmatter: fm('procedures'),
    }
    // No procedure_model points at the user procedure: it is a definition, so it surfaces.
    const linked = new Set(['procedures/workflow_procedures_NN.md'])
    expect(isConsoleModel({ ...userProcedure, linkedProcedureModels: linked })).toBe(true)
    // The catalog's procedure_model points at the stepper: that one stays out.
    expect(isConsoleModel({ ...linkedStepper, linkedProcedureModels: linked })).toBe(false)
    // A procedure outside procedures/ surfaces under either reading.
    expect(
      isConsoleModel({
        path: 'kNNowledge/Custom_procedures_NN.md',
        frontmatter: fm('procedures'),
        linkedProcedureModels: linked,
      }),
    ).toBe(true)
  })

  it('rejects non-model roles (workspace catalogs, changesets, sidecars) and excluded paths', () => {
    expect(isConsoleModel({ path: 'kNNowledge/WS_NN.md', frontmatter: fm('workspace') })).toBe(false)
    expect(
      isConsoleModel({ path: 'changes/c1_changes_NN.md', frontmatter: fm('changes') }),
    ).toBe(false)
    expect(isConsoleModel({ path: 'archive/a_NN.md', frontmatter: fm('business') })).toBe(false)
  })

  it('rejects the models of an import under the root sources/ folder, in any casing', () => {
    expect(isConsoleModel({ path: 'sources/import/old/foo_NN.md', frontmatter: fm('business') })).toBe(false)
    expect(isConsoleModel({ path: 'Sources/import/old/foo_NN.md', frontmatter: fm('business') })).toBe(false)
    expect(
      isConsoleModel({ path: 'sources/import/old/foo_procedures_NN.md', frontmatter: fm('procedures_V_0-3-2') }),
    ).toBe(false)
    // Only the root folder: a folder merely named like it deeper down still holds models.
    expect(isConsoleModel({ path: 'programs/sources/foo_NN.md', frontmatter: fm('business') })).toBe(true)
  })

  it('accepts documents whose blueprint declares a nature (declared collections)', () => {
    expect(
      isConsoleModel({ path: 'sources/report_sources_NN.md', frontmatter: fm('sources') }),
    ).toBe(true)
    expect(
      isConsoleModel({ path: 'artifacts/out_artifacts_NN.md', frontmatter: fm('artifacts') }),
    ).toBe(true)
    // An undeclared catalog role (workspace) stays out — surfacing is by declaration.
    expect(isConsoleModel({ path: 'kNNowledge/WS_NN.md', frontmatter: fm('workspace') })).toBe(false)
  })
})
