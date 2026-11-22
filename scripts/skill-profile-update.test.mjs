import { test } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

/**
 * #778: an agent asked to update cogNNitive must find the profile-update path
 * from a model-invocable skill. `nn-skills-lifecycle` documents the flow but is
 * user-invoked only, so `nn` and `nn-preflight` carry the pointer.
 */

const ROOT = path.resolve(import.meta.dirname, '..')
const MANIFEST = 'https://cognnitive.com/use/manifest.md'

function frontmatter(skill) {
  const text = fs.readFileSync(path.join(ROOT, 'skills', skill, 'SKILL.md'), 'utf8')
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text)
  assert.ok(match, `${skill}/SKILL.md has a frontmatter block`)
  const field = (key) => {
    const m = new RegExp(`^${key}:\\s*(.*)$`, 'm').exec(match[1])
    return m ? m[1].trim() : null
  }
  return { field, body: match[2] }
}

test('nn names updating the cogNNitive installation as a trigger', () => {
  const { field } = frontmatter('nn')
  assert.notStrictEqual(field('disable-model-invocation'), 'true', 'nn stays model-invocable')
  assert.match(field('description'), /update cognnitive/i)
  assert.match(field('description'), /install cognnitive/i)
})

test('nn-preflight points a profile update at the manifest', () => {
  const { field } = frontmatter('nn-preflight')
  assert.notStrictEqual(
    field('disable-model-invocation'),
    'true',
    'nn-preflight stays model-invocable',
  )
  assert.ok(field('description').includes(MANIFEST), 'description names the manifest URL')
})

test('nn body holds the profile-update steps: status first, bootstrap on consent', () => {
  const { body } = frontmatter('nn')
  const heading = body.indexOf('## Updating the cogNNitive installation')
  assert.ok(heading >= 0, 'nn has the installation-update section')
  const section = body.slice(heading, body.indexOf('\n## ', heading + 1))
  assert.ok(section.includes(MANIFEST), 'the section names the manifest as source of truth')
  const status = section.indexOf('skills-manager.js status')
  const bootstrap = section.indexOf('skills-manager.js bootstrap --yes')
  assert.ok(status >= 0, 'the section names the read-only status step')
  assert.ok(bootstrap > status, 'bootstrap comes after status')
  assert.match(section, /consent/i, 'bootstrap runs only with consent')
  assert.match(
    section,
    /git clone[^.]*not the installation/i,
    'a git clone is not the installation',
  )
})

test('nn-skills-lifecycle stays user-invoked only', () => {
  const { field } = frontmatter('nn-skills-lifecycle')
  assert.strictEqual(field('disable-model-invocation'), 'true')
})
