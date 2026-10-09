/**
 * Blockquote (>) overlay event parsing.
 * @spec-source: V_0-3-3 | role: quality_check
 */

import { describe, it, expect } from 'vitest'
import * as PeggyParser from './vus_parser.js'
import { lowerAst } from './lowering.js'

const script = (body: string) =>
  ['//ANYDEO_SPEC: V_0-3-3', '# Scenes', '@ Scene One', body, ''].join('\n')

describe('Blockquote overlay events', () => {
  it('parses each blockquote form into a typed overlay event with payload and options', () => {
    const ast = PeggyParser.parse(
      script(
        [
          '> quote: "Stay hungry"',
          '> lower-third: "Dr. Alice Smith" [subtitle="Quantum Researcher"]',
          '> broll: media/engine.png [source="NASA"] [duration=6] [fit=contain]',
        ].join('\n'),
      ),
    )
    const project = lowerAst(ast)
    const scene = project.sections[0].scenes[0] as any
    const events = scene.overlay_events

    expect(events).toHaveLength(3)
    expect(events.map((e: any) => e.type)).toEqual(['OverlayEvent', 'OverlayEvent', 'OverlayEvent'])
    expect(events.map((e: any) => e.kind)).toEqual(['quote', 'lower-third', 'broll'])
    expect(events[0].payload).toBe('Stay hungry')
    expect(events[1].payload).toBe('Dr. Alice Smith')
    expect(events[1].options).toMatchObject({ subtitle: 'Quantum Researcher' })
    expect(events[2].payload).toBe('media/engine.png')
    expect(events[2].options).toMatchObject({ source: 'NASA', duration: '6', fit: 'contain' })
  })

  it('keeps narration prose free of directive tokens', () => {
    const ast = PeggyParser.parse(
      script(
        [
          'Welcome to the show.',
          '> quote: "A quote"',
          'This is more narration.',
          '> lower-third: "Guest"',
          'Final narration line.',
        ].join('\n'),
      ),
    )
    const project = lowerAst(ast)
    const scene = project.sections[0].scenes[0] as any

    expect(scene.scene_content).toContain('Welcome to the show.')
    expect(scene.scene_content).toContain('This is more narration.')
    expect(scene.scene_content).toContain('Final narration line.')
    expect(scene.scene_content).not.toContain('>')
    expect(scene.scene_content).not.toContain('A quote')
    expect(scene.scene_content).not.toContain('Guest')
  })

  it('recognizes legacy inline HTML overlay comments without dropping them from scene content', () => {
    const ast = PeggyParser.parse(
      script(
        [
          'Narration before.',
          '<!-- overlay: kineticTitle { "heading": "Legacy" } -->',
          'Narration after.',
        ].join('\n'),
      ),
    )
    const project = lowerAst(ast)
    const scene = project.sections[0].scenes[0] as any

    expect(scene.scene_content).toContain('<!--')
    expect(scene.scene_content).toContain('overlay: kineticTitle')
    expect(scene.overlay_events || []).toHaveLength(0)
  })
})
