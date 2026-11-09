import type { ChangeItem } from './types.js'

/**
 * Gate declarations are owned by the Level-2 bluepriNNt of the target model
 * (changeset-review-gate "Gates are declared by the bluepriNNt"). nn-core holds no
 * gate name: it only checks a change against the declaration it is handed.
 */

/** The target unit a declared gate accepts: a bare model id or an element address. */
export type GateTargetUnit = 'model' | 'element'

export const GATE_UNDECLARED = 'GATE_UNDECLARED'
export const GATE_TARGET_INVALID = 'GATE_TARGET_INVALID'

export interface GateDeclaration {
  gate: string
  unit: GateTargetUnit
}

function isGateUnit(value: unknown): value is GateTargetUnit {
  return value === 'model' || value === 'element'
}

/** The raw `gates` frontmatter map of a bluepriNNt, or an empty one. */
function declarationMap(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  return raw as Record<string, unknown>
}

/**
 * Normalizes a bluepriNNt `gates` frontmatter declaration
 * (`gates: { <gate>: model|element }`) into its usable entries. Entries with an
 * unknown unit are dropped here and reported by `gateDeclarationProblems`.
 */
export function parseGateDeclarations(raw: unknown): GateDeclaration[] {
  const out: GateDeclaration[] = []
  for (const [gate, unit] of Object.entries(declarationMap(raw))) {
    if (gate.trim() === '' || !isGateUnit(unit)) continue
    out.push({ gate, unit })
  }
  return out
}

/**
 * Problems of one `review_gate` change against the declaration of the target's
 * bluepriNNt, as coded human-readable messages naming the change id. An empty list
 * means the change is declared and aimed at an accepted target unit.
 *
 * `GATE_UNDECLARED`: the blueprint declares no such gate.
 * `GATE_TARGET_INVALID`: the gate exists but not for this target unit.
 */
export function gateDeclarationProblems(change: ChangeItem, rawDeclarations: unknown): string[] {
  if (change.op !== 'review_gate') return []
  const id = change.id
  const name = typeof change.gate === 'string' ? change.gate.trim() : ''
  const declarations = declarationMap(rawDeclarations)

  const declared = name !== '' && Object.prototype.hasOwnProperty.call(declarations, name)
  if (!declared) {
    return [
      `${GATE_UNDECLARED}: change "${id}": the bluepriNNt of "${change.target}" declares no gate "${name}"`,
    ]
  }

  const unit = declarations[name]
  if (!isGateUnit(unit)) {
    return [
      `${GATE_TARGET_INVALID}: change "${id}": gate "${name}" declares an unknown unit (expected "model" or "element")`,
    ]
  }

  const isElementTarget = change.target.includes('@')
  if (unit === 'element' && !isElementTarget) {
    return [
      `${GATE_TARGET_INVALID}: change "${id}": gate "${name}" accepts an element target (<model>@<element>), not the model "${change.target}"`,
    ]
  }
  if (unit === 'model' && isElementTarget) {
    return [
      `${GATE_TARGET_INVALID}: change "${id}": gate "${name}" accepts a model target, not the element address "${change.target}"`,
    ]
  }

  return []
}
