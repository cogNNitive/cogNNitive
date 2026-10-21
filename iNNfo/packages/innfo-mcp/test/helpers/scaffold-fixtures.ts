/**
 * The scaffold stubs and golden documents shared with the nn-core suites. They are
 * plain files in nn-core (`tests/fixtures/scaffold`), read here by path so both
 * packages pin the very same bytes.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const dir = join(import.meta.dirname!, '..', '..', '..', 'nn-core', 'tests', 'fixtures', 'scaffold')
const read = (file: string): string => readFileSync(join(dir, file), 'utf-8')

export const SPEC_L1 = read('l1.stub.md')
export const SPEC_L0 = read('l0.stub.md')
export const BUSINESS_STUB = read('business.stub.md')
export const REFERENCE_STUB = read('reference.stub.md')
export const BLANK_SPEC = readFileSync(
  join(dir, '..', '..', '..', '..', '..', 'specs', 'bluepriNNts', 'blank', 'spec_NN.md'),
  'utf-8',
)

export const BUSINESS_URL = 'https://example.com/business_V_0-2-0_NN.md'
export const REFERENCE_URL = 'https://example.com/reftpl_V_0-1-0_NN.md'
export const BLANK_URL =
  'https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/blank/spec_NN.md'

export const golden = (name: 'business' | 'businessV999' | 'ref' | 'blank'): string => read(`${name}.golden.md`)
