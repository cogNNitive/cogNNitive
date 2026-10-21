/**
 * Exhaustiveness guard for `switch` dispatch over a discriminated union: after
 * every variant is handled the value narrows to `never`, so adding a variant
 * without handling it becomes a compile error at every dispatch site.
 */
export function assertNever(value: never, context = 'value'): never {
  throw new Error(`Unhandled ${context}: ${JSON.stringify(value)}`)
}
