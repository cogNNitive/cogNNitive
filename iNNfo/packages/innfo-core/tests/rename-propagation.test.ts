import { describe, it, expect } from 'vitest'
import { parseModel, serializeModel, applyMutation } from '../src'
import { updateReferenceString } from '../src/mutate'

describe('updateReferenceString unit tests', () => {
  it('updates exact scalar reference match', () => {
    expect(updateReferenceString('Old Element', 'Old Element', 'New Element')).toBe('New Element')
    expect(updateReferenceString('  old element  ', 'Old Element', 'New Element')).toBe('  New Element  ')
  })

  it('updates qualified references', () => {
    expect(updateReferenceString('[Model] Old Element', 'Old Element', 'New Element')).toBe('[Model] New Element')
    expect(updateReferenceString('Model :: Old Element', 'Old Element', 'New Element')).toBe('Model :: New Element')
  })

  it('updates wikilinks in text and fields', () => {
    expect(updateReferenceString('[[Old Element]]', 'Old Element', 'New Element')).toBe('[[New Element]]')
    expect(updateReferenceString('[[Old Element|alias]]', 'Old Element', 'New Element')).toBe('[[New Element|alias]]')
    expect(updateReferenceString('Text with [[Old Element]] inside', 'Old Element', 'New Element')).toBe(
      'Text with [[New Element]] inside',
    )
  })

  it('leaves unrelated strings untouched', () => {
    expect(updateReferenceString('Other Element', 'Old Element', 'New Element')).toBe('Other Element')
    expect(updateReferenceString('[[Other Element]]', 'Old Element', 'New Element')).toBe('[[Other Element]]')
  })

  it('updates references with flexible naming formats (slug matching for hyphens, spaces, diacritics)', () => {
    expect(updateReferenceString('[[Salón-Comedor]]', 'salón comedor', 'Salón')).toBe('[[Salón]]')
    expect(updateReferenceString('[[salón comedor]]', 'Salón-Comedor', 'Salón')).toBe('[[Salón]]')
    expect(updateReferenceString('[[Salón-Comedor|alias]]', 'salón comedor', 'Salón')).toBe('[[Salón|alias]]')
    expect(updateReferenceString('[[[Location] Salón-Comedor]]', 'salón comedor', 'Salón')).toBe('[[[Location] Salón]]')
    expect(updateReferenceString('Location :: Salón-Comedor', 'salón comedor', 'Salón')).toBe('Location :: Salón')
    expect(updateReferenceString('Salón-Comedor', 'salón comedor', 'Salón')).toBe('Salón')
  })
})

describe('rename_element propagation in applyMutation', () => {
  const sampleModelMarkdown = `---
specification_version: "V_0-3-0"
level: 3
model_version: "V_1-0-0"
title: "Test Model"
---

# NN Task

## NN Task: Task One
description:: Task description referencing [[Task Two]]
assignee:: Task Two
related:: ["Task Two", "[[Task Two|second]]"]

## NN Task: Task Two
description:: Second task
`

  it('propagates rename_element across fields, description, and list references', () => {
    const model = parseModel(sampleModelMarkdown)
    const taskTwoBefore = model.elements.get('Task')?.find((e) => e.name === 'Task Two')
    if (taskTwoBefore) {
      taskTwoBefore.fields['refField'] = '[[Task Two]]'
    }

    const result = applyMutation(model, 'rename_element', {
      conceptName: 'Task',
      elementName: 'Task Two',
      newName: 'Renamed Task Two',
    })

    expect(result.success).toBe(true)

    const taskOne = model.elements.get('Task')?.find((e) => e.name === 'Task One')
    expect(taskOne).toBeDefined()
    expect(taskOne?.fields['assignee']).toBe('Renamed Task Two')
    expect(taskOne?.fields['related']).toEqual(['Renamed Task Two', '[[Renamed Task Two|second]]'])

    const serialized = serializeModel(model)
    expect(serialized).toContain('[[Renamed Task Two]]')
    expect(serialized).toContain('assignee:: "Renamed Task Two"')
  })
})
