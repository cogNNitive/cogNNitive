# Spec: On-the-fly OpenCode Prompt Generator

## Requirements
- **Requirement 1 (Prompt Builder)**: The system shall assemble a structured Markdown prompt combining node/model structural metadata (path, filename, concept, element) and user-supplied notes.
- **Requirement 2 (Modal Interface)**: The system shall provide a modal or dialog accessible from editor elements and model panels containing a textarea for custom instructions and a live preview of the generated prompt.
- **Requirement 3 (Clipboard Copy & Feedback)**: The system shall copy the generated prompt to the clipboard and display a visual confirmation ("Copied!") on success.
