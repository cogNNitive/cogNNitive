import { describe, it, expect } from 'vitest'
import { parsePlacement } from '../../src/schema/storage.js'

/** concept-storage-declaration: A distributed concept declares a placement rule (design A1, A2). */
describe('parsePlacement - placement grammar table', () => {
  const VALID: Array<[string, boolean, string[]]> = [
    ['series/{slug}/', false, ['literal:series', 'slug']],
    ['{container}/assets/{slug}/', true, ['container', 'literal:assets', 'slug']],
    ['proyectos/{slug}/models/', false, ['literal:proyectos', 'slug', 'literal:models']],
  ]

  it.each(VALID)('accepts %s', (template, hasContainer, shape) => {
    const parsed = parsePlacement(template, { hasContainer })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(
      parsed.segments.map((s) => (s.kind === 'literal' ? `literal:${s.value}` : s.kind)),
    ).toEqual(shape)
    expect(parsed.slugIndex).toBe(shape.indexOf('slug'))
  })

  const INVALID: Array<[string, string, boolean, RegExp]> = [
    ['no slug token', 'series/', false, /\{slug\}/],
    ['two slug tokens', 'series/{slug}/{slug}/', false, /exactly one/],
    ['container not first', 'series/{container}/{slug}/', true, /first segment/],
    ['container without container::', '{container}/{slug}/', false, /container::/],
    ['parent traversal', 'series/../{slug}/', false, /\.\./],
    ['dot-prefixed segment', '.hidden/{slug}/', false, /"\."/],
    ['reserved archive', 'archive/{slug}/', false, /archive/],
    ['reserved staging', 'staging/{slug}/', false, /staging/],
    ['reserved specs', 'specs/{slug}/', false, /specs/],
    ['reserved backups', 'backups/{slug}/', false, /backups/],
    ['root sources', 'sources/{slug}/', false, /sources/],
    ['kNNowledge literal', 'kNNowledge/{slug}/', false, /kNNowledge/],
    ['kNNowledge, case-folded', 'knowledge/{slug}/', false, /kNNowledge/],
    ['uppercase literal', 'Series/{slug}/', false, /kebab-case/],
    ['missing trailing slash', 'series/{slug}', false, /end with/],
    ['empty template', '', false, /empty/],
    ['absolute path', '/series/{slug}/', false, /relative/],
    ['backslash', 'series\\{slug}/', false, /POSIX/],
    ['empty segment', 'series//{slug}/', false, /empty segment/],
    ['unknown token', 'series/{series}/', false, /unknown token/],
    ['space in a literal', 'my series/{slug}/', false, /kebab-case/],
  ]

  it.each(INVALID)('rejects %s with PLACEMENT_INVALID', (_label, template, hasContainer, hint) => {
    const parsed = parsePlacement(template, { hasContainer })
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.code).toBe('PLACEMENT_INVALID')
    expect(parsed.message).toMatch(hint)
  })

  it('allows a reserved word as a non-root literal only where the design allows it (sources below a container)', () => {
    expect(parsePlacement('{container}/sources/{slug}/', { hasContainer: true }).ok).toBe(true)
  })
})
