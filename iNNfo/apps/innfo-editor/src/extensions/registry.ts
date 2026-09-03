import { defineAsyncComponent, type Component } from 'vue'
import type { ExtensionManifest, ResolvedExtensionView } from './types'
import type { SpecFrontmatter } from '@cognnitive/innfo-core'
import proceduresManifest from './procedures/manifest.json'
import projectsManifest from './projects/manifest.json'

export interface RegisteredExtension {
  manifest: ExtensionManifest
  views: Record<string, Component>
}

export interface ViewTypeRegistration {
  viewType: string
  component: Component
  defaultLabel: string
  defaultIcon: string
}

class ExtensionRegistry {
  private extensions = new Map<string, RegisteredExtension>()
  private viewTypes = new Map<string, ViewTypeRegistration>()

  constructor() {
    this.registerStandardViewTypes()
    this.registerProceduresExtension()
    this.registerProjectsExtension()
  }

  private registerStandardViewTypes() {
    const fsmComponent = defineAsyncComponent(
      () => import('../components/editor/GuidedProcedureView.vue'),
    )
    const ganttComponent = defineAsyncComponent(
      () => import('../components/editor/ProjectGanttView.vue'),
    )

    this.viewTypes.set('fsm-stepper', {
      viewType: 'fsm-stepper',
      component: fsmComponent,
      defaultLabel: 'Guided Procedure Execution',
      defaultIcon: 'play-circle',
    })

    this.viewTypes.set('gantt-timeline', {
      viewType: 'gantt-timeline',
      component: ganttComponent,
      defaultLabel: 'Gantt Timeline Chart',
      defaultIcon: 'calendar-range',
    })

    // Aliases for direct ID lookup
    this.viewTypes.set('guided-procedure', this.viewTypes.get('fsm-stepper')!)
    this.viewTypes.set('gantt-chart', this.viewTypes.get('gantt-timeline')!)
  }

  private registerProceduresExtension() {
    const fsmComponent = this.viewTypes.get('fsm-stepper')!.component
    this.extensions.set('procedures_V_0-2-0', {
      manifest: proceduresManifest as ExtensionManifest,
      views: {
        'guided-procedure': fsmComponent,
      },
    })
    // Also alias by short name
    this.extensions.set('procedures', this.extensions.get('procedures_V_0-2-0')!)
  }

  private registerProjectsExtension() {
    const ganttComponent = this.viewTypes.get('gantt-timeline')!.component
    this.extensions.set('projects', {
      manifest: projectsManifest as ExtensionManifest,
      views: {
        'gantt-chart': ganttComponent,
      },
    })
  }

  /**
   * Resolves viewer definitions for a template.
   * Priority:
   * 1. Declarative `viewers:` array in template frontmatter (Semantic View Intent).
   * 2. Fallback to legacy templateName matching.
   */
  public resolveViewersForTemplate(options: {
    frontmatter?: SpecFrontmatter | null
    templateName?: string
  }): ResolvedExtensionView[] {
    const { frontmatter, templateName } = options
    const declaredViewers = frontmatter?.viewers

    if (Array.isArray(declaredViewers) && declaredViewers.length > 0) {
      const resolved: ResolvedExtensionView[] = []
      for (const v of declaredViewers) {
        const reg = this.viewTypes.get(v.view_type) || this.viewTypes.get(v.id)
        if (reg) {
          resolved.push({
            id: v.id,
            viewType: v.view_type,
            label: v.label || reg.defaultLabel,
            icon: v.icon || reg.defaultIcon,
            targetConcept: v.target_concept,
            description: v.description,
          })
        }
      }
      if (resolved.length > 0) {
        return resolved
      }
    }

    // Fallback to legacy template name matching
    if (templateName) {
      const lower = templateName.toLowerCase()
      if (lower.includes('procedure')) {
        const reg = this.viewTypes.get('fsm-stepper')!
        return [
          {
            id: 'guided-procedure',
            viewType: 'fsm-stepper',
            label: reg.defaultLabel,
            icon: reg.defaultIcon,
            targetConcept: 'Work',
          },
        ]
      }
      if (lower.includes('project')) {
        const reg = this.viewTypes.get('gantt-timeline')!
        return [
          {
            id: 'gantt-chart',
            viewType: 'gantt-timeline',
            label: reg.defaultLabel,
            icon: reg.defaultIcon,
            targetConcept: 'Task',
          },
        ]
      }
    }

    return []
  }

  public getViewComponent(viewIdOrType: string): Component | undefined {
    return this.viewTypes.get(viewIdOrType)?.component
  }

  public hasView(viewIdOrType: string): boolean {
    return this.viewTypes.has(viewIdOrType)
  }

  public hasViewTypeForTemplate(
    viewType: string,
    options: { frontmatter?: SpecFrontmatter | null; templateName?: string },
  ): boolean {
    const viewers = this.resolveViewersForTemplate(options)
    return viewers.some((v) => v.viewType === viewType || v.id === viewType)
  }

  public getExtension(templateName: string): RegisteredExtension | undefined {
    if (!templateName) return undefined
    // Match exact or prefix (e.g. procedures_V_0-2-0)
    for (const [key, ext] of this.extensions.entries()) {
      if (templateName.toLowerCase().includes(key.toLowerCase())) {
        return ext
      }
    }
    return undefined
  }

  public getExtensionViews(
    templateName: string,
    frontmatter?: SpecFrontmatter | null,
  ): Record<string, Component> {
    if (frontmatter?.viewers && frontmatter.viewers.length > 0) {
      const views: Record<string, Component> = {}
      for (const v of frontmatter.viewers) {
        const comp = this.getViewComponent(v.view_type) || this.getViewComponent(v.id)
        if (comp) {
          views[v.id] = comp
        }
      }
      if (Object.keys(views).length > 0) {
        return views
      }
    }
    const ext = this.getExtension(templateName)
    return ext ? ext.views : {}
  }
}

export const extensionRegistry = new ExtensionRegistry()

