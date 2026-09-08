import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WorkspaceIntegrityNotice from '../../src/components/layout/WorkspaceIntegrityNotice.vue'
import type { WorkspaceIntegrityReport } from '@cognnitive/innfo-core'

function makeReport(overrides: Partial<WorkspaceIntegrityReport> = {}): WorkspaceIntegrityReport {
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-08T00:00:00.000Z',
    models: [],
    aggregate: {
      modelsScanned: 0,
      invalid: 0,
      withWarnings: 0,
      versionStatus: {},
      templateResolution: {},
      freshness: {},
    },
    catalogSource: 'remote',
    offline: false,
    degraded: [],
    ...overrides,
  }
}

const stubGlobal = (w: ReturnType<typeof mount>) => {
  // no-op helper to keep intent explicit
  return w
}

describe('WorkspaceIntegrityNotice.vue — three bands (Resolved Decision 5)', () => {
  it('renders nothing when no report is available', () => {
    const wrapper = mount(WorkspaceIntegrityNotice, {
      props: { report: null },
    })
    expect(wrapper.find('[data-testid="integrity-notice"]').exists()).toBe(false)
  })

  it('renders the invalid band with the error treatment when models have validation errors', () => {
    const report = makeReport({
      aggregate: { ...makeReport().aggregate, invalid: 2, modelsScanned: 3 },
    })
    const wrapper = stubGlobal(
      mount(WorkspaceIntegrityNotice, {
        props: { report },
      }),
    )
    expect(wrapper.find('[data-testid="integrity-band-invalid"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="integrity-band-informational"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="integrity-band-cannot-determine"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('2')
  })

  it('renders the informational band (not invalid) for version-status-only findings', () => {
    const report = makeReport({
      aggregate: {
        ...makeReport().aggregate,
        modelsScanned: 2,
        versionStatus: { 'upgrade-available': 1, current: 1 },
      },
    })
    const wrapper = stubGlobal(
      mount(WorkspaceIntegrityNotice, {
        props: { report },
      }),
    )
    expect(wrapper.find('[data-testid="integrity-band-informational"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="integrity-band-invalid"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('upgrade-available')
  })

  it('renders the cannot-determine band distinctly from invalid when offline/unknown', () => {
    const report = makeReport({
      offline: true,
      catalogSource: 'offline',
      degraded: ['Catalog offline — version status degraded to "unknown" for every model.'],
      aggregate: {
        ...makeReport().aggregate,
        modelsScanned: 2,
        versionStatus: { unknown: 2 },
        freshness: { offline: 2 },
      },
    })
    const wrapper = stubGlobal(
      mount(WorkspaceIntegrityNotice, {
        props: { report },
      }),
    )
    expect(wrapper.find('[data-testid="integrity-band-cannot-determine"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="integrity-band-invalid"]').exists()).toBe(false)
    // "cannot determine" wording, not "invalid"
    expect(wrapper.text()).toMatch(/cannot determine|unknown|offline/i)
    expect(wrapper.text()).not.toMatch(/invalid model/i)
  })

  it('renders uncomputed freshness as not-checked and distinct from invalid', () => {
    const report = makeReport({
      aggregate: {
        ...makeReport().aggregate,
        modelsScanned: 1,
        freshness: { 'not-checked': 1 },
      },
      degraded: ['Per-template byte-hash freshness not performed on this platform (not-checked).'],
    })
    const wrapper = stubGlobal(
      mount(WorkspaceIntegrityNotice, {
        props: { report },
      }),
    )
    expect(wrapper.text()).toMatch(/not[- ]checked|not checked/i)
    expect(wrapper.find('[data-testid="integrity-band-invalid"]').exists()).toBe(false)
  })

  it('is dismissible', async () => {
    const report = makeReport({})
    const wrapper = mount(WorkspaceIntegrityNotice, {
      props: { report },
    })
    expect(wrapper.find('[data-testid="integrity-dismiss"]').exists()).toBe(true)
    await wrapper.find('[data-testid="integrity-dismiss"]').trigger('click')
    expect(wrapper.find('[data-testid="integrity-notice"]').exists()).toBe(false)
  })
})