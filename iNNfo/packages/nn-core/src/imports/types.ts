export interface ImportedDomainDeclaration {
  alias: string
  path: string
}

export interface ImportDeclaration {
  name: string
  from: string
  originAlias: string
  model: string
  concept?: string
  filters?: Record<string, string>
}

export interface ParsedDomainImports {
  domains: ImportedDomainDeclaration[]
  imports: ImportDeclaration[]
}

export interface SnapshotElement {
  name: string
  concept: string
  slug?: string
  fields: Record<string, unknown>
}

export interface ProjectSnapshotOptions {
  originAlias: string
  importName: string
  sourceAddress: string
  originPath: string
  elements: SnapshotElement[]
  title?: string
}

export interface ProposedChangeset {
  status: 'proposed'
  target: string
  evidence: string
  author?: string
  timestamp: string
  content?: string
}

export interface ImportDiffResult {
  hasChanges: boolean
  oldHash?: string
  newHash: string
  changeset?: ProposedChangeset
}

export interface ComputeImportDiffOptions {
  currentHash?: string
  newElements: SnapshotElement[]
  targetFile?: string
  sourceAddress?: string
  author?: string
}
