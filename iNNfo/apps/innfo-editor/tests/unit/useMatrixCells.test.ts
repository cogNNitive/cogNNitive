import { describe, it, expect, beforeEach } from 'vitest'
import { ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useModelStore } from '../../src/stores/modelStore'
import type { ModelNode } from '../../src/model/types'
import type { MatrixDef } from '../../src/composables/useMatrixDefinitions'
import { useMatrixCells } from '../../src/components/editor/composables/useMatrixCells'

function makeNode(id: string, overrides: Partial<ModelNode> = {}): ModelNode {
  return {
    id,
    name: id,
    parentId: null,
    childIds: [],
    type: 'text',
    fields: {},
    markers: {},
    relationships: [],
    rawSections: {},
    source: { path: id },
    ...overrides,
  } as ModelNode
}

const MATRIX: MatrixDef = {
  name: 'M1',
  source: 'Src',
  target: 'Tgt',
  widgetType: 'boolean',
  params: '',
}

describe('useMatrixCells', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('matrixCellKey builds the MatrixName||row||col key, and getVal reads the stored value', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', { fields: { 'M1||Src0||Tgt0': { value: 'X' } } as any })
    modelStore.setGraph({ Root: root }, ['Root'])

    const activeMatrix = ref<MatrixDef | null>(MATRIX)
    const rootNode = ref<ModelNode | null>(root)
    const { matrixCellKey, getVal } = useMatrixCells(activeMatrix, rootNode, () => {})

    expect(matrixCellKey('Src0', 'Tgt0')).toBe('M1||Src0||Tgt0')
    expect(getVal('Src0', 'Tgt0')).toBe('X')
    expect(getVal('Src1', 'Tgt1')).toBe('-')
  })

  it('setVal commits the value on the root node and invokes onChange with the key/value', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root')
    modelStore.setGraph({ Root: root }, ['Root'])

    const activeMatrix = ref<MatrixDef | null>(MATRIX)
    const rootNode = ref<ModelNode | null>(root)
    const changes: Array<[string, unknown]> = []
    const { setVal, getVal } = useMatrixCells(activeMatrix, rootNode, (key, value) =>
      changes.push([key, value]),
    )

    setVal('Src0', 'Tgt0', 'X')

    expect(getVal('Src0', 'Tgt0')).toBe('X')
    expect(changes).toEqual([['M1||Src0||Tgt0', 'X']])
  })

  it('valueDistribution counts stored values across the given rows/cols, defaulting missing cells to "-"', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', {
      fields: {
        'M1||Src0||Tgt0': { value: 'X' },
        'M1||Src0||Tgt1': { value: 'X' },
      } as any,
    })
    modelStore.setGraph({ Root: root }, ['Root'])

    const activeMatrix = ref<MatrixDef | null>(MATRIX)
    const rootNode = ref<ModelNode | null>(root)
    const { valueDistribution } = useMatrixCells(activeMatrix, rootNode, () => {})

    expect(valueDistribution(['Src0'], ['Tgt0', 'Tgt1', 'Tgt2'])).toEqual({ X: 2, '-': 1 })
  })

  it('getSetOptionsList reads declared "values", falling back to parsing "params"', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root')
    modelStore.setGraph({ Root: root }, ['Root'])
    const rootNode = ref<ModelNode | null>(root)

    const withValues = ref<MatrixDef | null>({ ...MATRIX, widgetType: 'set', values: ['A', 'B'] })
    const cellsWithValues = useMatrixCells(withValues, rootNode, () => {})
    expect(cellsWithValues.getSetOptionsList()).toEqual(['A', 'B'])

    const withParams = ref<MatrixDef | null>({ ...MATRIX, widgetType: 'set', params: 'Low;Medium;High' })
    const cellsWithParams = useMatrixCells(withParams, rootNode, () => {})
    expect(cellsWithParams.getSetOptionsList()).toEqual(['Low', 'Medium', 'High'])
  })

  it('isOutOfSetValue flags set-widget values outside the declared options', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root')
    modelStore.setGraph({ Root: root }, ['Root'])
    const rootNode = ref<ModelNode | null>(root)
    const activeMatrix = ref<MatrixDef | null>({ ...MATRIX, widgetType: 'set', values: ['A', 'B'] })
    const { isOutOfSetValue } = useMatrixCells(activeMatrix, rootNode, () => {})

    expect(isOutOfSetValue('A')).toBe(false)
    expect(isOutOfSetValue('Z')).toBe(true)
    expect(isOutOfSetValue('-')).toBe(false)
  })

  it('rotateCycle advances through set options, wrapping to "-" past the last option', () => {
    const modelStore = useModelStore()
    const root = makeNode('Root', { fields: { 'M1||Src0||Tgt0': { value: 'B' } } as any })
    modelStore.setGraph({ Root: root }, ['Root'])
    const rootNode = ref<ModelNode | null>(root)
    const activeMatrix = ref<MatrixDef | null>({ ...MATRIX, widgetType: 'set', values: ['A', 'B'] })
    const { rotateCycle, getVal } = useMatrixCells(activeMatrix, rootNode, () => {})

    rotateCycle('Src0', 'Tgt0')
    expect(getVal('Src0', 'Tgt0')).toBe('-')
  })
})
