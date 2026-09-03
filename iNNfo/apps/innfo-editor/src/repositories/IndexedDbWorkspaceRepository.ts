import type { DirectoryHandleLike } from '../model/fs-types'
import type { IWorkspaceRepository } from './IWorkspaceRepository'
import {
  dbGet,
  dbSet,
  getSessionState,
  setSessionState,
  getTreeState,
  setTreeState,
} from '../utils/db'

export class IndexedDbWorkspaceRepository implements IWorkspaceRepository {
  private readonly storeName = 'handles'
  private readonly handleKey = 'workspaceRoot'

  async storeHandle(handle: DirectoryHandleLike): Promise<void> {
    await dbSet(this.storeName, this.handleKey, handle)
  }

  async loadStoredHandle(): Promise<DirectoryHandleLike | null> {
    const handle = await dbGet<DirectoryHandleLike>(this.storeName, this.handleKey)
    return handle ?? null
  }

  async getSessionState(): Promise<Record<string, unknown>> {
    return getSessionState()
  }

  async setSessionState(key: string, value: unknown): Promise<void> {
    await setSessionState(key, value)
  }

  async setTreeState(nodeId: string, collapsed: boolean): Promise<void> {
    await setTreeState(nodeId, collapsed)
  }

  async getTreeState(): Promise<Map<string, boolean>> {
    return getTreeState()
  }
}
