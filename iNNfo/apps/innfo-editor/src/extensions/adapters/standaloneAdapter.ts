import { ref, computed, type Ref } from 'vue'
import type { ModelNode } from '../../model/types'
import type { ExtensionContext } from '../types'

export function useStandaloneExtensionAdapter(initialNodes: Record<string, ModelNode> = {}) {
  const nodes = ref<Record<string, ModelNode>>(initialNodes)
  const selectedNodeId = ref<string | null>(null)

  function setNodes(newNodes: Record<string, ModelNode>) {
    nodes.value = newNodes
  }

  function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId
  }

  const context = computed<ExtensionContext>(() => ({
    nodes: nodes.value,
    selectNode,
    readOnly: true,
    standalone: true,
  }))

  return {
    context,
    nodes,
    selectedNodeId,
    setNodes,
    selectNode,
  }
}
