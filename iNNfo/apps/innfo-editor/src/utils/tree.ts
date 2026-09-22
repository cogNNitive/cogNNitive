import type { TreeNode } from '../stores/types'

/**
 * Recursively finds the first node of a given type in a tree.
 */
export function findParentNodeOfType(nodes: TreeNode[], typeName: string): TreeNode | null {
  for (const n of nodes) {
    if (n.type === typeName) return n
    if (n.children && n.children.length) {
      const found = findParentNodeOfType(n.children, typeName)
      if (found) return found
    }
  }
  return null
}
