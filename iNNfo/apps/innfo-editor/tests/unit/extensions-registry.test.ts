import { describe, it, expect } from 'vitest'
import { extensionRegistry } from '../../src/extensions/registry'
import type { SpecFrontmatter } from '@cognnitive/innfo-core'

describe('ExtensionRegistry — Semantic View Intent (R-SVI)', () => {
  it('resolves gantt-timeline view when declared in template frontmatter viewers', () => {
    const frontmatter: SpecFrontmatter = {
      spec_version: 'V_0-2-0',
      spec_url: '',
      level: 2,
      title: 'Custom Projects Spec',
      viewers: [
        {
          id: 'custom-gantt',
          view_type: 'gantt-timeline',
          target_concept: 'Task',
        },
      ],
    }

    const viewers = extensionRegistry.resolveViewersForTemplate({
      frontmatter,
      templateName: 'arbitrary_template',
    })

    expect(viewers).toHaveLength(1)
    expect(viewers[0].id).toBe('custom-gantt')
    expect(viewers[0].viewType).toBe('gantt-timeline')
    expect(viewers[0].label).toBe('Gantt Timeline Chart')

    const hasGantt = extensionRegistry.hasViewTypeForTemplate('gantt-timeline', {
      frontmatter,
      templateName: 'arbitrary_template',
    })
    expect(hasGantt).toBe(true)
  })

  it('gracefully falls back to template name matching when viewers block is absent', () => {
    const viewersProj = extensionRegistry.resolveViewersForTemplate({
      templateName: 'projects_V_0-2-0',
    })
    expect(viewersProj).toHaveLength(1)
    expect(viewersProj[0].viewType).toBe('gantt-timeline')
    expect(viewersProj[0].id).toBe('gantt-chart')
    // ModelInfoPanel drives its extension card copy from this field instead
    // of a hardcoded description (F-17 / ModelInfoPanel.vue:97).
    expect(viewersProj[0].description).toBeTruthy()
    expect(viewersProj[0].description).not.toContain('RACI matrix')

    const viewersBiz = extensionRegistry.resolveViewersForTemplate({
      templateName: 'business_V_0-2-0',
    })
    expect(viewersBiz).toHaveLength(0)
  })

  it('a declared viewer without its own description falls back to the view type default', () => {
    const frontmatter: SpecFrontmatter = {
      spec_version: 'V_0-2-0',
      spec_url: '',
      level: 2,
      title: 'Custom Projects Spec',
      viewers: [
        {
          id: 'custom-gantt',
          view_type: 'gantt-timeline',
          target_concept: 'Task',
        },
      ],
    }

    const viewers = extensionRegistry.resolveViewersForTemplate({
      frontmatter,
      templateName: 'arbitrary_template',
    })
    expect(viewers[0].description).toBeTruthy()
  })

  it('retrieves view component by viewType or id', () => {
    expect(extensionRegistry.getViewComponent('gantt-timeline')).toBeDefined()
    expect(extensionRegistry.getViewComponent('gantt-chart')).toBeDefined()
    expect(extensionRegistry.getViewComponent('unknown-view')).toBeUndefined()
  })
})