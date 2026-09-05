import type { ModelNode } from '../types'
import type { IdentityRegistry } from '../identity'

export interface ParseIssue {
  path: string
  message: string
  severity?: 'info' | 'warning' | 'error'
  /** Stable machine-readable discriminator. Additive; existing issues keep it undefined. */
  code?: 'CYCLE_DETECTED' | 'DEPTH_LIMIT' | 'MODEL_NOT_FOUND'
}

export interface RecursiveParseResult {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  issues: ParseIssue[]
  /** Workspace-relative path of the resolved entrypoint. Undefined on the root-scan fallback. */
  entrypointPath?: string
}

export interface WorklistItem {
  path: string
  name: string
  referringPath: string
  depth: number
  author?: string
  /**
   * normalizePathKey chain from the entrypoint through `referringPath`, inclusive.
   * Membership => true cycle. Non-membership + already parsed => diamond.
   */
  ancestorKeys: string[]
}

export interface ParseContext {
  nodes: Record<string, ModelNode>
  identity: IdentityRegistry
  issues: ParseIssue[]
  visitedPaths?: Set<string>
}

