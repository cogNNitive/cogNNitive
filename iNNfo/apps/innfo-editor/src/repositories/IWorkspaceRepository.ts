import type { DirectoryHandleLike } from '../model/fs-types'

export interface IWorkspaceRepository {
  storeHandle(handle: DirectoryHandleLike): Promise<void>
  loadStoredHandle(): Promise<DirectoryHandleLike | null>
  getSessionState(): Promise<Record<string, unknown>>
  setSessionState(key: string, value: unknown): Promise<void>
  setTreeState(nodeId: string, collapsed: boolean): Promise<void>
  getTreeState(): Promise<Map<string, boolean>>
}
