import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseModel, parseFrontmatter, validateModel } from '../src/index'
import {
  extractTemplateSchema,
  extractTemplateSchemaFromContent,
} from '../src/index'
import type { SpecDocument } from '../src/types'

const specsRoot = join(import.meta.dirname!, '..', '..', '..', 'specs')

function readSpec(pathSegments: string): string {
  return readFileSync(join(specsRoot, pathSegments), 'utf-8')
}

describe('Metaplantilla Nivel 1 (specs/)', () => {
  it('level-1 spec declares V_0-1-0 with defiNNe parent and meta-template title', () => {
    const content = readSpec('iNNfo_V_0-1-0_NN.md')
    const fm = parseFrontmatter(content)!
    expect(fm.spec_version).toBe('V_0-1-0')
    expect(fm.level).toBe(1)
    expect(fm.parent_spec!.name).toBe('defiNNe_V_0-1-0')
    expect(fm.title).toContain('Meta-template')
    expect(content).toContain('# NN Concept Definition')
    expect(content).toContain('## NN Concept Definition:')
  })

  it('level-1 spec documents the four root primitives', () => {
    const content = readSpec('iNNfo_V_0-1-0_NN.md')
    for (const primitive of [
      'Concept Definition',
      'Field Definition',
      'Matrix Definition',
      'Marker Definition',
    ]) {
      expect(content).toContain(`## ${primitive}`)
    }
    expect(content).toContain('key:: value')
    expect(content).toContain('## NN <Concept>: <Element>')
  })

  it('business template exposes its schema as body elements, not frontmatter blocks', () => {
    const content = readSpec('templates/business/business_V_0-1-0_NN.md')
    const fm = parseFrontmatter(content)!
    expect(fm.level).toBe(2)
    expect(fm.concepts).toBeUndefined()
    expect(fm.markers).toBeUndefined()
    expect(fm.matrices).toBeUndefined()

    const schema = extractTemplateSchemaFromContent(content)
    expect(schema.concepts.length).toBe(80)
    expect(schema.markers.length).toBe(5)
    expect(schema.matrices.length).toBe(13)

    const businessSummary = schema.concepts.find((c) => c.name === 'Business summary')!
    expect(businessSummary.type).toBe('text')
    expect(businessSummary.icon).toBe('file-text')

    const stakeholders = schema.concepts.find((c) => c.name === 'Stakeholders')!
    expect(stakeholders.type).toBe('weight')
    expect(stakeholders.fields!.map((f) => f.name)).toEqual(['relationship_model'])
    expect(stakeholders.fields![0].type).toBe('string')

    const offerings = schema.concepts.find((c) => c.name === 'Offerings')!
    const offeringFields = offerings.fields!.map((f) => f.name)
    expect(offeringFields).toEqual(['pricing_model', 'brochure_file', 'components_list'])
    expect(offerings.fields!.find((f) => f.name === 'brochure_file')!.type).toBe('file')
  })

  it('procedures template schema extracts concepts, fields, markers, matrices', () => {
    const content = readSpec('templates/procedures/procedures_V_0-1-0_NN.md')
    const schema = extractTemplateSchemaFromContent(content)
    expect(schema.concepts.map((c) => c.name)).toEqual(['Work', 'Artifact', 'Tools', 'Roles'])
    const work = schema.concepts.find((c) => c.name === 'Work')!
    expect(work.fields!.map((f) => f.name)).toEqual([
      'step_type',
      'parent',
      'next',
      'condition',
      'input',
      'output',
      'output_status',
      'tool',
    ])
    expect(work.fields!.find((f) => f.name === 'step_type')!.options).toEqual([
      'task',
      'decision',
      'event',
    ])
    expect(work.fields!.find((f) => f.name === 'input')!.target_concepts).toEqual(['Artifact'])
    expect(schema.markers.map((m) => m.name)).toEqual(['complexity'])
    expect(schema.matrices.map((m) => m.name)).toEqual([
      'work-roles matrix',
      'work-tools matrix',
      'work-artifacts matrix',
    ])
  })

  it('organization template schema extracts concepts, fields, markers, matrices', () => {
    const content = readSpec('templates/organization/organization_V_0-1-0_NN.md')
    const schema = extractTemplateSchemaFromContent(content)
    expect(schema.concepts.map((c) => c.name)).toEqual(['Organization', 'Roles', 'Position', 'Person'])
    const roles = schema.concepts.find((c) => c.name === 'Roles')!
    expect(roles.fields!.map((f) => f.name)).toEqual(['scope'])
    expect(schema.matrices.map((m) => m.name)).toEqual([
      'positions-roles matrix',
      'persons-positions matrix',
    ])
  })

  it('projects template schema extracts concepts, fields, markers, matrices', () => {
    const content = readSpec('templates/projects/projects_V_0-1-0_NN.md')
    const schema = extractTemplateSchemaFromContent(content)
    expect(schema.concepts.map((c) => c.name)).toEqual([
      'Project',
      'Milestone',
      'Deliverable',
      'Task',
      'Risk',
      'Roles',
    ])
    const task = schema.concepts.find((c) => c.name === 'Task')!
    expect(task.fields!.map((f) => f.name)).toEqual([
      'status',
      'priority',
      'depends_on',
      'duration',
      'start_date',
      'due_date',
      'milestone',
      'deliverable',
    ])
    expect(schema.markers.map((m) => m.name)).toEqual(['health'])
    expect(schema.matrices.map((m) => m.name)).toEqual([
      'task-roles matrix',
      'task-deliverables matrix',
      'risks-milestones matrix',
    ])
  })

  it('validates a unified-syntax model against the migrated procedures template', () => {
    const templateContent = readSpec('templates/procedures/procedures_V_0-1-0_NN.md')
    const templateDoc: SpecDocument = {
      name: 'procedures_V_0-3-0',
      level: 2,
      parentName: 'iNNfo_V_0-3-0',
      frontmatter: parseFrontmatter(templateContent)!,
      rawContent: templateContent,
    }

    const model = parseModel(
      `---
spec_version: "V_0-3-0"
level: 3
model_version: "V_1-0-0"
title: "Review Flow"
parent_spec:
  name: "procedures_V_0-3-0"
  url: "https://example.com/procedures_V_0-3-0_NN.md"
---

> [!NOTE]
> This is an **iNNfo document**.

# NN index

* [[Work]]
* [[Roles]]

# NN Work

## NN Work: Open PR
step_type:: task
Open a pull request for review.

# NN Roles

## NN Roles: Reviewer
Reviews the pull request.

# NN matrices: work-roles matrix
| Work \\ Roles | Reviewer |
| :--- | :---: |
| Open PR | Responsible |
`,
    )

    const result = validateModel(model, templateDoc, null)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('still parses the migrated templates with the unified parser', () => {
    for (const p of [
      'templates/business/business_V_0-1-0_NN.md',
      'templates/organization/organization_V_0-1-0_NN.md',
      'templates/procedures/procedures_V_0-1-0_NN.md',
      'templates/projects/projects_V_0-1-0_NN.md',
    ]) {
      const parsed = parseModel(readSpec(p))
      expect(parsed.elements.has('Concept Definition')).toBe(true)
      expect(parsed.elements.has('Field Definition')).toBe(true)
      expect(parsed.elements.has('Marker Definition')).toBe(true)
      expect(parsed.elements.has('Matrix Definition')).toBe(true)
    }
  })

  it('parseModel + extractTemplateSchema agree with extractTemplateSchemaFromContent', () => {
    const content = readSpec('templates/business/business_V_0-1-0_NN.md')
    const direct = extractTemplateSchema(parseModel(content))
    const fromContent = extractTemplateSchemaFromContent(content)
    expect(direct.concepts.length).toBe(fromContent.concepts.length)
    expect(direct.markers.length).toBe(fromContent.markers.length)
    expect(direct.matrices.length).toBe(fromContent.matrices.length)
  })

  it('migrated samples use the unified syntax with no legacy markers', () => {
    for (const p of [
      'templates/business/samples/Ghostbusters_V_0-1-0_business_NN.md',
      'templates/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md',
      'templates/procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md',
      'templates/projects/samples/Ghostbusters_V_0-2-0_projects_NN.md',
    ]) {
      const content = readSpec(p)
      const body = content.replace(/^---[\s\S]*?---\n/, '')
      expect(body).not.toMatch(/# _NN/)
      expect(body).not.toMatch(/[*-]\s+_NN/)
      expect(body).not.toMatch(/```yaml/)
      const parsed = parseModel(content)
      expect(parsed.elements.size).toBeGreaterThan(0)
    }
  })

  it('parses the migrated Ghostbusters sample with fields and matrices', () => {
    const content = readSpec('templates/business/samples/Ghostbusters_V_0-1-0_business_NN.md')
    const parsed = parseModel(content)
    expect(parsed.elements.has('Stakeholders')).toBe(true)
    expect(parsed.elements.get('Stakeholders')!.length).toBeGreaterThan(5)
    expect(parsed.rawSections!['Business summary']).toContain('Ghostbusters is a professional')
    expect(parsed.matrices.length).toBeGreaterThan(10)
    expect(parsed.nodeMarkers['Paranormal Infestation']).toBeDefined()
  })

  it('parses the Ghostbusters procedures sample with key:: value properties', () => {
    const content = readSpec('templates/procedures/samples/Ghostbusters_V_0-2-0_procedures_NN.md')
    const parsed = parseModel(content)
    const work = parsed.elements.get('Work')!
    const triage = work.find((e) => e.name === 'Emergency Call Triage')!
    expect(triage.fields['step_type']).toBe('event')
    expect(triage.fields['parent']).toBe('[[Standard Ghost Containment Protocol]]')
    expect(triage.fields['output']).toBe('[[Dispatch Ticket]]')
    const standard = work.find((e) => e.name === 'Standard Ghost Containment Protocol')!
    expect(standard.fields['next']).toBe('[[Subterranean Containment Grid Shutdown Recovery]]')
    expect(parsed.matrices.some((m) => m.name.toLowerCase() === 'work-roles matrix')).toBe(true)
  })

  it('parses the migrated Ghostbusters organization sample with scope properties', () => {
    const content = readSpec('templates/organization/samples/Ghostbusters_V_0-2-0_organization_NN.md')
    const parsed = parseModel(content)
    const roles = parsed.elements.get('Roles')!
    expect(roles).toHaveLength(5)
    expect(roles[0].fields['scope']).toBe('internal')
    expect(parsed.matrices.length).toBe(3)
  })

  it('parses the Ghostbusters projects sample with dependencies and RACI matrix', () => {
    const content = readSpec('templates/projects/samples/Ghostbusters_V_0-2-0_projects_NN.md')
    const parsed = parseModel(content)
    const tasks = parsed.elements.get('Task')!
    expect(tasks).toHaveLength(4)
    const laserTask = tasks.find((t) => t.name === 'Install Auxiliary Laser Matrix')!
    expect(laserTask.fields['depends_on']).toBe('[[Calibrate Particle Accelerators]]')
    expect(laserTask.fields['duration']).toBe('10d')
    expect(laserTask.fields['status']).toBe('in_progress')
    expect(parsed.matrices).toHaveLength(3)
  })
})
