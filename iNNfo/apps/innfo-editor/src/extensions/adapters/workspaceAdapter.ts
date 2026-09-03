import { computed, type Ref } from 'vue'
import { useModelStore } from '../../stores/modelStore'
import { useUiStore } from '../../stores/uiStore'
import type { ExtensionContext } from '../types'

export function useWorkspaceExtensionAdapter(): Ref<ExtensionContext> {
  const modelStore = useModelStore()
  const uiStore = useUiStore()

  return computed<ExtensionContext>(() => ({
    nodes: modelStore.nodes,
    selectNode: (nodeId: string) => {
      uiStore.selectNode(nodeId)
      uiStore.setActiveView('editor')
    },
    readOnly: false,
    standalone: false,
  }))
}
