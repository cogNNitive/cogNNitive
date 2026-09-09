/**
 * Caller-side differential verify prompts (llm-context-efficiency).
 *
 * Shapes the `verify` prompt over the existing `validate_model`
 * new-error-only output (validator-robustness `baseline_path` contract):
 * the prompt carries `{ exit, new_errors, verdict }` plus a `log_path`
 * reference only. Full logs and rendered artifacts stay on disk and are
 * never embedded — this builder never even receives log content, so
 * smuggling is impossible by construction. The validator output shape is
 * unchanged (zero validator diff).
 */

import type { ValidationError } from '@cognnitive/innfo-core'

/** Outcome data a `verify` prompt may carry. */
export interface VerifyPromptInput {
  /** Process exit status of the validation run. */
  exit: number
  /** Errors new against the baseline (already filtered by `validate_model`). */
  newErrors: ValidationError[]
  /** Human-readable outcome (`clean` when nothing is new). */
  verdict: string
  /** Filesystem path of the full log; referenced, never embedded. */
  logPath?: string
}

/** Differential `verify` prompt: outcome data plus a log path reference. */
export interface VerifyPrompt {
  exit: number
  new_errors: ValidationError[]
  verdict: string
  log_path?: string
}

/**
 * Shape a differential `verify` prompt (pure): exit status plus new errors
 * only, with the full log carried as a path reference.
 */
export function buildVerifyPrompt(input: VerifyPromptInput): VerifyPrompt {
  return {
    exit: input.exit,
    new_errors: input.newErrors,
    verdict: input.verdict,
    ...(input.logPath !== undefined ? { log_path: input.logPath } : {}),
  }
}

/**
 * Shape a `verify` prompt directly from a `validate_model`-style result
 * whose `errors` are already new-vs-baseline only. A valid run carries the
 * clean verdict only; a failing run counts its new errors.
 */
export function buildVerifyPromptFromValidation(
  result: { valid: boolean; errors: ValidationError[] },
  opts: { exit: number; logPath?: string },
): VerifyPrompt {
  const verdict = result.valid
    ? 'clean'
    : result.errors.length === 1
      ? '1 new error'
      : `${result.errors.length} new errors`
  return buildVerifyPrompt({
    exit: opts.exit,
    newErrors: result.errors,
    verdict,
    ...(opts.logPath !== undefined ? { logPath: opts.logPath } : {}),
  })
}
