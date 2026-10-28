---
level: 3
parent_spec:
  name: "TestLab"
  url: "specs/TestLab_V_0-1-0_spec_NN.md"
knowledge_version: "V_0-1-1"
title: "TestLab Coverage Model"
---

# NN Concept 1

## NN Concept 1: Element 1A
slug:: element-1a
sources:: [sources/import/field-notes.md@## Findings]
summary:: Intake tray baseline element.
long_description:: Baseline element with a short description. It cites the field notes findings section.
manual:: test/fixtures/testlab/sources/import/manual.txt
sibling:: [[Element 2A]]
status:: draft
Element 1A is the intake baseline. It is cited by the weekly report and referenced back from Concept 2.

## NN Concept 1: Element 1B
slug:: element-1b
sources:: [sources/import/field-notes.md@## Key Points, sources/import/dataset.csv@m-001]
summary:: Photo log element with image and file fields.
long_description:: Element 1B carries the image and file stress fields. The photo is the most trusted record on the bench and the handover note decides the next shift, so this element is the one the review pass targets first.
photo:: test/fixtures/testlab/sources/import/photo.png
photo_metadata:: {"title": "Three-tray workbench", "author": "TestLab crew", "source": "field photo 2026-10-07"}
attachment:: test/fixtures/testlab/sources/import/manual.txt
sibling:: [[Element 2A]]
status:: reviewed
Element 1B is the review target. See the console feedback item fb-001 in artifacts/testlab-review.json.

## NN Concept 1: Element 1C (test)
slug:: element-1c
sources:: [sources/import/dataset.json@/items/0/name]
summary:: Multi-node traceability source element.
long_description:: Element 1C exists so multi-node traceability has three legs: 1A cites markdown, 1B cites CSV plus image, 1C cites a JSON pointer. A traversal from any Concept 2 owner back through siblings must touch all three.
sibling:: [[Element 2B]]
status:: published
Element 1C closes the Concept 1 triangle.

# NN Concept 2

## NN Concept 2: Element 2A
slug:: element-2a
sources:: [sources/import/field-notes.md@## Findings]
summary:: Shift owner element.
attachment:: test/fixtures/testlab/sources/import/manual.txt
owner:: [[Element 1A]]
Element 2A owns the intake baseline and is the first crossing of the Concept 1-Concept 2 matrix.

## NN Concept 2: Element 2B
slug:: element-2b
sources:: [sources/import/dataset.csv@m-002]
summary:: Handover owner element.
attachment:: test/fixtures/testlab/sources/import/manual.txt
owner:: [[Element 1C (test)]]
Element 2B owns the multi-node element and is the second crossing of the Concept 1-Concept 2 matrix.

# NN Edge Cases

## NN Edge Cases: Image traceability probe
slug:: image-traceability-probe
sources:: [sources/import/photo.png_sidecar_NN.md@## Caption]
summary:: Probe that image traceability resolves through the sidecar.
long_description:: This probe cites the photo sidecar caption, never the binary. A resolver that accepts a direct photo.png citation without the sidecar is wrong.
photo:: test/fixtures/testlab/sources/import/photo.png
photo_metadata:: {"title": "Three-tray workbench", "author": "TestLab crew", "source": "field photo 2026-10-07"}
attachment:: test/fixtures/testlab/sources/import/manual.txt
Image traceability passes only via the sidecar path.

## NN Edge Cases: Multi-node traceability probe
slug:: multi-node-traceability-probe
sources:: [sources/import/field-notes.md@## Findings, sources/import/dataset.csv@m-001, sources/import/dataset.json@/items/0/name]
summary:: Probe that three source families resolve on one element.
long_description:: Markdown plus CSV row plus JSON pointer on a single element. If any one of the three fails to resolve, the probe fails as a whole.
Multi-node traceability converges here.

## NN Edge Cases: Review traceability probe
slug:: review-traceability-probe
sources:: [artifacts/testlab-report.md@## Result]
summary:: Probe that an artifact works as a second-hop source.
long_description:: This probe cites the generated weekly report result section. The report itself derives from Concept 1 elements, so the lineage is artifact to model to source. Dropping the upstream section must break this probe loudly.
Review traceability closes the artifact loop.

## NN Edge Cases: Downloaded video probe
slug:: downloaded-video-probe
sources:: [sources/import/demo.mp4_sidecar_NN.md@## Transcript]
summary:: Probe that a downloaded video resolves through its transcript sidecar.
long_description:: The video binary is never cited. The transcript section of the sidecar is the citable unit. Players render demo_video below while the citation points at the transcript.
Video probe covers the video field path end to end.

## NN Edge Cases: Transcribed audio probe
slug:: transcribed-audio-probe
sources:: [sources/import/interview.mp3_sidecar_NN.md@## Transcript]
summary:: Probe that downloaded audio resolves through its transcription sidecar.
long_description:: The audio binary is never cited. The transcript section carries the operator quote about the manual being ignored and the photo log being trusted.
Audio probe covers the audio field path end to end.

## NN Edge Cases: Transcribed PDF probe
slug:: transcribed-pdf-probe
sources:: [sources/import/report.pdf_sidecar_NN.md@## Findings]
summary:: Probe that a downloaded PDF resolves through its normalized sidecar.
long_description:: The PDF binary is never cited because binaries are not citation targets. The sidecar findings section holds the normalized markdown and is the only valid pointer.
PDF probe covers the binary-to-sidecar rule.

## NN Edge Cases: Very long description probe
slug:: very-long-description-probe
sources:: [sources/import/field-notes.md@## Key Points]
summary:: Probe with a very long inline description field.
long_description:: The handover note is the only text that matters on this bench, and this paragraph exists to prove that a very long inline description renders, validates, exports to console, and round-trips without truncation or line-joining damage. Intake starts the flow: the form is filled before any equipment is touched, because an undocumented item effectively does not exist once the shift gets busy. The active phase lives in tray two, where exactly one photo per step is taken with no exceptions, since the photo log is the most trusted record and the only evidence the next shift will actually believe. Handover closes the loop in tray three: the note names what is done, what is blocked, and what the next hands must touch first, and the wall clock minute is written down so lateness is visible instead of arguable. Volume can grow fivefold in a quarter and quality still holds as long as these three habits hold with it, because rework disappears when the trays, the photos, and the note agree with each other. That is the whole workflow, repeated here deliberately at length so renderers, validators, exporters, and tests all meet a description field that cannot be skimmed in one glance.
photo:: test/fixtures/testlab/sources/import/photo.png
attachment:: test/fixtures/testlab/sources/import/manual.txt
Length is the feature being tested here.

## NN Edge Cases: File field probe
slug:: file-field-probe
sources:: [sources/import/field-notes.md@## Key Points]
summary:: Probe for the generic file field type.
long_description:: The attachment field points at the plain-text manual stand-in. It exercises the file type path without involving image, video, or audio rendering.
attachment:: test/fixtures/testlab/sources/import/manual.txt
File field probe stays deliberately plain.

## NN Edge Cases: Artifact as source probe
slug:: artifact-as-source-probe
sources:: [artifacts/testlab-report.md@## Result]
summary:: Probe for the modify-and-reuse artifact cycle.
long_description:: Edit artifacts/testlab-report.md, keep the Result heading stable, and this probe keeps passing. Rename or delete that heading and this probe must fail, proving the artifact is a live source and not a dead copy.
The artifact is a source, not just an output.

## NN Edge Cases: Broken reference probe
slug:: broken-reference-probe
sources:: [sources/import/field-notes.md@## Findings]
summary:: Probe with a deliberately dangling reference (expected validation warning).
long_description:: This probe points at an element that does not exist. Validators must flag it while every other element stays green, so tests can assert the broken case in isolation.
Broken by design, quarantined by name.

## NN Edge Cases: Sourceless probe
slug:: sourceless-probe
summary:: Probe with no sources field on purpose.
long_description:: No sources property here at all. Omission is legal: the element simply has no citation edges, and lineage queries must return empty instead of erroring.
Absence of sources is valid.

# NN matrices: Concept 1-Concept 2 Matrix
| Concept 1 \ Concept 2 | Element 2A | Element 2B |
| :--- | :---: | :---: |
| Element 1A | relevant | - |
| Element 1B | archived | - |
| Element 1C (test) | - | relevant |
