import type { ModelNode } from '../types'
import type { IdentityRegistry } from '../identity'

export interface ParseIssue {
  path: string
  message: string
}

export interface RecursiveParseResult {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  issues: ParseIssue[]
}

export interface WorklistItem {
  path: string
  name: string
  referringPath: string
  depth: number
  author?: string
}

export interface ParseContext {
  nodes: Record<string, ModelNode>
  identity: IdentityRegistry
  issues: ParseIssue[]
  visitedPaths?: Set<string>
}

