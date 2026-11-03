import type { ConceptStorage } from '../../src/schema/storage'
import type { DomainModelInput, StorageDeclarationsResolver } from '../../src/domain/types'
import { blueprintNameOf } from '../../src/naming/contract'

/** The `video-script` shape of design A16: Series and Video distributed, Scene and Preset compact. */
export const VIDEO_SCRIPT: ReadonlyMap<string, ConceptStorage> = new Map<string, ConceptStorage>([
  ['Series', { mode: 'distributed', placement: 'series/{slug}/' }],
  ['Video', { mode: 'distributed', container: 'Series', placement: '{container}/assets/{slug}/' }],
  ['Scene', { mode: 'compact' }],
  ['Preset', { mode: 'compact' }],
])

/** Resolves `video-script`; `unresolvable` yields null; every other bluepriNNt declares no storage. */
export const resolver: StorageDeclarationsResolver = ({ name }) => {
  const bp = blueprintNameOf(name).toLowerCase()
  if (bp === 'video-script') return VIDEO_SCRIPT
  if (bp === 'unresolvable') return null
  return new Map()
}

export function model(
  path: string,
  elements: ReadonlyArray<[concept: string, slug: string]> = [],
  parentSpec: Record<string, unknown> | string = { name: 'video-script_V_0-15-0' },
): DomainModelInput {
  return {
    path,
    frontmatter: { level: 3, parent_spec: parentSpec },
    elements: elements.map(([concept, slug]) => ({ concept, slug })),
  }
}

export const seriesModel = (slug: string) =>
  model(`series/${slug}/${slug}_video-script_NN.md`, [['Series', slug]])

export const videoModel = (series: string, slug: string, extra: ReadonlyArray<[string, string]> = []) =>
  model(`series/${series}/assets/${slug}/${slug}_video-script_NN.md`, [['Video', slug], ...extra])
