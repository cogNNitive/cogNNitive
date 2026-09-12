import { describe, it, expect } from 'vitest'
import { generateOpenCodePrompt } from '../../src/utils/promptGenerator'

describe('generateOpenCodePrompt', () => {
  it('generates prompt for an element with user notes', () => {
    const prompt = generateOpenCodePrompt({
      modelName: 'MyModel',
      modelPath: 'models/MyModel_NN.md',
      conceptName: 'WorkItem',
      elementName: 'Auth feature',
      elementType: 'functional',
      userNotes: 'Please refactor the token validation logic.'
    })

    expect(prompt).toContain('Auth feature')
    expect(prompt).toContain('WorkItem')
    expect(prompt).toContain('MyModel')
    expect(prompt).toContain('Please refactor the token validation logic.')
  })

  it('generates fallback prompt when no element or concept is provided', () => {
    const prompt = generateOpenCodePrompt({
      modelName: 'WorkspaceModel'
    })

    expect(prompt).toContain('model "WorkspaceModel"')
  })
})
