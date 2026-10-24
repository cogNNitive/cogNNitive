import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const lab = join(here, 'fixtures', 'testlab')
const read = (p) => readFileSync(join(lab, p), 'utf8')

describe('TestLab coverage domain fixtures', () => {
  it('ships the blueprint, model, sources, and artifacts', () => {
    for (const f of [
      'domaiNN_NN.md',
      'specs/TestLab_V_0-1-0_spec_NN.md',
      'kNNowledge/TestLab_coverage_TestLab_NN.md',
      'kNNowledge/TestLab_procedures_TestLab_procedures_NN.md',
      'changes/testlab_reviewer_20261010T120000Z_changes_NN.md',
      'kNNowledge/TestLab_intake_TestLab_NN.md',
      'changes/testlab_admin_intake_changes_NN.md',
      'changes/testlab_reviewer_intake_changes_NN.md',
      'domaiNN_console.html',
      'sources/import/field-notes.md',
      'sources/import/dataset.csv',
      'sources/import/dataset.json',
      'sources/import/manual.txt',
      'sources/import/report.pdf_sidecar_NN.md',
      'sources/import/photo.png_sidecar_NN.md',
      'sources/import/demo.mp4_sidecar_NN.md',
      'sources/import/interview.mp3_sidecar_NN.md',
      'artifacts/testlab-report.md',
      'artifacts/testlab-review.json',
      'README.md',
    ]) {
      assert.equal(existsSync(join(lab, f)), true, `missing ${f}`)
    }
  })

  it('model covers Concept 1 (1A/1B/1C), Concept 2 (2A/2B), and every named probe', () => {
    const model = read('kNNowledge/TestLab_coverage_TestLab_NN.md')
    for (const name of [
      'Concept 1: Element 1A',
      'Concept 1: Element 1B',
      'Concept 1: Element 1C',
      'Concept 2: Element 2A',
      'Concept 2: Element 2B',
      'Image traceability probe',
      'Multi-node traceability probe',
      'Review traceability probe',
      'Downloaded video probe',
      'Transcribed audio probe',
      'Transcribed PDF probe',
      'Very long description probe',
      'File field probe',
      'Artifact as source probe',
      'Broken reference probe',
      'Sourceless probe',
    ]) {
      assert.match(model, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `missing ${name}`)
    }
  })

  it('exercises every field type declared by the blueprint', () => {
    const spec = read('specs/TestLab_V_0-1-0_spec_NN.md')
    for (const t of ['string', 'number', 'boolean', 'select', 'reference', 'image', 'file', 'video', 'audio', 'url', 'markdown_inline', 'markdown_file', 'knowledge', 'address', 'citation']) {
      assert.match(spec, new RegExp(`type:: ${t}`), `blueprint missing type ${t}`)
    }
    const model = read('kNNowledge/TestLab_coverage_TestLab_NN.md')
    for (const field of ['long_description::', 'manual::', 'photo::', 'attachment::', 'sibling::', 'owner::', 'status::']) {
      assert.match(model, new RegExp(field.replace(/:+$/, ':+')), `model never uses field ${field}`)
    }
  })

  it('cites sidecars for binaries, never the binaries themselves', () => {
    const model = read('kNNowledge/TestLab_coverage_TestLab_NN.md')
    assert.match(model, /report\.pdf_sidecar_NN\.md@## Findings/)
    assert.match(model, /photo\.png_sidecar_NN\.md@## Caption/)
    assert.match(model, /demo\.mp4_sidecar_NN\.md@## Transcript/)
    assert.match(model, /interview\.mp3_sidecar_NN\.md@## Transcript/)
    const citations = model.match(/sources:: \[[^\]]+\]/g) ?? []
    for (const c of citations) {
      assert.doesNotMatch(c, /report\.pdf@/, `binary cited directly: ${c}`)
      assert.doesNotMatch(c, /photo\.png@/, `binary cited directly: ${c}`)
      assert.doesNotMatch(c, /demo\.mp4@/, `binary cited directly: ${c}`)
      assert.doesNotMatch(c, /interview\.mp3@/, `binary cited directly: ${c}`)
    }
  })

  it('covers CSV-row, JSON-pointer, and artifact second-hop citations', () => {
    const model = read('kNNowledge/TestLab_coverage_TestLab_NN.md')
    assert.match(model, /dataset\.csv@m-001/)
    assert.match(model, /dataset\.json@\/items\/0\/name/)
    assert.match(model, /artifacts\/testlab-report\.md@## Result/)
  })

  it('very-long-description probe exceeds 500 chars and file probe uses the file type', () => {
    const model = read('kNNowledge/TestLab_coverage_TestLab_NN.md')
    const longDesc = model.match(/Very long description probe[\s\S]*?long_description:: ([\s\S]*?)\nphoto::/)?.[1] ?? ''
    assert.ok(longDesc.length > 500, `long description only ${longDesc.length} chars`)
    assert.match(model, /attachment:: test\/fixtures\/testlab\/sources\/import\/manual\.txt/)
  })

  it('review fixture targets Element 1B photo field as fb-001', () => {
    const review = JSON.parse(read('artifacts/testlab-review.json'))
    assert.equal(review.items[0].id, 'fb-001')
    assert.equal(review.items[0].target.field, 'photo')
    assert.match(review.items[0].target.element, /Element 1B/)
  })

  it('declares the Concept 1 x Concept 2 matrix with crossings', () => {
    const model = read('kNNowledge/TestLab_coverage_TestLab_NN.md')
    assert.match(model, /NN matrices: Concept 1-Concept 2 Matrix/)
    assert.match(model, /\| Element 1A \| relevant \|/)
  })

  it('ships a domain console with both models, the Procedure view, and Element 1B lineage', () => {
    const console = read('domaiNN_console.html')
    // Both models are aggregated, including the procedures model.
    assert.match(console, /TestLab_coverage_TestLab_NN\.md/)
    assert.match(console, /TestLab_procedures_TestLab_procedures_NN\.md/)
    // The procedures blueprint's Procedure view is inlined and fed the guided steps.
    assert.match(console, /data-innfo-view="procedure"/)
    assert.match(console, /TestLab Guided Verification/)
    // The seeded changeset is embedded as Element 1B's changeset lineage.
    assert.match(console, /concept-1-element-1b/)
    assert.match(console, /fb-001/)
  })

  it('narrates the admin -> reviewer intake chain with every modification case', () => {
    const model = read('kNNowledge/TestLab_intake_TestLab_NN.md')
    const FIELDS = ['string_field', 'number_field', 'boolean_field', 'select_field', 'reference_field', 'image_field', 'file_field', 'video_field', 'audio_field', 'url_field', 'markdown_inline_field', 'markdown_file_field', 'knowledge_field', 'address_field', 'citation_field']
    for (const f of FIELDS) assert.match(model, new RegExp(`${f}::`), `intake model missing ${f}`)
    // The reviewer renamed the element.
    assert.match(model, /Modification cases \(reviewed\)/)

    const admin = read('changes/testlab_admin_intake_changes_NN.md')
    const reviewer = read('changes/testlab_reviewer_intake_changes_NN.md')
    // The admin created the model from the PDF, CSV and JSON sources.
    assert.match(admin, /op:: add_model/)
    for (const src of ['report\\.pdf_sidecar_NN\\.md@## Findings', 'dataset\\.csv@m-001', 'dataset\\.json@/items/0/name']) {
      assert.match(admin, new RegExp(src), `admin chain missing evidence ${src}`)
    }
    // The reviewer covers rename, description, one field of each type, and a matrix cell.
    assert.match(reviewer, /op:: rename_element/)
    assert.match(reviewer, /op:: update_matrix_cell/)
    for (const f of FIELDS) assert.match(reviewer, new RegExp(`&${f}\\b`), `reviewer never edits ${f}`)

    // Every change in both chain sets attributes its mandatory evidence.
    for (const cs of [admin, reviewer]) {
      const changes = (cs.match(/## NN Change:/g) ?? []).length
      const evidence = (cs.match(/^evidence:: /gm) ?? []).length
      assert.equal(evidence, changes, 'each change carries evidence')
    }
  })
})
