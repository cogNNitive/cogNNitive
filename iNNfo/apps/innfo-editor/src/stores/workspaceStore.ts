import { defineStore } from 'pinia'
import { useModelStore } from './modelStore'
import { useUiStore } from './uiStore'
import { recursiveSerialize } from '../model/recursiveSerializer'
import {
  parseFormatFilename,
  buildFormatFilename,
  bumpVersion,
  formatVersionString,
} from '../utils/version'
import { buildSpecificationUrl } from '../utils/constants'
import { IndexedDbWorkspaceRepository } from '../repositories/IndexedDbWorkspaceRepository'
import type { IWorkspaceRepository } from '../repositories/IWorkspaceRepository'
import { parseFrontmatter } from '@cognnitive/innfo-core'
import { useUrlDocLoader } from '../composables/useUrlDocLoader'
import type { DirectoryHandleLike, FileHandleLike } from '../model/fs-types'
import type { BumpLevel } from '../utils/version'
import type { ModelDriver } from '@cognnitive/innfo-core'
import type { ActiveView } from './uiStore'

export type { DirectoryHandleLike }

export interface WorkspaceState {
  handle: DirectoryHandleLike | null
  driver: ModelDriver | null
  hasHandle: boolean
  isParsing: boolean
  hasParsed: boolean
  parseCount: number
  saving: boolean
  error: string | null
  /** URL from which the current document was loaded (null when loaded via handle). */
  sourceUrl: string | null
  /** Whether auto-backup is enabled before saveActiveFile writes. Default true. */
  backupEnabled: boolean
  repository: IWorkspaceRepository
  /** True when loaded from a sample/preview URL (no folder handle). */
  isSampleSession: boolean
  /** Human-readable template name for the sample banner. */
  sampleTemplateName: string
  /** Set by open() when folder contains zero _NN.md model files. */
  emptyFolderError: boolean
}

async function resolveFileHandleForWrite(
  root: DirectoryHandleLike,
  refPath: string,
): Promise<FileHandleLike> {
  const segments = refPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.')
  let current: DirectoryHandleLike = root
  for (let i = 0; i < segments.length - 1; i++) {
    current = await current.getDirectoryHandle(segments[i], { create: true })
  }
  const last = segments[segments.length - 1]
  return current.getFileHandle(last, { create: true })
}

async function removeFileByPath(root: DirectoryHandleLike, refPath: string): Promise<void> {
  const segments = refPath
    .replace(/\\/g, '/')
    .split('/')
    .filter((p) => p && p !== '.')
  let current: DirectoryHandleLike = root
  for (let i = 0; i < segments.length - 1; i++) {
    current = await current.getDirectoryHandle(segments[i])
  }
  const last = segments[segments.length - 1]
  if (current.removeEntry) {
    await current.removeEntry(last)
  }
}

/**
 * workspaceStore owns the FS directory handle, permission verification,
 * and IndexedDB handle recovery. `open()` is the single entry point that
 * triggers exactly one parse pass into modelStore (R1) — repeated calls
 * or route navigation must not re-parse.
 */
export const useWorkspaceStore = defineStore('workspace', {
  state: (): WorkspaceState => ({
    handle: null,
    driver: null,
    hasHandle: false,
    isParsing: false,
    hasParsed: false,
    parseCount: 0,
    saving: false,
    error: null,
    sourceUrl: null,
    backupEnabled: true,
    repository: new IndexedDbWorkspaceRepository(),
    isSampleSession: false,
    sampleTemplateName: '',
    emptyFolderError: false,
  }),
  actions: {
    /**
     * Opens a workspace from a directory handle and runs exactly one parse
     * pass into modelStore. Calling this again with hasParsed already true
     * is a no-op unless `force` is explicitly passed.
     */
    async open(handle: DirectoryHandleLike, options: { force?: boolean } = {}): Promise<void> {
      this.handle = handle
      this.hasHandle = true
      this.error = null
      this.emptyFolderError = false

      if (this.hasParsed && !options.force) {
        return
      }
      if (this.isParsing) {
        return
      }

      this.isParsing = true
      try {
        await this.repository.storeHandle(handle)
        const modelStore = useModelStore()
        await modelStore.parseFromHandle(handle, this.driver ?? undefined)

        // Detect empty folder — no _NN.md model files found
        const hasModelRoots = modelStore.rootIds.some(
          (id) => !id.startsWith('spec:') && modelStore.nodes[id],
        )
        if (!hasModelRoots) {
          this.emptyFolderError = true

          // Surface per-file parse problems so "no models found" is explainable:
          // e.g. a _NN.md file that exists but failed to parse. The <root> issue
          // (missing index.md fallback notice) is expected and not an error.
          const parseIssues = modelStore.parseIssues.filter((issue) => issue.path !== '<root>')
          if (parseIssues.length > 0) {
            this.error = parseIssues
              .slice(0, 4)
              .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
              .join(' — ')
          }

          this.hasHandle = false
          this.handle = null
          this.hasParsed = false
          return
        }

        this.hasParsed = true
        this.parseCount += 1

        // Reset UI state so the dashboard shows after loading
        const uiStore = useUiStore()
        uiStore.setActiveView('editor')
        uiStore.selectNode(null)

        // Persist session state after successful parse
        const rootId = modelStore.rootIds[0]
        if (rootId) {
          const rootNode = modelStore.getNode(rootId)
          if (rootNode?.source.path) {
            this.repository.setSessionState('lastFile', rootNode.source.path).catch(() => {})
          }
        }
        this.repository.setSessionState('lastOpenedAt', new Date().toISOString()).catch(() => {})
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.isParsing = false
      }
    },

    /**
     * Loads a FORMAT model document from a URL into modelStore as a virtual
     * workspace (no File System handle — save is disabled).
     *
     * Sets `handle` to null and `hasHandle` to false; the router guard will
     * block navigation to /workspace unless the caller sets hasHandle or
     * bypasses the guard.
     */
    async loadFromUrl(url: string, templateName?: string): Promise<void> {
      this.error = null
      this.sourceUrl = url
      this.emptyFolderError = false

      // Reset handle so router guards know this is a virtual workspace
      this.handle = null
      this.hasHandle = false

      if (this.isParsing) return
      this.isParsing = true

      try {
        const { loadIntoStore } = useUrlDocLoader()
        const result = await loadIntoStore(url)

        if (result.error) {
          this.error = result.error
          throw new Error(result.error)
        }

        this.hasParsed = true
        this.parseCount += 1

        // Set UI state to active root node and appropriate view
        const uiStore = useUiStore()
        const modelStore = useModelStore()
        const firstRootId = modelStore.rootIds[0] || null
        uiStore.selectNode(firstRootId)

        if (templateName === 'procedures') {
          uiStore.setActiveView('guided-procedure')
        } else {
          uiStore.setActiveView('editor')
        }

        if (templateName) {
          this.isSampleSession = true
          this.sampleTemplateName = templateName
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.isParsing = false
      }
    },

    /**
     * Reloads the entire model graph from disk (or source URL), discarding
     * any in-memory-only changes. Caller must confirm if dirtyIds is non-empty.
     */
    async reloadWorkspace(): Promise<void> {
      if (this.isParsing) return
      if (this.handle) {
        await this.open(this.handle, { force: true })
      } else if (this.sourceUrl) {
        await this.loadFromUrl(this.sourceUrl)
      } else {
        throw new Error('No hay un workspace activo para recargar')
      }
    },

    /** Enables or disables the auto-backup behaviour on save. */
    enableBackup(val: boolean): void {
      this.backupEnabled = val
    },

    /** Shorthand for `enableBackup(false)`. */
    disableBackup(): void {
      this.backupEnabled = false
    },

    /** Attempts to recover a previously granted handle from IndexedDB on boot. */
    async recoverHandle(): Promise<DirectoryHandleLike | null> {
      const handle = await this.repository.loadStoredHandle()
      if (handle) {
        this.handle = handle
        this.hasHandle = true

        // Restore uiStore state from persisted session
        try {
          const session = await this.repository.getSessionState()
          const uiStore = useUiStore()
          if (session.selectedNodeId && typeof session.selectedNodeId === 'string') {
            uiStore.selectNode(session.selectedNodeId)
          }
          if (session.activeView && typeof session.activeView === 'string') {
            uiStore.setActiveView(session.activeView as ActiveView)
          }
        } catch {
          // Session restoration is best-effort
        }
      }
      return handle
    },

    /**
     * Persists a single tree node's expansion state to IndexedDB.
     */
    async persistTreeState(nodeId: string, collapsed: boolean): Promise<void> {
      await this.repository.setTreeState(nodeId, collapsed)
    },

    /**
     * Restores the full tree state map from IndexedDB.
     * Returns a Map<nodeId, collapsed> — nodes not present default to expanded.
     */
    async restoreTreeState(): Promise<Map<string, boolean>> {
      return await this.repository.getTreeState()
    },

    reset(): void {
      this.handle = null
      this.driver = null
      this.hasHandle = false
      this.isParsing = false
      this.hasParsed = false
      this.parseCount = 0
      this.saving = false
      this.error = null
      this.sourceUrl = null
      this.backupEnabled = true
      this.isSampleSession = false
      this.sampleTemplateName = ''
      this.emptyFolderError = false
    },

    /**
     * Creates a backup of the root node's content before saving.
     * Writes to `backups/{YYYY-MM-DD_HHmmss}_{original-basename}.md`.
     * Non-blocking: failure is logged but does NOT prevent the save.
     *
     * Marked with `_` prefix (not `#`) because esbuild/vitest does not
     * transpile JavaScript private fields in Pinia option-store targets.
     */
    async _createBackup(): Promise<void> {
      if (!this.handle) return

      const modelStore = useModelStore()
      const dirtyRootIds = modelStore.rootIds.filter((id) => modelStore.dirtyIds.has(id))
      if (dirtyRootIds.length === 0) return

      for (const rootId of dirtyRootIds) {
        const rootNode = modelStore.getNode(rootId)
        if (!rootNode?.rawContent) continue

        try {
          const now = new Date()
          const ts =
            `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_` +
            `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`

          const rawBasename = rootNode.source.path.split(/[/\\]/).pop() ?? 'document'
          const cleanBasename = rawBasename.split(/[?#]/)[0]
          const backupName = `${ts}_${cleanBasename.replace(/[^a-zA-Z0-9._-]/g, '_').trim()}`

          let backupsDir: DirectoryHandleLike
          try {
            backupsDir = await this.handle.getDirectoryHandle('backups', { create: true })
          } catch {
            console.warn('[backup] Could not create backups/ directory')
            return
          }

          const fileHandle = await backupsDir.getFileHandle(backupName, { create: true })
          if (fileHandle.createWritable) {
            const writable = await fileHandle.createWritable()
            await writable.write(rootNode.rawContent)
            await writable.close()
          }
        } catch (err) {
          console.warn('[backup] Failed to create backup:', err)
        }
      }
    },

    /**
     * Downloads the generic iNNfo specification (level-1) into specs/ when
     * the root node declares a spec_version and the file is not already present.
     *
     * Best-effort: network failures or missing versions degrade gracefully.
     */
    async _ensureGeneralSpec(handle: DirectoryHandleLike): Promise<void> {
      const uiStore = useUiStore()
      const modelStore = useModelStore()
      const rootId =
        (uiStore.activeModelId && modelStore.nodes[uiStore.activeModelId]
          ? uiStore.activeModelId
          : undefined) ??
        modelStore.rootIds.find((id) => !id.startsWith('spec:')) ??
        modelStore.rootIds[0]
      if (!rootId) return
      const rootNode = modelStore.getNode(rootId)
      if (!rootNode?.rawContent) return

      const fm = parseFrontmatter(rootNode.rawContent)
      const specVersion = (fm as any)?.spec_version as string | undefined
      if (!specVersion) return

      const specFilename = `iNNfo_${specVersion}_NN.md`

      try {
        const specsDir = await handle.getDirectoryHandle('specs', { create: true })

        // Skip if already exists
        try {
          await specsDir.getFileHandle(specFilename)
          return
        } catch {
          // Not found — proceed to download
        }

        // Single URL strategy: the filename already encodes the version, so the
        // `main` branch is content-pinned (see `spec-versioning`, A4). There is
        // no separate tag-pinned or `models/specs/` fallback anymore.
        let text = ''
        try {
          const resp = await fetch(buildSpecificationUrl(specVersion))
          if (resp.ok) {
            text = await resp.text()
          }
        } catch {
          // network failure — degrade gracefully below
        }

        if (!text) {
          console.warn(`[spec] Failed to fetch spec for version ${specVersion}`)
          return
        }

        const fileHandle = await specsDir.getFileHandle(specFilename, { create: true })
        if (fileHandle.createWritable) {
          const w = await fileHandle.createWritable()
          await w.write(text)
          await w.close()
        }
      } catch (e) {
        console.warn('[spec] Could not ensure general spec:', e)
      }
    },

    /**
     * Serializes all dirty nodes and writes them back to disk via
     * recursiveSerialize. Clears dirty flags on success.
     *
     * When `backupEnabled` is true (default), creates a timestamped backup
     * of the root node before writing.
     */
    async saveActiveFile(): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')
      this.saving = true
      try {
        // Non-blocking backup before write
        if (this.backupEnabled) {
          await this._createBackup()
        }

        const modelStore = useModelStore()
        const reports = await recursiveSerialize(
          modelStore.nodes,
          modelStore.dirtyIds,
          this.driver ?? undefined,
        )

        if (!this.driver) {
          // If no driver is set, write the dirty model files directly using the directory handle
          for (const report of reports) {
            if (report.nodeId.startsWith('spec:')) continue
            const node = modelStore.getNode(report.nodeId)
            if (node && node.rawContent !== undefined) {
              const fileHandle = await resolveFileHandleForWrite(this.handle, report.path)
              if (fileHandle.createWritable) {
                const w = await fileHandle.createWritable()
                await w.write(node.rawContent)
                await w.close()
              }
            }
          }
        }

        // Persist spec:* nodes (templates/specs) to specs/ directory.
        // Write-once: specs/ content is immutable by convention, so an
        // existing file is left as authoritative rather than overwritten.
        const specsDir = await this.handle.getDirectoryHandle('specs', { create: true })
        for (const [id, node] of Object.entries(modelStore.nodes)) {
          if (id.startsWith('spec:') && node.rawContent) {
            const specName = node.name || id.substring(5)
            const filename = specName.endsWith('_NN') ? `${specName}.md` : `${specName}_NN.md`
            const alreadyPresent = await specsDir
              .getFileHandle(filename)
              .then(() => true)
              .catch(() => false)
            if (alreadyPresent) continue
            const fileHandle = await specsDir.getFileHandle(filename, { create: true })
            if (fileHandle.createWritable) {
              const w = await fileHandle.createWritable()
              await w.write(node.rawContent)
              await w.close()
            }
          }
        }

        // Also ensure the generic iNNfo spec is present
        await this._ensureGeneralSpec(this.handle)

        // Clear dirty flags after successful write
        for (const id of Array.from(modelStore.dirtyIds)) {
          modelStore.clearDirty(id)
        }
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err)
        throw err
      } finally {
        this.saving = false
      }
    },

    /**
     * Renames the active file on disk (if handle present) and updates the source path in memory.
     */
    async renameActiveFile(newFilename: string, targetRootId?: string): Promise<void> {
      const uiStore = useUiStore()
      const modelStore = useModelStore()
      const rootId =
        targetRootId ??
        (uiStore.activeModelId && modelStore.nodes[uiStore.activeModelId]
          ? uiStore.activeModelId
          : undefined) ??
        modelStore.rootIds.find((id) => !id.startsWith('spec:')) ??
        modelStore.rootIds[0]
      const rootNode = rootId ? modelStore.getNode(rootId) : null
      if (!rootNode) throw new Error('No root node found to rename')

      const oldPath = rootNode.source.path.replace(/\\/g, '/')
      const pathSegments = oldPath.split('/')
      pathSegments.pop()
      const dirPath = pathSegments.join('/')

      let cleanNewFilenameOnly = newFilename.trim()
      if (!cleanNewFilenameOnly.endsWith('.md')) {
        cleanNewFilenameOnly += '.md'
      }
      cleanNewFilenameOnly = cleanNewFilenameOnly.replace(/[^a-zA-Z0-9._-]/g, '_')
      const cleanNewFilename = dirPath ? `${dirPath}/${cleanNewFilenameOnly}` : cleanNewFilenameOnly

      if (this.handle) {
        const oldFilename = rootNode.source.path
        if (oldFilename === cleanNewFilename) return

        // Create new file and copy content
        const newFileHandle = await resolveFileHandleForWrite(this.handle, cleanNewFilename)
        if (!newFileHandle.createWritable) {
          throw new Error(`File handle for "${cleanNewFilename}" does not support writing`)
        }
        const writable = await newFileHandle.createWritable()
        await writable.write(rootNode.rawContent ?? '')
        await writable.close()

        // Delete old file
        try {
          await removeFileByPath(this.handle, oldFilename)
        } catch (e) {
          console.warn(`Failed to delete old file "${oldFilename}":`, e)
        }
      }

      // Update in memory path for root node and all child nodes belonging to this model
      const oldPathRef = rootNode.source.path
      rootNode.source.path = cleanNewFilename
      for (const node of Object.values(modelStore.nodes)) {
        if (
          node.source &&
          (node.source.path === oldPathRef || modelStore.getModelRootForNode(node.id) === rootId)
        ) {
          node.source.path = cleanNewFilename
        }
      }
    },

    /**
     * Saves the active file under a new version-bumped filename, then
     * persists all dirty nodes. The original file is NOT deleted.
     */
    async saveActiveFileWithVersionBump(level: BumpLevel, targetRootId?: string): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')

      const uiStore = useUiStore()
      const modelStore = useModelStore()
      const rootId =
        targetRootId ??
        (uiStore.activeModelId && modelStore.nodes[uiStore.activeModelId]
          ? uiStore.activeModelId
          : undefined) ??
        modelStore.rootIds.find((id) => !id.startsWith('spec:')) ??
        modelStore.rootIds[0]
      const rootNode = modelStore.getNode(rootId)
      if (!rootNode) throw new Error('No root node found for version bump')

      const oldPath = rootNode.source.path.replace(/\\/g, '/')
      const pathSegments = oldPath.split('/')
      const oldFilenameOnly = pathSegments.pop() || ''
      const dirPath = pathSegments.join('/')

      const parsed = parseFormatFilename(oldFilenameOnly)
      if (!parsed) throw new Error('Could not parse filename for version bump')

      const newVersion = bumpVersion(parsed.version, level)
      const newFilenameOnly = buildFormatFilename(parsed.baseName, parsed.templateName, newVersion)
      const versionStr = formatVersionString(newVersion)
      const oldFilename = rootNode.source.path

      const cleanNewFilenameOnly = newFilenameOnly.replace(/[^a-zA-Z0-9._-]/g, '_').trim()
      const cleanNewFilename = dirPath ? `${dirPath}/${cleanNewFilenameOnly}` : cleanNewFilenameOnly

      // Create the new file and write current content
      const newFileHandle = await resolveFileHandleForWrite(this.handle, cleanNewFilename)
      if (!newFileHandle.createWritable) {
        throw new Error(`New file handle "${cleanNewFilename}" does not support writing`)
      }
      const writable = await newFileHandle.createWritable()
      await writable.write(rootNode.rawContent ?? '')
      await writable.close()

      // Archive the previous version (non-blocking)
      if (oldFilename !== cleanNewFilename) {
        try {
          const archiveDir = await this.handle.getDirectoryHandle('Archive', { create: true })
          const oldFileHandle = await resolveFileHandleForWrite(this.handle, oldFilename)
          const oldFile = await oldFileHandle.getFile()
          const oldContent = await oldFile.text()
          const archiveFileHandle = await resolveFileHandleForWrite(archiveDir, oldFilename)
          if (archiveFileHandle.createWritable) {
            const archiveWritable = await archiveFileHandle.createWritable()
            await archiveWritable.write(oldContent)
            await archiveWritable.close()
          }
          await removeFileByPath(this.handle, oldFilename)
        } catch (err) {
          console.warn('[version-bump] Failed to archive previous version:', err)
        }
      }

      // Update the root node's in-memory frontmatter version
      if (rootNode.rawContent) {
        rootNode.rawContent = rootNode.rawContent.replace(
          /^(model_version|version):\s*"V_\d+-\d+-\d+"/m,
          `$1: "${versionStr}"`,
        )
      }

      // Update the root node's source path and all child nodes belonging to this model
      rootNode.source.path = cleanNewFilename
      for (const node of Object.values(modelStore.nodes)) {
        if (
          node.source &&
          (node.source.path === oldFilename || modelStore.getModelRootForNode(node.id) === rootId)
        ) {
          node.source.path = cleanNewFilename
        }
      }

      // Mark root node dirty so saveActiveFile persists changes
      modelStore.markDirty(rootId)

      // Persist all dirty nodes (including the updated root)
      await this.saveActiveFile()
    },
  },
})
