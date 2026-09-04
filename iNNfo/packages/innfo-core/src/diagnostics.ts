import type { ValidationError } from './types'

/**
 * Accumulates validation diagnostics and routes each one to the errors or the
 * warnings bucket by its `severity`. Replaces the
 * `;(d.severity === 'error' ? errors : warnings).push(d)` idiom that was
 * repeated across every validator and MCP tool.
 *
 * All mutating methods return `this` for chaining. `errors` / `warnings`
 * return the live internal arrays (not copies) so a caller can splice or
 * decorate in place when it has to; treat them as read-only otherwise.
 */
export class Diagnostics {
  private readonly _errors: ValidationError[] = []
  private readonly _warnings: ValidationError[] = []

  /** Add a fully-formed diagnostic, routed to errors/warnings by `severity`. */
  add(diag: ValidationError): this {
    if (diag.severity === 'error') this._errors.push(diag)
    else this._warnings.push(diag)
    return this
  }

  /** Add many diagnostics, each routed by its own `severity`. */
  addAll(diags: Iterable<ValidationError>): this {
    for (const d of diags) this.add(d)
    return this
  }

  /** Record an error at `path`. */
  error(path: string, message: string): this {
    this._errors.push({ path, message, severity: 'error' })
    return this
  }

  /** Record a warning at `path`. */
  warn(path: string, message: string): this {
    this._warnings.push({ path, message, severity: 'warning' })
    return this
  }

  /**
   * Force a diagnostic into the warnings bucket regardless of its `severity`.
   * For checks that are intentionally non-blocking (e.g. matrix label drift),
   * where the underlying diagnostic may still carry `severity: 'error'`.
   */
  addAsWarning(
    diag: Omit<ValidationError, 'severity'> & { severity?: ValidationError['severity'] },
  ): this {
    this._warnings.push({ path: diag.path, message: diag.message, severity: 'warning' })
    return this
  }

  /** Live internal errors array. Treat as read-only unless decorating in place. */
  get errors(): ValidationError[] {
    return this._errors
  }

  /** Live internal warnings array. Treat as read-only unless decorating in place. */
  get warnings(): ValidationError[] {
    return this._warnings
  }

  /** True when no errors have been recorded. */
  get valid(): boolean {
    return this._errors.length === 0
  }

  /** Snapshot as a plain `{ valid, errors, warnings }` result object. */
  result(): { valid: boolean; errors: ValidationError[]; warnings: ValidationError[] } {
    return { valid: this.valid, errors: this._errors, warnings: this._warnings }
  }
}
