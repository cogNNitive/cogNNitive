---
level: 3
parent_spec:
  name: "procedures_V_0-2-0"
  url: "https://raw.githubusercontent.com/cogNNitive/cogNNitive-web/main/iNNfo/specs/bluepriNNts/procedures/procedures_V_0-2-0_NN.md"
knowledge_version: "V_0-1-0"
title: "Multimodal Video Source Import & Processing Procedure"
---

>
> **Experimental External Ingestion**: Audio extraction, speech-to-text transcription, and keyframe slide OCR are external helper processes assisted by the AI agent or user environment. cogNNitive natively manages the resulting normalized Markdown and provenance tracing.

# NN index

* [[Work]]
* [[Artifact]]
* [[Tools]]
* [[Roles]]

# NN Work

## NN Work: Import and Process Multimodal Video
step_type:: task
parent:: -
next:: -
condition:: Video recordings or screencasts present in import folder
input:: @raw-video-recordings-directory
output:: @verified-target-domain-model
output_status:: verified
tool:: @ai-agent
scope:: internal
Ingest video sources, orchestrate audio extraction/ASR and keyframe slide OCR via external tooling, consolidate into multimodal Markdown under sources/nn/ with companion media linking, bind to domain model elements, and validate integrity.

## NN Work: Discover Raw Video Files
parent:: @import-and-process-multimodal-video
step_type:: task
next:: @verify-and-deduplicate-video-sources
condition:: Ingestion workflow triggered
input:: @raw-video-recordings-directory
output:: @unprocessed-video-list
output_status:: verified
tool:: @command-line-interface
scope:: internal
Scan sources/import/ or drop directories for video files (.mp4, .mkv, .webm, .mov) lacking transcription or visual summary.

## NN Work: Verify and Deduplicate Video Sources
parent:: @import-and-process-multimodal-video
step_type:: decision
next:: @extract-audio-and-key-visual-slides
condition:: Video list generated
input:: @unprocessed-video-list
output:: @verified-video-ingestion-queue
output_status:: verified
tool:: @command-line-interface
scope:: internal
Compute SHA-256 hashes for video files and verify against existing normalized sources in sources/nn/ to avoid duplicate compute.

## NN Work: Extract Audio and Key Visual Slides
parent:: @import-and-process-multimodal-video
step_type:: task
next:: @transcribe-speech-and-ocr-slides
condition:: Ingestion queue validated
input:: @verified-video-ingestion-queue
output:: @extracted-audio-and-keyframe-images
output_status:: verified
tool:: @media-processing-tool
scope:: external
Extract audio track to 16 kHz mono WAV and extract key visual slides or chapter scene changes using ffmpeg.

## NN Work: Transcribe Speech and OCR Slides
parent:: @import-and-process-multimodal-video
step_type:: task
next:: @stage-consolidated-multimodal-document
condition:: Audio and keyframes extracted
input:: @extracted-audio-and-keyframe-images
output:: @consolidated-transcript-and-visual-text
output_status:: verified
tool:: @multimodal-extraction-engine
scope:: external
Run speech-to-text on the audio track and OCR on extracted keyframes to generate aligned speech transcripts with embedded slide summaries.

## NN Work: Stage Consolidated Multimodal Document
parent:: @import-and-process-multimodal-video
step_type:: task
next:: @normalize-multimodal-source-with-media-link
condition:: Multimodal text synthesized
input:: @consolidated-transcript-and-visual-text
output:: @staged-multimodal-import-files
output_status:: verified
tool:: @file-editor
scope:: internal
Stage generated Markdown document in sources/import/ matching the base name of the source video for companion media pairing.

## NN Work: Normalize Multimodal Source with Media Link
parent:: @import-and-process-multimodal-video
step_type:: task
next:: @bind-video-source-to-target-entity
condition:: Multimodal document staged
input:: @staged-multimodal-import-files
output:: @normalized-markdown-sources
output_status:: verified
tool:: @nn-sources-scanner
scope:: internal
Run nn-sources scanner to produce sources/nn/ Markdown with media_file companion linking and provenance frontmatter.

## NN Work: Bind Video Source to Target Entity
parent:: @import-and-process-multimodal-video
step_type:: task
next:: @validate-target-model
condition:: Normalized source created
input:: @normalized-markdown-sources
output:: @updated-domain-model
output_status:: verified
tool:: @file-editor
scope:: internal
Update the sources:: field of the target Element (e.g. Procedures, Training, Documentation) in the active domain model.

## NN Work: Validate Target Model
parent:: @import-and-process-multimodal-video
step_type:: task
next:: -
condition:: Domain model updated
input:: @updated-domain-model
output:: @verified-target-domain-model
output_status:: verified
tool:: @nn-mcp
scope:: internal
Validate updated domain model via nn-mcp to ensure reference integrity.

# NN Tools

## NN Tools: AI Agent
scope:: internal
LLM agent orchestrating the multimodal video processing pipeline.

## NN Tools: Command Line Interface
scope:: internal
Terminal environment for directory inspection and hash calculations.

## NN Tools: Media Processing Tool
scope:: external
External ffmpeg utility for demuxing audio and extracting keyframes.

## NN Tools: Multimodal Extraction Engine
scope:: external
Speech-to-text (Whisper) and OCR / Vision tools for extracting transcripts and slide text.

## NN Tools: nn-sources Scanner
scope:: internal
Scanner script converting staged text to normalized Markdown with media linking.

## NN Tools: File Editor
scope:: internal
Tool for writing staged summaries and updating domain models.

## NN Tools: nn-mcp
scope:: internal
Deterministic validation tool for iNNfo models.

# NN Artifact

## NN Artifact: Raw Video Recordings Directory
type:: spec
format:: directory
Input directory containing video files (.mp4, .mkv, .mov).

## NN Artifact: Unprocessed Video List
type:: data
format:: json
List of discovered video recordings pending processing.

## NN Artifact: Verified Video Ingestion Queue
type:: data
format:: json
Deduplicated queue of video recordings.

## NN Artifact: Extracted Audio and Keyframe Images
type:: deliverable
format:: directory
Intermediate WAV audio files and PNG keyframe slides.

## NN Artifact: Consolidated Transcript and Visual Text
type:: deliverable
format:: markdown
Synthesized document combining timestamped speech and slide OCR content.

## NN Artifact: Staged Multimodal Import Files
type:: data
format:: directory
Files staged in sources/import/ ready for normalization.

## NN Artifact: Normalized Markdown Sources
type:: spec
format:: markdown
Traceable Markdown files in sources/nn/ with video media_file companion links.

## NN Artifact: Updated Domain Model
type:: spec
format:: markdown
Domain model file enriched with video source citations.

## NN Artifact: Verified Target Domain Model
type:: report
format:: status
Validation confirmation from nn-mcp.

# NN Roles

## NN Roles: iNNfo Agent
scope:: internal
AI agent executing multimodal procedural steps and updating models.

## NN Roles: Workspace Maintainer
scope:: external
Human maintainer reviewing synthesized video summaries and approving model updates.

# NN matrices: work-roles matrix

| Work \ Roles | iNNfo Agent | Workspace Maintainer |
| :--- | :---: | :---: |
| Import and Process Multimodal Video | Responsible | Accountable |
| Discover Raw Video Files | Responsible | Informed |
| Verify and Deduplicate Video Sources | Responsible | Informed |
| Extract Audio and Key Visual Slides | Responsible | Informed |
| Transcribe Speech and OCR Slides | Responsible | Informed |
| Stage Consolidated Multimodal Document | Responsible | Informed |
| Normalize Multimodal Source with Media Link | Responsible | Informed |
| Bind Video Source to Target Entity | Responsible | Accountable |
| Validate Target Model | Responsible | Informed |

# NN matrices: work-tools matrix

| Work \ Tools | AI Agent | Command Line Interface | Media Processing Tool | Multimodal Extraction Engine | nn-sources Scanner | File Editor | nn-mcp |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Import and Process Multimodal Video | Uses | - | - | - | - | - | - |
| Discover Raw Video Files | - | Uses | - | - | - | - | - |
| Verify and Deduplicate Video Sources | - | Uses | - | - | - | - | - |
| Extract Audio and Key Visual Slides | - | - | Uses | - | - | - | - |
| Transcribe Speech and OCR Slides | - | - | - | Uses | - | - | - |
| Stage Consolidated Multimodal Document | - | - | - | - | - | Uses | - |
| Normalize Multimodal Source with Media Link | - | - | - | - | Uses | - | - |
| Bind Video Source to Target Entity | - | - | - | - | - | Uses | - |
| Validate Target Model | - | - | - | - | - | - | Uses |

# NN matrices: work-artifacts matrix

| Work \ Artifact | Raw Video Recordings Directory | Unprocessed Video List | Verified Video Ingestion Queue | Extracted Audio and Keyframe Images | Consolidated Transcript and Visual Text | Staged Multimodal Import Files | Normalized Markdown Sources | Updated Domain Model | Verified Target Domain Model |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Import and Process Multimodal Video | Reviews | - | - | - | - | - | - | - | Creates |
| Discover Raw Video Files | Reviews | Creates | - | - | - | - | - | - | - |
| Verify and Deduplicate Video Sources | - | Reviews | Creates | - | - | - | - | - | - |
| Extract Audio and Key Visual Slides | - | - | Reviews | Creates | - | - | - | - | - |
| Transcribe Speech and OCR Slides | - | - | - | Reviews | Creates | - | - | - | - |
| Stage Consolidated Multimodal Document | - | - | - | - | Reviews | Creates | - | - | - |
| Normalize Multimodal Source with Media Link | - | - | - | - | - | Reviews | Creates | - | - |
| Bind Video Source to Target Entity | - | - | - | - | - | - | Reviews | Modifies | - |
| Validate Target Model | - | - | - | - | - | - | - | Validates | Creates |
