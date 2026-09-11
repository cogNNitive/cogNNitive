# Technical Design: On-the-fly OpenCode Prompt Generator

## Architecture & Components
1. **Prompt Builder Utility (`src/utils/promptGenerator.ts`)**:
   - Takes context parameters (`modelName`, `modelPath`, `conceptName`, `elementName`, `elementType`, `userNotes`).
   - Returns a formatted markdown prompt ready for OpenCode.
2. **UI Component / Modal (`OpenCodePromptModal.vue` or integrated in `BlockSheet.vue` / `ModelInfoPanel.vue`)**:
   - Dialog overlay with title, description, textarea for user notes, prompt live preview box, and "Copy Prompt" button with `copied` state.
3. **Clipboard helper**:
   - Uses `navigator.clipboard.writeText` with fallback (`document.execCommand('copy')`).

## Data Flow
- User clicks "Prompt for OpenCode" button on an element or model info.
- Modal opens with pre-filled context.
- User types custom instructions.
- Live preview updates.
- User clicks "Copy", prompt is copied to clipboard, button shows "Copied!".
