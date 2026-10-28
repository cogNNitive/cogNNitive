import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseName, procedureIdOf } from '../naming/contract.js'
import { parseFrontmatter } from '../parser/index.js'
import type { ProcedureDiagnostic } from './procedures.js'
import type { LoadedChain } from './resolve.js'
import type { ForkRecord, JsonValue, ProcedureDef, ScopeChain, ScopeNode, SlotDecl } from './types.js'

/** Where a scope keeps its procedures, relative to the scope directory. */
const PROCEDURES_DIR = 'procedures'

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v)

function procedureDocsOf(dir: string): string[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => {
        const parsed = parseName(name)
        return parsed.kind === 'nn' && parsed.sidecarOf === undefined && /_procedures$/i.test(parsed.stem)
      })
      .sort()
  } catch {
    return []
  }
}

function slotOf(raw: unknown): SlotDecl | null {
  if (!isPlainObject(raw)) return null
  const { name, kind, required, step } = raw
  if (typeof name !== 'string' || name === '') return null
  if (kind !== 'value' && kind !== 'procedure') return null
  if (required !== undefined && typeof required !== 'boolean') return null
  if (step !== undefined && typeof step !== 'string') return null
  const slot: SlotDecl = { name, kind, required: required === true }
  if (Object.hasOwn(raw, 'default')) slot.default = raw['default'] as JsonValue
  if (step !== undefined) slot.step = step
  return slot
}

function forkOf(raw: unknown): ForkRecord | null {
  if (!isPlainObject(raw)) return null
  const { procedure, scope, version } = raw
  if (typeof procedure !== 'string' || typeof scope !== 'string' || typeof version !== 'string') return null
  return { procedure, scope, version }
}

/** Reads one procedure document into a definition; malformed declarations become diagnostics. */
function readProcedureDoc(
  path: string,
  name: string,
  scope: string,
  docPath: string,
  diagnostics: ProcedureDiagnostic[],
): ProcedureDef {
  const frontmatter = (parseFrontmatter(readFileSync(path, 'utf-8')) ?? {}) as unknown as Record<string, unknown>
  const id = procedureIdOf(name)
  const invalid = (code: 'INVALID_SLOT_DECL' | 'INVALID_FORK_RECORD', detail: string) =>
    diagnostics.push({ code, severity: 'error', procedure: id, scope, detail })

  const slots: SlotDecl[] = []
  const declared = frontmatter['slots']
  if (declared !== undefined) {
    if (!Array.isArray(declared)) {
      invalid('INVALID_SLOT_DECL', `"slots" of procedure "${id}" in ${docPath} must be a list of { name, kind, required }.`)
    } else {
      for (const raw of declared) {
        const slot = slotOf(raw)
        if (slot) slots.push(slot)
        else invalid('INVALID_SLOT_DECL', `Procedure "${id}" in ${docPath} declares a slot that is not { name, kind: value | procedure, required }: ${JSON.stringify(raw)}.`)
      }
    }
  }

  const def: ProcedureDef = {
    id,
    scope,
    doc: docPath,
    version: typeof frontmatter['knowledge_version'] === 'string' ? frontmatter['knowledge_version'] : null,
    slots,
  }
  if (frontmatter['fork_of'] !== undefined) {
    const fork = forkOf(frontmatter['fork_of'])
    if (fork) def.forkOf = fork
    else invalid('INVALID_FORK_RECORD', `"fork_of" of procedure "${id}" in ${docPath} must be { procedure, scope, version }: ${JSON.stringify(frontmatter['fork_of'])}.`)
  }
  return def
}

/**
 * Attaches the procedures of every scope of the chain to its node: the
 * `*_procedures_NN.md` documents under `<scope dir>/procedures/`, nothing else, so a
 * sibling's procedures are never visible. Slots (`slots:`) and the fork record
 * (`fork_of:`) are read from the document's frontmatter; a malformed one is reported
 * and left out. Nodes the chain does not own (appended by a consumer) are returned as
 * they are, and the floor is not loaded here.
 */
export function loadScopeProcedures(
  chain: ScopeChain,
  loaded: LoadedChain,
): { loaded: LoadedChain; diagnostics: ProcedureDiagnostic[] } {
  const diagnostics: ProcedureDiagnostic[] = []
  const nodes = loaded.nodes.map((node): ScopeNode => {
    const link = chain.links.find((l) => l.dir === node.id)
    if (!link) return node
    const dir = join(chain.root, link.dir, PROCEDURES_DIR)
    const procedures = procedureDocsOf(dir).map((name) =>
      readProcedureDoc(join(dir, name), name, node.id, [link.dir, PROCEDURES_DIR, name].filter(Boolean).join('/'), diagnostics),
    )
    return procedures.length > 0 ? { ...node, procedures } : node
  })
  return { loaded: { ...loaded, nodes }, diagnostics }
}
