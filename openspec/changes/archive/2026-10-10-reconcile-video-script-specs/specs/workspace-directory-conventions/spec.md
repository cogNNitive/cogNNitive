# Workspace Directory Conventions (delta)

## MODIFIED Requirements

### Requirement: Series and Video Folder Layout

The workspace directory conventions MUST recognize a `series/` tree for video production: `series/{series-slug}/` holds a Series' `video-script`-template model file (carrying its `series:` frontmatter block), its script template, and shared series assets. The standard `{modelDir}/assets/{video-slug}/` rule (unchanged from the `video-script` bluepriNNt prose) then places each Video's own files at `series/{series-slug}/assets/{video-slug}/`, because the Series model file is that Video Element's `{modelDir}`.
(Previously: the bluepriNNt was referenced as `video` V_0-2-1.)
