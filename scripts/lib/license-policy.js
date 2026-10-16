'use strict'

/**
 * scripts/lib/license-policy.js
 *
 * Classifies npm license declarations (SPDX expressions) against an explicit
 * allow / review / deny policy. No dependencies: the SPDX grammar needed here is
 * small (identifiers, `+`, WITH, AND, OR, parentheses).
 *
 * Semantics of a compound expression:
 *   - `A OR B`  the licensee may pick either, so the BEST branch counts.
 *   - `A AND B` both apply, so the WORST branch counts. `MIT AND GPL-3.0` is
 *     therefore NOT permissive.
 * Severity order: allow < review < unknown < deny.
 */

/** @typedef {'allow' | 'review' | 'unknown' | 'deny'} Verdict */
/**
 * @typedef {object} Policy
 * @property {string[]} allow       Exact SPDX ids (case-insensitive).
 * @property {string[]} review      Exact ids or `PREFIX*` patterns that need a human decision.
 * @property {string[]} deny        Exact ids or `PREFIX*` patterns that must not ship.
 * @property {string[]} [allowedExceptions] SPDX exception ids that keep a license at its own verdict.
 */

const RANK = { allow: 0, review: 1, unknown: 2, deny: 3 }

/** @param {Verdict} a @param {Verdict} b @returns {Verdict} */
const worst = (a, b) => (RANK[a] >= RANK[b] ? a : b)
/** @param {Verdict} a @param {Verdict} b @returns {Verdict} */
const best = (a, b) => (RANK[a] <= RANK[b] ? a : b)

/**
 * Canonical form used for policy matching: lower case, no `+`, no `-only`/`-or-later`.
 * @param {string} id
 */
function normalizeId(id) {
  return id
    .trim()
    .toLowerCase()
    .replace(/\+$/, '')
    .replace(/-(only|or-later)$/, '')
}

/**
 * @param {string} id normalized id
 * @param {string[]} entries policy entries (exact ids or trailing-`*` prefixes)
 */
function matchesAny(id, entries) {
  return entries.some((entry) => {
    const e = entry.toLowerCase()
    return e.endsWith('*') ? id.startsWith(e.slice(0, -1)) : normalizeId(e) === id
  })
}

/**
 * Verdict of one license identifier. Deny wins over allow, allow over review.
 * @param {string} rawId
 * @param {Policy} policy
 * @returns {Verdict}
 */
function classifyId(rawId, policy) {
  const id = normalizeId(rawId)
  if (!id) return 'unknown'
  if (matchesAny(id, policy.deny)) return 'deny'
  if (matchesAny(id, policy.allow)) return 'allow'
  if (matchesAny(id, policy.review)) return 'review'
  return 'unknown'
}

/** @param {string} expression @returns {string[]} */
function tokenize(expression) {
  return expression.match(/\(|\)|[^\s()]+/g) || []
}

/**
 * Evaluates an SPDX license expression.
 * @param {string} expression
 * @param {Policy} policy
 * @returns {{ verdict: Verdict, ids: string[], error?: string }}
 */
function classifyExpression(expression, policy) {
  const tokens = tokenize(String(expression || ''))
  if (tokens.length === 0) return { verdict: 'unknown', ids: [], error: 'empty license expression' }
  const ids = []
  let pos = 0
  const isOp = (t, op) => t !== undefined && t.toUpperCase() === op

  function parseOr() {
    let result = parseAnd()
    while (isOp(tokens[pos], 'OR')) {
      pos += 1
      result = best(result, parseAnd())
    }
    return result
  }

  function parseAnd() {
    let result = parseAtom()
    while (isOp(tokens[pos], 'AND')) {
      pos += 1
      result = worst(result, parseAtom())
    }
    return result
  }

  function parseAtom() {
    const token = tokens[pos]
    if (token === undefined) throw new Error('unexpected end of expression')
    if (token === '(') {
      pos += 1
      const inner = parseOr()
      if (tokens[pos] !== ')') throw new Error('missing closing parenthesis')
      pos += 1
      return inner
    }
    if (token === ')' || isOp(token, 'AND') || isOp(token, 'OR') || isOp(token, 'WITH')) {
      throw new Error(`unexpected token "${token}"`)
    }
    pos += 1
    ids.push(token)
    let verdict = classifyId(token, policy)
    if (isOp(tokens[pos], 'WITH')) {
      const exception = tokens[pos + 1]
      if (exception === undefined) throw new Error('WITH needs an exception id')
      pos += 2
      const allowed = (policy.allowedExceptions || []).map((e) => e.toLowerCase())
      // An exception we have not vetted never makes a license look safer than "review".
      if (!allowed.includes(exception.toLowerCase())) verdict = worst(verdict, 'review')
    }
    return verdict
  }

  try {
    const verdict = parseOr()
    if (pos !== tokens.length) throw new Error(`unexpected token "${tokens[pos]}"`)
    return { verdict, ids }
  } catch (err) {
    return { verdict: 'unknown', ids, error: `cannot parse "${expression}": ${err.message}` }
  }
}

/**
 * Reads the declared license of a package.json as one SPDX-ish string, or null.
 * Handles `license: "MIT"`, `license: { type }` and the legacy `licenses: [...]`.
 * @param {Record<string, any>} pkg
 * @returns {string | null}
 */
function declaredLicense(pkg) {
  const one = (v) => (typeof v === 'string' ? v : v && typeof v.type === 'string' ? v.type : null)
  const single = one(pkg.license)
  if (single) return single
  if (Array.isArray(pkg.licenses)) {
    const types = pkg.licenses.map(one).filter(Boolean)
    if (types.length > 0) return types.length === 1 ? types[0] : `(${types.join(' OR ')})`
  }
  return null
}

module.exports = { classifyId, classifyExpression, declaredLicense, normalizeId, RANK }
