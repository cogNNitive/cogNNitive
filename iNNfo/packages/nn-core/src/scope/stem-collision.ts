import { stemOf } from './model-index.js'

export interface StemCollision {
  /** The repeated filename stem (the model id), e.g. `script_NN`. */
  id: string
  /** Every domain-relative path carrying that stem, sorted. */
  paths: string[]
}

/**
 * Model ids are filename stems and are global to a domaiNN. Reports every stem
 * carried by two or more distinct paths, so a repeated stem is never dropped
 * silently. Pure: callers pass the model paths of ONE domaiNN (nested domaiNNs
 * are their own roots and are not discovered by the outer one).
 */
export function findStemCollisions(modelPaths: readonly string[]): StemCollision[] {
  const byStem = new Map<string, Set<string>>()
  for (const raw of modelPaths) {
    const path = raw.replace(/\\/g, '/')
    const id = stemOf(path)
    const paths = byStem.get(id) ?? new Set<string>()
    paths.add(path)
    byStem.set(id, paths)
  }
  return [...byStem.entries()]
    .filter(([, paths]) => paths.size > 1)
    .map(([id, paths]) => ({ id, paths: [...paths].sort() }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** One-line human description of a collision, naming the id and every path. */
export function stemCollisionMessage(collision: StemCollision): string {
  return `Model id "${collision.id}" is carried by ${collision.paths.length} documents: ${collision.paths.join(', ')}. Model ids are filename stems and must be unique within a domaiNN.`
}
