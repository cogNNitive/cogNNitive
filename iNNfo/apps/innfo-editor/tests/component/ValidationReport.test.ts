import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import ValidationReport from '../../src/components/ValidationReport.vue'
import { useModelStore } from '../../src/stores/modelStore'
import type { ValidationReport as ValidationReportType } from '../../src/shared/validation-types'

describe('ValidationReport.vue', () => {
  let writeTextMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setActivePinia(createPinia())
    writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: writeTextMock,
      },
      configurable: true,
      writable: true,
    })
  })

  const sampleReport: ValidationReportType = {
    checks: [
      {
        id: 'check-1',
        label: 'Valid Frontmatter Version',
        description: 'Ensures version field is present.',
        category: 'frontmatter',
        severity: 'warning',
        passed: false,
        message: 'Missing version field in frontmatter',
      },
      {
        id: 'check-2',
        label: 'Valid Concept Binding',
        description: 'Checks concept bindings.',
        category: 'body',
        severity: 'info',
        passed: true,
      },
    ],
    summary: {
      total: 2,
      passed: 1,
      errors: 0,
      warnings: 1,
    },
  }

  it('renders summary bar, copy log button and copy AI prompt button', () => {
    const wrapper = mount(ValidationReport, {
      props: { report: sampleReport },
    })

    expect(wrapper.text()).toContain('Validation Summary')
    expect(wrapper.find('[data-testid="copy-log-button"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="copy-ai-prompt-button"]').exists()).toBe(true)
  })

  it('copies raw log when Copy Log button is clicked', async () => {
    const wrapper = mount(ValidationReport, {
      props: { report: sampleReport },
    })

    const copyLogBtn = wrapper.find('[data-testid="copy-log-button"]')
    await copyLogBtn.trigger('click')

    expect(writeTextMock).toHaveBeenCalled()
    const copiedText = writeTextMock.mock.calls[0][0]
    expect(copiedText).toContain('VALIDATION REPORT')
    expect(copiedText).toContain('Missing version field in frontmatter')
  })

  it('copies AI prompt with workspace metadata when Copy Prompt for AI button is clicked', async () => {
    const modelStore = useModelStore()
    modelStore.rootIds = ['root-1']
    modelStore.nodes = {
      'root-1': {
        id: 'root-1',
        name: 'MyTestModel',
        parentId: null,
        childIds: [],
        type: 'document',
        fields: {
          version: { value: 'V_1-0-0', provenance: { author: { kind: 'system', id: 'p' }, timestamp: '' } },
          spec_version: { value: 'V_0-1-0', provenance: { author: { kind: 'system', id: 'p' }, timestamp: '' } },
          template_name: 'TestTemplate',
          template_version: { value: 'V_1-0', provenance: { author: { kind: 'system', id: 'p' }, timestamp: '' } },
        },
        markers: {},
        relationships: [],
        rawSections: {},
        source: { path: 'models/my_test_model_NN.md' },
      },
    }

    const wrapper = mount(ValidationReport, {
      props: { report: sampleReport },
    })

    const copyAiPromptBtn = wrapper.find('[data-testid="copy-ai-prompt-button"]')
    await copyAiPromptBtn.trigger('click')

    expect(writeTextMock).toHaveBeenCalled()
    const copiedText = writeTextMock.mock.calls[0][0]
    expect(copiedText).toContain('# iNNfo Model Validation & Fix Request')
    expect(copiedText).toContain('MyTestModel')
    expect(copiedText).toContain('models/my_test_model_NN.md')
    expect(copiedText).toContain('Detected Defects & Warnings')
    expect(copiedText).toContain('Missing version field in frontmatter')
    expect(copiedText).toContain('## AI Task & Instructions')
  })
})
