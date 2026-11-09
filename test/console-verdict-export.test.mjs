/**
 * test/console-verdict-export.test.mjs
 *
 * A verdict draft exports as a `review_gate` change with human console provenance
 * (capability innfo-console-feedback, console-changes-direct-write; design D-C4;
 * task 4a.7). `preview` carries the scene slice hash, `budget` the episode plan hash.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import { nnConsole } from './helpers/console-boot.mjs'

const HASH = 'a'.repeat(64)
const SLICE = 'b'.repeat(64)

function stateWith(drafts, meta = {}) {
  return {
    modelTitle: 'Probe',
    modelId: 's/e',
    meta: { changesBlueprintVersion: 'V_0-8-1', ...meta },
    store: { drafts: () => drafts },
  }
}

const exportText = (drafts, reviewer = 'Ana', meta) => {
  const res = nnConsole.composeChangesetExport(stateWith(drafts, meta), reviewer)
  assert.equal(res.ok, true, res.errors && res.errors.join('; '))
  return res.text
}

test('a verdict exports as review_gate with human console provenance', () => {
  const draft = nnConsole.verdictDraft({
    gate: 'script',
    target: 's/e@one',
    verdict: 'approved',
    reviewed_hash: HASH,
  })
  const text = exportText([draft])
  assert.match(text, /^author_kind: human$/m)
  assert.match(text, /^origin: console$/m)
  assert.match(text, /^reviewer: "Ana"$/m)
  assert.match(text, /^op:: review_gate$/m)
  assert.match(text, /^target:: s\/e@one$/m)
  assert.match(text, /^gate:: script$/m)
  assert.match(text, /^verdict:: approved$/m)
  assert.match(text, new RegExp('^reviewed_hash:: ' + HASH + '$', 'm'))
  assert.doesNotMatch(text, /^evidence::/m, 'a verdict carries no evidence citation')
});

test('preview carries the scene slice hash as plan_hash', () => {
  const draft = nnConsole.verdictDraft({
    gate: 'preview',
    target: 's/e@one',
    verdict: 'approved',
    reviewed_hash: HASH,
    plan_hash: SLICE,
  })
  const text = exportText([draft])
  assert.match(text, new RegExp('^plan_hash:: ' + SLICE + '$', 'm'))
});

test('budget carries the episode plan hash as both hashes', () => {
  const draft = nnConsole.verdictDraft({
    gate: 'budget',
    target: 's/e',
    verdict: 'approved',
    reviewed_hash: HASH,
  })
  const text = exportText([draft])
  assert.match(text, new RegExp('^reviewed_hash:: ' + HASH + '$', 'm'))
  assert.match(text, new RegExp('^plan_hash:: ' + HASH + '$', 'm'))
});

test('a preview verdict without a slice hash is refused before writing', () => {
  const draft = nnConsole.verdictDraft({
    gate: 'preview',
    target: 's/e@one',
    verdict: 'approved',
    reviewed_hash: HASH,
  })
  const res = nnConsole.composeChangesetExport(stateWith([draft]), 'Ana')
  assert.equal(res.ok, false)
  assert.match(res.errors.join(' '), /plan_hash/)
});

test('the default pseudonym is refused and a named reviewer is required', () => {
  const draft = nnConsole.verdictDraft({ gate: 'script', target: 's/e@one', reviewed_hash: HASH })
  const res = nnConsole.composeChangesetExport(stateWith([draft]), '')
  assert.equal(res.ok, false)
  assert.match(res.errors.join(' '), /Reviewer identifier is required/)
});

test('a non-verdict export carries no provenance markers', () => {
  const text = exportText([{ id: 'c-01', element_slug: 'one', field: 'title', proposed: 'X' }])
  assert.doesNotMatch(text, /^author_kind:/m)
  assert.doesNotMatch(text, /^origin:/m)
  assert.match(text, /^op:: update_field$/m)
});
