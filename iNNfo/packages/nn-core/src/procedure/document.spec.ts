import { describe, expect, it } from 'vitest'
import { procedureDocumentDiagnostics } from './index.js'
import { parse } from './fixtures.js'

const doc = (body: string) =>
  parse(`---
level: 3
knowledge_version: "V_0-1-0"
title: "d"
---

${body}`)

describe('procedureDocumentDiagnostics', () => {
  it('accepts one Procedure header with every Work nested under it', () => {
    const d = procedureDocumentDiagnostics(
      doc(`# NN Procedure

## NN Procedure: Review a Draft
slug:: review-a-draft
summary:: Reviews one draft.

### NN Work: Draft
slug:: draft
next:: [[review]]

### NN Work: Review
slug:: review
`),
    )
    expect(d).toEqual([])
  })

  it('accepts a declared procedure: a header with no steps', () => {
    expect(
      procedureDocumentDiagnostics(doc(`# NN Procedure\n\n## NN Procedure: RFP\nslug:: rfp\n`)),
    ).toEqual([])
  })

  it('rejects a document with no Procedure header', () => {
    const d = procedureDocumentDiagnostics(doc(`# NN Work\n\n## NN Work: A\nslug:: a\n`))
    expect(d).toContainEqual(expect.objectContaining({ code: 'PROCEDURE_HEADER_COUNT' }))
  })

  it('rejects a document with two Procedure headers', () => {
    const d = procedureDocumentDiagnostics(
      doc(`# NN Procedure\n\n## NN Procedure: A\nslug:: a\n\n## NN Procedure: B\nslug:: b\n`),
    )
    expect(d).toContainEqual(
      expect.objectContaining({ code: 'PROCEDURE_HEADER_COUNT', severity: 'error' }),
    )
  })

  it('rejects a Work that is not nested under the Procedure header', () => {
    const d = procedureDocumentDiagnostics(
      doc(`# NN Procedure

## NN Procedure: P
slug:: p

# NN Work

## NN Work: Loose
slug:: loose
`),
    )
    expect(d).toContainEqual(
      expect.objectContaining({ code: 'WORK_NOT_UNDER_PROCEDURE', step: 'loose' }),
    )
  })
})
