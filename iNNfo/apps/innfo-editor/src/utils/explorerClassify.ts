export type ExplorerItemKind = 'model' | 'artifact' | 'source' | null

function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase()
}

export interface ExplorerClassifiable {
  name: string
  path: string
  kind: 'file' | 'directory'
}

export function checkIsModel(item: ExplorerClassifiable): boolean {
  if (item.kind !== 'file') return false
  return item.name.endsWith('_NN.md') || item.name.endsWith('_nn.md')
}

export function checkIsArtifact(item: ExplorerClassifiable): boolean {
  if (item.kind !== 'file') return false
  return normalizePath(item.path).startsWith('artifacts/')
}

export function checkIsSource(item: ExplorerClassifiable): boolean {
  if (item.kind !== 'file') return false
  return normalizePath(item.path).startsWith('sources/')
}

/** Single source of truth for Explorer file classification (Model / Source / Artifact). */
export function classifyExplorerItem(item: ExplorerClassifiable): ExplorerItemKind {
  if (checkIsModel(item)) return 'model'
  if (checkIsArtifact(item)) return 'artifact'
  if (checkIsSource(item)) return 'source'
  return null
}
