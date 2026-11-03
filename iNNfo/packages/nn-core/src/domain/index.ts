/**
 * The domain index (design A5, A8, A12): the single source of model ids,
 * address resolution, collections and layout diagnostics. Pure and browser-safe;
 * plain data in, one resolver port for the declared storage of a bluepriNNt.
 */

import { formatAddress, isAddressError, parseAddress, type Address, type ModelId, type Unit } from '../address/index.js'
import { RESERVED_HEAD } from '../address/grammar.js'
import { blueprintNameOf, roleOf } from '../naming/contract.js'
import type { ConceptStorage } from '../schema/storage.js'
import { basenameOf, classifyModel, idOf, parentSpecOf, type Classification } from './classify.js'
import { buildRules, layoutDiagnostic, placementFor as placementForRules, type PlacementRules } from './placement.js'
import type {
  AddressResolution,
  DomainModelInput,
  ElementRef,
  IndexedModel,
  LayoutDiagnostic,
  ResolutionProblem,
  ResolveExpectation,
  StorageDeclarationsResolver,
} from './types.js'

export type * from './types.js'

export interface DomainIndex {
  /** Every addressable model, ordered by id then path. */
  readonly models: readonly IndexedModel[]
  /** The model with this id; undefined when the id is unknown or carried by several files. */
  byId(id: string): IndexedModel | undefined
  byPath(path: string): IndexedModel | undefined
  resolve(address: string | Address, from?: string, expect?: ResolveExpectation): AddressResolution
  placementFor(concept: string, id: string, blueprint: string): { folder: string; file: string } | LayoutDiagnostic
  readonly diagnostics: readonly LayoutDiagnostic[]
}

interface Entry {
  input: DomainModelInput
  classification: Classification
  model: IndexedModel
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)
const versionOf = (name: string): string | null => /_(V_\d+-\d+-\d+)$/i.exec(name.trim())?.[1] ?? null

export function buildDomainIndex(
  inputs: readonly DomainModelInput[],
  declarations: StorageDeclarationsResolver,
): DomainIndex {
  const diagnostics: LayoutDiagnostic[] = []
  const resolved = new Map<string, { map: ReadonlyMap<string, ConceptStorage>; rules: PlacementRules } | null>()
  const lookup = (name: string, url?: string) => {
    const key = `${name}\n${url ?? ''}`
    if (!resolved.has(key)) {
      const map = declarations({ name, url })
      resolved.set(key, map ? { map, rules: buildRules(map) } : null)
    }
    return resolved.get(key) ?? null
  }

  const entries: Entry[] = []
  for (const input of [...inputs].sort((a, b) => byText(a.path, b.path))) {
    const { name, url } = parentSpecOf(input.frontmatter)
    if (roleOf({ path: basenameOf(input.path), parentSpecName: name }) !== 'knowledge') continue
    const declared = name ? lookup(name, url) : null
    if (!declared) {
      const subject = name ? `bluepriNNt "${name}" cannot be resolved` : 'it pins no bluepriNNt (parent_spec.name is missing)'
      diagnostics.push(
        layoutDiagnostic(
          'MODEL_UNADDRESSABLE',
          `${input.path} - ${subject}, so the model has no id; pin a resolvable bluepriNNt`,
          [input.path],
        ),
      )
      continue
    }
    const classification = classifyModel(input, declared.rules)
    const id = idOf(input, classification)
    if (id === RESERVED_HEAD || id.startsWith(`${RESERVED_HEAD}/`)) {
      diagnostics.push(
        layoutDiagnostic(
          'RESERVED_MODEL_ID',
          `${input.path} - id "${id}" starts with "${RESERVED_HEAD}", which is reserved for blueprint addresses; rename the file or its folder`,
          [input.path],
          { id },
        ),
      )
      continue
    }
    const segments = id.split('/')
    const storage: IndexedModel['storage'] =
      classification.kind === 'instance'
        ? {
            kind: 'instance',
            concept: classification.rootConcept,
            container: segments.length > 1 ? (segments.slice(0, -1).join('/') as ModelId) : null,
            slug: segments[segments.length - 1],
          }
        : { kind: 'compact' }
    const blueprint = { name: blueprintNameOf(name ?? ''), version: versionOf(name ?? '') }
    entries.push({ input, classification, model: { id: id as ModelId, path: input.path, blueprint, storage } })
  }

  const byIdGroups = new Map<string, Entry[]>()
  for (const entry of entries) byIdGroups.set(entry.model.id, [...(byIdGroups.get(entry.model.id) ?? []), entry])
  for (const [id, group] of [...byIdGroups].sort(([a], [b]) => byText(a, b))) {
    if (group.length < 2) continue
    const paths = group.map((e) => e.model.path)
    diagnostics.push(
      layoutDiagnostic(
        'DUPLICATE_MODEL_ID',
        `id "${id}" is carried by ${paths.join(', ')} - ids must be unique in a domaiNN; rename or move one`,
        paths,
        { id },
      ),
    )
  }

  const models = entries.map((e) => e.model).sort((a, b) => byText(a.id, b.id) || byText(a.path, b.path))
  const pathMap = new Map(models.map((m) => [m.path, m]))
  const elementsOf = new Map(entries.map((e) => [e.model.path, e.input.elements]))
  const byId = (id: string): IndexedModel | undefined => {
    const group = byIdGroups.get(id)
    return group?.length === 1 ? group[0].model : undefined
  }

  const resolve = (address: string | Address, from?: string, expect?: ResolveExpectation): AddressResolution => {
    const parsed = typeof address === 'string' ? parseAddress(address) : address
    const text = typeof address === 'string' ? address.trim() : formatAddress(address)
    const fail = (code: ResolutionProblem['code'], message: string): AddressResolution => ({
      ok: false,
      problem: { code, severity: 'error', message: `${code}: ${text} - ${message}` },
    })
    if (isAddressError(parsed)) return fail(parsed.code, parsed.message)
    if (parsed.kind === 'blueprint' || parsed.kind === 'source') {
      return fail('ADDRESS_MALFORMED', 'not a model address; use `<hierarchical-id>@<slug>`')
    }

    const unit: Unit | null = parsed.kind === 'unit' ? parsed.unit : null
    const modelId = parsed.model ?? from
    if (modelId === undefined || modelId === null) {
      return fail('ADDRESS_MALFORMED', 'a relative address needs its containing model; write the full address')
    }
    if (parsed.kind === 'unit' && parsed.model !== null && parsed.model === from) {
      const slug = unit && 'slug' in unit ? unit.slug : '<slug>'
      return fail('ADDRESS_NOT_CANONICAL', `a reference to its own model must be relative; write @${slug}`)
    }

    const model = byId(modelId)
    if (!model) {
      const duplicate = (byIdGroups.get(modelId)?.length ?? 0) > 1
      const last = modelId.split('/').pop()
      const candidates = models.filter((m) => m.id !== modelId && m.id.split('/').pop() === last).map((m) => m.id)
      const hint = duplicate
        ? 'the id is carried by several files (DUPLICATE_MODEL_ID); fix that first'
        : candidates.length > 0
          ? `use a full id (candidates: ${candidates.join(', ')})`
          : 'use the id of an existing model'
      return fail('REF_MODEL_NOT_FOUND', `no model has the id "${modelId}"; ${hint}`)
    }

    const elements = elementsOf.get(model.path) ?? []
    let element: ElementRef | null = null
    if (unit === null && model.storage.kind === 'instance') {
      const { concept, slug } = model.storage
      element = { concept, slug }
    } else if (unit && (unit.kind === 'element' || unit.kind === 'body')) {
      const found = elements.find((e) => e.slug === unit.slug)
      if (!found) {
        return fail('REF_ELEMENT_NOT_FOUND', `model "${model.id}" has no element with slug "${unit.slug}"; use one of its slugs`)
      }
      element = { concept: found.concept, slug: found.slug }
    }

    const warnings: ResolutionProblem[] = []
    const warn = (code: ResolutionProblem['code'], message: string) =>
      warnings.push({ code, severity: 'warning', message: `${code}: ${text} - ${message}` })
    if (element && expect?.concepts && !expect.concepts.some((c) => c.toLowerCase() === element.concept.toLowerCase())) {
      warn('REF_CONCEPT_MISMATCH', `the target is a ${element.concept} but the field accepts ${expect.concepts.join(', ')}; point it at one of those`)
    }
    if (expect?.blueprint && expect.blueprint.toLowerCase() !== model.blueprint.name.toLowerCase()) {
      warn('REF_BLUEPRINT_MISMATCH', `the target model pins "${model.blueprint.name}" but the field expects "${expect.blueprint}"; point it at a model of that bluepriNNt`)
    }
    return { ok: true, model, element, unit, warnings }
  }

  return {
    models,
    byId,
    byPath: (path) => pathMap.get(path),
    resolve,
    placementFor: (concept, id, blueprint) => {
      const declared = lookup(blueprint)
      if (!declared) {
        return layoutDiagnostic(
          'MODEL_UNADDRESSABLE',
          `bluepriNNt "${blueprint}" cannot be resolved - no placement can be computed; pin a resolvable bluepriNNt`,
          [],
        )
      }
      return placementForRules(declared.map, concept, id, blueprint)
    },
    diagnostics,
  }
}
