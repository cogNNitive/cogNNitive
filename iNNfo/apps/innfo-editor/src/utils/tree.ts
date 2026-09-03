import type { TreeNode } from '../stores/types'

/**
 * Recursively finds a node by name in a tree.
 * Strips markdown formatting before comparison.
 */
export function findNodeByName(nodes: TreeNode[], name: string): TreeNode | null {
  const clean = (s: string) =>
    s
      .replace(/\*\*|\*|__|\[\[|\]\]/g, '')
      .trim()
      .toLowerCase()
  for (const n of nodes) {
    if (clean(n.name) === clean(name)) return n
    if (n.children && n.children.length) {
      const found = findNodeByName(n.children, name)
      if (found) return found
    }
  }
  return null
}

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
