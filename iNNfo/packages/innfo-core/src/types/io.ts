import type { ParsedModel } from './parser'

export interface FileDriverOptions {
  encoding?: string
}

export interface ModelEntry {
  name: string
  uri: string
  kind: 'element' | 'asset' | 'concept'
}

/** Structural contract for pluggable model read/write backends (e.g. a caller-supplied write target). */
export interface ModelDriver {
  readModel(uri: string): Promise<ParsedModel>
  writeModel(uri: string, model: ParsedModel): Promise<void>
  listChildren(uri: string): Promise<ModelEntry[]>
  listAssets(uri: string): Promise<string[]>
}

export interface ResolverOptions {
  maxDepth?: number
  timeout?: number
}
