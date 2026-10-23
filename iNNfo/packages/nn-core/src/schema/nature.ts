/**
 * Declarative blueprint nature (declarative-blueprint-nature, change A).
 *
 * A Level-2 blueprint MAY declare how its documents are structured and whether
 * their content is authored or derived:
 *
 *   nature:
 *     structure: catalog      # catalog | members | projection
 *     ownership: derived      # authored | derived
 *
 * `structure` says where a collection's elements come from; `ownership` says
 * whether the content is proposable (`authored`) or read-only (`derived`). This
 * module parses and validates the declaration; the compiled `blueprint -> nature`
 * map (used by the console, resolved from the embedded canonical registry) is
 * added alongside the core blueprints' declarations.
 */

export type BlueprintStructure = 'catalog' | 'members' | 'projection'
export type BlueprintOwnership = 'authored' | 'derived'

export interface BlueprintNature {
  structure: BlueprintStructure
  ownership: BlueprintOwnership
}

export interface NatureDiagnostic {
  code: string
  message: string
}

export interface ParsedNature {
  /** The resolved nature, present only when the declaration is complete and valid. */
  nature?: BlueprintNature
  /** Empty when the document declares no `nature` or declares a valid one. */
  diagnostics: NatureDiagnostic[]
}

const STRUCTURES: ReadonlySet<string> = new Set(['catalog', 'members', 'projection'])
const OWNERSHIPS: ReadonlySet<string> = new Set(['authored', 'derived'])

/**
 * Parses and validates a blueprint's `nature` frontmatter block. A missing block
 * is legal (the document declares no nature). An unknown `structure`/`ownership`
 * value, or a non-mapping `nature`, is reported as a diagnostic and yields no
 * resolved nature.
 */
export function parseNature(frontmatter: Record<string, unknown>): ParsedNature {
  const raw = frontmatter['nature']
  if (raw === undefined || raw === null) return { diagnostics: [] }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      diagnostics: [
        {
          code: 'NATURE_INVALID_SHAPE',
          message: 'nature must be a mapping with "structure" and "ownership"',
        },
      ],
    }
  }

  const record = raw as Record<string, unknown>
  const structure = record['structure']
  const ownership = record['ownership']
  const diagnostics: NatureDiagnostic[] = []

  if (typeof structure !== 'string' || !STRUCTURES.has(structure)) {
    diagnostics.push({
      code: 'NATURE_UNKNOWN_STRUCTURE',
      message: `unknown nature.structure "${String(structure)}"; expected catalog | members | projection`,
    })
  }
  if (typeof ownership !== 'string' || !OWNERSHIPS.has(ownership)) {
    diagnostics.push({
      code: 'NATURE_UNKNOWN_OWNERSHIP',
      message: `unknown nature.ownership "${String(ownership)}"; expected authored | derived`,
    })
  }

  if (diagnostics.length > 0) return { diagnostics }
  return {
    nature: {
      structure: structure as BlueprintStructure,
      ownership: ownership as BlueprintOwnership,
    },
    diagnostics,
  }
}

/**
 * Compiled `blueprint -> nature` map for the core blueprints that declare a
 * collection, mirroring each Level-2 blueprint's frontmatter `nature`. It is data,
 * so the surfacing predicate stays pure and browser-safe. Domain-local blueprints
 * are absent here: their nature is resolved at runtime by the blueprint resolver.
 * `changes` is deliberately absent (surfacing it is change B, not this one).
 */
export const CORE_BLUEPRINT_NATURE: Readonly<Record<string, BlueprintNature>> = {
  sources: { structure: 'catalog', ownership: 'derived' },
  artifacts: { structure: 'catalog', ownership: 'derived' },
  procedures: { structure: 'catalog', ownership: 'derived' },
}

/** The nature a core blueprint declares, or `undefined` when it declares none. */
export function natureOfBlueprint(blueprintName: string): BlueprintNature | undefined {
  return CORE_BLUEPRINT_NATURE[blueprintName]
}
