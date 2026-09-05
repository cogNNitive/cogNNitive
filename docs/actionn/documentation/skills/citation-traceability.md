# Citation & Epistemic Traceability Pipeline

**Ecosystem Component**: `actioNN/nn-trannsform` & `iNNfo`  
**Target Specifications**: W3C PROV-O, RO-Crate, APA 7th, CommonMark Footnotes  

---

## Overview

The cogNNitive Citation & Provenance pipeline ensures end-to-end mathematical and epistemic integrity across the transformation of unstructured inputs into domain models and deliverable artifacts.

## Key Features

1. **Clean Path Ergonomics**:
   - Level 3 models reference sources via `sources:: [report_source.md#heading-slug]` without verbose `sources/nn/` prefixes.
   - The runtime resolver automatically resolves bare filenames against the workspace source collection (`sources/nn/`).
2. **Transient Staging Buffer (`sources/staging/`)**:
   - Isolates raw OCR and Whisper text dumps from the model reasoning space.
   - Never exposed as valid citation targets.
3. **Multi-Modal Semantic Normalization**:
   - **SRT/VTT**: Subtitles are consolidated into coherent paragraphs with timestamp headings (`## NN Section: [00:01:30]`).
   - **CSV/XLSX**: Massive tabular rows are transformed into a Data Dictionary and Statistical Summary (`## NN Dataset Schema`), avoiding LLM context blowup.
   - **Chat Logs**: Grouped by discussion threads (`## NN Thread: [ts] Topic`).
4. **Progressive Disclosure Contract**:
   - **L1 Summary (`_summary.md`)**: Loaded by default (500–1,500 words) for broad reasoning.
   - **L2 Full Source (`_source.md`)**: Inspected on-demand only when verifying specific citation anchors.
5. **Primary vs. Secondary Citation Resolution**:
   - The `references:` block in frontmatter identifies citations within sources (e.g. Porter 1985 cited inside an executive report).
   - Prevents misattribution by producing accurate APA in-text secondary citations: *(Porter, 1985, as cited in Doe, 2026)*.
6. **Anti-Autophagy Safeguard**:
   - Re-ingested internal artifacts carry `is_synthetic: true` in frontmatter, preventing circular reasoning and synthetic data poisoning.
