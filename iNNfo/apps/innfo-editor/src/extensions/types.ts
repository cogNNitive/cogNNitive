import type { ModelNode } from '../model/types'

export interface ExtensionManifestView {
  id: string
  label: string
  icon?: string
  targetConcept?: string
  viewType?: string
}

export interface ExtensionManifest {
  id: string
  name: string
  version: string
  template: string
  description?: string
  views?: ExtensionManifestView[]
}

export interface ExtensionContext {
  nodes: Record<string, ModelNode>
  selectNode?: (nodeId: string) => void
  readOnly?: boolean
  standalone?: boolean
}

export interface ResolvedExtensionView {
  id: string
  viewType: string
  label: string
  icon?: string
  targetConcept?: string
  description?: string
}
