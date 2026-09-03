# Delta: Version Management — Version Panel, Semver Bump, Frontmatter Update, Filename Generation

## Purpose

Port the version management panel from the predecessor apps. Adds a version creation UI to `ModelInfoPanel.vue` with major/minor/patch bump buttons, automatic frontmatter version field update, and `_F.md` filename generation following the existing `parseFormatFilename`/`buildFormatFilename` convention.

## Requirements

### R-VM-01: Version Panel UI in ModelInfoPanel

`ModelInfoPanel.vue` MUST add a "Version Management" section below the existing model metadata. The section MUST contain:

- **Current version display**: shows the parsed `model_version` from frontmatter (or `"V_1-0-0"` if absent), formatted as `V_Major-Minor-Patch`
- **Three bump buttons**: "Major", "Minor", "Patch" — each clearly labeled with the resulting version preview on hover (e.g., "V_1-0-0 → V_2-0-0")
- **Description text**: explains what each bump level means (Major: breaking, Minor: additive, Patch: fixes)
- **Save button**: saves the version-bumped file (calls `workspaceStore.saveActiveFileWithVersionBump`)

The section MUST be collapsible with a chevron toggle.

#### Scenario: Version panel shows current version and bump options

- GIVEN root node has `model_version: "V_1-2-3"`
- WHEN the version panel renders
- THEN "Current Version: V_1-2-3" displays
- AND three buttons show: "Major" (→ V_2-0-0), "Minor" (→ V_1-3-0), "Patch" (→ V_1-2-4)
- AND each button shows a tooltip with the preview on hover

### R-VM-02: Semver Bump Logic

The existing `bumpVersion` function in `utils/version.ts` MUST be enhanced (or confirmed correct) to handle the three levels:

- `patch`: increments the patch segment by 1 (e.g., `V_1-0-0` → `V_1-0-1`)
- `minor`: increments the minor segment by 1, resets patch to 0 (e.g., `V_1-0-0` → `V_1-1-0`)
- `major`: increments the major segment by 1, resets minor and patch to 0 (e.g., `V_1-0-0` → `V_2-0-0`)

The function MUST accept a `BumpLevel` type: `'major' | 'minor' | 'patch'` and return a `VersionTuple` `[major, minor, patch]`.

#### Scenario: Bump produces correct version tuple

- GIVEN input version `[1, 2, 3]`
- WHEN `bumpVersion([1, 2, 3], 'major')` is called
- THEN it returns `[2, 0, 0]`
- WHEN `bumpVersion([1, 2, 3], 'minor')` is called
- THEN it returns `[1, 3, 0]`
- WHEN `bumpVersion([1, 2, 3], 'patch')` is called
- THEN it returns `[1, 2, 4]`

### R-VM-03: Frontmatter Version Field Update

When a version bump is performed, the root node's `rawContent` MUST be updated in-memory:

- Replace the `model_version:` field value with the new version string
- Update or add a `last_updated:` field with the current ISO-8601 timestamp
- If `model_version:` is not present, add it at the top of the frontmatter (after `spec_version:`)

The regex pattern for replacement MUST be:

```regex
/^(model_version):\s*"V_\d+-\d+-\d+"/m
```

If the model_version is quoted (e.g., `model_version: "V_1-0-0"`), the replacement preserves quotes. If unquoted, it preserves that style.

#### Scenario: Frontmatter version updated after bump

- GIVEN root rawContent contains `model_version: "V_1-0-0"`
- WHEN a major bump is performed
- THEN `model_version: "V_2-0-0"` replaces the old value in rawContent
- AND `last_updated: "2025-06-15T14:30:00Z"` is added (with the actual current timestamp)

### R-VM-04: _F.md Filename Generation

The existing `buildFormatFilename(baseName, templateName, version)` function in `utils/version.ts` MUST generate filenames following the convention:

```
{BaseName}_V_{major}-{minor}-{patch}_{TemplateName}.md
```

For example: `"My Model"` with `template: "AI Industry"` and version `[2, 0, 0]` produces `My-Model_V_2-0-0_AI-Industry.md`.

The `saveActiveFileWithVersionBump` action in `workspaceStore` already uses this function. This slice MUST add a preview of the new filename in the version panel UI, shown next to each bump button.

#### Scenario: Filename preview shows new name

- GIVEN current filename is `My-Model_V_1-0-0_AI-Industry.md`
- WHEN the user hovers over "Minor" bump
- THEN the tooltip shows: `My-Model_V_1-1-0_AI-Industry.md`

### R-VM-05: Save Version Creates New File

When the user clicks a bump button and confirms (or clicks Save), `workspaceStore.saveActiveFileWithVersionBump(level)` MUST:

1. Parse the current filename to extract baseName, templateName, and version
2. Compute the new version tuple
3. Build the new filename
4. Create a NEW file on disk with the new filename (via `getFileHandle(newFilename, { create: true })`)
5. Write the updated rawContent (with bumped version) to the new file
6. Mark the root node dirty and call `saveActiveFile()` to persist other dirty nodes
7. The original file MUST NOT be deleted

The existing implementation already does steps 1–6. This slice MUST add a toast notification on success ("Saved as {newFilename}") and error handling on file creation failure.

#### Scenario: Version save creates new file, keeps original

- GIVEN root is `Model_V_1-0-0_Template.md`
- WHEN the user bumps to minor and saves
- THEN a new file `Model_V_1-1-0_Template.md` is created on disk
- AND `Model_V_1-0-0_Template.md` still exists unchanged
- AND a success toast shows "Saved as Model_V_1-1-0_Template.md"

### R-VM-06: Version Panel Disabled States

The version panel MUST be disabled (buttons grayed out, not clickable) when:

- No workspace handle is connected (workspaceStore.handle is null)
- The workspace is currently saving (workspaceStore.saving is true)
- No root node is parsed (modelStore.rootIds is empty)

A tooltip on disabled buttons MUST explain why (e.g., "Connect a workspace to save versions").

#### Scenario: Buttons disabled without workspace

- GIVEN no workspace handle is connected
- WHEN the version panel renders
- THEN all three bump buttons are disabled (class: `opacity-50 cursor-not-allowed`)
- AND hovering shows "Connect a workspace to save versions"

### R-VM-07: Scope Guard — No Git Integration or Changelog

This slice MUST NOT introduce git integration, changelog generation, or automatic archive of old versions. Version management is limited to file creation and frontmatter update.

#### Scenario: No git commit on version save

- GIVEN a version bump save completes successfully
- WHEN the filesystem operation finishes
- THEN no git commands are executed
- AND no changelog entry is generated
