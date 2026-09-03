import { defineStore } from 'pinia'
import type { ModelNode } from '../model/types'
import type { DirectoryHandleLike } from '../model/fs-types'
import { recursiveParse } from '../model/recursiveParser'
import { validateFormatContent, updateReferenceString } from '@cognnitive/innfo-core'
import type { ModelDriver, ParseIssue, ValidationReport } from '@cognnitive/innfo-core'
import { resolveParentSpecs } from '../services/SpecResolverService'

import { useUiStore } from './uiStore'

export interface ModelState {
  nodes: Record<string, ModelNode>
  rootIds: string[]
  dirtyIds: Set<string>
  parseIssues: ParseIssue[]
  validationReport: ValidationReport | null
  validationReports: Record<string, ValidationReport>
}

/**
 * modelStore is the single normalized element graph. It replaces the
 * previously planned documentStore + folderStore split: every node,
 * regardless of storageMode, lives in this one graph (R2, R3).
 */
export const useModelStore = defineStore('model', {
  state: (): ModelState => ({
    nodes: {},
    rootIds: [],
    dirtyIds: new Set<string>(),
    parseIssues: [],
    validationReport: null,
    validationReports: {},
  }),
  getters: {
    getNode:
      (state) =>
      (id: string): ModelNode | undefined =>
        state.nodes[id],
    getChildren:
      (state) =>
      (id: string): ModelNode[] =>
        (state.nodes[id]?.childIds ?? []).map((cid) => state.nodes[cid]).filter(Boolean),
    getRoots: (state) => (): ModelNode[] =>
      state.rootIds
        .filter((id) => !id.startsWith('spec:'))
        .map((id) => state.nodes[id])
        .filter(Boolean),

    /**
     * Aggregates and deduplicates all unique tags across all model nodes (concepts and elements).
     */
    allTags: (state): string[] => {
      const tagsSet = new Set<string>()
      for (const node of Object.values(state.nodes)) {
        if (node.tags && Array.isArray(node.tags)) {
          for (const tag of node.tags) {
            if (tag) tagsSet.add(tag)
          }
        }
        // Also include concept-level tags if they exist on the root node
        if (node.kind === 'root' && node.conceptTags) {
          for (const tags of Object.values(node.conceptTags)) {
            if (Array.isArray(tags)) {
              for (const tag of tags) {
                if (tag) tagsSet.add(tag)
              }
            }
          }
        }
      }
      return Array.from(tagsSet).sort()
    },

    /**
     * Returns the active model root node id or the first root node id as fallback.
     */
    activeNodeId: (state): string | null => {
      try {
        const uiStore = useUiStore()
        if (uiStore.activeModelId && state.nodes[uiStore.activeModelId]) {
          return uiStore.activeModelId
        }
      } catch {
        // Fallback if called outside Pinia active context
      }
      return state.rootIds.find((id) => !id.startsWith('spec:')) ?? state.rootIds[0] ?? null
    },
  },
  actions: {
    /** Replaces the whole graph (used by a fresh recursive parse). */
    setGraph(nodes: Record<string, ModelNode>, rootIds: string[]): void {
      this.nodes = nodes
      this.rootIds = rootIds
      this.dirtyIds = new Set<string>()
      this.validateModel()
    },

    validateModel(): void {
      const nonTemplateRoots = this.rootIds.filter(
        (id) => !id.startsWith('spec:') && this.nodes[id],
      )
      if (nonTemplateRoots.length === 0) {
        this.validationReport = null
        this.validationReports = {}
        return
      }

      let combinedReport: ValidationReport | null = null
      const reports: Record<string, ValidationReport> = {}

      for (const rootId of nonTemplateRoots) {
        const rootNode = this.nodes[rootId]
        if (!rootNode?.rawContent) continue
        const path = rootNode.source?.path ?? ''
        const fileName = path.split('/').pop() || path || 'unknown.md'
        const report = validateFormatContent(rootNode.rawContent, fileName)

        // Merge schema-conformance diagnostics (model vs. its composed template),
        // computed by the spec resolver, as additional checks so one report
        // covers both document hygiene and schema conformance.
        const sv = rootNode.schemaValidation
        if (sv) {
          for (const diag of [...sv.errors, ...sv.warnings]) {
            report.checks.push({
              id: `schema:${diag.path}`,
              label: 'Schema conformance',
              description: 'Model element/property against the resolved template schema',
              category: 'body',
              severity: diag.severity === 'error' ? 'error' : 'warning',
              passed: false,
              message: diag.message,
            })
          }
          report.summary.total += sv.errors.length + sv.warnings.length
          report.summary.errors += sv.errors.length
          report.summary.warnings += sv.warnings.length
        }

        reports[rootId] = report

        if (!combinedReport) {
          combinedReport = {
            checks: [...report.checks],
            summary: { ...report.summary },
          }
        } else {
          combinedReport.summary.total += report.summary.total
          combinedReport.summary.passed += report.summary.passed
          combinedReport.summary.errors += report.summary.errors
          combinedReport.summary.warnings += report.summary.warnings
          combinedReport.checks.push(...report.checks)
        }
      }

      this.validationReport = combinedReport
      this.validationReports = reports
    },

    upsertNode(node: ModelNode): void {
      this.nodes[node.id] = node
    },

    markDirty(id: string): void {
      this.dirtyIds.add(id)
      const rootId = this.getModelRootForNode(id)
      if (rootId) {
        this.dirtyIds.add(rootId)
      }
    },

    clearDirty(id: string): void {
      this.dirtyIds.delete(id)
    },

    clearParseIssues(): void {
      this.parseIssues = []
    },

    isDirty(id: string): boolean {
      return this.dirtyIds.has(id)
    },

    /**
     * Populates this store directly from a workspace handle via a
     * recursive parse — no intermediate per-mode store. Real recursive
     * walking/parsing lands in Phase 3 (recursiveParser.ts); this wires
     * the call so workspaceStore.open() has a single integration point.
     */
    async parseFromHandle(handle: DirectoryHandleLike, driver?: ModelDriver): Promise<void> {
      const result = await recursiveParse(handle, driver)
      await resolveParentSpecs(result.nodes, result.rootIds, handle, result.issues)
      this.parseIssues = result.issues
      this.setGraph(result.nodes, result.rootIds)
    },

    /**
     * Reorders a child within its parent's childIds array.
     * @param direction 1 = move down, -1 = move up
     */
    reorderChild(parentId: string, childId: string, direction: 1 | -1): void {
      const parent = this.nodes[parentId]
      if (!parent) return
      const idx = parent.childIds.indexOf(childId)
      if (idx === -1) return
      const newIdx = idx + direction
      if (newIdx < 0 || newIdx >= parent.childIds.length) return
      parent.childIds.splice(idx, 1)
      parent.childIds.splice(newIdx, 0, childId)
      this.markDirty(parentId)
    },

    /**
     * Moves a child within its parent's childIds array to a specific target index.
     */
    moveChildToIndex(parentId: string, childId: string, targetIdx: number): void {
      const parent = this.nodes[parentId]
      if (!parent) return
      const idx = parent.childIds.indexOf(childId)
      if (idx === -1) return
      if (targetIdx < 0 || targetIdx >= parent.childIds.length) return
      parent.childIds.splice(idx, 1)
      parent.childIds.splice(targetIdx, 0, childId)
      this.markDirty(parentId)
    },

    /**
     * Creates a new child node under the given parent.
     * @returns the new node's id
     */
    createChild(
      parentId: string,
      name: string,
      type: string,
      kind?: 'concept' | 'element',
    ): string {
      const parent = this.nodes[parentId]
      if (!parent) throw new Error(`Parent node "${parentId}" not found`)
      const id = `${parentId}/${name}`
      if (this.nodes[id]) throw new Error(`Node "${id}" already exists`)

      this.nodes = {
        ...this.nodes,
        [id]: {
          id,
          name,
          parentId,
          childIds: [],
          type,
          kind: kind ?? 'element',
          fields: {},
          markers: {},
          relationships: [],
          rawSections: {},
          source: { path: '' },
        },
      }

      parent.childIds = [...parent.childIds, id]
      this.markDirty(parentId)
      return id
    },

    /**
     * Finds the root model ID that owns the given node.
     */
    getModelRootForNode(nodeId: string): string | null {
      if (nodeId.startsWith('virtual:')) {
        const parentId = nodeId.split(':')[1]
        return this.getModelRootForNode(parentId)
      }
      let curr = this.nodes[nodeId]
      if (!curr) return null
      while (curr && curr.parentId) {
        const parent = this.nodes[curr.parentId]
        if (!parent) break
        curr = parent
      }
      return curr?.id ?? null
    },

    /**
     * Creates a child element for a concept under the specified (or active) root node.
     * Convenience wrapper used by the ghost "Add first element" action.
     * @returns the new node's id
     */
    addConceptElement(conceptName: string, elementName: string, targetModelId?: string): string {
      const uiStore = useUiStore()
      const rootId =
        targetModelId ??
        (uiStore.activeModelId && this.nodes[uiStore.activeModelId]
          ? uiStore.activeModelId
          : undefined) ??
        this.rootIds.find((id) => !id.startsWith('spec:')) ??
        this.rootIds[0]
      if (!rootId) throw new Error('No root node — cannot add element')
      return this.createChild(rootId, elementName, conceptName, 'element')
    },

    /**
     * Creates a text-type section under the specified (or active) root node.
     * For concepts of type `text` (single Markdown block).
     */
    addTextSection(conceptName: string, targetModelId?: string): void {
      const uiStore = useUiStore()
      const rootId =
        targetModelId ??
        (uiStore.activeModelId && this.nodes[uiStore.activeModelId]
          ? uiStore.activeModelId
          : undefined) ??
        this.rootIds.find((id) => !id.startsWith('spec:')) ??
        this.rootIds[0]
      if (!rootId) throw new Error('No root node — cannot add section')
      const root = this.nodes[rootId]
      if (!root) throw new Error(`Root node "${rootId}" not found`)
      if (!root.rawSections) root.rawSections = {}
      root.rawSections[conceptName] = ''
      this.markDirty(rootId)
    },

    /**
     * Removes a node and all its descendants from the graph.
     */
    removeNodeTree(nodeId: string): void {
      const node = this.nodes[nodeId]
      if (!node) return
      // Recursively remove children
      for (const childId of [...node.childIds]) {
        this.removeNodeTree(childId)
      }
      // Remove from parent
      if (node.parentId) {
        const parent = this.nodes[node.parentId]
        if (parent) {
          parent.childIds = parent.childIds.filter((id) => id !== nodeId)
        }
      }
      delete this.nodes[nodeId]
      this.dirtyIds.add(nodeId)
    },

    /**
     * Renames an element node in the graph and propagates the rename
     * to all referencing fields, wikilinks, and relationships across all nodes.
     */
    renameElementNode(nodeId: string, newName: string): void {
      const node = this.nodes[nodeId]
      if (!node || !newName || node.name === newName) return

      const oldName = node.name
      const lowerOld = oldName.toLowerCase()
      const lowerNew = newName.toLowerCase()

      // Update target node properties
      node.name = newName
      node.slug = lowerNew.replace(/[^a-z0-9-]/g, '_')

      // Handle ID re-keying if ID is path-based (e.g. parentId/oldName)
      let currentId = nodeId
      if (node.parentId && nodeId === `${node.parentId}/${oldName}`) {
        const newId = `${node.parentId}/${newName}`
        if (!this.nodes[newId]) {
          // Update parent's childIds
          const parent = this.nodes[node.parentId]
          if (parent) {
            parent.childIds = parent.childIds.map((id) => (id === nodeId ? newId : id))
            this.markDirty(parent.id)
          }

          // Update node's children parentId
          for (const childId of node.childIds) {
            const child = this.nodes[childId]
            if (child) child.parentId = newId
          }

          node.id = newId
          delete this.nodes[nodeId]
          this.nodes[newId] = node
          this.dirtyIds.delete(nodeId)
          this.dirtyIds.add(newId)
          currentId = newId

          const uiStore = useUiStore()
          if (uiStore.selectedNodeId === nodeId) {
            uiStore.selectNode(newId)
          }
        }
      }

      this.markDirty(currentId)

      // Propagate rename across ALL graph nodes
      for (const otherNode of Object.values(this.nodes)) {
        let nodeModified = false

        // 1. Fields
        if (otherNode.fields) {
          for (const [fKey, fVal] of Object.entries(otherNode.fields)) {
            if (fVal && typeof fVal.value === 'string') {
              const updated = updateReferenceString(fVal.value, oldName, newName)
              if (updated !== fVal.value) {
                fVal.value = updated
                nodeModified = true
              }
            } else if (fVal && Array.isArray(fVal.value)) {
              let arrayModified = false
              const updatedArray = fVal.value.map((item) => {
                if (typeof item === 'string') {
                  const updated = updateReferenceString(item, oldName, newName)
                  if (updated !== item) arrayModified = true
                  return updated
                }
                return item
              })
              if (arrayModified) {
                fVal.value = updatedArray
                nodeModified = true
              }
            }
          }
        }

        // 2. rawSections
        if (otherNode.rawSections) {
          for (const [sKey, sVal] of Object.entries(otherNode.rawSections)) {
            if (typeof sVal === 'string') {
              const updated = updateReferenceString(sVal, oldName, newName)
              if (updated !== sVal) {
                otherNode.rawSections[sKey] = updated
                nodeModified = true
              }
            }
          }
        }

        // 3. Relationships array
        if (otherNode.relationships && Array.isArray(otherNode.relationships)) {
          for (const rel of otherNode.relationships) {
            if (rel && typeof rel.targetId === 'string') {
              const parts = rel.targetId.split('/')
              const lastSegment = parts[parts.length - 1] || ''
              if (lastSegment.toLowerCase() === lowerOld) {
                parts[parts.length - 1] = newName
                rel.targetId = parts.join('/')
                nodeModified = true
              }
            }
          }
        }

        if (nodeModified) {
          this.markDirty(otherNode.id)
        }
      }

      this.validateModel()
    },
  },
})
