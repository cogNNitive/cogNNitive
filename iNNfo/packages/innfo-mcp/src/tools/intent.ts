/**
 * Minimal intent router (llm-context-efficiency).
 *
 * The skill layer declares one optional `intent` per call (`coach`,
 * `surgical`, `verify`, or `match`); a manual `override_intent` always wins.
 * An undeclared or unrecognized intent is a no-op (`undefined`) preserving
 * current behavior — the router never throws and never breaks existing
 * calls. Budget/breadth order (broadest first): coach, surgical, match,
 * verify — a call spanning two intents declares the broader one.
 */

/** Intent classes a call may declare. Omit = current behavior (no-op). */
export const INTENTS = ['coach', 'surgical', 'verify', 'match'] as const

/** A declared intent class. */
export type Intent = (typeof INTENTS)[number]

/** Intent fields accepted alongside any MCP tool call (all optional). */
export interface IntentDeclaration {
  /** Declared intent; omit for current behavior. */
  intent?: unknown
  /** Manual override; always wins over `intent` when recognized. */
  override_intent?: unknown
}

/** Breadth rank: higher governs when a call spans two intents. */
const BREADTH: Record<Intent, number> = {
  coach: 4,
  surgical: 3,
  match: 2,
  verify: 1,
}

/**
 * Normalize a raw value to an `Intent` (case-insensitive, trimmed).
 * Returns `undefined` for anything unrecognized — a no-op, never an error.
 */
export function normalizeIntent(value: unknown): Intent | undefined {
  if (typeof value !== 'string') return undefined
  const normalized = value.trim().toLowerCase() as Intent
  return (INTENTS as readonly string[]).includes(normalized) ? normalized : undefined
}

/**
 * Resolve the effective intent: `override_intent` wins when recognized,
 * else the declared `intent`, else `undefined` (current behavior).
 */
export function resolveIntent(declaration: IntentDeclaration): Intent | undefined {
  return normalizeIntent(declaration.override_intent) ?? normalizeIntent(declaration.intent)
}

/**
 * Pick the broader of two intents for a call spanning both (pure).
 * Order: coach > surgical > match > verify.
 */
export function broaderIntentOf(a: Intent, b: Intent): Intent {
  return BREADTH[a] >= BREADTH[b] ? a : b
}
