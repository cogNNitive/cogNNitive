import { defineStore } from 'pinia'
import { useModelStore } from './modelStore'
import { useUiStore } from './uiStore'
import { IndexedDbWorkspaceRepository } from '../repositories/IndexedDbWorkspaceRepository'
import type { IWorkspaceRepository } from '../repositories/IWorkspaceRepository'
import type { WorkspaceIntegrityReport } from '@cognnitive/innfo-core'
import { useUrlDocLoader } from '../composables/useUrlDocLoader'
import { createWorkspaceIntegrityPorts } from '../services/workspaceIntegrityPorts'
import {
  resolveFileHandleForRead,
  saveActiveFile as persistSaveActiveFile,
  renameActiveFile as persistRenameActiveFile,
  saveActiveFileWithVersionBump as persistSaveActiveFileWithVersionBump,
} from '../services/WorkspacePersistenceService'
import type { DirectoryHandleLike } from '../model/fs-types'
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
  /** Workspace integrity report, produced fire-and-forget on open() (AD-6). */
  integrityReport: WorkspaceIntegrityReport | null
  /** True while the non-blocking integrity check is in flight. */
  integrityRunning: boolean
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
    integrityReport: null,
    integrityRunning: false,
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

        // Fire-and-forget workspace integrity check (AD-6): never blocks the
        // first paint, never rejects into open(), catalog-only on open
        // (Resolved Decision 4).
        void this._runIntegrityCheck().catch(() => {})

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
     * Runs the workspace integrity check against the in-memory graph and the
     * same-origin template catalog. Non-blocking and informational: a failure
     * of any port (or of the whole pass) clears the report and is swallowed —
     * it must never set `error` or prevent editing. Catalog-only on open
     * (Resolved Decision 4): resolveTemplate/checkFreshness are omitted, so
     * those fields render as `not-checked`.
     */
    async _runIntegrityCheck(): Promise<void> {
      if (this.integrityRunning) return
      this.integrityRunning = true
      try {
        const { buildWorkspaceIntegrityReport } = await import('@cognnitive/innfo-core')
        const report = await buildWorkspaceIntegrityReport(createWorkspaceIntegrityPorts())
        this.integrityReport = report
      } catch (err) {
        console.warn('[integrity] Workspace integrity check failed:', err)
        this.integrityReport = null
      } finally {
        this.integrityRunning = false
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
    /**
     * Loads a single FORMAT model document from a URL into modelStore.
     */
    async loadFromUrl(url: string, templateName?: string): Promise<void> {
      return this.loadVirtualWorkspace([url], undefined, templateName)
    },

    /**
     * Loads multiple FORMAT model documents from URLs into modelStore as a
     * unified virtual workspace (no File System handle — save is disabled).
     */
    async loadVirtualWorkspace(
      urls: string[],
      name?: string,
      templateName?: string,
    ): Promise<void> {
      this.error = null
      this.sourceUrl = urls.join(',')
      this.emptyFolderError = false

      this.handle = null
      this.hasHandle = false

      if (this.isParsing) return
      this.isParsing = true

      try {
        const { loadWorkspaceIntoStore } = useUrlDocLoader()
        const result = await loadWorkspaceIntoStore(urls)

        if (result.error && Object.keys(result.nodes).length === 0) {
          this.error = result.error
          throw new Error(result.error)
        }

        this.hasParsed = true
        this.parseCount += 1

        const uiStore = useUiStore()
        const modelStore = useModelStore()
        const firstRootId = modelStore.rootIds[0] || null
        uiStore.selectNode(firstRootId)
        uiStore.setActiveView('editor')

        this.isSampleSession = true
        this.sampleTemplateName = templateName || name || 'workspace'
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
      this.integrityReport = null
      this.integrityRunning = false
    },

    /**
     * Serializes all dirty nodes and writes them back to disk via
     * recursiveSerialize. Clears dirty flags on success.
     *
     * When `backupEnabled` is true (default), creates a timestamped backup
     * of the root node before writing.
     *
     * Delegates the actual disk I/O to `WorkspacePersistenceService` (see
     * OpenSpec `2026-09-13-simple-refactors-batch`, task 4) — this action
     * keeps only the `saving`/`error` state management.
     */
    async saveActiveFile(): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')
      this.saving = true
      try {
        const modelStore = useModelStore()
        const uiStore = useUiStore()
        await persistSaveActiveFile(
          this.handle,
          this.driver,
          modelStore,
          uiStore,
          this.backupEnabled,
        )
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
      const modelStore = useModelStore()
      const uiStore = useUiStore()
      await persistRenameActiveFile(this.handle, modelStore, uiStore, newFilename, targetRootId)
    },

    /**
     * Saves the active file under a new version-bumped filename, then
     * persists all dirty nodes. The original file is NOT deleted.
     *
     * The final persist step is delegated to this store's own
     * `saveActiveFile()` action (not called directly from the service) so the
     * `saving`/`error` state transitions happen exactly as before.
     */
    async saveActiveFileWithVersionBump(level: BumpLevel, targetRootId?: string): Promise<void> {
      if (!this.handle) throw new Error('No workspace handle')
      const modelStore = useModelStore()
      const uiStore = useUiStore()
      await persistSaveActiveFileWithVersionBump(this.handle, modelStore, uiStore, level, targetRootId)
      await this.saveActiveFile()
    },

    /**
     * Read the full text content of a workspace file by relative path.
     * Returns null when the handle is missing or the file cannot be resolved.
     * Shared by FilePreviewModal and WorkspaceExplorer (no duplicated traversal).
     */
    async readText(refPath: string): Promise<string | null> {
      if (!this.handle) return null
      const fileHandle = await resolveFileHandleForRead(this.handle, refPath)
      if (!fileHandle) return null
      const file = await fileHandle.getFile()
      return file.text()
    },

    /** Read a file by relative path as a Blob (for image/PDF previews).
 *  The FileHandleLike type only exposes {text()}, but the browser returns a
 *  native File (a Blob subclass) — cast preserves size/type for object URLs. */
    async readFileBlob(refPath: string): Promise<Blob | null> {
      if (!this.handle) return null
      const fileHandle = await resolveFileHandleForRead(this.handle, refPath)
      if (!fileHandle) return null
      const file = await fileHandle.getFile()
      return file as unknown as Blob
    },
  },
})
