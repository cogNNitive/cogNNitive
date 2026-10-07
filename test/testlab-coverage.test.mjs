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
    for (const t of ['string', 'markdown_inline', 'markdown_file', 'image', 'file', 'video', 'audio', 'reference', 'select']) {
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
    assert.match(model, /NN Concept 1-Concept 2 Matrix/)
    assert.match(model, /Element 1A <> Element 2A: relevant/)
  })
})
